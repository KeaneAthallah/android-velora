import { apiRequest } from "@/api/client";
import type { SalesChannel } from "@/api/types";

type RawChannel = {
  id: number | string;
  name: string;
  code?: string | null;
  kind?: string | null;
  outlet_id?: number | string | null;
  commission_percent?: string | number | null;
  payment_method_code?: string | null;
  auto_accept?: boolean | null;
  prep_buffer_minutes?: number | null;
  is_active?: boolean | null;
  webhook_url?: string | null;
  last_order_at?: string | null;
};

function mapChannel(raw: RawChannel): SalesChannel {
  return {
    id: String(raw.id),
    name: raw.name,
    code: raw.code ?? "",
    kind: raw.kind ?? "custom",
    outletId: raw.outlet_id == null ? null : String(raw.outlet_id),
    commissionPercent: String(raw.commission_percent ?? "0"),
    paymentMethodCode: raw.payment_method_code ?? null,
    autoAccept: raw.auto_accept === true,
    prepBufferMinutes: raw.prep_buffer_minutes ?? 0,
    active: raw.is_active !== false,
    webhookUrl: raw.webhook_url ?? null,
    lastOrderAt: raw.last_order_at ?? null,
  };
}

/** `GET /channels` — needs `channels.view`. Returns every channel, unpaginated. */
export async function fetchChannels(): Promise<SalesChannel[]> {
  const data = await apiRequest<RawChannel[]>("/channels");
  return (Array.isArray(data) ? data : []).map(mapChannel);
}

/**
 * `PUT /channels/{id}` — needs `channels.manage`. Used here only to take a
 * channel offline or bring it back; the secret is never re-sent.
 */
export async function setChannelActive(
  channel: SalesChannel,
  active: boolean,
): Promise<SalesChannel> {
  const raw = await apiRequest<RawChannel>(
    `/channels/${encodeURIComponent(channel.id)}`,
    {
      method: "PUT",
      body: {
        name: channel.name,
        // `code` is deliberately left out: it is validation-patterned and does
        // not change when a channel goes offline.
        kind: channel.kind,
        outlet_id: channel.outletId ? Number(channel.outletId) : null,
        commission_percent: Number(channel.commissionPercent),
        payment_method_code: channel.paymentMethodCode || null,
        auto_accept: channel.autoAccept,
        prep_buffer_minutes: channel.prepBufferMinutes,
        is_active: active,
      },
    },
  );

  return mapChannel(raw);
}
