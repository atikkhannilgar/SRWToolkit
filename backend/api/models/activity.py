import datetime as dt
from bson import ObjectId, Timestamp
from typing import Any, Dict, Literal, Union

import pydantic as pyd

from ..utils import to_camel_case, to_snake_case
from ..utils.types import Activity, DayOfWeek


class ActivityModel(pyd.BaseModel):
    id: str = pyd.Field(default_factory=lambda: str(ObjectId()))
    day: DayOfWeek
    time: dt.datetime = pyd.Field(
        default_factory=lambda: dt.datetime.now(dt.timezone.utc)
    )
    activityDuration: int
    activityType: Activity
    userId: int

    model_config = pyd.ConfigDict(
        extra="ignore",
        json_encoders={ObjectId: str},
    )

    @pyd.field_serializer("time")
    def serialize_dt(self, time: dt.datetime, _info):
        return time.timestamp()

    def to_dict(self):
        json_data = self.model_dump()
        if isinstance(json_data["time"], float):
            json_data["time"] = Timestamp(int(json_data["time"]), 1)
        data = {to_camel_case(k): v for k, v in json_data.items()}
        if "id" in data:
            data["_id"] = ObjectId(data.pop("id"))

        return data

    @classmethod
    def from_dict(cls, data: Dict[str, Any]):
        if "_id" in data:
            data["id"] = str(data.pop("_id"))
        json_data = {to_snake_case(k): v for k, v in data.items()}

        if isinstance(json_data["time"], Timestamp):
            json_data["time"] = json_data["time"].as_datetime()

        return cls(**json_data)
