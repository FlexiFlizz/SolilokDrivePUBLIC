import { NextRequest, NextResponse } from "next/server";
import { getValidSession, updateUserPassword, verifyPassword, getUserById } from "@/lib/db";
import Database from "better-sqlite3";

const DB_PATH = process.env.DB_PATH || "/app/data/doctor-drive.db";

// GET - Récupérer les infos du compte
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

    return NextResponse.json({
      user: {
        id: result.user.id,
        username: result.user.username,
        isAdmin: result.user.is_admin === 1,
        createdAt: result.user.created_at,
      },
    });
  } catch (error) {
    console.error("Get account error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// PATCH - Modifier le compte (mot de passe, username)
export async function PATCH(request: NextRequest) {
  try {
    const sessionId = request.cookies.get("session")?.value;
    if (!sessionId) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const result = getValidSession(sessionId);
    if (!result) {
      return NextResponse.json({ error: "Session expirée" }, { status: 401 });
    }

    const { currentPassword, newPassword, newUsername } = await request.json();

    // Changement de mot de passe
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({ error: "Mot de passe actuel requis" }, { status: 400 });
      }

      // Vérifier le mot de passe actuel
      const isValid = verifyPassword(currentPassword, result.user.password_hash);
      if (!isValid) {
        return NextResponse.json({ error: "Mot de passe actuel incorrect" }, { status: 401 });
      }

      if (newPassword.length < 4) {
        return NextResponse.json({ error: "Le nouveau mot de passe doit faire au moins 4 caractères" }, { status: 400 });
      }

      updateUserPassword(result.user.id, newPassword);
    }

    // Changement de nom d'utilisateur
    if (newUsername && newUsername !== result.user.username) {
      if (newUsername.length < 3 || newUsername.length > 20) {
        return NextResponse.json({ error: "Le nom d'utilisateur doit faire entre 3 et 20 caractères" }, { status: 400 });
      }

      // Vérifier si le username est disponible
      const db = new Database(DB_PATH);
      const existing = db.prepare("SELECT id FROM users WHERE username = ? AND id != ?").get(newUsername, result.user.id);
      if (existing) {
        return NextResponse.json({ error: "Ce nom d'utilisateur est déjà pris" }, { status: 400 });
      }

      db.prepare("UPDATE users SET username = ?, updated_at = ? WHERE id = ?").run(newUsername, Date.now(), result.user.id);
    }

    // Récupérer les infos mises à jour
    const updatedUser = getUserById(result.user.id);

    return NextResponse.json({
      success: true,
      user: updatedUser ? {
        id: updatedUser.id,
        username: updatedUser.username,
        isAdmin: updatedUser.is_admin === 1,
      } : null,
    });
  } catch (error) {
    console.error("Update account error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
