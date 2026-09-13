import { useContext, useEffect, useState } from "react";
import Editor from "@monaco-editor/react";
import { AppContext } from "../contexts/AppContext";
import MetadataTable from "./MetadataTable";
import DetailPanel from "./DetailPanel";
import { defineMonacoTheme, ONE_UI_EDITOR_FONT_OPTIONS, ONE_UI_MONACO_THEME } from "../utils/monacoTheme";
import IdleState from "./IdleState";
import { getSchemaContent } from "../api/one";

const InstanceEditor = () => {
  const {
    registryUrl,
    selectedSchemaPath,
    schemaMetadata,
    metadataLoading,
    metadataError,
    activeTab,
    setActiveTab,
    schemaContent,
    schemaContentLoading,
    schemaContentError,
    instanceText,
    setInstanceText,
    runEvaluate,
    runTrace,
    runRdf,
    resultLoading,
  } = useContext(AppContext);

  // Bundled view is fetched separately from the plain schemaContent used
  // elsewhere (e.g. the Trace Debugger's highlighting, which relies on
  // /positions being computed against the unbundled text) so toggling it
  // here can't desync anything else that reads schemaContent.
  const [bundled, setBundled] = useState(false);
  const [bundledContent, setBundledContent] = useState<string | null>(null);
  const [bundledLoading, setBundledLoading] = useState(false);
  const [bundledError, setBundledError] = useState<string | null>(null);

  useEffect(() => {
    setBundled(false);
    setBundledContent(null);
    setBundledError(null);
  }, [selectedSchemaPath]);

  useEffect(() => {
    if (!bundled || !selectedSchemaPath) return;
    let cancelled = false;
    setBundledLoading(true);
    setBundledError(null);
    getSchemaContent(registryUrl, selectedSchemaPath, { bundle: true })
      .then((content) => {
        if (!cancelled) setBundledContent(content);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setBundledError(error instanceof Error ? error.message : String(error));
        }
      })
      .finally(() => {
        if (!cancelled) setBundledLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [bundled, registryUrl, selectedSchemaPath]);

  if (!selectedSchemaPath) {
    return <IdleState />;
  }

  return (
    <div className="flex flex-col h-full flex-1 min-w-0 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] shadow-[var(--shadow-sm)] overflow-y-auto">
      <div className="flex items-start justify-between gap-2 px-3 py-2.5 border-b border-[var(--border)] sticky top-0 z-10 bg-[var(--bg-surface)]">
        <div className="min-w-0 flex flex-col gap-0.5">
          {metadataLoading ? (
            <span className="text-sm text-[var(--text-secondary)]">
              Loading…
            </span>
          ) : metadataError ? (
            <span className="text-sm text-[var(--danger)]">
              {metadataError}
            </span>
          ) : (
            <span className="text-sm font-medium text-[var(--text)] truncate">
              {schemaMetadata?.title || selectedSchemaPath}
            </span>
          )}
          {schemaMetadata?.description && (
            <p className="text-xs text-[var(--text-secondary)] truncate max-w-xl">
              {schemaMetadata.description}
            </p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={runEvaluate}
            disabled={resultLoading}
            className="h-8 px-3 text-sm rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--bg-inset)] text-[var(--text)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Evaluate
          </button>
          <button
            onClick={runTrace}
            disabled={resultLoading}
            className="h-8 px-3 text-sm rounded-[var(--radius-sm)] border border-[var(--accent)]/50 bg-[var(--accent)]/12 text-[var(--accent)] hover:bg-[var(--accent)]/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Trace
          </button>
          <button
            onClick={runRdf}
            disabled={resultLoading}
            className="h-8 px-3 text-sm rounded-[var(--radius-sm)] border border-[var(--info)]/50 bg-[var(--info)]/12 text-[var(--info)] hover:bg-[var(--info)]/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            RDF
          </button>
        </div>
      </div>

      <MetadataTable />

      <div className="flex items-center border-b border-[var(--border)]">
        <button
          onClick={() => setActiveTab("schema")}
          className={`px-3 py-1.5 text-xs border-r border-[var(--border)] ${
            activeTab === "schema"
              ? "text-[var(--text)] bg-[var(--bg-inset)]"
              : "text-[var(--text-secondary)] hover:text-[var(--text)]"
          }`}
        >
          Schema
        </button>
        <button
          onClick={() => setActiveTab("instance")}
          className={`px-3 py-1.5 text-xs border-r border-[var(--border)] ${
            activeTab === "instance"
              ? "text-[var(--text)] bg-[var(--bg-inset)]"
              : "text-[var(--text-secondary)] hover:text-[var(--text)]"
          }`}
        >
          Instance
        </button>
        {activeTab === "schema" && (
          <label
            title="Show the schema with $ref keywords inlined via JSON Schema Bundling"
            className="ml-auto mr-2 flex items-center gap-1.5 text-xs text-[var(--text-secondary)] cursor-pointer select-none"
          >
            <input
              type="checkbox"
              checked={bundled}
              onChange={(e) => setBundled(e.target.checked)}
              className="accent-[var(--accent)]"
            />
            Bundled
          </label>
        )}
      </div>

      <div className="h-72 shrink-0 border-b border-[var(--border)]">
        {activeTab === "schema" && bundled && bundledLoading ? (
          <p className="text-sm text-[var(--text-secondary)] p-3">
            Bundling schema…
          </p>
        ) : activeTab === "schema" && bundled && bundledError ? (
          <p className="text-sm text-[var(--danger)] p-3">{bundledError}</p>
        ) : activeTab === "schema" && schemaContentLoading ? (
          <p className="text-sm text-[var(--text-secondary)] p-3">
            Loading schema…
          </p>
        ) : activeTab === "schema" && schemaContentError ? (
          <p className="text-sm text-[var(--danger)] p-3">
            {schemaContentError}
          </p>
        ) : (
          <Editor
            key={activeTab === "schema" && bundled ? "schema-bundled" : activeTab}
            language="json"
            theme={ONE_UI_MONACO_THEME}
            beforeMount={defineMonacoTheme}
            value={
              activeTab === "schema"
                ? bundled
                  ? bundledContent ?? ""
                  : schemaContent ?? ""
                : instanceText
            }
            onChange={
              activeTab === "instance"
                ? (value) => setInstanceText(value ?? "")
                : undefined
            }
            options={{
              ...ONE_UI_EDITOR_FONT_OPTIONS,
              readOnly: activeTab === "schema",
              minimap: { enabled: false },
              fontSize: 14,
              scrollBeyondLastLine: false,
              stickyScroll: { enabled: false },
            }}
          />
        )}
      </div>

      <DetailPanel />
    </div>
  );
};

export default InstanceEditor;
