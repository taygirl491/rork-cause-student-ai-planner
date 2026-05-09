import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useRef } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User as FirebaseUser,
  initializeAuth,
  sendPasswordResetEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider
} from 'firebase/auth';
import { auth } from '@/firebaseConfig';
import { SubscriptionTier, PERMISSIONS, Features } from '@/constants/permissions';

// Initialize auth persistence if not already initialized
// Note: In a real app, you might want to do this in a separate initialization file
// but for this context, we'll rely on the auth instance imported from firebaseConfig
// which should be initialized with persistence in firebaseConfig.ts or here.
// Since firebaseConfig.ts usually just exports getAuth(app), we might need to set persistence here
// or ensure getAuth picks up the default persistence for the platform.
// For React Native with Expo, it's often recommended to use initializeAuth with persistence.
// However, if auth is already initialized in firebaseConfig, we can set persistence:
// setPersistence(auth, browserLocalPersistence) // for web
// For native, standard getAuth() usually works, but let's be safe.

export type User = {
  email: string;
  name: string;
  uid: string;
  photoURL?: string;
  tier: SubscriptionTier;
  createdAt?: string; // ISO Date string
};

type AuthData = {
  user: User | null;
  isAuthenticated: boolean;
};

function getEffectiveTier(email: string, tier: SubscriptionTier): SubscriptionTier {
  return tier;
}
// ────────────────────────────────────────────────────────────────────────────

