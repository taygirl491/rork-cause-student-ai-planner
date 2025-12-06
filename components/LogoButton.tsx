import React from 'react';
import { TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

interface LogoButtonProps {
  size?: number;
}

export default function LogoButton({ size = 40 }: LogoButtonProps) {
  const router = useRouter();

  return (
    <TouchableOpacity 
      style={[styles.container, { width: size, height: size }]} 
      onPress={() => router.push('/')}
      activeOpacity={0.7}
    >
      <Image
        source={require('@/assets/images/icon.png')}
        style={[styles.logo, { width: size, height: size }]}
        resizeMode="contain"
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    borderRadius: 8,
  },
});
