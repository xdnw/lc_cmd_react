import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
} from 'react';
import type {
  ChangeEvent,
  ClipboardEvent as ReactClipboardEvent,
  DragEvent as ReactDragEvent,
  MouseEvent as ReactMouseEvent,
} from 'react';
import SunEditor from 'suneditor-react';
import DOMPurify from 'dompurify';
import 'suneditor/dist/css/suneditor.min.css';
import './HtmlEditor.css';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { updateGlobalHtmlEditorFullscreenState } from './htmlEditorFullscreen';

export type HtmlEditorProps = {
  argName: string;
  initialValue: string;
  compact?: boolean;
  setOutputValue: (name: string, value: string) => void;
};

type EditorMode = 'wysiwyg' | 'raw';

type SunEditorInstance = {
  setContents: (html: string) => void;
  insertHTML: (html: string) => void;
  focus: () => void;
  getContents?: (onlyContents?: boolean) => string;
  core?: {
    context?: {
      element?: {
        wysiwyg?: HTMLElement;
      };
    };
  };
};

type SunEditorUploadHandler = (response: {
  result: Array<{
    url: string;
    name: string;
    size: number;
  }>;
}) => void;

type CaretDocument = Document & {
  caretPositionFromPoint?: (
    x: number,
    y: number,
  ) => { offsetNode: Node; offset: number } | null;
  caretRangeFromPoint?: (x: number, y: number) => Range | null;
};

const TOOLBAR_BUTTONS: string[][] = [
  [
    'undo',
    'redo',

    'font',
    'fontSize',
    'formatBlock',
    'paragraphStyle',
    'blockquote',

    'bold',
    'underline',
    'italic',
    'strike',
    'subscript',
    'superscript',

    'fontColor',
    'hiliteColor',
    'textStyle',
    'removeFormat',

    'outdent',
    'indent',
    'align',
    'horizontalRule',
    'list',
    'lineHeight',

    'table',
    'link',
    'image',
    'video',

    'showBlocks',
  ],
];

const EMIT_DEBOUNCE_MS = 250;
const MAX_EMBEDDED_IMAGE_BYTES = 5 * 1024 * 1024;

const EMBEDDABLE_IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp',
  'image/bmp',
  'image/avif',
  'image/apng',
]);

const EMBEDDABLE_IMAGE_ACCEPT = Array.from(EMBEDDABLE_IMAGE_TYPES).join(',');

const EMPTY_EDITOR_HTML_RE =
  /^(?:\s|&nbsp;|<br\s*\/?>|<p>(?:\s|&nbsp;|<br\s*\/?>)*<\/p>)*$/i;

const SAFE_DATA_IMAGE_RE =
  /^data:image\/(?:png|jpeg|jpg|gif|webp|bmp|avif|apng);base64,[a-z0-9+/=\s]+$/i;

const TOGGLE_BUTTON_BASE_CLASS = [
  'rounded',
  'px-2',
  'py-1',
  'text-[11px]',
  'font-medium',
  'leading-none',
  'transition-colors',
  'focus-visible:outline-none',
  'focus-visible:ring-2',
  'focus-visible:ring-slate-300',
  'dark:focus-visible:ring-slate-700',
].join(' ');

const TOGGLE_BUTTON_ACTIVE_CLASS = [
  'bg-white',
  'text-slate-900',
  'shadow-sm',
  'dark:bg-slate-800',
  'dark:text-slate-100',
].join(' ');

const TOGGLE_BUTTON_INACTIVE_CLASS = [
  'text-slate-600',
  'hover:bg-white/80',
  'dark:text-slate-400',
  'dark:hover:bg-slate-800/70',
].join(' ');

function normalizeHtml(value: string): string {
  const cleaned = value.replace(/\u200B/g, '').trim();
  return EMPTY_EDITOR_HTML_RE.test(cleaned) ? '' : value;
}

