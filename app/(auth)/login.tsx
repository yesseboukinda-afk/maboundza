import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { FirebaseError } from 'firebase/app';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/services/firebase';
import { Colors } from '@/theme/colors';
import { Typography } from '@/theme/typography';
import { useAuthStore } from '@/store/authStore';

export default function LoginScreen() {
  const router = useRouter();
  const { fetchProfile } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Champs requis', 'Veuillez remplir votre adresse email et votre mot de passe.');
      return;
    }

    if (!auth) {
      Alert.alert('Connexion indisponible', 'La connexion est momentanément indisponible. Réessayez plus tard.');
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      await fetchProfile();
      router.replace('/(main)');
    } catch (error) {
      console.error('Sign-in failed:', error);
      const message = error instanceof FirebaseError && error.code === 'auth/invalid-credential'
        ? 'Adresse email ou mot de passe incorrect.'
        : 'La connexion est momentanément indisponible. Réessayez plus tard.';
      Alert.alert('Erreur de connexion', message);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoGuest = () => {
    router.replace('/(main)');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View var-brandHeader style={styles.brandContainer}>
        <View style={styles.logoBadge}>
          <Ionicons name="leaf-outline" size={40} color={Colors.forestGreen} />
        </View>
        <Text style={styles.title}>MABOUNDZA</Text>
        <Text style={styles.subtitle}>Documenter et préserver la flore du Gabon</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Connexion</Text>

        <Text style={styles.label}>Adresse Email</Text>
        <TextInput
          style={styles.input}
          placeholder="ex: mbadinga@maboundza.ga"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Text style={styles.label}>Mot de passe</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? 'Connexion en cours...' : 'Se Connecter'}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
          <Text style={styles.linkText}>Pas encore de compte ? Inscrivez-vous</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.guestButton} onPress={handleDemoGuest}>
          <Text style={styles.guestButtonText}>Continuer sans compte</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: Colors.forestGreen,
    justifyContent: 'center',
    padding: 24,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.lightGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    ...Typography.header1,
    color: Colors.white,
    letterSpacing: 2,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.naturalBeige,
    textAlign: 'center',
    marginTop: 8,
    opacity: 0.9,
  },
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 20,
    padding: 24,
    shadowColor: Colors.darkGray,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  cardTitle: {
    ...Typography.header2,
    color: Colors.forestGreen,
    marginBottom: 20,
  },
  label: {
    ...Typography.caption,
    color: Colors.darkGray,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.naturalBeige,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  button: {
    backgroundColor: Colors.primaryGreen,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    ...Typography.bodyBold,
    color: Colors.white,
  },
  linkText: {
    ...Typography.caption,
    color: Colors.primaryGreen,
    textAlign: 'center',
    marginTop: 16,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: 20,
  },
  guestButton: {
    backgroundColor: Colors.lightGreen,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  guestButtonText: {
    ...Typography.caption,
    color: Colors.forestGreen,
    fontWeight: '700',
  },
});
