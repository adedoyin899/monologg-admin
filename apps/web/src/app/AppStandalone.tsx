import { createHashRouter, RouterProvider } from "react-router";
import { routeTree } from "./routes";

// Hash-based router (URLs look like `#/dashboard`) so the whole app can be
// opened directly as a local file — no server, no pushState — and navigation
// between pages still works. Same route tree as the real, hosted app.
const hashRouter = createHashRouter(routeTree);

export default function AppStandalone() {
  return <RouterProvider router={hashRouter} />;
}
