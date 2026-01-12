import { NextRequest, NextResponse } from "next/server";
import { getValidSession, getUserById, deleteUser, updateUserPassword, toggleUserActive } from "@/lib/db";

// DELETE - Supprimer un utilisateur (admin seulement)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionId = request.cookies.get("session")?.value;
    if (!sessionId) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const result = getValidSession(sessionId);
    if (!result || result.user.is_admin !== 1) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const { id } = await params;

    // Empêcher la suppression de son propre compte
    if (id === result.user.id) {
      return NextResponse.json({ error: "Vous ne pouvez pas supprimer votre propre compte" }, { status: 400 });
    }

    const userToDelete = getUserById(id);
    if (!userToDelete) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    deleteUser(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete user error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// PATCH - Modifier un utilisateur (admin seulement)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionId = request.cookies.get("session")?.value;
    if (!sessionId) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const result = getValidSession(sessionId);
    if (!result || result.user.is_admin !== 1) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const { id } = await params;
    const { password, toggleActive } = await request.json();

    const userToUpdate = getUserById(id);
    if (!userToUpdate) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    // Toggle active status
    if (toggleActive === true) {
      // Empêcher de se désactiver soi-même
      if (id === result.user.id) {
        return NextResponse.json({ error: "Vous ne pouvez pas désactiver votre propre compte" }, { status: 400 });
      }
      const newStatus = toggleUserActive(id);
      return NextResponse.json({ success: true, isActive: newStatus });
    }

    // Update password
    if (password) {
      if (password.length < 4) {
        return NextResponse.json({ error: "Le mot de passe doit faire au moins 4 caractères" }, { status: 400 });
      }
      updateUserPassword(id, password);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
