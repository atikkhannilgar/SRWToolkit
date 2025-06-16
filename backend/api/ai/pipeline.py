import asyncio
import base64
import json
import random
import requests
from typing import Any, Callable, Dict, List

from google.cloud import speech_v1, texttospeech
from loguru import logger
from pymongo import database

from ..ai.prompts import (
    get_prompt,
    processing_query_fillers,
)
from ..crud.chat_crud import add_many_messages
from ..models.chat import ChatMessage
from ..models.communication import LiveCommunication
from ..utils.audio import transcribe_audio, text_to_speech
from ..utils.types import MessageType, SendBotMessage


def is_question(text: str) -> bool:
    question_words = [
        "who",
        "what",
        "where",
        "when",
        "why",
        "how",
        "is",
        "are",
        "can",
        "does",
        "do",
    ]
    return (
        text.strip().endswith("?")
        or text.split()[0].lower() in question_words
        or text.lower().replace("hey", "").replace(",", "").strip().split()[0]
        in question_words
    ) and len(text.split()) > 5


def process_user_audio(
    db: database.Database,
    communication: LiveCommunication,
    base64_audio: str,
    s2t_client: speech_v1.SpeechClient,
    t2s_client: texttospeech.TextToSpeechClient,
    llm_url: str,
    send_message: Callable,
):
    # return
    audio_bytes = base64.b64decode(base64_audio)
    transcript = transcribe_audio(audio_bytes, s2t_client)
    if transcript is None or transcript.strip() == "":
        # Return a prompt asking the user to say something
        prompt = "I'm listening. What would you like to know?"
        audio = text_to_speech(
            prompt,
            t2s_client,
            communication.config.voice_language_code,
            communication.config.voice_gender,
        )
        return {"audio": audio, "text": prompt, "user_query": "", "fixed_prompt": ""}

    # Process all text with LLM (no more question filtering)

    user_message = ChatMessage(
        communication_id=communication.config.id,
        role=MessageType.USER,
        message=transcript,
    )
    try:
        message_payload = [
            {
                "role": m.role.value,
                "content": m.message,
            }
            for m in communication.chat_history
        ]
        message_payload.append(
            {
                "role": user_message.role.value,
                "content": get_prompt(user_message.message, communication.custom_prompt_suffix or ""),
            }
        )
        print(f"➡️ Sending to LLM: '{user_message.message}' with suffix: '{communication.custom_prompt_suffix}'")
        chat_url = f"{llm_url}/api/chat"
        llm_response = process_request(
            message_payload,
            chat_url,
            communication.config.llm_model,
            communication.custom_prompt_suffix or "",
        )
        print(f"User query: {user_message.message}")
        print(f"Fixed prompt: {communication.custom_prompt_suffix}")
        print(f"LLM response: {llm_response}")
        bot_message = ChatMessage(
            communication_id=communication.config.id,
            role=MessageType.ASSISTANT,
            message=llm_response,
            llm_model=communication.config.llm_model,
        )
        new_messages = [user_message, bot_message]
        communication.chat_history.extend(new_messages)
        add_many_messages(db, new_messages)
        tts_input = llm_response.encode("utf-8")[:4900].decode("utf-8", errors="ignore")
        audio = text_to_speech(
            tts_input,
            t2s_client,
            communication.config.voice_language_code,
            communication.config.voice_gender,
        )
        return {
            "audio": audio,
            "text": llm_response,
            "user_query": user_message.message,
            "fixed_prompt": communication.custom_prompt_suffix or ""
        }
    except Exception as e:
        logger.exception(e)
        return {"audio": "", "text": "", "user_query": "", "fixed_prompt": ""}


def process_user_text(
    db: database.Database,
    communication: LiveCommunication,
    text: str,
    t2s_client: texttospeech.TextToSpeechClient,
    llm_url: str,
    send_message: Callable,
):
    # Process all text with LLM (no more question filtering)
    user_message = ChatMessage(
        communication_id=communication.config.id,
        role=MessageType.USER,
        message=text,
    )
    try:
        message_payload = [
            {
                "role": m.role.value,
                "content": m.message,
            }
            for m in communication.chat_history
        ]
        message_payload.append(
            {
                "role": user_message.role.value,
                #"content": f"{communication.custom_prompt_suffix or ''}\n{user_message.message}",
                "content": get_prompt(user_message.message, communication.custom_prompt_suffix or "")
            }
        )
        print("Applying suffix:", communication.custom_prompt_suffix),
        chat_url = f"{llm_url}/api/chat"
        llm_response = process_request(
            message_payload,
            chat_url,
            communication.config.llm_model.value,
            communication.custom_prompt_suffix or "",
        )
        # print("LLM response:", llm_response)
        print(f"User query: {user_message.message}")
        print(f"Fixed prompt: {communication.custom_prompt_suffix}")
        print(f"LLM response: {llm_response}")
        bot_message = ChatMessage(
            communication_id=communication.config.id,
            role=MessageType.ASSISTANT,
            message=llm_response,
            llm_model=communication.config.llm_model,
        )
        new_messages = [user_message, bot_message]
        communication.chat_history.extend(new_messages)
        add_many_messages(db, new_messages)
        if len(llm_response.encode("utf-8")) > 4900:
            logger.warning("🔇 TTS input exceeded 4900 bytes, truncating for safety.")
        tts_input = llm_response.encode("utf-8")[:4900].decode("utf-8", errors="ignore")
        audio = text_to_speech(
            tts_input,
            t2s_client,
            communication.config.voice_language_code,
            communication.config.voice_gender,
        )
        return {
            "audio": audio,
            "text": llm_response,
            "user_query": user_message.message,
            "fixed_prompt": communication.custom_prompt_suffix or ""
        }
    except Exception as e:
        logger.exception(e)
        return {"audio": "", "text": "", "user_query": "", "fixed_prompt": ""}


