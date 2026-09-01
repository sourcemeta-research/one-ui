import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  AppContext,
  type DetailTab,
  type EditorTab,
  type ResultMode,
} from "./AppContext";
import {
  evaluateSchema,
  getSchemaContent,
  getSchemaDependencies,
  getSchemaDependents,
  getSchemaHealthReport,
  getSchemaMetadata,
  traceSchema,
} from "../api/one";
import type {
  DependencyEdge,
  EvaluationResult,
  HealthReport,
  SchemaMetadata,
  TraceResult,
} from "../types/one";

const SESSION_REGISTRY_KEY = "one-ui.registryUrl";
const DEFAULT_REGISTRY_URL = "http://localhost:8000";

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [registryUrl, setRegistryUrlState] = useState(
    () => sessionStorage.getItem(SESSION_REGISTRY_KEY) ?? DEFAULT_REGISTRY_URL
  );

  const setRegistryUrl = useCallback((url: string) => {
    sessionStorage.setItem(SESSION_REGISTRY_KEY, url);
    setRegistryUrlState(url);
  }, []);

  const [selectedSchemaPath, setSelectedSchemaPath] = useState<string | null>(
    null
  );

  const [schemaMetadata, setSchemaMetadata] = useState<SchemaMetadata | null>(
    null
  );
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [metadataError, setMetadataError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<EditorTab>("schema");
  const [schemaContent, setSchemaContent] = useState<string | null>(null);
  const [schemaContentLoading, setSchemaContentLoading] = useState(false);
  const [schemaContentError, setSchemaContentError] = useState<string | null>(
    null
  );

  const [instanceText, setInstanceText] = useState("{}");

  const [detailTab, setDetailTab] = useState<DetailTab>("dependencies");
  const [dependencies, setDependencies] = useState<DependencyEdge[] | null>(
    null
  );
  const [dependents, setDependents] = useState<DependencyEdge[] | null>(null);
  const [healthReport, setHealthReport] = useState<HealthReport | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [resultMode, setResultMode] = useState<ResultMode | null>(null);
  const [evaluationResult, setEvaluationResult] =
    useState<EvaluationResult | null>(null);
  const [traceResult, setTraceResult] = useState<TraceResult | null>(null);
  const [resultLoading, setResultLoading] = useState(false);
  const [resultError, setResultError] = useState<string | null>(null);

  const [debuggerOpen, setDebuggerOpen] = useState(false);
  const openDebugger = useCallback(() => setDebuggerOpen(true), []);
  const closeDebugger = useCallback(() => setDebuggerOpen(false), []);

  useEffect(() => {
    if (!selectedSchemaPath) {
      setSchemaMetadata(null);
      setSchemaContent(null);
      return;
    }

    let cancelled = false;
    setMetadataLoading(true);
    setMetadataError(null);
    setEvaluationResult(null);
    setTraceResult(null);
    setResultMode(null);
    setActiveTab("schema");

    getSchemaMetadata(registryUrl, selectedSchemaPath)
      .then((metadata) => {
        if (cancelled) return;
        setSchemaMetadata(metadata);
        const firstExample = metadata.examples?.[0];
        setInstanceText(
          firstExample !== undefined
            ? JSON.stringify(firstExample, null, 2)
            : "{}"
        );
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setSchemaMetadata(null);
        setMetadataError(
          error instanceof Error ? error.message : String(error)
        );
      })
      .finally(() => {
        if (!cancelled) setMetadataLoading(false);
      });

    setSchemaContentLoading(true);
    setSchemaContentError(null);
    getSchemaContent(registryUrl, selectedSchemaPath)
      .then((content) => {
        if (!cancelled) setSchemaContent(content);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setSchemaContent(null);
        setSchemaContentError(
          error instanceof Error ? error.message : String(error)
        );
      })
      .finally(() => {
        if (!cancelled) setSchemaContentLoading(false);
      });

    setDetailLoading(true);
    setDependencies(null);
    setDependents(null);
    setHealthReport(null);
    Promise.all([
      getSchemaDependencies(registryUrl, selectedSchemaPath),
      getSchemaDependents(registryUrl, selectedSchemaPath),
      getSchemaHealthReport(registryUrl, selectedSchemaPath),
    ])
      .then(([deps, dependentsList, health]) => {
        if (cancelled) return;
        setDependencies(deps);
        setDependents(dependentsList);
        setHealthReport(health);
      })
      .catch(() => {
        if (!cancelled) {
          setDependencies([]);
          setDependents([]);
          setHealthReport(null);
        }
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [registryUrl, selectedSchemaPath]);

  const runEvaluate = useCallback(() => {
    if (!selectedSchemaPath) return;
    setResultLoading(true);
    setResultError(null);
    setResultMode("evaluate");
    evaluateSchema(registryUrl, selectedSchemaPath, instanceText)
      .then(setEvaluationResult)
      .catch((error: unknown) =>
        setResultError(error instanceof Error ? error.message : String(error))
      )
      .finally(() => setResultLoading(false));
  }, [registryUrl, selectedSchemaPath, instanceText]);

  const runTrace = useCallback(() => {
    if (!selectedSchemaPath) return;
    setResultLoading(true);
    setResultError(null);
    setResultMode("trace");
    traceSchema(registryUrl, selectedSchemaPath, instanceText)
      .then(setTraceResult)
      .catch((error: unknown) =>
        setResultError(error instanceof Error ? error.message : String(error))
      )
      .finally(() => setResultLoading(false));
  }, [registryUrl, selectedSchemaPath, instanceText]);

  const value = {
    registryUrl,
    setRegistryUrl,
    selectedSchemaPath,
    setSelectedSchemaPath,
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
    detailTab,
    setDetailTab,
    dependencies,
    dependents,
    healthReport,
    detailLoading,
    resultMode,
    evaluationResult,
    traceResult,
    resultLoading,
    resultError,
    runEvaluate,
    runTrace,
    debuggerOpen,
    openDebugger,
    closeDebugger,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
