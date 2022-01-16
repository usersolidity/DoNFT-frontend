import asyncio
import multiprocessing as mp
from concurrent.futures import ProcessPoolExecutor
from subprocess import PIPE, Popen
from tempfile import NamedTemporaryFile
from typing import Dict, Iterable, List

import imageio
import numpy as np
import torch
import yaml
from scipy.spatial import ConvexHull
from skimage import img_as_ubyte
from skimage.transform import resize
from tqdm import tqdm

from first_order_model.animate import normalize_kp
from first_order_model.modules.generator import OcclusionAwareGenerator
from first_order_model.modules.keypoint_detector import KPDetector
from first_order_model.sync_batchnorm import DataParallelWithCallback
from settings import EFFECTS_DIR, PUBLIC_HOST, PORT, WORKERS_NUM

from .data_types import Effect, EffectID
from .utils import _discover_effects

_EXECUTOR = ProcessPoolExecutor(
    max_workers=WORKERS_NUM, mp_context=mp.get_context("spawn")
)


class EffectsService:
    def __init__(
            self,
            checkpoint_path: str,
            config_path: str,
            cpu: bool = False,
            find_best_frame: bool = False,
            adapt_scale: bool = False,
            relative: bool = False,
    ):
        self._effects_registry: Dict[
            EffectID, Effect
        ] = self._initialize_effects_registry()
        self.find_best_frame = find_best_frame
        self.adapt_scale = adapt_scale
        self.relative = relative
        self.cpu = cpu
        with open(config_path) as f:
            self.config = yaml.load(f)

        self.generator = OcclusionAwareGenerator(
            **self.config["model_params"]["generator_params"],
            **self.config["model_params"]["common_params"],
        )

        self.kp_detector = KPDetector(
            **self.config["model_params"]["kp_detector_params"],
            **self.config["model_params"]["common_params"],
        )

        if not cpu:
            self.kp_detector.cuda()
            self.generator.cuda()
            checkpoint = torch.load(checkpoint_path)
        else:
            checkpoint = torch.load(checkpoint_path, map_location=torch.device("cpu"))

        self.generator.load_state_dict(checkpoint["generator"])
        self.kp_detector.load_state_dict(checkpoint["kp_detector"])

        if not cpu:
            self.generator = DataParallelWithCallback(self.generator)
            self.kp_detector = DataParallelWithCallback(self.kp_detector)

        self.generator.eval()
        self.kp_detector.eval()

    @staticmethod
    def _initialize_effects_registry() -> Dict[EffectID, Effect]:
        return {
            getattr(EffectID, cleaned_name): Effect(
                id=getattr(EffectID, cleaned_name),
                name=cleaned_name.replace("_", " ").capitalize(),
                image=f"http://{PUBLIC_HOST}/backend_static/effects/{filename}",
            )
            for cleaned_name, filename in _discover_effects()
        }

    def get_effects(self) -> Iterable[Effect]:
        return self._effects_registry.values()

    def _make_predictions(
            self, source_image: imageio.core.Image, driving_video: List[imageio.core.Image]
    ) -> List[np.ndarray]:
        with torch.no_grad():
            predictions = []
            source = torch.tensor(source_image[np.newaxis].astype(np.float32)).permute(
                0, 3, 1, 2
            )
            if not self.cpu:
                source = source.cuda()
            driving = torch.tensor(
                np.array(driving_video)[np.newaxis].astype(np.float32)
            ).permute(0, 4, 1, 2, 3)
            kp_source = self.kp_detector(source)
            kp_driving_initial = self.kp_detector(driving[:, :, 0])

            for frame_idx in tqdm(range(driving.shape[2])):
                driving_frame = driving[:, :, frame_idx]
                if not self.cpu:
                    driving_frame = driving_frame.cuda()
                kp_driving = self.kp_detector(driving_frame)
                kp_norm = normalize_kp(
                    kp_source=kp_source,
                    kp_driving=kp_driving,
                    kp_driving_initial=kp_driving_initial,
                    use_relative_movement=self.relative,
                    use_relative_jacobian=self.relative,
                    adapt_movement_scale=self.adapt_scale,
                )
                out = self.generator(source, kp_source=kp_source, kp_driving=kp_norm)

                predictions.append(
                    np.transpose(out["prediction"].data.cpu().numpy(), [0, 2, 3, 1])[0]
                )
            return predictions

    @staticmethod
    def _find_best_frame(source, driving, cpu):
        import face_alignment

        def normalize_kp(kp):
            kp = kp - kp.mean(axis=0, keepdims=True)
            area = ConvexHull(kp[:, :2]).volume
            area = np.sqrt(area)
            kp[:, :2] = kp[:, :2] / area
            return kp

        fa = face_alignment.FaceAlignment(
            face_alignment.LandmarksType._2D,
            flip_input=True,
            device="cpu" if cpu else "cuda",
        )
        kp_source = fa.get_landmarks(255 * source)[0]
        kp_source = normalize_kp(kp_source)
        norm = float("inf")
        frame_num = 0
        for i, image in tqdm(enumerate(driving)):
            kp_driving = fa.get_landmarks(255 * image)[0]
            kp_driving = normalize_kp(kp_driving)
            new_norm = (np.abs(kp_source - kp_driving) ** 2).sum()
            if new_norm < norm:
                norm = new_norm
                frame_num = i
        return frame_num

    def _perform_animation(self, source_image: bytes, driving_video: str) -> bytes:
        source_image = imageio.imread(source_image)
        reader = imageio.get_reader(driving_video)
        metadata = reader.get_meta_data()
        driving_video = []
        try:
            for im in reader:
                driving_video.append(im)
        except RuntimeError:
            pass
        reader.close()

        source_image = resize(source_image, (256, 256))[..., :3]
        driving_video = [resize(frame, (256, 256))[..., :3] for frame in driving_video]
        if self.find_best_frame:
            i = self._find_best_frame(source_image, driving_video, self.cpu)
            driving_forward = driving_video[i:]
            driving_backward = driving_video[: (i + 1)][::-1]
            predictions_forward = self._make_predictions(source_image, driving_forward)
            predictions_backward = self._make_predictions(
                source_image, driving_backward
            )
            predictions = predictions_backward[::-1] + predictions_forward[1:]
        else:
            predictions = self._make_predictions(source_image, driving_video)
        rendered_video = imageio.mimsave(
            "<bytes>",
            [img_as_ubyte(frame) for frame in predictions],
            fps=metadata["fps"],
            format="mp4",
        )
        with NamedTemporaryFile() as f:
            f.write(rendered_video)
            f.seek(0)
            ffmpeg_params = [
                "ffmpeg",
                "-f",
                "mp4",
                "-i",
                f.name,
                "-vf",
                "fps=30,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse",
                "-loop",
                "0",
                "-f",
                "gif",
                "-",
                "-hide_banner",
                "-loglevel",
                "error",
            ]

            process = Popen(ffmpeg_params, stdout=PIPE, stderr=PIPE)
            stdout, stderr = process.communicate()
            if process.returncode != 0:
                raise RuntimeError(f"Unable to convert to gif {stderr}")
            return stdout

    async def make_animation(self, source_image: bytes, effect: EffectID):
        loop = asyncio.get_event_loop()
        # TODO: Think about better way
        driving_video = EFFECTS_DIR / f"{effect.value}.mp4"
        result = await loop.run_in_executor(
            _EXECUTOR, self._perform_animation, source_image, driving_video
        )
        return result

    async def make_animation_with_img_url(self, img_url: str, effect: EffectID):
        loop = asyncio.get_event_loop()
        # TODO: Think about better way
        driving_video = EFFECTS_DIR / f"{effect.value}.mp4"
        result = await loop.run_in_executor(
            _EXECUTOR, self._perform_animation, img_url, driving_video
        )
        return result


