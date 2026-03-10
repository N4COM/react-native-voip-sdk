import { createRunOncePlugin, withAndroidManifest, withEntitlementsPlist, withPodfile } from "@expo/config-plugins";
import { ExpoConfig } from "@expo/config-types";
import { withIosAppDelegate } from "./ios";
import { getMainApplicationOrThrow } from "@expo/config-plugins/build/android/Manifest";
import withCallkeep from '../../node_modules/@config-plugins/react-native-callkeep/build/withCallkeep.js';

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
                    "android:foregroundServiceType": "microphone",
                   
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
        // add permission to
        return config;
    })

};

const withFirebaseModularHeadersFix = (config: ExpoConfig) => {
    return withPodfile(config, async (config) => {
        if (config.modResults.contents.includes("use_modular_headers!")) {
            return config;
        }

        const platformLineMatcher = /(platform\s*:ios[^\n]*\n)/;
        if (platformLineMatcher.test(config.modResults.contents)) {
            config.modResults.contents = config.modResults.contents.replace(
                platformLineMatcher,
                `$1use_modular_headers!\n`
            );
        } else {
            config.modResults.contents = `use_modular_headers!\n${config.modResults.contents}`;
        }

        return config;
    });
};

// Add required Android permissions
const withAdditionalPermissions = (config: ExpoConfig) => {
    return withAndroidManifest(config, async (config) => {
        const manifest = config.modResults;

        if (!manifest.manifest["uses-permission"]) {
            manifest.manifest["uses-permission"] = [];
        }

        const permissions = [
            "android.permission.WRITE_EXTERNAL_STORAGE",
            "android.permission.CAPTURE_AUDIO_HOTWORD",
            "android.permission.CAPTURE_AUDIO_OUTPUT",
            "android.permission.CAPTURE_MEDIA_OUTPUT",
            "android.permission.CAPTURE_TUNER_AUDIO_INPUT",
            "android.permission.CAPTURE_VOICE_COMMUNICATION_OUTPUT",
            "android.permission.FOREGROUND_SERVICE_MICROPHONE",
        ];

        permissions.forEach((permission) => {
            if (!manifest.manifest["uses-permission"].some((item: any) => item.$["android:name"] === permission)) {
                manifest.manifest["uses-permission"].push({
                    $: {
                        "android:name": permission,
                    },
                });
            }
        });

        return config;
    });
};

// Compose multiple modifiers
const withVoipPush = (config: ExpoConfig) => {
  config = withIosAppDelegate(config);
  config = withFirebaseModularHeadersFix(config);
  config = withPushNotification(config);
  config = withCallkeep(config);
  config = withCallKeepFix(config);
  config = withAdditionalPermissions(config);
  return config;
};

export default createRunOncePlugin(withVoipPush, pak.name, pak.version);
