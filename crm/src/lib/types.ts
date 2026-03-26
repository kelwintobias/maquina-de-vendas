export interface Lead {
  id: string;
  phone: string;
  name: string | null;
  company: string | null;
  stage: string;
  status: string;
  campaign_id: string | null;
  last_msg_at: string | null;
  created_at: string;
  seller_stage: string;
  assigned_to: string | null;
  human_control: boolean;
  channel: string;
}

export interface Message {
  id: string;
  lead_id: string;
  role: string;       // "user" | "assistant" | "system"
  content: string;
  stage: string | null;
  sent_by: string;    // "agent" | "seller"
  created_at: string;
}

export interface Campaign {
  id: string;
  name: string;
  template_name: string;
  template_params: Record<string, unknown> | null;
  total_leads: number;
  sent: number;
  failed: number;
  replied: number;
  status: string;
  send_interval_min: number;
  send_interval_max: number;
  created_at: string;
}
