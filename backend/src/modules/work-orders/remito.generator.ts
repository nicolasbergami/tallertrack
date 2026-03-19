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
  bg:        "#0F172A",
  surface:   "#1E293B",
  border:    "#334155",
  orange:    "#F97316",
  white:     "#F8FAFC",
  muted:     "#94A3B8",
  dark:      "#0F172A",
} as const;

const PAGE_W  = 595.28;  // A4 width pts
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

// ── Main export ────────────────────────────────────────────────────────────
export function generateRemitoPdf(
  order:  WorkOrderDetail,
  quote:  QuoteWithItems | null,
  tenant: TenantInfo
): Buffer {
  const chunks: Buffer[] = [];
  const doc = new PDFDocument({ size: "A4", margin: MARGIN, bufferPages: true });

  doc.on("data", (c: Buffer) => chunks.push(c));

  // ── Background ────────────────────────────────────────────────────────
  doc.rect(0, 0, PAGE_W, 841.89).fill(C.bg);

  let y = MARGIN;

  // ── Orange accent bar ─────────────────────────────────────────────────
  doc.rect(MARGIN, y, CONTENT, 4).fill(C.orange);
  y += 12;

  // ── Header row ───────────────────────────────────────────────────────
  doc.font("Helvetica-Bold").fontSize(22).fillColor(C.white)
     .text(tenant.name.toUpperCase(), MARGIN, y, { width: CONTENT * 0.6 });

  // Right: doc type badge
  const badgeX = PAGE_W - MARGIN - 130;
  doc.rect(badgeX, y - 4, 130, 36).fill(C.orange);
  doc.font("Helvetica-Bold").fontSize(14).fillColor(C.dark)
     .text("REMITO", badgeX, y + 4, { width: 130, align: "center" });
  y += 40;

  // Workshop sub-info
  doc.font("Helvetica").fontSize(9).fillColor(C.muted);
  const lines: string[] = [];
  if (tenant.tax_id)  lines.push(`RUT: ${tenant.tax_id}`);
  if (tenant.address) lines.push(tenant.address + (tenant.city ? `, ${tenant.city}` : ""));
  if (tenant.phone)   lines.push(`Tel: ${tenant.phone}`);
  if (tenant.email)   lines.push(tenant.email);
  doc.text(lines.join("  ·  "), MARGIN, y, { width: CONTENT });
  y += 16;

  // ── Divider ───────────────────────────────────────────────────────────
  doc.moveTo(MARGIN, y).lineTo(PAGE_W - MARGIN, y).strokeColor(C.border).lineWidth(1).stroke();
  y += 12;

  // ── Order meta row ────────────────────────────────────────────────────
  const metaItems: [string, string][] = [
    ["N° Orden",    order.order_number],
    ["Fecha",       dateStr(order.received_at)],
    ["Entrega est.", dateStr(order.estimated_delivery)],
    ["Estado pago", order.payment_status === "paid" ? "PAGADO" : order.payment_status === "partial" ? "PARCIAL" : "PENDIENTE"],
  ];

  const cellW = CONTENT / metaItems.length;
  metaItems.forEach(([label, value], i) => {
    const cx = MARGIN + i * cellW;
    doc.font("Helvetica").fontSize(8).fillColor(C.muted).text(label, cx, y, { width: cellW - 4 });
    doc.font("Helvetica-Bold").fontSize(11).fillColor(C.white).text(value, cx, y + 11, { width: cellW - 4 });
  });
  y += 36;

  // ── Client / Vehicle row ──────────────────────────────────────────────
  const halfW = (CONTENT - 12) / 2;

  // Client card
  doc.rect(MARGIN, y, halfW, 64).fill(C.surface);
  doc.font("Helvetica-Bold").fontSize(8).fillColor(C.orange)
     .text("CLIENTE", MARGIN + 8, y + 8, { width: halfW - 16 });
  doc.font("Helvetica-Bold").fontSize(11).fillColor(C.white)
     .text(order.client_name, MARGIN + 8, y + 20, { width: halfW - 16 });
  doc.font("Helvetica").fontSize(9).fillColor(C.muted)
     .text(order.client_phone ?? "—", MARGIN + 8, y + 35, { width: halfW - 16 });

  // Vehicle card
  const vx = MARGIN + halfW + 12;
  doc.rect(vx, y, halfW, 64).fill(C.surface);
  doc.font("Helvetica-Bold").fontSize(8).fillColor(C.orange)
     .text("VEHÍCULO", vx + 8, y + 8, { width: halfW - 16 });
  doc.font("Helvetica-Bold").fontSize(14).fillColor(C.white)
     .text(order.vehicle_plate, vx + 8, y + 18, { width: halfW - 16, characterSpacing: 2 });
  doc.font("Helvetica").fontSize(9).fillColor(C.muted)
     .text(`${order.vehicle_brand} ${order.vehicle_model}`, vx + 8, y + 36, { width: halfW - 16 });
  if (order.mileage_in) {
    doc.text(`${order.mileage_in.toLocaleString()} km`, vx + 8, y + 48, { width: halfW - 16 });
  }
  y += 76;

  // ── Complaint ─────────────────────────────────────────────────────────
  doc.font("Helvetica-Bold").fontSize(8).fillColor(C.orange).text("FALLA REPORTADA", MARGIN, y);
  y += 12;
  doc.font("Helvetica").fontSize(10).fillColor(C.white)
     .text(order.complaint, MARGIN, y, { width: CONTENT });
  y += doc.heightOfString(order.complaint, { width: CONTENT }) + 8;

  if (order.diagnosis) {
    doc.font("Helvetica-Bold").fontSize(8).fillColor(C.orange).text("DIAGNÓSTICO", MARGIN, y);
    y += 12;
    doc.font("Helvetica").fontSize(10).fillColor(C.white)
       .text(order.diagnosis, MARGIN, y, { width: CONTENT });
    y += doc.heightOfString(order.diagnosis, { width: CONTENT }) + 8;
  }

  // ── Quote items table ─────────────────────────────────────────────────
  if (quote && quote.items.length > 0) {
    y += 4;
    doc.moveTo(MARGIN, y).lineTo(PAGE_W - MARGIN, y).strokeColor(C.border).lineWidth(1).stroke();
    y += 10;

    doc.font("Helvetica-Bold").fontSize(8).fillColor(C.orange)
       .text("PRESUPUESTO", MARGIN, y);
    y += 14;

    // Table header
    const colDesc  = MARGIN;
    const colQty   = PAGE_W - MARGIN - 200;
    const colPrice = PAGE_W - MARGIN - 100;
    const colTotal = PAGE_W - MARGIN - 0;

    doc.rect(MARGIN, y, CONTENT, 18).fill(C.surface);
    doc.font("Helvetica-Bold").fontSize(8).fillColor(C.muted);
    doc.text("DESCRIPCIÓN",     colDesc  + 4, y + 5, { width: colQty - colDesc - 8 });
    doc.text("CANT.",           colQty,        y + 5, { width: 40, align: "right" });
    doc.text("PRECIO UNIT.",    colPrice - 60, y + 5, { width: 60, align: "right" });
    doc.text("TOTAL",           colTotal - 55, y + 5, { width: 55, align: "right" });
    y += 20;

    quote.items.forEach((item, idx) => {
      const rowBg = idx % 2 === 0 ? C.bg : "#162032";
      doc.rect(MARGIN, y, CONTENT, 16).fill(rowBg);

      const lineTotal = item.quantity * item.unit_price;
      doc.font("Helvetica").fontSize(8).fillColor(C.white);
      doc.text(item.description,        colDesc  + 4, y + 4, { width: colQty - colDesc - 8, ellipsis: true });
      doc.text(String(item.quantity),   colQty,        y + 4, { width: 40, align: "right" });
      doc.text(fmt(item.unit_price),    colPrice - 60, y + 4, { width: 60, align: "right" });
      doc.fillColor(C.white)
         .text(fmt(lineTotal),          colTotal - 55, y + 4, { width: 55, align: "right" });
      y += 16;
    });

    // Subtotals
    y += 8;
    const totals: [string, string, boolean][] = [
      ["Subtotal",       fmt(quote.subtotal), false],
      ["IVA (19%)",      fmt(quote.tax),      false],
      ["TOTAL",          fmt(quote.total),    true],
    ];

    totals.forEach(([label, value, bold]) => {
      const labelX = PAGE_W - MARGIN - 160;
      doc.font(bold ? "Helvetica-Bold" : "Helvetica")
         .fontSize(bold ? 11 : 9)
         .fillColor(bold ? C.orange : C.muted)
         .text(label, labelX, y, { width: 80, align: "right" });
      doc.font(bold ? "Helvetica-Bold" : "Helvetica")
         .fontSize(bold ? 11 : 9)
         .fillColor(bold ? C.white : C.muted)
         .text(value, labelX + 86, y, { width: 74, align: "right" });
      y += bold ? 16 : 13;
    });
  }

  // ── Payment section ───────────────────────────────────────────────────
  if (order.payment_status !== "pending") {
    y += 10;
    doc.moveTo(MARGIN, y).lineTo(PAGE_W - MARGIN, y).strokeColor(C.border).lineWidth(1).stroke();
    y += 10;

    doc.font("Helvetica-Bold").fontSize(8).fillColor(C.orange).text("PAGO REGISTRADO", MARGIN, y);
    y += 14;

    const payItems: [string, string][] = [
      ["Método",    order.payment_method ? PAYMENT_METHOD_LABELS[order.payment_method] : "—"],
      ["Monto",     order.paid_amount ? fmt(order.paid_amount) : "—"],
      ["Fecha",     dateStr(order.paid_at ?? null)],
    ];
    if (order.payment_notes) payItems.push(["Notas", order.payment_notes]);

    payItems.forEach(([l, v]) => {
      doc.font("Helvetica").fontSize(9).fillColor(C.muted).text(`${l}:`, MARGIN, y, { width: 80 });
      doc.font("Helvetica-Bold").fontSize(9).fillColor(C.white).text(v, MARGIN + 84, y, { width: CONTENT - 84 });
      y += 14;
    });
  }

  // ── Signature lines ───────────────────────────────────────────────────
  y = Math.max(y + 20, 700);
  doc.moveTo(MARGIN, y).lineTo(PAGE_W - MARGIN, y).strokeColor(C.border).lineWidth(1).stroke();
  y += 10;

  const sigW = (CONTENT - 30) / 3;
  ["Recibí conforme", "Mecánico responsable", "Autorizado por"].forEach((label, i) => {
    const sx = MARGIN + i * (sigW + 15);
    doc.moveTo(sx, y + 30).lineTo(sx + sigW, y + 30).strokeColor(C.border).lineWidth(0.5).stroke();
    doc.font("Helvetica").fontSize(8).fillColor(C.muted)
       .text(label, sx, y + 34, { width: sigW, align: "center" });
  });

  // ── Footer ────────────────────────────────────────────────────────────
  doc.font("Helvetica").fontSize(7).fillColor(C.muted)
     .text(
       `Generado por TallerTrack · ${new Date().toLocaleString("es-AR")}`,
       MARGIN, 810, { width: CONTENT, align: "center" }
     );

  doc.end();

  return Buffer.concat(chunks);
}
