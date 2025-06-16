import datetime as dt
from bson import ObjectId, Timestamp
from typing import Any, Dict, Optional
import pydantic as pyd

from ..utils import to_camel_case, to_snake_case
from ..utils.types import LLMModel

class PromptModel(pyd.BaseModel):
    id: str = pyd.Field(default_factory=lambda: str(ObjectId()))
    communication_id: str = pyd.Field(..., description="ID of the communication this prompt belongs to")
    user_input: str = pyd.Field(..., min_length=1, description="The original user input")
    initial_prompt_suffix: Optional[str] = pyd.Field(None, description="Custom prompt suffix used")
    generated_prompt: str = pyd.Field(..., min_length=1, description="The final generated prompt")
    llm_model: LLMModel = pyd.Field(..., description="The LLM model used for this prompt")
    created_at: dt.datetime = pyd.Field(
        default_factory=lambda: dt.datetime.now(dt.timezone.utc)
    )

    model_config = pyd.ConfigDict(
        extra="ignore",
        json_encoders={ObjectId: str},
    )

    @pyd.field_serializer("created_at")
    def serialize_dt(self, created_at: dt.datetime, _info):
        return created_at.timestamp()

    def to_dict(self):
        json_data = self.model_dump()

        # Handle Mongo Timestamp
        if isinstance(json_data["created_at"], float):
            json_data["created_at"] = Timestamp(int(json_data["created_at"]), 1)

        # Convert keys to camelCase
        data = {to_camel_case(k): v for k, v in json_data.items()}

        # Handle _id for MongoDB
        if "id" in data:
            data["_id"] = ObjectId(data.pop("id"))

        return data

    @classmethod
    def from_dict(cls, data: Dict[str, Any]):
        if "_id" in data:
            data["id"] = str(data.pop("_id"))

        # Convert camelCase to snake_case
        json_data = {to_snake_case(k): v for k, v in data.items()}

        # Convert Mongo Timestamps
        if isinstance(json_data.get("created_at"), Timestamp):
            json_data["created_at"] = json_data["created_at"].as_datetime()

        return cls(**json_data) 