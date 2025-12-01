import { Stack } from "expo-router";
import React from "react";

export default function TabLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="calendar" />
      <Stack.Screen name="classes" />
      <Stack.Screen name="goals" />
      <Stack.Screen name="notes" />
      <Stack.Screen name="ai-buddy" />
      <Stack.Screen name="causes" />
      <Stack.Screen name="account" />
    </Stack>
  );
}
