import "./App.css";
import { createHashRouter, isRouteErrorResponse, Outlet, RouterProvider, ScrollRestoration, useRouteError } from "react-router-dom";
import { Suspense, ReactNode, lazy, ComponentType, useEffect, useState } from "react";
import { hasToken } from "@/utils/Auth.ts";
import ReactGA from "react-ga4";
import "react-data-grid/lib/styles.css";
import AutoRoutePrefetcher from "./components/AutoRoutePrefetcher";
import Loading from "@/components/ui/loading";

function handleCopyStackClick(e: React.MouseEvent<HTMLButtonElement>) {
  const text = e.currentTarget.dataset.stack;
  if (!text) return;
  void navigator.clipboard?.writeText(text);
  alert("Copied to clipboard.");
}

// Initialize Google Analytics
ReactGA.initialize(process.env.GTAG_ID as string);
// Lazy-loaded components

const LoggedInRoute = ({ children }: { children: ReactNode }) => {
  const Picker = lazy(() => import("@/pages/login_picker"));
  return hasToken() ? <>{children}</> : <Picker />;
};

export interface AppRouteConfig {
  key: string;
  path: string;
  // Store the importer function directly
  element: () => Promise<{ default: ComponentType }>;
  protected: boolean;
}
const routeConfigs: AppRouteConfig[] = [
  /*
  protected = logged in
  Guild is selected = logged in and having selected a guild
  
  */

  // Homepage
  { key: "home", path: "/home", element: () => import("./pages/home"), protected: false },
  // Unlink game nation
  { key: "unregister", path: "/unregister", element: () => import("@/pages/unregister"), protected: true },
  { key: "guild_select", path: "/guild_select", element: () => import("@/pages/guild_picker"), protected: true },

  // Requires guild selected
  { key: "guild_member", path: "/guild_member", element: () => import("@/pages/guild_member"), protected: true },

  // Announcements (only when a guild is selected)
  { key: "announcements", path: "/announcements", element: () => import("@/pages/announcements"), protected: true },
  { key: "announcement_id", path: "/announcement/:id", element: () => import("@/pages/announcement"), protected: true },
  { key: "announcement", path: "/announcement", element: () => import("@/pages/announcements"), protected: true },

  // Commands (accessible to anyone)
  { key: "commands", path: "/commands", element: () => import("./pages/commands"), protected: false },
  { key: "command", path: "/command", element: () => import("./pages/commands"), protected: false },
  { key: "command_detail", path: "/command/:command", element: () => import("./pages/command"), protected: false },
  // Display command result (anyone - but only select commands support)
  { key: "view_command", path: "/view_command/:command", element: () => import("./pages/command/view_command"), protected: false },
  // List of placeholders for a type
  { key: "placeholders", path: "/placeholders/:placeholder", element: () => import("@/pages/ph_list"), protected: false },

  // Balance and records (only when a guild is selected)
  { key: "balance", path: "/balance", element: () => import("@/pages/balance"), protected: true },
  { key: "balance_category", path: "/balance/:category", element: () => import("@/pages/balance"), protected: true },
  { key: "records", path: "/records", element: () => import("@/pages/records"), protected: true },

  // Raid Finder (anyone)
  { key: "raid_nation", path: "/raid/:nation", element: () => import("./pages/raid"), protected: false },
  { key: "raid", path: "/raid", element: () => import("./pages/raid"), protected: false },

  // Authentication
  { key: "login", path: "/login", element: () => import("@/pages/login_picker"), protected: false },
  { key: "login_token", path: "/login/:token", element: () => import("./pages/login"), protected: false },
  { key: "oauth2", path: "/oauth2", element: () => import("./pages/oauth2"), protected: false },
  { key: "logout", path: "/logout", element: () => import("./pages/logout"), protected: false },
  { key: "nation_picker", path: "/nation_picker", element: () => import("@/pages/nation_picker"), protected: false },
  { key: "register", path: "/register", element: () => import("@/pages/unregister"), protected: false },

  // Tables (anyone)
  { key: "custom_table", path: "/custom_table", element: () => import("./pages/custom_table/TablePage"), protected: false },
  { key: "view_table", path: "/view_table", element: () => import("@/pages/view_table"), protected: false },

  // Graphs (anyone)
  { key: "col_mil_graph", path: "/col_mil_graph", element: () => import("./pages/graphs/col_mil_graph"), protected: false },
  { key: "col_tier_graph", path: "/col_tier_graph", element: () => import("./pages/graphs/col_tier_graph"), protected: false },
  { key: "edit_graph_type", path: "/edit_graph/:type", element: () => import("./pages/graphs/edit_graph"), protected: false },
  { key: "edit_graph", path: "/edit_graph", element: () => import("./pages/graphs/edit_graph"), protected: false },
  { key: "view_graph_type", path: "/view_graph/:type", element: () => import("./pages/graphs/view_graph"), protected: false },
  { key: "view_graph", path: "/view_graph", element: () => import("./pages/graphs/edit_graph"), protected: false },

  // WIP pages (maybe display more if logged in (not implemented yet))
  { key: "alliance", path: "/alliance/:alliance", element: () => import("./pages/a2/alliance/alliance"), protected: false },

  // Nation multi-boxing (anyone)
  { key: "multi", path: "/multi/:nation", element: () => import("./pages/a2/nation/multi"), protected: false },
  { key: "multi_v2", path: "/multi_v2/:nation", element: () => import("./pages/a2/nation/multi_2"), protected: false },

  // game conflict viewer (anyone)
  { key: "conflicts", path: "/conflicts", element: () => import("@/pages/a2/conflict/conflicts"), protected: false },

  // tasks (anyone - though view is limited if not an admin)
  { key: "status", path: "/status", element: () => import("./pages/a2/admin/status"), protected: false },
];

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

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-2xl w-full rounded border border-destructive/40 bg-destructive/10 p-4">
        <h2 className="text-base font-semibold text-destructive">Page failed to load</h2>
        <p className="mt-2 text-sm break-words text-secondary">{message}</p>
        {stack && (
          <div className="mt-4">
            <button
              type="button"
              data-stack={stack}
              onClick={handleCopyStackClick}
              className="mb-2 bg-primary rounded border px-2 py-1 text-xs text-white active:translate-y-px active:opacity-80"
            >
              copy
            </button>
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded bg-black/40 p-2 text-yellow-50">{stack}</pre>
          </div>
        )}
      </div>
    </div>
  );
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
          <PageView>
            <Outlet />
          </PageView>
        ),
        children: routeConfigs.map(config => {
          const Element = lazy(config.element);
          return {
            path: config.path.replace(/^\//, ''), // remove leading slash
            element: config.protected ?
              <LoggedInRoute><Element /></LoggedInRoute> :
              <Element />
          };
        })
      }
    ]
  }
]);

export default function App() {
  // The router is already memoized at module level
  return <RouterProvider router={router} />;
}