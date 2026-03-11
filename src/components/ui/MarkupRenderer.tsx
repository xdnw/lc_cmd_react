import React, { ReactNode, useCallback } from "react";
import '@/pages/command/discord.css';
import { markup } from "../../lib/discord";
import type { ShowDialogFn } from "@/lib/dialog";
import { Button } from './button';
import { WebGraph } from "../../lib/apitypes";
import { ButtonInfoCmd, ButtonInfoHref } from "../../lib/internaltypes";
import { ThemedChart } from "../../pages/graphs/SimpleChart";
import { Link } from "react-router-dom";
import { commandButtonAction } from "../../pages/command";

type MarkupAnalysis = {
    isEmpty: boolean;
    shouldRenderMarkup: boolean;
};

const EMPTY_ANALYSIS: MarkupAnalysis = Object.freeze({
    isEmpty: true,
    shouldRenderMarkup: false,
});

const ANALYSIS_CACHE_LIMIT = 500;
const HTML_CACHE_LIMIT = 250;
const markupAnalysisCache = new Map<string, MarkupAnalysis>();
const markupHtmlCache = new Map<string, string>();
const embedMarkupHtmlCache = new WeakMap<DiscordEmbed, Map<string, string>>();

function setBoundedCache<K, V>(cache: Map<K, V>, key: K, value: V, limit: number): V {
    cache.set(key, value);
    if (cache.size > limit) {
        const firstKey = cache.keys().next().value;
        if (firstKey !== undefined) {
            cache.delete(firstKey);
        }
    }
    return value;
}

function hasMarkupControlChars(content: string): boolean {
    for (let index = 0; index < content.length; index++) {
        switch (content.charCodeAt(index)) {
            case 10: // \n
            case 42: // *
            case 60: // <
            case 62: // >
            case 91: // [
            case 93: // ]
            case 95: // _
            case 96: // `
            case 123: // {
            case 124: // |
            case 125: // }
            case 126: // ~
                return true;
            default:
                break;
        }
    }

    return false;
}

function hasUrlToken(content: string): boolean {
    return content.includes("http://")
        || content.includes("https://")
        || content.includes("HTTP://")
        || content.includes("HTTPS://");
}

function isEmojiWordCode(charCode: number): boolean {
    return (charCode >= 48 && charCode <= 57)
        || (charCode >= 65 && charCode <= 90)
        || (charCode >= 97 && charCode <= 122)
        || charCode === 95;
}

function hasEmojiToken(content: string): boolean {
    for (let index = 0; index < content.length - 2; index++) {
        if (content.charCodeAt(index) !== 58) {
            continue;
        }

        let cursor = index + 1;
        while (cursor < content.length && isEmojiWordCode(content.charCodeAt(cursor))) {
            cursor += 1;
        }

        if (cursor > index + 1 && cursor < content.length && content.charCodeAt(cursor) === 58) {
            return true;
        }
    }

    return false;
}

function isPlainTextContent(content: string): boolean {
    return !hasMarkupControlChars(content)
        && !hasUrlToken(content)
        && !hasEmojiToken(content);
}

function analyzeMarkupContent(content: string): MarkupAnalysis {
    if (!content) {
        return EMPTY_ANALYSIS;
    }

    const cached = markupAnalysisCache.get(content);
    if (cached) {
        return cached;
    }

    const isPlainText = isPlainTextContent(content);

    return setBoundedCache(markupAnalysisCache, content, {
        isEmpty: false,
        shouldRenderMarkup: !isPlainText,
    }, ANALYSIS_CACHE_LIMIT);
}

function renderMarkupHtml(content: string, embed?: DiscordEmbed, showDialog?: ShowDialogFn): string {
    if (!embed && !showDialog) {
        const cached = markupHtmlCache.get(content);
        if (cached !== undefined) {
            return cached;
        }

        return setBoundedCache(markupHtmlCache, content, markup({
            txt: content,
            replaceEmoji: true,
        }), HTML_CACHE_LIMIT);
    }

    if (embed && !showDialog) {
        let embedCache = embedMarkupHtmlCache.get(embed);
        if (!embedCache) {
            embedCache = new Map<string, string>();
            embedMarkupHtmlCache.set(embed, embedCache);
        }
        const cached = embedCache.get(content);
        if (cached !== undefined) {
            return cached;
        }

        return setBoundedCache(embedCache, content, markup({
            txt: content,
            replaceEmoji: true,
            embed,
        }), HTML_CACHE_LIMIT);
    }

    return markup({
        txt: content,
        replaceEmoji: true,
        embed,
        showDialog,
    });
}

