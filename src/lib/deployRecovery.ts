const RECOVERABLE_ASSET_ERROR_PATTERN = /Failed to fetch dynamically imported module|Importing a module script failed|ChunkLoadError|Loading chunk [^\n]+ failed|Unable to preload CSS|dynamically imported module/i;

function getErrorText(error: unknown): string {
  if (typeof error === 'string') {
    return error;
  }

  if (error instanceof Error) {
    return [error.name, error.message, error.stack].filter(Boolean).join('\n');
  }

  if (error && typeof error === 'object') {
    const candidate = error as { message?: unknown; stack?: unknown; reason?: unknown; detail?: unknown };
    return [candidate.message, candidate.stack, candidate.reason, candidate.detail]
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .join('\n');
  }

  return String(error ?? 'Unknown error');
}

export function isLikelyRecoverableAssetError(error: unknown): boolean {
  return RECOVERABLE_ASSET_ERROR_PATTERN.test(getErrorText(error));
}

export function getRecoveryResetHref(): string {
  return '/reset.html';
}

export function getRecoveryTitle(error: unknown): string {
  return isLikelyRecoverableAssetError(error)
    ? 'This app tab is out of sync with the latest deploy.'
    : 'Page failed to load';
}

export function getRecoveryDetail(error: unknown): string {
  return getErrorText(error);
}

export function getRecoverySummary(error: unknown): string {
  if (isLikelyRecoverableAssetError(error)) {
    return 'This tab is likely using cached files from an older deploy. Reset cached app data and reload the app.';
  }

  return 'The page failed to load. You can reload the app, or reset cached app data if this started right after a deploy.';
}
