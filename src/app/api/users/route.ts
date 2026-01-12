import { NextRequest, NextResponse } from "next/server";
import { getValidSession, getAllUsers, createUser, getUserByUsername } from "@/lib/db";

// GET - Liste tous les utilisateurs (admin seulement)
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

    const users = getAllUsers().map((u) => ({
      id: u.id,
      username: u.username,
      isAdmin: u.is_admin === 1,
      isActive: u.is_active === 1,
      createdAt: u.created_at,
    }));

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Get users error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST - Créer un nouvel utilisateur (admin seulement)
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

    const { username, password, isAdmin } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: "Nom d'utilisateur et mot de passe requis" }, { status: 400 });
    }

    if (username.length < 3 || username.length > 20) {
      return NextResponse.json({ error: "Le nom d'utilisateur doit faire entre 3 et 20 caractères" }, { status: 400 });
    }

    if (password.length < 4) {
      return NextResponse.json({ error: "Le mot de passe doit faire au moins 4 caractères" }, { status: 400 });
    }

    const existingUser = getUserByUsername(username);
    if (existingUser) {
      return NextResponse.json({ error: "Ce nom d'utilisateur existe déjà" }, { status: 400 });
    }

    const user = createUser(username, password, isAdmin === true);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        isAdmin: user.is_admin === 1,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    console.error("Create user error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
