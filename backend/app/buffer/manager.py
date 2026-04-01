import asyncio
import logging

import redis.asyncio as aioredis

from app.config import settings
from app.webhook.parser import IncomingMessage

logger = logging.getLogger(__name__)

_active_timers: dict[str, asyncio.Task] = {}


async def push_to_buffer(r: aioredis.Redis, msg: IncomingMessage, channel: dict):
    """Push a message to the buffer. Key includes channel_id for isolation."""
    phone = msg.from_number
    channel_id = channel["id"]
    buffer_key = f"buffer:{channel_id}:{phone}"
    lock_key = f"buffer:{channel_id}:{phone}:lock"
    timer_key = f"{channel_id}:{phone}"

    # Build text content (media resolved later)
    if msg.media_id:
        text = msg.text or f"[{msg.type}: media_id={msg.media_id}]"
    elif msg.media_url:
        text = msg.text or f"[{msg.type}: media_url={msg.media_url}]"
    else:
        text = msg.text or ""

    await r.rpush(buffer_key, text)

    has_lock = await r.exists(lock_key)

    if has_lock:
        current_ttl = await r.ttl(lock_key)
        new_ttl = min(
            current_ttl + settings.buffer_extend_timeout,
            settings.buffer_max_timeout,
        )
        await r.expire(lock_key, new_ttl)
        logger.info(f"Buffer extended for {phone} on channel {channel['name']}: TTL now {new_ttl}s")
    else:
        await r.set(lock_key, "1", ex=settings.buffer_base_timeout)
        logger.info(f"Buffer started for {phone} on channel {channel['name']}: {settings.buffer_base_timeout}s")

        if timer_key in _active_timers:
            _active_timers[timer_key].cancel()

        _active_timers[timer_key] = asyncio.create_task(
            _wait_and_flush(r, phone, channel)
        )


async def _wait_and_flush(r: aioredis.Redis, phone: str, channel: dict):
    """Wait for the buffer to expire, then flush."""
    from app.buffer.processor import process_buffered_messages

    channel_id = channel["id"]
    lock_key = f"buffer:{channel_id}:{phone}:lock"
    buffer_key = f"buffer:{channel_id}:{phone}"
    timer_key = f"{channel_id}:{phone}"

    while True:
        await asyncio.sleep(1)
        exists = await r.exists(lock_key)
        if not exists:
            break

    messages = await r.lrange(buffer_key, 0, -1)
    await r.delete(buffer_key)

    _active_timers.pop(timer_key, None)

    if messages:
        combined = "\n".join(messages)
        logger.info(f"Buffer flushed for {phone} on channel {channel['name']}: {len(messages)} messages")
        await process_buffered_messages(phone, combined, channel)
