import datetime as dt
from bson import ObjectId, Timestamp
from typing import Any, Dict, List
from typing import Optional
import pydantic as pyd
from fastapi import WebSocket

from ..models.chat import ChatMessage
from .activity import ActivityModel
from ..utils import to_camel_case, to_snake_case
from ..utils.types import LLMModel, SkinType, VoiceGender, VoiceLanguageCode


class CommunicationConfig(pyd.BaseModel):
    id: str = pyd.Field(default_factory=lambda: str(ObjectId()))
    public_id: str
    skin: SkinType = SkinType.FULLBOT
    audio_enabled: bool = True
    text_enabled: bool = True
    proactive_mode_enabled: bool = False
    llm_model: LLMModel = LLMModel.llama3_2_latest
    voice_language_code: VoiceLanguageCode = VoiceLanguageCode.en_US
    voice_gender: VoiceGender = VoiceGender.MALE
    custom_prompt_suffix: Optional[str] = None
    subtitles_enabled: bool = True
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

        # ✅ Ensure customPromptSuffix is camelCased
        data["customPromptSuffix"] = self.custom_prompt_suffix
        
        # ✅ Ensure subtitlesEnabled is camelCased
        data["subtitlesEnabled"] = self.subtitles_enabled

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

        # ✅ Fix: Always map camelCase version if snake_case is missing
        if "custom_prompt_suffix" not in json_data:
            if "customPromptSuffix" in data:
                json_data["custom_prompt_suffix"] = data["customPromptSuffix"]

        # ✅ Fix: Always map camelCase version if snake_case is missing
        if "subtitles_enabled" not in json_data:
            if "subtitlesEnabled" in data:
                json_data["subtitles_enabled"] = data["subtitlesEnabled"]

        return cls(**json_data)




# dict of live communications (and chat history) with bot client and a controlpanel client
class LiveCommunication:
    def __init__(
        self,
        config: CommunicationConfig,
        history: List[ChatMessage] = [],
    ):
        self.bot_client = None
        self.controlpanel_client = None
        self.config = config
        self.processing_request = False
        self.chat_history = history

    bot_client: WebSocket
    controlpanel_client: WebSocket
    config: CommunicationConfig
    processing_request: bool
    chat_history: List[ChatMessage]
    activity_data: List[ActivityModel]
    custom_prompt_suffix: Optional[str] = None
