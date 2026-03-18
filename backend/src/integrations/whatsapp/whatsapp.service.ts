import { env } from "../../config/env";
import { WhatsAppMessage } from "./templates";

// ---------------------------------------------------------------------------
// Provider abstraction — swap Mock → Meta → Twilio without changing callers
// ---------------------------------------------------------------------------
interface WhatsAppProvider {
  send(message: WhatsAppMessage): Promise<WhatsAppSendResult>;
}

export interface WhatsAppSendResult {
  success: boolean;
  messageId?: string;
  provider: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Mock Provider (local dev / testing)
// Logs to console, never calls an external API.
// ---------------------------------------------------------------------------
class MockWhatsAppProvider implements WhatsAppProvider {
  async send(message: WhatsAppMessage): Promise<WhatsAppSendResult> {
    const messageId = `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    console.log("\n━━━━━━━━━━━ [WhatsApp MOCK] ━━━━━━━━━━━");
    console.log(`📱 To      : ${message.to}`);
    console.log(`📄 Template: ${message.templateName ?? "none"}`);
    console.log(`💬 Body    :\n${message.body}`);
    console.log(`🆔 Message ID: ${messageId}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    return { success: true, messageId, provider: "mock" };
  }
}

// ---------------------------------------------------------------------------
// Meta Cloud API Provider (production)
// Requires WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN.
// ---------------------------------------------------------------------------
class MetaWhatsAppProvider implements WhatsAppProvider {
  async send(message: WhatsAppMessage): Promise<WhatsAppSendResult> {
    const url = `${env.WHATSAPP_API_URL}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: message.to,
      // Use text for simplicity; swap for "template" in production for HSM compliance
      type: "text",
      text: { preview_url: true, body: message.body },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.text();
      return {
        success: false,
        provider: "meta",
        error: `Meta API error ${response.status}: ${body}`,
      };
    }

    const data = (await response.json()) as { messages: [{ id: string }] };
    return {
      success: true,
      messageId: data.messages[0]?.id,
      provider: "meta",
    };
  }
}

// ---------------------------------------------------------------------------
// Provider registry
// ---------------------------------------------------------------------------
const PROVIDERS: Record<string, WhatsAppProvider> = {
  mock:   new MockWhatsAppProvider(),
  meta:   new MetaWhatsAppProvider(),
  // twilio: new TwilioWhatsAppProvider(), // Add when needed
};

function getProvider(): WhatsAppProvider {
  const provider = PROVIDERS[env.WHATSAPP_PROVIDER];
  if (!provider) throw new Error(`Unknown WhatsApp provider: ${env.WHATSAPP_PROVIDER}`);
  return provider;
}

// ---------------------------------------------------------------------------
// Public service — used by the work-order service
// ---------------------------------------------------------------------------
export const whatsappService = {
  async sendMessage(message: WhatsAppMessage): Promise<WhatsAppSendResult> {
    try {
      const result = await getProvider().send(message);

      if (!result.success) {
        // Log but don't throw — a WhatsApp failure must not block the main flow
        console.error(`[WhatsApp] Send failed: ${result.error}`);
      }

      return result;
    } catch (err) {
      console.error("[WhatsApp] Unexpected error:", err);
      return { success: false, provider: env.WHATSAPP_PROVIDER, error: String(err) };
    }
  },
};
