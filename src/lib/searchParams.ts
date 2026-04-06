export type SearchParamStringRecord = Record<string, string | undefined>;

export type SearchParamStringSpec<T extends SearchParamStringRecord> = {
  [K in keyof T]-?: {
    key?: string;
    aliases?: readonly string[];
    defaultValue?: T[K];
    omitWhen?: (value: string) => boolean;
  };
};

function trimSearchParamValue(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function readTrimmedSearchParam(searchParams: URLSearchParams, ...keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const value = trimSearchParamValue(searchParams.get(key));
    if (value) {
      return value;
    }
  }

  return undefined;
}

export function parseSearchParamStringRecord<T extends SearchParamStringRecord>(
  searchParams: URLSearchParams,
  spec: SearchParamStringSpec<T>,
): T {
  const entries = Object.entries(spec).flatMap(([fieldName, fieldSpec]) => {
    const key = fieldSpec.key ?? fieldName;
    const value = readTrimmedSearchParam(searchParams, key, ...(fieldSpec.aliases ?? [])) ?? fieldSpec.defaultValue;
    return value ? [[fieldName, value]] : [];
  });

  return Object.fromEntries(entries) as T;
}

export function writeSearchParamStringRecord<T extends SearchParamStringRecord>(
  searchParams: URLSearchParams,
  values: T,
  spec: SearchParamStringSpec<T>,
): URLSearchParams {
  const next = new URLSearchParams(searchParams);

  for (const [fieldName, fieldSpec] of Object.entries(spec)) {
    const key = fieldSpec.key ?? fieldName;
    const aliases = fieldSpec.aliases ?? [];
    const value = trimSearchParamValue(values[fieldName]);
    const shouldOmit = !value || fieldSpec.omitWhen?.(value) === true;

    if (shouldOmit) {
      next.delete(key);
    } else {
      next.set(key, value);
    }

    for (const alias of aliases) {
      next.delete(alias);
    }
  }

  return next;
}
