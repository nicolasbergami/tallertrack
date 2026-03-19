import { Link } from "react-router-dom";

// ---------------------------------------------------------------------------
// Feature card data
// ---------------------------------------------------------------------------
const FEATURES = [
  {
    emoji: "📋",
    title: "Órdenes de Trabajo",
    desc:  "Creá, asigná y gestioná todas las OT desde tu celular. Estado en tiempo real para todo el equipo.",
  },
  {
    emoji: "📱",
    title: "Seguimiento QR",
    desc:  "El cliente escanea un código QR y ve el estado de su vehículo sin necesidad de llamar al taller.",
  },
  {
    emoji: "💬",
    title: "WhatsApp Automático",
    desc:  "Notificaciones automáticas al cliente en cada cambio de estado, desde tu propio número de WhatsApp.",
  },
  {
    emoji: "🤖",
    title: "IA para Presupuestos",
    desc:  "Grabá el audio del diagnóstico, la IA transcribe y genera el presupuesto completo en segundos.",
  },
  {
    emoji: "📊",
    title: "Historial Inmutable",
    desc:  "Auditoría completa de cada acción. Nunca pierdas el historial de un vehículo ni de un mecánico.",
  },
  {
    emoji: "💳",
    title: "Sin permanencia",
    desc:  "14 días de prueba gratuita. Sin tarjeta de crédito. Cancelá cuando quieras desde Mercado Pago.",
  },
];

