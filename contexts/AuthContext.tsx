import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';

const AUTH_STORAGE_KEY = 'cause-student-auth';

export type User = {
  email: string;
  name: string;
  createdAt: string;
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

  const authQuery = useQuery({
    queryKey: ['auth'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed;
      }
      return null;
    },
  });

  useEffect(() => {
    if (authQuery.data) {
      setAuthData({
        user: authQuery.data,
        isAuthenticated: true,
      });
    }
  }, [authQuery.data]);

  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const usersKey = 'cause-student-users';
      const usersStored = await AsyncStorage.getItem(usersKey);
      const users: { email: string; password: string; name: string; createdAt: string }[] = 
        usersStored ? JSON.parse(usersStored) as { email: string; password: string; name: string; createdAt: string }[] : [];

      const user = users.find(u => u.email === credentials.email && u.password === credentials.password);
      
      if (!user) {
        throw new Error('Invalid email or password');
      }

      const userData: User = {
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      };

      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userData));
      return userData;
    },
    onSuccess: (data) => {
      setAuthData({
        user: data,
        isAuthenticated: true,
      });
      queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: { email: string; password: string; name: string }) => {
      const usersKey = 'cause-student-users';
      const usersStored = await AsyncStorage.getItem(usersKey);
      const users: { email: string; password: string; name: string; createdAt: string }[] = 
        usersStored ? JSON.parse(usersStored) as { email: string; password: string; name: string; createdAt: string }[] : [];

      const existingUser = users.find(u => u.email === data.email);
      if (existingUser) {
        throw new Error('Email already registered');
      }

      const newUser = {
        email: data.email,
        password: data.password,
        name: data.name,
        createdAt: new Date().toISOString(),
      };

      users.push(newUser);
      await AsyncStorage.setItem(usersKey, JSON.stringify(users));

      const userData: User = {
        email: newUser.email,
        name: newUser.name,
        createdAt: newUser.createdAt,
      };

      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userData));
      return userData;
    },
    onSuccess: (data) => {
      setAuthData({
        user: data,
        isAuthenticated: true,
      });
      queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    },
    onSuccess: () => {
      setAuthData({
        user: null,
        isAuthenticated: false,
      });
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
    isLoading: authQuery.isLoading,
    login,
    register,
    logout,
    loginError: loginMutation.error,
    registerError: registerMutation.error,
    isLoggingIn: loginMutation.isPending,
    isRegistering: registerMutation.isPending,
  };
});
