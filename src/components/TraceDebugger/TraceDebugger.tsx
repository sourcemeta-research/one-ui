import { useContext, useEffect, useMemo, useRef, useState } from "react";
import Editor, { type Monaco } from "@monaco-editor/react";
import type { editor as MonacoEditor } from "monaco-editor";
import { AppContext } from "../../contexts/AppContext";
import { getSchemaPositions } from "../../api/one";
import type { SchemaPositions } from "../../types/one";
import { defineMonacoTheme, ONE_UI_MONACO_THEME } from "../../utils/monacoTheme";
import { getOpenFrames } from "../../utils/traceStack";
import StackVisualizer from "./StackVisualizer";

const PLAY_INTERVAL_MS = 700;

const splitKeywordLocation = (keywordLocation: string): { resource: string; pointer: string } => {
  const hashIndex = keywordLocation.indexOf("#");
  if (hashIndex === -1) return { resource: keywordLocation, pointer: "" };
  return {
    resource: keywordLocation.slice(0, hashIndex),
    pointer: keywordLocation.slice(hashIndex + 1) || "",
  };
};

const toMonacoRange = (position: [number, number, number, number]) => ({
  startLineNumber: position[0] + 1,
  startColumn: position[1] + 1,
  endLineNumber: position[2] + 1,
  endColumn: position[3] + 1,
});

