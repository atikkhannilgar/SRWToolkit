import os
import re
import time
from collections.abc import AsyncIterator, Awaitable, Callable
from typing import TypeVar, ParamSpec

import proquint
from fastapi import Depends as _Depends

T = TypeVar("T")
P = ParamSpec("P")


def Depends(
    dependency: (
        Callable[P, Awaitable[T]]
        | Callable[P, AsyncIterator[T]]
        | Callable[P, T]
        | None
    ) = None,
    *,
    use_cache: bool = True,
) -> T:
    return _Depends(dependency=dependency, use_cache=use_cache)


MAX_ID_VALUE = 0xFFFFFFFF


def generate_id() -> str:
    """
    Generate pronounceable random id
    """
    random_int = int.from_bytes(os.urandom(4)) % (MAX_ID_VALUE + 1)
    timestamp_int = int(time.time()) % (MAX_ID_VALUE + 1)
    combined_int = (random_int + timestamp_int) % (MAX_ID_VALUE + 1)

    return proquint.hex2quint_str(hex(combined_int))


def to_camel_case(snake_str):
    components = snake_str.split("_")
    return components[0] + "".join(x.title() for x in components[1:])


def to_snake_case(camel_str):
    return re.sub(r"(?<!^)(?=[A-Z])", "_", camel_str).lower()