// ---------------------------------------------------------------------------
// Landing Page
// ---------------------------------------------------------------------------
export function Landing() {
  return (
    <div className="min-h-screen bg-[#0F172A] text-white flex flex-col">

      {/* ── Navbar ── */}
      <header className="sticky top-0 z-50 bg-[#0F172A]/90 backdrop-blur border-b border-slate-800
                         flex items-center justify-between px-5 py-3.5">
        <span className="font-black text-lg tracking-tight select-none">
          <span className="text-blue-400">Taller</span>
          <span className="text-slate-100">Track</span>
        </span>
        <div className="flex items-center gap-2">
          <Link to="/login"
            className="text-sm font-semibold text-slate-300 hover:text-white transition-colors px-3 py-2">
            Ingresar
          </Link>
          <Link to="/register"
            className="text-sm font-bold bg-blue-600 hover:bg-blue-500 transition-colors
                       text-white px-4 py-2 rounded-xl">
            Prueba gratis
          </Link>
        </div>
      </header>

      <main className="flex-1">

        {/* ── Hero ── */}
        <section className="px-5 pt-14 pb-12 text-center max-w-lg mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-blue-600/10 border border-blue-500/20
                          text-blue-400 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            14 días gratis · Sin tarjeta de crédito
          </div>

          <h1 className="text-4xl font-black leading-tight mb-4">
            El sistema de gestión para{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
              talleres mecánicos
            </span>
          </h1>

          <p className="text-slate-400 text-base leading-relaxed mb-8">
            Controlá tus órdenes de trabajo, notificá a tus clientes por WhatsApp y
            usá inteligencia artificial para armar presupuestos, todo desde el celular.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/register"
              className="flex items-center justify-center gap-2 h-13 px-7 bg-blue-600
                         hover:bg-blue-500 active:scale-[0.98] transition-all
                         text-white font-bold text-base rounded-2xl shadow-lg shadow-blue-900/40">
              Empezar gratis →
            </Link>
            <Link to="/login"
              className="flex items-center justify-center gap-2 h-13 px-7
                         border border-slate-700 hover:border-slate-500 hover:bg-slate-800/50
                         transition-all text-slate-300 font-semibold text-base rounded-2xl">
              Ya tengo cuenta
            </Link>
          </div>
        </section>

        {/* ── App preview mockup ── */}
        <section className="px-5 max-w-sm mx-auto mb-14">
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-3xl p-4 shadow-2xl shadow-black/40">
            {/* Fake status bar */}
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-[10px] font-bold text-slate-500">TallerTrack</span>
              <span className="flex gap-1">
                {["received","diagnosing","in_progress","ready","delivered"].map((s, i) => (
                  <span key={s} className={`w-2 h-2 rounded-full ${
                    i === 2 ? "bg-blue-400 scale-125" :
                    i < 2   ? "bg-green-500" : "bg-slate-600"
                  }`} />
                ))}
              </span>
            </div>
            {/* Fake order cards */}
            {[
              { plate: "ABC 123", client: "Juan García",    status: "En proceso",   color: "bg-blue-500/20 text-blue-300" },
              { plate: "XYZ 789", client: "María López",    status: "Listo →",      color: "bg-green-500/20 text-green-300" },
              { plate: "DEF 456", client: "Carlos Méndez",  status: "Diagnóstico",  color: "bg-yellow-500/20 text-yellow-300" },
            ].map((o) => (
              <div key={o.plate} className="flex items-center justify-between bg-slate-900/50
                                             rounded-xl px-3 py-2.5 mb-2 last:mb-0">
                <div>
                  <p className="text-white font-bold text-sm">{o.plate}</p>
                  <p className="text-slate-500 text-xs">{o.client}</p>
                </div>
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg ${o.color}`}>
                  {o.status}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Features ── */}
        <section className="px-5 max-w-lg mx-auto mb-14">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest text-center mb-6">
            Todo lo que necesitás
          </p>
          <div className="grid grid-cols-1 gap-3">
            {FEATURES.map((f) => (
              <div key={f.title}
                className="flex gap-4 bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4">
                <span className="text-2xl flex-shrink-0 mt-0.5">{f.emoji}</span>
                <div>
                  <p className="text-slate-100 font-bold text-sm mb-0.5">{f.title}</p>
                  <p className="text-slate-400 text-xs leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Pricing teaser ── */}
        <section className="px-5 max-w-lg mx-auto mb-14">
          <div className="bg-gradient-to-br from-blue-900/30 to-slate-800/60
                          border border-blue-800/40 rounded-3xl p-6 text-center">
            <p className="text-[11px] font-semibold text-blue-400 uppercase tracking-widest mb-2">Precios en ARS</p>
            <div className="flex justify-center gap-4 mb-4">
              {[
                { name: "Básico",       price: "$18.000" },
                { name: "Profesional",  price: "$35.000", highlight: true },
                { name: "Red",          price: "$80.000" },
              ].map((p) => (
                <div key={p.name} className={`flex-1 rounded-2xl py-3 px-2 ${
                  p.highlight ? "bg-blue-600 shadow-lg shadow-blue-900/40" : "bg-slate-800"
                }`}>
                  <p className="text-[10px] font-semibold text-slate-300 mb-1">{p.name}</p>
                  <p className="text-white font-black text-base">{p.price}</p>
                  <p className="text-[9px] text-slate-400">/mes</p>
                </div>
              ))}
            </div>
            <p className="text-slate-500 text-xs">Pagos mensuales por Mercado Pago · Cancelá cuando quieras</p>
          </div>
        </section>

        {/* ── Bottom CTA ── */}
        <section className="px-5 max-w-lg mx-auto pb-16 text-center">
          <h2 className="text-2xl font-black mb-3">
            ¿Listo para ordenar tu taller?
          </h2>
          <p className="text-slate-400 text-sm mb-6">
            Empezá hoy con 14 días gratis. Sin compromiso.
          </p>
          <Link to="/register"
            className="inline-flex items-center justify-center gap-2 h-13 px-8
                       bg-blue-600 hover:bg-blue-500 active:scale-[0.98] transition-all
                       text-white font-bold text-base rounded-2xl
                       shadow-lg shadow-blue-900/50 w-full max-w-xs">
            Registrar mi taller →
          </Link>
          <p className="text-slate-600 text-xs mt-4">
            Al registrarte aceptás los Términos de Servicio.
          </p>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-800 px-5 py-5 text-center">
        <p className="text-slate-600 text-xs">
          © {new Date().getFullYear()} TallerTrack · Hecho en Argentina 🇦🇷
        </p>
      </footer>
    </div>
  );
}
