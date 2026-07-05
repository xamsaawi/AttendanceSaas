import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { env } from "@/config/env";

const PUBLIC_ROUTES = ["/login", "/forgot-password", "/auth/callback"];

// Routes that authenticate themselves (a bearer secret, a webhook signature,
// etc.) rather than via the user's cookie session — Vercel Cron has no
// session to present, so /api/cron/* would otherwise always redirect to
// /login before the route's own auth check ever runs.
const SELF_AUTHENTICATING_ROUTES = ["/api/cron", "/api/health"];

export async function updateSession(request: NextRequest) {
  if (SELF_AUTHENTICATING_ROUTES.some((route) => request.nextUrl.pathname.startsWith(route))) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          supabaseResponse = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublicRoute = PUBLIC_ROUTES.some((route) =>
    request.nextUrl.pathname.startsWith(route),
  );

  if (!user && !isPublicRoute && request.nextUrl.pathname !== "/") {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirectTo", request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isPublicRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return supabaseResponse;
}
