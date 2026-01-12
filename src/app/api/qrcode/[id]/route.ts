import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { getFileById } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const host = request.headers.get("host") || "localhost:3005";
    const protocol = request.headers.get("x-forwarded-proto") || "http";

    const fileRecord = getFileById(id);
    if (!fileRecord) {
      return NextResponse.json({ error: "Fichier non trouvé" }, { status: 404 });
    }

    const shareUrl = `${protocol}://${host}/d/${id}`;

    const qrCodeDataUrl = await QRCode.toDataURL(shareUrl, {
      width: 256,
      margin: 2,
      color: { dark: "#ffffff", light: "#00000000" },
    });

    const base64Data = qrCodeDataUrl.split(",")[1];
    const buffer = Buffer.from(base64Data, "base64");

    return new NextResponse(buffer, {
      headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=3600" },
    });
  } catch (error) {
    console.error("QR Code error:", error);
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}
