import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppState, View } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { onAuthStateChanged } from 'firebase/auth';
import { onValue, ref } from 'firebase/database';
import AssistantBubble from '../components/AssistantBubble';
import { useAuthStore } from '@/src/store/authStore';
import { auth, database } from '@/src/services/firebase';
import { processSyncQueue, subscribeToAccountData } from '@/src/offline/syncEngine';
import { Colors } from '@/src/theme/colors';

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
        <AssistantBubble />
      </View>
    </QueryClientProvider>
  );
}