export const [AuthProvider, useAuth] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [authData, setAuthData] = useState<AuthData>({
    user: null,
    isAuthenticated: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const isRegisteringRef = useRef(false);
  const [registeredAt, setRegisteredAt] = useState<number | null>(null);
  const [trialExhausted, setTrialExhausted] = useState(false);
  const prevTierRef = useRef<SubscriptionTier | null>(null);


  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (isRegisteringRef.current) {
        console.log('[AuthContext] Skipping onAuthStateChanged backend call during registration...');
        setIsLoading(false);
        return;
      }

      console.log('[AuthContext] Auth state changed:', firebaseUser ? 'User logged in' : 'User logged out');

      if (firebaseUser) {
        // Set initial local state immediately to allow UI to render/hide splash screen
        const initialEmail = firebaseUser.email || '';
        setAuthData({
          user: {
            email: initialEmail,
            name: firebaseUser.displayName || 'User',
            uid: firebaseUser.uid,
            photoURL: firebaseUser.photoURL || undefined,
            tier: getEffectiveTier(initialEmail, 'free'),
            createdAt: firebaseUser.metadata.creationTime,
          },
          isAuthenticated: true,
        });

        // Hide splash screen as soon as we have the basic user info
        setIsLoading(false);

        // Fetch additional data from backend in the background
        try {
          const apiService = (await import('@/utils/apiService')).default;
          console.log('[AuthContext] Fetching backend user data in background...');
          const response = await apiService.getUser(firebaseUser.uid);

          if (response && response.success && response.user) {
            console.log('[AuthContext] Backend user data received:', response.user.tier);
            const backendUser = response.user;

            setAuthData(prev => {
              if (!prev.user) return prev;
              const backendTier = (backendUser.tier as SubscriptionTier) || 'free';
              return {
                ...prev,
                user: {
                  ...prev.user,
                  name: backendUser.name || prev.user.name,
                  tier: getEffectiveTier(prev.user.email, backendTier),
                  createdAt: backendUser.createdAt || prev.user.createdAt,
                }
              };
            });
          }
        } catch (error) {
          console.error('[AuthContext] Error fetching backend user data:', error);
          // Non-blocking
        }

        syncPurposeStatement(firebaseUser.uid);
      } else {
        setAuthData({
          user: null,
          isAuthenticated: false,
        });
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Load trial-exhausted flag from storage when user signs in
  useEffect(() => {
    const uid = authData.user?.uid;
    if (!uid) {
      setTrialExhausted(false);
      prevTierRef.current = null;
      return;
    }
    AsyncStorage.getItem(`@trial_used_${uid}`).then(val => {
      if (val === 'true') setTrialExhausted(true);
    }).catch(() => {});
  }, [authData.user?.uid]);

  // Persist trial-exhausted when user upgrades from free to a paid tier
  useEffect(() => {
    const uid = authData.user?.uid;
    const currentTier = authData.user?.tier ?? null;
    if (!uid || !currentTier) return;
    if (prevTierRef.current === 'free' && currentTier !== 'free') {
      AsyncStorage.setItem(`@trial_used_${uid}`, 'true').catch(() => {});
      setTrialExhausted(true);
    }
    prevTierRef.current = currentTier;
  }, [authData.user?.tier, authData.user?.uid]);

  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const userCredential = await signInWithEmailAndPassword(auth, credentials.email, credentials.password);
      return userCredential.user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: { email: string; password: string; name: string }) => {
      console.log('[AuthContext] Starting registration flow for:', data.email);
      isRegisteringRef.current = true;

      try {
        // 1. Create Firebase User
        console.log('[AuthContext] Creating Firebase user...');
        const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
        const firebaseUser = userCredential.user;

        if (!firebaseUser) throw new Error('Firebase user creation failed');
        console.log('[AuthContext] Firebase user created:', firebaseUser.uid);

        // 2. Update Firebase Profile (Name)
        // Sequentialize to ensure name is set before backend sync
        console.log('[AuthContext] Updating Firebase profile name with:', data.name);
        if (data.name) {
          await updateProfile(firebaseUser, { displayName: data.name });
          await firebaseUser.reload();
          console.log('[AuthContext] Firebase profile updated.');
        } else {
          console.warn('[AuthContext] Skipping profile update - name is empty.');
        }

        // 3. Register in Backend
        console.log('[AuthContext] Registering in backend...');
        const apiService = (await import('@/utils/apiService')).default;
        const registrationResponse = await apiService.registerUser(firebaseUser.uid, data.email, data.name);
        if (!registrationResponse?.success) {
          console.warn('[AuthContext] Backend registration returned failure but continuing:', registrationResponse?.error);
        }

        const backendUser = registrationResponse?.success ? registrationResponse.user : null;

        // 4. Send welcome email (non-blocking)
        apiService.sendWelcomeEmail(data.email, data.name)
          .catch(err => console.log('[AuthContext] Welcome email failed (non-blocking):', err));

        // 5. Update local state
        const registrationEmail = firebaseUser.email || data.email;
        const userData: User = {
          email: registrationEmail,
          name: data.name,
          uid: firebaseUser.uid,
          photoURL: firebaseUser.photoURL || undefined,
          tier: getEffectiveTier(registrationEmail, (backendUser?.tier as SubscriptionTier) || 'free'),
          createdAt: backendUser?.createdAt || new Date().toISOString(),
        };

        // 6. Sync purpose statement if exists
        syncPurposeStatement(firebaseUser.uid);

        setRegisteredAt(Date.now());
        setAuthData({
          user: userData,
          isAuthenticated: true,
        });

        console.log('[AuthContext] Registration complete.');
        return firebaseUser;
      } catch (error: any) {
        console.error('[AuthContext] Registration error details:', error.code, error.message);
        throw error;
      } finally {
        // Keep the registering flag true for a few more seconds to prevent layout effects 
        // (like Sentry/Analytics context updates) from firing while the bridge is still 
        // busy with registration cleanup and navigation.
        setTimeout(() => {
          console.log('[AuthContext] Registration flag reset.');
          isRegisteringRef.current = false;
        }, 5000); // 5 seconds of safety
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
  });


  const logoutMutation = useMutation({
    mutationFn: async () => {
      await signOut(auth);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
  });

  const login = async (email: string, password: string) => {
    return loginMutation.mutateAsync({ email, password });
  };

  const register = async (email: string, password: string, name: string) => {
    return registerMutation.mutateAsync({ email, password, name });
  };

  const logout = async () => {
    return logoutMutation.mutateAsync();
  };

  const syncPurposeStatement = async (userId: string) => {
    try {
      const savedAnswers = await AsyncStorage.getItem('@survey_answers');
      if (savedAnswers) {
        const purpose = JSON.parse(savedAnswers);
        const apiService = (await import('@/utils/apiService')).default;

        const response = await apiService.patch('/api/users/purpose', {
          userId,
          purpose
        });

        if (response.success) {
          console.log('[AuthContext] Purpose statement synced successfully');
          await AsyncStorage.removeItem('@survey_answers');
        }
      }
    } catch (error) {
      console.error('[AuthContext] Error syncing purpose statement:', error);
    }
  };

  // Permission Helper
  const checkPermission = (permission: keyof Features) => {
    if (!authData.user) return false;

    // Check if trial is active
    if (isTrialActive()) {
      return PERMISSIONS['unlimited'][permission];
    }

    const tier = authData.user.tier;
    const features = PERMISSIONS[tier];
    return features[permission];
  };

  const getFeatureLimit = (feature: keyof Features) => {
    if (!authData.user) return 0;

    // Check if trial is active
    if (isTrialActive()) {
      return PERMISSIONS['unlimited'][feature];
    }

    const tier = authData.user.tier;
    const features = PERMISSIONS[tier];
    return features[feature];
  };

  const isTrialActive = () => {
    if (!authData.user?.createdAt || authData.user.tier !== 'free') return false;
    if (trialExhausted) return false;

    const createdDate = new Date(authData.user.createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - createdDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays <= 14;
  };

  const getTrialDaysRemaining = () => {
    if (!authData.user?.createdAt || trialExhausted) return 0;

    const createdDate = new Date(authData.user.createdAt);
    const trialEndDate = new Date(createdDate.getTime() + (14 * 24 * 60 * 60 * 1000));
    const now = new Date();

    const diffTime = trialEndDate.getTime() - now.getTime();
    if (diffTime <= 0) return 0;

    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  };

  return {
    user: authData.user,
    isAuthenticated: authData.isAuthenticated,
    isLoading: isLoading,
    login,
    register,
    logout,
    resetPassword: async (email: string) => {
      await sendPasswordResetEmail(auth, email);
    },
    changePassword: async (currentPassword: string, newPassword: string) => {
      const user = auth.currentUser;
      if (!user || !user.email) throw new Error('No user authenticated');

      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
    },
    loginError: loginMutation.error,
    registerError: registerMutation.error,
    isLoggingIn: loginMutation.isPending,
    isRegistering: registerMutation.isPending,
    registeredAt, // Timestamp of when the user just registered
    checkPermission,
    getFeatureLimit,
    isTrialActive,
    getTrialDaysRemaining,
    currentTier: authData.user?.tier || 'free',
  };
});
