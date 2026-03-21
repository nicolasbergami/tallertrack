import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { backofficeApi, type RecentActivity } from "../../api/backoffice.api";

const PLAN_LABELS: Record<string, string> = {
  free:         "Free",
  starter:      "Independiente",
  professional: "Taller Pro",
  enterprise:   "Platinum",
};

const STATUS_COLORS: Record<string, string> = {
  active:    "text-emerald-400",
  trialing:  "text-orange-400",
  inactive:  "text-slate-500",
  cancelled: "text-red-400",
  past_due:  "text-yellow-400",
};

const PLAN_ICONS: Record<string, string> = {
  free:         "🆓",
  starter:      "🔧",
  professional: "🏆",
  enterprise:   "💎",
};

function fmtRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);

  if (mins  < 60)  return `hace ${mins} min`;
  if (hours < 24)  return `hace ${hours}h`;
  if (days  < 7)   return `hace ${days}d`;
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
}

function groupByDay(activity: RecentActivity[]) {
  const groups: Record<string, RecentActivity[]> = {};
  for (const item of activity) {
    const day = new Date(item.created_at).toLocaleDateString("es-AR", {
      weekday: "long", day: "numeric", month: "long",
    });
    if (!groups[day]) groups[day] = [];
    groups[day].push(item);
  }
  return Object.entries(groups);
}

export function ActivityTab() {
  const [days, setDays] = useState(30);

  const { data, isLoading } = useQuery({
    queryKey: ["backoffice-activity", days],
    queryFn:  () => backofficeApi.getActivity(days),
  });

  const grouped = data ? groupByDay(data.activity) : [];

  return (
    <div className="flex flex-col gap-5">
      {/* Period selector */}
      <div className="flex items-center gap-2">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Período:</p>
        {[7, 30, 90].map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`h-7 px-3 rounded-lg text-xs font-semibold transition-colors ${
              days === d
                ? "bg-brand text-white"
                : "border border-white/10 text-slate-500 hover:border-white/20 hover:text-slate-300"
            }`}
          >
            {d}d
          </button>
        ))}
        {data && (
          <p className="text-slate-600 text-xs ml-2">
            {data.activity.length} talleres registrados
          </p>
        )}
      </div>

      {/* Timeline */}
      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 bg-[#111827] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : grouped.length === 0 ? (
        <div className="text-center py-20 text-slate-600">
          No hay registros en los últimos {days} días.
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {grouped.map(([day, items]) => (
            <div key={day}>
              {/* Day header */}
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider capitalize mb-3">
                {day}
              </p>
              <div className="flex flex-col gap-2">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="bg-[#111827] border border-white/5 rounded-xl px-4 py-3
                               flex items-center gap-3"
                  >
                    {/* Plan icon */}
                    <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0 text-lg">
                      {PLAN_ICONS[item.plan] ?? "🔧"}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-200 font-semibold text-sm truncate">{item.name}</p>
                      <p className="text-slate-500 text-xs font-mono">{item.slug}</p>
                    </div>
                    {/* Plan badge */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-slate-400 text-xs">{PLAN_LABELS[item.plan] ?? item.plan}</p>
                      <p className={`text-xs font-semibold ${STATUS_COLORS[item.sub_status] ?? "text-slate-500"}`}>
                        {item.sub_status === "trialing" ? "En trial" : item.sub_status}
                      </p>
                    </div>
                    {/* Timestamp */}
                    <p className="text-slate-600 text-xs flex-shrink-0 w-16 text-right">
                      {fmtRelative(item.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
