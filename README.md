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

### Voix

Le bouton **micro** du chat permet de dicter un message en français : la voix est transcrite dans le champ de saisie, puis l’utilisateur arrête la dictée, relit et envoie son texte. Il ne s’agit pas d’une pièce jointe audio ; Tiffy n’enregistre pas de fichier vocal dans l’historique. L’autorisation du microphone est demandée au démarrage de la dictée. Le micro s’arrête après une minute au maximum et à la fermeture du chat.

La dictée utilise `SpeechRecognition` ou `webkitSpeechRecognition` lorsqu’ils sont disponibles, en contexte sécurisé. Certains navigateurs utilisent un service distant pour transcrire l’audio : la dictée n’est donc pas garantie hors ligne. Si elle n’est pas prise en charge, le bouton est désactivé avec une explication et la saisie texte reste disponible.

Le bouton **Écouter** sous une réponse lance sa lecture et permet de l’arrêter. L’icône haut-parleur dans le champ de saisie, ou **Paramètres → À ton rythme → Réponses vocales**, active la lecture automatique des réponses terminées quand l’onglet est visible. Ce réglage est mémorisé sur l’appareil. Les longs textes sont lus par petits segments ; la mise en forme Markdown est simplifiée et les blocs de code ne sont pas épelés. Commencer une dictée, envoyer un nouveau message ou changer de conversation arrête la lecture précédente. La synthèse utilise les voix disponibles sur le système, sans clé API supplémentaire. Les politiques audio du navigateur peuvent imposer un clic manuel sur « Écouter ».

Références : [reconnaissance vocale](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition) et [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API).

Dans **Paramètres → Personnalité**, le **Mode taquin** permet à Tiffy de répondre au chambrage par des piques et des répliques familières. Il est désactivé par défaut et enregistré séparément de l’historique sur cet appareil. Le réglage est envoyé avec chaque nouvelle demande, y compris les relances. Tiffy reste sérieux pour les demandes d’aide et arrête les plaisanteries quand l’utilisateur le demande. Ce choix de ton ne désactive pas les règles du fournisseur IA.

Dans **Paramètres → À ton rythme**, les **Notifications** et les **Sons** sont activables séparément et mémorisés sur cet appareil. Les notifications nécessitent une autorisation du navigateur et un contexte sécurisé (HTTPS ou localhost). Elles apparaissent uniquement si l’onglet est en arrière-plan, après une réponse réussie ; cliquer dessus ouvre la conversation. Les notifications ne contiennent pas le texte de la discussion. Sur mobile, la prise en charge dépend du navigateur et peut nécessiter l’installation de l’application. Tiffy doit rester ouvert pendant la génération : il ne s’agit pas de notifications push lorsque l’application est fermée.

Le son est une courte note synthétisée localement, sans téléchargement. Il est initialisé lors d’une action de l’utilisateur pour respecter les règles de lecture audio. Aucun son ni notification n’est déclenché après une erreur ou une annulation. Les réglages de l’appareil et du navigateur peuvent bloquer les alertes. Voir les documentations [Notifications](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API) et [lecture audio](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices).

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
# Discussion vocale

Le bouton unique ouvre l’écran vocal. La transcription s’affiche pendant la parole ;
« Envoyer maintenant » permet de terminer le tour sans attendre le silence.
Une erreur de microphone, de réseau ou de réponse reste visible dans cet écran,
en pause, avec la possibilité de réessayer. La reconnaissance fonctionne par
énoncés pour mieux prendre en charge les navigateurs mobiles.

Le bouton « Discussion vocale » active un échange mains libres : parole transcrite,
envoi automatique après environ 1,4 seconde de silence, réponse de Tiffy puis
lecture vocale, et réouverture du micro. « Quitter la discussion » arrête le micro,
la génération et la lecture. Le mode s’arrête aussi lorsque l’onglet est masqué.
Les échanges restent dans l’historique. Il faut autoriser le micro sur un navigateur
compatible en HTTPS. Le service de dictée du navigateur peut traiter la voix à distance.
La réponse vocale commence une fois le texte généré : ce mode fonctionne par tours
de parole, avec un délai dépendant du réseau, sans interruption vocale simultanée.

# Applications mobiles

Le projet Android Capacitor est dans `mobile/android`. Les commandes de préparation
Android/iOS, la compilation de l’APK de test sur GitHub Actions, les prérequis et les
limites de validation sont décrits dans [mobile/README.md](mobile/README.md).

