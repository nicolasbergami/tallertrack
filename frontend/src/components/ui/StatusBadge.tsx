import { WorkOrderStatus } from "../../types/work-order";
import { getStatusConfig } from "../../config/status.config";

interface Props {
  status: WorkOrderStatus;
  size?: "sm" | "md" | "lg";
  showDot?: boolean;
}

const sizeClasses = {
  sm: "text-xs px-2 py-0.5 gap-1.5",
  md: "text-sm px-3 py-1   gap-2",
  lg: "text-base px-4 py-1.5 gap-2",
};

export function StatusBadge({ status, size = "md", showDot = true }: Props) {
  const cfg = getStatusConfig(status);

  return (
    <span
      className={`
        inline-flex items-center rounded-full font-semibold
        ${cfg.bgColor} ${cfg.textColor} ${sizeClasses[size]}
      `}
    >
      {showDot && (
        <span className={`inline-block rounded-full ${cfg.dotColor} ${size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2"} flex-shrink-0`} />
      )}
      {cfg.emoji} {cfg.label}
    </span>
  );
}