const TraceDebugger = () => {
  const {
    registryUrl,
    selectedSchemaPath,
    schemaMetadata,
    schemaContent,
    instanceText,
    traceResult,
    closeDebugger,
  } = useContext(AppContext);

  const [stepIndex, setStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [schemaPositions, setSchemaPositions] = useState<SchemaPositions | null>(null);

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

  useEffect(() => {
    if (!selectedSchemaPath) {
      setSchemaPositions(null);
      return;
    }
    let cancelled = false;
    getSchemaPositions(registryUrl, selectedSchemaPath)
      .then((positions) => {
        if (!cancelled) setSchemaPositions(positions);
      })
      .catch(() => {
        if (!cancelled) setSchemaPositions(null);
      });
    return () => {
      cancelled = true;
    };
  }, [registryUrl, selectedSchemaPath]);

  useEffect(() => {
    if (!isPlaying) return;
    if (stepIndex >= steps.length - 1) {
      setIsPlaying(false);
      return;
    }
    const timer = setTimeout(() => setStepIndex((i) => i + 1), PLAY_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [isPlaying, stepIndex, steps.length]);

  const [schemaHighlightNote, setSchemaHighlightNote] = useState<string | null>(null);

  useEffect(() => {
    const editorInstance = instanceEditorRef.current;
    if (!editorInstance || !currentStep) return;

    const range = toMonacoRange(
      currentStep.instancePositions as [number, number, number, number]
    );
    const className =
      currentStep.type === "fail"
        ? "trace-highlight-fail"
        : currentStep.type === "pass"
          ? "trace-highlight-pass"
          : "trace-highlight-push";

    instanceDecorationsRef.current?.clear();
    instanceDecorationsRef.current = editorInstance.createDecorationsCollection([
      {
        range,
        options: {
          className,
          isWholeLine: false,
          hoverMessage: currentStep.message ? { value: currentStep.message } : undefined,
        },
      },
    ]);
    editorInstance.revealRangeInCenterIfOutsideViewport(range);
  }, [currentStep]);

  useEffect(() => {
    const editorInstance = schemaEditorRef.current;
    if (!editorInstance || !currentStep || !schemaPositions || !schemaMetadata) {
      setSchemaHighlightNote(null);
      return;
    }

    const { resource, pointer } = splitKeywordLocation(currentStep.keywordLocation);
    const belongsToCurrentSchema = resource === schemaMetadata.identifier;
    const position = belongsToCurrentSchema ? schemaPositions[pointer] : undefined;

    schemaDecorationsRef.current?.clear();

    if (!position) {
      setSchemaHighlightNote(
        belongsToCurrentSchema
          ? null
          : `This keyword comes from a referenced schema: ${resource}`
      );
      return;
    }

    setSchemaHighlightNote(null);
    const range = toMonacoRange(position);
    const className =
      currentStep.type === "fail"
        ? "trace-highlight-fail"
        : currentStep.type === "pass"
          ? "trace-highlight-pass"
          : "trace-highlight-push";

    schemaDecorationsRef.current = editorInstance.createDecorationsCollection([
      {
        range,
        options: {
          className,
          isWholeLine: false,
          hoverMessage: currentStep.message ? { value: currentStep.message } : undefined,
        },
      },
    ]);
    editorInstance.revealRangeInCenterIfOutsideViewport(range);
  }, [currentStep, schemaPositions, schemaMetadata]);

  const handleInstanceMount = (editorInstance: MonacoEditor.IStandaloneCodeEditor) => {
    instanceEditorRef.current = editorInstance;
  };

  const handleSchemaMount = (editorInstance: MonacoEditor.IStandaloneCodeEditor) => {
    schemaEditorRef.current = editorInstance;
  };

  const beforeMount = (monaco: Monaco) => defineMonacoTheme(monaco);

  const humanize = (name: string) => name.replace(/([a-z0-9])([A-Z])/g, "$1 $2");

  const describeStep = (step: (typeof steps)[number]): string => {
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

  if (!traceResult) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--bg-canvas)] text-[var(--text)]">
      <style>{`
        .trace-highlight-pass { background: color-mix(in srgb, var(--success) 28%, transparent); border-bottom: 2px solid var(--success); }
        .trace-highlight-fail { background: color-mix(in srgb, var(--danger) 32%, transparent); border-bottom: 2px solid var(--danger); }
        .trace-highlight-push { background: color-mix(in srgb, var(--accent) 20%, transparent); border-bottom: 2px solid var(--accent); }
      `}</style>

      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)] shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={closeDebugger}
            className="h-8 px-3 text-sm rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--bg-inset)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
          >
            ← Close
          </button>
          <span className="text-sm font-medium truncate">
            Trace Debugger — {selectedSchemaPath}
          </span>
        </div>
        <span
          className={`text-xs font-mono px-2 py-1 rounded-full border ${
            traceResult.valid
              ? "border-[var(--success)]/40 text-[var(--success)]"
              : "border-[var(--danger)]/40 text-[var(--danger)]"
          }`}
        >
          {traceResult.valid ? "Valid" : "Invalid"} · {steps.length} steps
        </span>
      </div>

      <div className="flex flex-1 min-h-0 gap-3 p-3">
        <div className="flex-1 min-w-0 flex flex-col rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden">
          <div className="px-3 py-1.5 text-xs text-[var(--text-secondary)] border-b border-[var(--border)] flex items-center justify-between gap-2">
            <span>Schema</span>
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
              value={schemaContent ?? ""}
              onMount={handleSchemaMount}
              options={{ readOnly: true, minimap: { enabled: false }, fontSize: 12.5, stickyScroll: { enabled: false } }}
            />
          </div>
        </div>

        <div className="flex-1 min-w-0 flex flex-col rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden">
          <div className="px-3 py-1.5 text-xs text-[var(--text-secondary)] border-b border-[var(--border)]">
            Instance
          </div>
          <div className="flex-1 min-h-0">
            <Editor
              language="json"
              theme={ONE_UI_MONACO_THEME}
              beforeMount={beforeMount}
              value={instanceText}
              onMount={handleInstanceMount}
              options={{ readOnly: true, minimap: { enabled: false }, fontSize: 12.5, stickyScroll: { enabled: false } }}
            />
          </div>
        </div>

        <div className="w-80 shrink-0 flex flex-col rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden">
          <div className="px-3 py-1.5 border-b border-[var(--border)]">
            <div className="text-xs text-[var(--text-secondary)]">
              Call Stack
            </div>
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
          <StackVisualizer frames={openFrames} />
        </div>
      </div>

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
    </div>
  );
};

export default TraceDebugger;
