import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { AppShell } from "../../components/layout/AppShell";
import { WorkOrderCard } from "./WorkOrderCard";
import { workOrdersApi } from "../../api/work-orders.api";
import { api } from "../../api/client";
import { WorkOrderStatus, WorkOrderDetail } from "../../types/work-order";
import { ACTIVE_STATUSES, STATUS_CONFIG, NEXT_STATES } from "../../config/status.config";
import { IconSearch, IconX, IconPlus, IconList, IconGrid } from "../../components/ui/Icons";
import { useAuthStore } from "../../store/auth.store";

const KANBAN_COLUMNS: WorkOrderStatus[] = ACTIVE_STATUSES;
const STALE_MS = 8 * 3600 * 1000; // 8 hours


export function Dashboard() {
  const navigate    = useNavigate();
  const queryClient = useQueryClient();
  const tenantName  = useAuthStore((s) => s.user?.tenantName ?? "");
  const userPlan    = useAuthStore((s) => s.user?.plan);
  const subStatus   = useAuthStore((s) => s.user?.sub_status);

  const [search,              setSearch]              = useState("");
  const [activeTab,           setActiveTab]           = useState<WorkOrderStatus | "all">("all");
  const [viewMode,            setViewMode]            = useState<"list" | "kanban">("list");
  const [mechanicFilter,      setMechanicFilter]      = useState<string | null>(null);
  const [pendingTransitions,  setPendingTransitions]  = useState<Record<string, WorkOrderStatus>>({});
  const [draggingOrderId,     setDraggingOrderId]     = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["work-orders"],
    queryFn:  () => workOrdersApi.list({ limit: 100 }),
    refetchInterval: 30_000,
  });

  const transitionMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: WorkOrderStatus }) =>
      workOrdersApi.transition(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-orders"] });
    },
    onError: (_err, { id }) => {
      setPendingTransitions((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    },
  });

  function handleTransition(id: string, status: WorkOrderStatus) {
    setPendingTransitions((prev) => ({ ...prev, [id]: status }));
    transitionMut.mutate({ id, status }, {
      onSuccess: () => {
        setPendingTransitions((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      },
    });
  }

  const orders: WorkOrderDetail[] = data?.data ?? [];

  const activeOrders = useMemo(
    () => orders.filter(o => ACTIVE_STATUSES.includes(o.status)),
    [orders],
  );

  // Apply optimistic pending transitions for immediate visual feedback
  const ordersWithPending = useMemo(
    () => activeOrders.map(o => ({
      ...o,
      status: (pendingTransitions[o.id] ?? o.status) as WorkOrderStatus,
    })),
    [activeOrders, pendingTransitions],
  );

  const counts = useMemo(() => {
    const map: Partial<Record<WorkOrderStatus, number>> = {};
    ordersWithPending.forEach((o) => { map[o.status] = (map[o.status] ?? 0) + 1; });
    return map;
  }, [ordersWithPending]);

  const mechanics = useMemo(() => {
    const names = new Set<string>();
    activeOrders.forEach((o) => { if (o.assigned_user_name) names.add(o.assigned_user_name); });
    return Array.from(names).sort();
  }, [activeOrders]);

  const stats = useMemo(() => {
    const now = Date.now();
    return {
      active: activeOrders.length,
      ready:  counts.ready ?? 0,
      stale:  activeOrders.filter(o =>
        o.status !== "ready" &&
        (now - new Date(o.received_at).getTime()) > STALE_MS
      ).length,
    };
  }, [activeOrders, counts, orders]);

  const filtered = useMemo(() => {
    let list = ordersWithPending;
    if (search.trim()) {
      const q = search.trim().toUpperCase();
      list = list.filter(o =>
        o.vehicle_plate.toUpperCase().includes(q) ||
        (o.client_name        ?? "").toUpperCase().includes(q) ||
        (o.order_number       ?? "").toUpperCase().includes(q) ||
        (o.assigned_user_name ?? "").toUpperCase().includes(q),
      );
    }
    if (activeTab !== "all") {
      list = list.filter(o => o.status === activeTab);
    }
    if (mechanicFilter) {
      list = list.filter(o => o.assigned_user_name === mechanicFilter);
    }
    return list;
  }, [ordersWithPending, search, activeTab, mechanicFilter]);

  const sections = useMemo(() => {
    if (activeTab !== "all" || search.trim()) return null;

    const now     = Date.now();
    const isStale = (o: WorkOrderDetail) =>
      o.status !== "ready" && (now - new Date(o.received_at).getTime()) > STALE_MS;

    const needsAttention = filtered
      .filter(o => o.status === "ready" || o.status === "awaiting_parts" || isStale(o))
      .sort((a, b) => {
        if (a.status === "ready" && b.status !== "ready") return -1;
        if (b.status === "ready" && a.status !== "ready") return 1;
        return new Date(a.received_at).getTime() - new Date(b.received_at).getTime();
      });

    const attentionIds = new Set(needsAttention.map(o => o.id));
    const inProgress   = filtered
      .filter(o => !attentionIds.has(o.id))
      .sort((a, b) => new Date(a.received_at).getTime() - new Date(b.received_at).getTime());

    return { needsAttention, inProgress };
  }, [filtered, activeTab, search]);

  return (
    <AppShell
      title={tenantName}
      action={
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode(v => v === "list" ? "kanban" : "list")}
            className="w-9 h-9 flex items-center justify-center rounded-xl
                       bg-surface-raised text-slate-400 hover:text-slate-200
                       hover:bg-surface-border transition-colors"
            title={viewMode === "list" ? "Vista kanban" : "Vista lista"}
          >
            {viewMode === "list" ? <IconGrid className="w-4 h-4" /> : <IconList className="w-4 h-4" />}
          </button>
          <button
            onClick={() => navigate("/new")}
            className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-brand
                       hover:bg-brand-hover text-white font-semibold text-sm
                       transition-colors active:scale-95"
          >
            <IconPlus className="w-4 h-4" />
            <span>Nueva OT</span>
          </button>
        </div>
      }
    >
      <div className="flex flex-col">

        {/* ── Stats Strip (métricas del día) ── */}
        {!isLoading && activeOrders.length > 0 && (
          <div className="grid grid-cols-4 border-b border-surface-border bg-surface">
            <StatTile
              label="En taller"
              value={stats.active}
              sublabel="activas"
              active={activeTab === "all" && !search}
              onClick={() => { setActiveTab("all"); setSearch(""); }}
            />
            <StatTile
              label="Listos"
              value={stats.ready}
              sublabel="para retirar"
              valueColor={stats.ready > 0 ? "text-green-400" : "text-slate-600"}
              dotColor={stats.ready > 0 ? "bg-green-400" : undefined}
              active={activeTab === "ready"}
              onClick={() => { setActiveTab("ready"); setSearch(""); }}
            />
            <StatTile
              label="Repuestos"
              value={counts.awaiting_parts ?? 0}
              sublabel="en espera"
              valueColor={(counts.awaiting_parts ?? 0) > 0 ? "text-amber-400" : "text-slate-600"}
              dotColor={(counts.awaiting_parts ?? 0) > 0 ? "bg-amber-400" : undefined}
              active={activeTab === "awaiting_parts"}
              onClick={() => { setActiveTab("awaiting_parts"); setSearch(""); }}
            />
            <StatTile
              label="Vencidas"
              value={stats.stale}
              sublabel="+8h sin avance"
              valueColor={stats.stale > 0 ? "text-red-400" : "text-slate-600"}
              dotColor={stats.stale > 0 ? "bg-red-400 animate-pulse" : undefined}
            />
          </div>
        )}

        {/* ── Capacity Widget ── */}
        {!isLoading && (
          <CapacityWidget
            current={stats.active}
            plan={userPlan}
            subStatus={subStatus}
            onUpgrade={() => navigate("/billing")}
          />
        )}

        {/* ── Search ── */}
        <div className="px-4 py-3 sticky top-[3.5rem] z-30 bg-surface border-b border-surface-border">
          <div className="relative">
            <IconSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar patente, cliente, OT…"
              className="w-full h-10 bg-surface-card border border-surface-border rounded-xl
                         pl-10 pr-9 text-sm text-slate-100 placeholder-slate-500 font-mono tracking-widest
                         focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent
                         transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                <IconX className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* ── Status Tabs — only in list mode ── */}
        {viewMode === "list" && (
          <div className="flex overflow-x-auto border-b border-surface-border bg-surface
                          sticky top-[6.5rem] z-20 scrollbar-hide">
            <TabItem
              label="Todas"
              count={activeOrders.length}
              active={activeTab === "all"}
              onClick={() => setActiveTab("all")}
            />
            {KANBAN_COLUMNS
              .filter(s => (counts[s] ?? 0) > 0)
              .map((status) => {
                const cfg = STATUS_CONFIG[status];
                return (
                  <TabItem
                    key={status}
                    label={cfg.shortLabel}
                    count={counts[status] ?? 0}
                    active={activeTab === status}
                    onClick={() => setActiveTab(status)}
                    activeColor={cfg.textColor}
                    activeBorder={cfg.borderColor}
                  />
                );
              })}
          </div>
        )}

        {/* ── Mechanic filter chips ── */}
        {!isLoading && mechanics.length > 0 && (
          <div className="flex overflow-x-auto gap-2 px-4 py-2.5 border-b border-surface-border scrollbar-hide">
            <MechanicChip
              label="Todos"
              active={mechanicFilter === null}
              onClick={() => setMechanicFilter(null)}
            />
            {mechanics.map((name) => (
              <MechanicChip
                key={name}
                label={name}
                active={mechanicFilter === name}
                onClick={() => setMechanicFilter(mechanicFilter === name ? null : name)}
              />
            ))}
          </div>
        )}

        {/* ── Content ── */}
        {isLoading && <LoadingSkeleton />}
        {error     && <ErrorState message={(error as Error).message} />}

        {!isLoading && !error && viewMode === "list" && (
          sections
            ? <SectionedView sections={sections} total={filtered.length} />
            : <FlatList orders={filtered} />
        )}

        {!isLoading && !error && viewMode === "kanban" && (
          <KanbanView
            orders={ordersWithPending}
            search={search}
            counts={counts}
            draggingOrderId={draggingOrderId}
            onDraggingChange={setDraggingOrderId}
            onTransition={handleTransition}
          />
        )}
      </div>
    </AppShell>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function StatTile({
  label, value, sublabel,
  valueColor = "text-slate-200",
  dotColor,
  onClick, active = false,
}: {
  label: string; value: number | string; sublabel: string;
  valueColor?: string; dotColor?: string;
  onClick?: () => void; active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`
        flex flex-col items-center justify-center py-3.5 px-1 gap-1
        border-r border-surface-border last:border-r-0
        transition-colors select-none
        ${onClick ? "hover:bg-surface-raised/40 active:scale-[0.97] cursor-pointer" : "cursor-default"}
        ${active ? "bg-surface-raised/50" : ""}
      `}
    >
      <div className="flex items-center gap-1.5">
        {dotColor && (
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor}`} />
        )}
        <span className={`text-[1.4rem] font-black tabular-nums leading-none ${valueColor}`}>
          {value}
        </span>
      </div>
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide leading-none">
        {label}
      </span>
      <span className="text-[10px] text-slate-600 leading-none text-center px-1">
        {sublabel}
      </span>
    </button>
  );
}

function TabItem({
  label, count, active, onClick,
  activeColor = "text-brand", activeBorder = "border-brand",
}: {
  label: string; count: number; active: boolean; onClick: () => void;
  activeColor?: string; activeBorder?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-1.5 px-4 py-3 flex-shrink-0 text-xs font-semibold
        transition-colors border-b-2 whitespace-nowrap touch-feedback
        ${active
          ? `${activeColor} ${activeBorder}`
          : "text-slate-500 border-transparent hover:text-slate-400"
        }
      `}
    >
      <span>{label}</span>
      <span className={`
        text-[10px] font-black px-1.5 py-0.5 rounded-md min-w-[1.25rem] text-center
        ${active ? "bg-current/10" : "bg-surface-raised text-slate-600"}
      `}>
        {count}
      </span>
    </button>
  );
}

