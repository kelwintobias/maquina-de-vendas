from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.channels.service import (
    list_channels, get_channel, create_channel, update_channel, delete_channel,
)

router = APIRouter(prefix="/api/channels", tags=["channels"])


class ChannelCreate(BaseModel):
    name: str
    phone: str
    provider: str  # "meta_cloud" | "evolution"
    provider_config: dict
    agent_profile_id: str | None = None


class ChannelUpdate(BaseModel):
    name: str | None = None
    provider_config: dict | None = None
    agent_profile_id: str | None = None
    is_active: bool | None = None


@router.get("")
async def api_list_channels():
    return {"data": list_channels()}


@router.get("/{channel_id}")
async def api_get_channel(channel_id: str):
    return get_channel(channel_id)


@router.post("")
async def api_create_channel(body: ChannelCreate):
    if body.provider not in ("meta_cloud", "evolution"):
        raise HTTPException(400, "Provider must be 'meta_cloud' or 'evolution'")
    return create_channel(body.model_dump(exclude_none=True))


@router.put("/{channel_id}")
async def api_update_channel(channel_id: str, body: ChannelUpdate):
    data = body.model_dump(exclude_none=True)
    if not data:
        raise HTTPException(400, "No fields to update")
    return update_channel(channel_id, data)


@router.delete("/{channel_id}")
async def api_delete_channel(channel_id: str):
    delete_channel(channel_id)
    return {"status": "deleted"}
