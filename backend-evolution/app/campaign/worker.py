import asyncio
import logging
import random

from app.config import settings
from app.db.supabase import get_supabase
from app.whatsapp.client import send_template
from app.cadence.service import create_cadence_state
from app.cadence.scheduler import process_due_cadences, process_reengagements, calculate_next_send_at

from datetime import datetime, timezone, timedelta

logger = logging.getLogger(__name__)


async def run_worker():
    """Main worker loop: polls for running campaigns, sends templates, processes cadence."""
    logger.info("Campaign worker started")

    while True:
        try:
            await process_campaigns()
            await process_due_cadences()
            await process_reengagements()
        except Exception as e:
            logger.error(f"Worker error: {e}", exc_info=True)

        await asyncio.sleep(5)


async def process_campaigns():
    """Find running campaigns and send pending templates."""
    sb = get_supabase()

    # Get running campaigns
    campaigns = (
        sb.table("campaigns")
        .select("*")
        .eq("status", "running")
        .execute()
        .data
    )

    for campaign in campaigns:
        await process_single_campaign(campaign)


async def process_single_campaign(campaign: dict):
    """Process one campaign: send templates to pending leads."""
    sb = get_supabase()
    campaign_id = campaign["id"]

    # Get next batch of unsent leads
    leads = (
        sb.table("leads")
        .select("id, phone, stage")
        .eq("campaign_id", campaign_id)
        .eq("status", "imported")
        .limit(10)
        .execute()
        .data
    )

    if not leads:
        # Check if there are still active cadences before marking completed
        active_cadences = (
            sb.table("cadence_state")
            .select("id")
            .eq("campaign_id", campaign_id)
            .eq("status", "active")
            .limit(1)
            .execute()
            .data
        )
        if not active_cadences:
            sb.table("campaigns").update({"status": "completed"}).eq("id", campaign_id).execute()
            logger.info(f"Campaign {campaign_id} completed")
        return

    for lead in leads:
        # Check if campaign is still running (might have been paused)
        current = sb.table("campaigns").select("status").eq("id", campaign_id).single().execute().data
        if current["status"] != "running":
            logger.info(f"Campaign {campaign_id} paused, stopping")
            return

        try:
            await send_template(
                to=lead["phone"],
                template_name=campaign["template_name"],
                components=campaign.get("template_params", {}).get("components"),
            )
            sb.table("leads").update({"status": "template_sent"}).eq("id", lead["id"]).execute()

            # Update sent counter
            sb.rpc("increment_campaign_sent", {"campaign_id_param": campaign_id}).execute()

            # Create cadence state for this lead
            now = datetime.now(timezone.utc)
            interval = campaign.get("cadence_interval_hours", 24)
            max_msgs = campaign.get("cadence_max_messages", 8)

            next_send = calculate_next_send_at(
                now, interval,
                campaign.get("cadence_send_start_hour", 7),
                campaign.get("cadence_send_end_hour", 18),
            )

            try:
                create_cadence_state(
                    lead_id=lead["id"],
                    campaign_id=campaign_id,
                    max_messages=max_msgs,
                    next_send_at=next_send,
                )
            except Exception as ce:
                # Lead might already have a cadence state (duplicate import)
                logger.warning(f"Could not create cadence state for {lead['phone']}: {ce}")

            logger.info(f"Template sent to {lead['phone']}")

        except Exception as e:
            logger.error(f"Failed to send to {lead['phone']}: {e}")
            sb.table("leads").update({"status": "failed"}).eq("id", lead["id"]).execute()

        # Wait between sends (randomized interval)
        interval = random.randint(
            campaign.get("send_interval_min", 3),
            campaign.get("send_interval_max", 8),
        )
        await asyncio.sleep(interval)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(run_worker())
