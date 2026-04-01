from fastapi import APIRouter, Query

from app.db.supabase import get_supabase

router = APIRouter(prefix="/api/leads", tags=["leads"])


@router.get("")
async def list_leads(
    limit: int = Query(50, le=200),
    offset: int = 0,
    search: str | None = None,
):
    sb = get_supabase()
    query = sb.table("leads").select("*")

    if search:
        query = query.or_(f"phone.ilike.%{search}%,name.ilike.%{search}%")

    result = query.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
    return {"data": result.data, "count": len(result.data)}


@router.get("/{lead_id}")
async def get_lead(lead_id: str):
    sb = get_supabase()
    result = sb.table("leads").select("*").eq("id", lead_id).single().execute()
    return result.data


@router.get("/{lead_id}/conversations")
async def get_lead_conversations(lead_id: str):
    """Get all conversations for a lead across all channels."""
    sb = get_supabase()
    result = (
        sb.table("conversations")
        .select("*, channels(id, name, phone, provider)")
        .eq("lead_id", lead_id)
        .order("last_msg_at", desc=True, nullsfirst=False)
        .execute()
    )
    return {"data": result.data}


@router.get("/{lead_id}/messages")
async def get_lead_messages(lead_id: str, limit: int = Query(50, le=200)):
    """Get all messages for a lead (across all conversations)."""
    sb = get_supabase()
    result = (
        sb.table("messages")
        .select("*, conversations(channel_id, stage)")
        .eq("lead_id", lead_id)
        .order("created_at", desc=False)
        .limit(limit)
        .execute()
    )
    return {"data": result.data}
