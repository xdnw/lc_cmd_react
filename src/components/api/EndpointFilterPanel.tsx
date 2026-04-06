import { RotateCcw } from "lucide-react";
import type { ReactNode } from "react";

import { EndpointArgumentFields } from "@/components/api/apiform";
import { Button } from "@/components/ui/button";
import type { CommonEndpoint } from "@/lib/BulkQuery";

type EndpointArgRecord = { [key: string]: string | string[] | undefined };

export function EndpointFilterPanel<T, A extends EndpointArgRecord, B extends EndpointArgRecord>({
  endpoint,
  showArguments,
  draft,
  fieldKey,
  setDraftValue,
  onApply,
  onReset,
  isLoading,
  children,
}: {
  endpoint: CommonEndpoint<T, A, B>;
  showArguments: readonly (keyof A)[];
  draft: EndpointArgRecord;
  fieldKey?: string;
  setDraftValue: (name: string, value: string) => void;
  onApply: () => void;
  onReset: () => void;
  isLoading: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-background/80 px-3 py-3 shadow-sm">
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
        <div key={fieldKey} className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          <EndpointArgumentFields
            endpoint={endpoint}
            default_values={draft as B}
            showArguments={[...showArguments]}
            includeDefaultArguments
            setOutputValue={setDraftValue}
            compact
          />
        </div>
        <div className="flex flex-wrap items-end gap-1.5 xl:justify-end">
          <Button type="button" size="sm" onClick={onApply} disabled={isLoading}>
            Apply
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={onReset}>
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
        </div>
      </div>
      {children ? <div className="mt-2.5 flex flex-wrap items-start gap-2.5">{children}</div> : null}
    </div>
  );
}