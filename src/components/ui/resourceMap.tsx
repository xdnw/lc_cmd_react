import { useCallback, useMemo, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { useDialog } from "@/components/layout/DialogContext";
import type { JSONValue } from "@/lib/internaltypes";
import { cn } from "@/lib/utils";
import type { ObjectColumnRender, RenderContext } from "@/pages/custom_table/DataTable";

type ResourceMapRecord = Record<string, number>;

type ResourceMapFormatOptions = {
  resourceKeys?: readonly string[];
};

type CopyableResourceMapRendererOptions = {
  getButtonLabel?: (value: JSONValue, context?: RenderContext) => ReactNode;
  getCopySource?: (value: JSONValue, context?: RenderContext) => JSONValue | null | undefined;
  getTitle?: (copyText: string, value: JSONValue, context?: RenderContext) => string | undefined;
  getResourceKeys?: (value: JSONValue, context?: RenderContext) => readonly string[] | undefined;
  className?: string;
  emptyLabel?: ReactNode;
};

function parseResourceAmount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const parsed = Number(value.trim().replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseResourceMap(value: JSONValue | null | undefined, options: ResourceMapFormatOptions = {}): ResourceMapRecord {
  const record: ResourceMapRecord = {};

  const addEntry = (resourceKey: string, resourceValue: unknown) => {
    const normalizedKey = resourceKey.trim().toLowerCase();
    const parsedValue = parseResourceAmount(resourceValue);
    if (!normalizedKey || parsedValue === null || parsedValue === 0) {
      return;
    }

    record[normalizedKey] = parsedValue;
  };

  if (value && typeof value === "object" && !Array.isArray(value)) {
    Object.entries(value).forEach(([resourceKey, resourceValue]) => {
      addEntry(resourceKey, resourceValue);
    });
    return record;
  }

  if (Array.isArray(value)) {
    value.forEach((resourceValue, index) => {
      const resourceKey = options.resourceKeys?.[index];
      if (!resourceKey) {
        return;
      }

      addEntry(resourceKey, resourceValue);
    });
    return record;
  }

  if (typeof value !== "string") {
    return record;
  }

  const trimmed = value.trim().replace(/^\{/, "").replace(/\}$/, "");
  if (!trimmed) {
    return record;
  }

  trimmed.split(",").forEach((entry) => {
    const separatorIndex = entry.indexOf("=");
    if (separatorIndex < 0) {
      return;
    }

    addEntry(entry.slice(0, separatorIndex), entry.slice(separatorIndex + 1));
  });

  return record;
}

export function formatResourceMapText(value: JSONValue | null | undefined, options: ResourceMapFormatOptions = {}): string {
  const entries = Object.entries(parseResourceMap(value, options));
  if (entries.length === 0) {
    return "{}";
  }

  return `{${entries.map(([resource, amount]) => `${resource}=${amount}`).join(",")}}`;
}

export function ResourceMapText({
  value,
  className,
  resourceKeys,
}: {
  value: JSONValue | null | undefined;
  className?: string;
  resourceKeys?: readonly string[];
}) {
  const text = useMemo(() => formatResourceMapText(value, { resourceKeys }), [resourceKeys, value]);

  return (
    <span className={cn("block overflow-hidden text-ellipsis whitespace-nowrap font-mono", className)} title={text}>
      {text}
    </span>
  );
}

export function ResourceMapCopyButton({
  value,
  label,
  title,
  className,
  emptyLabel = "-",
  resourceKeys,
}: {
  value: JSONValue | null | undefined;
  label?: ReactNode;
  title?: string;
  className?: string;
  emptyLabel?: ReactNode;
  resourceKeys?: readonly string[];
}) {
  const { showDialog } = useDialog();
  const copyText = useMemo(() => formatResourceMapText(value, { resourceKeys }), [resourceKeys, value]);

  const handleCopy = useCallback(() => {
    if (copyText === "{}") {
      return;
    }

    if (typeof navigator === "undefined" || typeof navigator.clipboard?.writeText !== "function") {
      showDialog("Copy Failed", "Clipboard access is unavailable in this browser context.");
      return;
    }

    void navigator.clipboard.writeText(copyText).then(() => {
      showDialog(
        "Copied to Clipboard",
        <>
          The resource map <kbd className="rounded bg-secondary px-0.5">{copyText}</kbd> has been copied to your clipboard.
        </>,
      );
    }).catch((error) => {
      showDialog(
        "Copy Failed",
        <>
          Failed to copy <kbd className="rounded bg-secondary px-0.5">{copyText}</kbd> to clipboard:<br />
          {String(error)}
        </>,
      );
    });
  }, [copyText, showDialog]);

  if (copyText === "{}") {
    return <span className="text-muted-foreground">{emptyLabel}</span>;
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn("max-w-full justify-start overflow-hidden", className)}
      onClick={handleCopy}
      title={title ?? `${copyText}\nClick to copy the raw resource map.`}
    >
      {label ?? <ResourceMapText value={value} resourceKeys={resourceKeys} />}
    </Button>
  );
}

export function createCopyableResourceMapRenderer(options: CopyableResourceMapRendererOptions = {}): ObjectColumnRender {
  return {
    display: (value, context) => {
      const copySource = options.getCopySource?.(value, context) ?? value;
      const resourceKeys = options.getResourceKeys?.(copySource, context);
      const label = options.getButtonLabel?.(value, context) ?? <ResourceMapText value={copySource} resourceKeys={resourceKeys} />;
      const title = options.getTitle?.(formatResourceMapText(copySource, { resourceKeys }), value, context);
      return (
        <ResourceMapCopyButton
          value={copySource}
          label={label}
          title={title}
          className={options.className}
          emptyLabel={options.emptyLabel}
          resourceKeys={resourceKeys}
        />
      );
    },
  };
}
