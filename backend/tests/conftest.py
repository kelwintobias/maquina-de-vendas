import os
import pytest
import fakeredis

# Set required env vars before any app code imports Settings
os.environ.setdefault("OPENAI_API_KEY", "sk-test")
os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_KEY", "test-key")


@pytest.fixture
async def fake_redis():
    r = fakeredis.FakeAsyncRedis(decode_responses=True)
    yield r
    await r.aclose()
