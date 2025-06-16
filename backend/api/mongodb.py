from enum import Enum

from loguru import logger
from pymongo import MongoClient, database

from .config import get_cfg
from .utils import Depends

mongo_client: MongoClient = None


def get_db() -> database.Database:
    global mongo_client
    cfg = get_cfg()  # 👈 manually call it

    if mongo_client is None:
        try:
            mongo_client = MongoClient(cfg.mongodb_url)
            logger.info("Connection to MongoDB successful!")
        except:
            logger.exception("Connection to MongoDB failed!")
    return mongo_client.get_database(cfg.db_name)


class Collections(str, Enum):
    activities: str = "activities"
    communications: str = "communications"
    chat_messages: str = "chat_messages"
    prompts: str = "prompts"