function SectionHeader({
  label, count, accent = "text-slate-500", dotColor,
}: {
  label: string; count: number; accent?: string; dotColor?: string;
}) {
  return (
    <div className="flex items-center gap-2 px-4 pt-4 pb-2">
      {dotColor && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor}`} />}
      <span className={`text-[10px] font-bold uppercase tracking-widest ${accent}`}>{label}</span>
      <span className="text-[10px] text-slate-700 font-mono">{count}</span>
      <div className="flex-1 h-px bg-surface-raised/60 ml-1" />
    </div>
  );
}

function SectionedView({
  sections, total,
}: {
  sections: { needsAttention: WorkOrderDetail[]; inProgress: WorkOrderDetail[] };
  total: number;
}) {
  if (total === 0) return <EmptyState />;

  return (
    <div className="flex flex-col pb-6 animate-slide-up">

      {sections.needsAttention.length > 0 && (
        <>
          <SectionHeader
            label="Requieren atención"
            count={sections.needsAttention.length}
            accent="text-amber-500"
            dotColor="bg-amber-400 animate-pulse"
          />
          <div className="flex flex-col gap-2 px-4">
            {sections.needsAttention.map((o) => (
              <WorkOrderCard key={o.id} order={o} highlight />
            ))}
          </div>
        </>
      )}

      {sections.inProgress.length > 0 && (
        <>
          <SectionHeader
            label="En progreso"
            count={sections.inProgress.length}
          />
          <div className="flex flex-col gap-2 px-4">
            {sections.inProgress.map((o) => (
              <WorkOrderCard key={o.id} order={o} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function FlatList({ orders }: { orders: WorkOrderDetail[] }) {
  if (orders.length === 0) return <EmptyState />;
  return (
    <div className="flex flex-col gap-2 p-4 animate-slide-up">
      {orders.map((o) => <WorkOrderCard key={o.id} order={o} />)}
    </div>
  );
}

// ── Kanban with Drag-and-Drop ───────────────────────────────────────────────

function KanbanView({
  orders, search, counts, draggingOrderId, onDraggingChange, onTransition,
}: {
  orders: WorkOrderDetail[];
  search: string;
  counts: Partial<Record<WorkOrderStatus, number>>;
  draggingOrderId: string | null;
  onDraggingChange: (id: string | null) => void;
  onTransition: (id: string, status: WorkOrderStatus) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
  );

  const draggingOrder = draggingOrderId
    ? orders.find(o => o.id === draggingOrderId) ?? null
    : null;

  const validTargets: WorkOrderStatus[] = draggingOrder
    ? (NEXT_STATES[draggingOrder.status] ?? [])
    : [];

  function handleDragStart({ active }: DragStartEvent) {
    onDraggingChange(active.id as string);
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    onDraggingChange(null);
    if (!over) return;
    const order        = orders.find(o => o.id === active.id);
    const targetStatus = over.id as WorkOrderStatus;
    if (order && targetStatus !== order.status && validTargets.includes(targetStatus)) {
      onTransition(order.id, targetStatus);
    }
  }

  function handleDragCancel() {
    onDraggingChange(null);
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex overflow-x-auto gap-3 p-4 pb-6 snap-x snap-mandatory">
        {KANBAN_COLUMNS.map((status) => {
          const colOrders = orders.filter(
            (o) =>
              o.status === status &&
              (!search.trim() ||
                o.vehicle_plate.toUpperCase().includes(search.toUpperCase()) ||
                (o.client_name ?? "").toUpperCase().includes(search.toUpperCase())),
          );
          const isValidTarget  = validTargets.includes(status);
          const isDraggingAny  = draggingOrderId !== null;
          return (
            <DroppableColumn
              key={status}
              status={status}
              orders={colOrders}
              count={counts[status] ?? 0}
              isValidTarget={isValidTarget}
              isDraggingAny={isDraggingAny}
            />
          );
        })}
      </div>

      {/* Floating card clone while dragging */}
      <DragOverlay dropAnimation={null}>
        {draggingOrder && (
          <div className="w-72 rotate-1 opacity-95 shadow-2xl">
            <WorkOrderCard order={draggingOrder} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

// ── Droppable column ────────────────────────────────────────────────────────

function DroppableColumn({
  status, orders, count, isValidTarget, isDraggingAny,
}: {
  status: WorkOrderStatus;
  orders: WorkOrderDetail[];
  count: number;
  isValidTarget: boolean;
  isDraggingAny: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const cfg = STATUS_CONFIG[status];

  const headerGlow = isOver && isValidTarget
    ? "ring-2 ring-inset ring-white/30"
    : "";

  const columnOpacity = isDraggingAny && !isValidTarget
    ? "opacity-40"
    : "opacity-100";

  return (
    <div
      className={`flex flex-col gap-2 flex-shrink-0 w-72 snap-start transition-opacity duration-150 ${columnOpacity}`}
    >
      {/* Column header */}
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-xl ${cfg.bgColor} ${headerGlow} transition-all duration-150`}
      >
        <span className={`w-2 h-2 rounded-full ${cfg.dotColor} flex-shrink-0`} />
        <span className={`font-semibold text-xs ${cfg.textColor} flex-1 uppercase tracking-wide`}>
          {cfg.shortLabel}
        </span>
        <span className={`font-black text-sm ${cfg.textColor}`}>{count}</span>
        {isOver && isValidTarget && (
          <span className="text-[10px] text-white/60 font-semibold">Soltar aquí</span>
        )}
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={`flex flex-col gap-2 min-h-[4rem] rounded-xl transition-all duration-150
          ${isOver && isValidTarget
            ? "bg-white/5 ring-2 ring-dashed ring-white/20 p-1"
            : isDraggingAny && isValidTarget
              ? "bg-white/5 ring-1 ring-dashed ring-white/10 p-1"
              : ""
          }`}
      >
        {orders.map((o) => <DraggableCard key={o.id} order={o} />)}
        {orders.length === 0 && (
          <div className={`text-center text-xs py-6 rounded-xl border border-dashed transition-colors
            ${isOver && isValidTarget
              ? "text-white/40 border-white/20 bg-white/5"
              : "text-slate-700 border-surface-border/60 bg-surface-card/30"
            }`}>
            {isDraggingAny && isValidTarget ? "Soltar aquí" : "Sin órdenes"}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Draggable card wrapper ──────────────────────────────────────────────────

function DraggableCard({ order }: { order: WorkOrderDetail }) {
  const canDrag = (NEXT_STATES[order.status] ?? []).length > 0;

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id:       order.id,
    data:     { order },
    disabled: !canDrag,
  });

  return (
    <div
      ref={setNodeRef}
      style={transform ? { transform: CSS.Transform.toString(transform) } : undefined}
      className={`touch-none transition-opacity duration-100 ${isDragging ? "opacity-0" : ""}`}
      {...listeners}
      {...attributes}
    >
      <WorkOrderCard order={order} />
      {/* Drag hint for draggable cards */}
      {canDrag && !isDragging && (
        <div className="flex justify-center pt-0.5 pb-0.5 -mt-1">
          <span className="w-8 h-0.5 rounded-full bg-slate-700/60" />
        </div>
      )}
    </div>
  );
}

// ── Empty state ─────────────────────────────────────────────────────────────

function EmptyState() {
  const { data: waStatus } = useQuery<{ status: string }>({
    queryKey:  ["whatsapp-status"],
    queryFn:   () => api.get("/whatsapp/status"),
    staleTime: 60_000,
  });

  const waConnected = waStatus?.status === "connected";
  return waConnected ? <EmptyStateReady /> : <EmptyStateOnboarding />;
}

// ── Onboarding: WhatsApp not yet connected ─────────────────────────────────
function EmptyStateOnboarding() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center py-12 px-8 gap-6 text-center animate-slide-up">

      {/* WhatsApp icon with glow */}
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-green-500/10 animate-pulse scale-[1.5]" />
        <div
          className="relative w-20 h-20 rounded-3xl bg-green-950/60 border border-green-800/50
                     flex items-center justify-center"
          style={{ boxShadow: "0 0 32px rgba(74,222,128,0.2), 0 0 8px rgba(74,222,128,0.1)" }}
        >
          <svg className="w-10 h-10 text-green-400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-slate-100 font-bold text-xl leading-snug">
          ¡Bienvenido a TallerTrack!
        </p>
        <p className="text-slate-400 text-sm leading-relaxed max-w-[280px]">
          Antes de recibir tu primer auto, conectemos tu WhatsApp para automatizar los avisos a tus clientes.
        </p>
      </div>

      <div className="w-full max-w-xs flex flex-col gap-2">
        <StepRow done  label="Cuenta creada" />
        <StepRow active label="Conectar WhatsApp" />
        <StepRow       label="Crear primera orden" />
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={() => navigate("/profile")}
          className="w-full h-12 rounded-xl font-bold text-sm text-white
                     flex items-center justify-center gap-2 transition-colors"
          style={{
            background: "linear-gradient(135deg, #15803D 0%, #16A34A 60%, #15803D 100%)",
            boxShadow:  "0 2px 16px rgba(22,163,74,0.35)",
          }}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          Conectar WhatsApp
        </button>
        <button
          onClick={() => navigate("/new")}
          className="text-slate-600 text-xs hover:text-slate-400 transition-colors py-1"
        >
          Saltar por ahora →
        </button>
      </div>
    </div>
  );
}

