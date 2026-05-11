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
      projectId: "4f03b063-7906-41bc-bbe8-fb11613e296e",
    },
  },
  owner: "uwaiz",
};

const fullConfig = require('./app.json').expo;

module.exports = {
  expo: isVerifyBuild ? verifyConfig : fullConfig,
};
