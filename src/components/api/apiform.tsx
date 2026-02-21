import React, { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CommandStoreType, createCommandStore, createCommandStoreWithDef } from "@/utils/StateUtil.ts";
import { hasToken } from "@/utils/Auth.ts";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button.tsx";
import { cn, deepEqual } from "@/lib/utils.ts";
import { useDialog } from "../layout/DialogContext";
import { CommonEndpoint, QueryResult } from "../../lib/BulkQuery";
import { useDeepMemo } from "./bulkwrapper";
import { Argument } from "@/utils/Command";
import ArgInput from "../cmd/ArgInput";
import { ArgDescComponent } from "../cmd/CommandComponent";
import ArgFieldShell from "../cmd/field/ArgFieldShell";
import { singleQueryOptions } from "@/lib/queries";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Loading from "../ui/loading";
import { useStoreWithEqualityFn } from "zustand/traditional";

const MemoizedArgInput = React.memo(({ arg, setOutputValue, initialValue }: {
    arg: Argument,
    setOutputValue: (name: string, value: string) => void,
    initialValue: string,
}) => (
    <div className="relative">
        <ArgDescComponent arg={arg} />
        <ArgFieldShell className="rounded-t-none">
            <ArgInput
                argName={arg.name}
                breakdown={arg.getTypeBreakdown()}
                min={arg.arg.min}
                max={arg.arg.max}
                initialValue={initialValue}
                setOutputValue={setOutputValue}
            />
        </ArgFieldShell>
    </div>
), (prev, next) => prev.arg === next.arg && prev.setOutputValue === next.setOutputValue && prev.initialValue === next.initialValue);

export function ApiFormInputs<T, A extends { [key: string]: string | string[] | undefined }, B extends { [key: string]: string | string[] | undefined }>({
    endpoint, message, default_values, showArguments, includeDefaultArguments, label, handle_error, classes, handle_response, children
}: {
    readonly endpoint: CommonEndpoint<T, A, B>;
    message?: ReactNode;
    default_values?: B;
    showArguments?: (keyof A)[];
    includeDefaultArguments?: boolean;
    label?: ReactNode;
    handle_error?: (error: Error) => void;
    classes?: string;
    handle_response?: (data: Omit<QueryResult<T>, 'data'> & { data: NonNullable<QueryResult<T>['data']>; }) => void;
    readonly children?: (data: Omit<QueryResult<T>, 'data'> & { data: NonNullable<QueryResult<T>['data']>; }) => ReactNode;
}) {
    const { showDialog } = useDialog();
    const stableDefaults = useDeepMemo(default_values ?
        (Object.fromEntries(Object.entries(default_values).filter(([_, value]) => value !== undefined)) as { [k: string]: string | string[] }) : {});
    const required = useMemo(() => {
        const req: string[] = [];
        for (const [key, value] of Object.entries(endpoint.endpoint.args)) {
            if (!value.arg.optional && !Object.prototype.hasOwnProperty.call(stableDefaults, key)) {
                req.push(key);
            }
        }
        return req;
    }, [endpoint.endpoint.args, stableDefaults]);

    // use handleError unless not defined, then use showDialog
    const errorFinal = useCallback((error: Error) => {
        if (handle_error) {
            handle_error(error);
        }
        else {
            showDialog("Error", error.message);
        }
    }, [handle_error, showDialog]);


    const argNamesToShow = useMemo(() => {
        const names = new Set<string>();
        required.forEach((k) => names.add(k));
        (showArguments ?? []).forEach((k) => names.add(String(k)));
        return Array.from(names);
    }, [required, showArguments]);

    const filteredArgs = useMemo(() => {
        if (argNamesToShow.length === 0) return [];

        return argNamesToShow
            .map((name) => endpoint.endpoint.args[name])
            .filter(Boolean)
            .filter((arg) => includeDefaultArguments || !Object.prototype.hasOwnProperty.call(stableDefaults, arg.name));
    }, [argNamesToShow, endpoint.endpoint.args, stableDefaults, includeDefaultArguments]);

    // Then simplify renderFormInputs to use it
    const renderFormInputs = useCallback((props: { setOutputValue: (name: string, value: string) => void }) => {
        if (filteredArgs.length === 0) {
            return null;
        }

        return (
            <>
                {filteredArgs.map((arg) => (
                    (() => {
                        const defaultValue = stableDefaults[arg.name];
                        const initialValue = typeof defaultValue === "string"
                            ? defaultValue
                            : Array.isArray(defaultValue)
                                ? defaultValue.join(",")
                                : "";
                        return (
                            <MemoizedArgInput
                                key={arg.name}
                                arg={arg}
                                initialValue={initialValue}
                                setOutputValue={props.setOutputValue}
                            />
                        );
                    })()
                ))}
                <hr className="my-2" />
            </>
        );
    }, [filteredArgs, stableDefaults]);

    return (
        <ApiForm
            requireLogin={false}
            required={required}
            message={message}
            endpoint={endpoint}
            label={label}
            default_values={stableDefaults}
            form_inputs={renderFormInputs}
            handle_error={errorFinal}
            handle_response={handle_response}
            classes={classes}
        >{children}
        </ApiForm>
    );
}

interface FormInputsProps {
    setOutputValue: (name: string, value: string) => void;
}

