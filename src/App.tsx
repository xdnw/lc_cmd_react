import "./App.css";
import { createHashRouter, isRouteErrorResponse, Outlet, RouterProvider, ScrollRestoration, useRouteError } from "react-router-dom";
import { Suspense, ReactNode, lazy, useEffect, useState } from "react";
import { hasToken } from "@/utils/Auth.ts";
import ReactGA from "react-ga4";
import AutoRoutePrefetcher from "./components/AutoRoutePrefetcher";
import Loading from "@/components/ui/loading";
import { getRecoveryDetail, getRecoveryResetHref, getRecoverySummary, getRecoveryTitle, isLikelyRecoverableAssetError } from "@/lib/deployRecovery";
import { getAppRoutePaths, routeConfigs } from "@/appRoutes";

function handleCopyStackClick(e: React.MouseEvent<HTMLButtonElement>) {
  const text = e.currentTarget.dataset.stack;
  if (!text) return;
  void navigator.clipboard?.writeText(text);
  alert("Copied to clipboard.");
}

function handleReloadAppClick() {
  window.location.reload();
}

// Initialize Google Analytics
ReactGA.initialize(process.env.GTAG_ID as string);
// Lazy-loaded components

const LoginPicker = lazy(() => import("@/pages/login_picker"));

const LoggedInRoute = ({ children }: { children: ReactNode }) => {
  return hasToken() ? <>{children}</> : <LoginPicker />;
};

const PageView = lazy(() => import("./components/layout/page-view"));
const Splash = lazy(() => import("./pages/splash"));

function RouteLoadingFallback() {
  const [isLikelyHung, setIsLikelyHung] = useState(false);
  const [hangStack, setHangStack] = useState<string | null>(null);

  useEffect(() => {
    const timeoutMs = 10000;
    const timer = window.setTimeout(() => {
      setIsLikelyHung(true);
      const err = new Error(`Route load exceeded ${timeoutMs / 1000}s for ${window.location.hash || "/"}`);
      setHangStack(err.stack ?? null);
      console.error("Likely route-load hang detected", {
        hash: window.location.hash,
        href: window.location.href,
        stack: err.stack,
      });
    }, timeoutMs);

    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
      <div className="flex flex-col items-center gap-3 px-4">
        <Loading variant="ripple" dark />
        {isLikelyHung && (
          <div className="max-w-2xl rounded border border-yellow-500/40 bg-yellow-500/10 p-3 text-xs text-yellow-100">
            <div className="font-medium">This route appears to be hung.</div>
            <div className="mt-1">Loading has exceeded 10 seconds.</div>
            {hangStack && (
              <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-black/40 p-2 text-[11px] text-yellow-50">
                {hangStack}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function extractRouteErrorStack(error: unknown): string | null {
  if (isRouteErrorResponse(error)) {
    const data = error.data;
    if (typeof data === "string") return data;
    if (data && typeof data === "object") {
      const stackTrace = (data as { stackTrace?: unknown }).stackTrace;
      if (typeof stackTrace === "string" && stackTrace.trim()) return stackTrace;
      const stack = (data as { stack?: unknown }).stack;
      if (typeof stack === "string" && stack.trim()) return stack;
      const message = (data as { message?: unknown }).message;
      if (typeof message === "string" && message.trim()) return message;
    }
    return null;
  }

  if (error instanceof Error && typeof error.stack === "string" && error.stack.trim()) {
    return error.stack;
  }

  return null;
}

function RouteErrorFallback() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : String(error ?? "Unknown route error");
  const stack = extractRouteErrorStack(error);
  const resetHref = getRecoveryResetHref();
  const isRecoverableAssetError = isLikelyRecoverableAssetError(error);
  const title = getRecoveryTitle(error);
  const recoverySummary = getRecoverySummary(error);
  const recoveryDetail = stack ?? getRecoveryDetail(error);
  const primaryMessage = isRecoverableAssetError ? recoverySummary : message;

  return (
    <div className="min-h-screen bg-slate-950 px-3 py-6 text-slate-100 sm:px-4 sm:py-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-xl items-center justify-center">
        <div className="w-full rounded-lg border border-slate-700 bg-slate-900 p-4 sm:p-5">
          <h2 className="text-xl font-semibold text-white sm:text-2xl">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">{primaryMessage}</p>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <a
              href={resetHref}
              className="inline-flex min-h-10 items-center justify-center rounded-md bg-slate-100 px-4 text-sm font-semibold text-slate-950 hover:bg-white"
            >
              Reset cached app data
            </a>
            <button
              type="button"
              onClick={handleReloadAppClick}
              className="inline-flex min-h-10 items-center justify-center rounded-md border border-slate-600 bg-slate-800 px-4 text-sm font-semibold text-slate-100 hover:border-slate-500"
            >
              Reload app
            </button>
          </div>

          {message !== primaryMessage && (
            <p className="mt-4 text-sm leading-6 text-slate-400 wrap-break-word">{message}</p>
          )}

          {recoveryDetail && (
            <div className="mt-4">
              <button
                type="button"
                data-stack={recoveryDetail}
                onClick={handleCopyStackClick}
                className="mb-2 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-white active:translate-y-px active:opacity-80"
              >
                copy
              </button>
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md border border-slate-700 bg-slate-950 p-3 text-[12px] text-rose-200">{recoveryDetail}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function buildRouteElements() {
  return routeConfigs.flatMap((config) => {
    const Element = lazy(config.element);

    return getAppRoutePaths(config).map((path) => ({
      path: path.replace(/^\//, ""),
      element: config.protected
        ? <LoggedInRoute><Element /></LoggedInRoute>
        : <Element />,
    }));
  });
}

// Router is created once at module level
const router = createHashRouter([
  {
    path: "/",
    element: (
      <>
        <AutoRoutePrefetcher routeConfigs={routeConfigs} />
        <ScrollRestoration />
        <Suspense fallback={<RouteLoadingFallback />}>
          <Outlet />
        </Suspense>
      </>
    ),
    errorElement: <RouteErrorFallback />,
    children: [
      {
        index: true,
        element: <Splash />
      },
      {
        path: "*",
        element: (
          <PageView routeConfigs={routeConfigs} />
        ),
        children: buildRouteElements(),
      }
    ]
  }
]);

export default function App() {
  // The router is already memoized at module level
  return <RouterProvider router={router} />;
}