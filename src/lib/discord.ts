import { DiscordEmbed } from "../components/ui/MarkupRenderer";
import { ReactNode } from "react";
import { getEmoji } from './emoji';

export interface HtmlOptions {
    escapeHTML: boolean;
    discordCallback: {
        user: (node: { id: string }) => string;
        channel: (node: { id: string }) => string;
        role: (node: { id: string }) => string;
        everyone: () => string;
        here: () => string;
        timestamp: (node: { timestamp: number; style: string }) => string;
        // You could also add other callbacks like `slash` if you plan to support them
        // slash?: (node: { name: string; id: string }) => string;
    };
}

type DiscordCallback = Partial<HtmlOptions["discordCallback"]> & {
    slash?: (name: string, id: string) => string;
};

export function createOptions({ embed, showDialog }:
    {
        embed: DiscordEmbed,
        showDialog?: (title: string, message: ReactNode, quote?: boolean) => void;
    }): HtmlOptions {
    // Will add later, but should include in interface
    // users?: { [key: string]: string };
    // channels?: { [key: string]: string };
    // roles?: { [key: string]: string };
    return {
        escapeHTML: true,
        discordCallback: {
            // user: (id: Number) User mentions "@someperson"
            user: (node: { id: string; }): string => {
                const user = embed.users && embed.users[node.id];
                if (user) {
                    return `<span class="mention user" data-id="${node.id}">${user}</span>`;
                }
                return `<span class="mention user" data-id="${node.id}">&lt;@${node.id}&gt;</span>`;
            },
            // channel: (id: Number) Channel mentions "#somechannel"
            channel: (node: { id: string; }): string => {
                const channel = embed.channels && embed.channels[node.id];
                if (channel) {
                    return `<span class="mention channel" data-id="${node.id}">${channel}</span>`;
                }
                return `<span class="mention channel" data-id="${node.id}">&lt;#${node.id}&gt;</span>`;
            },
            // role: (id: Number) Role mentions "@somerole"
            role: (node: { id: string; }): string => {
                const role = embed.roles && embed.roles[node.id];
                if (role) {
                    return `<span class="mention role" data-id="${node.id}">${role}</span>`;
                }
                return `<span class="mention role" data-id="${node.id}">&lt;@&${node.id}&gt;</span>`;
            },
            // everyone: () Everyone mention "@everyone"
            everyone: () => {
                return `<span class="mention everyone">@everyone</span>`;
            },
            // here: () Here mention "@here"
            here: () => {
                return `<span class="mention here">@here</span>`;
            },
            // slash: (name: String, id: Number) Slash command reference "</somecommand:someid>"
            // timestamp: (timestamp: Number, style: String|undefined) Relative timestamp reference "<t:sometimestamp:somestyle>"
            timestamp: (node: { timestamp: number; style: string; }): string => {
                const timestamp = formatTimestamp(node.timestamp, node.style);
                let updateScript = '';
                const now = Date.now();
                if (node.style === 'R') {
                    const diff = Math.abs(now - node.timestamp * 1000) / 1000;
                    let frequency;
                    if (diff < 60) {
                        frequency = 1000;
                    } else if (diff < 3600) {
                        frequency = 60000;
                    } else if (diff < 86400) {
                        frequency = 3600000;
                    } else if (diff < 31536000) {
                        frequency = 86400000;
                    } else {
                        frequency = 31536000000;
                    }
                    if (frequency !== 31536000000) {
                        (global as unknown as { formatTimestamp: (timestamp: number, style: string) => string }).formatTimestamp = formatTimestamp;
                        updateScript = `<iframe src="about:blank"  class='hidden' onload="(function() {
                                const element = document.querySelector('.timestamp[data-timestamp=\\'${node.timestamp}\\']');
                                if (element) {
                                    setInterval(() => {
                                        const newTimestamp = formatTimestamp(${node.timestamp}, '${node.style}');
                                        element.innerHTML = newTimestamp;
                                    }, ${frequency});
                                }
                            })()"></iframe>`;
                    }
                }
                const url = `https://www.epochconverter.com/${node.timestamp > now ? "countdown" : ""}?q=${node.timestamp}`
                return `<a class="timestamp bg-background p-0.5 rounded-sm" data-timestamp="${node.timestamp}" data-style="${node.style}" href="${url}">${timestamp}</a>${updateScript}`;
            }
        }
    };
}

