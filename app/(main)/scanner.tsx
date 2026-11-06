import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/theme/colors';
import { Typography } from '@/src/theme/typography';
import { useScannerStore } from '@/src/store/scannerStore';
import { useAuthStore } from '@/src/store/authStore';
import { saveLocalHerbariumEntry } from '@/src/database/sqlite';

export default function ScannerScreen() {
  const router = useRouter();
  const { user, incrementScanCount, scansUsedToday, maxScansAllowed } = useAuthStore();
  const { capturedImageUri, isAnalyzing, setCapturedImageUri, setIsAnalyzing, resetScanner } = useScannerStore();
  const [captureMessage, setCaptureMessage] = useState<string | null>(null);

  const canStartScan = () => {
    if (scansUsedToday >= maxScansAllowed) {
      Alert.alert(
        'Limite atteinte',
        'Vous avez atteint la limite de 5 scans quotidiens en compte Freemium. Passez en Premium Famille pour des scans illimités !'
      );
      return false;
    }

    return true;
  };

  const handlePhotoSelected = async (uri: string) => {
    incrementScanCount();
    if (!user) {
      setCapturedImageUri(uri);
      setCaptureMessage('Connectez-vous pour enregistrer automatiquement cette observation.');
      Alert.alert('Connexion requise', 'Connectez-vous pour conserver cette observation dans votre herbier.');
      return;
    }

    const observationId = `herb_${Date.now()}`;
    const extension = uri.split('.').pop()?.split(/[?#]/)[0]?.toLowerCase();
    const safeExtension = extension && /^[a-z0-9]{1,5}$/.test(extension) ? extension : 'jpg';

    try {
      if (!FileSystem.documentDirectory) {
        throw new Error('Le stockage local est indisponible.');
      }

      const photoDirectory = `${FileSystem.documentDirectory}observations/`;
      await FileSystem.makeDirectoryAsync(photoDirectory, { intermediates: true });
      const persistentPhotoUri = `${photoDirectory}${observationId}.${safeExtension}`;
      await FileSystem.copyAsync({ from: uri, to: persistentPhotoUri });

      setCapturedImageUri(persistentPhotoUri);
      await saveLocalHerbariumEntry({
        id: observationId,
        user_id: user.id,
        custom_title: 'Observation à identifier',
        captured_image_url: persistentPhotoUri,
        organ_type: 'unknown',
        notes: 'Photo enregistrée sans identification botanique.',
        scanned_at: new Date().toISOString(),
        is_synced: false,
      });
      setCaptureMessage('Observation enregistrée automatiquement dans votre herbier.');
    } catch (error) {
      console.error('Unable to automatically save herbarium observation:', error);
      setCapturedImageUri(uri);
      setCaptureMessage('La photo est prête, mais son enregistrement a échoué. Réessayez.');
      Alert.alert('Erreur', 'Impossible d’enregistrer automatiquement cette photo dans votre herbier.');
    }
  };

  const handleTakePhoto = async () => {
    if (!canStartScan()) {
      return;
    }

    setIsAnalyzing(true);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission requise', 'Autorisez l’accès à la caméra dans les réglages de votre téléphone.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await handlePhotoSelected(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert(
        'Caméra indisponible',
        error instanceof Error ? error.message : 'Impossible d’ouvrir la caméra.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePickImage = async () => {
    if (!canStartScan()) {
      return;
    }

    setIsAnalyzing(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission requise', 'Autorisez l’accès à la galerie pour choisir une photo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await handlePhotoSelected(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert(
        'Galerie indisponible',
        error instanceof Error ? error.message : 'Impossible d’ouvrir la galerie.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Viewfinder Preview Container */}
      <View style={styles.previewBox}>
        {capturedImageUri ? (
          <Image source={{ uri: capturedImageUri }} style={styles.previewImage} />
        ) : (
          <View style={styles.placeholderContainer}>
            <Ionicons name="camera-outline" size={48} color={Colors.primaryGreen} />
            <Text style={styles.placeholderTitle}>Prenez une photo claire</Text>
            <Text style={styles.placeholderSub}>
              Cadrez la feuille ou la fleur au centre sous la lumière naturelle du jour.
            </Text>
          </View>
        )}

        {isAnalyzing && (
          <View style={styles.analyzingOverlay}>
            <ActivityIndicator size="large" color={Colors.white} />
            <Text style={styles.analyzingText}>Traitement de la photo...</Text>
          </View>
        )}
      </View>

      {captureMessage && (
        <Text style={styles.captureMessage}>{captureMessage}</Text>
      )}

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.cameraBtn} onPress={handleTakePhoto} disabled={isAnalyzing}>
          <Ionicons name="camera-outline" size={20} color={Colors.white} />
          <Text style={styles.cameraBtnText}>Prendre une photo</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.galleryBtn} onPress={handlePickImage} disabled={isAnalyzing}>
          <Ionicons name="images-outline" size={20} color={Colors.forestGreen} />
          <Text style={styles.galleryBtnText}>Galerie</Text>
        </TouchableOpacity>
      </View>

      {capturedImageUri && (
        <>
          <TouchableOpacity
            style={styles.saveHerbBtn}
            onPress={() => router.push('/(main)/herbarium')}
          >
            <Ionicons name="book-outline" size={20} color={Colors.white} />
            <Text style={styles.saveHerbBtnText}>Voir mon herbier</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.resetBtn}
            onPress={() => {
              resetScanner();
              setCaptureMessage(null);
            }}
          >
            <Ionicons name="refresh-outline" size={18} color={Colors.primaryGreen} />
            <Text style={styles.resetBtnText}>Recommencer</Text>
          </TouchableOpacity>
        </>
      )}
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
    paddingBottom: 40,
  },
  previewBox: {
    width: '100%',
    height: 280,
    backgroundColor: Colors.white,
    borderRadius: 20,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.borderLight,
    marginBottom: 16,
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  placeholderContainer: {
    alignItems: 'center',
    padding: 24,
  },
  placeholderTitle: {
    ...Typography.header3,
    color: Colors.darkGray,
  },
  placeholderSub: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
  },
  captureMessage: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: 12,
    textAlign: 'center',
  },
  analyzingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: Colors.overlayDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  analyzingText: {
    ...Typography.header3,
    color: Colors.white,
    marginTop: 12,
  },
  analyzingSub: {
    ...Typography.caption,
    color: Colors.naturalBeige,
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  cameraBtn: {
    flex: 2,
    backgroundColor: Colors.primaryGreen,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  cameraBtnText: {
    ...Typography.bodyBold,
    color: Colors.white,
  },
  galleryBtn: {
    flex: 1,
    backgroundColor: Colors.lightGreen,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  galleryBtnText: {
    ...Typography.bodyBold,
    fontSize: 14,
    color: Colors.forestGreen,
  },
  resetBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    marginBottom: 16,
  },
  resetBtnText: {
    ...Typography.caption,
    color: Colors.textMuted,
  },
  saveHerbBtn: {
    flex: 1,
    backgroundColor: Colors.primaryGreen,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveHerbBtnText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
});
