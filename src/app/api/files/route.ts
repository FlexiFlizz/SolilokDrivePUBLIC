import { NextRequest, NextResponse } from "next/server";
import { getAllFiles, getFilesByUserId, getValidSession } from "@/lib/db";

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

    // Admin voit tous les fichiers, utilisateur normal voit seulement les siens
    const files = result.user.is_admin === 1
      ? getAllFiles()
      : getFilesByUserId(result.user.id);

    return NextResponse.json({
      files: files.map((f) => ({
        id: f.id,
        name: f.filename,
        originalName: f.original_name,
        size: f.size,
        mimeType: f.mime_type,
        hasPassword: !!f.password,
        expiresAt: f.expires_at,
        maxDownloads: f.max_downloads,
        downloadCount: f.download_count,
        createdAt: f.created_at,
        userId: f.user_id,
      })),
    });
  } catch (error) {
    console.error("List files error:", error);
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}
