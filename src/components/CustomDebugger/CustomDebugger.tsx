import { useMemo, useRef, useState, useEffect } from "react";
import Editor, { type Monaco } from "@monaco-editor/react";
import type { editor as MonacoEditor } from "monaco-editor";
import { traceCustom } from "../../api/customTrace";
import type { TraceResult } from "../../types/one";
import { defineMonacoTheme, ONE_UI_MONACO_THEME } from "../../utils/monacoTheme";
import { getOpenFrames } from "../../utils/traceStack";
import { computeJsonPositions } from "../../utils/jsonPointerPositions";
import StackVisualizer from "../TraceDebugger/StackVisualizer";

const PLAY_INTERVAL_MS = 700;
const SERVER_URL_KEY = "one-ui.customDebuggerServerUrl";
const DEFAULT_SERVER_URL = "http://localhost:4545";

const DEFAULT_SCHEMA = `{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "age": { "type": "integer", "minimum": 0 }
  },
  "required": ["age"]
}`;

const DEFAULT_INSTANCE = `{
  "age": "thirty"
}`;

const toMonacoRange = (position: [number, number, number, number]) => ({
  startLineNumber: position[0] + 1,
  startColumn: position[1] + 1,
  endLineNumber: position[2] + 1,
  endColumn: position[3] + 1,
});

const humanize = (name: string) => name.replace(/([a-z0-9])([A-Z])/g, "$1 $2");

const highlightClass = (type: "push" | "pass" | "fail") =>
  type === "fail"
    ? "trace-highlight-fail"
    : type === "pass"
      ? "trace-highlight-pass"
      : "trace-highlight-push";

const keywordPointer = (keywordLocation: string): string => {
  const hashIndex = keywordLocation.indexOf("#");
  return hashIndex === -1 ? "" : keywordLocation.slice(hashIndex + 1) || "";
};

