import React from 'react';
import { TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

interface LogoButtonProps {
  size?: number;
}

export default function LogoButton({ size = 100 }: LogoButtonProps) {
  const router = useRouter();

  return (
    <Image
      source={require('@/assets/images/logo.png')}
      style={[styles.logo, { width: size, height: size }]}
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({
  logo: {
    borderRadius: 8,
  },
});
