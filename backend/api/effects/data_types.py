from enum import Enum

from pydantic import AnyUrl, BaseModel

from .utils import _generate_effects_ids

EffectID = Enum("EffectID", _generate_effects_ids())


class Effect(BaseModel):
    name: str
    id: EffectID
    image: AnyUrl
