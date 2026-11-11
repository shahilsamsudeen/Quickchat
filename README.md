# QuickChat

QuickChat est une application de messagerie instantanée développée avec React et Node.js. Elle permet de créer un compte, d’ajouter des contacts et d’échanger des messages privés en temps réel.

## Fonctionnalités

- Inscription et connexion avec mots de passe hachés et jetons JWT.
- Demandes de contact : envoi, acceptation et refus.
- Présence en ligne visible entre contacts acceptés.
- Conversations privées en temps réel avec historique et indicateur de saisie.
- Modification et suppression de ses propres messages.
- Envoi de pièces jointes : JPEG, PNG, GIF, MP4, PDF et ZIP, jusqu’à 5 Mo.
- Synchronisation des événements Socket.IO avec l’adaptateur Redis.

## Technologies

- **Client :** React, Vite, Socket.IO Client
- **Serveur :** Node.js, Express, Socket.IO
- **Données :** MongoDB avec Mongoose
- **Temps réel et présence :** Redis et `@socket.io/redis-adapter`
- **Authentification :** JWT et bcryptjs

## Lancer le projet en local

### Prérequis

- Node.js et npm
- MongoDB
- Redis

### 1. Configurer le serveur

Dans un terminal, installer les dépendances :

```bash
cd server
npm install
```

Créer un fichier `server/.env` avec les paramètres de ton environnement :

```env
PORT=5001
MONGO_URI=mongodb://127.0.0.1:27017/quickchat
REDIS_URL=redis://127.0.0.1:6379
JWT_SECRET=remplacer-par-une-cle-aleatoire-longue
JWT_EXPIRES_IN=7d
```

Démarrer l’API et le serveur Socket.IO :

```bash
npm run dev
```

Le serveur écoute sur `http://localhost:5001`.

### 2. Configurer le client

Dans un deuxième terminal :

```bash
cd client
npm install
npm run dev
```

Vite affiche l’adresse locale du client, généralement `http://localhost:5173`.

Pour lancer l’ensemble en local, configure l’URL de l’API dans `client/src/api.js` sur `http://localhost:5001/api` et l’URL Socket.IO dans `client/src/socket.js` sur `http://localhost:5001`. Ces deux fichiers contiennent actuellement une URL d’hébergement préconfigurée ; elle n’est pas nécessaire au lancement local.

## Structure du projet

```text
quickchat/
├── client/                 # Interface React et configuration Vite
│   └── src/composants/     # Interface de chat et panneau de messages privés
└── server/                 # API Express et serveur Socket.IO
    ├── config/             # Connexion MongoDB
    ├── middleware/         # Authentification JWT
    ├── models/             # Modèles MongoDB
    ├── routes/              # Routes d’authentification, contacts et messages
    ├── socket/              # Événements de messagerie en temps réel
    └── uploads/             # Pièces jointes locales (ignorées par Git)
```

Les secrets et adresses de bases de données doivent rester dans les variables d’environnement. Ne publie jamais le fichier `.env` ni les pièces jointes de `server/uploads/`.
