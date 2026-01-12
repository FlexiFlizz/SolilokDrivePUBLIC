import { NextRequest, NextResponse } from "next/server";
import { getValidSession, getLoginLogs } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.cookies.get("session")?.value;

    if (!sessionId) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const result = getValidSession(sessionId);
    if (!result || result.user.is_admin !== 1) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const logs = getLoginLogs(100);

    return NextResponse.json({
      logs: logs.map((log) => ({
        id: log.id,
        userId: log.user_id,
        username: log.username,
        ipAddress: log.ip_address,
        userAgent: log.user_agent,
        success: log.success === 1,
        createdAt: log.created_at,
      })),
    });
  } catch (error) {
    console.error("Login logs error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
