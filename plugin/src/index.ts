import { createRunOncePlugin, withAndroidManifest, withEntitlementsPlist } from "@expo/config-plugins";
import { ExpoConfig } from "@expo/config-types";
import { withIosAppDelegate } from "./ios";
import { getMainApplicationOrThrow } from "@expo/config-plugins/build/android/Manifest";
import withCallkeep from '@config-plugins/react-native-callkeep/build/withCallkeep.js';

const pak = require("react-native-voip-push-notification/package.json");

// Add push notification entitlement
const withPushNotification = (config: ExpoConfig) => {
  return withEntitlementsPlist(config, (config) => {
    if (!config.modResults["aps-environment"]) {
      config.modResults["aps-environment"] = "development";
    }
    return config;
  });
};


const withCallKeepFix = (config: ExpoConfig) => {
    return withAndroidManifest(config, async (config) => {
        const app =  getMainApplicationOrThrow(config.modResults)
        if (!Array.isArray(app.service)) {
            app.service = [];
        }
        if (!app.service.find((item) => item.$["android:name"] === "io.wazo.callkeep.VoiceConnectionService")) {
            app.service.push({
                $: {
                    "android:name": "io.wazo.callkeep.VoiceConnectionService",
                    "android:exported": "true",
                    // @ts-ignore
                    "android:label": "Wazo",
                    "android:permission": "android.permission.BIND_TELECOM_CONNECTION_SERVICE",
                    // Use this to target android >= 11
                    "android:foregroundServiceType": "camera|microphone",
                   
                },
                "intent-filter": [
                    {
                        action: [
                            {
                                $: {
                                    "android:name": "android.telecom.ConnectionService",
                                },
                            },
                        ],
                    },
                ],
            });
        }
        return config;
    })

};

// Compose multiple modifiers
const withVoipPush = (config: ExpoConfig) => {
  config = withIosAppDelegate(config);
  config = withPushNotification(config);
  config = withCallkeep(config);
  config = withCallKeepFix(config);
  return config;
};

export default createRunOncePlugin(withVoipPush, pak.name, pak.version);
