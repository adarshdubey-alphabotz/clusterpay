import time
from collections import defaultdict
from fastapi import HTTPException
from src.config import settings

request_history = defaultdict(list)

def check_rate_limit(client_identifier: str):
    now = time.time()
    history = request_history[client_identifier]
    # Remove timestamps older than 60 seconds
    request_history[client_identifier] = [t for t in history if now - t < 60]
    if len(request_history[client_identifier]) >= settings.RATE_LIMIT_PER_MINUTE:
        raise HTTPException(status_code=429, detail="Too many requests. Rate limit exceeded (60 req/min).")
    request_history[client_identifier].append(now)
