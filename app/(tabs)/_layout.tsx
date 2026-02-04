import { Tabs } from "expo-router";
import React from "react";
import { View, StyleSheet, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Home,
  Calendar,
  Plus,
  Users,
  Bot
} from "lucide-react-native";
import colors from "@/constants/colors";

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          ...styles.tabBar,
          height: Platform.OS === 'ios' ? 70 + insets.bottom : 65 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 10 : 8),
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textLight,
        tabBarShowLabel: true,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Home size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="calendar"
        options={{
          title: "Calendar",
          tabBarIcon: ({ color, size }) => (
            <Calendar size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="tasks"
        options={{
          title: "",
          tabBarIcon: ({ focused }) => (
            <View style={styles.plusButtonContainer}>
              <View style={[styles.plusButton, focused && styles.plusButtonFocused]}>
                <Plus size={32} color="#FFFFFF" strokeWidth={3} />
              </View>
            </View>
          ),
          tabBarLabel: () => null, // Hide label for the middle button
        }}
      />

      <Tabs.Screen
        name="study-groups"
        options={{
          title: "Groups",
          tabBarIcon: ({ color, size }) => (
            <Users size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="ai-buddy"
        options={{
          title: "AI Buddy",
          tabBarIcon: ({ color, size }) => (
            <Bot size={size} color={color} />
          ),
        }}
      />

      {/* Hide other screens from the tab bar but keep them in the layout */}
      <Tabs.Screen name="classes" options={{ href: null }} />
      <Tabs.Screen name="goals" options={{ href: null }} />
      <Tabs.Screen name="notes" options={{ href: null }} />
      <Tabs.Screen name="causes" options={{ href: null }} />
      <Tabs.Screen name="account" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopColor: '#F0F0F0',
    borderTopWidth: 1,
    paddingTop: 10,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  plusButtonContainer: {
    top: -20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  plusButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  plusButtonFocused: {
    backgroundColor: colors.primaryDark,
    transform: [{ scale: 1.05 }],
  }
});
