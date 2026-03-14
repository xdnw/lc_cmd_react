/**
 * WARNING: HALLUCINATORY GARBAGE.
 * This file is AI-generated speculation and is not trustworthy.
 * Do not use it as source of truth, implementation guidance, planning input,
 * architectural guidance, or evidence that any described feature or substrate exists.
 * Keep it only as an idea scrap in case a small part is someday worth salvaging.
 */
import { useMemo, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";

import { usePageSidebar } from "@/components/layout/PageSidebarContext";
import Badge from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { buildPlanSidebarConfig } from "./navigation";

export interface PlanActionLink {
  label: string;
  to: string;
  variant?: "default" | "outline" | "secondary";
}

export interface PlanStat {
  label: string;
  value: string;
  tone?: "neutral" | "success" | "warning" | "danger";
}

export function usePlanSidebar() {
  const location = useLocation();
  const config = useMemo(() => buildPlanSidebarConfig(location.pathname), [location.pathname]);
  usePageSidebar(config);
}

export function PlanHero({
  eyebrow,
  title,
  description,
  stats,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  stats?: readonly PlanStat[];
  actions?: readonly PlanActionLink[];
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-border/70 bg-[linear-gradient(135deg,rgba(9,14,28,0.96),rgba(19,32,51,0.96)_45%,rgba(7,89,133,0.92))] text-slate-50 shadow-xs">
      <div className="grid gap-6 px-4 py-5 lg:grid-cols-[minmax(0,1.2fr),20rem] lg:px-5 lg:py-6">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-200">{eyebrow}</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-200">{description}</p>
          {actions && actions.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {actions.map((action) => (
                <Button key={action.to} asChild variant={action.variant ?? "outline"} size="sm">
                  <Link to={action.to}>{action.label}</Link>
                </Button>
              ))}
            </div>
          ) : null}
        </div>
        {stats && stats.length > 0 ? (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            {stats.map((stat) => (
              <div key={stat.label} className={cn("rounded-2xl border px-3 py-3", getStatToneClass(stat.tone))}>
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-current/75">{stat.label}</div>
                <div className="mt-2 text-lg font-semibold text-current">{stat.value}</div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function getStatToneClass(tone: PlanStat["tone"]): string {
  switch (tone) {
    case "success":
      return "border-emerald-400/30 bg-emerald-400/12 text-emerald-50";
    case "warning":
      return "border-amber-300/35 bg-amber-300/14 text-amber-50";
    case "danger":
      return "border-rose-400/35 bg-rose-400/14 text-rose-50";
    default:
      return "border-slate-300/20 bg-slate-100/10 text-slate-50";
  }
}

export function PlanPanel({
  title,
  description,
  aside,
  className,
  children,
}: {
  title: string;
  description?: string;
  aside?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Card className={cn("border-border/70 shadow-xs", className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-3 p-3 pb-2">
        <div>
          <CardTitle>{title}</CardTitle>
          {description ? <CardDescription className="mt-1 text-xs leading-5">{description}</CardDescription> : null}
        </div>
        {aside}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function PlanChipRow({ items }: { items: readonly string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <Badge key={item} variant="outline" className="rounded-full px-2.5 py-0.5 text-[11px] tracking-[0.08em]">
          {item}
        </Badge>
      ))}
    </div>
  );
}

export function PlanMiniList({ items }: { items: readonly string[] }) {
  return (
    <ul className="space-y-2 text-sm text-muted-foreground">
      {items.map((item) => (
        <li key={item} className="flex gap-2 leading-6">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" aria-hidden="true" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function PlanTable({
  headers,
  rows,
}: {
  headers: readonly string[];
  rows: readonly (readonly ReactNode[])[];
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/70">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-muted/55 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-3 py-2 font-semibold">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={`row-${rowIndex}`} className="border-t border-border/70 bg-card/70 align-top">
              {row.map((cell, cellIndex) => (
                <td key={`cell-${rowIndex}-${cellIndex}`} className="px-3 py-2.5 text-foreground/90">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PlanValuePair({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-muted/25 px-3 py-2.5">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

export function PlanActionList({
  actions,
}: {
  actions: readonly { label: string; detail: string; tone?: "default" | "success" | "warning" | "danger" }[];
}) {
  return (
    <div className="space-y-2">
      {actions.map((action) => (
        <div key={action.label} className={cn("rounded-2xl border px-3 py-3", getActionToneClass(action.tone))}>
          <div className="text-sm font-semibold">{action.label}</div>
          <div className="mt-1 text-xs leading-5 text-current/80">{action.detail}</div>
        </div>
      ))}
    </div>
  );
}

function getActionToneClass(tone: "default" | "success" | "warning" | "danger" | undefined): string {
  switch (tone) {
    case "success":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-100";
    case "warning":
      return "border-amber-500/25 bg-amber-500/12 text-amber-100";
    case "danger":
      return "border-rose-500/25 bg-rose-500/12 text-rose-100";
    default:
      return "border-border/70 bg-muted/25 text-foreground";
  }
}

export function PlanCanvas({
  label,
  description,
  height = "h-56",
}: {
  label: string;
  description: string;
  height?: string;
}) {
  return (
    <div className={cn("relative overflow-hidden rounded-2xl border border-dashed border-border/80 bg-[linear-gradient(180deg,rgba(15,23,42,0.08),rgba(15,23,42,0.03))]", height)}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.12),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(34,197,94,0.10),transparent_34%)]" aria-hidden="true" />
      <div className="relative flex h-full flex-col justify-end p-4">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
        <div className="mt-1 text-sm leading-6 text-foreground/85">{description}</div>
      </div>
    </div>
  );
}

export function PlanLinkedCards({
  title,
  links,
}: {
  title: string;
  links: readonly { label: string; to: string; detail: string }[];
}) {
  return (
    <PlanPanel title={title}>
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="rounded-2xl border border-border/70 bg-muted/25 px-3 py-3 transition-colors hover:border-border hover:bg-accent/45"
          >
            <div className="text-sm font-semibold text-foreground">{link.label}</div>
            <div className="mt-1 text-sm leading-6 text-muted-foreground">{link.detail}</div>
          </Link>
        ))}
      </div>
    </PlanPanel>
  );
}
