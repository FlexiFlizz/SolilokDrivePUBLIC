import { NextRequest, NextResponse } from "next/server";
import { getUserByUsername, verifyPassword, createSession, createLoginLog } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: "Identifiants requis" }, { status: 400 });
    }

    // Récupérer IP et User-Agent pour le log
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const userAgent = request.headers.get("user-agent") || null;

    const user = getUserByUsername(username);
    if (!user) {
      return NextResponse.json({ error: "Identifiants incorrects" }, { status: 401 });
    }

    const isValid = verifyPassword(password, user.password_hash);
    if (!isValid) {
      // Log échec de connexion
      createLoginLog(user.id, username, ip, userAgent, false);
      return NextResponse.json({ error: "Identifiants incorrects" }, { status: 401 });
    }

    // Vérifier si le compte est actif
    if (user.is_active !== 1) {
      createLoginLog(user.id, username, ip, userAgent, false);
      return NextResponse.json({ error: "Compte désactivé" }, { status: 403 });
    }

    // Log connexion réussie
    createLoginLog(user.id, username, ip, userAgent, true);

    const session = createSession(user.id);

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        isAdmin: user.is_admin === 1,
      },
    });

    response.cookies.set("session", session.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 15 * 60, // 15 minutes (sera rafraîchi côté serveur)
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
