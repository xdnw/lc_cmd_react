import { Button } from "@/components/ui/button";
import LazyExpander from "@/components/ui/LazyExpander";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type RowActionsHeaderAction = {
    key: string;
    label: string;
    onClick?: () => void;
    disabled?: boolean;
    variant?: "default" | "outline" | "destructive" | "secondary" | "ghost" | "link";
    className?: string;
};

type RowActionsFooterAction = {
    key: string;
    label?: string;
    onClick?: () => void;
    disabled?: boolean;
    variant?: "default" | "outline" | "destructive" | "secondary" | "ghost" | "link";
    className?: string;
    content?: ReactNode;
};

export type RowActionsDetailField = {
    key: string;
    label: string;
    value: ReactNode;
    expandable?: boolean;
    editLabel?: string;
    onEdit?: () => void;
    canEdit?: boolean;
};

function DetailFieldRow({
    field,
}: {
    field: RowActionsDetailField;
}) {
    return (
        <div className="rounded border border-border px-2 py-1">
            <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground min-w-20">{field.label}</span>
                <div className="text-sm min-w-0 flex-1 overflow-hidden">
                    {field.expandable && typeof field.value === "string" ? (
                        <LazyExpander
                            className="h-7! py-0!"
                            hideTriggerChildrenWhenExpanded
                            content={<div className="whitespace-pre-wrap wrap-break-word">{field.value || "-"}</div>}
                        >
                            <span className="block truncate w-full text-left">{field.value || "-"}</span>
                        </LazyExpander>
                    ) : (
                        <div className="whitespace-pre-wrap wrap-break-word">{field.value || "-"}</div>
                    )}
                </div>
                {field.onEdit && (
                    <Button variant="outline" size="sm" onClick={field.onEdit} disabled={field.canEdit === false}>
                        {field.editLabel ?? "Edit"}
                    </Button>
                )}
            </div>
        </div>
    );
}

export default function RowActionsDetailDialog({
    headerActions,
    fields,
    footerActions,
    extraSections,
    className,
}: {
    headerActions?: readonly RowActionsHeaderAction[];
    fields: readonly RowActionsDetailField[];
    footerActions?: readonly RowActionsFooterAction[];
    extraSections?: readonly ReactNode[];
    className?: string;
}) {
    return (
        <div className={cn("space-y-3 pr-1", className)}>
            {headerActions && headerActions.length > 0 && (
                <div className="flex items-start justify-end gap-2">
                    {headerActions.map((action) => (
                        <Button
                            key={action.key}
                            variant={action.variant ?? "outline"}
                            size="sm"
                            onClick={action.onClick}
                            disabled={action.disabled}
                            className={cn("shrink-0", action.className)}
                        >
                            {action.label}
                        </Button>
                    ))}
                </div>
            )}

            <div className="grid grid-cols-1 gap-1">
                {fields.map((field) => (
                    <DetailFieldRow key={field.key} field={field} />
                ))}
            </div>

            {footerActions && footerActions.length > 0 && (
                <div className="flex flex-wrap gap-1">
                    {footerActions.map((action) => (
                        action.content ? (
                            <div key={action.key} className={cn("mb-1", action.className)}>{action.content}</div>
                        ) : (
                            <Button
                                key={action.key}
                                variant={action.variant ?? "outline"}
                                size="sm"
                                onClick={action.onClick}
                                disabled={action.disabled}
                                className={cn("mr-1 mb-1", action.className)}
                            >
                                {action.label}
                            </Button>
                        )
                    ))}
                </div>
            )}

            {extraSections?.map((section, index) => (
                <div key={index}>{section}</div>
            ))}
        </div>
    );
}