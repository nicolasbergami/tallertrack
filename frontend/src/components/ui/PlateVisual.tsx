// Simulates an Argentine car license plate
// Dark metallic body + blue top stripe + monospace font

interface Props {
  plate: string;
  size?: "sm" | "md";
}

export function PlateVisual({ plate, size = "md" }: Props) {
  const isSmall = size === "sm";
  return (
    <div
      className="relative flex-shrink-0 rounded-lg overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #1e2536 0%, #131720 100%)",
        border:     "1.5px solid #374151",
        boxShadow:  "inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -1px 0 rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.5)",
        minWidth:   isSmall ? "60px" : "68px",
      }}
    >
      {/* Argentine plate top stripe */}
      <div
        style={{
          height:     isSmall ? "2.5px" : "3px",
          background: "linear-gradient(90deg, #1D4ED8 0%, #60A5FA 100%)",
        }}
      />
      <div className={`flex items-center justify-center ${isSmall ? "px-1.5 py-1" : "px-2 py-1.5"}`}>
        <span
          className="font-mono font-black text-white tracking-[0.1em] leading-none select-none"
          style={{ fontSize: isSmall ? "11px" : "13px" }}
        >
          {plate}
        </span>
      </div>
    </div>
  );
}
