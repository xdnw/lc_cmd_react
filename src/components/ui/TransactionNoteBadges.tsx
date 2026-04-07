import { memo, useCallback, useMemo } from "react";

import { useDialog } from "@/components/layout/DialogContext";
import { parseTransactionNote, type ParsedTransactionNote, type TransactionNoteInput } from "@/lib/transactionNotes";
import { cn } from "@/lib/utils";

import Badge from "./badge";
import { Button } from "./button";

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

function isParsedTransactionNote(note: ParsedTransactionNote | TransactionNoteInput): note is ParsedTransactionNote {
  return typeof note === "object" && note !== null && "raw" in note && "badges" in note;
}

export const TransactionNoteBadges = memo(function TransactionNoteBadges({
  note,
  nationLookup,
  className,
  maxVisibleBadges,
}: {
  note: ParsedTransactionNote | TransactionNoteInput;
  nationLookup?: TransactionNoteNationLookup;
  className?: string;
  maxVisibleBadges?: number;
}) {
  const { showDialog } = useDialog();
  const parsedNote = useMemo(
    () => (isParsedTransactionNote(note) ? note : parseTransactionNote(note, { compact: true })),
    [note],
  );

  if (parsedNote.badges.length === 0) {
    return <span className={cn("text-xs text-muted-foreground", className)}>-</span>;
  }

  const visibleBadges = typeof maxVisibleBadges === "number"
    ? parsedNote.badges.slice(0, maxVisibleBadges)
    : parsedNote.badges;
  const hiddenCount = Math.max(0, parsedNote.badges.length - visibleBadges.length);

  const openOverflowDialog = useCallback(() => {
    showDialog(
      "Transaction note",
      <TransactionNoteBadges note={parsedNote} nationLookup={nationLookup} className="gap-1.5" />,
      {
        openInNewTab: true,
        focusNewTab: true,
        replaceActive: false,
      },
    );
  }, [nationLookup, parsedNote, showDialog]);

  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {visibleBadges.map((badge, index) => {
        const resolvedNation = typeof badge.nationId === "number" ? nationLookup?.[badge.nationId] : undefined;
        const valueText = resolvedNation?.label ?? badge.value;
        const linkUrl = resolvedNation?.url;
        const hideLabel = badge.key === "banker" && Boolean(valueText);
        const badgeLabel = hideLabel ? valueText ?? badge.label : badge.label;
        const badgeValue = hideLabel ? null : valueText;
        return (
          <Badge
            key={`${badge.key}-${badge.rawValue ?? ""}-${index}`}
            variant="outline"
            className={cn("max-w-full border px-1.5 py-0 text-[10px] leading-4", getToneClassName(badge.tone))}
          >
            <span className="truncate" title={badge.title}>
              {badgeLabel}
              {badgeValue ? ":" : null}
            </span>
            {badgeValue ? (
              linkUrl ? (
                <a
                  href={linkUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="max-w-48 truncate underline-offset-2 hover:underline"
                  title={badge.title}
                >
                  {badgeValue}
                </a>
              ) : (
                <span className="max-w-48 truncate" title={badge.title}>{badgeValue}</span>
              )
            ) : null}
          </Badge>
        );
      })}
      {hiddenCount > 0 ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-4 rounded-sm border-dashed px-1.5 py-0 text-[10px] leading-4"
          onClick={openOverflowDialog}
        >
          +{hiddenCount}
        </Button>
      ) : null}
    </div>
  );
});
