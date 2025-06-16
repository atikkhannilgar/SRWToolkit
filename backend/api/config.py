from functools import cache
from typing import List
import os

from pydantic_settings import BaseSettings


class Config(BaseSettings):
    debug: bool = False
    origins: List[str] = [
        "*",  # limit the access here considering the docker network
    ]
    mongodb_url: str = "mongodb://localhost:27017/"
    db_name: str = "socialrobot"
    
    # Use environment variable with fallback for local development
    llm_url: str = os.getenv(
        "LLM_SERVICE_URL",
        "http://localhost:11434"  # fallback for local development
    )
    ollama_port: int = int(os.getenv("OLLAMA_PORT", "11434"))

    # Add environment-specific configurations
    is_docker: bool = os.getenv("DOCKER_ENV", "false").lower() == "true"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if self.is_docker:
            # In Docker, use the service name instead of localhost
            if "localhost" in self.llm_url:
                self.llm_url = f"http://llm-service:{self.ollama_port}"
            if "localhost" in self.mongodb_url:
                self.mongodb_url = self.mongodb_url.replace("localhost", "mongodb")

def get_cfg() -> Config:
    return cache(Config)()
