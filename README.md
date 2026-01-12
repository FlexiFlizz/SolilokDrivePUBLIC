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

## Installation

```bash
git clone https://github.com/FlexiFlizz/SolilokDrivePUBLIC.git
cd SolilokDrivePUBLIC
docker compose up -d
```

Accédez à `http://localhost:3005/setup` et configurez votre Drive.

## Installation Portainer

1. **Stacks** > **Add stack**
2. **Build method**: Repository
3. **Repository URL**: `https://github.com/FlexiFlizz/SolilokDrivePUBLIC`
4. **Compose path**: `docker-compose.yml`
5. **Deploy the stack**

## Configuration initiale

Au premier lancement :

| Paramètre | Description |
|-----------|-------------|
| Nom de l'application | Affiché dans l'interface |
| Limite de stockage | En Go (1-1000) |
| Utilisateur admin | Nom d'utilisateur |
| Mot de passe admin | Min. 4 caractères |

## Changer le port

Dans `docker-compose.yml` :
```yaml
ports:
  - "8080:3000"  # Port 8080 au lieu de 3005
```

## Mise à jour

```bash
git pull
docker compose up -d --build
```

## Sauvegarde

```bash
docker run --rm -v solilok-data:/data -v $(pwd):/backup alpine tar czf /backup/backup.tar.gz /data
```

## Licence

MIT