function ApiForm<T, A extends { [key: string]: string | string[] | undefined }, B extends { [key: string]: string | string[] | undefined }>({
    requireLogin = false,
    message,
    endpoint,
    label = "submit",
    required = [],
    default_values,
    form_inputs: FormInputs,
    handle_error,
    classes,
    handle_response,
    children
}: {
    requireLogin?: boolean;
    message: ReactNode;
    readonly endpoint: CommonEndpoint<T, A, B>;
    label?: ReactNode;
    required?: string[];
    default_values?: { [k: string]: string | string[] };
    form_inputs: React.ComponentType<FormInputsProps> | undefined;
    handle_error?: (error: Error) => void;
    classes?: string;
    handle_response?: (data: Omit<QueryResult<T>, 'data'> & { data: NonNullable<QueryResult<T>['data']>; }) => void;
    readonly children?: (data: Omit<QueryResult<T>, 'data'> & {
        data: NonNullable<QueryResult<T>['data']>;
    }) => ReactNode;
}) {
    const [commandStore] = useState(() =>
        default_values && Object.keys(default_values).length
            ? createCommandStoreWithDef(default_values)
            : createCommandStore()
    );

    // Memoize UI sections to prevent unnecessary re-rendering
    const messageSection = useMemo(() => (
        <>
            {message}
            {message && required && required.length > 0 && <hr className="my-2" />}
        </>
    ), [message, required]);

    const apiHandlerSection = useMemo(() => (
        <ApiFormHandler
            endpoint={endpoint}
            store={commandStore}
            label={label}
            required={required}
            handle_error={handle_error}
            handle_response={handle_response}
            classes={classes}
        >
            {children}
        </ApiFormHandler>
    ), [endpoint, commandStore, label, required, handle_error, handle_response, classes, children]);

    if (requireLogin && !hasToken()) {
        return <>
            Please login first
            <br />
            <Button variant="outline" size="sm" className='border-red-800/70' asChild><Link to={`${process.env.BASE_PATH}home`}>Login</Link></Button>
        </>
    }

    const selectSetOutput = useCallback((state: { setOutput: (k: string, v: string) => void }) => state.setOutput, []);
    const setOutputValue = commandStore(selectSetOutput);

    return <>
        {messageSection}
        {FormInputs ? <FormInputs setOutputValue={setOutputValue} /> : null}
        {apiHandlerSection}
    </>
}

export default React.memo(ApiForm) as typeof ApiForm;

export function ApiFormHandler<T, A extends { [key: string]: string | string[] | undefined }, B extends { [key: string]: string | string[] | undefined }>({
    store, endpoint, label, required, handle_error, classes, handle_response, children
}: {
    store: CommandStoreType,
    readonly endpoint: CommonEndpoint<T, A, B>;
    label: ReactNode,
    required?: string[],
    handle_error?: (error: Error) => void,
    classes?: string,
    handle_response?: (data: Omit<QueryResult<T>, 'data'> & { data: NonNullable<QueryResult<T>['data']>; }) => void;
    readonly children?: (data: Omit<QueryResult<T>, 'data'> & { data: NonNullable<QueryResult<T>['data']>; }) => ReactNode;
}) {
    const selectMissing = useCallback(
        (state: { output: Record<string, string | string[]> }) =>
            (required ?? []).filter((field) => !state.output[field]),
        [required]
    );
    const missing = useStoreWithEqualityFn(store, selectMissing, deepEqual);

    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: (args: { readonly [key: string]: string | string[] }) =>
            queryClient.fetchQuery(singleQueryOptions(endpoint.endpoint, args, undefined, 10)),
        onSuccess: (result) => {
            const qr = result as QueryResult<T>;

            if (qr.error) {
                handle_error?.(new Error(qr.error));
                return;
            }
            if (!qr.data) {
                handle_error?.(new Error("No data returned"));
                return;
            }

            handle_response?.(qr as Omit<QueryResult<T>, "data"> & { data: NonNullable<QueryResult<T>["data"]> });
        },
        onError: (err) => {
            handle_error?.(err as Error);
        },
    });

    const data = mutation.data as QueryResult<T> | undefined;
    const isFetching = mutation.isPending;

    const submitForm = useCallback(() => {
        const args = store.getState().output as { readonly [key: string]: string | string[] };
        mutation.mutate(args);
    }, [store, mutation]);

    // Memoize the children/data section
    const renderedChildren = useMemo(() => {
        if (!children || !data?.data) return null;
        return children(data as Omit<QueryResult<T>, "data"> & { data: NonNullable<QueryResult<T>["data"]> });
    }, [data, children]);


    const submitButton = useMemo(() => {
        return (
            <Button
                variant="destructive"
                size="sm"
                className={cn(
                    "border-red-800/70 relative",
                    "me-1",
                    { "disabled cursor-wait": isFetching },
                    classes
                )}
                onClick={submitForm}
                disabled={isFetching}
            >
                <span className="flex items-center justify-center w-full">
                    <span className={isFetching ? "invisible" : "visible"}>
                        {label}
                    </span>
                    {isFetching && (
                        <span className="absolute inset-0 flex items-center justify-center">
                            <Loading size={3} variant={"ripple"} />
                        </span>
                    )}
                </span>
            </Button>
        );
    }, [isFetching, submitForm, label, classes]);

    // If there are missing required fields, show a notification
    if (missing.length) {
        return <p>Please provide a value for <kbd>{missing.join(", ")}</kbd></p>
    }

    return (
        <>
            {renderedChildren}
            {submitButton}
        </>
    );
}