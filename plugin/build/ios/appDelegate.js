"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withIosAppDelegate = void 0;
var config_plugins_1 = require("@expo/config-plugins");
var generateCode_1 = require("@expo/config-plugins/build/utils/generateCode");
var withIosAppDelegate = function (config) {
    return (0, config_plugins_1.withAppDelegate)(config, function (cfg) {
        var modResults = cfg.modResults;
        // method to invoke voip registration
        // I decided to use this as soon as the app starts to avoid js delay issues
        var methodInvocationBlock = "[RNVoipPushNotificationManager voipRegistration];";
        // https://regex101.com/r/mPgaq6/1
        var methodInvocationLineMatcher = /(?:self\.moduleName\s*=\s*@\"([^"]*)\";)|(?:(self\.|_)(\w+)\s?=\s?\[\[UMModuleRegistryAdapter alloc\])|(?:RCTBridge\s?\*\s?(\w+)\s?=\s?\[(\[RCTBridge alloc\]|self\.reactDelegate))/g;
        // https://regex101.com/r/nHrTa9/1/
        // if the above regex fails, we can use this one as a fallback:
        var fallbackInvocationLineMatcher = /-\s*\(BOOL\)\s*application:\s*\(UIApplication\s*\*\s*\)\s*\w+\s+didFinishLaunchingWithOptions:/g;
        if (!modResults.contents.includes("#import <PushKit/PushKit.h>")) {
            modResults.contents = modResults.contents.replace(/#import "AppDelegate.h"/g, "#import \"AppDelegate.h\"\n#import <PushKit/PushKit.h>\n#import \"RNVoipPushNotificationManager.h\"\n#import \"RNCallKeep.h\"");
        }
        // Merging the method invocation block into the AppDelegate.m file
        // having problem with auth,  https://github.com/react-native-webrtc/react-native-callkeep/issues/735
        try {
            modResults.contents = (0, generateCode_1.mergeContents)({
                tag: "RNVoipPushNotificationAppDelegate",
                src: modResults.contents,
                anchor: methodInvocationLineMatcher,
                offset: 0,
                comment: "// ",
                newSrc: methodInvocationBlock,
            }).contents;
        }
        catch (e) {
            // Fallback to the other regex
            modResults.contents = (0, generateCode_1.mergeContents)({
                tag: "RNVoipPushNotificationAppDelegate",
                src: modResults.contents,
                anchor: fallbackInvocationLineMatcher,
                offset: 0,
                comment: "// ",
                newSrc: methodInvocationBlock,
            }).contents;
        }
        // Add PushKit delegate method to the bottom of the file
        // if other appDelegates are being implemented I will need to add this to the bottom of the file
        if (!modResults.contents.includes("/* Add PushKit delegate method */")) {
            modResults.contents = modResults.contents.replace(/@end/g, "/* Add PushKit delegate method */\n- (void)pushRegistry:(PKPushRegistry *)registry didUpdatePushCredentials:(PKPushCredentials *)credentials forType:(PKPushType)type\n{\n    [RNVoipPushNotificationManager didUpdatePushCredentials:credentials forType:(NSString *)type];\n}\n\n- (void)pushRegistry:(PKPushRegistry *)registry didInvalidatePushTokenForType:(PKPushType)type\n{\n\n}\n\n- (void)pushRegistry:(PKPushRegistry *)registry didReceiveIncomingPushWithPayload:(PKPushPayload *)payload forType:(PKPushType)type withCompletionHandler:(void (^)(void))completion\n{\n    NSString *uuid = payload.dictionaryPayload[@\"uuid\"];\n    NSString *callerName = [NSString stringWithFormat:@\"%@ is Calling\", payload.dictionaryPayload[@\"callerName\"]];\n    NSString *handle = payload.dictionaryPayload[@\"handle\"];\n    BOOL isVideo = [payload.dictionaryPayload[@\"isVideo\"] boolValue];\n    BOOL videoVal = NO;\n\n    if(isVideo) {\n      videoVal = YES;\n    }\n\n    [RNVoipPushNotificationManager addCompletionHandler:uuid completionHandler:completion];\n\n    [RNVoipPushNotificationManager didReceiveIncomingPushWithPayload:payload forType:(NSString *)type];\n\n    [RNCallKeep reportNewIncomingCall: uuid\n                               handle: handle\n                           handleType: @\"generic\"\n                             hasVideo: videoVal\n                  localizedCallerName: callerName\n                      supportsHolding: YES\n                         supportsDTMF: YES\n                     supportsGrouping: YES\n                   supportsUngrouping: YES\n                          fromPushKit: YES\n                              payload: nil\n                withCompletionHandler: completion];\n}\n\n@end");
        }
        return cfg;
    });
};
exports.withIosAppDelegate = withIosAppDelegate;
