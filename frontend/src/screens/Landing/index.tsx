import { Link } from "react-router-dom";

const FEATURES = [
  {
    icon: "📋",
    title: "Órdenes de Trabajo",
    desc:  "Creá, asigná y gestioná todas las órdenes desde tu celular. Estado en tiempo real para todo el equipo.",
  },
  {
    icon: "📱",
    title: "Seguimiento QR",
    desc:  "El cliente escanea un código QR y ve el estado de su vehículo sin necesidad de llamar al taller.",
  },
  {
    icon: "💬",
    title: "WhatsApp Automático",
    desc:  "Notificaciones al cliente en cada cambio de estado, enviadas desde tu propio número de WhatsApp.",
  },
  {
    icon: "🤖",
    title: "IA para Presupuestos",
    desc:  "Grabá el diagnóstico en audio, la IA transcribe y genera el presupuesto completo en segundos.",
  },
  {
    icon: "📊",
    title: "Historial Completo",
    desc:  "Auditoría completa de cada acción. Nunca pierdas el historial de un vehículo ni de un mecánico.",
  },
  {
    icon: "💳",
    title: "Sin permanencia",
    desc:  "14 días de prueba gratuita. Sin tarjeta de crédito. Cancelá cuando quieras desde Mercado Pago.",
  },
];

export function Landing() {
  return (
    <div className="min-h-screen bg-[#0F172A] text-white flex flex-col">

      {/* ── Navbar ── */}
      <header className="sticky top-0 z-50 bg-[#0F172A]/95 backdrop-blur border-b border-slate-800
                         flex items-center justify-between px-5 py-3.5">
        <img src="/logo.png" alt="TallerTrack" className="h-9 w-auto" />
        <div className="flex items-center gap-2">
          <Link to="/login"
            className="text-sm font-semibold text-slate-400 hover:text-white transition-colors px-3 py-2">
            Ingresar
          </Link>
          <Link to="/register"
            className="text-sm font-bold bg-[#F97316] hover:bg-[#EA580C] transition-colors
                       text-white px-4 py-2 rounded-xl shadow-lg shadow-orange-900/30">
            Prueba gratis
          </Link>
        </div>
      </header>

      <main className="flex-1">

        {/* ── Hero ── */}
        <section className="px-5 pt-14 pb-10 text-center max-w-lg mx-auto">
          <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20
                          text-orange-400 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
            14 días gratis · Sin tarjeta de crédito
          </div>

          <h1 className="text-[2.6rem] font-black leading-tight mb-4">
            El sistema de gestión para{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-400">
              talleres mecánicos
            </span>
          </h1>

          <p className="text-slate-400 text-base leading-relaxed mb-8">
            Controlá tus órdenes de trabajo, notificá a tus clientes por WhatsApp y
            usá inteligencia artificial para armar presupuestos, todo desde el celular.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/register"
              className="flex items-center justify-center gap-2 h-14 px-7
                         bg-[#F97316] hover:bg-[#EA580C] active:scale-[0.98] transition-all
                         text-white font-bold text-base rounded-2xl shadow-lg shadow-orange-900/40">
              Empezar gratis →
            </Link>
            <Link to="/login"
              className="flex items-center justify-center gap-2 h-14 px-7
                         border border-slate-700 hover:border-slate-500 hover:bg-slate-800/50
                         transition-all text-slate-300 font-semibold text-base rounded-2xl">
              Ya tengo cuenta
            </Link>
          </div>
        </section>

        {/* ── App preview ── */}
        <section className="px-5 max-w-sm mx-auto mb-14">
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-3xl p-4 shadow-2xl shadow-black/40">
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-xs font-black text-[#F97316]">Taller<span className="text-slate-300">Track</span></span>
              <span className="flex gap-1">
                {["received","diagnosing","in_progress","ready","delivered"].map((s, i) => (
                  <span key={s} className={`w-2 h-2 rounded-full ${
                    i === 2 ? "bg-orange-400 scale-125" :
                    i < 2   ? "bg-green-500" : "bg-slate-600"
                  }`} />
                ))}
              </span>
            </div>
            {[
              { plate: "ABC 123", client: "Juan García",   status: "En proceso",  color: "bg-orange-500/20 text-orange-300" },
              { plate: "XYZ 789", client: "María López",   status: "Listo →",     color: "bg-green-500/20 text-green-300"   },
              { plate: "DEF 456", client: "Carlos Méndez", status: "Diagnóstico", color: "bg-amber-500/20 text-amber-300"   },
            ].map((o) => (
              <div key={o.plate} className="flex items-center justify-between bg-slate-900/50
                                             rounded-xl px-3 py-2.5 mb-2 last:mb-0 border border-slate-700/30">
                <div>
                  <p className="text-white font-black text-sm tracking-widest font-mono">{o.plate}</p>
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
                className="flex gap-4 bg-slate-800/40 border border-slate-700/40 rounded-2xl p-4
                           hover:border-slate-600/60 transition-colors">
                <span className="text-2xl flex-shrink-0 mt-0.5">{f.icon}</span>
                <div>
                  <p className="text-slate-100 font-bold text-sm mb-0.5">{f.title}</p>
                  <p className="text-slate-400 text-xs leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Pricing ── */}
        <section className="px-5 max-w-lg mx-auto mb-14">
          <div className="bg-gradient-to-br from-orange-950/40 to-slate-800/60
                          border border-orange-900/30 rounded-3xl p-6 text-center">
            <p className="text-[11px] font-semibold text-orange-400 uppercase tracking-widest mb-2">Precios en ARS</p>
            <div className="flex justify-center gap-3 mb-4">
              {[
                { name: "Básico",      price: "$18.000" },
                { name: "Profesional", price: "$35.000", highlight: true },
                { name: "Red",         price: "$80.000" },
              ].map((p) => (
                <div key={p.name} className={`flex-1 rounded-2xl py-3 px-2 ${
                  p.highlight
                    ? "bg-[#F97316] shadow-lg shadow-orange-900/40"
                    : "bg-slate-800/80 border border-slate-700/50"
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
          <h2 className="text-2xl font-black mb-3">¿Listo para ordenar tu taller?</h2>
          <p className="text-slate-400 text-sm mb-6">Empezá hoy con 14 días gratis. Sin compromiso.</p>
          <Link to="/register"
            className="inline-flex items-center justify-center h-14 px-8 w-full max-w-xs
                       bg-[#F97316] hover:bg-[#EA580C] active:scale-[0.98] transition-all
                       text-white font-bold text-base rounded-2xl shadow-lg shadow-orange-900/50">
            Registrar mi taller →
          </Link>
          <p className="text-slate-600 text-xs mt-4">Al registrarte aceptás los Términos de Servicio.</p>
        </section>
      </main>

      <footer className="border-t border-slate-800 px-5 py-5 text-center">
        <p className="text-slate-600 text-xs">
          © {new Date().getFullYear()} TallerTrack · Hecho en Argentina 🇦🇷
        </p>
      </footer>
    </div>
  );
}
