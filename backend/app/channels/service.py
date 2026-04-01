from typing import Any

from app.db.supabase import get_supabase


def list_channels() -> list[dict[str, Any]]:
    sb = get_supabase()
    result = (
        sb.table("channels")
        .select("*, agent_profiles(id, name)")
        .order("created_at", desc=True)
        .execute()
    )
    return result.data


def get_channel(channel_id: str) -> dict[str, Any]:
    sb = get_supabase()
    result = (
        sb.table("channels")
        .select("*, agent_profiles(id, name)")
        .eq("id", channel_id)
        .single()
        .execute()
    )
    return result.data


def get_channel_by_phone(phone: str) -> dict[str, Any] | None:
    sb = get_supabase()
    result = sb.table("channels").select("*").eq("phone", phone).execute()
    return result.data[0] if result.data else None


def get_channel_by_provider_config(key: str, value: str) -> dict[str, Any] | None:
    """Find channel by a field in provider_config JSONB.
    Used to resolve Meta webhook by phone_number_id.
    """
    sb = get_supabase()
    result = (
        sb.table("channels")
        .select("*")
        .filter("provider_config->>{}".format(key), "eq", value)
        .execute()
    )
    return result.data[0] if result.data else None


def create_channel(data: dict) -> dict[str, Any]:
    sb = get_supabase()
    result = sb.table("channels").insert(data).execute()
    return result.data[0]


def update_channel(channel_id: str, data: dict) -> dict[str, Any]:
    sb = get_supabase()
    result = sb.table("channels").update(data).eq("id", channel_id).execute()
    return result.data[0]


def delete_channel(channel_id: str) -> None:
    sb = get_supabase()
    sb.table("channels").delete().eq("id", channel_id).execute()
