import { useContext } from "react";
import Editor from "@monaco-editor/react";
import { AppContext } from "../contexts/AppContext";
import MetadataTable from "./MetadataTable";
import DetailPanel from "./DetailPanel";
import { defineMonacoTheme, ONE_UI_MONACO_THEME } from "../utils/monacoTheme";
import IdleState from "./IdleState";

const InstanceEditor = () => {
  const {
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
    resultLoading,
  } = useContext(AppContext);

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
        </div>
      </div>

      <MetadataTable />

      <div className="flex border-b border-[var(--border)]">
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
      </div>

      <div className="h-72 shrink-0 border-b border-[var(--border)]">
        {activeTab === "schema" ? (
          schemaContentLoading ? (
            <p className="text-sm text-[var(--text-secondary)] p-3">
              Loading schema…
            </p>
          ) : schemaContentError ? (
            <p className="text-sm text-[var(--danger)] p-3">
              {schemaContentError}
            </p>
          ) : (
            <Editor
              language="json"
              theme={ONE_UI_MONACO_THEME}
              beforeMount={defineMonacoTheme}
              value={schemaContent ?? ""}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                fontSize: 13,
                scrollBeyondLastLine: false,
                stickyScroll: { enabled: false },
              }}
            />
          )
        ) : (
          <Editor
            language="json"
            theme="one-ui-dark"
            value={instanceText}
            onChange={(value) => setInstanceText(value ?? "")}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
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
