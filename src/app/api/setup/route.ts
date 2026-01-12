import { NextRequest, NextResponse } from "next/server";
import { isSetupComplete, setConfig, hashPassword, getDb, getAppName } from "@/lib/db";
import crypto from "crypto";

// GET - Vérifier si le setup est nécessaire
export async function GET() {
  try {
    // Tester l'accès à la DB
    getDb();
    const setupComplete = isSetupComplete();
    return NextResponse.json({
      setupRequired: !setupComplete,
      appName: setupComplete ? getAppName() : null
    });
  } catch (error) {
    console.error("Setup check error:", error);
    // Si erreur DB, setup requis
    return NextResponse.json({ setupRequired: true, dbError: true });
  }
}

// POST - Effectuer le setup initial
export async function POST(request: NextRequest) {
  try {
    // Tester l'accès DB d'abord
    let database;
    try {
      database = getDb();
    } catch (dbError) {
      console.error("Database access error:", dbError);
      return NextResponse.json({ error: "Erreur accès base de données. Vérifiez les permissions du dossier /app/data" }, { status: 500 });
    }

    // Vérifier si le setup n'est pas déjà fait
    if (isSetupComplete()) {
      return NextResponse.json({ error: "Setup déjà effectué" }, { status: 400 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    const { appName, adminUsername, adminPassword, maxStorageGb } = body;

    // Validations
    if (!adminUsername || String(adminUsername).length < 3) {
      return NextResponse.json({ error: "Nom d'utilisateur trop court (min 3 caractères)" }, { status: 400 });
    }
    if (!adminPassword || String(adminPassword).length < 4) {
      return NextResponse.json({ error: "Mot de passe trop court (min 4 caractères)" }, { status: 400 });
    }
    if (!appName || String(appName).length < 2) {
      return NextResponse.json({ error: "Nom de l'application requis (min 2 caractères)" }, { status: 400 });
    }

    const storageGb = parseInt(String(maxStorageGb), 10) || 15;
    if (storageGb < 1 || storageGb > 1000) {
      return NextResponse.json({ error: "Stockage doit être entre 1 et 1000 Go" }, { status: 400 });
    }

    // Vérifier si username existe déjà
    const existingUser = database.prepare("SELECT id FROM users WHERE username = ?").get(String(adminUsername));
    if (existingUser) {
      return NextResponse.json({ error: "Ce nom d'utilisateur existe déjà" }, { status: 400 });
    }

    // Créer l'admin
    const adminId = crypto.randomUUID();
    const passwordHash = hashPassword(String(adminPassword));

    try {
      database.prepare(`
        INSERT INTO users (id, username, password_hash, is_admin, is_active, created_at, updated_at)
        VALUES (?, ?, ?, 1, 1, ?, ?)
      `).run(adminId, String(adminUsername), passwordHash, Date.now(), Date.now());
    } catch (insertError) {
      console.error("User creation error:", insertError);
      return NextResponse.json({ error: "Erreur création utilisateur admin" }, { status: 500 });
    }

    // Sauvegarder la configuration
    try {
      setConfig("app_name", String(appName));
      setConfig("max_storage", String(storageGb * 1024 * 1024 * 1024));
      setConfig("setup_complete", "true");
    } catch (configError) {
      console.error("Config save error:", configError);
      return NextResponse.json({ error: "Erreur sauvegarde configuration" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Setup error:", error);
    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: `Erreur lors du setup: ${errorMessage}` }, { status: 500 });
  }
}
