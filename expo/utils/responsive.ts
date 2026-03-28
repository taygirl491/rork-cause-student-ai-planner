import { useWindowDimensions, PixelRatio, Platform } from 'react-native';

export const breakpoints = {
  tablet: 768,
  laptop: 1024,
  desktop: 1440,
};

export const useResponsive = () => {
  const { width, height } = useWindowDimensions();

  const isTablet = width >= breakpoints.tablet;
  const isLaptop = width >= breakpoints.laptop;
  const isDesktop = width >= breakpoints.desktop;
  const isLargeScreen = isTablet;

  // Scaling factor for fonts and spacing on larger screens
  const scale = width / 375; // Standard mobile width base
  const normalize = (size: number) => {
    const newSize = isTablet ? size * 1.2 : size;
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  };

  return {
    width,
    height,
    isTablet,
    isLaptop,
    isDesktop,
    isLargeScreen,
    normalize,
    orientation: width > height ? 'landscape' : 'portrait',
  };
};

export const getResponsiveValue = (width: number, config: { mobile: any; tablet: any; laptop?: any }) => {
  if (width >= breakpoints.laptop && config.laptop) return config.laptop;
  if (width >= breakpoints.tablet) return config.tablet;
  return config.mobile;
};
