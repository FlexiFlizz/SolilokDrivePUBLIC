import { NextRequest, NextResponse } from "next/server";
import { getValidSession, getStats } from "@/lib/db";
import { execSync } from "child_process";

function getDiskStats() {
  try {
    // Utiliser df pour obtenir les stats du disque racine
    const output = execSync("df -B1 / | tail -1").toString().trim();
    const parts = output.split(/\s+/);
    // Format: Filesystem 1B-blocks Used Available Use% Mounted
    const total = parseInt(parts[1], 10);
    const used = parseInt(parts[2], 10);
    const available = parseInt(parts[3], 10);
    const percentUsed = Math.round((used / total) * 100);

    return {
      vpsTotal: total,
      vpsUsed: used,
      vpsAvailable: available,
      vpsPercent: percentUsed,
    };
  } catch {
    return {
      vpsTotal: 0,
      vpsUsed: 0,
      vpsAvailable: 0,
      vpsPercent: 0,
    };
  }
}

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.cookies.get("session")?.value;

    if (!sessionId) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const result = getValidSession(sessionId);
    if (!result) {
      return NextResponse.json({ error: "Session expirée" }, { status: 401 });
    }

    const stats = getStats();
    const diskStats = getDiskStats();

    return NextResponse.json({ ...stats, ...diskStats });
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
