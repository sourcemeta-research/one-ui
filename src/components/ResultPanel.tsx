import { useContext } from "react";
import { AppContext } from "../contexts/AppContext";
import type { TraceStep } from "../types/one";

const stepStyle: Record<TraceStep["type"], string> = {
  push: "text-[var(--text-secondary)] border-[var(--border)]",
  pass: "text-[var(--success)] border-[var(--success)]/40 bg-[var(--success-soft)]",
  fail: "text-[var(--danger)] border-[var(--danger)]/40 bg-[var(--danger-soft)]",
};

const badgeStyle: Record<TraceStep["type"], string> = {
  push: "text-[var(--text-secondary)] bg-[var(--bg-inset)] border-[var(--border-strong)]/60",
  pass: "text-[var(--success)] bg-[var(--success)]/15 border-[var(--success)]/40",
  fail: "text-[var(--danger)] bg-[var(--danger)]/15 border-[var(--danger)]/40",
};

const TraceStepRow = ({ step, index }: { step: TraceStep; index: number }) => (
  <div
    className={`text-xs border rounded-[var(--radius-sm)] px-2 py-1.5 ${stepStyle[step.type]}`}
  >
    <div className="flex items-center gap-2">
      <span
        className={`uppercase font-mono text-[10px] font-semibold tracking-wide px-1.5 py-0.5 rounded-full border shrink-0 ${badgeStyle[step.type]}`}
      >
        {step.type}
      </span>
      <span className="font-mono truncate">{step.name}</span>
      <span className="text-[10px] opacity-50 ml-auto shrink-0">
        #{index + 1}
      </span>
    </div>
    <div className="font-mono text-[11px] opacity-70 truncate mt-1">
      {step.evaluatePath}
    </div>
    {step.message && <div className="mt-0.5 break-words">{step.message}</div>}
  </div>
);

const ResultPanel = () => {
  const {
    resultMode,
    evaluationResult,
    traceResult,
    resultLoading,
    resultError,
  } = useContext(AppContext);

  return (
    <div className="w-96 shrink-0 flex flex-col h-full overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] shadow-[var(--shadow-sm)]">
      <div className="px-3 py-2.5 border-b border-[var(--border)] text-sm font-medium text-[var(--text)] sticky top-0 bg-[var(--bg-surface)]">
        Result
      </div>

      <div className="p-3 flex flex-col gap-2 overflow-y-auto">
        {resultLoading && (
          <p className="text-sm text-[var(--text-secondary)]">Running…</p>
        )}
        {resultError && (
          <p className="text-sm text-[var(--danger)]">{resultError}</p>
        )}

        {!resultLoading && !resultError && resultMode === null && (
          <p className="text-sm text-[var(--text-secondary)]">
            Click Evaluate or Trace to see a result here.
          </p>
        )}

        {!resultLoading && resultMode === "evaluate" && evaluationResult && (
          <>
            <p
              className={`text-sm font-medium ${
                evaluationResult.valid
                  ? "text-[var(--success)]"
                  : "text-[var(--danger)]"
              }`}
            >
              {evaluationResult.valid ? "✓ Valid" : "✗ Invalid"}
            </p>
            {evaluationResult.errors?.map((err, i) => (
              <div
                key={i}
                className="text-xs border border-[var(--danger)]/40 bg-[var(--danger-soft)] text-[var(--text)] rounded-[var(--radius-sm)] px-2 py-1.5"
              >
                <div className="font-mono text-[11px] opacity-70">
                  {err.instanceLocation || "/"}
                </div>
                <div className="mt-0.5 break-words">{err.error}</div>
              </div>
            ))}
          </>
        )}

        {!resultLoading && resultMode === "trace" && traceResult && (
          <>
            <p
              className={`text-sm font-medium ${
                traceResult.valid
                  ? "text-[var(--success)]"
                  : "text-[var(--danger)]"
              }`}
            >
              {traceResult.valid ? "✓ Valid" : "✗ Invalid"} ·{" "}
              {traceResult.steps.length} steps
            </p>
            {traceResult.steps.map((step, i) => (
              <TraceStepRow key={i} step={step} index={i} />
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default ResultPanel;
