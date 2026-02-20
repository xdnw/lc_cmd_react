import { commafy, formatDuration, formatSi, formatTimeRelative, formatTurnsToDate, split } from "../../utils/StringUtil";
import ReactDOMServer from 'react-dom/server';
import { CM, IOptionData } from "../../utils/Command";
import React, { ReactNode } from "react";
import SimpleChart from "../../pages/graphs/SimpleChart.js";
import { WebGraph } from "../../lib/apitypes.js";
import Color from "../renderer/Color.js";
import { ObjectColumnRender } from "@/pages/custom_table/DataTable.js";
import { JSONValue } from "@/lib/internaltypes.js";
import { Link } from "react-router-dom";

export const RENDERERS: { [key: string]: ObjectColumnRender | undefined } = {
    money: { display: money },
    comma: { display: formatSi },
    color: { display: color },
    time: { display: time },
    time_ms: { display: time_ms },
    diff_ms: { display: diff_ms },
    normal: { display: autoMarkdown },
    text: undefined,
    json: { display: json },
    graph: { display: graph as unknown as (value: JSONValue) => ReactNode, isHtml: true },
    html: { display: html },
    duration_day: { display: duration_day },
    percent_100: { display: percent_100 },
    percent: { display: percent },
    duration_ms: { display: duration_ms },
    numeric_map: { display: numericMap },
    turn_to_date: { display: formatTurnsToDate },
}

export function percent_100(value: number): string {
    if (value === null || value === undefined) return "N/A";
    console.log(value);
    return (value).toFixed(2) + "%";
}

export function percent(value: number): string {
    if (value === null || value === undefined) return "N/A";
    try {
        console.log(value);
        return (value * 100).toFixed(2) + "%";
    } catch (e) {
        console.error(e);
        return "N/A2";
    }
}

export function diff_ms(t: number): string {
    return formatTimeRelative(t, 5);
}

export function duration_day(days: number): string {
    if (days === null || days === undefined) return "N/A";
    const seconds = days * 24 * 60 * 60;
    if (seconds == 0) return '0s';
    return formatDuration(seconds, 3);
}

export function duration_ms(ms: number): string {
    if (ms === null || ms === undefined) return "N/A";
    const seconds = ms / 1000;
    if (seconds == 0) return '0s';
    return formatDuration(seconds, 3);
}

export function html(value: string): ReactNode {
    return <>{ReactDOMServer.renderToStaticMarkup(<div dangerouslySetInnerHTML={{ __html: value }} />)}</>;
}

export function isHtmlRenderer(type: ObjectColumnRender): boolean {
    return (type.display as unknown as { isHtml?: boolean }).isHtml ?? false;
}

export function graph(value: WebGraph): ReactNode {
    return <SimpleChart graph={value} type={"LINE"} theme="light"
        hideLegend={true}
        hideDots={true}
        minHeight="40px"
        maxHeight="50px"
    />
}

export function autoMarkdown(value: string): ReactNode {
    if (!value) return value;
    value = value.toString();
    const openBracketIndex = value.indexOf("[");
    if (openBracketIndex !== 0) {
        // if first char is =
        if (value[0] === "=" && value.startsWith("=HYPERLINK(")) {
            const closeParenIndex = value.indexOf(")", 11);
            const remaining = value.slice(11, closeParenIndex);
            if (closeParenIndex === value.length - 1) {
                const s2 = split(remaining, ",");
                if (s2.length === 2) {
                    return `<a href="${s2[0].trim().replace(/^"|"$/g, '')}">${s2[1].trim().replace(/^"|"$/g, '')}</a>`;
                }
            }
        }
        return value;
    }

    const closeBracketIndex = value.indexOf("]", openBracketIndex);
    if (closeBracketIndex <= openBracketIndex) return value;

    const openParenIndex = value.indexOf("(", closeBracketIndex);
    if (openParenIndex !== closeBracketIndex + 1) return value;

    const closeParenIndex = value.indexOf(")", openParenIndex);
    if (closeParenIndex !== value.length - 1) return value;

    let url = value.slice(openParenIndex + 1, closeParenIndex);
    if (url.startsWith("<") && url.endsWith(">")) {
        url = url.slice(1, -1);
    }
    const text = value.slice(openBracketIndex + 1, closeBracketIndex);
    return <Link to={url}>{text}</Link>;
}

export function json(value: { [key: string]: (string | number) } | (string | number)[]): string {
    const roundedValue = Array.isArray(value)
        ? value.map(v => Number.isFinite(v) ? Math.round(v as number * 100) / 100 : v)
        : Object.fromEntries(
            Object.entries(value).map(([k, v]) => [k, Number.isFinite(v) ? Math.round(v as number * 100) / 100 : v])
        );
    return JSON.stringify(roundedValue);
}

export function getRenderer(type: string): ObjectColumnRender | undefined {
    if (!type) return undefined;
    if (type.startsWith("enum:")) {
        const enumType = type.split(":")[1];
        const options = (CM.data.options[enumType] as IOptionData).options ?? [];
        // return Object.assign({
        //     display: (value: number) => options[value],
        // }, {isEnum: true, options: options});
        return {
            display: (value: string | number | boolean | number[]) => options[value as number],
            isEnum: true,
            options: options,
        };
    } else {
        return RENDERERS[type] ?? RENDERERS.text;
    }
}

export function time(t: number): string {
    const date = new Date(t * 1000);
    return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
}

export function time_ms(t: number): string {
    const date = new Date(t);
    return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
}

export function money(f: number): string {
    return "$" + commafy(f);
}

export function color(colorId: number): ReactNode {
    return <Color colorId={colorId} />;
}

export function numericMap(value: { [key: string]: number } | string): string {
    if (!value) return "{}";
    if (typeof value === "string") {
        value = JSON.parse(value) as { [key: string]: number };
    }
    const entries = Object.entries(value).map(([k, v]) => {
        return `${k}:${commafy((v))}`;
    });
    return `{${entries.join(",")}}`;
}