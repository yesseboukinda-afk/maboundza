# MABOUNDZA 🌿

**Slogan :** *Photographier, documenter et préserver la flore du Gabon.*

MABOUNDZA est une application mobile destinée à documenter et préserver la flore équatoriale et la pharmacopée traditionnelle du Gabon. Les contenus botaniques doivent être ajoutés à partir de sources vérifiées.

---

## 📸 Fonctionnalités Clés

1. **Scanner** : Prenez une photo avec la caméra ou choisissez-en une dans la galerie. L’observation est enregistrée automatiquement dans l’herbier. L’identification botanique n’est pas encore configurée.
2. **Encyclopédie botanique** : Affiche les fiches vérifiées ajoutées à Firebase et mises en cache localement.
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

---

## 📱 Compilation & Déploiement

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
