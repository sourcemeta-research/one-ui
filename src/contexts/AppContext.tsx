import { createContext } from "react";
import type {
  DependencyEdge,
  EvaluationResult,
  HealthReport,
  SchemaMetadata,
  TraceResult,
} from "../types/one";

export type ResultMode = "evaluate" | "trace";
export type EditorTab = "schema" | "instance";
export type DetailTab = "dependencies" | "dependents" | "lint";

type AppContextType = {
  registryUrl: string;
  setRegistryUrl: (url: string) => void;

  selectedSchemaPath: string | null;
  setSelectedSchemaPath: (path: string | null) => void;

  schemaMetadata: SchemaMetadata | null;
  metadataLoading: boolean;
  metadataError: string | null;

  activeTab: EditorTab;
  setActiveTab: (tab: EditorTab) => void;

  schemaContent: string | null;
  schemaContentLoading: boolean;
  schemaContentError: string | null;

  instanceText: string;
  setInstanceText: (text: string) => void;

  detailTab: DetailTab;
  setDetailTab: (tab: DetailTab) => void;
  dependencies: DependencyEdge[] | null;
  dependents: DependencyEdge[] | null;
  healthReport: HealthReport | null;
  detailLoading: boolean;

  resultMode: ResultMode | null;
  evaluationResult: EvaluationResult | null;
  traceResult: TraceResult | null;
  resultLoading: boolean;
  resultError: string | null;

  runEvaluate: () => void;
  runTrace: () => void;
};

export const AppContext = createContext<AppContextType>(
  {} as AppContextType
);
