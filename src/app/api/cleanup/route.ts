import { NextResponse } from "next/server";
import { unlink } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { getExpiredFiles, deleteFile } from "@/lib/db";

const UPLOAD_DIR = "/app/uploads";

export async function POST() {
  try {
    const expired = getExpiredFiles();
    const deleted: string[] = [];

    for (const file of expired) {
      const filepath = path.join(UPLOAD_DIR, file.filename);
      if (existsSync(filepath)) {
        await unlink(filepath);
      }
      deleteFile(file.id);
      deleted.push(file.original_name);
    }

    return NextResponse.json({
      success: true,
      deleted: deleted.length,
      files: deleted,
    });
  } catch (error) {
    console.error("Cleanup error:", error);
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}

export async function GET() {
  // Permet aussi via GET pour les cron jobs simples
  return POST();
}
