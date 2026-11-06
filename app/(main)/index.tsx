import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/theme/colors';
import { Typography } from '@/src/theme/typography';
import { useAuthStore } from '@/src/store/authStore';

export default function HomeScreen() {
  const router = useRouter();
  const { user, role, subscriptionTier, scansUsedToday, maxScansAllowed } = useAuthStore();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* User Greeting Card */}
      <View style={styles.welcomeCard}>
        <View style={styles.welcomeLeft}>
          <Text style={styles.greetingTitle}>
            Mbolo, {user?.first_name || 'Botaniste'}
          </Text>
          <Text style={styles.greetingSubtitle}>
            Explorez les fiches botaniques disponibles dans l’encyclopédie
          </Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>Rôle: {role.toUpperCase()}</Text>
          </View>
        </View>
        <View style={styles.avatarCircle}>
          <Ionicons name="leaf-outline" size={30} color={Colors.white} />
        </View>
      </View>

      {/* Quick Scanner Hero Card */}
      <View style={styles.scannerHeroCard}>
        <View style={styles.scannerHeroHeader}>
          <Text style={styles.scannerHeroTitle}>Scanner botanique</Text>
          <Text style={styles.scanCounter}>
            {scansUsedToday} / {maxScansAllowed === 9999 ? '∞' : maxScansAllowed} scans aujourd'hui
          </Text>
        </View>
        <Text style={styles.scannerHeroDesc}>
          Photographiez une plante pour enregistrer votre observation. L’identification automatique sera disponible lorsqu’un modèle botanique sera configuré.
        </Text>

        <TouchableOpacity
          style={styles.scanHeroBtn}
          onPress={() => router.push('/(main)/scanner')}
        >
          <Ionicons name="camera-outline" size={20} color={Colors.white} />
          <Text style={styles.scanHeroBtnText}>Ouvrir le scanner</Text>
        </TouchableOpacity>
      </View>

      {/* Specialty Modes Shortcuts */}
      <Text style={styles.sectionTitle}>Espaces & Modes Dédiés</Text>

      <View style={styles.modesGrid}>
        {/* Petit Botaniste */}
        <TouchableOpacity
          style={[styles.modeCard, { backgroundColor: Colors.sunYellow }]}
          onPress={() => router.push('/kids')}
        >
          <Ionicons name="leaf-outline" size={28} color={Colors.forestGreen} style={styles.modeIcon} />
          <Text style={styles.modeTitle}>Petit Botaniste</Text>
          <Text style={styles.modeDesc}>Jeux & Quizzes avec Léo le Gorille (3-15 ans)</Text>
        </TouchableOpacity>

        {/* Assistant Maman MABOUNDZA */}
        <TouchableOpacity
          style={[styles.modeCard, { backgroundColor: Colors.lightGreen }]}
          onPress={() => router.push('/assistant')}
        >
          <Ionicons name="chatbubbles-outline" size={28} color={Colors.forestGreen} style={styles.modeIcon} />
          <Text style={styles.modeTitle}>Maman MABOUNDZA</Text>
          <Text style={styles.modeDesc}>Assistant IA Vocal & Conseils Validés</Text>
        </TouchableOpacity>

        {/* Mode École */}
        <TouchableOpacity
          style={[styles.modeCard, { backgroundColor: Colors.naturalBeige }]}
          onPress={() => router.push('/school')}
        >
          <Ionicons name="school-outline" size={28} color={Colors.forestGreen} style={styles.modeIcon} />
          <Text style={styles.modeTitle}>Mode École</Text>
          <Text style={styles.modeDesc}>Espace Enseignant & Gestion des Classes</Text>
        </TouchableOpacity>

        {/* Mode Famille */}
        <TouchableOpacity
          style={[styles.modeCard, { backgroundColor: Colors.naturalBeige }]}
          onPress={() => router.push('/family')}
        >
          <Ionicons name="people-outline" size={28} color={Colors.forestGreen} style={styles.modeIcon} />
          <Text style={styles.modeTitle}>Mode Famille</Text>
          <Text style={styles.modeDesc}>Partage d'observations & Contes traditionnels</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Encyclopédie botanique</Text>
      <View style={styles.plantCard}>
        <Text style={styles.plantDesc}>
          Les fiches botaniques vérifiées apparaîtront ici après leur ajout à la base de données.
        </Text>
        <TouchableOpacity onPress={() => router.push('/encyclopedia')}>
          <Text style={styles.readMoreText}>Consulter l'encyclopédie</Text>
        </TouchableOpacity>
      </View>

      {/* Medical Safety Disclaimer */}
      <View style={styles.safetyBanner}>
        <Ionicons name="warning-outline" size={24} color={Colors.safetyRed} />
        <Text style={styles.safetyBannerText}>
          **Avertissement Médical Obligatoire :** Les informations botaniques et traditionnelles fournies ne remplacent jamais un avis médical. En cas de malaise, consultez un professionnel de santé.
        </Text>
      </View>
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
  welcomeCard: {
    backgroundColor: Colors.forestGreen,
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  welcomeLeft: {
    flex: 1,
  },
  greetingTitle: {
    ...Typography.header2,
    color: Colors.white,
  },
  greetingSubtitle: {
    ...Typography.caption,
    color: Colors.naturalBeige,
    marginTop: 4,
    opacity: 0.9,
  },
  roleBadge: {
    backgroundColor: Colors.ochre,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 10,
  },
  roleText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
  avatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.lightGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  scannerHeroCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.forestGreen,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  scannerHeroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scannerHeroTitle: {
    ...Typography.header3,
    color: Colors.forestGreen,
  },
  scanCounter: {
    ...Typography.caption,
    color: Colors.primaryGreen,
    fontWeight: '700',
  },
  scannerHeroDesc: {
    ...Typography.body,
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 6,
    marginBottom: 14,
  },
  scanHeroBtn: {
    backgroundColor: Colors.primaryGreen,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  scanHeroBtnText: {
    ...Typography.bodyBold,
    color: Colors.white,
  },
  sectionTitle: {
    ...Typography.header3,
    color: Colors.darkGray,
    marginBottom: 12,
    marginTop: 4,
  },
  modesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  modeCard: {
    width: '48%',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  modeIcon: {
    marginBottom: 6,
  },
  modeTitle: {
    ...Typography.bodyBold,
    fontSize: 14,
    color: Colors.darkGray,
  },
  modeDesc: {
    ...Typography.caption,
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  plantCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  plantDesc: {
    ...Typography.body,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  readMoreText: {
    ...Typography.caption,
    color: Colors.primaryGreen,
    fontWeight: '700',
  },
  safetyBanner: {
    backgroundColor: '#FDEDEC',
    borderRadius: 12,
    padding: 14,
    borderColor: Colors.safetyRed,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  safetyBannerText: {
    ...Typography.caption,
    color: Colors.safetyRed,
    flex: 1,
    lineHeight: 18,
  },
});
