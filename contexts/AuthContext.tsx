import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User as FirebaseUser,
  initializeAuth,
  getReactNativePersistence,
  sendPasswordResetEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider
} from 'firebase/auth';
import { auth } from '@/firebaseConfig';

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
};

type AuthData = {
  user: User | null;
  isAuthenticated: boolean;
};

export const [AuthProvider, useAuth] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [authData, setAuthData] = useState<AuthData>({
    user: null,
    isAuthenticated: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Listen for auth state changes
  useEffect(() => {
    // Persistence is handled in firebaseConfig.ts

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setAuthData({
          user: {
            email: firebaseUser.email || '',
            name: firebaseUser.displayName || 'User',
            uid: firebaseUser.uid,
            photoURL: firebaseUser.photoURL || undefined,
          },
          isAuthenticated: true,
        });
      } else {
        setAuthData({
          user: null,
          isAuthenticated: false,
        });
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

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
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);

      // Update profile with name
      if (userCredential.user) {
        await updateProfile(userCredential.user, {
          displayName: data.name,
        });

        // Reload user to get updated profile
        await userCredential.user.reload();
      }

      return auth.currentUser;
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
  };
});
