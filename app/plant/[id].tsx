import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/theme/colors';
import { Typography } from '@/src/theme/typography';
import { Plant } from '@/types';
import { getLocalPlantById } from '@/src/database/sqlite';
import { MEDICAL_DISCLAIMER_TEXT } from '@/src/services/aiAssistant';

export default function PlantDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [plant, setPlant] = useState<Plant | null>(null);
  const [activeTab, setActiveTab] = useState<'botany' | 'uses' | 'safety'>('botany');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const loadPlantDetails = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const data = await getLocalPlantById(id);
        if (active) {
          setPlant(data);
        }
      } catch (error) {
        console.error('Unable to load local plant details:', error);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadPlantDetails();
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Chargement de la Fiche Botanique...</Text>
      </View>
    );
  }

  if (!plant) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Cette fiche botanique n’est pas disponible.</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.loadingText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Plant Header Card */}
      <View style={styles.headerCard}>
        <View style={styles.badgeRow}>
          <View style={styles.familyBadge}>
            <Text style={styles.familyBadgeText}>{plant.family?.scientific_name || 'Botanique'}</Text>
          </View>
          <View style={styles.conservationBadge}>
            <Text style={styles.conservationText}>Statut: {plant.conservation_status}</Text>
          </View>
        </View>

        <Text style={styles.frenchTitle}>{plant.french_name}</Text>
        <Text style={styles.scientificTitle}>{plant.scientific_name}</Text>

        {/* Vernacular Names Row */}
        {plant.vernacular_names && plant.vernacular_names.length > 0 && (
          <View style={styles.vernacularContainer}>
            {plant.vernacular_names.map((v) => (
              <View key={v.id} style={styles.vernacularChip}>
                <Ionicons name="language-outline" size={14} color={Colors.forestGreen} />
                <Text style={styles.vernacularText}>{v.local_name} ({v.phonetic_transcription || 'prononciation non renseignée'})</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Navigation Tabs */}
      <View style={styles.tabsRow}>
        <TouchableOpacity style={[styles.tab, activeTab === 'botany' && styles.tabActive]} onPress={() => setActiveTab('botany')}>
          <Text style={[styles.tabText, activeTab === 'botany' && styles.tabTextActive]}>Botanique</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.tab, activeTab === 'uses' && styles.tabActive]} onPress={() => setActiveTab('uses')}>
          <Text style={[styles.tabText, activeTab === 'uses' && styles.tabTextActive]}>Pharmacopée</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.tab, activeTab === 'safety' && styles.tabActiveSafety]} onPress={() => setActiveTab('safety')}>
          <View style={styles.tabLabel}>
            <Ionicons name="warning-outline" size={14} color={activeTab === 'safety' ? Colors.white : Colors.textSecondary} />
            <Text style={[styles.tabText, activeTab === 'safety' && styles.tabTextActiveSafety]}>Sécurité</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Tab 1: Botany Details */}
      {activeTab === 'botany' && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>Description Botanique</Text>
          <Text style={styles.bodyText}>{plant.botanical_description}</Text>

          <Text style={styles.subHeader}>Morphologie</Text>
          {plant.morphology_leaf && <Text style={styles.bulletText}>• **Feuilles :** {plant.morphology_leaf}</Text>}
          {plant.morphology_bark && <Text style={styles.bulletText}>• **Écorce :** {plant.morphology_bark}</Text>}
          {plant.morphology_root && <Text style={styles.bulletText}>• **Racine :** {plant.morphology_root}</Text>}

          {plant.habitat && (
            <>
              <Text style={styles.subHeader}>Habitat & Distribution</Text>
              <Text style={styles.bodyText}>{plant.habitat}</Text>
            </>
          )}
        </View>
      )}

      {/* Tab 2: Pharmacopoeia & Traditional Uses */}
      {activeTab === 'uses' && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>Usages Traditionnels Documentés</Text>
          {plant.uses && plant.uses.length > 0 ? (
            plant.uses.map((use) => (
              <View key={use.id} style={styles.useCard}>
                <Text style={styles.useOrgan}>Organe utilisé : {use.organ_used.toUpperCase()}</Text>
                <Text style={styles.useTitle}>Indication : {use.therapeutic_indication}</Text>
                <Text style={styles.usePrep}>Préparation : {use.traditional_preparation}</Text>
                {use.cultural_significance && <Text style={styles.useCulture}>Importance culturelle : {use.cultural_significance}</Text>}
              </View>
            ))
          ) : (
            <Text style={styles.bodyText}>Aucun usage traditionnel validé pour le moment.</Text>
          )}
        </View>
      )}

      {/* Tab 3: Medical Safety & Toxicity (Red Highlight) */}
      {activeTab === 'safety' && (
        <View style={styles.safetyCard}>
          <View style={styles.safetyHeader}>
            <Text style={styles.safetyTitle}>Profil de Sécurité Médicinale</Text>
            <View style={styles.toxicityBadge}>
              <Text style={styles.toxicityText}>{plant.safety?.toxicity_level || 'EVALUATION'}</Text>
            </View>
          </View>

          <Text style={styles.safetyLabel}>Organes potentiellement dangereux :</Text>
          <Text style={styles.safetyValue}>{plant.safety?.toxic_organs?.join(', ').toUpperCase() || 'Aucun répertorié'}</Text>

          <Text style={styles.safetyLabel}>Composés actifs / Alcaloïdes :</Text>
          <Text style={styles.safetyValue}>{plant.safety?.dangerous_compounds?.join(', ') || 'N/A'}</Text>

          <Text style={styles.safetyLabel}>Populations à risque :</Text>
          <Text style={styles.safetyValue}>{plant.safety?.vulnerable_populations?.join(', ') || 'Femmes enceintes, Enfants'}</Text>

          <Text style={styles.safetyLabel}>Précautions d'emploi strictes :</Text>
          <Text style={styles.safetyPrecautions}>{plant.safety?.precautions}</Text>
        </View>
      )}

      {/* Compulsory Medical Disclaimer */}
      <View style={styles.disclaimerBox}>
        <Text style={styles.disclaimerText}>{MEDICAL_DISCLAIMER_TEXT}</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...Typography.body,
    color: Colors.forestGreen,
  },
  headerCard: {
    backgroundColor: Colors.forestGreen,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  familyBadge: {
    backgroundColor: Colors.ochre,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  familyBadgeText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
  conservationBadge: {
    backgroundColor: Colors.lightGreen,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  conservationText: {
    color: Colors.forestGreen,
    fontSize: 11,
    fontWeight: '700',
  },
  frenchTitle: {
    ...Typography.header1,
    color: Colors.white,
  },
  scientificTitle: {
    ...Typography.header3,
    fontStyle: 'italic',
    color: Colors.sunYellow,
    marginTop: 2,
    marginBottom: 12,
  },
  vernacularContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  vernacularChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.lightGreen,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  vernacularText: {
    fontSize: 12,
    color: Colors.forestGreen,
    fontWeight: '700',
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    backgroundColor: Colors.white,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  tabLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tabActive: {
    backgroundColor: Colors.forestGreen,
    borderColor: Colors.forestGreen,
  },
  tabActiveSafety: {
    backgroundColor: Colors.safetyRed,
    borderColor: Colors.safetyRed,
  },
  tabText: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.darkGray,
  },
  tabTextActive: {
    color: Colors.white,
  },
  tabTextActiveSafety: {
    color: Colors.white,
  },
  sectionCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  sectionHeader: {
    ...Typography.header2,
    color: Colors.forestGreen,
    marginBottom: 10,
  },
  subHeader: {
    ...Typography.bodyBold,
    color: Colors.darkGray,
    marginTop: 14,
    marginBottom: 6,
  },
  bodyText: {
    ...Typography.body,
    color: Colors.darkGray,
    lineHeight: 22,
  },
  bulletText: {
    ...Typography.body,
    color: Colors.darkGray,
    marginBottom: 4,
  },
  useCard: {
    backgroundColor: Colors.naturalBeige,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primaryGreen,
  },
  useOrgan: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primaryGreen,
  },
  useTitle: {
    ...Typography.bodyBold,
    color: Colors.darkGray,
    marginTop: 2,
  },
  usePrep: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  useCulture: {
    ...Typography.caption,
    fontStyle: 'italic',
    color: Colors.ochre,
    marginTop: 4,
  },
  safetyCard: {
    backgroundColor: '#FDEDEC',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: Colors.safetyRed,
  },
  safetyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  safetyTitle: {
    ...Typography.header2,
    color: Colors.safetyRed,
  },
  toxicityBadge: {
    backgroundColor: Colors.safetyRed,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  toxicityText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
  safetyLabel: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.darkGray,
    marginTop: 8,
  },
  safetyValue: {
    ...Typography.body,
    fontSize: 14,
    color: Colors.darkGray,
    marginBottom: 4,
  },
  safetyPrecautions: {
    ...Typography.body,
    fontSize: 14,
    color: Colors.safetyRed,
    fontWeight: '600',
    marginTop: 2,
    lineHeight: 20,
  },
  disclaimerBox: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  disclaimerText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
