import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, Platform, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { FirebaseError } from 'firebase/app';
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithCredential, updateProfile } from 'firebase/auth';
import { ref, update } from 'firebase/database';
import { auth, database } from '@/services/firebase';
import { Colors } from '@/theme/colors';
import { Typography } from '@/theme/typography';
import { UserRole } from '@/types';
import { useAuthStore } from '@/store/authStore';

const ROLES = [
  { key: 'standard', label: 'Utilisateur Standard', icon: 'person-outline' },
  { key: 'child', label: 'Enfant (Petit Botaniste)', icon: 'happy-outline' },
  { key: 'parent', label: 'Parent / Famille', icon: 'people-outline' },
  { key: 'teacher', label: 'Enseignant / École', icon: 'school-outline' },
  { key: 'tradipractitioner', label: 'Tradipraticien du Gabon', icon: 'leaf-outline' },
  { key: 'expert_botanist', label: 'Expert Botaniste', icon: 'flask-outline' },
  { key: 'farmer', label: 'Agriculteur / Producteur', icon: 'nutrition-outline' },
] as const;

export default function RegisterScreen() {
  const router = useRouter();
  const { fetchProfile, setUser, setRole } = useAuthStore();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [province, setProvince] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('standard');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    const trimmedFirstName = firstName.trim();
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password || !trimmedFirstName) {
      Alert.alert('Champs requis', 'Veuillez renseigner votre prénom, votre email et votre mot de passe.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Mot de passe trop court', 'Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    if (!auth || !database) {
      Alert.alert('Inscription indisponible', 'La création de compte est momentanément indisponible. Réessayez plus tard.');
      return;
    }

    setLoading(true);
    let registrationStep = 'création du compte Firebase';
    try {
      const credential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
      registrationStep = 'enregistrement du profil';
      const displayName = `${trimmedFirstName} ${lastName.trim()}`.trim();
      const createdAt = credential.user.metadata.creationTime ?? new Date().toISOString();
      const profile = {
          id: credential.user.uid,
          email: credential.user.email,
          first_name: trimmedFirstName,
          last_name: lastName.trim(),
          display_name: displayName,
          province_gabon: province.trim(),
          created_at: createdAt,
      };
      let setupError: unknown;
      try {
        await updateProfile(credential.user, { displayName });
      } catch (error) {
        setupError = error;
        console.error('Unable to update new account display name:', error);
      }
      try {
        await update(ref(database), {
          [`profiles/${credential.user.uid}`]: profile,
          [`user_roles/${credential.user.uid}`]: {
            role: selectedRole,
            created_at: createdAt,
          },
        });
      } catch (error) {
        setupError = error;
        console.error('Unable to save new account profile:', error);
      }
      await fetchProfile();
      if (setupError) {
        setUser({
          ...profile,
          email: credential.user.email ?? trimmedEmail,
        });
        Alert.alert(
          'Compte créé',
          `Votre compte est actif, mais certaines informations du profil n’ont pas pu être enregistrées.${getFirebaseErrorCode(setupError) ? `\nCode : ${getFirebaseErrorCode(setupError)}` : ''} Vous pourrez réessayer après vous être connecté.`,
          [{ text: 'Continuer', onPress: () => router.replace('/(main)') }]
        );
      } else {
        Alert.alert('Compte créé', 'Votre inscription sur MABOUNDZA est réussie.', [
          { text: 'Continuer', onPress: () => router.replace('/(main)') }
        ]);
      }
    } catch (error) {
      console.error('Registration failed:', error);
      const messages: Record<string, string> = {
        'auth/email-already-in-use': 'Cette adresse email est déjà utilisée.',
        'auth/invalid-email': 'Veuillez saisir une adresse email valide.',
        'auth/weak-password': 'Le mot de passe doit contenir au moins 6 caractères.',
        'auth/operation-not-allowed': 'La création de comptes par email n’est pas activée sur ce service.',
        'auth/network-request-failed': 'Connexion impossible. Vérifiez votre accès à Internet puis réessayez.',
        'auth/too-many-requests': 'Trop de tentatives. Veuillez patienter avant de réessayer.',
        'auth/configuration-not-found': 'Le service de création de compte est mal configuré. Contactez l’assistance.',
        'auth/invalid-api-key': 'La clé API Firebase de l’application est invalide.',
        'auth/api-key-not-valid': 'La clé API Firebase de l’application est invalide.',
        'auth/app-not-authorized': 'Cette application n’est pas autorisée par le projet Firebase.',
        'auth/unauthorized-domain': 'Le domaine de cette application n’est pas autorisé dans Firebase.',
        'auth/internal-error': 'Firebase a rencontré une erreur interne. Réessayez dans quelques instants.',
      };
      const code = getFirebaseErrorCode(error) ?? '';
      const technicalMessage = getErrorMessage(error);
      const description = messages[code] ||
        technicalMessage ||
        'La création de compte a échoué. Vérifiez vos informations et réessayez.';
      const message = `${description}\nÉtape : ${registrationStep}\nCode : ${code || 'indisponible'}`;
      Alert.alert('Erreur de création', message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    if (Platform.OS !== 'android') {
      return;
    }

    if (!auth) {
      Alert.alert('Inscription indisponible', 'La création de compte est momentanément indisponible. Réessayez plus tard.');
      return;
    }

    const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
    if (!webClientId) {
      Alert.alert('Configuration manquante', 'L’identifiant client Web Google n’est pas configuré dans l’application.');
      return;
    }

    setLoading(true);
    let googleSignInStatusCodes: typeof import('@react-native-google-signin/google-signin').statusCodes | undefined;

    try {
      const { GoogleSignin, isSuccessResponse, statusCodes } = await import('@react-native-google-signin/google-signin');
      googleSignInStatusCodes = statusCodes;
      GoogleSignin.configure({ webClientId });
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      const response = await GoogleSignin.signIn();
      if (!isSuccessResponse(response)) {
        return;
      }

      if (!response.data.idToken) {
        throw new Error('Google Sign-In returned no ID token.');
      }

      const credential = await signInWithCredential(auth, GoogleAuthProvider.credential(response.data.idToken));
      const displayName = credential.user.displayName ?? '';
      const [googleFirstName = '', ...googleLastNameParts] = displayName.split(/\s+/).filter(Boolean);
      const profile = {
        id: credential.user.uid,
        email: credential.user.email,
        first_name: googleFirstName,
        last_name: googleLastNameParts.join(' '),
        display_name: displayName,
        province_gabon: province.trim(),
        created_at: credential.user.metadata.creationTime ?? new Date().toISOString(),
      };

      let profileSaved = true;
      if (database) {
        try {
          await update(ref(database), {
            [`profiles/${credential.user.uid}`]: profile,
            [`user_roles/${credential.user.uid}`]: {
              role: selectedRole,
              created_at: profile.created_at,
            },
          });
        } catch (error) {
          profileSaved = false;
          console.error('Unable to save Google account profile:', error);
        }
      } else {
        profileSaved = false;
      }

      await fetchProfile();
      if (!profileSaved) {
        setUser({ ...profile, email: credential.user.email ?? '' });
        setRole(selectedRole);
        Alert.alert(
          'Compte créé',
          'Votre compte Google est actif, mais certaines informations de profil n’ont pas pu être enregistrées. Vous pourrez réessayer plus tard.',
          [{ text: 'Continuer', onPress: () => router.replace('/(main)') }]
        );
        return;
      }

      router.replace('/(main)');
    } catch (error) {
      console.error('Google registration failed:', error);
      const errorCode = error instanceof FirebaseError
        ? error.code
        : typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string'
          ? error.code
          : undefined;
      let message = 'La création de compte Google a échoué. Vérifiez la configuration OAuth et réessayez.';

      if (errorCode === googleSignInStatusCodes?.PLAY_SERVICES_NOT_AVAILABLE) {
        message = 'Les services Google Play sont absents ou obsolètes sur cet appareil.';
      } else if (errorCode === 'DEVELOPER_ERROR') {
        message = 'La configuration Google Android ne correspond pas à cette application. Vérifiez le package et le SHA‑1.';
      } else if (errorCode === 'auth/operation-not-allowed') {
        message = 'La connexion Google n’est pas activée dans Firebase Authentication.';
      } else if (errorCode === 'auth/account-exists-with-different-credential') {
        message = 'Un compte existe déjà avec cette adresse email. Connectez-vous avec sa méthode habituelle.';
      } else if (errorCode === 'auth/invalid-credential') {
        message = 'Google a renvoyé un identifiant invalide. Vérifiez l’identifiant client Web configuré.';
      } else if (error instanceof Error && /native.*google|google.*native|RNGoogleSignin/i.test(error.message)) {
        message = 'Cette version de l’application ne contient pas le module Google natif. Installez une build de développement Android, Expo Go ne le prend pas en charge.';
      } else if (error instanceof Error && error.message === 'Google Sign-In returned no ID token.') {
        message = 'Aucun jeton Google n’a été reçu. Vérifiez que l’identifiant client Web OAuth est correct.';
      }

      Alert.alert('Erreur de création Google', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Créer un Compte MABOUNDZA</Text>
      <Text style={styles.subtitle}>Rejoignez le réseau de préservation de la flore gabonaise</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Prénom</Text>
        <TextInput style={styles.input} placeholder="ex: Jean-Paul" value={firstName} onChangeText={setFirstName} />

        <Text style={styles.label}>Nom</Text>
        <TextInput style={styles.input} placeholder="ex: Mbadinga" value={lastName} onChangeText={setLastName} />

        <Text style={styles.label}>Email</Text>
        <TextInput style={styles.input} placeholder="ex: jeanpaul@maboundza.ga" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />

        <Text style={styles.label}>Mot de passe</Text>
        <TextInput style={styles.input} placeholder="6+ caractères" value={password} onChangeText={setPassword} secureTextEntry />

        <Text style={styles.label}>Province de résidence au Gabon</Text>
        <TextInput style={styles.input} placeholder="ex: Woleu-Ntem, Estuaire..." value={province} onChangeText={setProvince} />

        <Text style={styles.label}>Sélectionnez votre Rôle</Text>
        <View style={styles.rolesGrid}>
          {ROLES.map((r) => (
            <TouchableOpacity
              key={r.key}
              style={[styles.roleCard, selectedRole === r.key && styles.roleCardActive]}
              onPress={() => setSelectedRole(r.key)}
            >
              <Ionicons name={r.icon} size={20} color={Colors.forestGreen} />
              <Text style={[styles.roleLabel, selectedRole === r.key && styles.roleLabelActive]}>{r.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? 'Création en cours...' : 'Finaliser l\'Inscription'}</Text>
        </TouchableOpacity>

        {Platform.OS === 'android' && (
          <TouchableOpacity
            style={[styles.googleButton, loading && styles.buttonDisabled]}
            onPress={handleGoogleRegister}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="S’inscrire avec Google"
            accessibilityState={{ disabled: loading, busy: loading }}
          >
            <Image source={require('../../assets/google.png')} style={styles.googleLogo} />
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.linkText}>Déjà un compte ? Connectez-vous</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function getFirebaseErrorCode(error: unknown): string | null {
  if (error instanceof FirebaseError) {
    return error.code;
  }
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = error.code;
    return typeof code === 'string' ? code : null;
  }
  return null;
}

function getErrorMessage(error: unknown): string | null {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = error.message;
    return typeof message === 'string' ? message : null;
  }
  return null;
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: Colors.forestGreen,
  },
  title: {
    ...Typography.header1,
    color: Colors.white,
    marginTop: 40,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.naturalBeige,
    marginBottom: 24,
    opacity: 0.9,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 40,
  },
  label: {
    ...Typography.caption,
    color: Colors.darkGray,
    fontWeight: '700',
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.naturalBeige,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  rolesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  roleCard: {
    width: '48%',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.naturalBeige,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleCardActive: {
    backgroundColor: Colors.lightGreen,
    borderColor: Colors.primaryGreen,
    borderWidth: 2,
  },
  roleLabel: {
    ...Typography.caption,
    fontSize: 11,
    color: Colors.darkGray,
    flexShrink: 1,
  },
  roleLabelActive: {
    color: Colors.forestGreen,
    fontWeight: '700',
  },
  button: {
    backgroundColor: Colors.primaryGreen,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    ...Typography.bodyBold,
    color: Colors.white,
  },
  googleButton: {
    backgroundColor: Colors.white,
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginTop: 16,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  googleLogo: {
    width: 28,
    height: 28,
  },
  linkText: {
    ...Typography.caption,
    color: Colors.primaryGreen,
    textAlign: 'center',
    marginTop: 16,
    fontWeight: '600',
  },
});
