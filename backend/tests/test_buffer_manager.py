import time
import pytest
from app.webhook.parser import IncomingMessage
from app.buffer.manager import push_to_buffer, FLUSH_QUEUE_KEY


def _make_msg(text="oi", message_id="wamid.test1"):
    return IncomingMessage(
        from_number="5511999999999",
        message_id=message_id,
        timestamp="1234567890",
        type="text",
        text=text,
        channel_id="chan-uuid",
    )


def _make_channel():
    return {"id": "chan-uuid", "name": "Test Channel", "provider": "meta_cloud"}


async def test_push_adiciona_texto_ao_buffer(fake_redis):
    msg = _make_msg("hello")
    channel = _make_channel()

    await push_to_buffer(fake_redis, msg, channel)

    items = await fake_redis.lrange("buffer:chan-uuid:5511999999999", 0, -1)
    assert items == ["hello"]


async def test_push_agenda_flush_no_sorted_set(fake_redis):
    msg = _make_msg()
    channel = _make_channel()
    before = time.time()

    await push_to_buffer(fake_redis, msg, channel)

    score = await fake_redis.zscore(FLUSH_QUEUE_KEY, "chan-uuid:5511999999999")
    assert score is not None
    # Score deve ser ~15s no futuro (buffer_base_timeout default)
    assert before + 10 < score < before + 30


async def test_segunda_push_estende_score_sem_reduzir(fake_redis, monkeypatch):
    import app.buffer.manager as manager_mod
    # Simular base_timeout=15, extend_timeout=10
    monkeypatch.setattr("app.buffer.manager.settings.buffer_base_timeout", 15)
    monkeypatch.setattr("app.buffer.manager.settings.buffer_extend_timeout", 10)
    monkeypatch.setattr("app.buffer.manager.settings.buffer_max_timeout", 45)

    msg1 = _make_msg("msg1", "wamid.1")
    msg2 = _make_msg("msg2", "wamid.2")
    channel = _make_channel()

    await push_to_buffer(fake_redis, msg1, channel)
    score_after_first = await fake_redis.zscore(FLUSH_QUEUE_KEY, "chan-uuid:5511999999999")

    await push_to_buffer(fake_redis, msg2, channel)
    score_after_second = await fake_redis.zscore(FLUSH_QUEUE_KEY, "chan-uuid:5511999999999")

    assert score_after_second >= score_after_first


async def test_media_id_gera_placeholder_no_buffer(fake_redis):
    msg = IncomingMessage(
        from_number="5511999999999",
        message_id="wamid.audio1",
        timestamp="123",
        type="audio",
        media_id="media_abc",
        channel_id="chan-uuid",
    )
    channel = _make_channel()

    await push_to_buffer(fake_redis, msg, channel)

    items = await fake_redis.lrange("buffer:chan-uuid:5511999999999", 0, -1)
    assert items == ["[audio: media_id=media_abc]"]
