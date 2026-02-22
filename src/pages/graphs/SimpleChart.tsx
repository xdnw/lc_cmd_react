import React, { useCallback, useState, useMemo, useRef, memo } from 'react';
import LazyIcon from "@/components/ui/LazyIcon";
import {
    Chart as ChartJS,
    Decimation,
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    ChartEvent,
    ActiveElement,
    Chart,
    ChartTypeRegistry,
    TooltipItem,
    ChartData,
    ChartOptions,
    ChartDataset,
} from 'chart.js';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Bar, Line, Scatter } from 'react-chartjs-2';
import { WebGraph, GraphType, CoalitionGraph } from '../../lib/apitypes';
import {
    downloadCells,
    ExportType,
    ExportTypes,
    formatDate,
    getNumberFormatCallback,
    getTimeFormatCallback,
    isTime,
    toMillisFunction,
} from "../../utils/StringUtil";
import { Button } from "../../components/ui/button";
import { Link } from "react-router-dom";
import { useTheme } from "../../components/ui/theme-provider";
import { useDialog } from "../../components/layout/DialogContext";
import { invertData } from "../../utils/MathUtil";

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, Filler, Decimation);

// --- Types ---
interface ChartProps {
    graph: WebGraph;
    type?: GraphType;
    theme?: string;
    aspectRatio?: number;
    hideLegend?: boolean;
    hideDots?: boolean;
    minHeight?: string;
    maxHeight?: string;
    classes?: string;
}

// --- Utility Functions ---

/**
 * Replaces chroma-js and distinct-colors.
 * Uses the Golden Angle to distribute hues evenly around the color wheel.
 */
function generateColor(index: number, theme: 'light' | 'dark' = 'light', alpha: number = 1): string {
    const hue = (index * 137.508) % 360; // Golden angle for maximum visual distance
    const saturation = 75; // Keep saturation high for vibrant chart lines
    // Lightness changes based on theme to ensure contrast against background
    const lightness = theme === 'dark' ? 65 : 45;
    return `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;
}

function downloadGraph(graph: WebGraph, useClipboard: boolean, formatDates: boolean, type: ExportType): [string, string] {
    const header: string[] = [graph.x, ...graph.labels];
    const data = invertData(graph.data as (number | string)[][]);
    if (graph.origin) {
        for (let i = 0; i < data.length; i++) {
            (data[i][0] as number) += graph.origin;
        }
    }
    if (formatDates && graph.time_format && isTime(graph.time_format)) {
        const toMillis = toMillisFunction(graph.time_format);
        for (let i = 0; i < data.length; i++) {
            data[i][0] = formatDate(toMillis(data[i][0] as number));
        }
    }

    const dataWithHeader = [header, ...data];
    return downloadCells(dataWithHeader, useClipboard, type);
}

function getQueryString(params: { [key: string]: string | string[] | undefined }) {
    return Object.keys(params)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent((params[key] as (number | string | undefined)) || "")}`)
        .join("&");
}

// --- Components ---

