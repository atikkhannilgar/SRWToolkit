from http import HTTPStatus
from typing import List
from fastapi import Request
import pydantic as pyd
from fastapi import APIRouter, HTTPException
from pymongo import database

from .socket import live_communications, LiveCommunication
from ..crud.communication_crud import create_communication
from ..mongodb import get_db, Collections
from ..utils import Depends
from ..utils.types import LLMModel, VoiceGender, VoiceLanguageCode

router = APIRouter(prefix="/api")


class RegisterResponse(pyd.BaseModel):
    communication_id: str


@router.post("/create-communication", status_code=HTTPStatus.CREATED)
async def post_create_communication(
    db: database.Database = Depends(get_db),
) -> RegisterResponse:
    """
    Register a communication. This request must be made from control panel.
    """

    config = create_communication(db)

    if config is None or config.public_id is None:
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail="Communication creation failed!",
        )

    # ✅ Load saved suffix from DB (if exists)
    doc = db.get_collection(Collections.communications).find_one({"publicId": config.public_id})
    suffix = doc.get("customPromptSuffix", "") if doc else ""

    # ✅ Store it in memory
    live_comm = LiveCommunication(config=config)
    live_comm.custom_prompt_suffix = suffix
    live_communications[config.public_id] = live_comm

    return RegisterResponse(communication_id=config.public_id)


from fastapi import Body


class GetConfigResponse(pyd.BaseModel):
    models: List[str]
    voices: List[str]
    genders: List[str]


@router.get("/controlpanel-config", status_code=HTTPStatus.OK)
async def get_controlpanel_config() -> GetConfigResponse:
    """
    Gets list of available models, voices and voice genders
    """

    return GetConfigResponse(
        models=sorted([type.value for type in LLMModel]),
        voices=sorted([type.value for type in VoiceLanguageCode]),
        genders=sorted([type.value for type in VoiceGender]),
    )
# backend/api/routers/communication.py or socket.py
@router.post("/set-prompt-suffix")
async def set_prompt_suffix(
    request: Request,
    db: database.Database = Depends(get_db),
):
    data = await request.json()
    comm_id = data.get("communication_id")
    suffix = data.get("suffix")

        # 1. Save to in-memory object
    if comm_id in live_communications:
        live_communications[comm_id].custom_prompt_suffix = suffix
        live_communications[comm_id].config.custom_prompt_suffix = suffix  # 🔥 important!

    # 2. Persist in MongoDB
    db.get_collection(Collections.communications).update_one(
        {"publicId": comm_id},
        {"$set": {"customPromptSuffix": suffix}},
    )

    print("Saving suffix:", suffix, "for communication:", comm_id)
    
    return {"message": "Prompt suffix updated successfully"}

@router.post("/set-subtitles-enabled")
async def set_subtitles_enabled(request: Request, db: database.Database = Depends(get_db)):
    data = await request.json()
    comm_id = data.get("communication_id")
    enabled = data.get("enabled")
    if comm_id is None or enabled is None:
        raise HTTPException(status_code=400, detail="Missing communication_id or enabled")
    result = db.get_collection(Collections.communications).update_one(
        {"publicId": comm_id},
        {"$set": {"subtitlesEnabled": enabled}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Communication ID not found")
    # WebSocket push to bot if connected
    comm = live_communications.get(comm_id)
    if comm and comm.bot_client:
        try:
            await comm.bot_client.send_json({
                "type": "SUBTITLES_TOGGLE",
                "enabled": enabled
            })
        except Exception as e:
            print(f"Failed to send SUBTITLES_TOGGLE to bot: {e}")
    return {"message": "Subtitles setting updated"}

@router.get("/get-communication-config")
async def get_communication_config(communication_id: str, db: database.Database = Depends(get_db)):
    doc = db.get_collection(Collections.communications).find_one({"publicId": communication_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Communication not found")
    return {
        "subtitlesEnabled": doc.get("subtitlesEnabled", True),
        # ...other config fields...
    }

@router.post("/clear-history")
async def clear_history(request: Request, db: database.Database = Depends(get_db)):
    data = await request.json()
    comm_id = data.get("communication_id")
    if not comm_id:
        raise HTTPException(status_code=400, detail="Missing communication_id")
    # Clear in-memory chat history
    if comm_id in live_communications:
        live_communications[comm_id].chat_history = []
    # Clear in database (if you store chat history in DB, add code here)
    # db.get_collection(Collections.chats).delete_many({"communication_id": comm_id})
    return {"message": "Chat history cleared"}