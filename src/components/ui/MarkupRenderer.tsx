import React, { ReactNode, useCallback, useMemo } from "react";
import '@/pages/command/discord.css';
import type { ShowDialogFn } from "@/lib/dialog";
import { Button } from './button';
import { ButtonInfoCmd, ButtonInfoHref } from "../../lib/internaltypes";
import { ThemedChart } from "../../pages/graphs/SimpleChart";
import { Link } from "react-router-dom";
import { commandButtonAction } from "@/components/cmd/useCommandExecution";
import {
    canRenderPlainTextContent,
    createMarkupRenderContext,
    hasDiscernableMarkupContent,
    planDiscordMessage,
    planEmbedFields,
    planMarkupContent,
    type DiscordEmbed,
    type Field,
    type PlannedEmbedField,
    type PlannedMarkupContent,
} from "./markupRenderPlan";

export type { DiscordEmbed } from "./markupRenderPlan";

function renderMarkupPlan(plan: PlannedMarkupContent): ReactNode {
    switch (plan.kind) {
        case "empty":
            return null;
        case "text":
            return plan.text;
        case "html":
            return <span dangerouslySetInnerHTML={{ __html: plan.html }} />;
        default:
            return null;
    }
}

export function canRenderPlainText(content: string): boolean {
    return canRenderPlainTextContent(content);
}

export function hasDiscernableMarkup(content: string): boolean {
    return hasDiscernableMarkupContent(content);
}

function timestamp(stringISO?: string): string {
    const date = stringISO ? new Date(stringISO) : new Date(),
        dateArray = date.toLocaleString('en-US', { hour: 'numeric', hour12: false, minute: 'numeric' }),
        today = new Date(),
        yesterday = new Date(new Date().setDate(today.getDate() - 1)),
        tommorrow = new Date(new Date().setDate(today.getDate() + 1));

    return today.toDateString() === date.toDateString() ? `Today at ${dateArray}` :
        yesterday.toDateString() === date.toDateString() ? `Yesterday at ${dateArray}` :
            tommorrow.toDateString() === date.toDateString() ? `Tomorrow at ${dateArray}` :
                `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}/${date.getFullYear()}`;
}

export function CmdButton({ button, responseRef, showDialog }:
    {
        button: ButtonInfoCmd,
        responseRef: React.RefObject<HTMLDivElement | null>,
        showDialog: ShowDialogFn
    }): ReactNode {

    const submit = useCallback(() => {
        commandButtonAction({ name: button.label, command: button.cmd, responseRef: responseRef, showDialog: showDialog })
    }, [button, responseRef, showDialog]);

    return (
        <Button variant="outline" size="sm" className="me-1" data-label={button.label}
            onClick={submit}>
            {button.label}
        </Button>
    );
}

export function HrefButton({ button }: { button: ButtonInfoHref }): ReactNode {
    return (
        <Button variant="outline" size="sm" asChild data-label={button.label}>
            <Link to={button.href}>{button.label}</Link>
        </Button>
    );
}