import tensorflow_hub as hub
import os
import tensorflow as tf

# Load compressed models from tensorflow_hub
os.environ['TFHUB_MODEL_LOAD_FORMAT'] = 'COMPRESSED'

import numpy as np
import PIL.Image


class StyleTransferService:

    def __init__(self):
        self.hub_model = hub.load('https://tfhub.dev/google/magenta/arbitrary-image-stylization-v1-256/2')

    @staticmethod
    def load_img(img_content: bytes):
        max_dim = 512
        with NamedTemporaryFile() as path_to_img:
            path_to_img.write(img_content)
            path_to_img.seek(0)
            img = tf.io.read_file(path_to_img.name)
        img = tf.image.decode_image(img, channels=3)
        img = tf.image.convert_image_dtype(img, tf.float32)

        shape = tf.cast(tf.shape(img)[:-1], tf.float32)
        long_dim = max(shape)
        scale = max_dim / long_dim

        new_shape = tf.cast(shape * scale, tf.int32)

        img = tf.image.resize(img, new_shape)
        img = img[tf.newaxis, :]
        return img

    def change_image(self, content_image_path, style_image_path):
        content_image = self.load_img(content_image_path)
        style_image = self.load_img(style_image_path)
        img = imageio.imread(content_image_path)
        stylized_image = self.hub_model(tf.constant(content_image), tf.constant(style_image))[0]

        index, range = 150, 0
        pixel = img[index, index]

        left_b_0 = pixel - np.array([range, 0, 0])
        right_b_0 = pixel + np.array([range, 0, 0])
        left_b_1 = pixel - np.array([0, range, 0])
        right_b_1 = pixel + np.array([0, range, 0])
        left_b_2 = pixel - np.array([0, 0, range])
        right_b_2 = pixel + np.array([0, 0, range])

        a0 = np.where((img >= left_b_0) & (img <= right_b_0), img, [0, 0, 0])
        a1 = np.where((img >= left_b_1) & (img <= right_b_1), img, [0, 0, 0])
        a2 = np.where((img >= left_b_2) & (img <= right_b_2), img, [0, 0, 0])
        res = (a0 + a1 + a2) / 3
        a = np.where(res == [0, 0, 0], [0, 0, 0], [240, 240, 240])
        stylized_image = stylized_image * 255
        stylized_image = np.array(stylized_image, dtype=np.uint8)
        if np.ndim(stylized_image) > 3:
            assert stylized_image.shape[0] == 1
            stylized_image = stylized_image[0]
        pil_stylized_image = PIL.Image.fromarray(stylized_image)

        b = np.array(pil_stylized_image.resize((600, 600)))

        b0 = np.where(a == 240, [0, 0, 0], b)
        b1 = np.where(a == 240, [0, 0, 0], b)
        b2 = np.where(a == 240, [0, 0, 0], b)
        b_res = (b0 + b1 + b2) / 3

        return imageio.imwrite("<bytes>", (a + b_res).astype(np.uint8), "png")
