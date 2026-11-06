import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/theme/colors';
import { Typography } from '@/src/theme/typography';

export default function SchoolModeScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerCard}>
        <Ionicons name="school-outline" size={40} color={Colors.white} style={styles.headerIcon} />
        <Text style={styles.headerTitle}>Mode École & Enseignants</Text>
        <Text style={styles.headerSubtitle}>
          Sensabilisez les élèves du Gabon à la préservation de la biodiversité et à la botanique nationale.
        </Text>
      </View>

      <View style={styles.card}>
        <Ionicons name="people-outline" size={28} color={Colors.primaryGreen} style={styles.sectionIcon} />
        <Text style={styles.cardTitle}>Mes classes</Text>
        <Text style={styles.emptyText}>Aucune classe n’est encore disponible.</Text>
      </View>

      <Text style={styles.sectionTitle}>Supports de Cours Botaniques Validés</Text>
      <View style={styles.resourceCard}>
        <Ionicons name="document-text-outline" size={28} color={Colors.primaryGreen} style={styles.resourceIcon} />
        <View style={styles.resourceText}>
          <Text style={styles.resourceTitle}>Supports pédagogiques</Text>
          <Text style={styles.resourceSub}>Aucun support n’est disponible pour le moment.</Text>
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
    backgroundColor: Colors.forestGreen,
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
  resourceCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  resourceIcon: {
    marginRight: 12,
  },
  resourceText: {
    flex: 1,
  },
  resourceTitle: {
    ...Typography.bodyBold,
    color: Colors.darkGray,
  },
  resourceSub: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