export function CoalitionGraphComponent({ graph, type }: { graph: CoalitionGraph, type: GraphType }) {
    const [showAlliances, setShowAlliances] = useState(false);

    const toggleAlliances = useCallback(() => {
        setShowAlliances(f => !f);
    }, []);

    return (
        <div className="themeDiv bg-opacity-10 rounded my-2">
            <h2 className="text-xl font-bold">{graph.name}</h2>
            {graph.overall && (
                <div className="mb-2">
                    <SimpleChart graph={graph.overall} type={type} theme="light" aspectRatio={3} />
                </div>
            )}
            <div className="themeDiv bg-opacity-10 rounded mt-2">
                <Button
                    variant="ghost"
                    size="md"
                    className="text-xl w-full border-b border-secondary px-2 bg-primary/10 rounded-b justify-start"
                    onClick={toggleAlliances}
                >
                    {showAlliances ? 'Hide' : 'Show'} Alliance Graphs
                </Button>
                <div className={`transition-all duration-200 ease-in-out ${!showAlliances ? 'max-h-0 opacity-0 overflow-hidden' : 'p-2 opacity-100'}`}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1">
                        {Object.entries(graph.alliances).map(([allianceName, allianceId]) => (
                            <div key={allianceId} className="mb-1">
                                <h3 className="text-lg font-semibold">
                                    <Link to={`https://politicsandwar.com/alliance/id=${allianceId}`}>
                                        {allianceName}
                                    </Link>
                                </h3>
                                <div className={`${!showAlliances ? 'hidden' : ''}`}>
                                    <ThemedChart graph={graph.by_alliance[allianceId]} type={type} aspectRatio={1} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export function ChartWithButtons({ graph, endpointName, usedArgs }: {
    graph: WebGraph,
    endpointName?: string,
    usedArgs?: { [key: string]: string | string[] | undefined }
}) {
    const { showDialog } = useDialog();

    const downloadAction = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const useClipboard = e.currentTarget.dataset.clipboard === "true";
        const typeKey = e.currentTarget.dataset.type as string;
        const type = typeKey && (typeKey in ExportTypes)
            ? ExportTypes[typeKey as keyof typeof ExportTypes]
            : ExportTypes.CSV;

        const [title, content] = downloadGraph(graph, useClipboard, true, type);
        showDialog(title, content, true);
    }, [graph, showDialog]);

    const copyShare = useCallback(() => {
        const queryStr = getQueryString(usedArgs || {});
        const baseUrlWithoutPath = window.location.protocol + "//" + window.location.host;
        const url = (`${baseUrlWithoutPath}${process.env.BASE_PATH}#/view_graph/${endpointName}?${queryStr}`);

        navigator.clipboard.writeText(url).then(() => {
            showDialog("URL copied to clipboard", url, true);
        }).catch((err) => {
            showDialog("Failed to copy URL to clipboard", err + "", true);
        });
    }, [usedArgs, endpointName, showDialog]);

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="me-1">Export</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem className="cursor-pointer" data-type={"CSV"} data-clipboard={false} onClick={downloadAction}>
                        <kbd className="bg-accent rounded flex items-center space-x-1"><LazyIcon name="Download" className="h-4 w-4" /> <span>,</span></kbd>&nbsp;Download CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer" data-type={"CSV"} data-clipboard={true} onClick={downloadAction}>
                        <kbd className="bg-accent rounded flex items-center space-x-1"><LazyIcon name="ClipboardIcon" className="h-4 w-4" /> <span>,</span></kbd>&nbsp;Copy CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer" data-type={"TSV"} data-clipboard={false} onClick={downloadAction}>
                        <kbd className="bg-accent rounded flex items-center space-x-1"><LazyIcon name="Download" className="h-4 w-3" /><LazyIcon name="ArrowRightToLine" className="h-4 w-3" /></kbd>&nbsp;Download TSV
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer" data-type={"TSV"} data-clipboard={true} onClick={downloadAction}>
                        <kbd className="bg-accent rounded flex items-center space-x-1"><LazyIcon name="ClipboardIcon" className="h-4 w-3" /><LazyIcon name="ArrowRightToLine" className="h-4 w-3" /></kbd>&nbsp;Copy TSV
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {endpointName && (
                <Button variant="outline" size="sm" onClick={copyShare}>
                    Share
                </Button>
            )}

            <div className="w-full pt mt-1">
                <h1 className="relative text-2xl font-bold text-center bg-primary/10 border border-primary/20 rounded-t">
                    {graph.title}
                </h1>
                <ThemedChart graph={graph} />
            </div>
        </>
    );
}

export function ThemedChart(props: ChartProps) {
    const { theme } = useTheme();
    return <SimpleChart {...props} theme={theme} />;
}

// Wrapping in memo prevents re-renders when parent states change unnecessarily
const SimpleChart = memo(({
    graph,
    type: propType,
    theme = 'light',
    aspectRatio = 2,
    hideLegend,
    hideDots,
    minHeight,
    maxHeight,
    classes
}: ChartProps) => {

    // Ref avoids React re-renders during high-frequency mouse hover events
    const previousActiveElements = useRef<ActiveElement[]>([]);

    const type: GraphType = propType ?? graph.type ?? "LINE";

    // Handle Chart Hover Events directly via Canvas API for performance
    const onHover = useCallback((evt: ChartEvent, activeElements: ActiveElement[], chart: Chart) => {
        if (hideDots) return;

        const lastActiveIds: Set<number> = new Set(previousActiveElements.current.map((el) => el.datasetIndex));
        const nowActiveIds: Set<number> = new Set(activeElements.map((el) => el.datasetIndex));

        if (lastActiveIds.size !== nowActiveIds.size || [...lastActiveIds].some((id) => !nowActiveIds.has(id))) {
            chart.data.datasets.forEach((dataset, index) => {
                if (lastActiveIds.has(index) && !nowActiveIds.has(index)) {
                    if (typeof dataset.backgroundColor === 'string') {
                        // Revert alpha to 0.5
                        dataset.backgroundColor = dataset.backgroundColor.replace(/[\d.]+\)$/g, '0.5)');
                    }
                    (dataset as ChartDataset<'line'>).pointRadius = 0;
                }
            });

            if (activeElements.length) {
                const datasetIndex = activeElements[0].datasetIndex;
                if (!lastActiveIds.has(datasetIndex)) {
                    const activeDataset = chart.data.datasets[datasetIndex] as ChartDataset<'line'>;
                    if (typeof activeDataset.backgroundColor === 'string') {
                        // Highlight alpha to 1
                        activeDataset.backgroundColor = activeDataset.backgroundColor.replace(/[\d.]+\)$/g, '1)');
                    }
                    activeDataset.pointRadius = 2;
                }
            }

            previousActiveElements.current = activeElements;
            chart.update(); // Update canvas without triggering React render
        }
    }, [hideDots]);

    // Compute Chart Data and Options only when graph data or configs change
    const { chartData, chartOptions } = useMemo(() => {
        const origin = graph.origin ?? 0;
        const timeFormat = graph.time_format ?? "SI_UNIT";
        const numberFormat = graph.number_format ?? "SI_UNIT";
        const isTimeBool = isTime(timeFormat);
        const toMillisFunc = toMillisFunction(timeFormat);

        let timeFormatFunc = getTimeFormatCallback(isTimeBool ? 'MILLIS_TO_DATE' : timeFormat);
        let minX, maxX, minY, maxY;

        if (isTimeBool) {
            minX = toMillisFunc((graph.data[0][0] as number) + origin);
            maxX = toMillisFunc((graph.data[0][graph.data[0].length - 1] as number) + origin);
        } else if (type === 'SCATTER') {
            minX = Math.min(...(graph.data[0] as number[]));
            maxX = Math.max(...(graph.data[0] as number[]));
        } else {
            minX = (graph.data[0][0] as number) + origin;
            maxX = (graph.data[0][graph.data[0].length - 1] as number) + origin;
        }

        if (numberFormat === "PERCENTAGE_ONE") {
            minY = 0;
            maxY = 1;
        } else {
            minY = Math.min(...graph.data.slice(1).map((dataSet) => Math.min(...(dataSet as number[]))));
            maxY = Math.max(...graph.data.slice(1).map((dataSet) => Math.max(...(dataSet as number[]))));
        }

        let parsedChartData: ChartData<keyof ChartTypeRegistry>;

        if (type === 'SCATTER') {
            parsedChartData = {
                datasets: graph.data.slice(1).map((dataSet, index) => {
                    const color = generateColor(index, theme as 'light' | 'dark', 1);
                    return {
                        label: graph.labels[index],
                        data: dataSet.map((yValue, i) => ({
                            x: toMillisFunc((graph.data[0][i] as number) + origin),
                            y: yValue as number
                        })),
                        backgroundColor: color,
                        borderColor: color,
                        borderWidth: hideDots ? 1 : 1,
                        pointRadius: hideDots ? 0 : 1,
                        pointHoverRadius: 5,
                        hitRadius: 100
                    };
                })
            };
        } else {
            const parentTimeCallback = isTimeBool ? getTimeFormatCallback(timeFormat) : timeFormatFunc;
            timeFormatFunc = (value: number) => parentTimeCallback((graph.data[0][value] as number) + origin);

            const labels = (graph.data[0] as number[]).map(value => toMillisFunc(value + origin));

            parsedChartData = {
                labels,
                datasets: graph.data.slice(1).map((dataSet, index) => {
                    const solidColor = generateColor(index, theme as 'light' | 'dark', 1);
                    const semiTransparentColor = generateColor(index, theme as 'light' | 'dark', 0.5);

                    return {
                        label: graph.labels[index],
                        data: dataSet as number[],
                        backgroundColor: semiTransparentColor,
                        borderColor: solidColor,
                        borderWidth: hideDots ? 1 : 1,
                        pointRadius: hideDots ? 0 : 1,
                        fill: type === 'STACKED_LINE' || type === "FILLED_LINE" ? 'origin' : false,
                        pointHoverRadius: 5,
                        hitRadius: 100,
                        hoverBorderWidth: 3,
                    };
                })
            };
        }

        const yCallback = getNumberFormatCallback(numberFormat);
        const xTickCallback = (tickValue: string | number) => {
            if (typeof tickValue === 'number') {
                return timeFormatFunc(tickValue);
            }
            const parsed = Number(tickValue);
            return Number.isFinite(parsed) ? timeFormatFunc(parsed) : String(tickValue);
        };
        const yTickCallback = (tickValue: string | number) => {
            if (typeof tickValue === 'number') {
                return yCallback(tickValue);
            }
            const parsed = Number(tickValue);
            return Number.isFinite(parsed) ? yCallback(parsed) : String(tickValue);
        };

        const parsedChartOptions: ChartOptions<keyof ChartTypeRegistry> = {
            resizeDelay: 20,
            animation: false,
            responsive: true,
            aspectRatio,
            maintainAspectRatio: false,
            normalized: true,
            interaction: {
                mode: 'nearest',
            },
            onHover: onHover,
            scales: {
                x: {
                    beginAtZero: origin === 0,
                    stacked: type === 'STACKED_BAR' || type === 'STACKED_LINE',
                    min: minX,
                    max: maxX,
                    ticks: {
                        callback: xTickCallback,
                        autoSkip: true,
                        maxTicksLimit: 50,
                        minRotation: 45,
                        maxRotation: 45,
                        sampleSize: 10,
                        display: !hideLegend,
                    },
                },
                y: {
                    beginAtZero: true,
                    stacked: type === 'STACKED_BAR' || type === 'STACKED_LINE',
                    min: minY,
                    max: maxY,
                    ticks: {
                        callback: yTickCallback,
                        autoSkip: true,
                        maxTicksLimit: 50,
                        sampleSize: 10,
                        display: !hideLegend,
                    },
                }
            },
            plugins: {
                decimation: {
                    enabled: true,
                    algorithm: 'lttb',
                    samples: 1000
                },
                tooltip: {
                    callbacks: {
                        label: function (context: TooltipItem<keyof ChartTypeRegistry>) {
                            const label = context.dataset.label || '';
                            const value = context.parsed.y ?? 0;
                            return `${label}: ${yCallback(value)}`;
                        },
                        title: function (context: TooltipItem<keyof ChartTypeRegistry>[]) {
                            const x = context[0].parsed.x;
                            const xValue = typeof x === 'number' ? x : Number(x ?? 0);
                            return timeFormatFunc(Number.isFinite(xValue) ? xValue : 0);
                        }
                    }
                },
                legend: {
                    display: !hideLegend,
                }
            },
            layout: {
                padding: hideLegend ? -100 : undefined
            },
        };

        return { chartData: parsedChartData, chartOptions: parsedChartOptions };
    }, [graph, type, theme, hideLegend, hideDots, aspectRatio, onHover]);

    const canvasStyle: React.CSSProperties = useMemo(() => ({
        display: 'inline-block',
        maxHeight: maxHeight,
        minHeight: minHeight,
    }), [maxHeight, minHeight]);

    const renderChart = () => {
        switch (type) {
            case 'STACKED_BAR':
            case 'SIDE_BY_SIDE_BAR':
                return <Bar data={chartData as ChartData<'bar'>} options={chartOptions as ChartOptions<'bar'>} style={canvasStyle} />;
            case 'HORIZONTAL_BAR':
                return <Bar data={chartData as ChartData<'bar'>} options={{ ...chartOptions, indexAxis: 'y' } as ChartOptions<'bar'>} style={canvasStyle} />;
            case 'STACKED_LINE':
            case 'FILLED_LINE':
            case 'LINE':
                return <Line data={chartData as ChartData<'line'>} options={chartOptions as ChartOptions<'line'>} style={canvasStyle} />;
            case 'SCATTER':
                return <Scatter data={chartData as ChartData<'scatter'>} options={chartOptions as ChartOptions<'scatter'>} style={canvasStyle} />;
            default:
                console.warn("Unknown chart type", type);
                return null;
        }
    };

    return (
        <div
            className={`bg-white dark:bg-slate-950 ${classes || ''} chart-container relative`}
            style={{ aspectRatio: aspectRatio, width: '100%', height: '100%' }}
        >
            {renderChart()}
        </div>
    );
});

SimpleChart.displayName = 'SimpleChart';

export default SimpleChart;