function isSafeImageSrc(src: string): boolean {
  const trimmed = src.trim();
  if (!trimmed || trimmed.startsWith('#')) return false;

  if (SAFE_DATA_IMAGE_RE.test(trimmed)) return true;
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return false;

  const base =
    typeof window !== 'undefined' && window.location.origin !== 'null'
      ? window.location.origin
      : 'https://local.invalid';

  try {
    const url = new URL(trimmed, base);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function sanitizeEditorHtml(value: string): string {
  const clean = String(
    DOMPurify.sanitize(normalizeHtml(value), {
      USE_PROFILES: { html: true },
      FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed'],
      ADD_DATA_URI_TAGS: ['img'],
    }),
  );

  if (typeof window === 'undefined') {
    return clean;
  }

  const container = window.document.createElement('div');
  container.innerHTML = clean;

  container.querySelectorAll('img').forEach((img) => {
    const src = img.getAttribute('src') ?? '';
    if (!isSafeImageSrc(src)) {
      img.remove();
      return;
    }

    img.removeAttribute('srcset');
    img.setAttribute('loading', 'lazy');
    img.setAttribute('decoding', 'async');
  });

  container.querySelectorAll('a[target="_blank"]').forEach((link) => {
    const rel = new Set(
      (link.getAttribute('rel') ?? '')
        .split(/\s+/)
        .map((part) => part.trim())
        .filter(Boolean),
    );
    rel.add('noopener');
    rel.add('noreferrer');
    link.setAttribute('rel', Array.from(rel).join(' '));
  });

  return container.innerHTML;
}

function isFileLike(value: unknown): value is File {
  return (
    typeof value === 'object' &&
    value !== null &&
    'name' in value &&
    'size' in value &&
    'type' in value
  );
}

function getImageFilesFromDataTransfer(
  dataTransfer?: DataTransfer | null,
): File[] {
  if (!dataTransfer) return [];

  const fromItems = Array.from(dataTransfer.items ?? [])
    .filter((item) => item.kind === 'file')
    .map((item) => item.getAsFile())
    .filter(
      (file): file is File =>
        !!file && EMBEDDABLE_IMAGE_TYPES.has(file.type.toLowerCase()),
    );

  if (fromItems.length) return fromItems;

  return Array.from(dataTransfer.files ?? []).filter((file) =>
    EMBEDDABLE_IMAGE_TYPES.has(file.type.toLowerCase()),
  );
}

function filterEmbeddableFiles(files: File[]): File[] {
  const usableFiles: File[] = [];

  for (const file of files) {
    const type = file.type.toLowerCase();

    if (!EMBEDDABLE_IMAGE_TYPES.has(type)) {
      console.warn(`[HtmlEditor] Skipping unsupported image type: ${file.type}`);
      continue;
    }

    if (file.size > MAX_EMBEDDED_IMAGE_BYTES) {
      console.warn(
        `[HtmlEditor] Skipping "${file.name}" because it is larger than ${
          MAX_EMBEDDED_IMAGE_BYTES / (1024 * 1024)
        }MB.`,
      );
      continue;
    }

    usableFiles.push(file);
  }

  return usableFiles;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }

      reject(new Error('Could not read image as data URL.'));
    };

    reader.onerror = () => {
      reject(reader.error ?? new Error('Could not read image file.'));
    };

    reader.readAsDataURL(file);
  });
}

async function imageFilesToEmbeds(
  files: File[],
): Promise<Array<{ src: string; name: string; size: number }>> {
  const usableFiles = filterEmbeddableFiles(files);
  if (!usableFiles.length) return [];

  const urls = await Promise.all(usableFiles.map(fileToDataUrl));

  return urls.map((src, index) => ({
    src,
    name: usableFiles[index].name,
    size: usableFiles[index].size,
  }));
}

async function imageFilesToHtml(files: File[]): Promise<string> {
  const embeds = await imageFilesToEmbeds(files);
  if (!embeds.length) return '';

  return embeds.map((embed) => `<p><img src="${embed.src}" alt="" /></p>`).join('');
}

function captureSelectionRange(): Range | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  return selection.getRangeAt(0).cloneRange();
}

function restoreSelectionRange(range: Range | null): void {
  if (!range) return;

  const selection = window.getSelection();
  if (!selection) return;

  selection.removeAllRanges();
  selection.addRange(range);
}

