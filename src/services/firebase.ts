import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FirebaseError, FirebaseOptions, getApp, getApps, initializeApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  Persistence,
} from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';
import { Platform } from 'react-native';

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const requiredConfigKeys: (keyof FirebaseOptions)[] = [
  'apiKey',
  'authDomain',
  'databaseURL',
  'projectId',
  'appId',
];

export const isFirebaseConfigured = requiredConfigKeys.every((key) => {
  const value = firebaseConfig[key];
  return typeof value === 'string' && value.trim().length > 0;
});

const app = isFirebaseConfigured
  ? getApps().length > 0
    ? getApp()
    : initializeApp(firebaseConfig)
  : null;

class AsyncStoragePersistence implements Persistence {
  static readonly type = 'LOCAL';
  readonly type = 'LOCAL';

  async _isAvailable(): Promise<boolean> {
    return true;
  }

  _set(key: string, value: unknown): Promise<void> {
    return AsyncStorage.setItem(key, JSON.stringify(value));
  }

  async _get(key: string): Promise<unknown> {
    const value = await AsyncStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  }

  _remove(key: string): Promise<void> {
    return AsyncStorage.removeItem(key);
  }

  _addListener(_key: string, _listener: (value: unknown) => void): void {}

  _removeListener(_key: string, _listener: (value: unknown) => void): void {}
}

function initializeFirebaseAuth() {
  if (!app) {
    return null;
  }

  if (Platform.OS === 'web') {
    return getAuth(app);
  }

  try {
    return initializeAuth(app, {
      persistence: AsyncStoragePersistence,
    });
  } catch (error) {
    if (error instanceof FirebaseError && error.code === 'auth/already-initialized') {
      return getAuth(app);
    }

    throw error;
  }
}

export const auth = initializeFirebaseAuth();
export const database = app ? getDatabase(app) : null;
export const storage = app && firebaseConfig.storageBucket ? getStorage(app) : null;
