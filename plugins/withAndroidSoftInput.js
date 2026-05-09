const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withAndroidSoftInput(config) {
  return withAndroidManifest(config, (config) => {
    const activities = config.modResults.manifest.application?.[0]?.activity ?? [];
    const main = activities.find(
      (a) => a.$?.['android:name'] === '.MainActivity'
    );
    if (main) {
      main.$['android:windowSoftInputMode'] = 'adjustResize';
    }
    return config;
  });
};
