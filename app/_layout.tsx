import "react-native-get-random-values";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { View, TouchableOpacity, StyleSheet, Modal, Text, ScrollView, Pressable, StatusBar, Image, Platform } from "react-native";
import { Menu, CheckSquare, Calendar, Target, FileText, BookOpen, Heart, Sparkles, User, Home, X, Users, WifiOff, RefreshCw } from "lucide-react-native";
import { AppProvider, useApp } from "@/contexts/AppContext";
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
import { useResponsive } from '@/utils/responsive';
import ResponsiveContainer from '@/components/ResponsiveContainer';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function MenuButton() {
  const [showMenu, setShowMenu] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { isTablet } = useResponsive();

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
          <Pressable style={[menuStyles.menuContainer, isTablet && menuStyles.menuContainerTablet]} onPress={(e) => e.stopPropagation()}>
            <View style={[menuStyles.menuHeader, { paddingTop: Platform.OS === 'ios' ? Math.max(20, insets.top) : 20 }]}>
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
  const { isOnline, refreshAllData } = useApp();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const insets = useSafeAreaInsets();
  const { isTablet } = useResponsive();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshAllData();
    setIsRefreshing(false);
  };

  return (
    <View style={[
      menuStyles.header, 
      { paddingTop: Platform.OS === 'ios' ? Math.max(0, insets.top - 16) : Math.max(0, insets.top - 4) },
      isTablet && { paddingHorizontal: 40 }
    ]}>
      <View style={menuStyles.headerLeft}>
        <MenuButton />
      </View>
      <View style={menuStyles.headerCenter}>
        <LogoButton size={100} />
        {!isOnline && (
          <View style={menuStyles.offlineBadge}>
            <WifiOff size={12} color={colors.surface} />
            <Text style={menuStyles.offlineText}>Offline</Text>
          </View>
        )}
      </View>
      <View style={menuStyles.headerRightContainer}>
        {isOnline && (
          <TouchableOpacity
            onPress={handleRefresh}
            style={menuStyles.refreshButton}
            disabled={isRefreshing}
          >
            <RefreshCw
              size={20}
              color={colors.primary}
              style={isRefreshing ? { opacity: 0.5 } : {}}
            />
          </TouchableOpacity>
        )}
        <ProfileButton />
      </View>
    </View>
  );
}

import AsyncStorage from '@react-native-async-storage/async-storage';



function RootLayoutNav() {
  const { isAuthenticated, isLoading, user, isRegistering, registeredAt } = useAuth();
  const router = useRouter();
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);

  const segments = usePathname();

  // Set Sentry and Analytics user context when user changes
  useEffect(() => {
    const updateUserContext = async () => {
      try {
        if (user) {
          // If the user registered within the last 10 seconds, apply a much longer buffer
          // to avoid bridge congestion and potential crashes during TurboModule calls.
          const isRecentRegistration = registeredAt && (Date.now() - registeredAt < 10000);
          const registrationBuffer = isRecentRegistration ? 6000 : 1500;

          setTimeout(async () => {
            const { InteractionManager } = await import('react-native');
            InteractionManager.runAfterInteractions(async () => {
              try {
                // One more check to ensure we aren't still registering
                if (isRegistering) {
                  console.log('[Layout] Skipping context update while registration flag is active.');
                  return;
                }

                console.log('[Layout] Applying Sentry/Analytics context for user:', user.uid);

                Sentry.setUser({
                  id: user.uid,
                  email: user.email || undefined,
                });

                await Analytics.setUserId(user.uid);
                if (user.email) {
                  await Analytics.setUserProperties({ email: user.email });
                }
                console.log('[Layout] Sentry/Analytics context applied.');
              } catch (innerError) {
                console.error('[Layout] Native exception prevented in context update:', innerError);
              }
            });
          }, registrationBuffer);
        } else {
          try {
            Sentry.setUser(null);
            await Analytics.setUserId(null);
          } catch (logoutError) {
            console.warn('[Layout] Error clearing context on logout:', logoutError);
          }
        }
      } catch (error) {
        console.error('[Layout] Error in updateUserContext setup:', error);
      }
    };

    updateUserContext();
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


  useEffect(() => {
    if (!isLoading && onboardingComplete !== null) {
      SplashScreen.hideAsync();
    }
  }, [isLoading, onboardingComplete]);

  useEffect(() => {
    // Initialize Analytics
    const initAnalytics = async () => {
      try {
        await Analytics.init();
        console.log('[Analytics] initialized');
      } catch (error) {
        console.error('[Analytics] initialization failed:', error);
      }
    };
    initAnalytics();
  }, []);

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
    // Initialize the authoritative notification handler
    NotificationService.initNotifications();

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

  const inAuthGroup = segments === '/login' || segments === '/register' || segments === '/onboarding' || segments === '/intro-survey';
  const isInvite = segments?.startsWith('/invite');

  // Show a blank cover screen while:
  // 1. Auth is still loading, OR
  // 2. Onboarding status not yet read, OR
  // 3. User is not authenticated AND not yet on an auth screen (redirect in-flight)
  const shouldShowCover =
    isLoading ||
    onboardingComplete === null ||
    (!isAuthenticated && !inAuthGroup && !isInvite);

  if (shouldShowCover) {
    return (
      <View style={splashStyles.container}>
        <Image
          source={require('../assets/images/logo.png')}
          style={splashStyles.logo}
          resizeMode="contain"
        />
      </View>
    );
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

function RootLayout() {
  const stripeKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_live_51PRLrfP0t2AuYFqKyKwaltV3py5wvWtfdPgfadWXFl3k7nbhygi2O8J9XnwuZMWWfLavLKiN7E2A794UozlAOBq2003kcHeHIE';

  useEffect(() => {
    // Initialize Sentry inside effect to prevent fatal error at module level if native module is missing
    // Added a 500ms delay to allow the React Native bridge/New Architecture to fully stabilize
    // before making aggressive native module calls that could crash ObjCTurboModule.
    const sentryTimer = setTimeout(() => {
      try {
          Sentry.init({
            dsn: process.env.EXPO_PUBLIC_SENTRY_DSN || 'https://b73520e1b6648db41574a92098b42ec2@o4510577981915136.ingest.us.sentry.io/4510577983356928',
            debug: true,
          });
      } catch (e) {
        console.warn('Sentry initialization failed:', e);
      }
    }, 500);

    return () => clearTimeout(sentryTimer);
  }, []);

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
}

const WrappedRootLayout = Sentry.wrap(RootLayout);

export default function Layout() {
  return <WrappedRootLayout />;
}

const splashStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 200,
    height: 200,
  },
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
    paddingBottom: 8,
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
    gap: 4,
  },
  headerRightContainer: {
    width: 80,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  headerCalendar: {
    padding: 8,
  },
  refreshButton: {
    padding: 8,
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.error,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
    marginTop: -4,
  },
  offlineText: {
    color: colors.surface,
    fontSize: 10,
    fontWeight: '700',
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
  menuContainerTablet: {
    width: 350,
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