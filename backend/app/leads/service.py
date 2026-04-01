from typing import Any

from app.db.supabase import get_supabase


def get_or_create_lead(phone: str) -> dict[str, Any]:
    """Get or create a global lead by phone."""
    sb = get_supabase()
    result = sb.table("leads").select("*").eq("phone", phone).execute()

    if result.data:
        return result.data[0]

    new_lead = {"phone": phone}
    result = sb.table("leads").insert(new_lead).execute()
    return result.data[0]


def update_lead(lead_id: str, **fields) -> dict[str, Any]:
    sb = get_supabase()
    result = sb.table("leads").update(fields).eq("id", lead_id).execute()
    return result.data[0]


def get_lead(lead_id: str) -> dict[str, Any]:
    sb = get_supabase()
    result = sb.table("leads").select("*").eq("id", lead_id).single().execute()
    return result.data
