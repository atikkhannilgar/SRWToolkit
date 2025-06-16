from typing import Union

from loguru import logger
from pymongo import database


from ..models.communication import CommunicationConfig
from ..mongodb import Collections
from ..utils import generate_id


def create_communication(db: database.Database) -> Union[CommunicationConfig, None]:
    public_id = _get_public_id(db)
    config = CommunicationConfig(public_id=public_id)
    try:
        coll = db.get_collection(Collections.communications)
        result = coll.insert_one(config.to_dict())
        if result is None:
            return None

        inserted_document = coll.find_one({"_id": result.inserted_id})
        return CommunicationConfig.from_dict(inserted_document)
    except Exception as e:
        logger.exception(e)


def get_communication_by_public_id(
    db: database.Database, public_id: str
) -> Union[CommunicationConfig, None]:

    try:
        coll = db.get_collection(Collections.communications)
        result = coll.find_one({"publicId": public_id})
        if result is None:
            return None

        return CommunicationConfig.from_dict(result)
    except Exception as e:
        logger.exception(e)


def update_communication_by_public_id(
    db: database.Database, config: CommunicationConfig
) -> None:
    try:
        coll = db.get_collection(Collections.communications)
        coll.update_one({"publicId": config.public_id}, {"$set": config.to_dict()})
    except Exception as e:
        logger.exception(e)


def _get_public_id(db: database.Database, max_retries: int = 10) -> Union[str, None]:
    public_id = None
    trial_count: int = 0

    communications = db.get_collection(Collections.communications)

    while trial_count < max_retries:
        trial_count += 1
        id = generate_id()
        existing_comm = communications.find_one({"publicId": id})
        if existing_comm is None:
            public_id = id
            break

    return public_id
