import { useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence } from "framer-motion";

// ---------------------------------------------------------------------------
// Fade-up scroll animation wrapper
// ---------------------------------------------------------------------------

function FadeUp({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-56px" }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

interface BentoFeature {
  icon: string;
  title: string;
  desc: string;
  wide: boolean;
  cardClass: string;
  iconBg: string;
  accentLine?: string;
}

const BENTO: BentoFeature[] = [
  {
    icon: "💬",
    title: "WhatsApp Automático",
    desc:
      "Cada vez que cambiás el estado de un vehículo, el cliente recibe un aviso automático desde tu propio número de WhatsApp. Sin apps extra, sin configuraciones complicadas.",
    wide: true,
    cardClass: "border-green-500/25 bg-green-950/15",
    iconBg: "bg-green-900/40",
    accentLine: "bg-green-500",
  },
  {
    icon: "📋",
    title: "Órdenes de Trabajo",
    desc: "Creá, asigná y gestioná todas las OTs desde el celular. Estado en tiempo real para todo el equipo.",
    wide: false,
    cardClass: "border-slate-700/50 bg-slate-800/30",
    iconBg: "bg-slate-700/50",
  },
  {
    icon: "📱",
    title: "Seguimiento QR",
    desc: "El cliente escanea un QR y ve el estado de su auto sin necesidad de llamar al taller.",
    wide: false,
    cardClass: "border-slate-700/50 bg-slate-800/30",
    iconBg: "bg-slate-700/50",
  },
  {
    icon: "🤖",
    title: "IA para Presupuestos",
    desc:
      "Dictá el diagnóstico en voz alta. La IA transcribe, extrae cada ítem con precio y genera un resumen claro para el cliente, en segundos.",
    wide: true,
    cardClass: "border-orange-500/25 bg-orange-950/15",
    iconBg: "bg-orange-900/40",
    accentLine: "bg-orange-500",
  },
  {
    icon: "📊",
    title: "Historial Completo",
    desc: "Auditoría de cada acción. Nunca pierdas el historial de un vehículo ni de un mecánico.",
    wide: false,
    cardClass: "border-slate-700/50 bg-slate-800/30",
    iconBg: "bg-slate-700/50",
  },
  {
    icon: "💳",
    title: "Sin permanencia",
    desc:
      "1 mes de prueba gratuita. Sin tarjeta de crédito. Cobros mensuales automáticos por Mercado Pago. Cancelá cuando quieras.",
    wide: true,
    cardClass: "border-slate-700/50 bg-slate-800/30",
    iconBg: "bg-slate-700/50",
  },
];

const PRICING = [
  {
    name:     "Mecánico Independiente",
    price:    "$18.000",
    vehicles: "10 vehículos",
    users:    "1 usuario",
  },
  {
    name:      "Taller Pro",
    price:     "$35.000",
    vehicles:  "30 vehículos",
    users:     "Hasta 3 usuarios",
    highlight: true,
  },
  {
    name:     "Taller Platinum",
    price:    "$80.000",
    vehicles: "Sin límite",
    users:    "Usuarios ilimitados",
  },
];

interface FAQItem {
  q: string;
  a: string;
}

const FAQ: FAQItem[] = [
  {
    q: "¿Tengo que usar mi número de WhatsApp personal?",
    a: "No. Recomendamos usar un número exclusivo para el taller, como una línea de prepago dedicada al negocio. Así separás lo profesional de lo personal y tus clientes siempre contactan al taller, no a vos directamente.",
  },
  {
    q: "¿Qué pasa si el cliente no aprueba el presupuesto?",
    a: "Si el cliente rechaza el presupuesto desde el link de WhatsApp, la orden queda en estado Cancelado automáticamente y el sistema lo registra en el historial. Podés contactar al cliente, negociar y abrir una nueva orden cuando lo decidan.",
  },
  {
    q: "¿Puedo usar TallerTrack desde el celular?",
    a: "Sí. TallerTrack está diseñado primero para mobile. Podés gestionar todas las órdenes desde tu smartphone. La única excepción es la primera conexión de WhatsApp, que requiere escanear un QR desde una pantalla más grande (PC o tablet).",
  },
];

// ---------------------------------------------------------------------------
// FAQ accordion item
// ---------------------------------------------------------------------------

function FAQAccordionItem({
  item,
  isOpen,
  onToggle,
}: {
  item: FAQItem;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`border rounded-2xl overflow-hidden transition-colors duration-200
                  ${isOpen
                    ? "border-orange-500/35 bg-orange-950/10"
                    : "border-slate-700/50 bg-slate-800/20 hover:border-slate-600/60"
                  }`}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span className="text-sm font-semibold text-slate-100 leading-snug">{item.q}</span>
        <span
          className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0
                      text-xs font-bold transition-all duration-200
                      ${isOpen
                        ? "rotate-45 border-orange-500/50 text-orange-400"
                        : "border-slate-600 text-slate-500"
                      }`}
        >
          +
        </span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
          >
            <p className="px-5 pb-5 text-slate-400 text-sm leading-relaxed">{item.a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Landing
// ---------------------------------------------------------------------------

export function Landing() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <>
    <Helmet>
      <html lang="es-AR" />
      <title>TallerTrack – Software para Talleres Mecánicos en Argentina</title>
      <meta name="description" content="Eliminá los llamados de clientes preguntando por su auto. TallerTrack avisa por WhatsApp automático cuando cambia el estado del vehículo. Probalo 1 mes gratis." />
      <meta name="robots" content="index, follow" />
      <link rel="canonical" href="https://tallertrack.com.ar/" />
      <meta property="og:type" content="website" />
      <meta property="og:url" content="https://tallertrack.com.ar/" />
      <meta property="og:title" content="TallerTrack – Menos llamados. Más reparaciones." />
      <meta property="og:description" content="El sistema que avisa a tus clientes por WhatsApp cada vez que su auto cambia de estado. Sin app. Sin llamados. Para talleres mecánicos de Argentina." />
      <meta property="og:image" content="https://tallertrack.com.ar/og-image.jpg" />
      <meta property="og:locale" content="es_AR" />
      <meta property="og:site_name" content="TallerTrack" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="TallerTrack – Software para Talleres Mecánicos" />
      <meta name="twitter:description" content="Automatizá la comunicación con tus clientes vía WhatsApp. Sin interrupciones. Probalo 1 mes gratis." />
      <meta name="twitter:image" content="https://tallertrack.com.ar/og-image.jpg" />
      <script type="application/ld+json">{JSON.stringify({
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "TallerTrack",
        "url": "https://tallertrack.com.ar",
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "Web",
        "description": "Plataforma SaaS para talleres mecánicos de Argentina que automatiza la comunicación con clientes vía WhatsApp.",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "ARS",
          "description": "1 mes de prueba gratuita, sin tarjeta de crédito"
        },
        "areaServed": { "@type": "Country", "name": "Argentina" }
      })}</script>
    </Helmet>
    <div className="min-h-screen bg-[#0F172A] text-white flex flex-col">

      {/* ── Navbar ── */}
      <header
        className="sticky top-0 z-50 flex items-center justify-between px-5 py-3.5
                   bg-[#0F172A]/90 backdrop-blur-md border-b border-white/[0.055]"
      >
        <img src="/logo.png" alt="TallerTrack" className="h-9 w-auto" />
        <div className="flex items-center gap-4">
          <Link
            to="/login"
            className="text-sm font-semibold text-slate-500 hover:text-slate-200 transition-colors"
          >
            Ingresar
          </Link>
          <Link
            to="/register"
            className="text-sm font-bold bg-[#F97316] hover:bg-[#EA580C] active:scale-[0.97]
                       transition-all text-white px-4 py-2 rounded-xl
                       shadow-[0_2px_16px_rgba(249,115,22,0.35)]"
          >
            Prueba gratis
          </Link>
        </div>
      </header>

      <main className="flex-1">

        {/* ── Hero ── */}
        <section id="inicio" aria-labelledby="hero-heading" className="px-5 pt-16 pb-10 text-center max-w-xl mx-auto">

          <FadeUp>
            <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20
                            text-orange-400 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
              1 mes gratis · Sin tarjeta de crédito
            </div>
          </FadeUp>

          <FadeUp delay={0.06}>
            <h1 id="hero-heading" className="text-[3rem] sm:text-[3.5rem] font-black leading-[1.1] tracking-tight mb-5">
              El sistema de gestión para{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-300 to-orange-400">
                talleres mecánicos
              </span>
            </h1>
          </FadeUp>

          <FadeUp delay={0.12}>
            <p className="text-slate-400 text-[1.05rem] leading-relaxed mb-8 max-w-sm mx-auto">
              Controlá tus órdenes de trabajo, notificá a tus clientes por WhatsApp y
              usá inteligencia artificial para armar presupuestos, todo desde el celular.
            </p>
          </FadeUp>

          <FadeUp delay={0.17}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/register"
                className="flex items-center justify-center gap-2 h-14 px-8 w-full sm:w-auto
                           bg-[#F97316] hover:bg-[#EA580C] active:scale-[0.98] transition-all
                           text-white font-bold text-base rounded-2xl
                           shadow-[0_4px_32px_rgba(249,115,22,0.45)]
                           hover:shadow-[0_6px_44px_rgba(249,115,22,0.60)]"
              >
                Empezar gratis →
              </Link>
              <Link
                to="/login"
                className="text-slate-500 hover:text-slate-300 text-sm font-semibold
                           transition-colors underline-offset-4 hover:underline"
              >
                Ya tengo cuenta
              </Link>
            </div>
          </FadeUp>
        </section>

        {/* ── App mockup (con glow flotante) ── */}
        <FadeUp delay={0.22} className="px-5 max-w-sm mx-auto mb-18">
          <div className="relative">

            {/* Glow backdrop */}
            <div
              className="absolute inset-x-10 -bottom-4 h-full -z-10 blur-3xl opacity-55 rounded-full"
              style={{
                background:
                  "radial-gradient(ellipse at 50% 80%, rgba(249,115,22,0.50) 0%, rgba(234,88,12,0.20) 55%, transparent 75%)",
              }}
            />

            {/* Card */}
            <div
              className="relative bg-slate-800/65 border border-white/[0.09] rounded-3xl p-4
                         shadow-[0_32px_72px_rgba(0,0,0,0.65),0_0_0_1px_rgba(255,255,255,0.04)]
                         backdrop-blur-sm"
            >
              {/* Mini header */}
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-xs font-black text-[#F97316]">
                  Taller<span className="text-slate-300">Track</span>
                </span>
                <span className="flex gap-1.5">
                  {["received", "diagnosing", "in_progress", "ready", "delivered"].map((s, i) => (
                    <span
                      key={s}
                      className={`w-2 h-2 rounded-full transition-all ${
                        i === 2
                          ? "bg-orange-400 scale-125 shadow-[0_0_6px_rgba(249,115,22,0.9)]"
                          : i < 2
                          ? "bg-green-500"
                          : "bg-slate-700"
                      }`}
                    />
                  ))}
                </span>
              </div>

              {/* OT rows */}
              {[
                { plate: "ABC 123", client: "Juan García",   status: "En proceso",  pill: "bg-orange-500/20 text-orange-300 border border-orange-500/25" },
                { plate: "XYZ 789", client: "María López",   status: "Listo ✓",     pill: "bg-green-500/20  text-green-300  border border-green-500/25"  },
                { plate: "DEF 456", client: "Carlos Méndez", status: "Diagnóstico", pill: "bg-amber-500/20  text-amber-300  border border-amber-500/25"  },
              ].map((o) => (
                <div
                  key={o.plate}
                  className="flex items-center justify-between bg-slate-900/55 rounded-xl
                             px-3 py-3 mb-2 last:mb-0 border border-slate-700/40
                             hover:border-slate-600/55 transition-colors"
                >
                  <div>
                    <p className="text-white font-black text-sm tracking-widest font-mono">{o.plate}</p>
                    <p className="text-slate-500 text-xs mt-0.5">{o.client}</p>
                  </div>
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg ${o.pill}`}>
                    {o.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </FadeUp>

        {/* ── Bento Features ── */}
        <section id="funciones" aria-labelledby="funciones-heading" className="px-5 max-w-2xl mx-auto mb-16 mt-6">
          <FadeUp>
            <h2 id="funciones-heading" className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest text-center mb-8">
              Todo lo que necesitás
            </h2>
          </FadeUp>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {BENTO.map((f, i) => (
              <FadeUp
                key={f.title}
                delay={i * 0.05}
                className={f.wide ? "sm:col-span-2" : "sm:col-span-1"}
              >
                <div
                  className={`relative border rounded-2xl p-5 h-full transition-all duration-200
                               hover:-translate-y-1 hover:shadow-[0_20px_48px_rgba(0,0,0,0.45)]
                               cursor-default ${f.cardClass}`}
                >
                  {/* Accent top line for hero cards */}
                  {f.accentLine && (
                    <span
                      className={`absolute top-0 left-6 right-6 h-px rounded-full opacity-60 ${f.accentLine}`}
                    />
                  )}

                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3 ${f.iconBg}`}>
                    {f.icon}
                  </div>
                  <p className="text-slate-100 font-bold text-sm mb-1.5">{f.title}</p>
                  <p className="text-slate-400 text-xs leading-relaxed">{f.desc}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </section>

        {/* ── Pricing ── */}
        <section id="planes" aria-labelledby="planes-heading" className="px-5 max-w-lg mx-auto mb-16">
          <FadeUp>
            <div className="rounded-3xl border border-white/[0.06] bg-slate-800/25 p-6">

              <h2 id="planes-heading" className="text-[11px] font-semibold text-orange-400 uppercase tracking-widest text-center mb-6">
                Precios en ARS · Pagos por Mercado Pago
              </h2>

              <div className="grid grid-cols-3 gap-3 items-end">
                {PRICING.map((p) => (
                  <div
                    key={p.name}
                    className={`relative flex flex-col rounded-2xl py-5 px-3 text-center
                                transition-all duration-200
                                ${p.highlight
                                  ? `bg-gradient-to-b from-[#F97316] to-[#EA580C]
                                     shadow-[0_0_48px_rgba(249,115,22,0.45),0_0_0_1px_rgba(251,191,36,0.35)]
                                     sm:scale-[1.07] sm:-mb-1 sm:-mt-2 z-10`
                                  : "bg-slate-800/70 border border-slate-700/50"
                                }`}
                  >
                    {p.highlight && (
                      <span
                        className="absolute -top-3.5 left-1/2 -translate-x-1/2
                                   text-[9px] font-black uppercase tracking-wider whitespace-nowrap
                                   bg-white text-orange-600 px-2.5 py-[3px] rounded-full"
                      >
                        Recomendado
                      </span>
                    )}
                    <p className={`text-[10px] font-semibold mb-2 leading-tight ${
                      p.highlight ? "text-orange-100" : "text-slate-400"
                    }`}>
                      {p.name}
                    </p>
                    <p className="text-white font-black text-lg leading-none">{p.price}</p>
                    <p className={`text-[9px] mb-3 ${p.highlight ? "text-orange-200" : "text-slate-500"}`}>
                      /mes
                    </p>
                    <div className={`text-[10px] space-y-1 ${p.highlight ? "text-orange-100" : "text-slate-500"}`}>
                      <p>{p.vehicles}</p>
                      <p>{p.users}</p>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-slate-600 text-[11px] text-center mt-5">
                Sin contratos · Cancelá cuando quieras
              </p>
            </div>
          </FadeUp>
        </section>

        {/* ── FAQ ── */}
        <section id="faq" aria-labelledby="faq-heading" className="px-5 max-w-lg mx-auto mb-16">
          <FadeUp>
            <h2 id="faq-heading" className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest text-center mb-6">
              Preguntas frecuentes
            </h2>
            <div className="flex flex-col gap-2">
              {FAQ.map((item, i) => (
                <FAQAccordionItem
                  key={i}
                  item={item}
                  isOpen={openFaq === i}
                  onToggle={() => setOpenFaq(openFaq === i ? null : i)}
                />
              ))}
            </div>
          </FadeUp>
        </section>

        {/* ── Bottom CTA ── */}
        <section className="px-5 max-w-lg mx-auto pb-20 text-center">
          <FadeUp>
            <h2 className="text-[1.85rem] font-black mb-3 tracking-tight leading-tight">
              ¿Listo para ordenar tu taller?
            </h2>
            <p className="text-slate-400 text-sm mb-7">Empezá hoy con 1 mes gratis. Sin compromiso.</p>
            <Link
              to="/register"
              className="inline-flex items-center justify-center h-14 px-8 w-full max-w-xs
                         bg-[#F97316] hover:bg-[#EA580C] active:scale-[0.98] transition-all
                         text-white font-bold text-base rounded-2xl
                         shadow-[0_4px_32px_rgba(249,115,22,0.45)]
                         hover:shadow-[0_6px_48px_rgba(249,115,22,0.62)]"
            >
              Registrar mi taller →
            </Link>
            <p className="text-slate-700 text-xs mt-4">Al registrarte aceptás los Términos de Servicio.</p>
          </FadeUp>
        </section>

      </main>

      <footer className="border-t border-white/[0.05] px-5 py-5 text-center">
        <p className="text-slate-700 text-xs">
          © {new Date().getFullYear()} TallerTrack · Hecho en Argentina 🇦🇷
        </p>
      </footer>
    </div>

    {/* ── Botón flotante WhatsApp ── */}
    <a
      href="https://wa.me/543535632678?text=Hola%2C%20quiero%20consultar%20sobre%20TallerTrack"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Consultar por WhatsApp"
      className="fixed bottom-6 right-5 z-50 flex items-center gap-2.5
                 bg-[#25D366] hover:bg-[#1ebe5d] active:scale-[0.96] transition-all
                 text-white font-bold text-sm px-4 py-3.5 rounded-2xl
                 shadow-[0_4px_24px_rgba(37,211,102,0.50)]
                 hover:shadow-[0_6px_36px_rgba(37,211,102,0.70)]"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 flex-shrink-0">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
      Consultas
    </a>
    </>
  );
}
