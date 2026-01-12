# Solilok Drive

Application de partage de fichiers auto-hébergée avec interface moderne.

![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker)
![License](https://img.shields.io/badge/License-MIT-green)

## Fonctionnalités

- Upload drag & drop avec prévisualisation (images, vidéos, audio)
- Liens de partage avec QR Code
- Expiration configurable (7-30 jours)
- Thème clair/sombre
- Multi-utilisateurs avec isolation des fichiers
- Dashboard admin complet
- **Configuration au premier lancement**

## Installation (30 secondes)

```bash
# Télécharger le fichier docker-compose
curl -O https://raw.githubusercontent.com/FlexiFlizz/SolilokDrivePUBLIC/main/docker-compose.yml

# Lancer
docker compose up -d
```

Accédez à `http://localhost:3005/setup` et configurez votre Drive.

**C'est tout !**

## Installation alternative (Portainer)

1. **Stacks** > **Add stack**
2. Collez ce contenu :

```yaml
services:
  solilok-drive:
    image: ghcr.io/flexiflizz/solilokdrivepublic:latest
    container_name: solilok-drive
    restart: unless-stopped
    ports:
      - "3005:3000"
    volumes:
      - solilok-data:/app/data
      - solilok-uploads:/app/uploads

volumes:
  solilok-data:
  solilok-uploads:
```

3. **Deploy the stack**

## Configuration initiale

Au premier lancement, configurez :

| Paramètre | Description |
|-----------|-------------|
| Nom de l'application | Affiché dans l'interface |
| Limite de stockage | En Go (1-1000) |
| Utilisateur admin | Nom d'utilisateur |
| Mot de passe admin | Min. 4 caractères |

## Changer le port

Modifiez `3005:3000` dans le docker-compose :
```yaml
ports:
  - "8080:3000"  # Accessible sur le port 8080
```

## Mise à jour

```bash
docker compose pull
docker compose up -d
```

## Sauvegarde

```bash
# Les données sont dans des volumes Docker
docker run --rm -v solilok-data:/data -v $(pwd):/backup alpine tar czf /backup/solilok-backup.tar.gz /data
```

## Licence

MIT
