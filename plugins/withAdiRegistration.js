const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withAdiRegistration(config) {
  return withDangerousMod(config, [
    'android',
    (config) => {
      const assetsDir = path.join(
        config.modRequest.platformProjectRoot,
        'app/src/main/assets'
      );
      const src = path.join(
        config.modRequest.projectRoot,
        'assets/adi-registration.properties'
      );
      const dest = path.join(assetsDir, 'adi-registration.properties');

      if (!fs.existsSync(assetsDir)) {
        fs.mkdirSync(assetsDir, { recursive: true });
      }
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
        console.log('[withAdiRegistration] Copied adi-registration.properties to Android assets.');
      }
      return config;
    },
  ]);
};
