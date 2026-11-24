import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const publicPaths = ["/login"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.match(/\.(png|jpg|jpeg|svg|ico|css|js)$/)
  ) {
    return NextResponse.next();
  }

  const token = await getToken({ req, secret: process.env.AUTH_SECRET });
  const isPublic = publicPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!token && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  if (token && pathname === "/login") {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  const role = token?.role as string | undefined;
  const opsOnly = ["/branches", "/employees", "/attendance", "/payroll", "/statistics", "/ads"];
  const ownerOnly = ["/branches"];

  if (token && opsOnly.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    if (role !== "OWNER" && role !== "MANAGER") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  if (token && ownerOnly.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    if (role !== "OWNER") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\..*).*)"],
};
