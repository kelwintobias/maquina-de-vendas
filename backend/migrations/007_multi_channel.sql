-- 007_multi_channel.sql
-- Multi-channel CRM: channels, agent_profiles, conversations

-- Agent profiles (must come before channels due to FK)
CREATE TABLE IF NOT EXISTS agent_profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    model text NOT NULL DEFAULT 'gpt-4.1',
    stages jsonb NOT NULL DEFAULT '{}',
    base_prompt text NOT NULL DEFAULT '',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Channels (WhatsApp numbers)
CREATE TABLE IF NOT EXISTS channels (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    phone text NOT NULL UNIQUE,
    provider text NOT NULL CHECK (provider IN ('meta_cloud', 'evolution')),
    provider_config jsonb NOT NULL DEFAULT '{}',
    agent_profile_id uuid REFERENCES agent_profiles(id) ON DELETE SET NULL,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_channels_phone ON channels(phone);
CREATE INDEX idx_channels_provider ON channels(provider);

-- Conversations (lead + channel)
CREATE TABLE IF NOT EXISTS conversations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
    channel_id uuid REFERENCES channels(id) ON DELETE CASCADE,
    stage text DEFAULT 'secretaria',
    status text DEFAULT 'active',
    campaign_id uuid REFERENCES campaigns(id) ON DELETE SET NULL,
    last_msg_at timestamptz,
    created_at timestamptz DEFAULT now(),
    UNIQUE(lead_id, channel_id)
);

CREATE INDEX idx_conversations_channel ON conversations(channel_id);
CREATE INDEX idx_conversations_lead ON conversations(lead_id);
CREATE INDEX idx_conversations_status ON conversations(status);

-- Add conversation_id to messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);

-- Add channel_id to campaigns
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS channel_id uuid REFERENCES channels(id) ON DELETE SET NULL;

-- Add channel_id to templates
ALTER TABLE templates ADD COLUMN IF NOT EXISTS channel_id uuid REFERENCES channels(id) ON DELETE SET NULL;

-- Add metadata to leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE channels;
ALTER PUBLICATION supabase_realtime ADD TABLE agent_profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
