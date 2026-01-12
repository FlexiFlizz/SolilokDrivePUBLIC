import { NextRequest, NextResponse } from "next/server";
import { getValidSession } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.cookies.get("session")?.value;

    if (!sessionId) {
      return NextResponse.json({ user: null });
    }

    const result = getValidSession(sessionId);
    if (!result) {
      const response = NextResponse.json({ user: null });
      response.cookies.delete("session");
      return response;
    }

    return NextResponse.json({
      user: {
        id: result.user.id,
        username: result.user.username,
        isAdmin: result.user.is_admin === 1,
      },
    });
  } catch (error) {
    console.error("Auth check error:", error);
    return NextResponse.json({ user: null });
  }
}
