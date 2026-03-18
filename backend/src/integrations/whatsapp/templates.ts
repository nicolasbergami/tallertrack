import { WorkOrderStatus, STATUS_LABELS } from "../../modules/work-orders/work-order.types";

export interface MessageContext {
  clientName: string;
  orderNumber: string;
  vehiclePlate: string;
  vehicleBrand: string;
  vehicleModel: string;
  trackingUrl: string;
  workshopName: string;
  workshopPhone?: string;
  diagnosis?: string;
  estimatedDelivery?: string;
}

export interface WhatsAppMessage {
  to: string;         // Phone in E.164 format: +56912345678
  body: string;       // Plain text fallback
  templateName?: string;   // For Meta Cloud API template messages
  templateParams?: string[];
}

// ---------------------------------------------------------------------------
// Message templates — one per status transition
// Not all transitions need a notification; only client-facing ones do.
// ---------------------------------------------------------------------------
type TemplateFactory = (ctx: MessageContext) => string;

const STATUS_TEMPLATES: Partial<Record<WorkOrderStatus, TemplateFactory>> = {
  received: (ctx) =>
    `👋 Hola ${ctx.clientName}, hemos recibido tu vehículo *${ctx.vehicleBrand} ${ctx.vehicleModel}* (${ctx.vehiclePlate}) en *${ctx.workshopName}*.\n\n` +
    `📋 *Orden N°:* ${ctx.orderNumber}\n` +
    `🔍 Motivo: ${ctx.diagnosis ?? "Pendiente de diagnóstico"}\n\n` +
    `Puedes seguir el estado de tu reparación aquí:\n${ctx.trackingUrl}`,

  diagnosing: (ctx) =>
    `🔧 *${ctx.workshopName}* — Tu vehículo *${ctx.vehiclePlate}* ya está en diagnóstico.\n\n` +
    `📋 Orden N°: ${ctx.orderNumber}\n` +
    `Te avisaremos tan pronto tengamos el presupuesto listo.\n\n` +
    `Seguimiento en tiempo real: ${ctx.trackingUrl}`,

  awaiting_parts: (ctx) =>
    `⏳ Hola ${ctx.clientName}, hemos completado el diagnóstico de tu *${ctx.vehicleBrand} ${ctx.vehicleModel}*.\n\n` +
    `📋 Orden N°: ${ctx.orderNumber}\n` +
    `Estamos esperando la llegada de los repuestos para comenzar la reparación. Te notificaremos cuando estén disponibles.\n\n` +
    `${ctx.trackingUrl}`,

  in_progress: (ctx) =>
    `⚙️ ¡Buenas noticias! La reparación de tu *${ctx.vehicleBrand} ${ctx.vehicleModel}* (${ctx.vehiclePlate}) ya está en curso.\n\n` +
    `📋 Orden N°: ${ctx.orderNumber}\n` +
    (ctx.estimatedDelivery ? `📅 Entrega estimada: *${ctx.estimatedDelivery}*\n\n` : "\n") +
    `Sigue el progreso aquí: ${ctx.trackingUrl}`,

  quality_control: (ctx) =>
    `✅ La reparación de tu vehículo *${ctx.vehiclePlate}* ha finalizado y está pasando el control de calidad.\n\n` +
    `📋 Orden N°: ${ctx.orderNumber}\n` +
    `Te notificaremos en breve cuando esté listo para retirar.\n\n` +
    `${ctx.trackingUrl}`,

  ready: (ctx) =>
    `🎉 ¡Tu vehículo está listo! *${ctx.vehicleBrand} ${ctx.vehicleModel}* (${ctx.vehiclePlate}) puede ser retirado.\n\n` +
    `📋 Orden N°: ${ctx.orderNumber}\n` +
    `🏪 *${ctx.workshopName}*` +
    (ctx.workshopPhone ? ` — ${ctx.workshopPhone}` : "") +
    `\n\nPor favor trae este mensaje al retirar tu vehículo. 🙏\n${ctx.trackingUrl}`,

  delivered: (ctx) =>
    `🙌 Gracias ${ctx.clientName} por confiar en *${ctx.workshopName}*.\n\n` +
    `Tu *${ctx.vehicleBrand} ${ctx.vehicleModel}* (${ctx.vehiclePlate}) ha sido entregado.\n` +
    `📋 Orden N°: ${ctx.orderNumber}\n\n` +
    `Si tienes alguna consulta sobre el trabajo realizado, estamos a tu disposición. 🔧`,

  cancelled: (ctx) =>
    `ℹ️ Hola ${ctx.clientName}, te informamos que la orden *N° ${ctx.orderNumber}* de tu vehículo ` +
    `*${ctx.vehiclePlate}* ha sido cancelada.\n\n` +
    `Si tienes dudas, comunícate con ${ctx.workshopName}` +
    (ctx.workshopPhone ? ` al ${ctx.workshopPhone}` : "") + `.`,
};

export function buildMessage(
  status: WorkOrderStatus,
  clientPhone: string,
  ctx: MessageContext
): WhatsAppMessage | null {
  const factory = STATUS_TEMPLATES[status];
  if (!factory) return null; // No notification configured for this status

  return {
    to: clientPhone,
    body: factory(ctx),
    templateName: `work_order_${status}`,
    templateParams: [ctx.clientName, ctx.orderNumber, ctx.vehiclePlate],
  };
}
