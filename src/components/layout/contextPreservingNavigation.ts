import { createPath, parsePath, type Path, type To } from "react-router-dom";

export const RETURN_TO_PARAM = "returnTo";

export type SearchParamInput = string | readonly string[] | null | undefined;

export interface BuildContextPreservedToOptions {
  to: To;
  currentSearch: string;
  preserveSearchParams?: readonly string[];
  additionalSearchParams?: Record<string, SearchParamInput>;
  requireGuild?: boolean;
  hasGuild?: boolean;
  guildSelectPath?: string;
  returnToParam?: string;
}

function isExternalTo(to: To): boolean {
  if (typeof to !== "string") {
    return false;
  }

  return /^[a-z][a-z\d+.-]*:/i.test(to) || to.startsWith("//");
}

function normalizePath(path: Partial<Path>): Partial<Path> {
  if (!path.pathname) {
    return path;
  }

  if (path.pathname.startsWith("/")) {
    return path;
  }

  return {
    ...path,
    pathname: `/${path.pathname.replace(/^\/+/, "")}`,
  };
}

function appendValues(searchParams: URLSearchParams, key: string, value: SearchParamInput): void {
  if (value == null) {
    searchParams.delete(key);
    return;
  }

  const values = Array.isArray(value) ? value : [value];
  const filteredValues = values.map((entry) => String(entry).trim()).filter(Boolean);
  searchParams.delete(key);
  filteredValues.forEach((entry) => searchParams.append(key, entry));
}

export function buildContextPreservedTo({
  to,
  currentSearch,
  preserveSearchParams = [],
  additionalSearchParams,
  requireGuild = false,
  hasGuild = false,
  guildSelectPath = "/guild_select",
  returnToParam = RETURN_TO_PARAM,
}: BuildContextPreservedToOptions): To {
  if (isExternalTo(to)) {
    return to;
  }

  const normalizedTarget = normalizePath(typeof to === "string" ? parsePath(to) : { ...to });
  const mergedSearchParams = new URLSearchParams(normalizedTarget.search ?? "");
  const currentSearchParams = new URLSearchParams(currentSearch);

  preserveSearchParams.forEach((key) => {
    if (mergedSearchParams.has(key)) {
      return;
    }

    currentSearchParams.getAll(key).forEach((value) => mergedSearchParams.append(key, value));
  });

  Object.entries(additionalSearchParams ?? {}).forEach(([key, value]) => {
    appendValues(mergedSearchParams, key, value);
  });

  const nextPath: Partial<Path> = {
    ...normalizedTarget,
    search: mergedSearchParams.size > 0 ? `?${mergedSearchParams.toString()}` : "",
  };

  if (requireGuild && !hasGuild) {
    const returnTo = createPath(nextPath);
    const guildSelectSearchParams = new URLSearchParams();
    guildSelectSearchParams.set(returnToParam, returnTo);
    return {
      pathname: guildSelectPath,
      search: `?${guildSelectSearchParams.toString()}`,
    } satisfies Partial<Path>;
  }

  return nextPath satisfies Partial<Path>;
}

export function getSafeReturnTo(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return null;
  }

  if (/^[a-z][a-z\d+.-]*:/i.test(value)) {
    return null;
  }

  return value;
}