// ── Ready: WhatsApp connected, no orders yet ───────────────────────────────
function EmptyStateReady() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center py-12 px-8 gap-6 text-center animate-slide-up">
      <CarOnLiftSVG />
      <div className="space-y-1.5">
        <p className="text-slate-100 font-bold text-xl">Todo listo.</p>
        <p className="text-brand font-semibold text-sm">Tu taller está automatizado.</p>
        <p className="text-slate-500 text-sm mt-2 leading-relaxed">
          Cuando llegue tu primer auto, creá la orden de trabajo acá.
        </p>
      </div>
      <button
        onClick={() => navigate("/new")}
        className="flex items-center gap-2 px-6 h-12 rounded-xl bg-brand
                   hover:bg-brand-hover text-white font-bold text-sm
                   transition-colors active:scale-95"
        style={{ boxShadow: "0 2px 16px rgba(249,115,22,0.3)" }}
      >
        <IconPlus className="w-4 h-4" />
        Crear primera orden
      </button>
    </div>
  );
}

// ── Step row for onboarding progress ──────────────────────────────────────
function StepRow({ label, done, active }: { label: string; done?: boolean; active?: boolean }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border
                     ${done   ? "bg-green-950/30 border-green-800/40"
                     : active ? "bg-brand/10 border-brand/30"
                     :          "bg-surface-card border-surface-border opacity-50"}`}>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0
                       ${done   ? "bg-green-700/60"
                       : active ? "bg-brand/20 border border-brand/40"
                       :          "bg-surface-raised border border-surface-border"}`}>
        {done ? (
          <svg className="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : active ? (
          <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
        ) : (
          <span className="w-2 h-2 rounded-full bg-slate-600" />
        )}
      </div>
      <span className={`text-sm font-semibold
                        ${done ? "text-green-400" : active ? "text-slate-200" : "text-slate-600"}`}>
        {label}
      </span>
    </div>
  );
}

