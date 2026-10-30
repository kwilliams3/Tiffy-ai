# Tiffy sur Android et iOS

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
workflow **Android APK de test**, **Run workflow**. Si la compilation réussit,
télécharger l’artefact `tiffy-android-debug`, le décompresser et installer l’APK.
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
