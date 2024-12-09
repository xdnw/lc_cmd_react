import React, {Component, createRef, RefObject, useRef, useState} from 'react';
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
    Filler, ChartEvent, ActiveElement, Chart, ChartTypeRegistry, Point, BubbleDataPoint, TooltipItem
} from 'chart.js';
import ChartDeferred from 'chartjs-plugin-deferred';
import { Bar, Line, Scatter } from 'react-chartjs-2';
import {WebGraph, GraphType, CoalitionGraphs, CoalitionGraph} from '../components/api/apitypes';
import chroma from 'chroma-js';
import distinctColors from 'distinct-colors'
import {getNumberFormatCallback, getTimeFormatCallback, isTime, toMillisFunction,
} from "../utils/StringUtil";
import {GLOBALSTATS, TRADEPRICEBYDAYJSON} from "../components/api/endpoints";
import {Button} from "../components/ui/button";

export function GraphTest() {
    // Removed trade graph, its just an example
    // return TRADEPRICEBYDAYJSON.useDisplay({
    //     args: {
    //         resources: "*",
    //         days: "300"
    //     },
    //     render: (graph: WebGraph) => {
    //         return <div className="bg-white dark:bg-black p-2">
    //             <ChartComponent graph={graph} type='LINE' />;
    //         </div>;
    //     }
    // })

    // I want to generate charts for each, type=SIDE_BY_SIDE_BAR chart by default, I can change it later

    const [graph, setGraph] = useState<WebGraph | null>(null);

    return (<>
        {TRADEPRICEBYDAYJSON.useForm({
            label: "Graph",
            handle_response: setGraph,
        })}
        {graph && (
            <div className="bg-white dark:bg-black p-2">
                <ChartComponent graph={graph} type={graph.type} theme='light' aspectRatio={2.5} />
            </div>
        )}

    </>);

    // return GLOBALSTATS.useDisplay({
    //     // {metrics: string, start: string, end: string, topX: string}
    //     args: {
    //         metrics: "SOLDIER_PCT,TANK_PCT,AIRCRAFT_PCT,SHIP_PCT",
    //         start: "30d",
    //         end: "0d",
    //         topX: "50"
    //     },
    //     render: (graphs: CoalitionGraphs) => {
    //         // graphs.spheres is CoalitionGraph[]
    //         // CoalitionGraph is
    //         //     name: string;
    //         //     alliances: { [index: string]: number };
    //         //     overall?: WebGraph;
    //         //     by_alliance: { [index: string]: WebGraph };
    //         // generate section for each, with title, then graphs
    //         // main graph at top, dropdown (hidden class toggle) for each alliance
    //         return (
    //             <div className="container">
    //                 {graphs.spheres.map((graph, index) => (
    //                     <CoalitionGraphComp key={index} graph={graph} type="LINE"/>
    //                 ))}
    //             </div>
    //         );
    //     }
    // })

}

