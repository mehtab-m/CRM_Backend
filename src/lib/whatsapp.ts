// Thin wrapper around Meta's WhatsApp Cloud API "send message" call.
// Used both for manual agent replies (conversations.service.ts) and could
// be reused by any other outbound-message path in the future.

export interface WhatsAppCredentials {
  phoneNumberId: string;
  accessToken: string;
}

export async function sendWhatsAppTextMessage(
  credentials: WhatsAppCredentials,
  to: string,
  text: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v20.0/${credentials.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${credentials.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          text: { body: text },
        }),
      },
    );

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      return { ok: false, error: `WhatsApp API ${response.status}: ${body}` };
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
