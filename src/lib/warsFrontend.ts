export const DEFAULT_WARS_FRONTEND_URL = "https://wars.locutus.link";

export function normalizeWarsFrontendUrl(baseUrl: string | undefined = process.env.WARS_FRONTEND_URL): string {
    const trimmed = baseUrl?.trim();
    const normalized = trimmed && trimmed.length > 0 ? trimmed : DEFAULT_WARS_FRONTEND_URL;
    return normalized.replace(/\/+$/, "");
}

export function buildWarsConflictsUrl(baseUrl: string | undefined = process.env.WARS_FRONTEND_URL): string {
    return `${normalizeWarsFrontendUrl(baseUrl)}/conflicts`;
}

export function buildWarsConflictUrl(
    conflictId: string | number,
    baseUrl: string | undefined = process.env.WARS_FRONTEND_URL,
): string {
    const params = new URLSearchParams({ id: String(conflictId) });
    return `${normalizeWarsFrontendUrl(baseUrl)}/conflict?${params.toString()}`;
}