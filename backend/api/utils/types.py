from enum import Enum


# COMMUNICATION
class SendGenericMessage(Enum):
    CONNECTION_SUCCESSFUL = "CONNECTION_SUCCESSFUL"
    CLOSE_CONNECTION = "CLOSE_CONNECTION"
    INVALID_COMMUNICATION_ID = "INVALID_COMMUNICATION_ID"
    ERROR = "ERROR"
    SYSTEM_CONFIG = "SYSTEM_CONFIG"


class SendBotMessage(Enum):
    NEW_BOT_DETECTED = "NEW_BOT_DETECTED"
    AUDIO_RESPONSE = "AUDIO_RESPONSE"


class ReceiveBotMessage(Enum):
    SEND_AUDIO = "SEND_AUDIO"
    SEND_TEXT = "SEND_TEXT"


class SendControlPanelMessage(Enum):
    NEW_CONTROL_PANEL_DETECTED = "NEW_CONTROL_PANEL_DETECTED"
    IS_BOT_CONNECTED = "IS_BOT_CONNECTED"
    PING_STATE = "PING_STATE"


class ReceiveControlPanelMessage(Enum):
    UPDATE_CONFIG = "UPDATE_CONFIG"
    PING = "PING"


class SkinType(str, Enum):
    FULLBOT = "fullbot"
    SIMPLE = "simple"
    FACEONLY = "faceonly"


class LLMModel(str, Enum):
    gemma2_9b = "gemma2:9b"
    llama3_2_latest = "llama3.2:latest"
    nemotron_mini_latest = "nemotron-mini:latest"
    phi3_5_latest = "phi3.5:latest"
    qwen2_5_latest = "qwen2.5:latest"


# CHAT
class MessageType(str, Enum):
    ASSISTANT = "assistant"
    USER = "user"


class VoiceLanguageCode(str, Enum):
    en_AU = "en-AU"
    en_GB = "en-GB"
    en_IN = "en-IN"
    en_US = "en-US"


class VoiceGender(str, Enum):
    MALE = "MALE"
    FEMALE = "FEMALE"
    NEUTRAL = "NEUTRAL"
    SSML_VOICE_GENDER_UNSPECIFIED = "SSML_VOICE_GENDER_UNSPECIFIED"


# USER DATA
class Activity(str, Enum):
    RUNNING = "Running"
    CYCLING = "Cycling"
    YOGA = "Yoga"
    SWIMMING = "Swimming"
    WALKING = "Walking"
    WEIGHTLIFTING = "Weightlifting"
    HIKING = "Hiking"


class DayOfWeek(str, Enum):
    MONDAY = "Monday"
    TUESDAY = "Tuesday"
    WEDNESDAY = "Wednesday"
    THURSDAY = "Thursday"
    FRIDAY = "Friday"
    SATURDAY = "Saturday"
    SUNDAY = "Sunday"
