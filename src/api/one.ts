import type {
  DependencyEdge,
  DirectoryListing,
  EvaluationResult,
  HealthReport,
  ProblemDetails,
  SchemaMetadata,
  SearchResult,
  TraceResult,
} from "../types/one";

export class OneApiError extends Error {
  problem: ProblemDetails;

  constructor(problem: ProblemDetails) {
    super(problem.detail || problem.title);
    this.problem = problem;
  }
}

const normaliseBase = (registryUrl: string): string =>
  registryUrl.replace(/\/+$/, "");

const request = async <T>(
  registryUrl: string,
  path: string,
  init?: RequestInit
): Promise<T> => {
  const response = await fetch(`${normaliseBase(registryUrl)}${path}`, init);
  if (!response.ok) {
    const problem = (await response
      .json()
      .catch(() => null)) as ProblemDetails | null;
    if (problem) throw new OneApiError(problem);
    throw new Error(`Request failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
};

export const listDirectory = (
  registryUrl: string,
  path = ""
): Promise<DirectoryListing> =>
  request(registryUrl, `/self/v1/api/list${path ? `/${path}` : ""}`);

export const searchSchemas = (
  registryUrl: string,
  query: string
): Promise<SearchResult[]> =>
  request(
    registryUrl,
    `/self/v1/api/schemas/search?q=${encodeURIComponent(query)}`
  );

export const getSchemaMetadata = (
  registryUrl: string,
  schemaPath: string
): Promise<SchemaMetadata> =>
  request(registryUrl, `/self/v1/api/schemas/metadata${schemaPath}`);

export const getSchemaContent = async (
  registryUrl: string,
  schemaPath: string
): Promise<string> => {
  const response = await fetch(`${normaliseBase(registryUrl)}${schemaPath}.json`);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  const json = await response.json();
  return JSON.stringify(json, null, 2);
};

export const getSchemaDependencies = (
  registryUrl: string,
  schemaPath: string
): Promise<DependencyEdge[]> =>
  request(registryUrl, `/self/v1/api/schemas/dependencies${schemaPath}`);

export const getSchemaDependents = (
  registryUrl: string,
  schemaPath: string
): Promise<DependencyEdge[]> =>
  request(registryUrl, `/self/v1/api/schemas/dependents${schemaPath}`);

export const getSchemaHealthReport = (
  registryUrl: string,
  schemaPath: string
): Promise<HealthReport> =>
  request(registryUrl, `/self/v1/api/schemas/health${schemaPath}`);

export const evaluateSchema = (
  registryUrl: string,
  schemaPath: string,
  instance: string
): Promise<EvaluationResult> =>
  request(registryUrl, `/self/v1/api/schemas/evaluate${schemaPath}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: instance,
  });

export const traceSchema = (
  registryUrl: string,
  schemaPath: string,
  instance: string
): Promise<TraceResult> =>
  request(registryUrl, `/self/v1/api/schemas/trace${schemaPath}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: instance,
  });
