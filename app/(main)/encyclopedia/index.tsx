import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/theme/colors';
import { Typography } from '@/src/theme/typography';
import { Plant } from '@/types';
import { getLocalPlants } from '@/src/database/sqlite';

const FILTER_PILLS = ['Tous', 'Endémique Gabon', 'Traditionnel', 'Fang', 'Myènè', 'Punu'];

export default function EncyclopediaScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('Tous');
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlants();
  }, [searchQuery, activeFilter]);

  const loadPlants = async () => {
    setLoading(true);

    let localData = await getLocalPlants(searchQuery);

    if (activeFilter === 'Endémique Gabon') {
      localData = localData.filter((p) => p.is_endemic_gabon);
    }

    setPlants(localData);
    setLoading(false);
  };

  const renderPlantCard = ({ item }: { item: Plant }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/plant/${item.id}` as any)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.plantIconCircle}>
          <Ionicons name="leaf-outline" size={24} color={Colors.forestGreen} />
        </View>

        <View style={styles.cardHeaderText}>
          <Text style={styles.frenchName}>{item.french_name}</Text>
          <Text style={styles.scientificName}>{item.scientific_name}</Text>
          <Text style={styles.familyText}>Famille : {item.family?.scientific_name || 'Non spécifiée'}</Text>
        </View>

        <View style={styles.statusPill}>
          <Text style={styles.statusText}>{item.conservation_status}</Text>
        </View>
      </View>

      <Text style={styles.description} numberOfLines={2}>
        {item.botanical_description}
      </Text>

      {/* Local Vernacular Names Badges */}
      {item.vernacular_names && item.vernacular_names.length > 0 && (
        <View style={styles.vernacularRow}>
          {item.vernacular_names.map((v) => (
            <View key={v.id} style={styles.vernacularPill}>
              <View style={styles.vernacularLabel}>
                <Ionicons name="chatbubble-outline" size={12} color={Colors.forestGreen} />
                <Text style={styles.vernacularText}>{v.local_name}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Search Input */}
      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={18} color={Colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher par nom scientifique, français ou local..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filter Pills */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={FILTER_PILLS}
        keyExtractor={(item) => item}
        style={styles.filterList}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.filterPill, activeFilter === item && styles.filterPillActive]}
            onPress={() => setActiveFilter(item)}
          >
            <Text style={[styles.filterPillText, activeFilter === item && styles.filterPillTextActive]}>
              {item}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Plant List */}
      <FlatList
        data={plants}
        keyExtractor={(item) => item.id}
        renderItem={renderPlantCard}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons name="search-outline" size={40} color={Colors.textMuted} style={styles.emptyIcon} />
            <Text style={styles.emptyText}>
              {searchQuery ? 'Aucune plante ne correspond à votre recherche.' : 'Aucune fiche botanique vérifiée n’est disponible pour le moment.'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.naturalBeige,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    margin: 16,
    marginBottom: 10,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.darkGray,
  },
  filterList: {
    paddingHorizontal: 16,
    maxHeight: 44,
    marginBottom: 10,
  },
  filterPill: {
    backgroundColor: Colors.white,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    height: 34,
    justifyContent: 'center',
  },
  filterPillActive: {
    backgroundColor: Colors.forestGreen,
    borderColor: Colors.forestGreen,
  },
  filterPillText: {
    ...Typography.caption,
    color: Colors.darkGray,
    fontWeight: '600',
  },
  filterPillTextActive: {
    color: Colors.white,
  },
  listContent: {
    padding: 16,
    paddingTop: 4,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  plantIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.lightGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardHeaderText: {
    flex: 1,
  },
  frenchName: {
    ...Typography.bodyBold,
    fontSize: 17,
    color: Colors.darkGray,
  },
  scientificName: {
    ...Typography.caption,
    fontStyle: 'italic',
    color: Colors.primaryGreen,
    fontWeight: '600',
  },
  familyText: {
    ...Typography.caption,
    fontSize: 11,
    color: Colors.textMuted,
  },
  statusPill: {
    backgroundColor: Colors.naturalBeige,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.ochre,
  },
  description: {
    ...Typography.body,
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 10,
  },
  vernacularRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  vernacularPill: {
    backgroundColor: Colors.lightGreen,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  vernacularLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  vernacularText: {
    fontSize: 11,
    color: Colors.forestGreen,
    fontWeight: '600',
  },
  emptyBox: {
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    marginBottom: 12,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
