import { create } from 'zustand';
import { UserProfile, UserRole, SubscriptionTier } from '@/types';
import { get as getDatabaseValue, ref } from 'firebase/database';
import { auth, database, isFirebaseConfigured } from '@/services/firebase';
import { signOut as firebaseSignOut } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface CachedAccountProfile {
  profile: UserProfile;
  role: UserRole;
  subscriptionTier: SubscriptionTier;
}

const profileCacheKey = (userId: string) => `maboundza.profile.${userId}`;

interface AuthState {
  user: UserProfile | null;
  role: UserRole;
  subscriptionTier: SubscriptionTier;
  scansUsedToday: number;
  maxScansAllowed: number;
  isLoading: boolean;
  setUser: (user: UserProfile | null) => void;
  setRole: (role: UserRole) => void;
  incrementScanCount: () => void;
  fetchProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  role: 'standard',
  subscriptionTier: 'freemium',
  scansUsedToday: 0,
  maxScansAllowed: 5,
  isLoading: true,

  setUser: (user) => set({ user }),
  setRole: (role) => set({ role }),

  incrementScanCount: () => {
    set((state) => ({ scansUsedToday: state.scansUsedToday + 1 }));
  },

  fetchProfile: async () => {
    if (!auth || !database) {
      if (!isFirebaseConfigured) {
        console.warn('Firebase is not configured. Authentication is unavailable.');
      }
      set({ user: null, isLoading: false });
      return;
    }

    try {
      set({ isLoading: true });
      await auth.authStateReady();
      const currentUser = auth.currentUser;

      if (!currentUser) {
        set({ user: null, isLoading: false });
        return;
      }

      const defaultProfile: UserProfile = {
        id: currentUser.uid,
        email: currentUser.email ?? '',
        display_name: currentUser.displayName ?? undefined,
        created_at: currentUser.metadata.creationTime ?? new Date().toISOString(),
      };
      set({ user: defaultProfile, isLoading: false });

      try {
        const cachedValue = await AsyncStorage.getItem(profileCacheKey(currentUser.uid));
        if (cachedValue) {
          const cached = JSON.parse(cachedValue) as CachedAccountProfile;
          if (cached.profile?.id === currentUser.uid) {
            set({
              user: cached.profile,
              role: cached.role,
              subscriptionTier: cached.subscriptionTier,
              maxScansAllowed: cached.subscriptionTier === 'freemium' ? 5 : 9999,
            });
          }
        }
      } catch (error) {
        console.warn('Unable to read cached account profile:', error);
      }

      const [profileSnapshot, roleSnapshot, subscriptionSnapshot] = await Promise.all([
        getDatabaseValue(ref(database, `profiles/${currentUser.uid}`)),
        getDatabaseValue(ref(database, `user_roles/${currentUser.uid}`)),
        getDatabaseValue(ref(database, `subscriptions/${currentUser.uid}/tier`)),
      ]);

      const profile = profileSnapshot.exists()
        ? ({ id: currentUser.uid, ...profileSnapshot.val() } as UserProfile)
        : defaultProfile;
      const role = (roleSnapshot.val()?.role as UserRole | undefined) || 'standard';
      const tier = (subscriptionSnapshot.val() as SubscriptionTier | null) || 'freemium';

      set({
        user: profile,
        role,
        subscriptionTier: tier,
        maxScansAllowed: tier === 'freemium' ? 5 : 9999,
        isLoading: false,
      });
      try {
        await AsyncStorage.setItem(
          profileCacheKey(currentUser.uid),
          JSON.stringify({ profile, role, subscriptionTier: tier } satisfies CachedAccountProfile)
        );
      } catch (error) {
        console.warn('Unable to cache account profile for offline use:', error);
      }
    } catch (err) {
      console.warn('Profile fetch error:', err);
      set({ isLoading: false });
    }
  },

  signOut: async () => {
    if (auth) {
      await firebaseSignOut(auth);
    }
    set({ user: null, role: 'standard', subscriptionTier: 'freemium' });
  },
}));
