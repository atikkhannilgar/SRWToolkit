import asyncio
from typing import Any, Dict, Union

import pydantic as pyd
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from google.cloud import speech_v1, texttospeech
from loguru import logger
from pymongo import database

from ..ai.pipeline import process_user_audio, process_user_text, process_user_audio_with_llm, process_user_text_with_llm
from ..config import get_cfg
from ..crud.chat_crud import get_chat_history
from ..crud.communication_crud import (
    get_communication_by_public_id,
    update_communication_by_public_id,
)
from ..models.communication import CommunicationConfig, LiveCommunication
from ..mongodb import get_db, Collections
from ..utils import Depends
from ..utils.audio import get_s2t_client, get_t2s_client
from ..utils.types import (
    ReceiveBotMessage,
    ReceiveControlPanelMessage,
    SendBotMessage,
    SendControlPanelMessage,
    SendGenericMessage,
)

router = APIRouter(prefix="/api")

class WebSocketResponse(pyd.BaseModel):
    type: str
    data: Dict[str, Any]

# ongoing communications
live_communications: Dict[str, LiveCommunication] = {}

@router.websocket("/ws/communication/{communication_id}")
async def communicate(
    websocket: WebSocket,
    communication_id: str,
    client_identifier: str = Query(None),
    db: database.Database = Depends(get_db),
    s2t_client=Depends(get_s2t_client),
    t2s_client=Depends(get_t2s_client),
    cfg=Depends(get_cfg),
) -> WebSocketResponse:
    await websocket.accept()

    if communication_id not in live_communications:
        db_comm = get_communication_by_public_id(db, communication_id)
        if db_comm is None:
            return await _close_websocket(
                websocket,
                SendGenericMessage.INVALID_COMMUNICATION_ID,
                "Invalid communication id",
            )
        print("Restored suffix from DB:", db_comm.custom_prompt_suffix)

        history = get_chat_history(db, db_comm.id)

        # fetch suffix manually if not present on db_comm
        suffix = db.get_collection(Collections.communications).find_one({"publicId": communication_id})
        prompt_suffix = suffix.get("customPromptSuffix", "") if suffix else ""

        live_comm = LiveCommunication(config=db_comm, history=history)
        live_comm.custom_prompt_suffix = db_comm.custom_prompt_suffix
        live_communications[communication_id] = live_comm
        print("Restoring suffix from DB:", db_comm.custom_prompt_suffix)

    communication: LiveCommunication = live_communications.get(communication_id)

    match client_identifier:
        case "controlpanel":
            if communication.controlpanel_client:
                await _close_websocket(
                    communication.controlpanel_client,
                    SendControlPanelMessage.NEW_CONTROL_PANEL_DETECTED,
                    "New control panel detected.",
                )
            communication.controlpanel_client = websocket
            await _send_message(
                websocket,
                SendControlPanelMessage.IS_BOT_CONNECTED,
                {"value": communication.bot_client is not None},
            )

        case "bot":
            if communication.bot_client:
                await _close_websocket(
                    communication.bot_client,
                    SendBotMessage.NEW_BOT_DETECTED,
                    "New bot connection detected.",
                )
            communication.bot_client = websocket
            if communication.controlpanel_client:
                await _send_message(
                    communication.controlpanel_client,
                    SendControlPanelMessage.IS_BOT_CONNECTED,
                    {"value": communication.bot_client is not None},
                )

        case _:
            await _close_websocket(
                websocket,
                SendGenericMessage.CLOSE_CONNECTION,
                "Client identifier must be one of [controlpanel, bot]",
            )
            return

    await _send_message(
        websocket,
        SendGenericMessage.SYSTEM_CONFIG,
        {"config": communication.config},
    )

    try:
        while True:
            data = await websocket.receive_json()
            if client_identifier == "bot":
                await _handle_bot_messages(
                    db,
                    communication,
                    websocket,
                    communication.controlpanel_client,
                    data,
                    s2t_client,
                    t2s_client,
                    cfg.llm_url,
                )
                continue

            await _handle_controlpanel_messages(
                db,
                communication,
                websocket,
                communication.bot_client,
                data,
            )

    except WebSocketDisconnect:
        if client_identifier == "bot":
            communication.bot_client = None
        elif client_identifier == "controlpanel":
            communication.controlpanel_client = None

        if (
            communication.controlpanel_client is None
            and communication.bot_client is None
        ):
            live_communications.pop(communication_id, None)
            logger.info("Popping out live communication.")

        logger.debug("Client disconnected")

    except Exception as e:
        logger.exception(e)
    logger.info(f"Loaded communication {communication_id} with suffix: {communication.custom_prompt_suffix}")


