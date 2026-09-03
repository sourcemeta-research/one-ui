import type { TraceResult, TraceStep, TraceStepType } from "../types/one";

type RawStep = {
  type: TraceStepType;
  name: string;
  evaluatePath: string;
  instanceLocation: string;
  keywordLocation: string;
  vocabulary: string | null;
  annotation: unknown;
  message: string | null;
};

export const traceCustom = async (
  serverUrl: string,
  schemaText: string,
  instanceText: string
): Promise<TraceResult> => {
  const response = await fetch(`${serverUrl.replace(/\/+$/, "")}/trace`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ schema: schemaText, instance: instanceText }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  const steps: TraceStep[] = (data.steps as RawStep[]).map((step) => ({
    type: step.type,
    name: step.name,
    evaluatePath: step.evaluatePath,
    instanceLocation: step.instanceLocation,
    keywordLocation: step.keywordLocation,
    vocabulary: step.vocabulary ?? "",
    annotation: step.annotation ?? null,
    message: step.message,
    instancePositions: [],
  }));

  return { valid: data.valid as boolean, steps };
};
