import { NextRequest, NextResponse } from "next/server";
import { deleteSession } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const sessionId = request.cookies.get("session")?.value;

    if (sessionId) {
      deleteSession(sessionId);
    }

    const response = NextResponse.json({ success: true });
    response.cookies.delete("session");

    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
