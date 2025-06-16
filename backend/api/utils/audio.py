import base64

from google.cloud import speech_v1, texttospeech

from ..config import get_cfg
from ..utils import Depends


def get_s2t_client(cfg=Depends(get_cfg)):
    # if cfg.debug:
    #     return speech.SpeechClient()
    return speech_v1.SpeechClient()


def get_t2s_client(cfg=Depends(get_cfg)):
    # if cfg.debug:
    #     return speech.SpeechClient()
    return texttospeech.TextToSpeechClient()


def transcribe_audio(
    audio_bytes: bytes,
    client: speech_v1.SpeechClient,
) -> str:
    audio = speech_v1.RecognitionAudio(content=audio_bytes)
    config = speech_v1.RecognitionConfig(
        encoding=speech_v1.RecognitionConfig.AudioEncoding.MP3,  # Change based on audio type
        sample_rate_hertz=16000,
        language_code="en-IN",
    )
    request = speech_v1.RecognizeRequest(
        config=config,
        audio=audio,
    )

    response = client.recognize(request=request)

    transcript = ""
    for result in response.results:
        transcript += result.alternatives[0].transcript

    return transcript


def text_to_speech(
    text: str,
    client: texttospeech.TextToSpeechClient,
    language_code: str,
    gender: str,
) -> bytes:
    synthesis_input = texttospeech.SynthesisInput(text=text)

    voice = texttospeech.VoiceSelectionParams(
        language_code=language_code,
        ssml_gender=texttospeech.SsmlVoiceGender[gender],
    )

    audio_config = texttospeech.AudioConfig(
        audio_encoding=texttospeech.AudioEncoding.MP3
    )

    response = client.synthesize_speech(
        input=synthesis_input, voice=voice, audio_config=audio_config
    )

    return base64.b64encode(response.audio_content).decode("utf-8")