const CustomDebugger = ({ onClose }: { onClose: () => void }) => {
  const [serverUrl, setServerUrl] = useState(
    () => localStorage.getItem(SERVER_URL_KEY) ?? DEFAULT_SERVER_URL
  );
  const [schemaText, setSchemaText] = useState(DEFAULT_SCHEMA);
  const [instanceText, setInstanceText] = useState(DEFAULT_INSTANCE);
  const [traceResult, setTraceResult] = useState<TraceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [stepIndex, setStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [schemaHighlightNote, setSchemaHighlightNote] = useState<string | null>(null);

  const instanceEditorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const instanceDecorationsRef = useRef<MonacoEditor.IEditorDecorationsCollection | null>(null);
  const schemaEditorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const schemaDecorationsRef = useRef<MonacoEditor.IEditorDecorationsCollection | null>(null);

  const steps = useMemo(() => traceResult?.steps ?? [], [traceResult]);
  const currentStep = steps[stepIndex];
  const openFrames = useMemo(
    () => getOpenFrames(steps, stepIndex),
    [steps, stepIndex]
  );

  const schemaPositions = useMemo(() => {
    try {
      return computeJsonPositions(schemaText);
    } catch {
      return {};
    }
  }, [schemaText]);

  const instancePositions = useMemo(() => {
    try {
      return computeJsonPositions(instanceText);
    } catch {
      return {};
    }
  }, [instanceText]);

  const handleServerUrlChange = (url: string) => {
    setServerUrl(url);
    localStorage.setItem(SERVER_URL_KEY, url);
  };

  const runTrace = async () => {
    setLoading(true);
    setError(null);
    setStepIndex(0);
    setIsPlaying(false);
    try {
      const result = await traceCustom(serverUrl, schemaText, instanceText);
      setTraceResult(result);
    } catch (err) {
      setTraceResult(null);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isPlaying) return;
    if (stepIndex >= steps.length - 1) {
      setIsPlaying(false);
      return;
    }
    const timer = setTimeout(() => setStepIndex((i) => i + 1), PLAY_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [isPlaying, stepIndex, steps.length]);

  useEffect(() => {
    const editorInstance = instanceEditorRef.current;
    if (!editorInstance || !currentStep) return;

    const position = instancePositions[currentStep.instanceLocation];
    instanceDecorationsRef.current?.clear();
    if (!position) return;

    const range = toMonacoRange(position);
    instanceDecorationsRef.current = editorInstance.createDecorationsCollection([
      {
        range,
        options: {
          className: highlightClass(currentStep.type),
          isWholeLine: false,
          hoverMessage: currentStep.message ? { value: currentStep.message } : undefined,
        },
      },
    ]);
    editorInstance.revealRangeInCenterIfOutsideViewport(range);
  }, [currentStep, instancePositions]);

  useEffect(() => {
    const editorInstance = schemaEditorRef.current;
    if (!editorInstance || !currentStep) {
      setSchemaHighlightNote(null);
      return;
    }

    const pointer = keywordPointer(currentStep.keywordLocation);
    const position = schemaPositions[pointer];
    schemaDecorationsRef.current?.clear();

    if (!position) {
      setSchemaHighlightNote(
        "Could not locate this keyword in the schema text (it may come from an external $ref)."
      );
      return;
    }

    setSchemaHighlightNote(null);
    const range = toMonacoRange(position);
    schemaDecorationsRef.current = editorInstance.createDecorationsCollection([
      {
        range,
        options: {
          className: highlightClass(currentStep.type),
          isWholeLine: false,
          hoverMessage: currentStep.message ? { value: currentStep.message } : undefined,
        },
      },
    ]);
    editorInstance.revealRangeInCenterIfOutsideViewport(range);
  }, [currentStep, schemaPositions]);

  const beforeMount = (monaco: Monaco) => defineMonacoTheme(monaco);

  const describeStep = (step: NonNullable<typeof currentStep>): string => {
    if (step.message) return step.message;
    if (step.type === "push")
      return `Now checking rule "${humanize(step.name)}" at ${step.evaluatePath || "the root"}.`;
    if (step.type === "pass") return "This check passed.";
    return "This check failed.";
  };

  const next = () => setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  const prev = () => setStepIndex((i) => Math.max(i - 1, 0));
  const nextFailure = () => {
    const found = steps.findIndex((s, i) => i > stepIndex && s.type === "fail");
    if (found !== -1) setStepIndex(found);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--bg-canvas)] text-[var(--text)]">
      <style>{`
        .trace-highlight-pass { background: color-mix(in srgb, var(--success) 28%, transparent); border-bottom: 2px solid var(--success); }
        .trace-highlight-fail { background: color-mix(in srgb, var(--danger) 32%, transparent); border-bottom: 2px solid var(--danger); }
        .trace-highlight-push { background: color-mix(in srgb, var(--accent) 20%, transparent); border-bottom: 2px solid var(--accent); }
      `}</style>

      <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-[var(--border)] shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onClose}
            className="h-8 px-3 text-sm rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--bg-inset)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
          >
            ← Close
          </button>
          <span className="text-sm font-medium truncate">Custom Debugger</span>
          <span className="text-[10px] text-[var(--text-secondary)] hidden md:inline">
            Paste any schema + instance and step through the real Blaze evaluation
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <input
            value={serverUrl}
            onChange={(e) => handleServerUrlChange(e.target.value)}
            placeholder="http://localhost:4545"
            className="h-8 w-52 px-2 text-xs rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--bg-inset)] text-[var(--text)] font-mono focus:outline-none focus:border-[var(--accent)]"
          />
          <button
            onClick={runTrace}
            disabled={loading}
            className="h-8 px-3 text-sm rounded-[var(--radius-sm)] border border-[var(--accent)]/50 bg-[var(--accent)]/12 text-[var(--accent)] hover:bg-[var(--accent)]/20 transition-colors disabled:opacity-40"
          >
            {loading ? "Compiling…" : "Compile & Trace"}
          </button>
          {traceResult && (
            <span
              className={`text-xs font-mono px-2 py-1 rounded-full border ${
                traceResult.valid
                  ? "border-[var(--success)]/40 text-[var(--success)]"
                  : "border-[var(--danger)]/40 text-[var(--danger)]"
              }`}
            >
              {traceResult.valid ? "Valid" : "Invalid"} · {steps.length} steps
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="px-4 py-2 text-xs text-[var(--danger)] bg-[var(--danger-soft)] border-b border-[var(--danger)]/40">
          {error}. Make sure the local compile server is running:{" "}
          <span className="font-mono">npm run compile-server</span>
        </div>
      )}

      <div className="flex flex-1 min-h-0 gap-3 p-3">
        <div className="flex-1 min-w-0 flex flex-col rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden">
          <div className="px-3 py-1.5 text-xs text-[var(--text-secondary)] border-b border-[var(--border)] flex items-center justify-between gap-2">
            <span>Schema (editable)</span>
            {schemaHighlightNote && (
              <span className="text-[10px] text-[var(--accent)] truncate">
                {schemaHighlightNote}
              </span>
            )}
          </div>
          <div className="flex-1 min-h-0">
            <Editor
              language="json"
              theme={ONE_UI_MONACO_THEME}
              beforeMount={beforeMount}
              value={schemaText}
              onChange={(value) => setSchemaText(value ?? "")}
              onMount={(editorInstance) => (schemaEditorRef.current = editorInstance)}
              options={{ minimap: { enabled: false }, fontSize: 12.5, stickyScroll: { enabled: false } }}
            />
          </div>
        </div>

        <div className="flex-1 min-w-0 flex flex-col rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden">
          <div className="px-3 py-1.5 text-xs text-[var(--text-secondary)] border-b border-[var(--border)]">
            Instance (editable)
          </div>
          <div className="flex-1 min-h-0">
            <Editor
              language="json"
              theme={ONE_UI_MONACO_THEME}
              beforeMount={beforeMount}
              value={instanceText}
              onChange={(value) => setInstanceText(value ?? "")}
              onMount={(editorInstance) => (instanceEditorRef.current = editorInstance)}
              options={{ minimap: { enabled: false }, fontSize: 12.5, stickyScroll: { enabled: false } }}
            />
          </div>
        </div>

        <div className="w-80 shrink-0 flex flex-col rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden">
          <div className="px-3 py-1.5 border-b border-[var(--border)]">
            <div className="text-xs text-[var(--text-secondary)]">Call Stack</div>
            <div className="text-[10px] text-[var(--text-secondary)] opacity-70 mt-0.5">
              Rules currently being checked, deepest on top
            </div>
            <div className="flex items-center gap-3 mt-1.5 text-[10px]">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[var(--border-strong)] inline-block" />
                checking
              </span>
              <span className="flex items-center gap-1 text-[var(--success)]">
                <span className="w-2 h-2 rounded-full bg-[var(--success)] inline-block" />
                passed
              </span>
              <span className="flex items-center gap-1 text-[var(--danger)]">
                <span className="w-2 h-2 rounded-full bg-[var(--danger)] inline-block" />
                failed
              </span>
            </div>
          </div>
          {traceResult ? (
            <StackVisualizer frames={openFrames} />
          ) : (
            <div className="flex-1 flex items-center justify-center p-4 text-center text-xs text-[var(--text-secondary)]">
              Click "Compile & Trace" to run the real Blaze evaluator on your pasted schema and instance.
            </div>
          )}
        </div>
      </div>

      {traceResult && (
        <div className="shrink-0 border-t border-[var(--border)] px-4 py-3 flex flex-col gap-3">
          {currentStep && (
            <div
              className={`rounded-[var(--radius-sm)] border px-3 py-2.5 flex items-start gap-3 ${
                currentStep.type === "fail"
                  ? "border-[var(--danger)]/40 bg-[var(--danger-soft)]"
                  : currentStep.type === "pass"
                    ? "border-[var(--success)]/40 bg-[var(--success-soft)]"
                    : "border-[var(--accent)]/40 bg-[var(--accent)]/10"
              }`}
            >
              <span
                className={`text-lg leading-none shrink-0 ${
                  currentStep.type === "fail"
                    ? "text-[var(--danger)]"
                    : currentStep.type === "pass"
                      ? "text-[var(--success)]"
                      : "text-[var(--accent)]"
                }`}
              >
                {currentStep.type === "fail" ? "✗" : currentStep.type === "pass" ? "✓" : "▶"}
              </span>
              <div className="min-w-0">
                <div className="text-sm font-medium">
                  {humanize(currentStep.name)}{" "}
                  <span className="text-[var(--text-secondary)] font-mono text-xs">
                    {currentStep.evaluatePath || "/"}
                  </span>
                </div>
                <div className="text-sm text-[var(--text-secondary)] mt-0.5">
                  {describeStep(currentStep)}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={prev}
              disabled={stepIndex === 0}
              className="h-8 px-3 text-sm rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--bg-inset)] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ◀ Step Back
            </button>
            <button
              onClick={() => setIsPlaying((p) => !p)}
              className="h-8 px-3 text-sm rounded-[var(--radius-sm)] border border-[var(--accent)]/50 bg-[var(--accent)]/12 text-[var(--accent)]"
            >
              {isPlaying ? "Pause" : "Play"}
            </button>
            <button
              onClick={next}
              disabled={stepIndex >= steps.length - 1}
              className="h-8 px-3 text-sm rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--bg-inset)] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Step Forward ▶
            </button>
            <button
              onClick={nextFailure}
              className="h-8 px-3 text-sm rounded-[var(--radius-sm)] border border-[var(--danger)]/40 bg-[var(--danger-soft)] text-[var(--danger)]"
            >
              Next Failure ⏭
            </button>

            <input
              type="range"
              min={0}
              max={Math.max(steps.length - 1, 0)}
              value={stepIndex}
              onChange={(e) => setStepIndex(Number(e.target.value))}
              className="flex-1 accent-[var(--accent)]"
            />
            <span className="text-xs font-mono text-[var(--text-secondary)] w-16 text-right">
              {stepIndex + 1} / {steps.length}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomDebugger;
