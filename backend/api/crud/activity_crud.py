from typing import List, Union

from loguru import logger
from pymongo import database, ASCENDING


from ..models.activity import ActivityModel
from ..mongodb import Collections


def get_activitydata(
    db: database.Database,
    user_id: str,
    sort_order: int = ASCENDING,
) -> Union[List[ActivityModel], None]:
    try:
        coll = db.get_collection(Collections.activities)
        activities = coll.find({"userId": user_id}).sort("time", sort_order)
        print([activity for activity in activities])
        userdata = [ActivityModel.from_dict(data) for data in activities]
        return userdata

    except Exception as e:
        # logger.exception(e)
        return None
