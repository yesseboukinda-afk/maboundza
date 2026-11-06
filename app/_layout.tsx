import React, { useCallback, useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Network from 'expo-network';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { onAuthStateChanged } from 'firebase/auth';
import { onValue, ref } from 'firebase/database';
import AssistantBubble from '../components/AssistantBubble';
import MaboundzaSplash from '../components/splashscreen';
import { useAuthStore } from '@/src/store/authStore';
import { auth, database } from '@/src/services/firebase';
import {
  processSyncQueue,
  subscribeToAccountData,
  subscribeToPublishedPlants,
} from '@/src/offline/syncEngine';
import { registerGbifBackgroundTask } from '@/src/offline/gbifBackgroundTask';
import { isGbifNetworkError, syncGbifSpeciesToLocal } from '@/src/services/gbif';
import { Colors } from '@/src/theme/colors';

import '@/src/offline/gbifBackgroundTask';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5,
    },
  },
});

export default function RootLayout() {
  const { fetchProfile } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(true);
  const finishSplash = useCallback(() => setShowSplash(false), []);

  useEffect(() => {
    let isOnline = false;
    let isAppActive = AppState.currentState === 'active';
    let isSyncing = false;
    let isDisposed = false;
    let retryDelayMs = 30_000;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const wait = (milliseconds: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

    const syncGbif = async () => {
      if (isSyncing || !isOnline || !isAppActive || isDisposed) {
        return;
      }

      isSyncing = true;
      try {
        while (isOnline && isAppActive && !isDisposed) {
          const result = await syncGbifSpeciesToLocal();
          if (!result.hasMore) {
            retryDelayMs = 30_000;
            break;
          }

          if (result.failureCount > 0 || result.photoFailureCount > 0) {
            await wait(retryDelayMs);
            retryDelayMs = Math.min(retryDelayMs * 2, 5 * 60_000);
          } else {
            retryDelayMs = 30_000;
            await wait(1_000);
          }
        }
      } catch (error) {
        if (!isGbifNetworkError(error)) {
          console.error('Unable to synchronize Gabon plant observations from GBIF:', error);
        }
        if (isOnline && isAppActive && !isDisposed) {
          const delay = retryDelayMs;
          retryDelayMs = Math.min(retryDelayMs * 2, 5 * 60_000);
          retryTimer = setTimeout(() => {
            void syncGbif();
          }, delay);
        }
      } finally {
        isSyncing = false;
      }
    };

    const updateNetworkState = (state: Network.NetworkState) => {
      isOnline = state.isInternetReachable ?? state.isConnected ?? false;
      if (isOnline) {
        if (retryTimer) {
          clearTimeout(retryTimer);
          retryTimer = undefined;
        }
        void syncGbif();
      }
    };

    const networkSubscription = Network.addNetworkStateListener(updateNetworkState);
    void Network.getNetworkStateAsync()
      .then(updateNetworkState)
      .catch((error: unknown) => {
        console.error('Unable to determine network state for botanical synchronization:', error);
      });

    void registerGbifBackgroundTask().catch((error: unknown) => {
      console.error('Unable to register periodic GBIF synchronization:', error);
    });

    const appStateSubscription = AppState.addEventListener('change', (state) => {
      isAppActive = state === 'active';
      if (isAppActive) {
        void Network.getNetworkStateAsync()
          .then(updateNetworkState)
          .catch((error: unknown) => {
            console.error('Unable to recheck network state:', error);
          });
      }
    });

    return () => {
      isDisposed = true;
      if (retryTimer) {
        clearTimeout(retryTimer);
      }
      networkSubscription.remove();
      appStateSubscription.remove();
    };
  }, []);

  useEffect(() => {
    return subscribeToPublishedPlants();
  }, []);

  useEffect(() => {
    const firebaseAuth = auth;
    const firebaseDatabase = database;
    if (!firebaseAuth || !firebaseDatabase) {
      void fetchProfile();
      return;
    }

    let isConnected = false;
    let isSyncing = false;
    let unsubscribeAccountData = () => {};

    const syncPendingChanges = () => {
      const userId = firebaseAuth.currentUser?.uid;
      if (!isConnected || !userId || isSyncing) {
        return;
      }

      isSyncing = true;
      void processSyncQueue(userId)
        .catch((error: unknown) => {
          console.error('Automatic account synchronization failed:', error);
        })
        .finally(() => {
          isSyncing = false;
        });
    };

    const unsubscribeAuth = onAuthStateChanged(firebaseAuth, (user) => {
      unsubscribeAccountData();
      unsubscribeAccountData = () => {};
      void fetchProfile();
      if (user) {
        unsubscribeAccountData = subscribeToAccountData(user.uid);
        syncPendingChanges();
      }
    });

    const unsubscribeConnection = onValue(ref(firebaseDatabase, '.info/connected'), (snapshot) => {
      isConnected = snapshot.val() === true;
      syncPendingChanges();
    });

    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        syncPendingChanges();
      }
    });
    const syncInterval = setInterval(syncPendingChanges, 10000);

    return () => {
      unsubscribeAuth();
      unsubscribeConnection();
      unsubscribeAccountData();
      appStateSubscription.remove();
      clearInterval(syncInterval);
    };
  }, [fetchProfile]);

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" />
      <View style={{ flex: 1 }}>
        <Stack
          screenOptions={{
            headerStyle: {
              backgroundColor: Colors.forestGreen,
            },
            headerTintColor: Colors.white,
            headerTitleStyle: {
              fontWeight: 'bold',
            },
            contentStyle: {
              backgroundColor: Colors.naturalBeige,
            },
          }}
        >
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(main)" options={{ headerShown: false }} />
          <Stack.Screen name="plant/[id]" options={{ title: 'Fiche Botanique', headerBackTitle: 'Retour' }} />
          <Stack.Screen name="kids/index" options={{ title: 'Petit Botaniste avec Léo', headerStyle: { backgroundColor: Colors.sunYellow }, headerTintColor: Colors.darkGray }} />
          <Stack.Screen name="school/index" options={{ title: 'Mode École & Enseignants' }} />
          <Stack.Screen name="family/index" options={{ title: 'Mode Famille' }} />
          <Stack.Screen name="assistant/index" options={{ title: 'Maman MABOUNDZA' }} />
        </Stack>
        {isHomeShortcutVisible(pathname) && (
          <Pressable
            style={styles.homeShortcut}
            onPress={() => router.replace('/(main)')}
            accessibilityRole="button"
            accessibilityLabel="Retour à l’accueil"
          >
            <Ionicons name="home" size={18} color={Colors.white} />
            <Text style={styles.homeShortcutText}>Accueil</Text>
          </Pressable>
        )}
        <AssistantBubble />
        {showSplash && (
          <View style={styles.splashOverlay}>
            <MaboundzaSplash duration={3500} onFinish={finishSplash} />
          </View>
        )}
      </View>
    </QueryClientProvider>
  );
}

function isHomeShortcutVisible(pathname: string): boolean {
  return (
    pathname === '/kids' ||
    pathname.startsWith('/plant/')
  );
}

const styles = StyleSheet.create({
  splashOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 1000,
    elevation: 1000,
  },
  homeShortcut: {
    position: 'absolute',
    left: 18,
    bottom: 28,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 15,
    paddingVertical: 11,
    borderRadius: 22,
    backgroundColor: Colors.forestGreen,
    elevation: 6,
    shadowColor: Colors.darkGray,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  homeShortcutText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
});
