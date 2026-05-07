import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

export default async function proxy(req: NextRequest) {
  const session = await auth();
  const { pathname } = req.nextUrl;

  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // admin 페이지에 일반 회원이 접근 시 차단
  if (pathname.startsWith("/admin") && (session.user as any).role !== "admin") {
    return NextResponse.redirect(new URL("/calendar", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/calendar/:path*"],
};
