// Disable expo-alarm-module autolinking on iOS.
// The module's native iOS code hijacks UNUserNotificationCenter.delegate,
// which conflicts with expo-notifications and causes a SIGABRT crash.
module.exports = {
  dependencies: {
    'expo-alarm-module': {
      platforms: {
        ios: null, // Disable autolinking on iOS
      },
    },
  },
};