export function CoalitionGraphComp({graph, type}: { graph: CoalitionGraph, type: GraphType }) {
    const [showAlliances, setShowAlliances] = useState(false);

    return (
        <div className="themeDiv bg-opacity-10 rounded my-2">
            <h2 className="text-xl font-bold">{graph.name}</h2>
            {graph.overall && (
                <div className="mb-2">
                    <ChartComponent graph={graph.overall} type={type} theme="light" aspectRatio={3} />
                </div>
            )}
            <div className="themeDiv bg-opacity-10 rounded mt-2">
                <Button variant="ghost" size="md"
                        className="text-xl w-full border-b border-secondary px-2 bg-primary/10 rounded-b justify-start"
                        onClick={() => setShowAlliances(!showAlliances)}
                >
                    {showAlliances ? 'Hide' : 'Show'} Alliance Graphs
                </Button>
                <div className={`transition-all duration-200 ease-in-out ${!showAlliances ? 'max-h-0 opacity-0 overflow-hidden' : 'p-2 opacity-100'}`}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1">
                        {Object.entries(graph.by_alliance).map(([allianceId, allianceGraph]) => (
                            <div key={allianceId} className="mb-1">
                                <h3 className="text-lg font-semibold">Alliance {allianceId}</h3>
                                <div className={`${!showAlliances ? 'hidden' : ''}`}>
                                    <ChartComponent graph={allianceGraph} type={type} theme="light" aspectRatio={1} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, Filler, Decimation, ChartDeferred);

interface ChartProps {
    graph: WebGraph;
    type: GraphType;
    theme: 'light' | 'dark';
    aspectRatio?: number;
}

interface ChartState {
    previousActiveElements: ActiveElement[];
}

class ChartComponent extends Component<ChartProps, ChartState> {
    chartRef: RefObject<ChartJS<keyof ChartTypeRegistry, (number | [number, number] | Point | BubbleDataPoint | null)[], unknown>> = createRef();

    constructor(props: ChartProps) {
        super(props);
        this.state = {
            previousActiveElements: []
        };
    }

    shouldComponentUpdate(nextProps: ChartProps) {
        return nextProps.graph !== this.props.graph || nextProps.type !== this.props.type || nextProps.theme !== this.props.theme;
    }

    componentWillUnmount() {
        if (this.chartRef.current) {
            console.log('destroying chart');
            this.chartRef.current.destroy();
        }
    }

    onHover = (evt: ChartEvent, activeElements: ActiveElement[], chart: Chart) => {
        const { previousActiveElements } = this.state;
        if (activeElements.length !== previousActiveElements.length ||
            activeElements.some((el, index) => el.datasetIndex !== previousActiveElements[index].datasetIndex || el.index !== previousActiveElements[index].index)) {
            chart.data.datasets.forEach((dataset) => {
                const currentColor = (dataset.backgroundColor + "") as string;
                dataset.backgroundColor = currentColor.replace(/[\d.]+\)$/g, '0.5)');
                dataset.pointRadius = 1;
            });

            if (activeElements && activeElements.length) {
                const datasetIndex = activeElements[0].datasetIndex;
                const activeDataset = chart.data.datasets[datasetIndex];
                const activeColor = (activeDataset.backgroundColor + "") as string;
                activeDataset.backgroundColor = activeColor.replace(/[\d.]+\)$/g, '1)');
                activeDataset.pointRadius = 2;
            }

            this.setState({ previousActiveElements: activeElements });
            chart.update();
        }
    };

    generateColors(n: number, background: 'white' | 'black' = 'white'): chroma.Color[] {
        const options = {
            count: n,
            lightMin: background === 'white' ? 30 : 15,
            lightMax: background === 'white' ? 85 : 85
        };
        return distinctColors(options);
    }

    render() {
        const { graph, type } = this.props;
        const origin = graph.origin ?? 0;
        const timeFormat = graph.time_format ?? "SI_UNIT";
        const numberFormat = graph.number_format ?? "SI_UNIT";

        const bg = this.props.theme === 'dark' ? 'black' : 'white';
        const colors: chroma.Color[] = this.generateColors(graph.labels.length, bg);
        const isTimeBool = isTime(timeFormat);
        let toMillisFunc = toMillisFunction(timeFormat);
        let timeFormatFunc = getTimeFormatCallback(isTimeBool ? 'MILLIS_TO_DATE' : timeFormat);

        let minX;
        let maxX;
        if (isTimeBool) {
            minX = toMillisFunc(graph.data[0][0] as number + origin);
            maxX = toMillisFunc(graph.data[0][graph.data[0].length - 1] as number + origin);
        } else if (type == 'SCATTER') {
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
        let chartData;
        if (type === 'SCATTER') {
            chartData = {
                datasets: graph.data.slice(1).map((dataSet, index) => ({
                    label: graph.labels[index],
                    data: dataSet.map((yValue, i) => ({
                        x: toMillisFunc(graph.data[0][i] as number + origin),
                        y: yValue
                    })),
                    backgroundColor: colors[index],
                    borderColor: colors[index],
                    borderWidth: 1,
                    pointRadius: 1,
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
            chartData = {
                labels: graph.data[0].map((xValue: number | string) => toMillisFunc(xValue as number + origin)),
                datasets: graph.data.slice(1).map((dataSet, index) => ({
                    label: graph.labels[index],
                    data: dataSet,
                    backgroundColor: `rgba(${colors[index].rgb()[0]}, ${colors[index].rgb()[1]}, ${colors[index].rgb()[2]}, 0.5)`,
                    borderColor: `rgba(${colors[index].rgb()[0]}, ${colors[index].rgb()[1]}, ${colors[index].rgb()[2]}, 1)`,
                    borderWidth: 1,
                    pointRadius: 1,
                    fill: type === 'STACKED_LINE' || type === "FILLED_LINE" ? '-1' : undefined,
                    pointHoverRadius: 5,
                    hitRadius: 100,
                    hoverBorderWidth: 3,
                }))
            };
        }

        const yCallback = getNumberFormatCallback(numberFormat);

        const chartOptions = {
            animation: false,
            responsive: true,
            aspectRatio: this.props.aspectRatio ?? 2,
            normalized: true,
            interaction: {
                mode: 'nearest',
            },
            onHover: this.onHover,
            scales: {
                x: {
                    beginAtZero: origin === 0,
                    stacked: type === 'STACKED_BAR' || type === 'STACKED_LINE',
                    ticks: {
                        callback: timeFormatFunc,
                        autoSkip: true,
                        maxTicksLimit: 50,
                        minRotation: 45, // Set your desired rotation value
                        maxRotation: 45, // Set your desired rotation value
                        sampleSize: 10, // Set your desired sample size
                        min: minX,
                        max: maxX,
                    }
                },
                y: {
                    beginAtZero: true,
                    stacked: type === 'STACKED_BAR' || type === 'STACKED_LINE',
                    ticks: {
                        callback: yCallback,
                        autoSkip: true,
                        maxTicksLimit: 50,
                        sampleSize: 10, // Set your desired sample size
                        min: minY,
                        max: maxY,
                    }
                }
            },
            plugins: {
                decimation: {
                    enabled: true,
                    algorithm: 'lttb', // 'lttb' (Largest Triangle Three Buckets) or 'min-max'
                    samples: 1000 // Number of samples to keep
                },
                deferred: {
                    xOffset: 15,   // defer until 150px of the canvas width are inside the viewport
                    yOffset: '5%', // defer until 50% of the canvas height are inside the viewport
                    delay: 0      // delay of 500 ms after the canvas is considered inside the viewport
                },
                tooltip: {
                    callbacks: {
                        label: function(context: TooltipItem<keyof ChartTypeRegistry>) {
                            const label = context.dataset.label || '';
                            const value = context.parsed.y;
                            return `${label}: ${yCallback(value)}`;
                        },
                        title: function(context: TooltipItem<keyof ChartTypeRegistry>[]) {
                            return timeFormatFunc(context[0].parsed.x);
                        }
                    }
                }
            }
        };

        const canvasStyle = {
            display: 'block'
        };

        return (
            <div className="bg-white dark:bg-black">
                {(() => {
                    switch (type) {
                        case 'STACKED_BAR':
                        case 'SIDE_BY_SIDE_BAR':
                            return <Bar ref={this.chartRef} data={chartData} options={chartOptions} style={canvasStyle} />;
                        case 'HORIZONTAL_BAR':
                            return <Bar ref={this.chartRef} data={chartData} options={{ ...chartOptions, indexAxis: 'y' }} style={canvasStyle} />;
                        case 'STACKED_LINE':
                        case 'FILLED_LINE':
                        case 'LINE':
                            return <Line ref={this.chartRef} data={chartData} options={chartOptions} style={canvasStyle} />;
                        case 'SCATTER':
                            return <Scatter ref={this.chartRef} data={chartData} options={chartOptions} style={canvasStyle} />;
                        default:
                            return null;
                    }
                })()}
            </div>
        );
    }
}

export default ChartComponent;