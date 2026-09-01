import type { OpenFrame } from "../../utils/traceStack";

const statusStyle: Record<OpenFrame["status"], string> = {
  push: "border-[var(--border-strong)] bg-[var(--bg-inset)] text-[var(--text)]",
  pass: "border-[var(--success)] bg-[var(--success-soft)] text-[var(--success)]",
  fail: "border-[var(--danger)] bg-[var(--danger-soft)] text-[var(--danger)]",
};

const StackVisualizer = ({ frames }: { frames: OpenFrame[] }) => (
  <div
    className="relative flex-1 min-h-0 flex flex-col-reverse items-center justify-start gap-0 py-8 overflow-hidden"
    style={{ perspective: "900px" }}
  >
    {frames.length === 0 && (
      <span className="text-xs text-[var(--text-secondary)]">
        Stack is empty — step forward to begin
      </span>
    )}
    {frames.map((frame, depth) => (
      <div
        key={frame.pushIndex}
        className={`w-[min(90%,26rem)] shrink-0 rounded-[var(--radius-sm)] border px-3 py-2 text-xs font-mono shadow-[var(--shadow-md)] transition-all duration-300 ease-out ${statusStyle[frame.status]}`}
        style={{
          transform: `translateZ(${-depth * 34}px) translateY(${-depth * 10}px) scale(${Math.max(1 - depth * 0.035, 0.7)})`,
          opacity: Math.max(1 - depth * 0.08, 0.35),
          marginTop: depth === 0 ? 0 : -28,
          zIndex: frames.length - depth,
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="uppercase text-[10px] tracking-wide opacity-70">
            {frame.status}
          </span>
          <span className="text-[10px] opacity-50">#{frame.pushIndex + 1}</span>
        </div>
        <div className="truncate font-semibold">{frame.name}</div>
        <div className="truncate opacity-70">{frame.evaluatePath}</div>
      </div>
    ))}
  </div>
);

export default StackVisualizer;
