import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { View, TouchableOpacity, StyleSheet, Modal, Text, ScrollView, Pressable } from "react-native";
import { Menu, CheckSquare, Calendar, Target, FileText, BookOpen, Heart, Sparkles, User, Home, X } from "lucide-react-native";
import { AppProvider } from "@/contexts/AppContext";
import LogoButton from "@/components/LogoButton";
import colors from "@/constants/colors";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function MenuButton() {
  const [showMenu, setShowMenu] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const menuItems = [
    { label: 'Home', icon: Home, route: '/' },
    { label: 'Tasks', icon: CheckSquare, route: '/' },
    { label: 'Calendar', icon: Calendar, route: '/calendar' },
    { label: 'Classes', icon: BookOpen, route: '/classes' },
    { label: 'Goals', icon: Target, route: '/goals' },
    { label: 'Notes', icon: FileText, route: '/notes' },
    { label: 'AI Buddy', icon: Sparkles, route: '/ai-buddy' },
    { label: 'Causes', icon: Heart, route: '/causes' },
    { label: 'Account', icon: User, route: '/account' },
  ];

  const handleNavigate = (route: string) => {
    setShowMenu(false);
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
                    key={item.route}
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

function CustomHeader() {
  return (
    <View style={menuStyles.header}>
      <View style={menuStyles.headerLeft}>
        <MenuButton />
      </View>
      <View style={menuStyles.headerCenter}>
        <LogoButton size={44} />
      </View>
      <View style={menuStyles.headerRight} />
    </View>
  );
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
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

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AppProvider>
          <RootLayoutNav />
        </AppProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}

const menuStyles = StyleSheet.create({
  menuButton: {
    padding: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 12,
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
