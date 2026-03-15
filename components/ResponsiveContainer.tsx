import React from 'react';
import { View, StyleSheet, ViewStyle, ScrollViewProps } from 'react-native';
import { useResponsive } from '@/utils/responsive';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  maxWidth?: number;
}

export default function ResponsiveContainer({
  children,
  style,
  maxWidth = 800,
}: ResponsiveContainerProps) {
  const { isTablet } = useResponsive();

  if (!isTablet) {
    return <View style={[styles.mobileContainer, style]}>{children}</View>;
  }

  return (
    <View style={styles.outerContainer}>
      <View style={[styles.tabletContainer, { maxWidth }, style]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mobileContainer: {
    flex: 1,
  },
  outerContainer: {
    flex: 1,
    alignItems: 'center',
    width: '100%',
  },
  tabletContainer: {
    flex: 1,
    width: '100%',
  },
});