// ── Car on lift SVG illustration ───────────────────────────────────────────
function CarOnLiftSVG() {
  return (
    <svg viewBox="0 0 200 150" className="w-52 h-40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="100" cy="142" rx="72" ry="7" fill="#EA580C" opacity="0.12" />
      <rect x="20" y="88" width="8" height="52" rx="4" fill="#374151" />
      <rect x="172" y="88" width="8" height="52" rx="4" fill="#374151" />
      <rect x="12" y="136" width="24" height="6" rx="3" fill="#4B5563" />
      <rect x="164" y="136" width="24" height="6" rx="3" fill="#4B5563" />
      <line x1="28" y1="102" x2="62" y2="88" stroke="#EA580C" strokeWidth="4" strokeLinecap="round" />
      <line x1="172" y1="102" x2="138" y2="88" stroke="#EA580C" strokeWidth="4" strokeLinecap="round" />
      <rect x="58" y="84" width="84" height="7" rx="3.5" fill="#C2410C" />
      <rect x="60" y="84" width="80" height="4" rx="2" fill="url(#liftGrad)" opacity="0.9" />
      <rect x="42" y="50" width="116" height="38" rx="9" fill="#1E2536" stroke="#4B5563" strokeWidth="1.5" />
      <path d="M74 50 C76 28 124 28 126 50" fill="#131720" stroke="#4B5563" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M80 50 C82 36 100 33 100 50Z" fill="#1D4ED8" opacity="0.35" />
      <path d="M100 50 C100 33 118 36 120 50Z" fill="#1D4ED8" opacity="0.35" />
      <rect x="153" y="61" width="9" height="5" rx="2.5" fill="#FCD34D" opacity="0.8" />
      <rect x="153" y="61" width="9" height="5" rx="2.5" fill="url(#headlightGlow)" opacity="0.5" />
      <rect x="38" y="61" width="7" height="5" rx="2.5" fill="#EF4444" opacity="0.7" />
      <line x1="100" y1="52" x2="100" y2="86" stroke="#374151" strokeWidth="1" />
      <circle cx="72" cy="88" r="13" fill="#111827" stroke="#4B5563" strokeWidth="2" />
      <circle cx="72" cy="88" r="6" fill="#1E2536" stroke="#374151" strokeWidth="1" />
      <circle cx="128" cy="88" r="13" fill="#111827" stroke="#4B5563" strokeWidth="2" />
      <circle cx="128" cy="88" r="6" fill="#1E2536" stroke="#374151" strokeWidth="1" />
      {[0, 60, 120, 180, 240, 300].map((deg) => (
        <line key={deg}
          x1={72 + 3 * Math.cos((deg * Math.PI) / 180)} y1={88 + 3 * Math.sin((deg * Math.PI) / 180)}
          x2={72 + 5.5 * Math.cos((deg * Math.PI) / 180)} y2={88 + 5.5 * Math.sin((deg * Math.PI) / 180)}
          stroke="#4B5563" strokeWidth="1" strokeLinecap="round"
        />
      ))}
      {[0, 60, 120, 180, 240, 300].map((deg) => (
        <line key={deg}
          x1={128 + 3 * Math.cos((deg * Math.PI) / 180)} y1={88 + 3 * Math.sin((deg * Math.PI) / 180)}
          x2={128 + 5.5 * Math.cos((deg * Math.PI) / 180)} y2={88 + 5.5 * Math.sin((deg * Math.PI) / 180)}
          stroke="#4B5563" strokeWidth="1" strokeLinecap="round"
        />
      ))}
      <circle cx="160" cy="36" r="14" fill="#14532D" stroke="#166534" strokeWidth="1.5" />
      <circle cx="160" cy="36" r="14" fill="#15803D" opacity="0.6" />
      <path d="M153 36 L158 41 L167 30" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <defs>
        <linearGradient id="liftGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F97316" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#EA580C" stopOpacity="0.2" />
        </linearGradient>
        <radialGradient id="headlightGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FCD34D" />
          <stop offset="100%" stopColor="#FCD34D" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );
}

