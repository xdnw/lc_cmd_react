import type { QueryClient } from "@tanstack/react-query";

import type { WebError, WebOptions } from "@/lib/apitypes";
import { INPUT_OPTIONS } from "@/lib/endpoints";
import { bulkQueryOptions } from "@/lib/queries";
import type { TypeBreakdown } from "@/utils/Command";

import { resolveArgInput } from "./argInputMetadata";
import type { ExpressionValueSourceRef } from "./expression/expressionSchema";
import { getPlaceholderExpressionDescriptor } from "./expression/expressionTypes";
import { ensureQueryOptionDatasetFromPayload } from "./queryOptionWorkerClient";
import { ASYNC_QUERY_OPTION_THRESHOLD, getQueryOptionCount } from "./queryOptionUtils";

type WarmQueryTarget = {
  type: string;
  warmWorkerDataset: boolean;
};

function mergeWarmTargets(targets: WarmQueryTarget[]): WarmQueryTarget[] {
  const merged = new Map<string, WarmQueryTarget>();

  for (const target of targets) {
    const existing = merged.get(target.type);
    if (existing) {
      existing.warmWorkerDataset = existing.warmWorkerDataset || target.warmWorkerDataset;
      continue;
    }
    merged.set(target.type, { ...target });
  }

  return Array.from(merged.values());
}

function collectTargetsFromSource(source: ExpressionValueSourceRef, targets: WarmQueryTarget[]): void {
  switch (source.kind) {
    case "query-options":
      targets.push({ type: source.typeKey, warmWorkerDataset: true });
      return;

    case "composite-query-options":
      source.composite.forEach((type) => {
        targets.push({ type, warmWorkerDataset: true });
      });
      return;

    case "map-key-options":
      collectTargetsFromSource(source.keySource, targets);
      return;

    default:
      return;
  }
}

export function collectArgInputWarmQueryTargets(breakdown: TypeBreakdown): WarmQueryTarget[] {
  const resolution = resolveArgInput(breakdown);
  const targets: WarmQueryTarget[] = [];

  if (resolution.kind === "query") {
    targets.push({ type: resolution.optionData.queryTypeKey, warmWorkerDataset: true });
  }

  if (resolution.kind === "composite-query") {
    resolution.optionData.composite.forEach((type) => {
      targets.push({ type, warmWorkerDataset: true });
    });
  }

  if (resolution.kind === "placeholder-expression") {
    const descriptor = getPlaceholderExpressionDescriptor(breakdown);
    descriptor?.rootValueSources.forEach((source) => collectTargetsFromSource(source, targets));
  }

  return mergeWarmTargets(targets);
}

export async function prefetchArgInputData(queryClient: QueryClient, breakdown: TypeBreakdown): Promise<void> {
  const targets = collectArgInputWarmQueryTargets(breakdown);
  if (targets.length === 0) {
    return;
  }

  await Promise.allSettled(targets.map(async (target) => {
    const queryOptions = bulkQueryOptions<WebOptions | WebError>(
      INPUT_OPTIONS.endpoint,
      { type: target.type },
      false,
    );

    await queryClient.prefetchQuery(queryOptions);

    if (!target.warmWorkerDataset) {
      return;
    }

    const cachedResult = queryClient.getQueryData(queryOptions.queryKey) as { data?: WebOptions | WebError | null } | undefined;
    const payload = cachedResult?.data;
    if (!payload || getQueryOptionCount(payload) < ASYNC_QUERY_OPTION_THRESHOLD) {
      return;
    }

    await ensureQueryOptionDatasetFromPayload(`query:${target.type}`, target.type, payload);
  }));
}
