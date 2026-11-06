import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/theme/colors';
import { Typography } from '@/src/theme/typography';
import { useAuthStore } from '@/src/store/authStore';

const QUICK_LINKS = [
  {
    title: 'Encyclopédie',
    subtitle: 'Explorer les plantes',
    icon: 'book-outline',
    color: Colors.lightGreen,
    route: '/(main)/encyclopedia',
  },
  {
    title: 'Mon herbier',
    subtitle: 'Mes observations',
    icon: 'leaf-outline',
    color: '#F6E8CE',
    route: '/(main)/herbarium',
  },
  {
    title: 'Petit botaniste',
    subtitle: 'Apprendre en jouant',
    icon: 'sparkles-outline',
    color: '#F8E9AC',
    route: '/kids',
  },
] as const;

export default function HomeScreen() {
  const router = useRouter();
  const { user, scansUsedToday, maxScansAllowed } = useAuthStore();
  const firstName = user?.first_name || user?.display_name?.split(' ')[0] || 'Botaniste';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.greetingRow}>
        <View style={styles.greetingCopy}>
          <Text style={styles.eyebrow}>MABOUNDZA · FLORE DU GABON</Text>
          <Text style={styles.greetingTitle}>Mbolo, {firstName}</Text>
          <Text style={styles.greetingSubtitle}>La nature gabonaise à portée de main.</Text>
        </View>
        <View style={styles.avatarCircle}>
          <Ionicons name="leaf" size={23} color={Colors.white} />
        </View>
      </View>

      <TouchableOpacity
        style={styles.scannerCard}
        onPress={() => router.push('/(main)/scanner')}
        accessibilityRole="button"
      >
        <View style={styles.scannerIcon}>
          <Ionicons name="camera-outline" size={23} color={Colors.forestGreen} />
        </View>
        <View style={styles.scannerCopy}>
          <Text style={styles.scannerTitle}>Observer une plante</Text>
          <Text style={styles.scannerSubtitle}>
            Photographiez-la pour garder sa trace dans votre herbier.
          </Text>
          <Text style={styles.scanCounter}>
            {scansUsedToday} / {maxScansAllowed === 9999 ? '∞' : maxScansAllowed} observations aujourd’hui
          </Text>
        </View>
        <View style={styles.scannerArrow}>
          <Ionicons name="arrow-forward" size={18} color={Colors.white} />
        </View>
      </TouchableOpacity>

      <View style={styles.sectionHeading}>
        <Text style={styles.sectionTitle}>Explorer</Text>
        <Text style={styles.sectionCaption}>Découvrez MABOUNDZA</Text>
      </View>

      <View style={styles.quickLinks}>
        {QUICK_LINKS.map((link) => (
          <TouchableOpacity
            key={link.title}
            style={styles.quickLink}
            onPress={() => router.push(link.route)}
            accessibilityRole="button"
          >
            <View style={[styles.quickLinkIcon, { backgroundColor: link.color }]}>
              <Ionicons name={link.icon} size={22} color={Colors.forestGreen} />
            </View>
            <Text style={styles.quickLinkTitle} numberOfLines={1}>{link.title}</Text>
            <Text style={styles.quickLinkSubtitle} numberOfLines={2}>{link.subtitle}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.sectionHeading}>
        <Text style={styles.sectionTitle}>Pour apprendre et partager</Text>
      </View>

      <TouchableOpacity
        style={styles.featureRow}
        onPress={() => router.push('/school')}
        accessibilityRole="button"
      >
        <View style={[styles.featureIcon, { backgroundColor: '#E8EEF8' }]}>
          <Ionicons name="school-outline" size={21} color={Colors.forestGreen} />
        </View>
        <View style={styles.featureCopy}>
          <Text style={styles.featureTitle}>Espace École</Text>
          <Text style={styles.featureSubtitle}>Des activités botaniques pour la classe</Text>
        </View>
        <Ionicons name="chevron-forward" size={19} color={Colors.textMuted} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.featureRow}
        onPress={() => router.push('/family')}
        accessibilityRole="button"
      >
        <View style={[styles.featureIcon, { backgroundColor: '#F6E8CE' }]}>
          <Ionicons name="people-outline" size={21} color={Colors.forestGreen} />
        </View>
        <View style={styles.featureCopy}>
          <Text style={styles.featureTitle}>Espace Famille</Text>
          <Text style={styles.featureSubtitle}>Partager les découvertes de la nature</Text>
        </View>
        <Ionicons name="chevron-forward" size={19} color={Colors.textMuted} />
      </TouchableOpacity>

      <View style={styles.safetyNote}>
        <Ionicons name="information-circle-outline" size={18} color={Colors.ochre} />
        <Text style={styles.safetyNoteText}>
          Les informations de l’application ne remplacent pas un avis médical.
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
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 28,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  greetingCopy: {
    flex: 1,
  },
  eyebrow: {
    color: Colors.primaryGreen,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  greetingTitle: {
    ...Typography.header2,
    color: Colors.forestGreen,
  },
  greetingSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.forestGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  scannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.forestGreen,
    borderRadius: 18,
    padding: 14,
    marginBottom: 22,
  },
  scannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.lightGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  scannerCopy: {
    flex: 1,
  },
  scannerTitle: {
    ...Typography.bodyBold,
    color: Colors.white,
  },
  scannerSubtitle: {
    ...Typography.caption,
    color: Colors.naturalBeige,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
    opacity: 0.9,
  },
  scanCounter: {
    color: Colors.lightGreen,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 5,
  },
  scannerArrow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.primaryGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    ...Typography.header3,
    fontSize: 16,
    color: Colors.darkGray,
  },
  sectionCaption: {
    ...Typography.caption,
    fontSize: 11,
    color: Colors.textMuted,
  },
  quickLinks: {
    flexDirection: 'row',
    gap: 9,
    marginBottom: 22,
  },
  quickLink: {
    flex: 1,
    minHeight: 112,
    padding: 10,
    backgroundColor: Colors.white,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  quickLinkIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickLinkTitle: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.darkGray,
  },
  quickLinkSubtitle: {
    color: Colors.textMuted,
    fontSize: 10,
    lineHeight: 14,
    marginTop: 2,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  featureIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  featureCopy: {
    flex: 1,
  },
  featureTitle: {
    ...Typography.bodyBold,
    fontSize: 14,
    color: Colors.darkGray,
  },
  featureSubtitle: {
    ...Typography.caption,
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  safetyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 8,
    paddingHorizontal: 2,
  },
  safetyNoteText: {
    ...Typography.caption,
    flex: 1,
    fontSize: 11,
    color: Colors.textSecondary,
  },
});
