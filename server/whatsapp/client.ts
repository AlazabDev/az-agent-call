import { getWhatsAppConfig } from "./config.js";

export interface SendWhatsAppTextMessagePayload {
  phoneNumberId: string;
  recipientPhone: string;
  text: string;
}

export interface SendWhatsAppTemplatePayload {
  phoneNumberId: string;
  recipientPhone: string;
  templateName: string;
  languageCode?: string;
  components?: Array<{
    type: "header" | "body" | "button";
    sub_type?: string;
    index?: string;
    parameters: Array<{
      type: "text" | "currency" | "date_time" | "image" | "document";
      text?: string;
      currency?: { fallback_value: string; code: string; amount_1000: number };
      date_time?: { fallback_value: string };
    }>;
  }>;
}

export interface MetaWhatsAppResponse {
  messaging_product: "whatsapp";
  contacts: Array<{ input: string; wa_id: string }>;
  messages: Array<{ id: string }>;
}

export class WhatsAppClient {
  public async sendTextMessage(payload: SendWhatsAppTextMessagePayload): Promise<{ ok: boolean; messageId?: string; error?: string }> {
    const config = getWhatsAppConfig();

    if (!config.isConfigured) {
      // Mock mode fallback when token is not set
      const mockId = `wamid.HBgL${Date.now()}`;
      return { ok: true, messageId: mockId };
    }

    const url = `https://graph.facebook.com/${config.apiVersion}/${payload.phoneNumberId}/messages`;

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${config.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: payload.recipientPhone.replace(/[^\d+]/g, ""),
          type: "text",
          text: { body: payload.text },
        }),
      });

      const data = await res.json() as MetaWhatsAppResponse & { error?: { message: string; code: number } };

      if (!res.ok || data.error) {
        return { ok: false, error: data.error?.message || `HTTP ${res.status}` };
      }

      return { ok: true, messageId: data.messages?.[0]?.id };
    } catch (err: any) {
      return { ok: false, error: err.message || String(err) };
    }
  }

  public async sendTemplateMessage(payload: SendWhatsAppTemplatePayload): Promise<{ ok: boolean; messageId?: string; error?: string }> {
    const config = getWhatsAppConfig();

    if (!config.isConfigured) {
      const mockId = `wamid.HBgL${Date.now()}`;
      return { ok: true, messageId: mockId };
    }

    const url = `https://graph.facebook.com/${config.apiVersion}/${payload.phoneNumberId}/messages`;

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${config.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: payload.recipientPhone.replace(/[^\d+]/g, ""),
          type: "template",
          template: {
            name: payload.templateName,
            language: { code: payload.languageCode || "ar" },
            components: payload.components || [],
          },
        }),
      });

      const data = await res.json() as MetaWhatsAppResponse & { error?: { message: string; code: number } };

      if (!res.ok || data.error) {
        return { ok: false, error: data.error?.message || `HTTP ${res.status}` };
      }

      return { ok: true, messageId: data.messages?.[0]?.id };
    } catch (err: any) {
      return { ok: false, error: err.message || String(err) };
    }
  }
}

export const whatsappClient = new WhatsAppClient();