function formatTimestamp(timestamp: number, style: string): string {
    const date = new Date(timestamp * 1000); // Convert from seconds to milliseconds
    switch (style) {
        case 't': // Short Time
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        case 'T': // Long Time
            return date.toLocaleTimeString();
        case 'd': // Short Date
            return date.toLocaleDateString();
        case 'D': // Long Date
            return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
        case 'f': // Short Date/Time
            return date.toLocaleString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        case 'F': // Long Date/Time
            return date.toLocaleString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        case 'R': { // Relative Time
            const now = new Date();
            const diff = now.getTime() - date.getTime();
            const seconds = Math.floor(diff / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);
            const years = Math.floor(days / 365);
            if (years > 0) return `${years} year${years > 1 ? 's' : ''} ago`;
            if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
            if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
            if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
            return `${seconds} second${seconds > 1 ? 's' : ''} ago`;
        }
        default:
            return date.toLocaleString();
    }
}

export function markup({ txt, replaceEmoji, embed, showDialog }: { txt: string, replaceEmoji: boolean, embed?: DiscordEmbed, showDialog?: (title: string, message: ReactNode, quote?: boolean) => void }): string {
    if (replaceEmoji)
        txt = txt.replace(/(?<!code(?: \w+=".+")?>[^>]+)(?<!\/[^\s"]+?):((?!\/)\w+):/g, (match, p: string) => p && emojis[p] ? emojis[p] : match);
    const options: HtmlOptions = embed ? createOptions({ embed, showDialog }) : { escapeHTML: true } as HtmlOptions;
    return toHTML(txt, options);
}

export const JSON_EXAMPLE: DiscordEmbed = {
    id: "0",
    content: "You can~~not~~ do `this`.```py\nAnd this.\nprint('Hi')```\n*italics* or _italics_     __*underline italics*__\n**bold**     __**underline bold**__\n***bold italics***  __***underline bold italics***__\n__underline__     ~~Strikethrough~~",
    embeds: [{ "description": "body", "title": "title" }, {
        title: "Hello ~~people~~ world :wave:",
        description: "You can use [links](https://discord.com) or emojis :smile: 😎\n```\nAnd also code blocks\n```",
        color: 4321431,
        timestamp: new Date().toISOString(),
        url: "https://discord.com",
        author: {
            name: "Author name",
            url: "https://discord.com",
            icon_url: "https://unsplash.it/100"
        },
        thumbnail: {
            url: "https://unsplash.it/200"
        },
        image: {
            url: "https://unsplash.it/380/200"
        },
        footer: {
            text: "Footer text",
            icon_url: "https://unsplash.it/100"
        },
        fields: [
            {
                name: "Field 1, *lorem* **ipsum**, ~~dolor~~",
                value: "Field value"
            },
            {
                name: "Field 2",
                value: "You can use custom emojis <:Kekwlaugh:722088222766923847>. <:GangstaBlob:742256196295065661>",
                inline: false
            },
            {
                name: "Inline field",
                value: "Fields can be inline",
                inline: true
            },
            {
                name: "Inline field",
                value: "*Lorem ipsum*",
                inline: true
            },
            {
                name: "Inline field",
                value: "value",
                inline: true
            },
            {
                name: "Another field",
                value: "> Nope, didn't forget about this",
                inline: false
            }
        ]
    }]
};

const emojis: { [key: string]: string } = new Proxy({}, {
    get: (_, key) => getEmoji(String(key)) as any
}) as any;

export function toHTML(txt: string, options: HtmlOptions): string {
    const esc = options && options.escapeHTML !== false;
    const cb: DiscordCallback = options.discordCallback ?? {};
    const text = normalizeNewlines(txt);

    // State for block parsing
    const lines = text.split('\n');
    const out: string[] = [];
    let para: string[] = [];

    let inCodeBlock = false;
    let codeLang = '';
    let codeBuffer: string[] = [];

    let inMultiQuote = false;
    let multiQuoteBuffer: string[] = [];

    function flushParagraph() {
        if (para.length) {
            out.push(para.join('<br/>'));
            para = [];
        }
    }

    function flushMultiQuote() {
        if (inMultiQuote) {
            const body = multiQuoteBuffer.join('<br/>');
            out.push(`<blockquote class="quote">${body}</blockquote>`);
            inMultiQuote = false;
            multiQuoteBuffer = [];
        }
    }

    for (let i = 0; i < lines.length; i++) {
        const raw = lines[i];

        // Handle fenced code blocks
        if (inCodeBlock) {
            if (isFence(raw)) {
                // close code block
                const code = codeBuffer.join('\n');
                out.push(renderCodeBlock(code, codeLang, esc));
                codeBuffer = [];
                codeLang = '';
                inCodeBlock = false;
            } else {
                codeBuffer.push(raw);
            }
            continue;
        }

        // If we are not in code block:

        // Start fenced code block
        const fence = parseFence(raw);
        if (fence) {
            flushParagraph();
            flushMultiQuote();
            inCodeBlock = true;
            codeLang = fence.lang;
            continue;
        }

        // Multiline quote ">>> "
        if (!inMultiQuote) {
            const mq = tryStartMultiQuote(raw);
            if (mq) {
                flushParagraph();
                inMultiQuote = true;
                multiQuoteBuffer.push(parseInline(mq.text, cb, esc));
                continue;
            }
        } else {
            // Once in multiline quote, we continue to end of message (Discord behavior)
            multiQuoteBuffer.push(parseInline(raw, cb, esc));
            continue;
        }

        // Single line quote "> ..."
        const sq = trySingleQuote(raw);
        if (sq) {
            flushParagraph();
            out.push(`<blockquote class="quote">${parseInline(sq.text, cb, esc)}</blockquote>`);
            continue;
        }

        // Subtext line "~# ..."
        const st = trySubtext(raw);
        if (st) {
            flushParagraph();
            out.push(`<div class="subtext">${parseInline(st.text, cb, esc)}</div>`);
            continue;
        }

        // Normal line: part of a paragraph
        para.push(parseInline(raw, cb, esc));
    }

    flushParagraph();
    flushMultiQuote();
    // In case of an unclosed code block, render whatever we collected
    if (inCodeBlock) {
        out.push(renderCodeBlock(codeBuffer.join('\n'), codeLang, esc));
    }

    return out.join('\n');
}

/* ========================= Helpers ========================= */

function normalizeNewlines(s: string): string {
    return s.replace(/\r\n?/g, '\n');
}

function isFence(line: string): boolean {
    // ``` (no need to enforce language here)
    return /^```/.test(line);
}

function parseFence(line: string): { lang: string } | null {
    const m = /^```([\w+-]*)\s*$/.exec(line);
    if (!m) return null;
    return { lang: (m[1] || '').trim() };
}

function renderCodeBlock(code: string, lang: string, esc: boolean): string {
    const cls = lang ? ` class="language-${safeAttr(lang)}"` : '';
    // Always escape inside code
    return `<pre><code${cls}>${escapeHtml(code)}</code></pre>`;
}

function tryStartMultiQuote(line: string): { text: string } | null {
    // ">>> " starts a multiline quote till end of message in Discord
    if (/^>>>\s?/.test(line)) {
        return { text: line.replace(/^>>>\s?/, '') };
    }
    return null;
}

function trySingleQuote(line: string): { text: string } | null {
    if (/^>\s?/.test(line)) {
        return { text: line.replace(/^>\s?/, '') };
    }
    return null;
}

function trySubtext(line: string): { text: string } | null {
    // supports subtext via ~# at the start of the line
    if (/^~#\s?/.test(line)) {
        return { text: line.replace(/^~#\s?/, '') };
    }
    return null;
}

/* =============== Inline parsing and rendering =============== */

function parseInline(input: string, cb: DiscordCallback, esc: boolean): string {
    // We build output by buffering plain text and emitting tags/mentions as we go.
    let i = 0;
    const n = input.length;
    const out: string[] = [];
    let textBuf = '';

    // Stack for paired formatting
    type Mark = { type: 'b' | 'i' | 'u' | 's' | 'sp'; delim: string };
    const stack: Mark[] = [];

    function flushText() {
        if (!textBuf) return;
        // linkify + escape plain text
        out.push(linkifyAndEscape(textBuf, esc));
        textBuf = '';
    }

    function openMark(m: Mark) {
        flushText();
        stack.push(m);
        switch (m.type) {
            case 'b': out.push('<strong>'); break;
            case 'i': out.push('<em>'); break;
            case 'u': out.push('<u>'); break;
            case 's': out.push('<s>'); break;
            case 'sp': out.push('<span class="spoiler">'); break;
        }
    }

    function closeMark(type: Mark['type']) {
        // Close the nearest matching mark; if not found, treat delimiter as literal
        for (let si = stack.length - 1; si >= 0; si--) {
            if (stack[si].type === type) {
                flushText();
                // close all opened marks above it in LIFO order but keep them
                const toReopen: Mark[] = [];
                while (stack.length - 1 > si) {
                    const temp = stack.pop()!;
                    out.push(closeTag(temp.type));
                    toReopen.push(temp);
                }
                // close target
                const target = stack.pop()!;
                out.push(closeTag(target.type));
                // reopen the previously closed ones
                for (let ri = toReopen.length - 1; ri >= 0; ri--) {
                    const m = toReopen[ri];
                    out.push(openTag(m.type));
                    stack.push(m);
                }
                return true;
            }
        }
        return false;
    }

    function openTag(t: Mark['type']): string {
        switch (t) {
            case 'b': return '<strong>';
            case 'i': return '<em>';
            case 'u': return '<u>';
            case 's': return '<s>';
            case 'sp': return '<span class="spoiler">';
        }
    }
    function closeTag(t: Mark['type']): string {
        switch (t) {
            case 'b': return '</strong>';
            case 'i': return '</em>';
            case 'u': return '</u>';
            case 's': return '</s>';
            case 'sp': return '</span>';
        }
    }

    while (i < n) {
        const ch = input[i];

        // Backslash escapes for special characters
        if (ch === '\\' && i + 1 < n) {
            const next = input[i + 1];
            if (isSpecialChar(next)) {
                textBuf += next;
                i += 2;
                continue;
            }
        }

        // Inline code span using backticks (support multiple ticks)
        if (ch === '`') {
            const tickLen = countRun(input, i, '`');
            const end = findClosingBackticks(input, i + tickLen, tickLen);
            if (end !== -1) {
                // Emit buffered text and code
                flushText();
                const codeContent = input.slice(i + tickLen, end);
                out.push(`<code>${escapeHtml(codeContent)}</code>`);
                i = end + tickLen;
                continue;
            } else {
                // treat the ticks literally
                textBuf += repeat('`', tickLen);
                i += tickLen;
                continue;
            }
        }

        // Angle-bracket things: mentions, channels, roles, timestamps, slash references
        if (ch === '<') {
            const close = input.indexOf('>', i + 1);
            if (close !== -1) {
                const payload = input.slice(i + 1, close);
                const rendered = renderDiscordAngles(payload, cb);
                if (rendered) {
                    flushText();
                    out.push(rendered);
                    i = close + 1;
                    continue;
                }
            }
            // fall through literal '<' if not valid
            textBuf += '<';
            i++;
            continue;
        }

        // @everyone / @here (not in angle brackets)
        if (ch === '@') {
            const here = matchWord(input, i + 1, 'here');
            const everyone = matchWord(input, i + 1, 'everyone');
            if (everyone && isBoundary(input, i, i + 1 + 'everyone'.length)) {
                flushText();
                const html = cb.everyone ? cb.everyone() : esc ? escapeHtml('@everyone') : '@everyone';
                out.push(html);
                i += 1 + 'everyone'.length;
                continue;
            }
            if (here && isBoundary(input, i, i + 1 + 'here'.length)) {
                flushText();
                const html = cb.here ? cb.here() : esc ? escapeHtml('@here') : '@here';
                out.push(html);
                i += 1 + 'here'.length;
                continue;
            }
        }

        // Paired formatting. Prefer 2-char delimiters first.
        // spoilers ||
        if (input[i] === '|' && i + 1 < n && input[i + 1] === '|') {
            const canToggle = canToggleDelim(input, i, 2);
            if (canToggle) {
                // if top stack type is 'sp' -> close, else open
                if (!closeMark('sp')) {
                    openMark({ type: 'sp', delim: '||' });
                }
                i += 2;
                continue;
            }
        }
        // bold **
        if (input[i] === '*' && i + 1 < n && input[i + 1] === '*') {
            const canToggle = canToggleDelim(input, i, 2);
            if (canToggle) {
                if (!closeMark('b')) {
                    openMark({ type: 'b', delim: '**' });
                }
                i += 2;
                continue;
            }
        }
        // underline __
        if (input[i] === '_' && i + 1 < n && input[i + 1] === '_') {
            const canToggle = canToggleDelim(input, i, 2);
            if (canToggle) {
                if (!closeMark('u')) {
                    openMark({ type: 'u', delim: '__' });
                }
                i += 2;
                continue;
            }
        }
        // strikethrough ~~
        if (input[i] === '~' && i + 1 < n && input[i + 1] === '~') {
            const canToggle = canToggleDelim(input, i, 2);
            if (canToggle) {
                if (!closeMark('s')) {
                    openMark({ type: 's', delim: '~~' });
                }
                i += 2;
                continue;
            }
        }
        // italic * or _
        if (input[i] === '*' || input[i] === '_') {
            const canToggle = canToggleDelim(input, i, 1);
            if (canToggle) {
                if (!closeMark('i')) {
                    openMark({ type: 'i', delim: input[i] });
                }
                i += 1;
                continue;
            }
        }

        // Everything else -> buffer
        textBuf += input[i];
        i++;
    }

    // Close any unclosed marks by treating their delimiters as literal (safest)
    // We render their opening tags already; to ensure no broken HTML, we close them now.
    // But to avoid changing semantics too much, we will close them:
    while (stack.length) {
        const m = stack.pop()!;
        out.push(closeTag(m.type));
    }

    flushText();
    return out.join('');
}

/* =============== Angle-bracket tokens =============== */

function renderDiscordAngles(payload: string, cb: DiscordCallback): string | null {
    // <@1234567890> or <@!123> user mention
    let m = /^@!?(\d+)$/.exec(payload);
    if (m) {
        const id = m[1];
        if (cb.user) return cb.user({ id });
        return safeLtGt(`<@${id}>`);
    }

    // <#123> channel mention
    m = /^#(\d+)$/.exec(payload);
    if (m) {
        const id = m[1];
        if (cb.channel) return cb.channel({ id });
        return safeLtGt(`<#${id}>`);
    }

    // <@&123> role mention
    m = /^@&(\d+)$/.exec(payload);
    if (m) {
        const id = m[1];
        if (cb.role) return cb.role({ id });
        return safeLtGt(`<@&${id}>`);
    }

    // </somecommand:123456> slash command reference
    m = /^\/([^:>]+):(\d+)$/.exec(payload);
    if (m) {
        const name = m[1];
        const id = m[2];
        if (cb.slash) return cb.slash(name, id);
        return safeLtGt(`</${name}:${id}>`);
    }

    // <t:TIMESTAMP[:STYLE]>
    m = /^t:(-?\d+)(?::([A-Za-z]))?$/.exec(payload);
    if (m) {
        const timestamp = Number(m[1]);
        const style = m[2] || '';
        if (cb.timestamp) return cb.timestamp({ timestamp, style });
        return safeLtGt(`<t:${timestamp}${style ? ':' + style : ''}>`);
    }

    return null;
}

function safeLtGt(s: string): string {
    // Render literally as text angle brackets if no callback
    return escapeHtml(s);
}

/* =============== Utilities =============== */

function escapeHtml(s: string): string {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function safeAttr(s: string): string {
    // very conservative attr escaping
    return s.replace(/[^-a-zA-Z0-9_+.]/g, '');
}

function countRun(s: string, i: number, ch: string): number {
    let k = 0;
    while (i + k < s.length && s[i + k] === ch) k++;
    return k;
}

function findClosingBackticks(s: string, start: number, count: number): number {
    const needle = repeat('`', count);
    const idx = s.indexOf(needle, start);
    if (idx === -1) return -1;
    // must not be escaped by backslash (commonmark allows, but for discord this is fine)
    return idx;
}

function repeat(ch: string, n: number): string {
    return new Array(n + 1).join(ch);
}

function isSpecialChar(c: string): boolean {
    return /[\\`*_\-~|<>]/.test(c);
}

function isWordChar(c: string): boolean {
    return !!c && /[A-Za-z0-9_]/.test(c);
}

function isBoundary(s: string, atStart: number, afterEnd: number): boolean {
    const before = atStart - 1 >= 0 ? s[atStart - 1] : '';
    const after = afterEnd < s.length ? s[afterEnd] : '';
    return (!isWordChar(before)) && (!isWordChar(after));
}

function matchWord(s: string, start: number, word: string): boolean {
    return s.slice(start, start + word.length) === word;
}

function canToggleDelim(s: string, i: number, len: number): boolean {
    const before = i - 1 >= 0 ? s[i - 1] : '';
    const after = i + len < s.length ? s[i + len] : '';
    // Simple left/right flanking rule: don't open/close if surrounded by whitespace only
    const leftOk = !after || !/\s/.test(after);
    const rightOk = !before || !/\s/.test(before);
    return leftOk || rightOk;
}

/* =============== Linkify =============== */

function linkifyAndEscape(text: string, esc: boolean): string {
    // Escape first; we’ll output links as safe anchors with rel attrs.
    // This keeps it robust and prevents injection.
    // Then find http/https links in the raw text and wrap them.
    // We need raw text for matching, but we already escaped, so we do a split pass with indexes.
    // Simpler approach: match on the unescaped version and stitch with escaping for non-links.
    if (!text) return '';
    const segments: string[] = [];
    const urlRe = /\bhttps?:\/\/[^\s<>'"]+/gi;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = urlRe.exec(text)) !== null) {
        const start = m.index;
        const end = start + m[0].length;
        // Append preceding plain text
        if (start > last) {
            segments.push(escapeHtml(text.slice(last, start)));
        }
        const url = m[0];
        segments.push(renderLink(url));
        last = end;
    }
    if (last < text.length) {
        segments.push(escapeHtml(text.slice(last)));
    }
    return segments.join('');
}

function renderLink(url: string): string {
    // trim trailing punctuation that commonly sticks to URLs
    const trimmed = trimUrlPunctuation(url);
    const display = escapeHtml(trimmed);
    const safeHref = escapeHref(trimmed);
    return `<a href="${safeHref}" target="_blank" rel="noopener noreferrer nofollow">${display}</a>` + escapeHtml(url.slice(trimmed.length));
}

function escapeHref(href: string): string {
    // Only allow http/https
    if (!/^https?:\/\//i.test(href)) return '#';
    // basic escaping
    return href.replace(/"/g, '%22');
}

function trimUrlPunctuation(url: string): string {
    // Discord tends to exclude trailing ), ], ., , etc. We'll conservatively trim common trailing punctuations.
    let end = url.length;
    while (end > 0 && /[)\].,;!?:'"]/.test(url[end - 1])) {
        end--;
    }
    // balance closing parenthesis vs opening within URL
    const slice = url.slice(0, end);
    const open = (slice.match(/\(/g) || []).length;
    const close = (slice.match(/\)/g) || []).length;
    if (close > open && end < url.length && url[end] === ')') {
        // keep one ')'
        end++;
    }
    return url.slice(0, end);
}