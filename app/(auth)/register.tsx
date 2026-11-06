import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { FirebaseError } from 'firebase/app';
import { createUserWithEmailAndPassword, deleteUser, updateProfile } from 'firebase/auth';
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
  const { fetchProfile } = useAuthStore();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [province, setProvince] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('standard');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!email || !password || !firstName) {
      Alert.alert('Champs requis', 'Veuillez renseigner votre prénom, votre email et votre mot de passe.');
      return;
    }

    if (!auth || !database) {
      Alert.alert('Inscription indisponible', 'La création de compte est momentanément indisponible. Réessayez plus tard.');
      return;
    }

    setLoading(true);
    let createdUser: Awaited<ReturnType<typeof createUserWithEmailAndPassword>>['user'] | null = null;
    try {
      const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      createdUser = credential.user;
      const displayName = `${firstName.trim()} ${lastName.trim()}`.trim();
      await updateProfile(credential.user, { displayName });

      const createdAt = credential.user.metadata.creationTime ?? new Date().toISOString();
      await update(ref(database), {
        [`profiles/${credential.user.uid}`]: {
          id: credential.user.uid,
          email: credential.user.email,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          display_name: displayName,
          province_gabon: province.trim(),
          created_at: createdAt,
        },
        [`user_roles/${credential.user.uid}`]: {
          role: selectedRole,
          created_at: createdAt,
        },
      });

      await fetchProfile();
      Alert.alert('Compte Créé !', 'Votre inscription sur MABOUNDZA est réussie.', [
        { text: 'Continuer', onPress: () => router.replace('/(main)') }
      ]);
    } catch (error) {
      console.error('Registration failed:', error);
      let message = error instanceof FirebaseError && error.code === 'auth/email-already-in-use'
        ? 'Cette adresse email est déjà utilisée.'
        : 'La création de compte est momentanément indisponible. Réessayez plus tard.';
      if (createdUser) {
        try {
          await deleteUser(createdUser);
        } catch (cleanupError) {
          console.error('Firebase account cleanup failed after registration error:', cleanupError);
          message += ' Contactez l’assistance si le problème persiste.';
        }
      }
      Alert.alert('Erreur de création', message);
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

        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.linkText}>Déjà un compte ? Connectez-vous</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
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
  linkText: {
    ...Typography.caption,
    color: Colors.primaryGreen,
    textAlign: 'center',
    marginTop: 16,
    fontWeight: '600',
  },
});
