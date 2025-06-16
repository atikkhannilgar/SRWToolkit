from fastapi import APIRouter, Request, HTTPException
from http import HTTPStatus
from pymongo.database import Database
from loguru import logger

from ..ai.prompts import get_prompt
from ..mongodb import get_db, Collections
from ..models.prompt import PromptModel
from ..crud.prompt_crud import create_prompt
from ..utils import Depends
from ..utils.types import LLMModel

router = APIRouter(tags=["Prompt"])


@router.post("/generate")
async def generate_prompt(
    request: Request,
    db: Database = Depends(get_db),
):
    try:
        data = await request.json()
        logger.info(f"Received generate request with data: {data}")
        
        user_input = data.get("prompt", "")
        communication_id = data.get("communication_id", "")

        if not user_input or not communication_id:
            logger.warning(f"Missing required fields. prompt: '{user_input}', communication_id: '{communication_id}'")
            raise HTTPException(
                status_code=HTTPStatus.BAD_REQUEST,
                detail="Missing prompt or communication_id"
            )

        # Get communication config from communications collection
        doc = db.get_collection(Collections.communications).find_one({"publicId": communication_id})
        logger.info(f"Found communication config: {doc}")
        
        if not doc:
            logger.error(f"Communication not found for ID: {communication_id}")
            raise HTTPException(
                status_code=HTTPStatus.NOT_FOUND,
                detail="Communication not found"
            )
        
        custom_suffix = doc.get("customPromptSuffix", "")
        
        # Try different possible field names for the model
        llm_model = doc.get("llmModel") or doc.get("LLMModel") or doc.get("llm_model")
        
        logger.info(f"Using suffix: '{custom_suffix}' and model: '{llm_model}'")
        
        if not llm_model:
            logger.error(f"No LLM model found in communication config: {doc}")
            raise HTTPException(
                status_code=HTTPStatus.BAD_REQUEST,
                detail="No LLM model configured for this communication"
            )

        # Validate that the model is a valid LLMModel enum value
        if llm_model not in [model.value for model in LLMModel]:
            logger.error(f"Invalid model value: {llm_model}")
            raise HTTPException(
                status_code=HTTPStatus.BAD_REQUEST,
                detail=f"Invalid model: {llm_model}. Valid models are: {[model.value for model in LLMModel]}"
            )

        # Generate the full prompt
        full_prompt = get_prompt(user_input, custom_suffix)
        logger.info(f"Generated full prompt: {full_prompt}")

        # Create and save the prompt record
        prompt = PromptModel(
            communication_id=communication_id,
            user_input=user_input,
            initial_prompt_suffix=custom_suffix,
            generated_prompt=full_prompt,
            llm_model=llm_model,
        )
        
        saved_prompt = create_prompt(db, prompt)
        if not saved_prompt:
            logger.error("Failed to save prompt to database")
            raise HTTPException(
                status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
                detail="Failed to save prompt"
            )

        logger.success(f"Successfully generated and saved prompt for communication: {communication_id}")
        return {
            "full_prompt": full_prompt,
            "model": llm_model
        }
    except Exception as e:
        logger.exception("Error in generate_prompt endpoint")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/set-prompt-suffix")
async def set_prompt_suffix(
    request: Request,
    db: Database = Depends(get_db),
):
    data = await request.json()
    comm_id = data.get("communication_id")
    suffix = data.get("suffix")

    if not comm_id or suffix is None:
        raise HTTPException(
            status_code=HTTPStatus.BAD_REQUEST,
            detail="Missing communication_id or suffix"
        )

    result = db.get_collection(Collections.communications).update_one(
        {"publicId": comm_id},
        {"$set": {"customPromptSuffix": suffix}},
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=HTTPStatus.NOT_FOUND,
            detail="Communication ID not found"
        )

    print(f"✅ Saved suffix '{suffix}' for communication ID '{comm_id}'")
    return {"message": "Prompt suffix updated successfully"}
