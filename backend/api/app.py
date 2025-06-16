from contextlib import asynccontextmanager
from typing import Final

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from .config import get_cfg
from .mongodb import mongo_client
from .routers import communication, socket, prompt


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield

    if mongo_client is not None:
        mongo_client.close()
        logger.info("Connection to MongoDB closed.")


def create_app() -> FastAPI:
    app_config = get_cfg()
    app = FastAPI(debug=app_config.debug, lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=app_config.origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(communication.router)
    app.include_router(socket.router)
    app.include_router(prompt.router)
    return app


app: Final = create_app()
