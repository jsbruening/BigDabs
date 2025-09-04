import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(_req: NextRequest) {
  // For now, skip the blocking check to avoid JWT secret issues
  // TODO: Implement proper user blocking check once JWT secret is available
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/games/:path*",
    "/api/trpc/:path*",
  ],
};
