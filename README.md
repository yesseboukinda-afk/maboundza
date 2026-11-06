# MABOUNDZA 🌿

**Slogan :** *Photographier, documenter et préserver la flore du Gabon.*

MABOUNDZA est une application mobile destinée à documenter et préserver la flore équatoriale et la pharmacopée traditionnelle du Gabon. Les contenus botaniques doivent être ajoutés à partir de sources vérifiées.

---

## 📸 Fonctionnalités Clés

1. **Scanner** : Prenez une photo avec la caméra ou choisissez-en une dans la galerie. L’observation est enregistrée automatiquement dans l’herbier. L’identification botanique n’est pas encore configurée.
2. **Encyclopédie botanique** : Affiche les fiches vérifiées ajoutées à Firebase et mises en cache localement. Un filtre distinct « Observations GBIF » permet aussi de consulter hors ligne jusqu’à 1 000 taxons signalés au Gabon, clairement identifiés comme non vérifiés par MABOUNDZA.
3. **Informations de sécurité** : Affiche les précautions renseignées dans les fiches disponibles ; celles-ci doivent être validées par des sources qualifiées.
4. **Herbier numérique personnel** : Enregistre automatiquement les photos sur l’appareil et synchronise les fiches d’observation et les photos lorsque la connexion est disponible.
5. **Mode Petit Botaniste** : Interface ludique avec des quiz adaptés aux enfants (sans accès aux posologies médicales).
6. **Modes École & Famille** : Les espaces sont présents, mais leurs contenus ne sont pas encore configurés.
7. **Assistant Maman MABOUNDZA** : Répond à partir des fiches botaniques disponibles sur l’appareil. La saisie vocale et les réponses génératives ne sont pas configurées.

---

## 🛠 Stack Technique

- **Mobile** : React Native (Expo SDK 58), Expo Router, TypeScript strict.
- **State & Sync** : TanStack Query v5, Zustand, SQLite (`expo-sqlite`).
- **Styling** : Système de design aux couleurs botaniques du Gabon.
- **Backend & DB** : Firebase Realtime Database et Firebase Authentication.
- **Reconnaissance botanique** : Aucun modèle d’identification n’est intégré ou configuré pour le moment ; le scanner ne produit pas de prédictions.

---

## 📁 Architecture du Projet

```
maboundza/
├── app/                        # Navigation Expo Router
│   ├── (auth)/                 # Login & Inscription multi-rôles
│   ├── (main)/                 # Bottom Tabs (Accueil, Scanner, Encyclopédie, Herbier, Profil)
│   ├── plant/[id].tsx          # Fiche Botanique & Sécurité Médicinale
│   ├── kids/                   # Petit Botaniste avec Léo le Gorille
│   ├── school/                 # Mode École & Enseignants
│   ├── family/                 # Mode Famille
│   ├── assistant/              # Assistant Maman MABOUNDZA
│   └── _layout.tsx
├── src/
│   ├── database/               # SQLite Local Driver & Migrations
│   ├── offline/                # File d'attente de synchronisation
│   ├── services/               # Firebase et services applicatifs
│   ├── store/                  # Zustand Stores (AuthStore, ScannerStore, OfflineStore)
│   ├── theme/                  # Couleurs MABOUNDZA (#173D2D, #246B45, #C68A3A, #C83C3C)
│   └── types/                  # Types TypeScript stricts
├── firebase/                   # Règles Realtime Database
├── firebase.json               # Configuration CLI Firebase
├── supabase-legacy/            # Ancien schéma SQL conservé comme référence de migration
└── assets/                     # Images, icônes & mascottes
```

---

## 🚀 Procédure d'Installation & Configuration