function MechanicChip({
  label, active, onClick,
}: { label: string; active: boolean; onClick: () => void }) {
  const initials = label === "Todos" ? null : label.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold
                  flex-shrink-0 transition-all active:scale-95
                  ${active
                    ? "bg-brand text-white"
                    : "bg-surface-card border border-surface-border text-slate-400 hover:border-slate-500 hover:text-slate-300"
                  }`}
    >
      {initials && (
        <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black
                          ${active ? "bg-white/20" : "bg-surface-raised"}`}>
          {initials}
        </span>
      )}
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// CapacityWidget — shows active vehicles vs plan limit with a progress bar
// ---------------------------------------------------------------------------

const PLAN_MAX: Partial<Record<string, number | null>> = {
  starter:      10,
  professional: 30,
  enterprise:   null, // unlimited
};

function CapacityWidget({
  current,
  plan,
  subStatus,
  onUpgrade,
}: {
  current:   number;
  plan?:     string;
  subStatus?: string;
  onUpgrade: () => void;
}) {
  // Trialing gets Pro limits; enterprise is unlimited (don't show widget)
  const effectivePlan = subStatus === "trialing" ? "professional" : (plan ?? "starter");
  const max           = PLAN_MAX[effectivePlan] ?? 10;

  if (max === null) return null; // enterprise: unlimited, skip widget

  const pct       = Math.min(100, Math.round((current / max) * 100));
  const isWarning = pct >= 80;
  const isFull    = current >= max;

  return (
    <div
      className={`mx-4 mt-3 rounded-xl border px-4 py-3 transition-colors ${
        isFull
          ? "bg-red-950/30 border-red-800/50"
          : isWarning
          ? "bg-amber-950/20 border-amber-700/40"
          : "bg-surface-card border-surface-border"
      }`}
    >
      {/* Header row */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <svg
            className={`w-3.5 h-3.5 flex-shrink-0 ${
              isFull ? "text-red-400" : isWarning ? "text-amber-400" : "text-slate-500"
            }`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}
          >
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
          </svg>
          <span className={`text-xs font-semibold ${
            isFull ? "text-red-400" : isWarning ? "text-amber-400" : "text-slate-400"
          }`}>
            Capacidad del Taller
          </span>
        </div>

        {/* Count + upgrade CTA */}
        <div className="flex items-center gap-2">
          <span className={`text-sm font-black tabular-nums ${
            isFull ? "text-red-300" : isWarning ? "text-amber-200" : "text-slate-200"
          }`}>
            {current}
            <span className="text-slate-500 font-normal text-xs"> / {max}</span>
          </span>
          {isWarning && (
            <button
              onClick={onUpgrade}
              className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-all active:scale-95 ${
                isFull
                  ? "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
                  : "bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30"
              }`}
            >
              {isFull ? "¡Ampliar!" : "Mejorar →"}
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${
            isFull    ? "bg-red-500" :
            isWarning ? "bg-amber-400" :
            "bg-brand"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {isFull && (
        <p className="text-[10px] text-red-400/80 mt-1.5 leading-snug">
          Capacidad completa. Mejorá tu plan para seguir registrando vehículos.
        </p>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-2 p-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-surface-card rounded-xl h-[5.5rem] animate-pulse border border-surface-border" />
      ))}
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-3 p-8 text-center">
      <div className="w-12 h-12 rounded-xl bg-red-950/40 border border-red-900/50
                      flex items-center justify-center">
        <IconX className="w-5 h-5 text-red-400" />
      </div>
      <div>
        <p className="text-red-400 font-semibold text-sm">Error al cargar órdenes</p>
        <p className="text-slate-500 text-xs mt-1">{message}</p>
      </div>
    </div>
  );
}
