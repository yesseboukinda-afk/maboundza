import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/theme/colors';
import { Typography } from '@/src/theme/typography';
import { useAuthStore } from '@/src/store/authStore';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, role, subscriptionTier, signOut } = useAuthStore();

  const handleSignOut = async () => {
    await signOut();
    router.replace('/(auth)/login');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Info Header */}
      <View style={styles.profileCard}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{user?.first_name?.charAt(0) || 'B'}</Text>
        </View>

        <Text style={styles.userName}>{user?.display_name || user?.first_name || 'Profil utilisateur'}</Text>
        <Text style={styles.userEmail}>{user?.email || 'Email non renseigné'}</Text>

        <View style={styles.badgeRow}>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>Rôle: {role.toUpperCase()}</Text>
          </View>
          <View style={[styles.subBadge, subscriptionTier === 'freemium' ? styles.subFreemium : styles.subPremium]}>
            <Text style={styles.subBadgeText}>{subscriptionTier.toUpperCase()}</Text>
          </View>
        </View>
      </View>

      {/* Subscription Upgrade Card */}
      {subscriptionTier === 'freemium' && (
        <View style={styles.upgradeCard}>
          <View style={styles.upgradeHeading}>
            <Ionicons name="star-outline" size={20} color={Colors.sunYellow} />
            <Text style={styles.upgradeTitle}>Abonnement</Text>
          </View>
          <Text style={styles.upgradeDesc}>
            Les offres d’abonnement ne sont pas encore disponibles.
          </Text>
        </View>
      )}

      {/* Account Settings */}
      <Text style={styles.sectionTitle}>Paramètres</Text>

      <TouchableOpacity style={styles.menuItem} onPress={() => Alert.alert('Langue', 'Langues actives : Français, Fang, Myènè, Punu.')}>
        <Ionicons name="language-outline" size={20} color={Colors.forestGreen} />
        <Text style={styles.menuItemText}>Langue de l'interface & Traductions</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
        <Text style={styles.signOutBtnText}>Déconnexion</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.naturalBeige,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  profileCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.forestGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    ...Typography.header1,
    color: Colors.white,
  },
  userName: {
    ...Typography.header2,
    color: Colors.darkGray,
  },
  userEmail: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  roleBadge: {
    backgroundColor: Colors.lightGreen,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roleBadgeText: {
    color: Colors.forestGreen,
    fontSize: 11,
    fontWeight: '700',
  },
  subBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  subFreemium: {
    backgroundColor: Colors.naturalBeige,
  },
  subPremium: {
    backgroundColor: Colors.sunYellow,
  },
  subBadgeText: {
    color: Colors.darkGray,
    fontSize: 11,
    fontWeight: '700',
  },
  upgradeCard: {
    backgroundColor: Colors.forestGreen,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  upgradeTitle: {
    ...Typography.header3,
    color: Colors.sunYellow,
  },
  upgradeHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  upgradeDesc: {
    ...Typography.caption,
    color: Colors.naturalBeige,
    marginVertical: 8,
    lineHeight: 18,
  },
  sectionTitle: {
    ...Typography.header3,
    color: Colors.darkGray,
    marginBottom: 4,
    marginTop: 10,
  },
  sectionSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: 14,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  menuItemText: {
    ...Typography.body,
    fontSize: 14,
    color: Colors.darkGray,
  },
  signOutBtn: {
    backgroundColor: '#FADBD8',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  signOutBtnText: {
    ...Typography.bodyBold,
    color: Colors.safetyRed,
  },
});
