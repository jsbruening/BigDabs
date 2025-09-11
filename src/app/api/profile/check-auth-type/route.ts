import { type NextRequest, NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Find by email to avoid ObjectId format differences between providers
    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, password: true },
    });

    // If no DB record, treat as OAuth for safety
    const isOAuth = user ? !user.password : true;

    return NextResponse.json(
      { 
        isOAuth,
        hasPassword: Boolean(user?.password),
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Auth type check error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
