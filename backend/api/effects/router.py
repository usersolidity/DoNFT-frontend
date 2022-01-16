from typing import List

from fastapi import APIRouter, File, UploadFile
from starlette.responses import Response
from os import walk
import os

from settings import (
    MODEL_ADAPT_SCALE,
    MODEL_CHECKPOINT,
    MODEL_CONFIG,
    MODEL_CPU,
    MODEL_FIND_BEST_FRAME,
    MODEL_RELATIVE,
)

from .data_types import Effect, EffectID
from .service import EffectsService, StyleTransferService

router = APIRouter(prefix="/effects")

service = EffectsService(
    checkpoint_path=MODEL_CHECKPOINT,
    config_path=MODEL_CONFIG,
    cpu=MODEL_CPU,
    find_best_frame=MODEL_FIND_BEST_FRAME,
    adapt_scale=MODEL_ADAPT_SCALE,
    relative=MODEL_RELATIVE,
)

style_transfer_service = StyleTransferService()


@router.post("/applyWithContent/{effect_id}")
async def modify_with_img_content(effect_id: EffectID, picture: UploadFile = File(...)):
    image_content = picture.file.read()
    animated = await service.make_animation(image_content, effect_id)
    return Response(content=animated, media_type="image/gif")


@router.post("/applyWithImgUrl/{effect_id}")
async def modify_with_img_url(effect_id: EffectID, img_url: str):
    content = await service.make_animation_with_img_url(img_url, effect_id)
    return Response(content=content, media_type="image/gif")


@router.get("/")
async def get_effects() -> List[Effect]:
    return list(service.get_effects())


@router.post("/applyStyleTransfer")
async def applt_style_transfer(content_image: UploadFile = File(...), style_image: UploadFile = File(...)):
    content_image = content_image.file.read()
    style_image = style_image.file.read()
    res = style_transfer_service.change_image(content_image, style_image)
    return Response(content=res, media_type="image/png")
