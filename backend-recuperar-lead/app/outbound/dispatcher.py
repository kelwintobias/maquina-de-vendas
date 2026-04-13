import logging

import httpx

from app.config import settings
from app.leads.service import get_or_create_lead, save_message

logger = logging.getLogger(__name__)

META_API_BASE = "https://graph.facebook.com/v21.0"

# ---------------------------------------------------------------------------
# Template hardcoded — primeiro contato ativo com o lead
# Substituir pelo template aprovado pela Meta antes de ir a producao
# ---------------------------------------------------------------------------
TEMPLATE_TEXT = (
    "oi, tudo bem?\n\n"
    "aqui e a Valeria, do comercial da Cafe Canastra\n\n"
    "a gente trabalha com cafe especial — atacado, private label e exportacao\n\n"
    "queria entender se faz sentido pra voce, tem um minutinho?"
)


async def dispatch_to_lead(phone: str, lead_context: dict) -> dict:
    """
    Envia o template de re-engajamento para um lead via Meta Cloud API.
    Salva a mensagem no historico para o agent ter contexto ao responder.

    Args:
        phone: numero no formato +5511999999999
        lead_context: dados opcionais do CRM (name, company, previous_stage, notes)

    Returns:
        {"status": "sent", "phone": phone, "lead_id": str}
    """
    if not settings.meta_access_token:
        raise ValueError("META_ACCESS_TOKEN nao configurado")
    if not settings.meta_phone_number_id:
        raise ValueError("META_PHONE_NUMBER_ID nao configurado")

    url = f"{META_API_BASE}/{settings.meta_phone_number_id}/messages"
    headers = {
        "Authorization": f"Bearer {settings.meta_access_token}",
        "Content-Type": "application/json",
    }
    payload = {
        "messaging_product": "whatsapp",
        "to": phone,
        "type": "text",
        "text": {"body": TEMPLATE_TEXT},
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(url, json=payload, headers=headers)
        resp.raise_for_status()
        result = resp.json()

    # Resolve or create lead
    lead = get_or_create_lead(phone)
    lead_id = lead["id"]

    # Save dispatcher message as assistant so agent has context
    save_message(lead_id, "assistant", TEMPLATE_TEXT, "secretaria")

    logger.info(f"[DISPATCH] Template sent to {phone} (lead_id={lead_id}), wamid={result}")
    return {"status": "sent", "phone": phone, "lead_id": lead_id}
