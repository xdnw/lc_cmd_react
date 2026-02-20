interface ProcessEnv {
    [key: string]: string | boolean | undefined;
    APPLICATION?: string;
    API_URL?: string;
    BACKEND_URL?: string;
    BASE_PATH?: string;
    BOT_ID?: string;
    BOT_INVITE?: string;
    NODE_ENV?: string;
    REPOSITORY_URL?: string;
    TEST?: boolean | string;
    WIKI_URL?: string;
}

interface Process {
    env: ProcessEnv;
}

declare const process: Process;
declare const global: typeof globalThis;
