from typing import List, Union

from loguru import logger
from pymongo import database, ASCENDING


from ..models.chat import ChatMessage
from ..mongodb import Collections


def add_one_message(db: database.Database, message: ChatMessage):
    try:
        coll = db.get_collection(Collections.chat_messages)
        coll.insert_one(message.to_dict())
    except Exception as e:
        logger.exception(e)


def add_many_messages(db: database.Database, messages: List[ChatMessage]):
    try:
        coll = db.get_collection(Collections.chat_messages)
        coll.insert_many([message.to_dict() for message in messages])
    except Exception as e:
        logger.exception(e)


def get_chat_history(
    db: database.Database,
    communication_id: str,
    sort_order: int = ASCENDING,
) -> Union[List[ChatMessage], None]:
    try:
        coll = db.get_collection(Collections.chat_messages)
        chat_history = coll.find({"communicationId": communication_id}).sort(
            "timestamp", sort_order
        )

        chat_messages = [ChatMessage.from_dict(message) for message in chat_history]
        return chat_messages

    except Exception as e:
        logger.exception(e)
        return None
