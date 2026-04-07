import pytest
import fakeredis


@pytest.fixture
async def fake_redis():
    r = fakeredis.FakeAsyncRedis(decode_responses=True)
    yield r
    await r.aclose()
