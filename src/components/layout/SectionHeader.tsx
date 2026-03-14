import type { ReactNode } from "react";

import type { AppSectionHeaderTab } from "@/appRoutes";
import ContextPreservingLink from "@/components/layout/ContextPreservingLink";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function HeaderTabButton({ tab }: { tab: AppSectionHeaderTab }) {
  return (
    <Button asChild size="sm" variant={tab.active ? "default" : "ghost"}>
      <ContextPreservingLink
        to={tab.to}
        requireGuild={tab.requireGuild}
        preserveSearchParams={tab.preserveSearchParams}
        additionalSearchParams={tab.additionalSearchParams}
        aria-current={tab.active ? "page" : undefined}
      >
        {tab.label}
      </ContextPreservingLink>
    </Button>
  );
}

function renderTitle(title: ReactNode): ReactNode {
  if (typeof title === "string") {
    return <h1 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">{title}</h1>;
  }

  return title;
}

function renderSummary(summary: ReactNode): ReactNode {
  if (typeof summary === "string") {
    return <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{summary}</p>;
  }

  return summary;
}

export interface SectionHeaderProps {
  tabs?: readonly AppSectionHeaderTab[];
  sticky?: boolean;
  title?: ReactNode;
  summary?: ReactNode;
  actions?: ReactNode;
  content?: ReactNode;
  className?: string;
}

export default function SectionHeader({
  tabs = [],
  sticky = false,
  title,
  summary,
  actions,
  content,
  className,
}: SectionHeaderProps) {
  const visibleTabs = tabs.length > 1 ? tabs : [];
  const hasSummaryBlock = Boolean(title || summary || actions);
  const hasContent = Boolean(content);

  if (!visibleTabs.length && !hasSummaryBlock && !hasContent) {
    return null;
  }

  return (
    <header
      className={cn(
        "rounded-xl border border-border/70 bg-card/90 px-3 py-3 shadow-sm backdrop-blur supports-backdrop-filter:bg-card/75",
        sticky ? "sticky top-2 z-20" : undefined,
        className,
      )}
    >
      {visibleTabs.length ? (
        <div className="overflow-x-auto pb-1">
          <nav aria-label="Section routes" className="flex w-max min-w-full flex-nowrap items-center gap-1">
            {visibleTabs.map((tab) => (
              <HeaderTabButton key={tab.key} tab={tab} />
            ))}
          </nav>
        </div>
      ) : null}

      {hasSummaryBlock || hasContent ? (
        <div className={cn("space-y-3", visibleTabs.length ? "pt-3" : undefined)}>
          {hasSummaryBlock ? (
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 space-y-1">
                {title ? renderTitle(title) : null}
                {summary ? renderSummary(summary) : null}
              </div>
              {actions ? <div className="min-w-0 shrink-0 lg:max-w-[55%]">{actions}</div> : null}
            </div>
          ) : null}

          {hasContent ? <div className="min-w-0">{content}</div> : null}
        </div>
      ) : null}
    </header>
  );
}
