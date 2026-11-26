import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const publicPaths = ["/login", "/icon", "/apple-icon", "/api/public"];

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

  const forwarded = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const secureCookie = forwarded ? forwarded === "https" : req.nextUrl.protocol === "https:";
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
    secureCookie,
  });
  const isPublic = publicPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!token && !isPublic) {
    const url = req.nextUrl.clone();
    const staffHint = pathname.startsWith("/login/staff");
    url.pathname = staffHint ? "/login/staff" : "/login";
    if (!pathname.startsWith("/login")) url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  if (token && (pathname === "/login" || pathname === "/login/staff" || pathname.startsWith("/login/"))) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  const role = token?.role as string | undefined;
  const isStaff = role === "STAFF" || role === "PARTTIME";

  if (token && isStaff) {
    const allowed =
      pathname === "/" ||
      pathname.startsWith("/api/schedules") ||
      pathname.startsWith("/api/shifts") ||
      pathname.startsWith("/api/auth") ||
      pathname.startsWith("/api/branches");
    if (!allowed) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  const opsOnly = ["/branches", "/employees", "/attendance", "/payroll", "/statistics", "/ads"];
  const ownerOnly = ["/branches", "/vault"];

  if (token && opsOnly.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    if (role !== "SUPERADMIN" && role !== "OWNER" && role !== "MANAGER") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  if (token && ownerOnly.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    if (role !== "SUPERADMIN" && role !== "OWNER") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  if (token && isStaff && (pathname === "/board" || pathname.startsWith("/board/") || pathname === "/settings" || pathname.startsWith("/settings/"))) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\..*).*)"],
};