function placeCaretFromPoint(root: HTMLElement, x: number, y: number): void {
  const doc = document as CaretDocument;
  const selection = window.getSelection();
  if (!selection) return;

  let range: Range | null = null;

  if (doc.caretPositionFromPoint) {
    const pos = doc.caretPositionFromPoint(x, y);
    if (pos && root.contains(pos.offsetNode)) {
      range = document.createRange();
      range.setStart(pos.offsetNode, pos.offset);
      range.collapse(true);
    }
  } else if (doc.caretRangeFromPoint) {
    const found = doc.caretRangeFromPoint(x, y);
    if (found && root.contains(found.startContainer)) {
      range = found;
    }
  }

  if (!range) return;

  selection.removeAllRanges();
  selection.addRange(range);
}

function HtmlEditorComponent({
  argName,
  initialValue,
  compact = false,
  setOutputValue,
}: HtmlEditorProps) {
  const [mode, setMode] = useState<EditorMode>('wysiwyg');
  const [html, setHtml] = useState<string>(() =>
    sanitizeEditorHtml(initialValue ?? ''),
  );

  const editorRef = useRef<SunEditorInstance | null>(null);
  const editorShellRef = useRef<HTMLDivElement | null>(null);
  const fullscreenDialogHostRef = useRef<HTMLElement | null>(null);
  const rawTextAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const htmlRef = useRef<string>(sanitizeEditorHtml(initialValue ?? ''));
  const currentArgRef = useRef<string>(argName);
  const lastEmittedSanitizedRef = useRef<string>('');
  const cleanupEditorListenersRef = useRef<(() => void) | null>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenHost, setFullscreenHost] = useState<'body' | 'dialog'>('body');

  const handleEnterFullscreen = useCallback(function handleEnterFullscreen(): void {
    const dialogHost = editorShellRef.current?.closest('[role="dialog"]');
    const nextHost = dialogHost instanceof HTMLElement ? dialogHost : null;

    fullscreenDialogHostRef.current = nextHost;
    setFullscreenHost(nextHost ? 'dialog' : 'body');
    setIsFullscreen(true);
  }, []);

  const handleExitFullscreen = useCallback(function handleExitFullscreen(): void {
    setIsFullscreen(false);
  }, []);

  const handleFullscreenOverlayClick = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) {
        setIsFullscreen(false);
      }
    },
    [],
  );

  useEffect(function syncFullscreenSideEffects(): (() => void) | void {
    if (!isFullscreen) return;

    const previousOverflow = document.body.style.overflow;
    const dialogHost = fullscreenDialogHostRef.current;

    updateGlobalHtmlEditorFullscreenState(1);

    if (dialogHost) {
      dialogHost.dataset.htmlEditorFullscreen = 'true';
    }

    function handleWindowKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        setIsFullscreen(false);
      }
    }

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleWindowKeyDown);

    return function cleanup(): void {
      if (dialogHost?.dataset.htmlEditorFullscreen === 'true') {
        delete dialogHost.dataset.htmlEditorFullscreen;
      }

      updateGlobalHtmlEditorFullscreenState(-1);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleWindowKeyDown);
      fullscreenDialogHostRef.current = null;
    };
  }, [isFullscreen]);

  const editorHeight = useMemo(function getEditorHeight(): string {
    if (isFullscreen) {
      return 'calc(100vh - 5.5rem)';
    }

    return compact ? '160px' : '280px';
  }, [compact, isFullscreen]);

  const editorSkinClassName = useMemo(
    () =>
      compact
        ? 'suneditor-theme suneditor-theme--compact'
        : 'suneditor-theme',
    [compact],
  );

  const shellClassName = useMemo(function getShellClassName(): string {
    return cn(
      'relative rounded-lg border border-slate-200 bg-white text-slate-900 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100',
      isFullscreen
        ? 'flex h-full w-full min-h-0 flex-col overflow-hidden rounded-none border-0 shadow-none'
        : 'overflow-visible',
      compact && !isFullscreen && 'text-sm',
    );
  }, [compact, isFullscreen]);

  const panelClassName = useMemo(function getPanelClassName(): string {
    return cn(
      'bg-white dark:bg-slate-950',
      isFullscreen && 'min-h-0 flex-1 overflow-auto',
    );
  }, [isFullscreen]);

  const rawTextAreaClassName = useMemo(
    function getRawTextAreaClassName(): string {
      return cn(
        'block w-full border-0 bg-transparent px-3 py-2.5 font-mono text-[13px] leading-5 text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500',
        isFullscreen
          ? 'h-[calc(100vh-5.5rem)] min-h-0 resize-none'
          : compact
            ? 'min-h-[160px] resize-y'
            : 'min-h-[280px] resize-y',
      );
    },
    [compact, isFullscreen],
  );

  const setLocalHtml = useCallback((next: string) => {
    htmlRef.current = next;
    setHtml(next);
  }, []);

  const emitSanitizedValue = useCallback(() => {
    const sanitized = sanitizeEditorHtml(htmlRef.current);
    lastEmittedSanitizedRef.current = sanitized;
    setOutputValue(argName, sanitized);
  }, [argName, setOutputValue]);

  const sunEditorOptions = useMemo(
    function getSunEditorOptions() {
      return {
        height: editorHeight,
        minHeight: editorHeight,
        maxHeight: isFullscreen ? editorHeight : compact ? editorHeight : '640px',
        defaultTag: 'p',
        imageAccept: EMBEDDABLE_IMAGE_ACCEPT,
        imageFileInput: true,
        imageUrlInput: true,
        resizingBar: false,
        showPathLabel: false,
        placeholder: 'Write here...',
        buttonList: TOOLBAR_BUTTONS,
      };
    },
    [compact, editorHeight, isFullscreen],
  );

  useEffect(() => {
    const next = sanitizeEditorHtml(initialValue ?? '');
    const argChanged = currentArgRef.current !== argName;
    currentArgRef.current = argName;

    if (!argChanged) {
      const currentSanitized = sanitizeEditorHtml(htmlRef.current);

      if (
        next === currentSanitized ||
        next === lastEmittedSanitizedRef.current
      ) {
        return;
      }
    }

    setLocalHtml(next);
    editorRef.current?.setContents(next);
  }, [argName, initialValue, setLocalHtml]);

  useEffect(() => {
    const timer = window.setTimeout(emitSanitizedValue, EMIT_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [html, emitSanitizedValue]);

  useEffect(() => {
    return () => {
      cleanupEditorListenersRef.current?.();

      const sanitized = sanitizeEditorHtml(htmlRef.current);
      if (sanitized !== lastEmittedSanitizedRef.current) {
        lastEmittedSanitizedRef.current = sanitized;
        setOutputValue(argName, sanitized);
      }
    };
  }, [argName, setOutputValue]);

  const handleShowWysiwyg = useCallback(() => {
    const sanitized = sanitizeEditorHtml(htmlRef.current);
    if (sanitized !== htmlRef.current) {
      setLocalHtml(sanitized);
    }
    setMode('wysiwyg');
  }, [setLocalHtml]);

  const handleShowRaw = useCallback(() => {
    setMode('raw');
  }, []);

  const insertIntoRaw = useCallback(
    (snippet: string, selectionStart?: number, selectionEnd?: number) => {
      const textarea = rawTextAreaRef.current;
      const current = htmlRef.current;
      const start = selectionStart ?? textarea?.selectionStart ?? current.length;
      const end = selectionEnd ?? textarea?.selectionEnd ?? current.length;

      const next = current.slice(0, start) + snippet + current.slice(end);
      setLocalHtml(next);

      requestAnimationFrame(() => {
        if (!textarea) return;
        textarea.focus();
        const cursor = start + snippet.length;
        textarea.setSelectionRange(cursor, cursor);
      });
    },
    [setLocalHtml],
  );

  const insertIntoEditor = useCallback(
    (snippet: string, range?: Range | null) => {
      const editor = editorRef.current;
      if (!editor) return;

      editor.focus();
      restoreSelectionRange(range ?? null);
      editor.insertHTML(snippet);

      requestAnimationFrame(() => {
        const next = editor.getContents?.();
        if (typeof next === 'string') {
          setLocalHtml(next);
        }
      });
    },
    [setLocalHtml],
  );

  const bindEditorDomListeners = useCallback(
    (instance: SunEditorInstance | null) => {
      cleanupEditorListenersRef.current?.();
      cleanupEditorListenersRef.current = null;

      if (!instance) return;

      const editable = instance.core?.context?.element?.wysiwyg;
      if (!editable) return;

      const handlePaste = (event: ClipboardEvent) => {
        const files = getImageFilesFromDataTransfer(event.clipboardData);
        if (!files.length) return;

        event.preventDefault();
        const range = captureSelectionRange();

        void (async () => {
          const snippet = await imageFilesToHtml(files);
          if (snippet) {
            insertIntoEditor(snippet, range);
          }
        })();
      };

      const handleDrop = (event: DragEvent) => {
        const files = getImageFilesFromDataTransfer(event.dataTransfer);
        if (!files.length) return;

        event.preventDefault();
        placeCaretFromPoint(editable, event.clientX, event.clientY);
        const range = captureSelectionRange();

        void (async () => {
          const snippet = await imageFilesToHtml(files);
          if (snippet) {
            insertIntoEditor(snippet, range);
          }
        })();
      };

      const handleDragOver = (event: DragEvent) => {
        if (getImageFilesFromDataTransfer(event.dataTransfer).length) {
          event.preventDefault();
        }
      };

      editable.addEventListener('paste', handlePaste);
      editable.addEventListener('drop', handleDrop);
      editable.addEventListener('dragover', handleDragOver);

      cleanupEditorListenersRef.current = () => {
        editable.removeEventListener('paste', handlePaste);
        editable.removeEventListener('drop', handleDrop);
        editable.removeEventListener('dragover', handleDragOver);
      };
    },
    [insertIntoEditor],
  );

  const handleEditorInstance = useCallback(
    (instance: unknown) => {
      const typedInstance = instance as SunEditorInstance;
      editorRef.current = typedInstance;
      requestAnimationFrame(() => bindEditorDomListeners(typedInstance));
    },
    [bindEditorDomListeners],
  );

  const handleWysiwygChange = useCallback(
    (value: string) => {
      setLocalHtml(value);
    },
    [setLocalHtml],
  );

  const handleRawChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      setLocalHtml(event.currentTarget.value);
    },
    [setLocalHtml],
  );

  const handleRawPaste = useCallback(
    (event: ReactClipboardEvent<HTMLTextAreaElement>) => {
      const files = getImageFilesFromDataTransfer(event.clipboardData);
      if (!files.length) return;

      event.preventDefault();

      const start = event.currentTarget.selectionStart ?? htmlRef.current.length;
      const end = event.currentTarget.selectionEnd ?? htmlRef.current.length;

      void (async () => {
        const snippet = await imageFilesToHtml(files);
        if (snippet) {
          insertIntoRaw(snippet, start, end);
        }
      })();
    },
    [insertIntoRaw],
  );

  const handleRawDrop = useCallback(
    (event: ReactDragEvent<HTMLTextAreaElement>) => {
      const files = getImageFilesFromDataTransfer(event.dataTransfer);
      if (!files.length) return;

      event.preventDefault();
      event.currentTarget.focus();

      const start = event.currentTarget.selectionStart ?? htmlRef.current.length;
      const end = event.currentTarget.selectionEnd ?? htmlRef.current.length;

      void (async () => {
        const snippet = await imageFilesToHtml(files);
        if (snippet) {
          insertIntoRaw(snippet, start, end);
        }
      })();
    },
    [insertIntoRaw],
  );

  const handleRawDragOver = useCallback(
    (event: ReactDragEvent<HTMLTextAreaElement>) => {
      if (getImageFilesFromDataTransfer(event.dataTransfer).length) {
        event.preventDefault();
      }
    },
    [],
  );

  const handleImageUploadBefore = useCallback(
    (...args: unknown[]) => {
      const firstArg = args[0];
      const files = Array.isArray(firstArg)
        ? firstArg.filter(isFileLike)
        : [];

      if (!files.length) {
        return undefined;
      }

      const uploadHandler = args.find(
        (value): value is SunEditorUploadHandler => typeof value === 'function',
      );

      void (async () => {
        const embeds = await imageFilesToEmbeds(files);
        if (!embeds.length) return;

        if (uploadHandler) {
          uploadHandler({
            result: embeds.map((embed) => ({
              url: embed.src,
              name: embed.name,
              size: embed.size,
            })),
          });
          return;
        }

        const snippet = embeds
          .map((embed) => `<p><img src="${embed.src}" alt="" /></p>`)
          .join('');

        if (snippet) {
          insertIntoEditor(snippet);
        }
      })();

      return false;
    },
    [insertIntoEditor],
  );

  useEffect(() => {
    if (mode !== 'wysiwyg') {
      cleanupEditorListenersRef.current?.();
      cleanupEditorListenersRef.current = null;
      editorRef.current = null;
    }
  }, [mode]);

  const editorShell = (
    <div ref={editorShellRef} className={shellClassName}>
      <div className="flex items-center justify-between border-b border-slate-200 px-2 py-1.5 dark:border-slate-800">
        <div className="inline-flex items-center rounded-md border border-slate-200 bg-slate-100 p-0.5 dark:border-slate-800 dark:bg-slate-900">
          <button
            type="button"
            className={cn(
              TOGGLE_BUTTON_BASE_CLASS,
              mode === 'wysiwyg'
                ? TOGGLE_BUTTON_ACTIVE_CLASS
                : TOGGLE_BUTTON_INACTIVE_CLASS,
            )}
            aria-pressed={mode === 'wysiwyg'}
            onClick={handleShowWysiwyg}
          >
            WYSIWYG
          </button>

          <button
            type="button"
            className={cn(
              TOGGLE_BUTTON_BASE_CLASS,
              mode === 'raw'
                ? TOGGLE_BUTTON_ACTIVE_CLASS
                : TOGGLE_BUTTON_INACTIVE_CLASS,
            )}
            aria-pressed={mode === 'raw'}
            onClick={handleShowRaw}
          >
            Raw
          </button>
        </div>

        <button
          type="button"
          className="rounded px-2 py-1 text-[14px] font-medium leading-none text-slate-600 transition-colors hover:bg-slate-200 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 dark:focus-visible:ring-slate-700"
          onClick={isFullscreen ? handleExitFullscreen : handleEnterFullscreen}
          aria-label={isFullscreen ? 'Exit fullscreen editor' : 'Enter fullscreen editor'}
        >
          {isFullscreen ? '[ ]' : '<>'}
        </button>
      </div>

      <div className={panelClassName}>
        {mode === 'wysiwyg' ? (
          <div className={editorSkinClassName}>
            <SunEditor
              defaultValue={html}
              getSunEditorInstance={handleEditorInstance}
              onChange={handleWysiwygChange}
              onImageUploadBefore={handleImageUploadBefore}
              setOptions={sunEditorOptions}
            />
          </div>
        ) : (
          <textarea
            ref={rawTextAreaRef}
            className={rawTextAreaClassName}
            name={argName}
            value={html}
            onChange={handleRawChange}
            onPaste={handleRawPaste}
            onDrop={handleRawDrop}
            onDragOver={handleRawDragOver}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            wrap="off"
            aria-label={`${argName} raw HTML editor`}
          />
        )}
      </div>

      <div className="border-t border-slate-200 px-3 py-1.5 text-[11px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
        Paste or drop images to embed them.
      </div>
    </div>
  );

  if (isFullscreen) {
    if (fullscreenHost === 'dialog') {
      return (
        <div className="absolute inset-0 z-20 min-h-0 bg-background">
          {editorShell}
        </div>
      );
    }

    if (typeof document === 'undefined') {
      return null;
    }

    return createPortal(
      <div
        className="fixed inset-0 z-1000 bg-black/50 pointer-events-auto dark:bg-black/60"
        data-html-editor-fullscreen="true"
        onClick={handleFullscreenOverlayClick}
      >
        <div className="pointer-events-auto flex h-full w-full min-h-0">
          {editorShell}
        </div>
      </div>,
      document.body,
    );
  }

  return editorShell;
}

const HtmlEditor = memo(HtmlEditorComponent);
HtmlEditor.displayName = 'HtmlEditor';

export { HtmlEditor };
export default HtmlEditor;