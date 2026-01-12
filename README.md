# Solilok Drive

Application de partage de fichiers auto-hébergée avec interface moderne et configuration simple.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker)
![License](https://img.shields.io/badge/License-MIT-green)

## Fonctionnalités

- Upload drag & drop avec prévisualisation (images, vidéos, audio)
- Liens de partage avec QR Code
- Expiration configurable (7-30 jours)
- Thème clair/sombre
- Multi-utilisateurs avec isolation des fichiers
- Dashboard admin complet
- **Assistant de configuration au premier lancement**

## Installation

### Docker Compose

```bash
git clone https://github.com/FlexiFlizz/SolilokDrivePUBLIC.git
cd SolilokDrivePUBLIC
docker compose up -d
```

Accédez à `http://localhost:3005/setup` pour la configuration initiale.

### Portainer (Stack Git)

1. **Stacks** > **Add stack**
2. **Build method**: Repository
3. **Repository URL**: `https://github.com/FlexiFlizz/SolilokDrivePUBLIC`
4. **Compose path**: `docker-compose.yml`
5. Cliquez **Deploy the stack**

## Configuration initiale

Au premier lancement, l'assistant demande :

| Paramètre | Description |
|-----------|-------------|
| Nom de l'application | Affiché dans l'interface |
| Limite de stockage | En Go (1-1000) |
| Utilisateur admin | Nom d'utilisateur |
| Mot de passe admin | Min. 4 caractères |

## docker-compose.yml

```yaml
services:
  solilok-drive:
    build: .
    ports:
      - "3005:3000"  # Changez 3005 si besoin
    volumes:
      - ./data:/app/data
      - ./uploads:/app/uploads
    restart: unless-stopped
```

## Sauvegarde / Mise à jour

```bash
# Sauvegarde
cp -r data/ backup/ && cp -r uploads/ backup/

# Mise à jour
git pull && docker compose up -d --build
```

## Licence

MIT
