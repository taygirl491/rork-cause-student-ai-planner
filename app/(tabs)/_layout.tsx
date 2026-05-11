import { Tabs, useRouter, usePathname } from "expo-router";
import React from "react";
import { View, StyleSheet, Platform, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Home,
  Calendar,
  Plus,
  Bot,
  BookOpen,
} from "lucide-react-native";
import colors from "@/constants/colors";
import { useApp } from "@/contexts/AppContext";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { isAIConversationActive } = useApp();
  const router = useRouter();
  const pathname = usePathname();
  const isTasksFocused = pathname === '/tasks' || pathname === '/(tabs)/tasks';

  const tabBarHeight = Platform.OS === 'ios' ? 70 + insets.bottom : 65 + insets.bottom;

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            ...styles.tabBar,
            height: tabBarHeight,
            paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 10 : 8),
          },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textLight,
          tabBarShowLabel: true,
          tabBarLabelStyle: styles.tabLabel,
        }}
      >
        <Tabs.Screen name="index" options={{ href: null }} />

        <Tabs.Screen
          name="home"
          options={{
            title: "Home",
            tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
          }}
        />

        <Tabs.Screen
          name="calendar"
          options={{
            title: "Calendar",
            tabBarIcon: ({ color, size }) => <Calendar size={size} color={color} />,
          }}
        />

        {/* Tasks tab — pure transparent spacer; floating button handles all interaction */}
        <Tabs.Screen
          name="tasks"
          options={{
            title: "",
            tabBarIcon: () => null,
            tabBarLabel: () => null,
            tabBarItemStyle: { backgroundColor: 'transparent' },
            // Replace RN's Pressable (which renders its own background/highlight)
            // with a plain transparent View so nothing white is visible here
            tabBarButton: () => (
              <View style={{ flex: 1, backgroundColor: 'transparent' }} />
            ),
          }}
        />

        {/* Study Groups — hidden (feature coming soon) */}
        <Tabs.Screen name="study-groups" options={{ href: null }} />

        <Tabs.Screen
          name="classes"
          options={{
            title: "Classes",
            tabBarIcon: ({ color, size }) => <BookOpen size={size} color={color} />,
          }}
        />

        <Tabs.Screen
          name="ai-buddy"
          options={{
            title: "AI Buddy",
            tabBarIcon: ({ color, size }) => <Bot size={size} color={color} />,
          }}
        />

        <Tabs.Screen name="goals"   options={{ href: null }} />
        <Tabs.Screen name="notes"   options={{ href: null }} />
        <Tabs.Screen name="causes"  options={{ href: null }} />
        <Tabs.Screen name="account" options={{ href: null }} />
      </Tabs>

      {/* Floating plus button — disabled during AI conversation */}
      <TouchableOpacity
        onPress={() => router.push('/(tabs)/tasks')}
        activeOpacity={0.85}
        disabled={isAIConversationActive}
        accessibilityLabel="Add task"
        accessibilityState={{ disabled: isAIConversationActive }}
        style={[
          styles.floatingButton,
          { bottom: tabBarHeight - 30 },
          isTasksFocused && styles.floatingButtonFocused,
          isAIConversationActive && { opacity: 0 },
        ]}
      >
        <Plus size={32} color="#FFFFFF" strokeWidth={3} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopColor: '#F0F0F0',
    borderTopWidth: 1,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  floatingButton: {
    position: 'absolute',
    alignSelf: 'center',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    zIndex: 999,
  },
  floatingButtonFocused: {
    backgroundColor: colors.primaryDark,
    transform: [{ scale: 1.05 }],
  },
});
