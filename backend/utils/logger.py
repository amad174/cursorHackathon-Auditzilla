"""Tiny logger factory used across the backend.

We keep this dead simple so every service emits structured-ish, prefixed
logs that are easy to grep during the demo.
"""

from __future__ import annotations

import logging
import os
import sys

_LEVEL = os.environ.get("AUDITZILLA_LOG_LEVEL", "INFO").upper()
_FORMAT = "%(asctime)s | %(levelname)-7s | %(name)-22s | %(message)s"

_configured = False


def _configure_root() -> None:
    global _configured
    if _configured:
        return
    handler = logging.StreamHandler(stream=sys.stdout)
    handler.setFormatter(logging.Formatter(_FORMAT))
    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(_LEVEL)
    _configured = True


def get_logger(name: str) -> logging.Logger:
    """Return a namespaced logger; configures root once on first call."""
    _configure_root()
    return logging.getLogger(name)
