import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  Linking,
  ScrollView,
  Modal,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import * as Speech from 'expo-speech';
import type { Voice } from 'expo-speech';
import { Colors } from '@/src/theme/colors';
import { Typography } from '@/src/theme/typography';
import { GbifSpeciesRecord, Plant } from '@/types';
import {
  getLocalGbifSpecies,
  getLocalGbifSpeciesCount,
  getLocalPlants,
} from '@/src/database/sqlite';

const FILTER_PILLS = [
  'Fiches vérifiées',
  'Observations GBIF',
];

const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_GAP = 8;
const GRID_PADDING = 12;
const GRID_CARD_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP * 2) / 3;
const GBIF_PAGE_SIZE = 60;
const BACK_TO_TOP_SHOW_OFFSET = 180;
const BACK_TO_TOP_HIDE_OFFSET = 40;

type SelectedRecord =
  | { type: 'plant'; item: Plant }
  | { type: 'gbif'; item: GbifSpeciesRecord }
  | null;

type SelectedPhoto = {
  id: string;
  uri: string;
  credit?: string;
  license?: string;
  sourceUrl: string;
  caption?: string;
};

export default function EncyclopediaScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('Fiches vérifiées');
  const [plants, setPlants] = useState<Plant[]>([]);
  const [gbifSpecies, setGbifSpecies] = useState<GbifSpeciesRecord[]>([]);
  const [gbifCount, setGbifCount] = useState(0);
  const [gbifFilteredCount, setGbifFilteredCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMoreGbif, setLoadingMoreGbif] = useState(false);
  const [hasMoreGbif, setHasMoreGbif] = useState(false);
  const [showGbifBackToTop, setShowGbifBackToTop] = useState(false);
  const [showOfflineCount, setShowOfflineCount] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<SelectedRecord>(null);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [showPronunciationPicker, setShowPronunciationPicker] = useState(false);
  const loadingMoreGbifRef = useRef(false);
  const gbifLoadedCountRef = useRef(0);
  const gbifListRef = useRef<FlatList<GbifSpeciesRecord>>(null);

  const loadMoreGbifSpecies = useCallback(async () => {
    if (loadingMoreGbifRef.current || !hasMoreGbif || activeFilter !== 'Observations GBIF') {
      return;
    }

    loadingMoreGbifRef.current = true;
    setLoadingMoreGbif(true);
    try {
      const offset = gbifLoadedCountRef.current;
      const nextPage = await getLocalGbifSpecies(searchQuery, GBIF_PAGE_SIZE, offset);
      gbifLoadedCountRef.current = offset + nextPage.length;
      setGbifSpecies((current) => {
        const existingIds = new Set(current.map((species) => species.id));
        return [...current, ...nextPage.filter((species) => !existingIds.has(species.id))];
      });
      setHasMoreGbif(
        nextPage.length > 0 && offset + nextPage.length < gbifFilteredCount
      );
    } catch (error) {
      console.error('Unable to load more cached GBIF observations:', error);
    } finally {
      loadingMoreGbifRef.current = false;
      setLoadingMoreGbif(false);
    }
  }, [activeFilter, gbifFilteredCount, hasMoreGbif, searchQuery]);

  useEffect(() => {
    let isCurrent = true;
    setLoading(true);
    loadingMoreGbifRef.current = false;
    gbifLoadedCountRef.current = 0;
    if (activeFilter === 'Observations GBIF') {
      setGbifSpecies([]);
      setHasMoreGbif(false);
      return () => {
        isCurrent = false;
      };
    }

    const loadData = async () => {
      try {
        let localData = await getLocalPlants(searchQuery);
        if (isCurrent) {
          setPlants(localData);
        }
      } catch (error) {
        console.error('Unable to load cached botanical records:', error);
      } finally {
        if (isCurrent) {
          setLoading(false);
        }
      }
    };

    void loadData();
    return () => {
      isCurrent = false;
    };
  }, [searchQuery, activeFilter]);

  useFocusEffect(useCallback(() => {
    if (activeFilter !== 'Fiches vérifiées') {
      return;
    }

    let isCurrent = true;
    const refreshPublishedPlants = async () => {
      try {
        const localData = await getLocalPlants(searchQuery);
        if (isCurrent) {
          setPlants(localData);
        }
      } catch (error) {
        console.error('Unable to refresh cached published botanical records:', error);
      }
    };

    void refreshPublishedPlants();
    const interval = setInterval(() => {
      void refreshPublishedPlants();
    }, 3000);

    return () => {
      isCurrent = false;
      clearInterval(interval);
    };
  }, [activeFilter, searchQuery]));

  useFocusEffect(useCallback(() => {
    if (activeFilter !== 'Observations GBIF') {
      return;
    }

    let isCurrent = true;
    const refreshCachedSpecies = async () => {
      setLoading(true);
      try {
        const [species, count, filteredCount] = await Promise.all([
          getLocalGbifSpecies(searchQuery, GBIF_PAGE_SIZE),
          getLocalGbifSpeciesCount(),
          getLocalGbifSpeciesCount(searchQuery),
        ]);
        if (isCurrent) {
          setGbifSpecies(species);
          setGbifCount(count);
          setGbifFilteredCount(filteredCount);
          gbifLoadedCountRef.current = species.length;
          setHasMoreGbif(species.length < filteredCount);
        }
      } catch (error) {
        console.error('Unable to refresh cached GBIF observations:', error);
      } finally {
        if (isCurrent) {
          setLoading(false);
        }
      }
    };

    void refreshCachedSpecies();

    return () => {
      isCurrent = false;
    };
  }, [activeFilter, searchQuery]));

  const openRecord = (record: NonNullable<SelectedRecord>) => {
    setActivePhotoIndex(0);
    setSelectedRecord(record);
  };

  const closeRecordModal = () => {
    setSelectedRecord(null);
    setActivePhotoIndex(0);
  };

  const renderGbifSpeciesCard = ({ item }: { item: GbifSpeciesRecord }) => {
    const imageUri = item.photos?.[0]?.local_image_uri || item.local_image_uri;
    return (
      <TouchableOpacity
        style={styles.gridCard}
        onPress={() => openRecord({ type: 'gbif', item })}
        accessibilityRole="button"
        accessibilityLabel={`Ouvrir ${item.scientific_name}`}
      >
        {imageUri ? (
          <ExpoImage
            source={{ uri: imageUri }}
            style={styles.gridImage}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={120}
            recyclingKey={item.photos?.[0]?.id || item.id}
          />
        ) : (
          <View style={styles.gridImagePlaceholder}>
            <Ionicons name="leaf-outline" size={28} color={Colors.forestGreen} />
          </View>
        )}
        <Text style={styles.gridName} numberOfLines={2}>
          {item.common_name || item.scientific_name}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderPlantCard = ({ item }: { item: Plant }) => (
    <TouchableOpacity
      style={styles.gridCard}
      onPress={() => openRecord({ type: 'plant', item })}
      accessibilityRole="button"
      accessibilityLabel={`Ouvrir ${item.french_name}`}
    >
      {item.images?.[0]?.image_url ? (
        <ExpoImage
          source={{ uri: item.images[0].image_url }}
          style={styles.gridImage}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={120}
          recyclingKey={item.images[0].id}
        />
      ) : (
        <View style={styles.gridImagePlaceholder}>
          <Ionicons name="leaf-outline" size={28} color={Colors.forestGreen} />
        </View>
      )}
      <Text style={styles.gridName} numberOfLines={2}>{item.french_name || item.scientific_name}</Text>
    </TouchableOpacity>
  );

  const selectedPhotos: SelectedPhoto[] = selectedRecord?.type === 'plant'
    ? (selectedRecord.item.images || []).map((image) => ({
      id: image.id,
      uri: image.image_url,
      credit: image.photographer_credit,
      license: undefined,
      sourceUrl: image.image_url,
      caption: image.caption,
    }))
    : selectedRecord?.type === 'gbif'
      ? (selectedRecord.item.photos || []).map((photo) => ({
        id: photo.id,
        uri: photo.local_image_uri,
        credit: photo.image_credit,
        license: photo.image_license,
        sourceUrl: photo.image_source_url,
        caption: undefined,
      }))
      : [];
  const selectedTitle = selectedRecord?.type === 'plant'
    ? selectedRecord.item.french_name
    : selectedRecord?.item.scientific_name || '';
  const selectedSubtitle = selectedRecord?.type === 'plant'
    ? selectedRecord.item.scientific_name
    : selectedRecord?.type === 'gbif'
      ? selectedRecord.item.common_name || 'Nom commun non renseigné'
      : '';
  const onPhotoScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setActivePhotoIndex(Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH));
  };
  const pronunciationOptions = selectedRecord?.type === 'plant'
    ? [
      {
        key: 'fr',
        label: 'Français',
        text: selectedRecord.item.french_name,
        language: 'fr-FR',
      },
      ...(selectedRecord.item.vernacular_names || [])
        .filter((name) => name.local_name.trim().length > 0)
        .map((name) => ({
          key: name.id,
          label: name.language_name || 'Langue locale',
          text: name.local_name,
          language: getSpeechLocale(name.language_name),
        })),
    ]
    : selectedRecord?.type === 'gbif'
      ? [
        {
          key: 'scientific',
          label: 'Nom scientifique · Français',
          text: selectedRecord.item.scientific_name,
          language: 'fr-FR',
        },
        ...(selectedRecord.item.common_name
          ? [{
            key: 'common',
            label: 'Nom commun · Français',
            text: selectedRecord.item.common_name,
            language: 'fr-FR',
          }]
          : []),
      ]
      : [];
  const speakPronunciation = async (text: string, language: string) => {
    setShowPronunciationPicker(false);
    try {
      await Speech.stop();
    } catch (error) {
      console.warn('Unable to stop previous pronunciation before speaking:', error);
    }

    let voices: Voice[] = [];
    try {
      voices = await Speech.getAvailableVoicesAsync();
    } catch (error) {
      console.warn('Unable to list available speech voices:', error);
    }

    const voice = selectSpeechVoice(voices, language);
    Speech.speak(text, {
      language,
      ...(voice ? { voice: voice.identifier } : {}),
      rate: 0.84,
      pitch: 1.06,
      ...(Platform.OS === 'ios' ? { useApplicationAudioSession: true } : {}),
      onError: (error) => {
        console.error('Unable to pronounce plant name:', error);
        Alert.alert(
          'Prononciation indisponible',
          Platform.OS === 'ios'
            ? 'Vérifie que le mode silencieux de l’iPhone est désactivé et que le volume est activé. Si le problème persiste, installe une voix française dans Réglages > Accessibilité > Contenu énoncé > Voix.'
            : 'Aucune voix compatible n’est installée pour cette langue sur l’appareil.'
        );
      },
    });
  };

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
      <View style={styles.filterRow}>
        {FILTER_PILLS.map((item) => (
          <TouchableOpacity
            key={item}
            style={[styles.filterPill, activeFilter === item && styles.filterPillActive]}
            onPress={() => {
              setActiveFilter(item);
              if (item !== 'Observations GBIF') {
                setShowGbifBackToTop(false);
              }
            }}
          >
            <Text style={[styles.filterPillText, activeFilter === item && styles.filterPillTextActive]}>
              {item}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeFilter === 'Observations GBIF' ? (
        <View style={styles.gbifListContainer}>
          {showOfflineCount && (
            <View style={styles.cachePill}>
              {gbifCount < 1000 ? (
                <ActivityIndicator size="small" color={Colors.forestGreen} />
              ) : (
                <Ionicons name="cloud-done-outline" size={15} color={Colors.forestGreen} />
              )}
              <Text style={styles.cachePillText}>
                {Math.min(gbifCount, 1000)} / 1 000 chargées · {Math.max(1000 - gbifCount, 0)} restantes
              </Text>
              {gbifCount >= 1000 && (
                <TouchableOpacity
                  onPress={() => setShowOfflineCount(false)}
                  accessibilityRole="button"
                  accessibilityLabel="Fermer le suivi du téléchargement"
                  hitSlop={8}
                >
                  <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          )}
          <View style={styles.gbifListBody}>
            <FlatList
              ref={gbifListRef}
              data={gbifSpecies}
              keyExtractor={(item) => item.id}
              renderItem={renderGbifSpeciesCard}
              onScroll={(event) => {
                const offset = event.nativeEvent.contentOffset.y;
                if (offset > BACK_TO_TOP_SHOW_OFFSET) {
                  setShowGbifBackToTop(true);
                } else if (offset <= BACK_TO_TOP_HIDE_OFFSET) {
                  setShowGbifBackToTop(false);
                }
              }}
              scrollEventThrottle={100}
              onEndReached={() => void loadMoreGbifSpecies()}
              onEndReachedThreshold={0.4}
              initialNumToRender={12}
              maxToRenderPerBatch={12}
              updateCellsBatchingPeriod={50}
              windowSize={7}
              removeClippedSubviews={Platform.OS === 'android'}
              numColumns={3}
              columnWrapperStyle={styles.gridRow}
              contentContainerStyle={styles.gridContent}
              ListFooterComponent={loadingMoreGbif ? <ActivityIndicator style={styles.listLoader} color={Colors.forestGreen} /> : undefined}
              ListEmptyComponent={
                <View style={styles.emptyBox}>
                  <Ionicons
                    name="cloud-download-outline"
                    size={40}
                    color={Colors.textMuted}
                    style={styles.emptyIcon}
                  />
                  <Text style={styles.emptyText}>
                    {loading
                      ? 'Chargement des données hors ligne…'
                      : searchQuery
                        ? 'Aucune observation enregistrée ne correspond à votre recherche.'
                        : 'Aucune observation enregistrée pour le moment. Une connexion est nécessaire pour le premier téléchargement.'}
                  </Text>
                </View>
              }
            />
            {showGbifBackToTop && (
              <TouchableOpacity
                style={styles.backToTopButton}
                onPress={() => gbifListRef.current?.scrollToOffset({ offset: 0, animated: true })}
                accessibilityRole="button"
                accessibilityLabel="Remonter en haut des observations GBIF"
              >
                <Ionicons name="arrow-up" size={21} color={Colors.white} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      ) : (
        <FlatList
          data={plants}
          keyExtractor={(item) => item.id}
          renderItem={renderPlantCard}
          numColumns={3}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.gridContent}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="search-outline" size={40} color={Colors.textMuted} style={styles.emptyIcon} />
              <Text style={styles.emptyText}>
                {searchQuery ? 'Aucune plante ne correspond à votre recherche.' : 'Aucune fiche botanique vérifiée n’est disponible pour le moment.'}
              </Text>
            </View>
          }
        />
      )}
      {selectedRecord && (
        <View style={styles.recordOverlay}>
          <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={closeRecordModal}
            accessibilityLabel="Fermer la fiche plante"
          />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalTopBar}>
              <View style={styles.modalTitleContainer}>
                <Text style={styles.modalTitle} numberOfLines={2}>{selectedTitle}</Text>
                {!!selectedSubtitle && (
                  <Text style={styles.modalSubtitle} numberOfLines={1}>{selectedSubtitle}</Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={closeRecordModal}
                accessibilityRole="button"
                accessibilityLabel="Fermer"
              >
                <Ionicons name="close" size={22} color={Colors.darkGray} />
              </TouchableOpacity>
            </View>

            {selectedPhotos.length > 0 ? (
              <>
                <FlatList
                  horizontal
                  pagingEnabled
                  style={styles.photoCarousel}
                  showsHorizontalScrollIndicator={false}
                  data={selectedPhotos}
                  keyExtractor={(photo) => photo.id}
                  onMomentumScrollEnd={onPhotoScroll}
                  getItemLayout={(_data, index) => ({
                    length: SCREEN_WIDTH,
                    offset: SCREEN_WIDTH * index,
                    index,
                  })}
                  renderItem={({ item: photo }) => (
                    <View style={styles.carouselPage}>
                      <ExpoImage
                        source={{ uri: photo.uri }}
                        style={styles.modalImage}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        transition={150}
                        recyclingKey={photo.id}
                      />
                    </View>
                  )}
                />
                <View style={styles.photoMeta}>
                  <View style={styles.photoDots}>
                    {selectedPhotos.map((photo, index) => (
                      <View
                        key={photo.id}
                        style={[styles.photoDot, index === activePhotoIndex && styles.photoDotActive]}
                      />
                    ))}
                  </View>
                  {selectedPhotos[activePhotoIndex] && (
                    <>
                      {!!selectedPhotos[activePhotoIndex].caption && (
                        <Text style={styles.photoCaption}>{selectedPhotos[activePhotoIndex].caption}</Text>
                      )}
                      {!!selectedPhotos[activePhotoIndex].credit && (
                        <Text style={styles.photoCredit}>
                          {selectedPhotos[activePhotoIndex].credit}
                          {selectedPhotos[activePhotoIndex].license
                            ? ` · ${selectedPhotos[activePhotoIndex].license}`
                            : ''}
                        </Text>
                      )}
                      {selectedRecord?.type === 'gbif' && (
                        <TouchableOpacity
                          onPress={() => {
                            const sourceUrl = selectedPhotos[activePhotoIndex].sourceUrl;
                            void Linking.openURL(sourceUrl).catch((error: unknown) => {
                              console.error('Unable to open GBIF image source:', error);
                            });
                          }}
                          accessibilityRole="link"
                        >
                          <Text style={styles.sourceLink}>Voir la source de la photo</Text>
                        </TouchableOpacity>
                      )}
                    </>
                  )}
                </View>
              </>
            ) : (
              <View style={styles.noPhotoBox}>
                <Ionicons name="leaf-outline" size={36} color={Colors.forestGreen} />
                <Text style={styles.noPhotoText}>
                  {selectedRecord?.type === 'gbif'
                    ? selectedRecord.item.photo_error
                      ? `Photo non récupérée : ${selectedRecord.item.photo_error}`
                      : selectedRecord.item.photo_checked_at
                        ? 'Aucune photo réutilisable trouvée.'
                        : 'Recherche de photos en attente.'
                    : 'Aucune photo disponible pour cette plante.'}
                </Text>
              </View>
            )}

            <ScrollView
              style={styles.detailScroll}
              contentContainerStyle={styles.detailContent}
              showsVerticalScrollIndicator={false}
            >
              {pronunciationOptions.length > 0 && (
                <TouchableOpacity
                  style={styles.pronunciationButton}
                  onPress={() => setShowPronunciationPicker(true)}
                  accessibilityRole="button"
                >
                  <Ionicons name="volume-high-outline" size={18} color={Colors.white} />
                  <Text style={styles.pronunciationButtonText}>Écouter la prononciation</Text>
                </TouchableOpacity>
              )}
              {selectedRecord?.type === 'plant' ? (
                <>
                  <View style={styles.detailBadgeRow}>
                    <Text style={styles.detailBadge}>
                      Famille : {selectedRecord.item.family?.scientific_name || 'Non renseignée'}
                    </Text>
                    <Text style={styles.detailBadge}>
                      Statut : {selectedRecord.item.conservation_status}
                    </Text>
                  </View>
                  <Text style={styles.detailSectionTitle}>Description botanique</Text>
                  <Text style={styles.detailText}>
                    {selectedRecord.item.botanical_description || 'Description non renseignée.'}
                  </Text>
                  {selectedRecord.item.vernacular_names?.length ? (
                    <>
                      <Text style={styles.detailSectionTitle}>Noms locaux</Text>
                      {selectedRecord.item.vernacular_names.map((name) => (
                        <Text key={name.id} style={styles.detailText}>
                          {name.local_name}{name.language_name ? ` · ${name.language_name}` : ''}
                          {name.phonetic_transcription ? ` · ${name.phonetic_transcription}` : ''}
                        </Text>
                      ))}
                    </>
                  ) : null}
                  {[
                    ['Feuilles', selectedRecord.item.morphology_leaf],
                    ['Fleurs', selectedRecord.item.morphology_flower],
                    ['Fruits', selectedRecord.item.morphology_fruit],
                    ['Écorce', selectedRecord.item.morphology_bark],
                    ['Racines', selectedRecord.item.morphology_root],
                    ['Habitat', selectedRecord.item.habitat],
                    ['Répartition', selectedRecord.item.geographic_distribution],
                    ['Phénologie', selectedRecord.item.phenology],
                  ].map(([label, value]) => value ? (
                    <View key={label}>
                      <Text style={styles.detailSectionTitle}>{label}</Text>
                      <Text style={styles.detailText}>{value}</Text>
                    </View>
                  ) : null)}
                  {selectedRecord.item.uses?.length ? (
                    <>
                      <Text style={styles.detailSectionTitle}>Usages documentés</Text>
                      {selectedRecord.item.uses.map((use) => (
                        <Text key={use.id} style={styles.detailText}>
                          {use.therapeutic_indication} — {use.traditional_preparation}
                        </Text>
                      ))}
                    </>
                  ) : null}
                </>
              ) : selectedRecord?.type === 'gbif' ? (
                <>
                  <Text style={styles.detailBadge}>
                    Famille : {selectedRecord.item.family_name || 'Non renseignée'}
                  </Text>
                  {!!selectedRecord.item.genus && (
                    <Text style={styles.detailText}>Genre : {selectedRecord.item.genus}</Text>
                  )}
                  {!!selectedRecord.item.authorship && (
                    <Text style={styles.detailText}>Auteur botanique : {selectedRecord.item.authorship}</Text>
                  )}
                  <Text style={styles.detailSectionTitle}>Observations au Gabon</Text>
                  <Text style={styles.detailText}>
                    {selectedRecord.item.occurrence_count.toLocaleString('fr-FR')} signalement(s) GBIF.
                  </Text>
                  <Text style={styles.detailText}>
                    Données enregistrées hors ligne le{' '}
                    {new Date(selectedRecord.item.cached_at).toLocaleDateString('fr-FR')}.
                  </Text>
                  <Text style={styles.detailDisclaimer}>
                    Nom et signalements issus de GBIF, à vérifier. Cette observation ne constitue pas une fiche botanique validée.
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      void Linking.openURL(selectedRecord.item.source_url).catch((error: unknown) => {
                        console.error('Unable to open GBIF species source:', error);
                      });
                    }}
                    accessibilityRole="link"
                  >
                    <Text style={styles.sourceLink}>Consulter la source GBIF</Text>
                  </TouchableOpacity>
                </>
              ) : null}
            </ScrollView>
          </View>
          </View>
        </View>
      )}
      <Modal
        visible={showPronunciationPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPronunciationPicker(false)}
      >
        <View style={styles.languagePickerBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowPronunciationPicker(false)}
          />
          <View style={styles.languagePicker}>
            <Text style={styles.languagePickerTitle}>Choisir une langue</Text>
            {pronunciationOptions.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={styles.languageOption}
                onPress={() => speakPronunciation(option.text, option.language)}
                accessibilityRole="button"
              >
                <Ionicons name="volume-medium-outline" size={18} color={Colors.forestGreen} />
                <View style={styles.languageOptionText}>
                  <Text style={styles.languageOptionLabel}>{option.label}</Text>
                  <Text style={styles.languageOptionName} numberOfLines={1}>{option.text}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.languageCancel}
              onPress={() => setShowPronunciationPicker(false)}
            >
              <Text style={styles.languageCancelText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function getSpeechLocale(languageName?: string): string {
  const normalized = languageName?.trim().toLowerCase() || '';
  if (normalized.includes('anglais') || normalized.includes('english')) return 'en-US';
  if (normalized.includes('portugais') || normalized.includes('portugu')) return 'pt-PT';
  if (normalized.includes('espagnol') || normalized.includes('spanish')) return 'es-ES';
  if (normalized.includes('allemand') || normalized.includes('german')) return 'de-DE';
  if (normalized.includes('italien') || normalized.includes('italian')) return 'it-IT';
  if (normalized.includes('français') || normalized.includes('french')) return 'fr-FR';
  return 'fr-FR';
}

function selectSpeechVoice(voices: Voice[], language: string): Voice | undefined {
  const locale = language.toLowerCase();
  const matchingVoices = voices.filter((voice) =>
    voice.language.toLowerCase().replace('_', '-').startsWith(locale.split('-')[0])
  );
  const feminineFrenchVoice = matchingVoices.find((voice) =>
    /audrey|amelie|amélie|female|feminine|samantha|siri.*(?:female|feminine)/i.test(
      `${voice.name} ${voice.identifier}`
    )
  );

  if (feminineFrenchVoice) {
    return feminineFrenchVoice;
  }

  return matchingVoices.find((voice) => /enhanced/i.test(voice.quality)) ?? matchingVoices[0];
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
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 2,
    marginBottom: 8,
    backgroundColor: 'transparent',
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
  gridContent: {
    paddingHorizontal: GRID_PADDING,
    paddingTop: 4,
    paddingBottom: 24,
  },
  gridRow: {
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },
  gridCard: {
    width: GRID_CARD_WIDTH,
    backgroundColor: Colors.white,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  gridImage: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: Colors.lightGreen,
  },
  gridImagePlaceholder: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: Colors.lightGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridName: {
    ...Typography.caption,
    minHeight: 38,
    paddingHorizontal: 6,
    paddingVertical: 5,
    color: Colors.darkGray,
    fontWeight: '600',
    textAlign: 'center',
  },
  cachePill: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: Colors.white,
    borderRadius: 24,
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 7,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.darkGray,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 3,
  },
  cachePillText: {
    ...Typography.caption,
    color: Colors.forestGreen,
    fontWeight: '700',
    flexShrink: 1,
  },
  gbifListContainer: {
    flex: 1,
  },
  gbifListBody: {
    flex: 1,
  },
  recordOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 200,
    elevation: 200,
  },
  backToTopButton: {
    position: 'absolute',
    right: 18,
    bottom: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryGreen,
    borderWidth: 2,
    borderColor: Colors.white,
    elevation: 6,
    shadowColor: Colors.forestGreen,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.42)',
  },
  modalSheet: {
    height: '92%',
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
    overflow: 'hidden',
  },
  modalHandle: {
    width: 38,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.borderLight,
    alignSelf: 'center',
    marginBottom: 10,
  },
  modalTopBar: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 10,
  },
  modalTitleContainer: {
    flex: 1,
    paddingRight: 12,
  },
  modalTitle: {
    ...Typography.bodyBold,
    fontSize: 19,
    color: Colors.darkGray,
  },
  modalSubtitle: {
    ...Typography.caption,
    color: Colors.primaryGreen,
    fontStyle: 'italic',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.naturalBeige,
    alignItems: 'center',
    justifyContent: 'center',
  },
  carouselPage: {
    width: SCREEN_WIDTH,
    height: 260,
    backgroundColor: Colors.naturalBeige,
  },
  photoCarousel: {
    height: 260,
    flexGrow: 0,
    flexShrink: 0,
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
  photoMeta: {
    paddingHorizontal: 18,
    paddingTop: 3,
    paddingBottom: 2,
    alignItems: 'center',
  },
  photoDots: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 2,
  },
  photoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.borderLight,
  },
  photoDotActive: {
    width: 16,
    backgroundColor: Colors.forestGreen,
  },
  photoCaption: {
    ...Typography.caption,
    color: Colors.darkGray,
    textAlign: 'center',
  },
  photoCredit: {
    ...Typography.caption,
    color: Colors.textMuted,
    textAlign: 'center',
    fontSize: 10,
  },
  sourceLink: {
    ...Typography.caption,
    color: Colors.primaryGreen,
    fontWeight: '700',
    marginTop: 4,
  },
  noPhotoBox: {
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.lightGreen,
    gap: 8,
    paddingHorizontal: 24,
  },
  noPhotoText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  detailScroll: {
    flex: 1,
  },
  detailContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 36,
  },
  detailBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  detailBadge: {
    ...Typography.caption,
    alignSelf: 'flex-start',
    backgroundColor: Colors.lightGreen,
    color: Colors.forestGreen,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 6,
    overflow: 'hidden',
  },
  detailSectionTitle: {
    ...Typography.bodyBold,
    color: Colors.forestGreen,
    marginTop: 12,
    marginBottom: 4,
  },
  detailText: {
    ...Typography.body,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  detailDisclaimer: {
    ...Typography.caption,
    color: Colors.textMuted,
    marginTop: 12,
    lineHeight: 18,
  },
  pronunciationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primaryGreen,
    borderRadius: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  pronunciationButtonText: {
    ...Typography.bodyBold,
    color: Colors.white,
  },
  languagePickerBackdrop: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  languagePicker: {
    backgroundColor: Colors.white,
    borderRadius: 22,
    padding: 18,
  },
  languagePickerTitle: {
    ...Typography.bodyBold,
    color: Colors.darkGray,
    fontSize: 18,
    marginBottom: 12,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 54,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  languageOptionText: {
    flex: 1,
  },
  languageOptionLabel: {
    ...Typography.bodyBold,
    color: Colors.darkGray,
  },
  languageOptionName: {
    ...Typography.caption,
    color: Colors.textMuted,
  },
  languageCancel: {
    alignItems: 'center',
    paddingTop: 16,
  },
  languageCancelText: {
    ...Typography.bodyBold,
    color: Colors.primaryGreen,
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
  listLoader: {
    paddingVertical: 16,
  },
});
