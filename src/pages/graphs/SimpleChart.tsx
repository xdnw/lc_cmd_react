import React, { Component, createRef, CSSProperties, RefObject, useCallback, useState } from 'react';
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
    Filler, ChartEvent, ActiveElement, Chart, ChartTypeRegistry, TooltipItem,
    ChartData, ChartOptions, ChartDataset
} from 'chart.js';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Bar, Line, Scatter } from 'react-chartjs-2';
import { WebGraph, GraphType, CoalitionGraph } from '../../lib/apitypes';
import chroma from 'chroma-js';
import distinctColors from 'distinct-colors'
import {
    downloadCells,
    ExportType,
    ExportTypes, formatDate, getNumberFormatCallback, getTimeFormatCallback, isTime, toMillisFunction,
} from "../../utils/StringUtil";
import { Button } from "../../components/ui/button";
import { deepEqual } from "../../lib/utils";
import { ChartJSOrUndefined } from 'node_modules/react-chartjs-2/dist/types';
import { Link } from "react-router-dom";
import { useTheme } from "../../components/ui/theme-provider";
import { useDialog } from "../../components/layout/DialogContext";
import { invertData } from "../../utils/MathUtil";

export function CoalitionGraphComponent({ graph, type }: { graph: CoalitionGraph, type: GraphType }) {
    const [showAlliances, setShowAlliances] = useState(false);
    const toggleAlliances = useCallback(() => {
        setShowAlliances(f => !f);
    }, [setShowAlliances]);

    return (
        <div className="themeDiv bg-opacity-10 rounded my-2">
            <h2 className="text-xl font-bold">{graph.name}</h2>
            {graph.overall && (
                <div className="mb-2">
                    <SimpleChart graph={graph.overall} type={type} theme="light" aspectRatio={3} />
                </div>
            )}
            <div className="themeDiv bg-opacity-10 rounded mt-2">
                <Button variant="ghost" size="md"
                    className="text-xl w-full border-b border-secondary px-2 bg-primary/10 rounded-b justify-start"
                    onClick={toggleAlliances}
                >
                    {showAlliances ? 'Hide' : 'Show'} Alliance Graphs
                </Button>
                <div className={`transition-all duration-200 ease-in-out ${!showAlliances ? 'max-h-0 opacity-0 overflow-hidden' : 'p-2 opacity-100'}`}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1">
                        {Object.entries(graph.alliances).map(([allianceName, allianceId]) => {
                            return <div key={allianceId} className="mb-1">
                                <h3 className="text-lg font-semibold">
                                    <Link to={`https://politicsandwar.com/alliance/id=${allianceId}`}>
                                        {allianceName}
                                    </Link>
                                </h3>
                                <div className={`${!showAlliances ? 'hidden' : ''}`}>
                                    <ThemedChart graph={graph.by_alliance[allianceId]} type={type} aspectRatio={1} />
                                </div>
                            </div>
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, Filler, Decimation);

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

interface ChartState {
    previousActiveElements: ActiveElement[];
}

function downloadGraph(graph: WebGraph, useClipboard: boolean, formatDates: boolean, type: ExportType): [string, string] {
    const header: string[] = [graph.x, ...graph.labels];
    const data = invertData(graph.data as (number | string)[][]);
    if (graph.origin) {
        console.log("Adding origin", graph.origin);
        for (let i = 0; i < data.length; i++) {
            (data[i][0] as number) += graph.origin;
        }
    }
    if (formatDates && graph.time_format && isTime(graph.time_format)) {
        const toMillis = toMillisFunction(graph.time_format);
        for (let i = 0; i < data.length; i++) {
            data[i][0] = formatDate(toMillis(data[i][0] as number))
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

export function ChartWithButtons({ graph, endpointName, usedArgs }:
    {
        graph: WebGraph,
        endpointName?: string,
        usedArgs?: { [key: string]: string | string[] | undefined }
    }) {
    const { showDialog } = useDialog();

    const downloadAction = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        // data-clipboard
        // data-type
        const useClipboard = e.currentTarget.dataset.clipboard === "true";
        const typeKey = e.currentTarget.dataset.type as string;
        const type = typeKey && (typeKey in ExportTypes)
            ? ExportTypes[typeKey as keyof typeof ExportTypes]
            : ExportTypes.CSV; // Provide a default value
        const formatDates = true;
        const [title, content] = downloadGraph(graph, useClipboard, formatDates, type);
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

    return <>
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
        {endpointName && <Button
            variant="outline"
            size="sm"
            onClick={copyShare}
        >
            Share
        </Button>}
        <div className="w-full pt mt-1">
            <h1 className="relative text-2xl font-bold text-center bg-primary/10 border border-primary/20 rounded-t">
                {graph.title}</h1>
            <ThemedChart graph={graph} />
        </div>
    </>
}

export function ThemedChart({ graph, type, aspectRatio, hideLegend, hideDots, minHeight, maxHeight, classes }: ChartProps) {
    const { theme } = useTheme()
    console.log("Creating themed chart");
    return <SimpleChart graph={graph} type={type} theme={theme} aspectRatio={aspectRatio} hideLegend={hideLegend} hideDots={hideDots} minHeight={minHeight} maxHeight={maxHeight} classes={classes} />;
}

const COLOR_CACHE: { [key: string]: chroma.Color[] } = {};

class SimpleChart extends Component<ChartProps, ChartState> {
    chartRef = createRef<ChartJSOrUndefined>();
    // workerRef: Worker | null = null;
    chartData: ChartData<keyof ChartTypeRegistry> | null = null;
    chartOptions: ChartOptions<keyof ChartTypeRegistry> | null = null;
    canvasStyle: CSSProperties | undefined = undefined;
    type: GraphType = 'LINE';

    constructor(props: ChartProps) {
        super(props);
        this.state = {
            previousActiveElements: []
        };
    }

    shouldComponentUpdate(nextProps: ChartProps) {
        return !deepEqual(nextProps.graph, this.props.graph) || nextProps.type !== this.props.type;
    }

    componentWillUnmount() {
        // if (this.workerRef) {
        //     this.workerRef.terminate();
        // }
        if (this.chartRef.current) {
            console.log("Destroying chart");
            this.chartRef.current.destroy();
        }
    }

    // componentDidMount() {
    // this.workerRef = new Worker();
    // this.workerRef.onmessage = (event: MessageEvent) => {
    //     const { type, options, canvas } = event.data;
    //     if (type === 'chartCreated') {
    //         console.log('Chart created:', canvas);
    //     }
    // };
    // if (this.chartRef.current) {
    //     const canvas = this.chartRef.current.canvas;
    //     const offscreenCanvas = canvas.transferControlToOffscreen();
    //     this.workerRef.postMessage({ type: 'createChart', options: this.chartOptions, canvas: offscreenCanvas }, [offscreenCanvas]);
    // }
    // }

    onHover = (evt: ChartEvent, activeElements: ActiveElement[], chart: Chart) => {
        if (this.props.hideDots) return;
        const { previousActiveElements } = this.state;

        const lastActiveIds: Set<number> = new Set(previousActiveElements.map((el) => el.datasetIndex));
        const nowActiveIds: Set<number> = new Set(activeElements.map((el) => el.datasetIndex));

        if (lastActiveIds.size !== nowActiveIds.size || [...lastActiveIds].some((id) => !nowActiveIds.has(id))) {
            chart.data.datasets.forEach((dataset, index) => {
                if (lastActiveIds.has(index) && !nowActiveIds.has(index)) {
                    if (dataset.backgroundColor) {
                        let currentColor: string;
                        if (typeof dataset.backgroundColor === 'object' && 'css' in dataset.backgroundColor) {
                            currentColor = (dataset.backgroundColor as { css: () => string }).css();
                        } else {
                            currentColor = dataset.backgroundColor as string;
                        }
                        dataset.backgroundColor = currentColor.replace(/[\d.]+\)$/g, '0.5)');
                    }
                    (dataset as ChartDataset<'line'>).pointRadius = 0;
                }
            });

            if (activeElements && activeElements.length) {
                const datasetIndex = activeElements[0].datasetIndex;
                if (!lastActiveIds.has(datasetIndex)) {
                    const activeDataset = chart.data.datasets[datasetIndex] as ChartDataset<'line'>;
                    if (activeDataset.backgroundColor) {
                        let activeColor: string;
                        if (typeof activeDataset.backgroundColor === 'object' && 'css' in activeDataset.backgroundColor) {
                            activeColor = (activeDataset.backgroundColor as { css: () => string }).css();
                        } else {
                            activeColor = activeDataset.backgroundColor as string;
                        }
                        activeDataset.backgroundColor = activeColor.replace(/[\d.]+\)$/g, '1)');
                    }
                    activeDataset.pointRadius = 2;
                }
            }

            this.setState({ previousActiveElements: activeElements });
            chart.update();
        }
    };

    generateColors(n: number, background: 'white' | 'black' = 'white'): chroma.Color[] {
        const cacheKey = `${n}-${background}`;
        const existing = COLOR_CACHE[cacheKey];
        if (existing) {
            return existing;
        }

        const options = {
            count: n,
            lightMin: background === 'white' ? 30 : 15,
            lightMax: background === 'white' ? 85 : 85
        };
        const colors = distinctColors(options);
        COLOR_CACHE[cacheKey] = colors;
        return colors;
    }

    initializeChartOptions() {
        if (this.canvasStyle) return;
        const graph = this.props.graph;
        this.type = this.props.type ?? graph.type ?? "LINE";
        const origin = graph.origin ?? 0;
        const timeFormat = graph.time_format ?? "SI_UNIT";
        const numberFormat = graph.number_format ?? "SI_UNIT";

        const bg = this.props.theme === 'dark' ? 'black' : 'white';
        const colors: chroma.Color[] = this.generateColors(graph.labels.length, bg);
        const isTimeBool = isTime(timeFormat);
        const toMillisFunc = toMillisFunction(timeFormat);
        let timeFormatFunc = getTimeFormatCallback(isTimeBool ? 'MILLIS_TO_DATE' : timeFormat);

        let minX;
        let maxX;
        if (isTimeBool) {
            minX = toMillisFunc(graph.data[0][0] as number + origin);
            maxX = toMillisFunc(graph.data[0][graph.data[0].length - 1] as number + origin);
        } else if (this.type == 'SCATTER') {
            minX = Math.min(...graph.data[0] as number[]);
            maxX = Math.max(...graph.data[0] as number[]);
        } else {
            minX = graph.data[0][0] as number + origin;
            maxX = graph.data[0][graph.data[0].length - 1] as number + origin;
        }

        let minY;
        let maxY;
        if (numberFormat === "PERCENTAGE_ONE") {
            minY = 0;
            maxY = 1;
        } else {
            minY = Math.min(...graph.data.slice(1).map((dataSet) => Math.min(...dataSet as number[])));
            maxY = Math.max(...graph.data.slice(1).map((dataSet) => Math.max(...dataSet as number[])));
        }

        if (this.type === 'SCATTER') {
            this.chartData = {
                datasets: graph.data.slice(1).map((dataSet, index) => ({
                    label: graph.labels[index],
                    data: dataSet.map((yValue, i) => ({
                        x: toMillisFunc(graph.data[0][i] as number + origin),
                        y: yValue as number // Ensure y is a number
                    })),
                    backgroundColor: colors[index].css(), // Convert chroma.Color to string
                    borderColor: colors[index].css(), // Convert chroma.Color to string
                    borderWidth: this.props.hideDots ? 1 : 1,
                    pointRadius: this.props.hideDots ? 0 : 1,
                    pointHoverRadius: 5,
                    hitRadius: 100
                }))
            };
        } else {
            if (isTimeBool) {
                const parent = getTimeFormatCallback(timeFormat);
                timeFormatFunc = (value: number) => parent(graph.data[0][value] as number + origin);
            } else {
                const parent = timeFormatFunc;
                timeFormatFunc = (value: number) => parent(graph.data[0][value] as number + origin);
            }
            const data0 = graph.data[0] as number[];
            const labels = data0.map(value => toMillisFunc(value + origin));
            this.chartData = {
                labels: labels,
                datasets: graph.data.slice(1).map((dataSet, index) => ({
                    label: graph.labels[index],
                    data: dataSet as number[],
                    backgroundColor: `rgba(${colors[index].rgb()[0]}, ${colors[index].rgb()[1]}, ${colors[index].rgb()[2]}, 0.5)`,
                    borderColor: `rgba(${colors[index].rgb()[0]}, ${colors[index].rgb()[1]}, ${colors[index].rgb()[2]}, 1)`,
                    borderWidth: this.props.hideDots ? 1 : 1,
                    pointRadius: this.props.hideDots ? 0 : 1,
                    fill: this.type === 'STACKED_LINE' || this.type === "FILLED_LINE" ? '-1' : undefined,
                    pointHoverRadius: 5,
                    hitRadius: 100,
                    hoverBorderWidth: 3,
                }))
            };
        }



        const yCallback = getNumberFormatCallback(numberFormat);

        this.chartOptions = {
            spanGaps: true,
            resizeDelay: 20,
            animation: false,
            responsive: true,
            aspectRatio: this.props.aspectRatio ?? 2,
            maintainAspectRatio: false,
            normalized: true,
            // parsing: false, faster, but breaks everything, so...
            interaction: {
                mode: 'nearest',
            },
            onHover: this.onHover,
            scales: {
                x: {
                    beginAtZero: origin === 0,
                    stacked: this.type === 'STACKED_BAR' || this.type === 'STACKED_LINE',
                    ticks: {
                        callback: timeFormatFunc,
                        autoSkip: true,
                        maxTicksLimit: 50,
                        minRotation: 45,
                        maxRotation: 45,
                        sampleSize: 10,
                        min: minX,
                        max: maxX,
                        display: !this.props.hideLegend,
                    },
                },
                y: {
                    beginAtZero: true,
                    stacked: this.type === 'STACKED_BAR' || this.type === 'STACKED_LINE',
                    ticks: {
                        callback: yCallback,
                        autoSkip: true,
                        maxTicksLimit: 50,
                        sampleSize: 10,
                        min: minY,
                        max: maxY,
                        display: !this.props.hideLegend,
                    },
                }
            },
            plugins: {
                decimation: {
                    enabled: true,
                    algorithm: 'lttb',
                    samples: 1000
                },
                deferred: {
                    xOffset: 15,
                    yOffset: '5%',
                    delay: 0
                },
                tooltip: {
                    callbacks: {
                        label: function (context: TooltipItem<keyof ChartTypeRegistry>) {
                            const label = context.dataset.label || '';
                            const value = context.parsed.y;
                            return `${label}: ${yCallback(value)}`;
                        },
                        title: function (context: TooltipItem<keyof ChartTypeRegistry>[]) {
                            return timeFormatFunc(context[0].parsed.x);
                        }
                    }
                },
                legend: {
                    display: !this.props.hideLegend,
                }
            },
            layout: {
                padding: this.props.hideLegend ? -100 : undefined
            },
        } as ChartOptions<keyof ChartTypeRegistry>;

        this.canvasStyle = {
            display: 'inline-block',
            maxHeight: this.props.maxHeight,
            minHeight: this.props.minHeight,
        };
    }

    render() {
        console.log("CHART RENDER");
        this.initializeChartOptions();
        return (
            // this.props.aspectRatio ?? 2
            <div className={`bg-white dark:bg-slate-950 ${this.props.classes} chart-container relative`}
                style={{ aspectRatio: this.props.aspectRatio ?? 2, width: '100%', height: '100%' }}>
                {(() => {
                    switch (this.type) {
                        case 'STACKED_BAR':
                        case 'SIDE_BY_SIDE_BAR':
                            return <Bar ref={this.chartRef as RefObject<ChartJSOrUndefined<"bar", unknown, unknown>>} data={this.chartData as ChartData<'bar'>} options={this.chartOptions as ChartOptions<'bar'>} style={this.canvasStyle} />;
                        case 'HORIZONTAL_BAR':
                            return <Bar ref={this.chartRef as RefObject<ChartJSOrUndefined<"bar", unknown, unknown>>} data={this.chartData as ChartData<'bar'>} options={{ ...this.chartOptions, indexAxis: 'y' } as ChartOptions<'bar'>} style={this.canvasStyle} />;
                        case 'STACKED_LINE':
                        case 'FILLED_LINE':
                        case 'LINE':
                            return <Line ref={this.chartRef as RefObject<ChartJSOrUndefined<"line", unknown, unknown>>} data={this.chartData as ChartData<'line'>} options={this.chartOptions as ChartOptions<'line'>} style={this.canvasStyle} />;
                        case 'SCATTER':
                            return <Scatter ref={this.chartRef as RefObject<ChartJSOrUndefined<"scatter", unknown, unknown>>} data={this.chartData as ChartData<'scatter'>} options={this.chartOptions as ChartOptions<'scatter'>} style={this.canvasStyle} />;
                        default:
                            console.log("Unknown chart type", this.props.type);
                            return null;
                    }
                })()}
            </div>
        );
    }
}

export default SimpleChart;