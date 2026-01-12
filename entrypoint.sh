#!/bin/sh

# Créer les dossiers s'ils n'existent pas et fixer les permissions
mkdir -p /app/data /app/uploads

# Lancer l'application
exec node server.js
