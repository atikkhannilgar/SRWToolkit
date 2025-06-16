import os
import sys

import uvicorn
from loguru import logger

from .config import get_cfg

logger.enable("app")
logger.remove()
level = "INFO"
if get_cfg().debug:
    level = "DEBUG"
logger.add(sys.stderr, level=level, serialize=True, diagnose=False, enqueue=True)

uvicorn.run(
    "api.app:app",
    host=os.environ.get("HOST", "0.0.0.0"),
    port=int(os.environ.get("PORT", "1339")),
    workers=1,
    access_log=False,
    server_header=False,
    reload=get_cfg().debug,
)
