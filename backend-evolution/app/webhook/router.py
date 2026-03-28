import logging

from fastapi import APIRouter, Request

from app.webhook.parser import parse_webhook_payload
from app.whatsapp.client import mark_read, send_text
from app.buffer.manager import push_to_buffer
from app.leads.service import get_or_create_lead, reset_lead

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/webhook")
async def receive_webhook(request: Request):
    payload = await request.json()

    logger.info(f"Webhook event: {payload.get('event', 'unknown')}")

    messages = parse_webhook_payload(payload)

    for msg in messages:
        logger.info(f"Message from {msg.from_number} ({msg.push_name}): type={msg.type}, text={msg.text[:50] if msg.text else 'N/A'}")

        # Mark as read
        try:
            await mark_read(msg.message_id, msg.remote_jid)
        except Exception as e:
            logger.warning(f"Failed to mark read: {e}")

        # Handle !resetar command
        if msg.text and msg.text.strip().lower() == "!resetar":
            try:
                lead = get_or_create_lead(msg.from_number)
                reset_lead(lead["id"])
                await send_text(msg.from_number, "Memoria resetada! Pode comecar uma nova conversa do zero.")
            except Exception as e:
                logger.error(f"Failed to reset lead: {e}", exc_info=True)
                await send_text(msg.from_number, "Erro ao resetar. Tente novamente.")
            continue

        # Push to buffer for processing
        redis = request.app.state.redis
        await push_to_buffer(redis, msg)

    return {"status": "ok"}