def process_request(
    message_history: List[Dict[str, Any]],
    chat_url: str,
    llm_model: str,
    custom_prompt_suffix: str,
) -> str:
    # print("\n========== Prompt Sent to LLM ==========")
    # print("Model:", llm_model)
    # print("URL:", chat_url)
    # print("Full Payload:\n", json.dumps(message_history, indent=2))
    #print("Custom Prompt Suffix:", custom_prompt_suffix)
    #print("========================================\n")

    try:
        # Configure retry strategy
        retry_strategy = requests.adapters.Retry(
            total=3,  # number of retries
            backoff_factor=0.5,  # wait 0.5, 1, 2 seconds between retries
            status_forcelist=[500, 502, 503, 504]  # retry on these status codes
        )
        
        # Create a session with the retry strategy
        session = requests.Session()
        adapter = requests.adapters.HTTPAdapter(max_retries=retry_strategy)
        session.mount("http://", adapter)
        session.mount("https://", adapter)

        # Make the request with timeout
        response = session.post(
            chat_url,
            json={
                "model": llm_model,
                "messages": message_history,
            },
            stream=True,
            timeout=120  # 120 seconds timeout
        )

        response.raise_for_status()  # Raise an error for bad status codes

        llm_response = ""
        chunk: bytes
        for chunk in response.iter_lines():
            if chunk:
                chunk = chunk.decode("utf-8")
                data: Dict[str, Any] = json.loads(chunk)

                if data.get("message"):
                    llm_response += data.get("message").get("content")
                if data.get("done", False):
                    break

        return llm_response

    except requests.exceptions.ConnectionError as e:
        logger.error(f"Failed to connect to LLM service at {chat_url}. Error: {str(e)}")
        raise Exception(f"LLM service is not available. Please check if it's running at {chat_url}")
    
    except requests.exceptions.Timeout as e:
        logger.error(f"Request to LLM service timed out. URL: {chat_url}")
        raise Exception("LLM service request timed out. Please try again.")
    
    except requests.exceptions.RequestException as e:
        logger.error(f"Error making request to LLM service: {str(e)}")
        raise Exception("Error communicating with LLM service. Please try again.")


def process_user_audio_with_llm(
    db: database.Database,
    communication: LiveCommunication,
    base64_audio: str,
    s2t_client: speech_v1.SpeechClient,
    t2s_client: texttospeech.TextToSpeechClient,
    llm_url: str,
    send_message: Callable,
):
    """Process user audio directly with LLM - no filler logic"""
    audio_bytes = base64.b64decode(base64_audio)
    transcript = transcribe_audio(audio_bytes, s2t_client)
    
    if transcript is None or transcript.strip() == "":
        # Return a prompt asking the user to say something
        prompt = "I'm listening. What would you like to know?"
        audio = text_to_speech(
            prompt,
            t2s_client,
            communication.config.voice_language_code,
            communication.config.voice_gender,
        )
        return {"audio": audio, "text": prompt, "user_query": "", "fixed_prompt": ""}

    # Process with LLM directly
    return _process_with_llm(
        db, communication, transcript, t2s_client, llm_url
    )


def process_user_text_with_llm(
    db: database.Database,
    communication: LiveCommunication,
    text: str,
    t2s_client: texttospeech.TextToSpeechClient,
    llm_url: str,
    send_message: Callable,
):
    """Process user text directly with LLM - no filler logic"""
    if not text or text.strip() == "":
        return None
        
    # Process with LLM directly
    return _process_with_llm(
        db, communication, text, t2s_client, llm_url
    )


def _process_with_llm(
    db: database.Database,
    communication: LiveCommunication,
    user_input: str,
    t2s_client: texttospeech.TextToSpeechClient,
    llm_url: str,
):
    """Common LLM processing logic"""
    user_message = ChatMessage(
        communication_id=communication.config.id,
        role=MessageType.USER,
        message=user_input,
    )
    
    try:
        message_payload = [
            {
                "role": m.role.value,
                "content": m.message,
            }
            for m in communication.chat_history
        ]
        message_payload.append(
            {
                "role": user_message.role.value,
                "content": get_prompt(user_input, communication.custom_prompt_suffix or ""),
            }
        )
        
        print(f"➡️ Sending to LLM: '{user_input}' with suffix: '{communication.custom_prompt_suffix}'")
        chat_url = f"{llm_url}/api/chat"
        llm_response = process_request(
            message_payload,
            chat_url,
            communication.config.llm_model,
            communication.custom_prompt_suffix or "",
        )
        
        print(f"User query: {user_input}")
        print(f"Fixed prompt: {communication.custom_prompt_suffix}")
        print(f"LLM response: {llm_response}")
        
        bot_message = ChatMessage(
            communication_id=communication.config.id,
            role=MessageType.ASSISTANT,
            message=llm_response,
            llm_model=communication.config.llm_model,
        )
        
        new_messages = [user_message, bot_message]
        communication.chat_history.extend(new_messages)
        add_many_messages(db, new_messages)
        
        # Generate TTS for the response
        if len(llm_response.encode("utf-8")) > 4900:
            logger.warning("🔇 TTS input exceeded 4900 bytes, truncating for safety.")
        tts_input = llm_response.encode("utf-8")[:4900].decode("utf-8", errors="ignore")
        audio = text_to_speech(
            tts_input,
            t2s_client,
            communication.config.voice_language_code,
            communication.config.voice_gender,
        )
        
        return {
            "audio": audio,
            "text": llm_response,
            "user_query": user_input,
            "fixed_prompt": communication.custom_prompt_suffix or ""
        }
        
    except Exception as e:
        logger.exception(e)
        return None