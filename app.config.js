const isVerifyBuild = process.env.VERIFY_BUILD === 'true';

const verifyConfig = {
  name: "Cause Planner",
  slug: "cause-student-ai-planner",
  version: "1.0.0",
  android: {
    package: "com.minato.causeai",
    googleServicesFile: "./google-services.json",
  },
  plugins: [
    './plugins/withAdiRegistration',
    [
      "expo-build-properties",
      {
        android: {
          enableProguardInReleaseBuilds: true,
          enableShrinkResourcesInReleaseBuilds: true,
          abiFilters: ["arm64-v8a"],
        },
      },
    ],
  ],
  extra: {
    eas: {
      projectId: "c2f31aa7-cd96-465f-a379-5f1e04e8048f",
    },
  },
  owner: "luwaiz",
};

const fullConfig = require('./app.json').expo;

module.exports = {
  expo: isVerifyBuild ? verifyConfig : fullConfig,
};