async def _handle_bot_messages(
    db: database.Database,
    communication: LiveCommunication,
    bot_client: WebSocket,
    controlpanel: WebSocket,
    blob: Dict[str, Any],
    s2t_client: speech_v1.SpeechClient,
    t2s_client: texttospeech.TextToSpeechClient,
    llm_url: str,
):
    try:
        message_type = ReceiveBotMessage[blob["type"]]
        data = blob.get("data", {})
    except Exception:
        return await _send_message(
            bot_client,
            SendGenericMessage.ERROR,
            {"message": "Invalid Message Type"},
        )

    send_to_bot, send_to_bot_type = None, None
    send_to_cp, send_to_cp_type = None, None

    match message_type:
        case ReceiveBotMessage.SEND_AUDIO:
            if not communication.processing_request:
                communication.processing_request = True
                result = await asyncio.get_running_loop().run_in_executor(
                    None,
                    process_user_audio_with_llm,
                    db,
                    communication,
                    data["audio"],
                    s2t_client,
                    t2s_client,
                    llm_url,
                    _send_message,
                )
                communication.processing_request = False
                
                if result:  # Only send if we got a valid LLM response
                    send_to_bot_type = SendBotMessage.AUDIO_RESPONSE
                    send_to_bot = {
                        "response": result["audio"],
                        "content": result["text"],
                        "user_query": result.get("user_query"),
                        "fixed_prompt": result.get("fixed_prompt"),
                    }
            else:
                send_to_bot_type = SendGenericMessage.ERROR
                send_to_bot = {"message": "Request already in progress!"}

        case ReceiveBotMessage.SEND_TEXT:
            if not communication.processing_request:
                communication.processing_request = True
                result = await asyncio.get_running_loop().run_in_executor(
                    None,
                    process_user_text_with_llm,
                    db,
                    communication,
                    data["text"],
                    t2s_client,
                    llm_url,
                    _send_message,
                )
                communication.processing_request = False
                
                if result:  # Only send if we got a valid LLM response
                    send_to_bot_type = SendBotMessage.AUDIO_RESPONSE
                    send_to_bot = {
                        "response": result["audio"],
                        "content": result["text"],
                        "user_query": result.get("user_query"),
                        "fixed_prompt": result.get("fixed_prompt"),
                    }
            else:
                send_to_bot_type = SendGenericMessage.ERROR
                send_to_bot = {"message": "Request already in progress!"}

    if send_to_bot and send_to_bot_type:
        await _send_message(bot_client, send_to_bot_type, send_to_bot)
    if controlpanel and send_to_cp and send_to_cp_type:
        await _send_message(controlpanel, send_to_cp_type, send_to_cp)



async def _handle_controlpanel_messages(
    db: database.Database,
    communication: LiveCommunication,
    controlpanel: WebSocket,
    bot_client: WebSocket,
    blob: Dict[str, Any],
):
    try:
        message_type = ReceiveControlPanelMessage[blob["type"]]
        data = blob.get("data", {})
    except Exception:
        return await _send_message(
            controlpanel,
            SendGenericMessage.ERROR,
            {"message": "Invalid Message Type"},
        )

    send_to_bot, send_to_bot_type = None, None
    send_to_cp, send_to_cp_type = None, None

    match message_type:
        case ReceiveControlPanelMessage.UPDATE_CONFIG:
            current_config = communication.config.model_dump()
            filtered_config = {
                key: data["config"].get(key, current_config[key])
                for key in current_config
            }
            communication.config = CommunicationConfig.model_validate(filtered_config)
            update_communication_by_public_id(db, communication.config)
            send_msg = {"config": communication.config.model_dump()}
            send_to_bot_type = SendGenericMessage.SYSTEM_CONFIG
            send_to_bot = send_msg
            send_to_cp_type = SendGenericMessage.SYSTEM_CONFIG
            send_to_cp = send_msg

        case ReceiveControlPanelMessage.PING:
            send_to_cp_type = SendControlPanelMessage.PING_STATE
            send_to_cp = {"is_bot_connected": communication.bot_client is not None}

    if bot_client and send_to_bot and send_to_bot_type:
        await _send_message(bot_client, send_to_bot_type, send_to_bot)
    if send_to_cp and send_to_cp_type:
        await _send_message(controlpanel, send_to_cp_type, send_to_cp)


async def _send_message(
    socket: WebSocket,
    msg_type: Union[SendGenericMessage, SendBotMessage, SendControlPanelMessage],
    data: Dict[str, Any],
):
    try:
        await socket.send_json(WebSocketResponse(type=msg_type, data=data).model_dump())
    except Exception:
        await _close_websocket(socket, SendGenericMessage.CLOSE_CONNECTION, f"Failed to send: {data}")


async def _close_websocket(
    socket: WebSocket,
    res_type: Union[SendGenericMessage, SendBotMessage, SendControlPanelMessage],
    message: str,
):
    try:
        await socket.send_json(WebSocketResponse(type=res_type, data={"message": message}).model_dump())
        await socket.close()
    except Exception as e:
        logger.debug(e)
