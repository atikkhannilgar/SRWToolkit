import datetime as dt
from bson import ObjectId, Timestamp
from typing import Any, Dict, Union

import pydantic as pyd

from ..utils import to_camel_case, to_snake_case
from ..utils.types import LLMModel, MessageType


class ChatMessage(pyd.BaseModel):
    id: str = pyd.Field(default_factory=lambda: str(ObjectId()))
    communication_id: str
    role: MessageType
    message: str
    llm_model: Union[LLMModel, None] = None
    timestamp: dt.datetime = pyd.Field(
        default_factory=lambda: dt.datetime.now(dt.timezone.utc)
    )

    model_config = pyd.ConfigDict(
        extra="ignore",
        json_encoders={ObjectId: str},
    )

    @pyd.field_serializer("timestamp")
    def serialize_dt(self, timestamp: dt.datetime, _info):
        return timestamp.timestamp()

    def to_dict(self):
        json_data = self.model_dump()
        if isinstance(json_data["timestamp"], float):
            json_data["timestamp"] = Timestamp(int(json_data["timestamp"]), 1)
        data = {to_camel_case(k): v for k, v in json_data.items()}
        if "id" in data:
            data["_id"] = ObjectId(data.pop("id"))

        return data

    @classmethod
    def from_dict(cls, data: Dict[str, Any]):
        if "_id" in data:
            data["id"] = str(data.pop("_id"))
        json_data = {to_snake_case(k): v for k, v in data.items()}

        if isinstance(json_data["timestamp"], Timestamp):
            json_data["timestamp"] = json_data["timestamp"].as_datetime()

        return cls(**json_data)
