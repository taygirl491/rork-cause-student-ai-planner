const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Injects `use_modular_headers!` into the iOS Podfile.
 *
 * WHY:
 * Firebase 12.x uses Swift pods (e.g. FirebaseCoreInternal) that depend on
 * GoogleUtilities (ObjC). Swift pods need their ObjC dependencies to define
 * modules. `use_modular_headers!` generates module maps for all pods WITHOUT
 * building them as frameworks — so ObjC pods like RNFBApp continue to work
 * as static libraries and don't get the non-modular-header-in-framework error.
 *
 * This is the correct fix vs. `use_frameworks: "static"` which builds all pods
 * as frameworks and breaks ObjC Firebase pods that include React-Core headers.
 */
const withModularHeaders = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        'Podfile'
      );

      let podfile = fs.readFileSync(podfilePath, 'utf8');

      const marker = '# [withModularHeaders]';

      if (!podfile.includes(marker)) {
        // Inject use_modular_headers! right before the first `target` block
        // so it applies globally to all pods.
        podfile = podfile.replace(
          /^(target\s+)/m,
          `${marker} Fix firebase Swift pod module resolution\nuse_modular_headers!\n\n$1`
        );
        fs.writeFileSync(podfilePath, podfile, 'utf8');
        console.log('[withModularHeaders] Injected use_modular_headers! into Podfile.');
      } else {
        console.log('[withModularHeaders] Already patched, skipping.');
      }

      return config;
    },
  ]);
};

module.exports = withModularHeaders;
