import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from fastapi.testclient import TestClient


@pytest.fixture
def mock_supabase():
    with patch("app.cadence.router.get_supabase") as mock:
        sb = MagicMock()
        mock.return_value = sb
        yield sb


@pytest.fixture
def mock_redis():
    """Mock Redis so FastAPI lifespan doesn't fail."""
    with patch("app.main.aioredis") as mock:
        mock_r = AsyncMock()
        mock.from_url.return_value = mock_r
        yield mock_r


@pytest.fixture
def client(mock_redis):
    from app.main import app
    with TestClient(app) as c:
        yield c


class TestListCadenceSteps:
    def test_returns_steps(self, client, mock_supabase):
        mock_supabase.table.return_value.select.return_value.eq.return_value.order.return_value.order.return_value.execute.return_value.data = [
            {"id": "s1", "stage": "atacado", "step_order": 1, "message_text": "Oi!"},
            {"id": "s2", "stage": "atacado", "step_order": 2, "message_text": "Viu?"},
        ]
        resp = client.get("/api/campaigns/camp-1/cadence")
        assert resp.status_code == 200
        assert len(resp.json()["data"]) == 2


class TestCreateCadenceStep:
    def test_creates_step(self, client, mock_supabase):
        mock_supabase.table.return_value.insert.return_value.execute.return_value.data = [
            {"id": "s1", "stage": "atacado", "step_order": 1, "message_text": "Oi!"}
        ]
        resp = client.post("/api/campaigns/camp-1/cadence", json={
            "stage": "atacado", "step_order": 1, "message_text": "Oi!"
        })
        assert resp.status_code == 200
        assert resp.json()["stage"] == "atacado"


class TestUpdateCadenceStep:
    def test_updates_step(self, client, mock_supabase):
        mock_supabase.table.return_value.update.return_value.eq.return_value.eq.return_value.execute.return_value.data = [
            {"id": "s1", "message_text": "Updated!"}
        ]
        resp = client.put("/api/campaigns/camp-1/cadence/s1", json={
            "message_text": "Updated!"
        })
        assert resp.status_code == 200
        assert resp.json()["message_text"] == "Updated!"

    def test_returns_404_when_not_found(self, client, mock_supabase):
        mock_supabase.table.return_value.update.return_value.eq.return_value.eq.return_value.execute.return_value.data = []
        resp = client.put("/api/campaigns/camp-1/cadence/nonexistent", json={
            "message_text": "Updated!"
        })
        assert resp.status_code == 404


class TestDeleteCadenceStep:
    def test_deletes_step(self, client, mock_supabase):
        mock_supabase.table.return_value.delete.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock()
        resp = client.delete("/api/campaigns/camp-1/cadence/s1")
        assert resp.status_code == 200
        assert resp.json()["deleted"] is True


class TestCadenceStatus:
    def test_returns_grouped_summary(self, client, mock_supabase):
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
            {"status": "active", "leads": {"stage": "atacado"}},
            {"status": "responded", "leads": {"stage": "atacado"}},
            {"status": "active", "leads": {"stage": "private_label"}},
        ]
        resp = client.get("/api/campaigns/camp-1/cadence/status")
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["atacado"]["active"] == 1
        assert data["atacado"]["responded"] == 1
        assert data["private_label"]["active"] == 1


class TestGetLeadCadence:
    def test_returns_lead_cadence(self, client, mock_supabase):
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
            {"id": "state-1", "status": "active", "current_step": 2}
        ]
        resp = client.get("/api/leads/lead-1/cadence")
        assert resp.status_code == 200
        assert resp.json()["data"]["current_step"] == 2

    def test_returns_null_when_no_cadence(self, client, mock_supabase):
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
        resp = client.get("/api/leads/lead-1/cadence")
        assert resp.status_code == 200
        assert resp.json()["data"] is None
