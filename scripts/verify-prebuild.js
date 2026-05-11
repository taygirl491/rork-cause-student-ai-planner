if (process.env.VERIFY_BUILD !== 'true') process.exit(0);

const { rmSync } = require('fs');

const heavy = [
  // Payment / analytics
  '@stripe',
  '@sentry',
  'mixpanel-react-native',
  // Firebase (very large)
  '@react-native-firebase',
  // ML Kit (very large)
  '@react-native-ml-kit',
  // Expo native modules
  'expo-notifications',
  'expo-alarm-module',
  'expo-document-picker',
  'expo-image-picker',
  // Media / rendering
  'react-native-pdf',
  'react-native-svg',
  'react-native-webview',
  'react-native-youtube-iframe',
  'react-native-worklets',
  // Misc native
  'react-native-get-random-values',
  '@react-native-community',
  'react-native-modal-datetime-picker',
];

heavy.forEach(pkg => {
  try {
    rmSync(`node_modules/${pkg}`, { recursive: true, force: true });
    console.log(`Stripped: ${pkg}`);
  } catch (e) {
    console.log(`Skip (not found): ${pkg}`);
  }
});
