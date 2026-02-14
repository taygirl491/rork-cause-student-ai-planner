import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { View, TouchableOpacity, StyleSheet, Modal, Text, ScrollView, Pressable, StatusBar } from "react-native";
import { Menu, CheckSquare, Calendar, Target, FileText, BookOpen, Heart, Sparkles, User, Home, X, Users } from "lucide-react-native";
import { AppProvider } from "@/contexts/AppContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { StreakProvider } from "@/contexts/StreakContext";
import * as NotificationService from "@/utils/notificationService";
import * as Notifications from "expo-notifications";
import LogoButton from "@/components/LogoButton";
import colors from "@/constants/colors";
import { auth } from "@/firebaseConfig";
import * as Sentry from '@sentry/react-native';
import { StripeProvider } from '@stripe/stripe-react-native';
import * as Analytics from "@/utils/analytics";

// Initialize Sentry
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN || 'https://b73520e1b6648db41574a92098b42ec2@o4510577981915136.ingest.us.sentry.io/4510577983356928',
  debug: true,
  tracesSampleRate: 1.0,
});

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function MenuButton() {
  const [showMenu, setShowMenu] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const menuItems = [
    { label: 'Home', icon: Home, route: '/home' },
    { label: 'Tasks', icon: CheckSquare, route: '/tasks' },
    { label: 'Calendar', icon: Calendar, route: '/calendar' },
    { label: 'Classes', icon: BookOpen, route: '/classes' },
    { label: 'Study Groups', icon: Users, route: '/study-groups' },
    { label: 'Goals', icon: Target, route: '/goals' },
    { label: 'Notes', icon: FileText, route: '/notes' },
    { label: 'AI Buddy', icon: Sparkles, route: '/ai-buddy' },
    { label: 'Causes', icon: Heart, route: '/causes' },
  ];

  const handleNavigate = (route: string) => {
    setShowMenu(false);
    if (pathname === route) return;
    router.push(route as any);
  };

  return (
    <>
      <TouchableOpacity onPress={() => setShowMenu(true)} style={menuStyles.menuButton}>
        <Menu size={28} color={colors.text} />
      </TouchableOpacity>

      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <Pressable style={menuStyles.overlay} onPress={() => setShowMenu(false)}>
          <Pressable style={menuStyles.menuContainer} onPress={(e) => e.stopPropagation()}>
            <View style={menuStyles.menuHeader}>
              <Text style={menuStyles.menuTitle}>Menu</Text>
              <TouchableOpacity onPress={() => setShowMenu(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={menuStyles.menuList}>
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.route;
                return (
                  <TouchableOpacity
                    key={item.label}
                    style={[menuStyles.menuItem, isActive && menuStyles.menuItemActive]}
                    onPress={() => handleNavigate(item.route)}
                  >
                    <Icon size={24} color={isActive ? colors.primary : colors.text} />
                    <Text style={[menuStyles.menuItemText, isActive && menuStyles.menuItemTextActive]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function ProfileButton() {

  const router = useRouter();
  return (
    <Pressable style={menuStyles.headerCalendar} onPress={() => router.push('/account')}>
      <User />
    </Pressable>
  );
}
function CustomHeader() {
  return (
    <View style={menuStyles.header}>
      <View style={menuStyles.headerLeft}>
        <MenuButton />
      </View>
      <View style={menuStyles.headerCenter}>
        <LogoButton size={44} />
      </View>
      <View>
        <View>
          <ProfileButton />
        </View>
      </View>
      {/* <View style={menuStyles.headerRight} /> */}
    </View>
  );
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerForPushNotificationsAsync } from "@/functions/Notify";

function RootLayoutNav() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);

  // Set Sentry and Analytics user context when user changes
  useEffect(() => {
    if (user) {
      Sentry.setUser({
        id: user.uid,
        email: user.email || undefined,
      });
      Analytics.setUserId(user.uid);
      if (user.email) {
        Analytics.setUserProperties({ email: user.email });
      }
    } else {
      Sentry.setUser(null);
      Analytics.setUserId(null);
    }
  }, [user]);

  // Track screen views
  useEffect(() => {
    if (segments) {
      Analytics.logScreenView(segments);
    }
  }, [segments]);

  useEffect(() => {
    checkOnboarding();
  }, []);

  const checkOnboarding = async () => {
    try {
      const value = await AsyncStorage.getItem('@onboarding_complete');
      setOnboardingComplete(value === 'true');
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      setOnboardingComplete(false);
    }
  };

  const segments = usePathname();

  useEffect(() => {
    if (!isLoading && onboardingComplete !== null) {
      const inAuthGroup = segments === '/login' || segments === '/register' || segments === '/onboarding' || segments === '/intro-survey';
      const isInvite = segments?.startsWith('/invite');

      if (isAuthenticated && auth.currentUser?.email === 'minatoventuresinc@gmail.com' && !segments?.startsWith('/admin')) {
        router.replace('/admin' as any);
        return;
      }

      if (onboardingComplete === false && !inAuthGroup && !isAuthenticated) {
        router.replace('/onboarding');
      } else if (!isAuthenticated && !inAuthGroup && !isInvite) {
        // Redirect to login only if not in auth group AND not trying to view an invite
        router.replace('/login');
      }
    }
  }, [isAuthenticated, isLoading, onboardingComplete, router, segments]);

  // Request notification permissions and setup handler
  useEffect(() => {
    // Request permissions on app start
    NotificationService.requestNotificationPermissions();

    // Handle notification tap
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;

        if (data.type === 'task_reminder' && data.taskId) {
          // Navigate to tasks tab
          router.push('/(tabs)/tasks');
        }
      }
    );

    return () => subscription.remove();
  }, [router]);

  if (isLoading || onboardingComplete === null) {
    return null;
  }

  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen
        name="onboarding"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="login"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="register"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="intro-survey"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="invite/[code]"
        options={{
          headerShown: true,
          title: "Join Group",
          headerBackTitle: "Back"
        }}
      />
      <Stack.Screen
        name="group-detail"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="payment"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="(tabs)"
        options={{
          headerShown: true,
          header: () => <CustomHeader />,
        }}
      />
    </Stack>
  );
}

export default Sentry.wrap(function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);


  const stripeKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_live_51PRLrfP0t2AuYFqKyKwaltV3py5wvWtfdPgfadWXFl3k7nbhygi2O8J9XnwuZMWWfLavLKiN7E2A794UozlAOBq2003kcHeHIE';
  console.log('[Stripe] Initializing with key:', stripeKey ? stripeKey.substring(0, 10) + '...' : 'MISSING');

  return (
    <StripeProvider
      publishableKey={stripeKey}
      merchantIdentifier="merchant.com.causeai"
    >
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <AuthProvider>
            <StreakProvider>
              <AppProvider>
                <RootLayoutNav />
              </AppProvider>
            </StreakProvider>
          </AuthProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </StripeProvider>
  );
});

const menuStyles = StyleSheet.create({
  menuButton: {
    padding: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: (StatusBar.currentHeight || 0) + 10,
    paddingBottom: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    width: 80,
    alignItems: 'flex-start',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerCalendar: {
    width: 80,
    alignItems: 'flex-end',
  },
  headerRight: {
    width: 80,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  menuContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 280,
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: colors.text,
  },
  menuList: {
    flex: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
  },
  menuItemActive: {
    backgroundColor: colors.primary + '10',
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: colors.text,
  },
  menuItemTextActive: {
    color: colors.primary,
    fontWeight: '700' as const,
  },
});