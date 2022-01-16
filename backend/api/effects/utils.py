import os
from functools import lru_cache
from typing import Dict, List, Tuple

from settings import EFFECTS_DIR


@lru_cache(maxsize=1)
def _discover_effects() -> List[Tuple[str, str]]:
    effects = []
    for dir_path, dirs, files in os.walk(EFFECTS_DIR):
        for filename in files:
            if not (filename.endswith(".mp4") or filename.endswith(".jpg")):
                continue
            cleaned_name = filename.split(".")[0]
            effects.append((cleaned_name, filename))
    return effects


def _generate_effects_ids() -> Dict[str, str]:
    return {
        cleaned_name: cleaned_name for cleaned_name, filename in _discover_effects()
    }
