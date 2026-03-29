const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo config plugin to exclude expo-alarm-module from the iOS Podfile.
 * 
 * The expo-alarm-module's native iOS code hijacks UNUserNotificationCenter.delegate
 * from expo-notifications, causing a SIGABRT crash on iOS. This plugin ensures
 * the pod is never installed on iOS by adding a post_install block that removes it.
 */
function withExcludeAlarmModuleIOS(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      
      if (fs.existsSync(podfilePath)) {
        let podfileContent = fs.readFileSync(podfilePath, 'utf8');
        
        // Add a line to remove the expo-alarm-module pod if it appears
        // We insert before "post_install" to ensure it runs during pod resolution
        if (!podfileContent.includes("'expo-alarm-module'")) {
          // Add pod exclusion before post_install
          const postInstallIndex = podfileContent.indexOf('post_install');
          if (postInstallIndex !== -1) {
            const exclusionCode = `
  # Exclude expo-alarm-module on iOS - it hijacks UNUserNotificationCenter.delegate
  # and causes SIGABRT crashes by conflicting with expo-notifications
  installer.pods_project.targets.each do |target|
    if target.name == 'expo-alarm-module'
      target.build_configurations.each do |config|
        config.build_settings['EXCLUDED_SOURCE_FILE_NAMES'] = '*'
      end
    end
  end

`;
            // Find the post_install do |installer| block and add our code inside it
            const postInstallDoIndex = podfileContent.indexOf('do |installer|', postInstallIndex);
            if (postInstallDoIndex !== -1) {
              const insertPoint = podfileContent.indexOf('\n', postInstallDoIndex) + 1;
              podfileContent = podfileContent.slice(0, insertPoint) + exclusionCode + podfileContent.slice(insertPoint);
            }
          }
          
          fs.writeFileSync(podfilePath, podfileContent);
        }
      }
      
      return config;
    },
  ]);
}

module.exports = withExcludeAlarmModuleIOS;
