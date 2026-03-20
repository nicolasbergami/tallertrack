import QRCode from "qrcode";
import { env } from "../../config/env";

export interface QRCodeResult {
  url: string;           // The URL encoded in the QR
  pngBuffer: Buffer;     // Raw PNG for HTTP response
  base64: string;        // data:image/png;base64,... for JSON API
}

/**
 * Generates a QR code that points to the public tracking URL for a work order.
 *
 * Tracking URL format:
 *   https://tallertrack-production.up.railway.app/{tenantSlug}/{orderNumber}
 *
 * The public page does NOT require authentication — clients can scan it to
 * see real-time status updates without logging in.
 */
export const qrService = {
  async generateForWorkOrder(
    tenantSlug: string,
    orderNumber: string
  ): Promise<QRCodeResult> {
    const url = `${env.TRACKING_BASE_URL}/${tenantSlug}/${encodeURIComponent(orderNumber)}`;

    const pngBuffer = await QRCode.toBuffer(url, {
      type: "png",
      width: 400,
      margin: 2,
      color: {
        dark: "#1a1a2e",  // Deep navy — on-brand
        light: "#ffffff",
      },
      errorCorrectionLevel: "M",
    });

    const base64 = `data:image/png;base64,${pngBuffer.toString("base64")}`;

    return { url, pngBuffer, base64 };
  },
};
