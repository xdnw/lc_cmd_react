import type { ShowDialogFn } from "@/lib/dialog";
import type { WebGraph } from "@/lib/apitypes";
import type { ButtonInfoCmd, ButtonInfoHref } from "@/lib/internaltypes";
import {
	createOptions,
	markup,
	markupWithPreparedOptions,
	type HtmlOptions,
} from "@/lib/discord";

type MarkupAnalysis = {
	isEmpty: boolean;
	shouldRenderMarkup: boolean;
};

const EMPTY_ANALYSIS: MarkupAnalysis = Object.freeze({
	isEmpty: true,
	shouldRenderMarkup: false,
});

const EMPTY_MARKUP_PLAN = Object.freeze({ kind: "empty" }) as PlannedMarkupContent;

const ANALYSIS_CACHE_LIMIT = 500;
const HTML_CACHE_LIMIT = 250;
const markupAnalysisCache = new Map<string, MarkupAnalysis>();
const markupHtmlCache = new Map<string, string>();
const embedMarkupHtmlCache = new WeakMap<DiscordEmbed, Map<string, string>>();

export interface Author {
	name: string;
	url: string;
	icon_url: string;
}

export interface Thumbnail {
	url: string;
}

export interface Image {
	url: string;
}

export interface Footer {
	text: string;
	icon_url: string;
}

export interface Field {
	name: string;
	value: string;
	inline?: boolean;
}

export interface Embed {
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
	files?: { [key: string]: string };
	images?: { [key: string]: number[] };
	tables?: WebGraph[];
	buttons?: (ButtonInfoHref | ButtonInfoCmd)[];
}

export type PlannedMarkupContent =
	| { kind: "empty" }
	| { kind: "text"; text: string }
	| { kind: "html"; html: string };

export type MarkupRenderContext = {
	embed?: DiscordEmbed;
	showDialog?: ShowDialogFn;
	htmlOptions?: HtmlOptions;
};

export type PlannedEmbedField = {
	key: string;
	inline?: boolean;
	name: PlannedMarkupContent;
	value: PlannedMarkupContent;
};

export type PlannedEmbed = {
	key: string;
	source: Embed;
	title: PlannedMarkupContent;
	description: PlannedMarkupContent;
	fields: PlannedEmbedField[];
};

export type PlannedDiscordMessage = {
	content: PlannedMarkupContent;
	embeds: PlannedEmbed[];
};

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
			case 10:
			case 42:
			case 60:
			case 62:
			case 91:
			case 93:
			case 95:
			case 96:
			case 123:
			case 124:
			case 125:
			case 126:
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

	return setBoundedCache(markupAnalysisCache, content, {
		isEmpty: false,
		shouldRenderMarkup: !isPlainTextContent(content),
	}, ANALYSIS_CACHE_LIMIT);
}

function renderMarkupHtml(content: string, context?: MarkupRenderContext): string {
	if (!context?.embed) {
		const cached = markupHtmlCache.get(content);
		if (cached !== undefined) {
			return cached;
		}

		return setBoundedCache(markupHtmlCache, content, markup({
			txt: content,
			replaceEmoji: true,
		}), HTML_CACHE_LIMIT);
	}

	let embedCache = embedMarkupHtmlCache.get(context.embed);
	if (!embedCache) {
		embedCache = new Map<string, string>();
		embedMarkupHtmlCache.set(context.embed, embedCache);
	}

	const cached = embedCache.get(content);
	if (cached !== undefined) {
		return cached;
	}

	return setBoundedCache(embedCache, content, markupWithPreparedOptions({
		txt: content,
		replaceEmoji: true,
		options: context.htmlOptions,
	}), HTML_CACHE_LIMIT);
}

export function createMarkupRenderContext({
	embed,
	showDialog,
}: {
	embed?: DiscordEmbed;
	showDialog?: ShowDialogFn;
}): MarkupRenderContext | undefined {
	if (!embed) {
		return undefined;
	}

	return {
		embed,
		showDialog,
		htmlOptions: createOptions({ embed, showDialog }),
	};
}

export function planMarkupContent(content: string, context?: MarkupRenderContext): PlannedMarkupContent {
	const analysis = analyzeMarkupContent(content);

	if (analysis.isEmpty) {
		return EMPTY_MARKUP_PLAN;
	}

	if (!analysis.shouldRenderMarkup) {
		return { kind: "text", text: content };
	}

	return {
		kind: "html",
		html: renderMarkupHtml(content, context),
	};
}

export function planEmbedFields(fields: Field[] | undefined, context?: MarkupRenderContext): PlannedEmbedField[] {
	if (!fields || fields.length === 0) {
		return [];
	}

	return fields.map((field, index) => ({
		key: `${index}-${field.name}`,
		inline: field.inline,
		name: planMarkupContent(field.name, context),
		value: planMarkupContent(field.value, context),
	}));
}

export function planDiscordMessage(json: DiscordEmbed, showDialog?: ShowDialogFn): PlannedDiscordMessage {
	const context = createMarkupRenderContext({ embed: json, showDialog });
	const embeds: Embed[] = [];

	if (json.embeds) {
		embeds.push(...json.embeds);
	}
	if (json.embed) {
		embeds.push(json.embed);
	}

	return {
		content: planMarkupContent(json.content, context),
		embeds: embeds.map((embed, index) => ({
			key: `${json.id}-embed-${index}`,
			source: embed,
			title: planMarkupContent(embed.title ?? "", context),
			description: planMarkupContent(embed.description ?? "", context),
			fields: planEmbedFields(embed.fields, context),
		})),
	};
}

export function canRenderPlainTextContent(content: string): boolean {
	const analysis = analyzeMarkupContent(content);
	return !analysis.isEmpty && !analysis.shouldRenderMarkup;
}

export function hasDiscernableMarkupContent(content: string): boolean {
	return analyzeMarkupContent(content).shouldRenderMarkup;
}
