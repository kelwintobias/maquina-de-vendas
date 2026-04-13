from unittest.mock import AsyncMock, patch, MagicMock
import pytest


@pytest.mark.asyncio
async def test_dispatch_sends_template_and_saves_message():
    """dispatch_to_lead should POST to Meta API and save message to DB."""
    mock_response = MagicMock()
    mock_response.raise_for_status = MagicMock()
    mock_response.json.return_value = {"messages": [{"id": "wamid.123"}]}

    mock_lead = {"id": "lead-abc", "phone": "+5511999999999", "stage": "secretaria", "status": "imported", "name": None}

    with patch("app.outbound.dispatcher.settings") as mock_settings, \
         patch("app.outbound.dispatcher.get_or_create_lead", return_value=mock_lead), \
         patch("app.outbound.dispatcher.save_message") as mock_save, \
         patch("httpx.AsyncClient") as mock_client_class:

        mock_settings.meta_access_token = "test-token"
        mock_settings.meta_phone_number_id = "123456"

        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)
        mock_client.post = AsyncMock(return_value=mock_response)
        mock_client_class.return_value = mock_client

        from app.outbound.dispatcher import dispatch_to_lead
        result = await dispatch_to_lead("+5511999999999", {})

        assert result["status"] == "sent"
        assert result["phone"] == "+5511999999999"
        mock_client.post.assert_called_once()
        mock_save.assert_called_once()


@pytest.mark.asyncio
async def test_dispatch_missing_token_raises():
    """dispatch_to_lead should raise ValueError when META_ACCESS_TOKEN is not set."""
    with patch("app.outbound.dispatcher.settings") as mock_settings:
        mock_settings.meta_access_token = ""
        mock_settings.meta_phone_number_id = "123456"

        from app.outbound.dispatcher import dispatch_to_lead
        with pytest.raises(ValueError, match="META_ACCESS_TOKEN"):
            await dispatch_to_lead("+5511999999999", {})
