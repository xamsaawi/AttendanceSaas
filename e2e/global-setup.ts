// Next dev mode compiles each route on first visit. Without this, whichever
// spec happens to run first eats the full cold-compile cost of every route
// it touches and can blow past the per-test timeout on unrelated work.
// Warming the routes here, outside any test's clock, fixed that.
const ROUTES_TO_WARM = [
  "/",
  "/login",
  "/dashboard",
  "/dashboard/attendance",
  "/dashboard/reports",
  "/dashboard/students",
  // GET against POST-only/param routes still forces Next to compile the
  // route module (it 404s/405s, but that's after compilation, not before).
  "/api/attendance/mark",
  "/api/attendance/roster",
  "/api/export/students",
];

export default async function globalSetup() {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
  for (const route of ROUTES_TO_WARM) {
    try {
      await fetch(`${baseURL}${route}`);
    } catch {
      // Ignore — a route that 30x's to /login (e.g. /dashboard while logged
      // out) or errors here still gets compiled server-side either way.
    }
  }
}
