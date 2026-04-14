import asyncio
import logging
import random

from app.db.supabase import get_supabase
from app.channels.service import get_channel
from app.providers.registry import get_provider

logger = logging.getLogger(__name__)


async def run_worker():
    """Main worker loop: polls for running broadcasts and sends templates."""
    logger.info("Broadcast worker started")

    while True:
        try:
            await process_broadcasts()
        except Exception as e:
            logger.error(f"Worker error: {e}", exc_info=True)

        await asyncio.sleep(5)


async def process_broadcasts():
    sb = get_supabase()

    broadcasts = (
        sb.table("broadcasts")
        .select("*")
        .eq("status", "running")
        .execute()
        .data
    )

    for broadcast in broadcasts:
        await process_single_broadcast(broadcast)


async def process_single_broadcast(broadcast: dict):
    sb = get_supabase()
    broadcast_id = broadcast["id"]
    channel_id = broadcast.get("channel_id")

    if not channel_id:
        logger.error(f"Broadcast {broadcast_id} has no channel_id")
        return

    channel = get_channel(channel_id)
    if not channel.get("is_active"):
        logger.warning(f"Broadcast {broadcast_id} channel {channel_id} is inactive, skipping")
        return
    provider = get_provider(channel)

    # Get next batch of pending broadcast leads
    pending = (
        sb.table("broadcast_leads")
        .select("id, lead_id, leads(id, phone)")
        .eq("broadcast_id", broadcast_id)
        .eq("status", "pending")
        .limit(10)
        .execute()
        .data
    )

    if not pending:
        sb.table("broadcasts").update({"status": "completed"}).eq("id", broadcast_id).execute()
        logger.info(f"Broadcast {broadcast_id} completed")
        return

    template_variables = broadcast.get("template_variables") or {}
    components = template_variables.get("components")

    for entry in pending:
        # Check if broadcast is still running
        current = sb.table("broadcasts").select("status").eq("id", broadcast_id).single().execute().data
        if current["status"] != "running":
            logger.info(f"Broadcast {broadcast_id} paused/stopped, halting")
            return

        lead = entry.get("leads") or {}
        phone = lead.get("phone")
        if not phone:
            continue

        entry_id = entry["id"]
        try:
            await provider.send_template(
                to=phone,
                template_name=broadcast["template_name"],
                components=components,
            )
            sb.table("broadcast_leads").update({
                "status": "sent",
                "sent_at": "now()",
            }).eq("id", entry_id).execute()

            # Increment sent counter on the broadcast
            row = sb.table("broadcasts").select("sent").eq("id", broadcast_id).single().execute().data
            sb.table("broadcasts").update({"sent": row["sent"] + 1}).eq("id", broadcast_id).execute()

            logger.info(f"Template sent to {phone}")

        except Exception as e:
            logger.error(f"Failed to send to {phone}: {e}")
            sb.table("broadcast_leads").update({
                "status": "failed",
                "error_message": str(e),
            }).eq("id", entry_id).execute()

            row = sb.table("broadcasts").select("failed").eq("id", broadcast_id).single().execute().data
            sb.table("broadcasts").update({"failed": row["failed"] + 1}).eq("id", broadcast_id).execute()

        interval = random.randint(
            broadcast.get("send_interval_min", 3),
            broadcast.get("send_interval_max", 8),
        )
        await asyncio.sleep(interval)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(run_worker())
