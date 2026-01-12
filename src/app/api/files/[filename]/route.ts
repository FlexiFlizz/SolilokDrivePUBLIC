import { NextRequest, NextResponse } from "next/server";
import { readFile, unlink, stat } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { getFileByFilename, deleteFileByFilename, incrementDownloadCount } from "@/lib/db";

const UPLOAD_DIR = "/app/uploads";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    const filepath = path.join(UPLOAD_DIR, filename);

    if (!existsSync(filepath)) {
      return NextResponse.json({ error: "Fichier non trouvé" }, { status: 404 });
    }

    const fileRecord = getFileByFilename(filename);
    const fileBuffer = await readFile(filepath);
    const stats = await stat(filepath);
    const originalName = fileRecord?.original_name || filename.replace(/^\d+-/, "");

    if (fileRecord) incrementDownloadCount(fileRecord.id);

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": fileRecord?.mime_type || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(originalName)}"`,
        "Content-Length": stats.size.toString(),
      },
    });
  } catch (error) {
    console.error("Download error:", error);
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    const filepath = path.join(UPLOAD_DIR, filename);

    if (!existsSync(filepath)) {
      return NextResponse.json({ error: "Fichier non trouvé" }, { status: 404 });
    }

    await unlink(filepath);
    deleteFileByFilename(filename);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}
