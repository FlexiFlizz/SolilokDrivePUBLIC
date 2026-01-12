import { NextRequest, NextResponse } from "next/server";
import { isSetupComplete, setConfig, hashPassword, getDb } from "@/lib/db";
import crypto from "crypto";

// GET - Vérifier si le setup est nécessaire
export async function GET() {
  try {
    const setupComplete = isSetupComplete();
    const { getAppName } = await import("@/lib/db");
    return NextResponse.json({
      setupRequired: !setupComplete,
      appName: setupComplete ? getAppName() : null
    });
  } catch (error) {
    console.error("Setup check error:", error);
    return NextResponse.json({ setupRequired: true });
  }
}

// POST - Effectuer le setup initial
export async function POST(request: NextRequest) {
  try {
    // Vérifier si le setup n'est pas déjà fait
    if (isSetupComplete()) {
      return NextResponse.json({ error: "Setup déjà effectué" }, { status: 400 });
    }

    const { appName, adminUsername, adminPassword, maxStorageGb } = await request.json();

    // Validations
    if (!adminUsername || adminUsername.length < 3) {
      return NextResponse.json({ error: "Nom d'utilisateur trop court (min 3)" }, { status: 400 });
    }
    if (!adminPassword || adminPassword.length < 4) {
      return NextResponse.json({ error: "Mot de passe trop court (min 4)" }, { status: 400 });
    }
    if (!appName || appName.length < 2) {
      return NextResponse.json({ error: "Nom de l'application requis" }, { status: 400 });
    }

    const storageGb = parseInt(maxStorageGb, 10) || 15;
    if (storageGb < 1 || storageGb > 1000) {
      return NextResponse.json({ error: "Stockage entre 1 et 1000 Go" }, { status: 400 });
    }

    // Créer l'admin
    const database = getDb();
    const adminId = crypto.randomUUID();
    const passwordHash = hashPassword(adminPassword);

    database.prepare(`
      INSERT INTO users (id, username, password_hash, is_admin, is_active, created_at, updated_at)
      VALUES (?, ?, ?, 1, 1, ?, ?)
    `).run(adminId, adminUsername, passwordHash, Date.now(), Date.now());

    // Sauvegarder la configuration
    setConfig("app_name", appName);
    setConfig("max_storage", String(storageGb * 1024 * 1024 * 1024));
    setConfig("setup_complete", "true");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Setup error:", error);
    return NextResponse.json({ error: "Erreur lors du setup" }, { status: 500 });
  }
}
