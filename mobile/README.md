# Tiffy sur Android et iOS

## Mises à jour des installations Android

Les nouvelles versions vérifient les GitHub Releases au lancement. Une bannière
propose l’APK lorsqu’un code de version supérieur est publié. Les paramètres
contiennent aussi « Vérifier les mises à jour ». Le téléchargement s’ouvre dans
le navigateur du téléphone ; Android demande ensuite la confirmation de l’installation.
Ce mécanisme ne réalise aucune installation silencieuse et ne concerne pas iOS.

La première migration depuis les anciens APK de test peut nécessiter une
désinstallation, car leurs clés de signature étaient temporaires. Exporter les
conversations avant cette migration ; les importer n’est pas encore pris en charge.
Les versions signées avec la nouvelle clé fixe peuvent ensuite se mettre à jour
sans désinstaller et conservent le stockage local.

Configuration initiale, une seule fois :

1. `npm run mobile:signing` crée la clé privée dans `.android-signing.local`, exclu de Git.
   Si elle existe déjà, le script ne la remplace pas. Sauvegarder ce dossier en privé.
2. Dans GitHub, dépôt **Tiffy-ai**, **Settings → Secrets and variables → Actions**,
   créer le secret **ANDROID_SIGNING_BUNDLE** avec le contenu exact du fichier
   `.android-signing.local/github-secret.json`. Ne pas le coller dans une discussion
   et ne jamais committer ce fichier ou une clé privée.
3. Envoyer le code et lancer le workflow Android. Il restaure cette clé, génère un
   `versionCode` croissant à partir du numéro d’exécution et compile un APK release.
4. La GitHub Release publique `android-<versionCode>` contient **Tiffy.apk** et sa
   somme SHA-256. L’application ne propose que cet APK de ce dépôt exact.

L’activation exige l’enregistrement du secret. Tant qu’il manque, la compilation
s’arrête avec une erreur explicite plutôt que de distribuer un APK signé avec une
autre clé. Ne jamais régénérer la clé pour une simple mise à jour.

Le projet Capacitor est isolé dans `mobile/` pour que le site web garde ses
dépendances actuelles. Les fichiers de l’interface sont embarqués dans l’application,
sans charger le site distant dans une fenêtre. Seules les requêtes IA contactent
`https://spark-my-ai.vercel.app/api/chat`. Aucune clé Gemini ne doit être copiée
dans le projet mobile. L’historique reste local à chaque installation.

## Android

Prérequis : Node 22+, Android Studio compatible Capacitor 8, JDK 21 et SDK Android.
Depuis la racine :

```powershell
npm ci
npm run mobile:android
npm run mobile:open:android
```

Le premier lancement installe les dépendances mobiles, compile l’interface,
génère `mobile/android` et synchronise les plugins. Dans Android Studio, choisir
un téléphone connecté ou un émulateur. Pour un APK de test, compiler `assembleDebug`
avec le wrapper Gradle du dossier `mobile/android`. Cet APK utilise une signature
de développement ; il ne constitue pas une version de publication Play Store.

Une autre possibilité, après envoi du code sur GitHub : onglet **Actions**,
workflow **Android APK et mises à jour**, **Run workflow**. Si la compilation réussit,
télécharger `Tiffy.apk` dans les Releases, ou l’artefact `tiffy-android-signed`.
Le workflow ne publie rien sur un store et ne nécessite pas la clé Gemini.

## iOS

Sur Mac avec Xcode et les outils Capacitor 8 :

```sh
npm ci
npm run mobile:ios
npm run mobile:open:ios
```

Le script ajoute les descriptions d’usage du microphone et de la reconnaissance
vocale à `Info.plist`. Dans Xcode, choisir une équipe de signature avant de lancer
sur un iPhone. La distribution TestFlight/App Store demande une configuration
Apple Developer et une validation sur appareil.

## Voix et stabilité

Le build mobile utilise les plugins natifs `@capgo/capacitor-speech-recognition`
et `@capacitor-community/text-to-speech` pour la dictée et la lecture, au lieu des
API vocales du navigateur. Les autorisations sont demandées au démarrage du micro.
Le français et la disponibilité du service vocal dépendent des composants installés
sur le téléphone ; certains services de dictée utilisent Internet.

Le build web conserve ses API habituelles. Le service worker est désactivé dans
le build mobile. La hauteur visible suit le clavier ; le défilement pendant une
réponse ne force plus une animation à chaque morceau et respecte la lecture des
anciens messages. Tester ces comportements sur téléphone avant distribution.

## Serveur et mises à jour

Déployer aussi la modification du serveur `server/chat.mjs` : elle autorise les
origines natives exactes `https://localhost` et `capacitor://localhost`, y compris
les requêtes OPTIONS. Les limites de débit restent actives. CORS ne remplace pas
une authentification et ne protège pas à lui seul un endpoint public.

Pour changer de serveur, définir `VITE_API_BASE_URL` comme origine HTTPS avant
`npm run mobile:android` ou `mobile:ios`. Cette URL est publique ; aucun secret
ne doit utiliser le préfixe `VITE_`. L’identifiant provisoire est
`com.kwilliams.tiffy` : le confirmer avant une première publication sur les stores.

Les modifications du site ne mettent pas automatiquement à jour l’interface
embarquée : recompiler, synchroniser et distribuer une nouvelle application.
Les exportations, notifications, appels entrants, écouteurs, autorisations refusées,
mode hors connexion et reprise après mise en arrière-plan doivent être vérifiés
sur de vrais appareils. Aucun résultat de simulation ne remplace ces vérifications.
