from enum import Enum
from pathlib import Path

import environs
import tomli


class Environment(Enum):
    DEV = "DEV"
    STAGE = "STAGE"
    PROD = "PROD"


PROJECT_DIR = Path(__file__).parent.parent.resolve()
BACKEND_DIR = PROJECT_DIR / "backend"
MODEL_DIR = PROJECT_DIR / "backend/models"

env = environs.Env()
env.read_env(".env", recurse=False)

ENVIRONMENT = env.enum("ENVIRONMENT", type=Environment, ignore_case=True)

with open(BACKEND_DIR / "pyproject.toml", "rb") as f:
    PROJECT_VERSION = tomli.load(f)["tool"]["poetry"]["version"]

HOST = env.str("HOST", "127.0.0.1")
PORT = env.int("PORT", 8000)
GRAPH_URL = env.str("GRAPH_URL")
WORKERS_NUM = env.int("WORKERS_NUM", 1)
MODEL_CHECKPOINT = str(MODEL_DIR / env.str("MODEL_CHECKPOINT", "vox-cpk.pth.tar"))
MODEL_CONFIG = str(
    BACKEND_DIR / env.str("MODEL_CONFIG", "first_order_model/config/vox-256.yaml")
)
EFFECTS_DIR = BACKEND_DIR / "static/effects"
MODEL_CPU = env.bool("MODEL_CPU", False)
MODEL_FIND_BEST_FRAME = env.bool("MODEL_FIND_BEST_FRAME", False)
MODEL_ADAPT_SCALE = env.bool("MODEL_ADAPT_SCALE", False)
MODEL_RELATIVE = env.bool("MODEL_RELATIVE", False)
PUBLIC_HOST = env.str("PUBLIC_HOST", "localhost")