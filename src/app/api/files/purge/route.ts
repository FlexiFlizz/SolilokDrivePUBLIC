import { NextRequest, NextResponse } from "next/server";
import { getValidSession, getAllFiles, deleteFile } from "@/lib/db";
import { unlink } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const UPLOAD_DIR = "/app/uploads";

// POST - Supprimer tous les fichiers (admin seulement)
export async function POST(request: NextRequest) {
  try {
    const sessionId = request.cookies.get("session")?.value;
    if (!sessionId) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const result = getValidSession(sessionId);
    if (!result || result.user.is_admin !== 1) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    // Vérifier le code de confirmation
    const { confirmCode } = await request.json();
    if (confirmCode !== "SUPPRIMER-TOUT") {
      return NextResponse.json({ error: "Code de confirmation incorrect" }, { status: 400 });
    }

    const files = getAllFiles();
    let deletedCount = 0;
    let errorCount = 0;

    for (const file of files) {
      try {
        // Supprimer le fichier physique
        const filepath = path.join(UPLOAD_DIR, file.filename);
        if (existsSync(filepath)) {
          await unlink(filepath);
        }
        // Supprimer de la base de données
        deleteFile(file.id);
        deletedCount++;
      } catch {
        errorCount++;
      }
    }

    return NextResponse.json({
      success: true,
      deletedCount,
      errorCount,
      message: `${deletedCount} fichier(s) supprimé(s)`,
    });
  } catch (error) {
    console.error("Purge error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
