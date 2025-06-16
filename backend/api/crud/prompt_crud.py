from typing import List, Union
from bson import ObjectId, errors as bson_errors
from loguru import logger
from pymongo import database, ASCENDING

from ..models.prompt import PromptModel
from ..mongodb import Collections


def create_prompt(
    db: database.Database,
    prompt: PromptModel,
) -> Union[PromptModel, None]:
    try:
        coll = db.get_collection(Collections.prompts)
        result = coll.insert_one(prompt.to_dict())
        if result is None:
            return None

        inserted_document = coll.find_one({"_id": result.inserted_id})
        return PromptModel.from_dict(inserted_document)
    except Exception as e:
        logger.exception("Failed to create prompt")
        return None


def get_prompts_by_communication_id(
    db: database.Database,
    communication_id: str,
    sort_order: int = ASCENDING,
) -> Union[List[PromptModel], None]:
    try:
        coll = db.get_collection(Collections.prompts)
        prompts = coll.find({"communication_id": communication_id}).sort("created_at", sort_order)
        return [PromptModel.from_dict(prompt) for prompt in prompts]
    except Exception as e:
        logger.exception(f"Failed to get prompts for communication {communication_id}")
        return None


def get_prompt_by_id(
    db: database.Database,
    prompt_id: str,
) -> Union[PromptModel, None]:
    try:
        try:
            object_id = ObjectId(prompt_id)
        except bson_errors.InvalidId:
            logger.error(f"Invalid ObjectId format: {prompt_id}")
            return None

        coll = db.get_collection(Collections.prompts)
        result = coll.find_one({"_id": object_id})
        if result is None:
            return None
        return PromptModel.from_dict(result)
    except Exception as e:
        logger.exception(f"Failed to get prompt {prompt_id}")
        return None


def update_prompt(
    db: database.Database,
    prompt_id: str,
    update_data: dict,
) -> Union[PromptModel, None]:
    try:
        try:
            object_id = ObjectId(prompt_id)
        except bson_errors.InvalidId:
            logger.error(f"Invalid ObjectId format: {prompt_id}")
            return None

        coll = db.get_collection(Collections.prompts)
        result = coll.find_one_and_update(
            {"_id": object_id},
            {"$set": update_data},
            return_document=True
        )
        if result is None:
            return None
        return PromptModel.from_dict(result)
    except Exception as e:
        logger.exception(f"Failed to update prompt {prompt_id}")
        return None


def delete_prompt(
    db: database.Database,
    prompt_id: str,
) -> bool:
    try:
        try:
            object_id = ObjectId(prompt_id)
        except bson_errors.InvalidId:
            logger.error(f"Invalid ObjectId format: {prompt_id}")
            return False

        coll = db.get_collection(Collections.prompts)
        result = coll.delete_one({"_id": object_id})
        return result.deleted_count > 0
    except Exception as e:
        logger.exception(f"Failed to delete prompt {prompt_id}")
        return False 