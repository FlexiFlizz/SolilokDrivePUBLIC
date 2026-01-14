import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes publiques (pas besoin d'auth)
const publicRoutes = ["/login", "/setup", "/d"];
const apiRoutes = ["/api/"];
const staticRoutes = ["/_next", "/favicon.ico"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Ignorer les routes statiques et API
  if (staticRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }
  if (apiRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Vérifier le setup via cookie ou header interne
  try {
    const setupCheckUrl = new URL("/api/setup", request.url);
    const setupRes = await fetch(setupCheckUrl.toString(), {
      headers: { "x-middleware-check": "1" },
    });
    const setupData = await setupRes.json();

    // Si setup requis, rediriger vers /setup (sauf si déjà dessus)
    if (setupData.setupRequired && pathname !== "/setup") {
      return NextResponse.redirect(new URL("/setup", request.url));
    }

    // Si setup fait mais on est sur /setup, rediriger vers /login
    if (!setupData.setupRequired && pathname === "/setup") {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Vérifier l'authentification pour les routes protégées
    if (!publicRoutes.some(route => pathname.startsWith(route))) {
      const sessionCookie = request.cookies.get("session");
      if (!sessionCookie) {
        return NextResponse.redirect(new URL("/login", request.url));
      }

      // Vérifier la session
      const authCheckUrl = new URL("/api/auth/me", request.url);
      const authRes = await fetch(authCheckUrl.toString(), {
        headers: { Cookie: `session=${sessionCookie.value}` },
      });

      if (!authRes.ok) {
        const response = NextResponse.redirect(new URL("/login", request.url));
        response.cookies.delete("session");
        return response;
      }
    }

    // Si sur /login avec session valide, rediriger vers /
    if (pathname === "/login") {
      const sessionCookie = request.cookies.get("session");
      if (sessionCookie) {
        const authCheckUrl = new URL("/api/auth/me", request.url);
        const authRes = await fetch(authCheckUrl.toString(), {
          headers: { Cookie: `session=${sessionCookie.value}` },
        });
        if (authRes.ok) {
          return NextResponse.redirect(new URL("/", request.url));
        }
      }
    }

  } catch (error) {
    console.error("Middleware error:", error);
    // En cas d'erreur, laisser passer (fail-open pour éviter de bloquer)
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
