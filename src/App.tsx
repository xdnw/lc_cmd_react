import "./App.css";
import { createHashRouter, Outlet, RouterProvider, ScrollRestoration } from "react-router-dom";
import { Suspense, ReactNode, lazy, ComponentType } from "react";
import { hasToken } from "@/utils/Auth.ts";
import ReactGA from "react-ga4";
import "react-data-grid/lib/styles.css";
import AutoRoutePrefetcher from "./components/AutoRoutePrefetcher";

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
  // Home and user management
  { key: "home", path: "/home", element: () => import("./pages/home"), protected: false },
  { key: "guild_member", path: "/guild_member", element: () => import("@/pages/guild_member"), protected: true },
  { key: "unregister", path: "/unregister", element: () => import("@/pages/unregister"), protected: true },
  { key: "guild_select", path: "/guild_select", element: () => import("@/pages/guild_picker"), protected: true },

  // Announcements
  { key: "announcements", path: "/announcements", element: () => import("@/pages/announcements"), protected: true },
  { key: "announcement_id", path: "/announcement/:id", element: () => import("@/pages/announcement"), protected: true },
  { key: "announcement", path: "/announcement", element: () => import("@/pages/announcements"), protected: true },

  // Commands
  { key: "commands", path: "/commands", element: () => import("./pages/commands"), protected: false },
  { key: "command", path: "/command", element: () => import("./pages/commands"), protected: false },
  { key: "command_detail", path: "/command/:command", element: () => import("./pages/command"), protected: false },
  { key: "placeholders", path: "/placeholders/:placeholder", element: () => import("@/pages/ph_list"), protected: false },

  // Balance and records
  { key: "balance", path: "/balance", element: () => import("@/pages/balance"), protected: false },
  { key: "balance_category", path: "/balance/:category", element: () => import("@/pages/balance"), protected: false },
  { key: "records", path: "/records", element: () => import("@/pages/records"), protected: false },
  { key: "raid_nation", path: "/raid/:nation", element: () => import("./pages/raid"), protected: false },
  { key: "raid", path: "/raid", element: () => import("./pages/raid"), protected: false },

  // Authentication
  { key: "login", path: "/login", element: () => import("@/pages/login_picker"), protected: false },
  { key: "login_token", path: "/login/:token", element: () => import("./pages/login"), protected: false },
  { key: "oauth2", path: "/oauth2", element: () => import("./pages/oauth2"), protected: false },
  { key: "logout", path: "/logout", element: () => import("./pages/logout"), protected: false },
  { key: "nation_picker", path: "/nation_picker", element: () => import("@/pages/nation_picker"), protected: false },
  { key: "register", path: "/register", element: () => import("@/pages/unregister"), protected: false },

  // Tables
  { key: "custom_table", path: "/custom_table", element: () => import("./pages/custom_table/TablePage"), protected: false },
  { key: "view_table", path: "/view_table", element: () => import("@/pages/view_table"), protected: false },

  // Graphs
  { key: "col_mil_graph", path: "/col_mil_graph", element: () => import("./pages/graphs/col_mil_graph"), protected: false },
  { key: "col_tier_graph", path: "/col_tier_graph", element: () => import("./pages/graphs/col_tier_graph"), protected: false },
  { key: "edit_graph_type", path: "/edit_graph/:type", element: () => import("./pages/graphs/edit_graph"), protected: false },
  { key: "edit_graph", path: "/edit_graph", element: () => import("./pages/graphs/edit_graph"), protected: false },
  { key: "view_graph_type", path: "/view_graph/:type", element: () => import("./pages/graphs/view_graph"), protected: false },
  { key: "view_graph", path: "/view_graph", element: () => import("./pages/graphs/edit_graph"), protected: false },

  // WIP commands
  { key: "view_command", path: "/view_command/:command", element: () => import("./pages/command/view_command"), protected: false },
  { key: "alliance", path: "/alliance/:alliance", element: () => import("./pages/a2/alliance/alliance"), protected: false },
  { key: "multi", path: "/multi/:nation", element: () => import("./pages/a2/nation/multi"), protected: false },
  { key: "multi_v2", path: "/multi_v2/:nation", element: () => import("./pages/a2/nation/multi_2"), protected: false },
  { key: "conflicts", path: "/conflicts", element: () => import("./pages/a2/conflict/conflicts"), protected: false },

  // admin
  { key: "tasks", path: "/tasks", element: () => import("./pages/a2/admin/tasks"), protected: true },
];

const PageView = lazy(() => import("./components/layout/page-view"));
const Splash = lazy(() => import("./pages/splash"));

// Router is created once at module level
const router = createHashRouter([
  {
    path: "/",
    element: (
      <>
        <AutoRoutePrefetcher routeConfigs={routeConfigs} />
        <ScrollRestoration />
        <Suspense>
          <Outlet />
        </Suspense>
      </>
    ),
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