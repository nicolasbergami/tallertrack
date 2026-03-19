import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "../../components/layout/AppShell";
import { useAuthStore } from "../../store/auth.store";
import { teamApi, TeamMember, CreateMemberDTO } from "../../api/team.api";
import { IconPlus, IconX } from "../../components/ui/Icons";

// ---------------------------------------------------------------------------
// Role labels
// ---------------------------------------------------------------------------
const ROLE_LABELS: Record<string, string> = {
  owner:        "Propietario",
  admin:        "Administrador",
  mechanic:     "Mecánico",
  receptionist: "Recepcionista",
};

const ROLE_COLORS: Record<string, string> = {
  owner:        "text-yellow-400 bg-yellow-400/10",
  admin:        "text-blue-400 bg-blue-400/10",
  mechanic:     "text-brand bg-brand/10",
  receptionist: "text-purple-400 bg-purple-400/10",
};

// ---------------------------------------------------------------------------
// Add member modal
// ---------------------------------------------------------------------------
interface AddModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function AddMemberModal({ onClose, onSuccess }: AddModalProps) {
  const [form, setForm] = useState<CreateMemberDTO>({
    full_name: "",
    email:     "",
    password:  "",
    role:      "mechanic",
  });
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (dto: CreateMemberDTO) => teamApi.create(dto),
    onSuccess: () => {
      onSuccess();
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    mutation.mutate(form);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-surface-card border border-surface-border rounded-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
          <h2 className="text-slate-100 font-bold text-base">Agregar integrante</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <IconX className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Nombre completo
            </label>
            <input
              type="text"
              required
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="h-11 px-3 rounded-xl bg-surface border border-surface-border text-slate-100
                         placeholder-slate-600 focus:outline-none focus:border-brand/60 transition-colors text-sm"
              placeholder="Juan García"
            />
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Email
            </label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="h-11 px-3 rounded-xl bg-surface border border-surface-border text-slate-100
                         placeholder-slate-600 focus:outline-none focus:border-brand/60 transition-colors text-sm"
              placeholder="juan@taller.com"
            />
          </div>

          {/* Role */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Rol
            </label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as CreateMemberDTO["role"] })}
              className="h-11 px-3 rounded-xl bg-surface border border-surface-border text-slate-100
                         focus:outline-none focus:border-brand/60 transition-colors text-sm"
            >
              <option value="mechanic">Mecánico</option>
              <option value="receptionist">Recepcionista</option>
              <option value="admin">Administrador</option>
            </select>
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Contraseña inicial
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="h-11 px-3 rounded-xl bg-surface border border-surface-border text-slate-100
                         placeholder-slate-600 focus:outline-none focus:border-brand/60 transition-colors text-sm"
              placeholder="Mínimo 6 caracteres"
            />
            <p className="text-[11px] text-slate-500">
              El integrante podrá cambiarla desde su perfil.
            </p>
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-950/30 border border-red-900/40 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={mutation.isPending}
            className="h-11 rounded-xl bg-brand hover:bg-brand-hover text-white font-semibold text-sm
                       transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-1"
          >
            {mutation.isPending ? "Agregando…" : "Agregar integrante"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Member card
// ---------------------------------------------------------------------------
interface MemberCardProps {
  member:     TeamMember;
  currentId:  string;
  onToggle:   (id: string, active: boolean) => void;
  onRemove:   (id: string, name: string) => void;
  isLoading:  boolean;
}

function MemberCard({ member, currentId, onToggle, onRemove, isLoading }: MemberCardProps) {
  const isOwner  = member.role === "owner";
  const isSelf   = member.id === currentId;
  const isActive = member.status === "active";

  const initials = member.full_name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  const lastLogin = member.last_login_at
    ? new Date(member.last_login_at).toLocaleDateString("es-AR", { day: "numeric", month: "short" })
    : "Nunca";

  return (
    <div className={`flex items-center gap-3 px-4 py-3 transition-opacity ${!isActive ? "opacity-50" : ""}`}>
      {/* Avatar */}
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold
                       ${ROLE_COLORS[member.role] ?? "text-slate-300 bg-slate-700"}`}>
        {initials}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-slate-100 font-semibold text-sm truncate">{member.full_name}</p>
          {isSelf && (
            <span className="text-[10px] text-slate-500 font-medium">(vos)</span>
          )}
        </div>
        <p className="text-slate-500 text-xs truncate">{member.email}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${ROLE_COLORS[member.role] ?? ""}`}>
            {ROLE_LABELS[member.role] ?? member.role}
          </span>
          <span className="text-[10px] text-slate-600">· Último acceso: {lastLogin}</span>
        </div>
      </div>

      {/* Actions — no actions for owner or self */}
      {!isOwner && !isSelf && (
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => onToggle(member.id, isActive)}
            disabled={isLoading}
            title={isActive ? "Desactivar" : "Activar"}
            className={`h-8 px-2.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40
                        ${isActive
                          ? "text-slate-400 bg-slate-700/60 hover:bg-slate-700"
                          : "text-green-400 bg-green-900/30 hover:bg-green-900/50"
                        }`}
          >
            {isActive ? "Desactivar" : "Activar"}
          </button>
          <button
            onClick={() => onRemove(member.id, member.full_name)}
            disabled={isLoading}
            title="Eliminar"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-600
                       hover:text-red-400 hover:bg-red-950/30 transition-colors disabled:opacity-40"
          >
            <IconX className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------
export function Team() {
  const user        = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["team"],
    queryFn:  () => teamApi.list(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "active" | "inactive" }) =>
      teamApi.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["team"] }),
    onError: (err: Error) => alert(err.message),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => teamApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["team"] }),
    onError: (err: Error) => alert(err.message),
  });

  function handleToggle(id: string, currentlyActive: boolean) {
    updateMutation.mutate({ id, status: currentlyActive ? "inactive" : "active" });
  }

  function handleRemove(id: string, name: string) {
    if (confirm(`¿Eliminar a ${name} del equipo? Esta acción no se puede deshacer.`)) {
      removeMutation.mutate(id);
    }
  }

  const isMutating = updateMutation.isPending || removeMutation.isPending;

  // Slot indicator
  const used    = data ? data.members.filter((m) => m.role !== "owner").length : 0;
  const maxUsers = data?.max_users ?? 0;
  const canAdd  = data?.can_add ?? false;

  return (
    <AppShell title="Mi equipo" backTo="/profile">
      <div className="flex flex-col gap-4 p-4 animate-slide-up">

        {/* Header con contador + botón agregar */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-100 font-bold text-lg">Equipo del taller</p>
            {!isLoading && data && (
              <p className="text-slate-500 text-sm">
                {used} de {maxUsers} mecánico{maxUsers !== 1 ? "s" : ""} usado{maxUsers !== 1 ? "s" : ""}
              </p>
            )}
          </div>

          <button
            onClick={() => canAdd ? setShowAdd(true) : undefined}
            disabled={!canAdd || isLoading}
            title={!canAdd ? `Límite de ${maxUsers} mecánico${maxUsers !== 1 ? "s" : ""} alcanzado` : "Agregar integrante"}
            className={`flex items-center gap-2 h-10 px-4 rounded-xl text-sm font-semibold transition-colors
                        ${canAdd
                          ? "bg-brand hover:bg-brand-hover text-white"
                          : "bg-slate-800 text-slate-500 cursor-not-allowed"
                        }`}
          >
            <IconPlus className="w-4 h-4" />
            Agregar
          </button>
        </div>

        {/* Slots visuales */}
        {!isLoading && data && (
          <div className="flex gap-1.5">
            {Array.from({ length: maxUsers }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i < used ? "bg-brand" : "bg-slate-700"
                }`}
              />
            ))}
          </div>
        )}

        {/* Lista */}
        <section className="bg-surface-card border border-surface-border rounded-2xl overflow-hidden">
          {isLoading ? (
            <div className="flex flex-col divide-y divide-surface-border">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-16 px-4 py-3 flex items-center gap-3 animate-pulse">
                  <div className="w-10 h-10 rounded-xl bg-slate-700" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-32 bg-slate-700 rounded" />
                    <div className="h-2.5 w-48 bg-slate-800 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : data && data.members.length > 0 ? (
            <div className="divide-y divide-surface-border">
              {data.members.map((member) => (
                <MemberCard
                  key={member.id}
                  member={member}
                  currentId={user?.id ?? ""}
                  onToggle={handleToggle}
                  onRemove={handleRemove}
                  isLoading={isMutating}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center px-4">
              <p className="text-slate-400 font-semibold text-sm">No hay integrantes todavía</p>
              <p className="text-slate-600 text-xs mt-1">Agregá mecánicos o recepcionistas a tu equipo</p>
            </div>
          )}
        </section>

        {/* Info de login */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl px-4 py-3">
          <p className="text-slate-400 text-xs font-semibold mb-1">Como inician sesión los mecánicos</p>
          <p className="text-slate-500 text-xs">
            Ingresan en la misma pantalla de login con su email y contraseña:
          </p>
          <div className="mt-2 space-y-1 text-xs font-mono">
            <p><span className="text-slate-500">Email:</span> <span className="text-slate-300">el email que asignaste</span></p>
            <p><span className="text-slate-500">Contraseña:</span> <span className="text-slate-300">la que definiste al crearlo</span></p>
          </div>
        </div>

      </div>

      {showAdd && (
        <AddMemberModal
          onClose={() => setShowAdd(false)}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ["team"] })}
        />
      )}
    </AppShell>
  );
}
