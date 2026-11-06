import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/theme/colors';
import { Typography } from '@/src/theme/typography';

export default function FamilyModeScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerCard}>
        <Ionicons name="people-outline" size={40} color={Colors.white} style={styles.headerIcon} />
        <Text style={styles.headerTitle}>Mode Famille MABOUNDZA</Text>
        <Text style={styles.headerSubtitle}>
          Transmettez les savoirs botaniques et les contes traditionnels entre générations.
        </Text>
      </View>

      <View style={styles.card}>
        <Ionicons name="people-outline" size={28} color={Colors.primaryGreen} style={styles.sectionIcon} />
        <Text style={styles.cardTitle}>Aucun groupe familial</Text>
        <Text style={styles.emptyText}>La gestion des groupes familiaux sera disponible prochainement.</Text>
      </View>

      <Text style={styles.sectionTitle}>Contes Botaniques & Découvertes</Text>
      <View style={styles.storyCard}>
        <Ionicons name="headset-outline" size={28} color={Colors.primaryGreen} style={styles.storyIcon} />
        <View style={styles.storyInfo}>
          <Text style={styles.storyTitle}>Contes traditionnels</Text>
          <Text style={styles.storyMeta}>Aucun conte audio n’est disponible pour le moment.</Text>
        </View>
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
  headerCard: {
    backgroundColor: Colors.ochre,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  headerIcon: {
    marginBottom: 8,
  },
  headerTitle: {
    ...Typography.header1,
    color: Colors.white,
    textAlign: 'center',
  },
  headerSubtitle: {
    ...Typography.body,
    fontSize: 13,
    color: Colors.naturalBeige,
    textAlign: 'center',
    marginTop: 6,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  cardTitle: {
    ...Typography.header3,
    color: Colors.forestGreen,
    marginBottom: 14,
  },
  sectionIcon: {
    marginBottom: 8,
  },
  emptyText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  sectionTitle: {
    ...Typography.header2,
    color: Colors.darkGray,
    marginBottom: 12,
  },
  storyCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  storyIcon: {
    marginRight: 12,
  },
  storyInfo: {
    flex: 1,
  },
  storyTitle: {
    ...Typography.bodyBold,
    color: Colors.darkGray,
  },
  storyMeta: {
    ...Typography.caption,
    color: Colors.primaryGreen,
    fontWeight: '600',
    marginTop: 2,
  },
});