export function Embed({ json, responseRef, showDialog }:
    {
        json: DiscordEmbed,
        responseRef: React.RefObject<HTMLDivElement | null>,
        showDialog: ShowDialogFn
    }) {
    const renderPlan = useMemo(() => planDiscordMessage(json, showDialog), [json, showDialog]);
    const contentClassName = renderPlan.content.kind === "html" ? "markup messageContent" : "messageContent";
    const images = [];
    if (json.images) {
        for (const key in json.images) {
            const image: number[] = json.images[key];
            const uint8Array = new Uint8Array(image);
            const blob = new Blob([uint8Array], { type: 'image/png' });
            const url = URL.createObjectURL(blob);
            images.push({
                title: key,
                image: {
                    url: url
                }
            });
        }
    }

    const onClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        const key = (e.currentTarget.dataset.key)!;
        const file: string = json.files![key];
        const blob = new Blob([file], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a') as HTMLAnchorElement;
        a.href = url;
        a.download = key;
        a.click();
    }, [json.files]);

    const displayJsonFile = useCallback((key: string) => {
        return (
            <div key={key} className="m-0.5 file-item flex items-center p-2 border-background/50 border-2 rounded-sm bg-accent max-w-96">
                <span className="file-name grow text-foreground-light dark:text-foreground-dark">{key}</span>
                <Button variant="outline" size="sm" data-key={key} onClick={onClick}>Download</Button>
            </div>
        );
    }, [onClick]);

    return (
        <div className="msgEmbed font-mono" id={json.id}>
            <div className={contentClassName}>{renderMarkupPlan(renderPlan.content)}</div>
            {renderPlan.embeds.map((plannedEmbed) => {
                const embed = plannedEmbed.source;

                return (
                <div key={plannedEmbed.key}>
                    <div className="embed markup bg-accent mb-0.5">
                        <div className="embedGrid" style={{ borderColor: embed.color ? `#${embed.color.toString(16).padStart(6, "0")}` : 'transparent' }}>
                            {embed.author && (
                                <div className="embedAuthor embedMargin">
                                    {embed.author.icon_url && <img className="embedAuthorIcon embedAuthorLink" src={embed.author.icon_url} alt="Author Icon" />}
                                    {embed.author.url ? (
                                        <a className="embedAuthorNameLink embedLink embedAuthorName" href={embed.author.url} target="_blank" rel="noopener noreferrer">
                                            {embed.author.name}
                                        </a>
                                    ) : (
                                        <span className="embedAuthorName">{embed.author.name}</span>
                                    )}
                                </div>
                            )}
                            {embed.title && (
                                <div className="embedTitle embedMargin">
                                    {embed.url ? (
                                        <a className="anchor" target="_blank" href={embed.url} rel="noopener noreferrer">
                                            {renderMarkupPlan(plannedEmbed.title)}
                                        </a>
                                    ) : (
                                        renderMarkupPlan(plannedEmbed.title)
                                    )}
                                </div>
                            )}
                            {embed.description && <div className="embedDescription embedMargin">{renderMarkupPlan(plannedEmbed.description)}</div>}
                            {plannedEmbed.fields.length > 0 && (
                                <EmbedFields plannedFields={plannedEmbed.fields} />
                            )}
                            {embed.image && (
                                <div className="imageWrapper clickable embedMedia embedImage">
                                    <img className="img embedImageLink" src={embed.image.url} alt="Embed Image" />
                                </div>
                            )}
                            {embed.thumbnail && (
                                <div className="imageWrapper clickable embedThumbnail">
                                    <img className="img embedThumbnailLink" src={embed.thumbnail.url} alt="Embed Thumbnail" />
                                </div>
                            )}
                            {embed.footer && (
                                <div className="embedFooter embedMargin">
                                    {embed.footer.icon_url && <img className="embedFooterIcon embedFooterLink" src={embed.footer.icon_url} alt="Footer Icon" />}
                                    <span className="embedFooterText">
                                        {embed.footer.text}
                                        {embed.timestamp && <span className="embedFooterSeparator">•</span>}
                                        {embed.timestamp && timestamp(embed.timestamp)}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )})}
            {json.buttons && Object.keys(json.buttons).length > 0 && <div className="bg-accent rounded-sm border mb-1 p-2">
                Actions:
                {json.buttons.map((button, index) => {
                    if ((button as ButtonInfoCmd).cmd) {
                        return <CmdButton key={index} button={button as ButtonInfoCmd} responseRef={responseRef} showDialog={showDialog} />;
                    }
                    return <HrefButton key={index} button={button as ButtonInfoHref} />;
                })}
            </div>}
            {images.map((image, index) => (
                <img key={index} className="max-w-full max-h-64 rounded-sm border-2 border-background m-0.5" src={image.image.url} alt={image.title} />
            ))}
            {(json.files ?? {}) && Object.keys(json.files ?? {}).map(displayJsonFile)}
            {json.tables && json.tables.map((data, index) => (
                <ThemedChart key={index} graph={data} classes="max-w-(--breakpoint-sm)" />
            ))}
            <div className="emptyTxt"></div>
        </div>
    );
}

const MarkupRenderer = React.memo(function MarkupRenderer({ content, embed, showDialog }: { content: string, embed?: DiscordEmbed, showDialog?: ShowDialogFn }): ReactNode {
    const context = useMemo(() => createMarkupRenderContext({ embed, showDialog }), [embed, showDialog]);
    const plan = useMemo(() => planMarkupContent(content, context), [content, context]);
    return renderMarkupPlan(plan);
});

MarkupRenderer.displayName = "MarkupRenderer";

export default MarkupRenderer;

export function EmbedFields({
    fields,
    plannedFields,
    embed,
    showDialog,
}: {
    fields?: Field[];
    plannedFields?: PlannedEmbedField[];
    embed?: DiscordEmbed;
    showDialog?: ShowDialogFn;
}): ReactNode {
    const context = useMemo(() => createMarkupRenderContext({ embed, showDialog }), [embed, showDialog]);
    const resolvedFields = useMemo(
        () => plannedFields ?? planEmbedFields(fields, context),
        [plannedFields, fields, context],
    );

    const createEmbedFields = () => {
        let colNum = 1;
        let num = 0;
        let index: number | undefined;
        let gridCol: string | undefined;

        return resolvedFields.map((field, i) => {
            const sourceField = fields?.[i];
            if (field.name.kind === "empty" || field.value.kind === "empty" || (sourceField && (!sourceField.name || !sourceField.value))) {
                return null;
            }

            if (resolvedFields[i].inline && resolvedFields[i + 1]?.inline &&
                ((i === 0 && resolvedFields[i + 2] && !resolvedFields[i + 2].inline) || (
                    i > 0 && !resolvedFields[i - 1].inline ||
                    i >= 3 && resolvedFields[i - 1].inline && resolvedFields[i - 2].inline && resolvedFields[i - 3].inline && (resolvedFields[i - 4] ? !resolvedFields[i - 4].inline : !resolvedFields[i - 4])
                ) && (i === resolvedFields.length - 2 || !resolvedFields[i + 2].inline)) || i % 3 === 0 && i === resolvedFields.length - 2) {
                index = i;
                gridCol = '1 / 7';
            }

            if (index === i - 1) gridCol = '7 / 13';

            const fieldElement = (
                <div
                    key={field.key}
                    className={`embedField ${num}${gridCol ? ' colNum-2' : ''}`}
                    style={{ gridColumn: gridCol || `${colNum} / ${colNum + 4}` }}
                >
                    <div className="embedFieldName">
                        {renderMarkupPlan(field.name)}
                    </div>
                    <div className="embedFieldValue">
                        {renderMarkupPlan(field.value)}
                    </div>
                </div>
            );

            if (index !== i) gridCol = undefined;

            colNum = (colNum === 9 ? 1 : colNum + 4);
            num++;

            return fieldElement;
        });
    };

    return (
        <div className="embedFields" style={{ display: 'grid' }}>
            {createEmbedFields()}
        </div>
    );
}