function renderMarkupNode(content: string, embed?: DiscordEmbed, showDialog?: ShowDialogFn): ReactNode {
    const analysis = analyzeMarkupContent(content);

    if (analysis.isEmpty) {
        return null;
    }

    if (!analysis.shouldRenderMarkup) {
        return content;
    }

    return <span dangerouslySetInnerHTML={{ __html: renderMarkupHtml(content, embed, showDialog) }} />;
}

export function canRenderPlainText(content: string): boolean {
    const analysis = analyzeMarkupContent(content);
    return !analysis.isEmpty && !analysis.shouldRenderMarkup;
}

export function hasDiscernableMarkup(content: string): boolean {
    return analyzeMarkupContent(content).shouldRenderMarkup;
}

interface Author {
    name: string;
    url: string;
    icon_url: string;
}

interface Thumbnail {
    url: string;
}

interface Image {
    url: string;
}

interface Footer {
    text: string;
    icon_url: string;
}

interface Field {
    name: string;
    value: string;
    inline?: boolean;
}

interface Embed {
    title: string;
    description: string;
    color?: number;
    timestamp?: string;
    url?: string;
    author?: Author;
    thumbnail?: Thumbnail;
    image?: Image;
    footer?: Footer;
    fields?: Field[];
}

export interface DiscordEmbed {
    id: string;
    content: string;
    embeds?: Embed[];
    embed?: Embed;
    users?: { [key: string]: string };
    channels?: { [key: string]: string };
    roles?: { [key: string]: string };
    // bytes[] in java, whatever msgpack encodes that as
    files?: { [key: string]: string };
    images?: { [key: string]: number[] };
    tables?: WebGraph[];
    buttons?: (ButtonInfoHref | ButtonInfoCmd)[];
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
    const contentClassName = hasDiscernableMarkup(json.content) ? "markup messageContent" : "messageContent";
    const embeds = [];
    const images = [];
    if (json.embeds) {
        embeds.push(...json.embeds);
    }
    if (json.embed) {
        embeds.push(json.embed);
    }
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
            <div className={contentClassName}>{renderMarkupNode(json.content, json, showDialog)}</div>
            {embeds.map((embed, index) => (
                <div key={index}>
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
                                            {renderMarkupNode(embed.title, json, showDialog)}
                                        </a>
                                    ) : (
                                        renderMarkupNode(embed.title, json, showDialog)
                                    )}
                                </div>
                            )}
                            {embed.description && <div className="embedDescription embedMargin">{renderMarkupNode(embed.description, json, showDialog)}</div>}
                            {embed.fields && (
                                <EmbedFields fields={embed.fields} />
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
            ))}
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
    return renderMarkupNode(content, embed, showDialog);
});

MarkupRenderer.displayName = "MarkupRenderer";

export default MarkupRenderer;

export function EmbedFields({ fields }: { fields: Field[] }): ReactNode {
    const createEmbedFields = () => {
        let colNum = 1;
        let num = 0;
        let index: number | undefined;
        let gridCol: string | undefined;

        return fields.map((f, i) => {
            if (!f.name || !f.value) return null;

            if (fields[i].inline && fields[i + 1]?.inline &&
                ((i === 0 && fields[i + 2] && !fields[i + 2].inline) || (
                    i > 0 && !fields[i - 1].inline ||
                    i >= 3 && fields[i - 1].inline && fields[i - 2].inline && fields[i - 3].inline && (fields[i - 4] ? !fields[i - 4].inline : !fields[i - 4])
                ) && (i === fields.length - 2 || !fields[i + 2].inline)) || i % 3 === 0 && i === fields.length - 2) {
                index = i;
                gridCol = '1 / 7';
            }

            if (index === i - 1) gridCol = '7 / 13';

            const fieldElement = (
                <div
                    key={i}
                    className={`embedField ${num}${gridCol ? ' colNum-2' : ''}`}
                    style={{ gridColumn: gridCol || `${colNum} / ${colNum + 4}` }}
                >
                    <div className="embedFieldName">
                        {renderMarkupNode(f.name)}
                    </div>
                    <div className="embedFieldValue">
                        {renderMarkupNode(f.value)}
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