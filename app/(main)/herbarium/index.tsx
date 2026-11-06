import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/theme/colors';
import { Typography } from '@/src/theme/typography';
import { HerbariumEntry } from '@/types';
import { getLocalHerbariumEntries } from '@/src/database/sqlite';
import { useAuthStore } from '@/src/store/authStore';

export default function HerbariumScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [entries, setEntries] = useState<HerbariumEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadHerbarium();
  }, [user?.id]);

  const loadHerbarium = async () => {
    setLoading(true);
    try {
      const data = user ? await getLocalHerbariumEntries(user.id) : [];
      setEntries(data);
    } catch (error) {
      console.error('Unable to load local herbarium entries:', error);
      Alert.alert('Erreur', 'Impossible de charger votre herbier local.');
    } finally {
      setLoading(false);
    }
  };

  const renderHerbariumCard = ({ item }: { item: HerbariumEntry }) => (
    <View style={styles.card}>
      {item.captured_image_url ? (
        <Image source={{ uri: item.captured_image_url }} style={styles.cardImage} />
      ) : (
        <View style={[styles.cardImage, styles.photoPlaceholder]}>
          <Ionicons name="image-outline" size={36} color={Colors.textMuted} />
        </View>
      )}

      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={styles.title}>{item.custom_title || 'Découverte Botanique'}</Text>
        </View>

        {item.location_name && (
          <View style={styles.metadataRow}>
            <Ionicons name="location-outline" size={14} color={Colors.textSecondary} />
            <Text style={styles.locationText}>{item.location_name}</Text>
          </View>
        )}
        <View style={styles.metadataRow}>
          <Ionicons name="calendar-outline" size={14} color={Colors.textMuted} />
          <Text style={styles.dateText}>{new Date(item.scanned_at).toLocaleDateString('fr-FR')}</Text>
        </View>

        {item.notes && <Text style={styles.notesText} numberOfLines={2}>"{item.notes}"</Text>}

        {item.plant_id && (
          <TouchableOpacity
            style={styles.viewFicheBtn}
            onPress={() => router.push(`/plant/${item.plant_id}` as any)}
          >
            <Text style={styles.viewFicheText}>Voir la fiche botanique</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.topHeader}>
        <View>
          <Text style={styles.headerTitle}>Mon Herbier Numérique</Text>
          <Text style={styles.headerSubtitle}>{entries.length} observation(s)</Text>
        </View>

      </View>

      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        renderItem={renderHerbariumCard}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={!loading ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="book-outline" size={48} color={Colors.primaryGreen} style={styles.emptyIcon} />
            <Text style={styles.emptyTitle}>Votre herbier est vide</Text>
            <Text style={styles.emptySub}>Enregistrez une photo depuis le scanner pour commencer votre herbier.</Text>
          </View>
        ) : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.naturalBeige,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerTitle: {
    ...Typography.header2,
    color: Colors.forestGreen,
  },
  headerSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  cardImage: {
    width: '100%',
    height: 160,
  },
  photoPlaceholder: {
    backgroundColor: Colors.naturalBeige,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: {
    ...Typography.bodyBold,
    fontSize: 17,
    color: Colors.darkGray,
    flex: 1,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  dateText: {
    ...Typography.caption,
    color: Colors.textMuted,
    marginBottom: 8,
  },
  notesText: {
    ...Typography.body,
    fontSize: 13,
    fontStyle: 'italic',
    color: Colors.darkGray,
    marginBottom: 10,
  },
  viewFicheBtn: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  viewFicheText: {
    ...Typography.caption,
    color: Colors.primaryGreen,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    marginBottom: 12,
  },
  emptyTitle: {
    ...Typography.header3,
    color: Colors.darkGray,
  },
  emptySub: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
  },
});