### 1. Prérequis
- Node.js (v22.13+)
- Expo CLI (`npm i -g eas-cli`)
- Un projet [Firebase](https://console.firebase.google.com)

### 2. Installation des dépendances
```bash
cd maboundza
npm install
```

### 3. Configuration des Variables d'Environnement
Copiez le fichier `.env.example` en `.env` :
```bash
cp .env.example .env
```
Renseignez les valeurs de configuration de l'application Web Firebase dans le fichier `.env` (`Paramètres du projet > Général > Vos applications`). Ces valeurs sont des paramètres clients publics ; ne placez jamais de clé de compte de service dans l'application.
```env
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=votre-projet.firebaseapp.com
EXPO_PUBLIC_FIREBASE_DATABASE_URL=https://votre-base-rtdb
EXPO_PUBLIC_FIREBASE_PROJECT_ID=votre-projet
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=votre-projet.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...
```

### 4. Configuration Firebase
1. Dans la console Firebase, activez **Authentication > E-mail/Mot de passe**.
2. Créez une **Realtime Database**, puis copiez son URL exacte dans `EXPO_PUBLIC_FIREBASE_DATABASE_URL`.
3. Publiez les règles du fichier `firebase/database.rules.json` dans l'onglet **Règles** de la Realtime Database ou avec `firebase deploy --only database`.
4. Activez **Storage**, vérifiez les conditions de facturation de votre projet, puis publiez `firebase/storage.rules` avec `firebase deploy --only storage`. Les photos sont limitées à 10 Mo et accessibles au compte qui les a envoyées.
5. Ajoutez uniquement des fiches botaniques vérifiées sous `/plants/{id}`. Aucun jeu de données de démonstration n’est fourni.

Les anciens scripts SQL de `supabase-legacy/` ne sont pas exécutés par Firebase. Ils sont conservés comme référence : convertissez/exportez les autres données voulues en JSON avant de les importer. Les chemins utilisés par l'application sont `/profiles/{uid}`, `/user_roles/{uid}`, `/subscriptions/{uid}`, `/scans/{uid}`, `/herbarium_entries/{uid}` et `/contributions/{uid}`.

### Observations GBIF hors ligne
L’application récupère progressivement jusqu’à 1 000 noms d’espèces associés à des signalements de plantes au Gabon (observations et spécimens) depuis l’API GBIF, puis les conserve dans SQLite. Dès que l’application détecte une connexion Internet, elle enchaîne automatiquement des lots de 30 espèces tant qu’elle reste ouverte et qu’il reste des données à récupérer. Jusqu’à 3 photos par espèce sont recherchées et téléchargées pour la consultation hors ligne uniquement quand leur licence permet la réutilisation (CC0, CC BY ou CC BY-SA) et que les crédits nécessaires sont disponibles; les images CC BY-NC, CC BY-ND et sans licence explicite sont exclues. L’auteur, la licence et le lien de la source sont conservés avec chaque image. Les fichiers de plus de 5 Mo sont rejetés; les échecs réseau sont retentés avec un délai progressif. Les deux catégories de l’encyclopédie sont « Fiches vérifiées » et « Observations GBIF »; les filtres de langue ou d’usage ne sont pas encore disponibles, car ces informations ne sont pas dans les données importées. Cette collection est séparée des fiches vérifiées Firebase et ne doit pas servir de source d’informations médicinales. Les signalements et noms peuvent comporter des erreurs. L’exécution des tâches périodiques nécessite une compilation native (non disponible dans Expo Go).

---

## 📱 Compilation & Déploiement

### Mises à jour sans réinstallation (EAS Update)
Les builds `preview` et `production` utilisent EAS Update. Une première compilation avec cette configuration est nécessaire; après installation, les changements JavaScript, styles et contenus compatibles peuvent être publiés sans réinstaller l’application. Les changements natifs (par exemple une nouvelle bibliothèque native ou des permissions) nécessitent une nouvelle build. La politique de runtime `fingerprint` empêche une mise à jour incompatible avec les composants natifs de l’application.

Configurez dans EAS les variables `EXPO_PUBLIC_FIREBASE_*` et `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` pour les environnements `preview` et `production`. Pour créer la build Android de test à installer une fois :
```bash
npx eas build --platform android --profile preview
```

Après avoir installé cette build, publiez une mise à jour de test sur son canal :
```bash
npx eas update --channel preview --message "Description de la mise à jour" --environment preview
```

L’application télécharge la mise à jour compatible et l’applique au prochain lancement. N’envoyez pas de mise à jour `production` avant de l’avoir validée sur `preview`.

#### Publication automatique depuis GitHub
Le workflow GitHub Actions publie une mise à jour `preview` à chaque push sur la branche `main`, et peut aussi être lancé manuellement depuis l’onglet **Actions** du dépôt. Ajoutez un jeton Expo dans les secrets du dépôt GitHub sous **Settings > Secrets and variables > Actions > New repository secret**, avec le nom `EXPO_TOKEN`. Créez le jeton depuis les paramètres de compte Expo et ne le mettez jamais dans le code ou dans `.env`.

Pour le développement natif avec un serveur local, compilez le profil `development`, puis lancez :
```bash
npx eas build --platform android --profile development
npx expo start --dev-client
```

### Lancement en Mode Développement
```bash
npx expo start
```

### Génération du Fichier APK Android
```bash
eas build --platform android --profile preview
```

### Compilation iOS (TestFlight / App Store)
```bash
eas build --platform ios --profile production
```

---

## ⚖️ Note Légale et de Sécurité
> **Avertissement Médical :** L'application MABOUNDZA et ses assistants IA ne délivrent aucune prescription médicale. Toutes les données relatives à la pharmacopée gabonaise proviennent de sources scientifiques et traditionnelles validées par des professionnels certifiés.
