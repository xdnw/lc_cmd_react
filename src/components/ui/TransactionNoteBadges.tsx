import { memo } from "react";

import type { ParsedTransactionNote } from "@/lib/transactionNotes";
import { cn } from "@/lib/utils";

import Badge from "./badge";

type TransactionNoteNationLookup = Record<number, { label: string; url?: string }>;

function getToneClassName(tone: ParsedTransactionNote["badges"][number]["tone"]): string {
  if (tone === "success") {
    return "border-emerald-500/30 bg-emerald-500/8 text-emerald-700 dark:text-emerald-300";
  }
  if (tone === "warning") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }
  if (tone === "info") {
    return "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300";
  }
  return "border-border/70 bg-muted/25 text-foreground/85";
}

export const TransactionNoteBadges = memo(function TransactionNoteBadges({
  note,
  nationLookup,
  className,
}: {
  note: ParsedTransactionNote;
  nationLookup?: TransactionNoteNationLookup;
  className?: string;
}) {
  if (note.badges.length === 0) {
    return <span className={cn("text-xs text-muted-foreground", className)}>-</span>;
  }

  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {note.badges.map((badge, index) => {
        const resolvedNation = typeof badge.nationId === "number" ? nationLookup?.[badge.nationId] : undefined;
        const valueText = resolvedNation?.label ?? badge.value;
        const linkUrl = resolvedNation?.url;
        return (
          <Badge
            key={`${badge.key}-${badge.rawValue ?? ""}-${index}`}
            variant="outline"
            className={cn("max-w-full border px-1.5 py-0 text-[10px] leading-4", getToneClassName(badge.tone))}
          >
            <span className="truncate" title={badge.title}>
              {badge.label}
            </span>
            {valueText ? <span className="text-[10px] opacity-70">:</span> : null}
            {valueText ? (
              linkUrl ? (
                <a
                  href={linkUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="max-w-48 truncate underline-offset-2 hover:underline"
                  title={badge.title}
                >
                  {valueText}
                </a>
              ) : (
                <span className="max-w-48 truncate" title={badge.title}>{valueText}</span>
              )
            ) : null}
          </Badge>
        );
      })}
    </div>
  );
});
