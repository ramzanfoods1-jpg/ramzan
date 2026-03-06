import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const session = req.cookies.get("session")?.value;
  const isAuth = !!session;
  const isLogin = req.nextUrl.pathname === "/login";
  const isRegister = req.nextUrl.pathname === "/register";
  if (isLogin || isRegister) {
    if (isAuth) return NextResponse.redirect(new URL("/", req.url));
    return NextResponse.next();
  }
  const protectedPaths = ["/", "/invoices", "/customers", "/products", "/settings", "/dashboard"];
  const isProtected = protectedPaths.some(
    (p) => req.nextUrl.pathname === p || req.nextUrl.pathname.startsWith(p + "/")
  );
  if (isProtected && !isAuth) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/invoices/:path*",
    "/customers/:path*",
    "/products/:path*",
    "/settings/:path*",
    "/dashboard/:path*",
    "/login",
    "/register",
  ],
};
