import PDFDocument from "pdfkit";
import { WorkOrderDetail, QuoteWithItems, PAYMENT_METHOD_LABELS } from "./work-order.types";

interface TenantInfo {
  name:    string;
  tax_id:  string | null;
  phone:   string | null;
  email:   string | null;
  address: string | null;
  city:    string | null;
}

// ── Colours & constants ────────────────────────────────────────────────────
const C = {
  bg:      "#FFFFFF",
  border:  "#D1D5DB",
  text:    "#111827",
  muted:   "#6B7280",
  light:   "#F3F4F6",
} as const;

const PAGE_W  = 595.28;  // A4 width pts
const PAGE_H  = 841.89;  // A4 height pts
const MARGIN  = 40;
const CONTENT = PAGE_W - MARGIN * 2;

// ── Helpers ────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return `$${n.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function dateStr(d: Date | string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function divider(doc: any, y: number): void {
  doc.moveTo(MARGIN, y).lineTo(PAGE_W - MARGIN, y)
     .strokeColor(C.border).lineWidth(0.5).stroke();
}

// ── Main export ────────────────────────────────────────────────────────────
export function generateRemitoPdf(
  order:  WorkOrderDetail,
  quote:  QuoteWithItems | null,
  tenant: TenantInfo
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ size: "A4", margin: MARGIN, autoFirstPage: true });

    doc.on("data",  (c: Buffer) => chunks.push(c));
    doc.on("end",   () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // White background
    doc.rect(0, 0, PAGE_W, PAGE_H).fill(C.bg);

    let y = MARGIN;

    // ── Header ────────────────────────────────────────────────────────────
    // Taller name
    doc.font("Helvetica-Bold").fontSize(20).fillColor(C.text)
       .text(tenant.name.toUpperCase(), MARGIN, y, { width: CONTENT * 0.65 });

    // REMITO badge (outline style)
    const badgeX = PAGE_W - MARGIN - 100;
    doc.rect(badgeX, y - 2, 100, 30).strokeColor(C.text).lineWidth(1.5).stroke();
    doc.font("Helvetica-Bold").fontSize(13).fillColor(C.text)
       .text("REMITO", badgeX, y + 6, { width: 100, align: "center" });
    y += 36;

    // Sub-info
    const infoLines: string[] = [];
    if (tenant.tax_id)  infoLines.push(`RUT: ${tenant.tax_id}`);
    if (tenant.phone)   infoLines.push(`Tel: ${tenant.phone}`);
    if (tenant.email)   infoLines.push(tenant.email);
    if (tenant.address) infoLines.push(tenant.address + (tenant.city ? `, ${tenant.city}` : ""));
    doc.font("Helvetica").fontSize(8).fillColor(C.muted)
       .text(infoLines.join("  ·  "), MARGIN, y, { width: CONTENT });
    y += 16;

    divider(doc, y);
    y += 10;

    // ── Order meta ────────────────────────────────────────────────────────
    const metaItems: [string, string][] = [
      ["N° Orden",      order.order_number],
      ["Fecha",         dateStr(order.received_at)],
      ["Entrega est.",  dateStr(order.estimated_delivery)],
      ["Estado pago",   order.payment_status === "paid" ? "PAGADO" : order.payment_status === "partial" ? "PARCIAL" : "PENDIENTE"],
    ];

    const cellW = CONTENT / metaItems.length;
    metaItems.forEach(([label, value], i) => {
      const cx = MARGIN + i * cellW;
      doc.font("Helvetica").fontSize(7).fillColor(C.muted).text(label, cx, y, { width: cellW - 4 });
      doc.font("Helvetica-Bold").fontSize(10).fillColor(C.text).text(value, cx, y + 10, { width: cellW - 4 });
    });
    y += 30;

    divider(doc, y);
    y += 10;

    // ── Client / Vehicle row ──────────────────────────────────────────────
    const halfW = (CONTENT - 12) / 2;

    // Client card
    doc.rect(MARGIN, y, halfW, 56).fillAndStroke(C.light, C.border);
    doc.font("Helvetica-Bold").fontSize(7).fillColor(C.muted)
       .text("CLIENTE", MARGIN + 8, y + 8, { width: halfW - 16 });
    doc.font("Helvetica-Bold").fontSize(10).fillColor(C.text)
       .text(order.client_name, MARGIN + 8, y + 19, { width: halfW - 16 });
    doc.font("Helvetica").fontSize(8).fillColor(C.muted)
       .text(order.client_phone ?? "—", MARGIN + 8, y + 33, { width: halfW - 16 });

    // Vehicle card
    const vx = MARGIN + halfW + 12;
    doc.rect(vx, y, halfW, 56).fillAndStroke(C.light, C.border);
    doc.font("Helvetica-Bold").fontSize(7).fillColor(C.muted)
       .text("VEHÍCULO", vx + 8, y + 8, { width: halfW - 16 });
    doc.font("Helvetica-Bold").fontSize(13).fillColor(C.text)
       .text(order.vehicle_plate, vx + 8, y + 18, { width: halfW - 16, characterSpacing: 2 });
    doc.font("Helvetica").fontSize(8).fillColor(C.muted)
       .text(`${order.vehicle_brand} ${order.vehicle_model}`, vx + 8, y + 34, { width: halfW - 16 });
    if (order.mileage_in) {
      doc.text(`${order.mileage_in.toLocaleString()} km`, vx + 8, y + 44, { width: halfW - 16 });
    }
    y += 66;

    // ── Complaint ─────────────────────────────────────────────────────────
    doc.font("Helvetica-Bold").fontSize(7).fillColor(C.muted).text("FALLA REPORTADA", MARGIN, y);
    y += 11;
    doc.font("Helvetica").fontSize(9).fillColor(C.text)
       .text(order.complaint, MARGIN, y, { width: CONTENT });
    y += doc.heightOfString(order.complaint, { width: CONTENT }) + 8;

    if (order.diagnosis) {
      doc.font("Helvetica-Bold").fontSize(7).fillColor(C.muted).text("DIAGNÓSTICO", MARGIN, y);
      y += 11;
      doc.font("Helvetica").fontSize(9).fillColor(C.text)
         .text(order.diagnosis, MARGIN, y, { width: CONTENT });
      y += doc.heightOfString(order.diagnosis, { width: CONTENT }) + 8;
    }

    // ── Quote items table ─────────────────────────────────────────────────
    if (quote && quote.items.length > 0) {
      y += 4;
      divider(doc, y);
      y += 10;

      doc.font("Helvetica-Bold").fontSize(8).fillColor(C.text).text("PRESUPUESTO", MARGIN, y);
      y += 14;

      // Table header
      const colDesc  = MARGIN;
      const colQty   = PAGE_W - MARGIN - 200;
      const colPrice = PAGE_W - MARGIN - 100;
      const colTotal = PAGE_W - MARGIN;

      doc.rect(MARGIN, y, CONTENT, 16).fill(C.light);
      doc.font("Helvetica-Bold").fontSize(7).fillColor(C.muted);
      doc.text("DESCRIPCIÓN",   colDesc + 4,   y + 4, { width: colQty - colDesc - 8 });
      doc.text("CANT.",         colQty,         y + 4, { width: 40, align: "right" });
      doc.text("PRECIO UNIT.",  colPrice - 60,  y + 4, { width: 60, align: "right" });
      doc.text("TOTAL",         colTotal - 55,  y + 4, { width: 55, align: "right" });
      y += 18;

      quote.items.forEach((item, idx) => {
        if (idx % 2 !== 0) {
          doc.rect(MARGIN, y, CONTENT, 15).fill("#F9FAFB");
        }
        const qty       = Number(item.quantity);
        const price     = Number(item.unit_price);
        const lineTotal = qty * price;
        doc.font("Helvetica").fontSize(8).fillColor(C.text);
        doc.text(item.description,  colDesc + 4,   y + 3, { width: colQty - colDesc - 8, ellipsis: true });
        doc.text(String(qty),       colQty,         y + 3, { width: 40, align: "right" });
        doc.text(fmt(price),        colPrice - 60,  y + 3, { width: 60, align: "right" });
        doc.text(fmt(lineTotal),    colTotal - 55,  y + 3, { width: 55, align: "right" });
        y += 15;
      });

      // Subtotals — skip IVA when 0%
      y += 6;
      const taxRate = Number(quote.tax_rate);
      const totals: [string, string, boolean][] = [
        ["Subtotal", fmt(Number(quote.subtotal)), false],
        ...(taxRate > 0 ? [[`IVA (${Math.round(taxRate * 100)}%)`, fmt(Number(quote.tax_amount)), false] as [string, string, boolean]] : []),
        ["TOTAL",    fmt(Number(quote.total)),    true],
      ];

      totals.forEach(([label, value, bold]) => {
        const labelX = PAGE_W - MARGIN - 160;
        doc.font(bold ? "Helvetica-Bold" : "Helvetica")
           .fontSize(bold ? 10 : 8)
           .fillColor(C.text)
           .text(label, labelX, y, { width: 80, align: "right" });
        doc.font(bold ? "Helvetica-Bold" : "Helvetica")
           .fontSize(bold ? 10 : 8)
           .fillColor(C.text)
           .text(value, labelX + 86, y, { width: 74, align: "right" });
        y += bold ? 14 : 12;
      });
    }

    // ── Payment section ───────────────────────────────────────────────────
    if (order.payment_status !== "pending") {
      y += 8;
      divider(doc, y);
      y += 10;

      doc.font("Helvetica-Bold").fontSize(8).fillColor(C.text).text("PAGO REGISTRADO", MARGIN, y);
      y += 13;

      const payItems: [string, string][] = [
        ["Método", order.payment_method ? PAYMENT_METHOD_LABELS[order.payment_method] : "—"],
        ["Monto",  order.paid_amount ? fmt(order.paid_amount) : "—"],
        ["Fecha",  dateStr(order.paid_at ?? null)],
      ];
      if (order.payment_notes) payItems.push(["Notas", order.payment_notes]);

      payItems.forEach(([l, v]) => {
        doc.font("Helvetica").fontSize(8).fillColor(C.muted).text(`${l}:`, MARGIN, y, { width: 70 });
        doc.font("Helvetica-Bold").fontSize(8).fillColor(C.text).text(v, MARGIN + 74, y, { width: CONTENT - 74 });
        y += 13;
      });
    }

    // ── Signature lines ───────────────────────────────────────────────────
    // Place signatures below content, but no lower than 680 to keep footer on same page
    y = Math.max(y + 24, 640);

    divider(doc, y);
    y += 12;

    const sigW = (CONTENT - 30) / 3;
    ["Recibí conforme", "Mecánico responsable", "Autorizado por"].forEach((label, i) => {
      const sx = MARGIN + i * (sigW + 15);
      doc.moveTo(sx, y + 28).lineTo(sx + sigW, y + 28)
         .strokeColor(C.border).lineWidth(0.5).stroke();
      doc.font("Helvetica").fontSize(7).fillColor(C.muted)
         .text(label, sx, y + 33, { width: sigW, align: "center" });
    });
    y += 52;

    // ── Footer ────────────────────────────────────────────────────────────
    divider(doc, y);
    y += 6;
    doc.font("Helvetica").fontSize(7).fillColor(C.muted)
       .text(
         `Generado por TallerTrack · ${new Date().toLocaleString("es-AR")}`,
         MARGIN, y, { width: CONTENT, align: "center" }
       );

    doc.end();
  });
}
