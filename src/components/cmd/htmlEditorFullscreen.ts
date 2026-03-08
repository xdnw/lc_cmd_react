const HTML_EDITOR_FULLSCREEN_EVENT = 'html-editor-fullscreen-change';
const HTML_EDITOR_FULLSCREEN_COUNT_KEY = '__htmlEditorFullscreenCount';

type HtmlEditorFullscreenWindow = Window & {
  [HTML_EDITOR_FULLSCREEN_COUNT_KEY]?: number;
};

export function getHtmlEditorFullscreenEventName(): string {
  return HTML_EDITOR_FULLSCREEN_EVENT;
}

export function isHtmlEditorFullscreenActive(): boolean {
  if (typeof document === 'undefined') {
    return false;
  }

  return document.body.dataset.htmlEditorFullscreenActive === 'true';
}

export function updateGlobalHtmlEditorFullscreenState(delta: 1 | -1): void {
  if (typeof window === 'undefined') return;

  const fullscreenWindow = window as HtmlEditorFullscreenWindow;
  const nextCount = Math.max(
    0,
    (fullscreenWindow[HTML_EDITOR_FULLSCREEN_COUNT_KEY] ?? 0) + delta,
  );

  fullscreenWindow[HTML_EDITOR_FULLSCREEN_COUNT_KEY] = nextCount;

  if (nextCount > 0) {
    document.body.dataset.htmlEditorFullscreenActive = 'true';
  } else {
    delete document.body.dataset.htmlEditorFullscreenActive;
  }

  window.dispatchEvent(
    new CustomEvent(HTML_EDITOR_FULLSCREEN_EVENT, {
      detail: { active: nextCount > 0, count: nextCount },
    }),
  );
}