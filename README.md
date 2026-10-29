# Tiffy

Assistant IA avec React, TypeScript, Vite et Gemini. Les conversations restent dans le stockage local du navigateur.

## Démarrer

Installer Node.js 22.18 ou plus récent, puis :

```sh
npm install
```

Copier `.env.example` vers `.env` si nécessaire, puis renseigner la clé créée dans [Google AI Studio](https://aistudio.google.com/apikey) :

```dotenv
GEMINI_API_KEY=ta-cle-google
FRONTEND_PORT=5187
BACKEND_PORT=4317
```

Lancer l'application :

```sh
npm run dev
```

Ouvrir http://localhost:5187. `npm run dev` démarre le frontend (5187) et le backend (4317). Redémarrer après toute modification de `.env`. Les ports sont configurables avec `FRONTEND_PORT` et `BACKEND_PORT`.

Pour les lancer séparément : `npm run dev:front` et `npm run dev:back`. Les requêtes `/api` sont transmises au backend par le proxy Vite.

## Fonctionnement

Le navigateur envoie les messages à `/api/chat`. Le serveur appelle directement Gemini 3.1 Flash-Lite et transmet les réponses progressivement. La clé reste sur le serveur et ne doit jamais porter le préfixe `VITE_`. Les fichiers `.env` sont exclus de Git.

Google reçoit les messages de la conversation. L'offre gratuite est limitée par des quotas ; les contenus peuvent servir à améliorer les produits Google selon ses conditions. Consulter les [tarifs officiels](https://ai.google.dev/gemini-api/docs/pricing).

## Conversations et outils

- **Arrêter** interrompt la génération et conserve le texte déjà reçu. Changer de conversation arrête aussi la réponse en cours.
- **Réessayer** relance le dernier message après un arrêt ou une erreur, sans le dupliquer. **Nouvelle réponse** régénère la dernière réponse réussie.
- **Modifier** permet de corriger un message envoyé. La nouvelle réponse remplace les messages situés après celui-ci ; le formulaire le rappelle avant validation.
- Le bouton d’export dans l’en-tête télécharge la conversation en Markdown ou JSON, ou tout l’historique en JSON. Les fichiers contiennent les conversations locales, pas les variables du serveur.
- Les blocs de code proposent une coloration légère pour les langages courants et un bouton de copie. Les langages inconnus restent affichés en texte brut.

L’historique complet reste local. Le contexte envoyé à Google est limité aux messages récents et à une taille maximale pour maîtriser la consommation.

## Protection de l’API

Le serveur limite les requêtes à **8 par minute par IP et par instance**, avec au maximum **2 réponses simultanées par IP** et **6 par instance**. Les données sont validées même quand l’hébergeur a déjà décodé le JSON : 64 Kio par requête, 50 messages, 12 000 caractères par message et 40 000 caractères de contexte. Les réponses sont limitées à 4 096 tokens. Les demandes de navigateur provenant d’une autre origine sont refusées. Les erreurs de fréquence incluent `Retry-After`.

Ces compteurs sont en mémoire et se réinitialisent au redémarrage. Ils ne constituent pas une limite globale de quota sur un hébergement multi-instance. Pour une protection partagée en production, ajouter dans **Vercel → Firewall** une règle de limitation sur le chemin `/api/chat`, par exemple 8 requêtes par minute par IP. Voir le [guide officiel Vercel](https://vercel.com/kb/guide/add-rate-limiting-vercel). Les quotas du fournisseur continuent aussi de s’appliquer.

## Déploiement sur Vercel

Le projet contient la fonction `api/chat.mjs` et sa configuration de routage. Importer le dépôt sur Vercel avec le préréglage Vite, puis ajouter `GEMINI_API_KEY` dans les variables d'environnement du projet et déployer.

Un hébergement de fichiers statiques seul ne suffit pas : `/api/chat` doit être exécuté par un serveur. Pour prévisualiser la compilation localement, lancer `npm run dev:back` et `npm run preview` dans deux terminaux.

## Installation sur un serveur sans accès au registre npm

Sur un autre ordinateur **Windows x64** avec Node.js 22.18 ou plus récent et un accès Internet, copier ce projet puis exécuter :

```powershell
powershell -File scripts/prepare-offline.ps1
```

Le script installe les dépendances, vérifie la compilation et crée `tiffy-windows-x64.offline.zip`. Le fichier `.env` et la clé Gemini ne sont pas inclus.

Transférer l'archive sur le serveur Windows x64, arrêter les processus de cette application avant l'extraction, puis extraire son contenu dans le dossier du projet. Conserver le `.env` du serveur. Lancer ensuite `npm run dev`, sans réinstaller les dépendances. Le serveur devra toujours pouvoir joindre `generativelanguage.googleapis.com` pour les réponses Gemini.

## Vérifications

```sh
npm run test:api
npm test
npm run lint
npm run build
```

Les tests API utilisent des réponses Gemini simulées et ne nécessitent aucune clé.
