import time
import logging
from collections import defaultdict
from fastapi import Request, HTTPException
from src.config import settings

logger = logging.getLogger(__name__)

# ─── In-process sliding window store ─────────────────────────────────────────
# NOTE: This is per-process only. In multi-worker deployments, use Redis.
# Set REDIS_URL in .env to enable Redis-backed rate limiting (recommended in production).
_request_history: dict = defaultdict(list)

try:
    from src.config import settings as _s
    _REDIS_URL = getattr(_s, "REDIS_URL", "")
except Exception:
    _REDIS_URL = ""

# Try Redis if configured
_redis_client = None
if _REDIS_URL:
    try:
        import redis.asyncio as aioredis  # type: ignore
        _redis_client = aioredis.from_url(_REDIS_URL, decode_responses=True)
        logger.info(f"Rate limiter: Redis backend configured at {_REDIS_URL}")
    except ImportError:
        logger.warning("redis package not installed. Falling back to in-process rate limiter. Run: pip install redis")
    except Exception as e:
        logger.warning(f"Redis connection failed ({e}). Falling back to in-process rate limiter.")


async def check_rate_limit_async(client_identifier: str, limit: int = None, window_seconds: int = 60):
    """
    Async sliding-window rate limiter.
    Uses Redis if REDIS_URL is configured, otherwise in-process dict (single-worker only).
    Raises HTTP 429 when the limit is exceeded.
    """
    limit = limit or settings.RATE_LIMIT_PER_MINUTE

    if _redis_client:
        try:
            key = f"cpay_rl:{client_identifier}"
            pipe = _redis_client.pipeline()
            now = time.time()
            window_start = now - window_seconds
            # Sorted set: score = timestamp, member = unique token
            await pipe.zremrangebyscore(key, "-inf", window_start)
            await pipe.zadd(key, {str(now): now})
            await pipe.zcard(key)
            await pipe.expire(key, window_seconds + 5)
            results = await pipe.execute()
            count = results[2]
            if count > limit:
                raise HTTPException(
                    status_code=429,
                    detail=f"Too many requests. Rate limit: {limit} per {window_seconds}s.",
                    headers={"Retry-After": str(window_seconds)}
                )
            return
        except HTTPException:
            raise
        except Exception as e:
            logger.warning(f"Redis rate limit check failed ({e}), falling through to in-process limiter.")

    # In-process fallback
    now = time.time()
    history = _request_history[client_identifier]
    _request_history[client_identifier] = [t for t in history if now - t < window_seconds]
    if len(_request_history[client_identifier]) >= limit:
        raise HTTPException(
            status_code=429,
            detail=f"Too many requests. Rate limit: {limit} per {window_seconds}s.",
            headers={"Retry-After": str(window_seconds)}
        )
    _request_history[client_identifier].append(now)


def check_rate_limit(client_identifier: str, limit: int = None, window_seconds: int = 60):
    """
    Sync wrapper for backwards compatibility.
    For async contexts (FastAPI route handlers) prefer check_rate_limit_async().
    """
    limit = limit or settings.RATE_LIMIT_PER_MINUTE
    now = time.time()
    history = _request_history[client_identifier]
    _request_history[client_identifier] = [t for t in history if now - t < window_seconds]
    if len(_request_history[client_identifier]) >= limit:
        raise HTTPException(
            status_code=429,
            detail=f"Too many requests. Rate limit: {limit} per {window_seconds}s.",
            headers={"Retry-After": str(window_seconds)}
        )
    _request_history[client_identifier].append(now)
