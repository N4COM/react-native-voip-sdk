"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withIosAppDelegate = void 0;
var config_plugins_1 = require("@expo/config-plugins");
var generateCode_1 = require("@expo/config-plugins/build/utils/generateCode");
var OBJC_TAG = "RNVoipPushNotificationAppDelegate";
var SWIFT_TAG = "RNVoipPushNotificationAppDelegateSwift";
var SWIFT_FIELD_TRIALS_TAG = "RNVoipWebRTCFieldTrialsSwift";
var applyObjcPatch = function (contents) {
    // method to invoke voip registration
    // I decided to use this as soon as the app starts to avoid js delay issues
    var methodInvocationBlock = "[RNVoipPushNotificationManager voipRegistration];";
    // https://regex101.com/r/mPgaq6/1
    var methodInvocationLineMatcher = /(?:self\.moduleName\s*=\s*@\"([^"]*)\";)|(?:(self\.|_)(\w+)\s?=\s?\[\[UMModuleRegistryAdapter alloc\])|(?:RCTBridge\s?\*\s?(\w+)\s?=\s?\[(\[RCTBridge alloc\]|self\.reactDelegate))/g;
    // https://regex101.com/r/nHrTa9/1/
    // if the above regex fails, we can use this one as a fallback:
    var fallbackInvocationLineMatcher = /-\s*\(BOOL\)\s*application:\s*\(UIApplication\s*\*\s*\)\s*\w+\s+didFinishLaunchingWithOptions:/g;
    if (!contents.includes("#import <PushKit/PushKit.h>")) {
        contents = contents.replace(/#import "AppDelegate.h"/g, "#import \"AppDelegate.h\"\n        #import <CommonCrypto/CommonDigest.h>\n#import <PushKit/PushKit.h>\n#import \"RNVoipPushNotificationManager.h\"\n#import \"RNCallKeep.h\"");
    }
    // Merging the method invocation block into the AppDelegate.m file
    // having problem with auth,  https://github.com/react-native-webrtc/react-native-callkeep/issues/735
    try {
        contents = (0, generateCode_1.mergeContents)({
            tag: OBJC_TAG,
            src: contents,
            anchor: methodInvocationLineMatcher,
            offset: 0,
            comment: "// ",
            newSrc: methodInvocationBlock,
        }).contents;
    }
    catch (e) {
        // Fallback to the other regex
        contents = (0, generateCode_1.mergeContents)({
            tag: OBJC_TAG,
            src: contents,
            anchor: fallbackInvocationLineMatcher,
            offset: 0,
            comment: "// ",
            newSrc: methodInvocationBlock,
        }).contents;
    }
    // Add PushKit delegate method to the bottom of the file
    // if other appDelegates are being implemented I will need to add this to the bottom of the file
    if (!contents.includes("/* Add PushKit delegate method */")) {
        contents = contents.replace(/@end/g, "/* Add PushKit delegate method */\n- (void)pushRegistry:(PKPushRegistry *)registry didUpdatePushCredentials:(PKPushCredentials *)credentials forType:(PKPushType)type\n{\n    [RNVoipPushNotificationManager didUpdatePushCredentials:credentials forType:(NSString *)type];\n}\n\n- (void)pushRegistry:(PKPushRegistry *)registry didInvalidatePushTokenForType:(PKPushType)type\n{\n\n}\n\n- (void)pushRegistry:(PKPushRegistry *)registry didReceiveIncomingPushWithPayload:(PKPushPayload *)payload forType:(PKPushType)type withCompletionHandler:(void (^)(void))completion\n{\n    NSDictionary *custom = payload.dictionaryPayload[@\"custom\"];\n    NSDictionary *extra = [custom isKindOfClass:[NSDictionary class]] ? custom[@\"a\"] : nil;\n    if (![extra isKindOfClass:[NSDictionary class]]) {\n        extra = nil;\n    }\n    NSString *originalUuid = payload.dictionaryPayload[@\"uuid\"] ?: extra[@\"uuid\"] ?: [[[NSUUID UUID] UUIDString] lowercaseString];\n    NSString *uuid = [self makeSureUUIDisUUID4:originalUuid];\n    NSString *callerNameRaw = payload.dictionaryPayload[@\"callerName\"] ?: extra[@\"callerName\"] ?: @\"Unknown\";\n    NSString *callerName = [NSString stringWithFormat:@\"%@ is Calling\", callerNameRaw];\n    NSString *handle = payload.dictionaryPayload[@\"handle\"] ?: extra[@\"handle\"] ?: callerNameRaw;\n    BOOL isVideo = [payload.dictionaryPayload[@\"isVideo\"] boolValue];\n    BOOL videoVal = NO;\n\n    if(isVideo) {\n      videoVal = YES;\n    }\n\n    [RNVoipPushNotificationManager addCompletionHandler:uuid completionHandler:completion];\n\n    [RNVoipPushNotificationManager didReceiveIncomingPushWithPayload:payload forType:(NSString *)type];\n\n    [RNCallKeep reportNewIncomingCall: uuid\n                               handle: handle\n                           handleType: @\"generic\"\n                             hasVideo: videoVal\n                  localizedCallerName: callerName\n                      supportsHolding: YES\n                         supportsDTMF: YES\n                     supportsGrouping: YES\n                   supportsUngrouping: YES\n                          fromPushKit: YES\n                              payload: nil\n                withCompletionHandler: completion];\n}\n// Helper function to convert string to MD5\n- (NSString *)md5:(NSString *)string {\n    const char *cStr = [string UTF8String];\n    unsigned char digest[16];\n    CC_MD5(cStr, strlen(cStr), digest);\n    \n    NSMutableString *output = [NSMutableString stringWithCapacity:CC_MD5_DIGEST_LENGTH * 2];\n    for(int i = 0; i < CC_MD5_DIGEST_LENGTH; i++) {\n        [output appendFormat:@\"%02x\", digest[i]];\n    }\n    return output;\n}\n\n- (NSString *)makeSureUUIDisUUID4:(NSString *)uuid {\n    if (uuid.length == 32) {\n        return uuid;\n    }\n    \n    NSString *hashHex = [self md5:uuid];\n    \n    NSString *uuid4 = [NSString stringWithFormat:@\"%@-%@-4%@-a%@-%@\",\n                       [hashHex substringWithRange:NSMakeRange(0, 8)],\n                       [hashHex substringWithRange:NSMakeRange(8, 4)],\n                       [hashHex substringWithRange:NSMakeRange(12, 3)],\n                       [hashHex substringWithRange:NSMakeRange(15, 3)],\n                       [hashHex substringWithRange:NSMakeRange(18, 12)]];\n    \n    return [uuid4 lowercaseString];\n}\n\n@end");
    }
    return contents;
};
var ensureSwiftImports = function (contents) {
    var missingImports = [
        "import PushKit",
        "import CryptoKit",
        "import ObjectiveC.runtime",
        // Both are needed by the WebRTC field trials block below. WebRTC supplies
        // the kRTCFieldTrial* constants and react_native_webrtc supplies
        // WebRTCModuleOptions; react-native-webrtc is a peer dependency, so both
        // modules are always present.
        "import WebRTC",
        "import react_native_webrtc",
    ].filter(function (swiftImport) { return !contents.includes(swiftImport); });
    if (!missingImports.length) {
        return contents;
    }
    var importBlockMatcher = /((?:import\s+[A-Za-z0-9_\.]+\s*\n)+)/m;
    if (!importBlockMatcher.test(contents)) {
        return "".concat(missingImports.join("\n"), "\n\n").concat(contents);
    }
    return contents.replace(importBlockMatcher, "$1".concat(missingImports.join("\n"), "\n"));
};
var addSwiftWebRTCFieldTrials = function (contents) {
    var fieldTrialsBlock = "// CallKit deactivates the app's audio session to put a call on hold. WebRTC's\n// default interruption-end path then calls UpdateAudioUnit() on a voice\n// processing unit that is still in the started state, so the unit is never\n// rebuilt and the call comes back silent in both directions on unhold: mic\n// capture stops producing samples while inbound RTP keeps arriving unrendered.\n// Forcing a route change (toggling the speaker) is what used to revive it.\n//\n// The WebRTC-Audio-iOS-Holding field trial makes\n// AudioDeviceIOS::HandleInterruptionEnd() stop and uninitialize the audio unit\n// and re-derive its buffers before updating it, so capture and playout actually\n// restart. Stock react-native-webrtc leaves this trial off and only enables the\n// NWPathMonitor one.\n//\n// kRTCFieldTrialUseNWPathMonitor is repeated on purpose: supplying a\n// fieldTrials dictionary replaces WebRTCModule's own default, and dropping it\n// would reintroduce the dual-SIM connectivity bug (crbug.com/webrtc/10966).\n//\n// This has to run before anything touches WebRTC. WebRTCModule reads this\n// singleton in its own -init and calls RTCInitFieldTrialDictionary() there, so\n// it must stay ahead of startReactNative().\nlet n4comFieldTrials: [AnyHashable: Any] = [\n  kRTCFieldTrialUseNWPathMonitor: kRTCFieldTrialEnabledValue,\n  \"WebRTC-Audio-iOS-Holding\": kRTCFieldTrialEnabledValue,\n]\nlet n4comWebRTCOptions = WebRTCModuleOptions.sharedInstance()\nn4comWebRTCOptions.fieldTrials = n4comFieldTrials";
    // Single-line anchors only: mergeContents matches line by line, so a regex
    // spanning the multi-line didFinishLaunchingWithOptions signature can never
    // match. offset 0 inserts above the matched line, which is what keeps this
    // ahead of startReactNative(). Ordered earliest-first; every fallback is
    // still before React Native (and therefore WebRTCModule) is created.
    var anchors = [
        /let\s+delegate\s*=\s*ReactNativeDelegate\s*\(\s*\)/,
        /bindReactNativeFactory\s*\(/,
        /factory\.startReactNative\s*\(/,
    ];
    for (var _i = 0, anchors_1 = anchors; _i < anchors_1.length; _i++) {
        var anchor = anchors_1[_i];
        try {
            return (0, generateCode_1.mergeContents)({
                tag: SWIFT_FIELD_TRIALS_TAG,
                src: contents,
                anchor: anchor,
                offset: 0,
                comment: "// ",
                newSrc: fieldTrialsBlock,
            }).contents;
        }
        catch (e) {
            // Anchor absent from this AppDelegate template; try the next one.
        }
    }
    // Deliberately fatal rather than silent: inserting this too late is
    // indistinguishable from not inserting it at all, and the symptom (audio lost
    // after the first hold) only shows up in manual testing on a device.
    throw new Error("react-native-voip-sdk: found no place in AppDelegate.swift to set the " +
        "WebRTC field trials before React Native starts. Audio is lost when a " +
        "CallKit call is taken off hold without them.");
};
var addSwiftDidFinishLaunchInvocation = function (contents) {
    var methodInvocationBlock = "self.n4comRegisterVoipPush()";
    var methodInvocationLineMatcher = /return\s+super\.application\(\s*application,\s*didFinishLaunchingWithOptions:\s*[A-Za-z_][A-Za-z0-9_]*\s*\)/g;
    var fallbackInvocationLineMatcher = /self\.initialProps\s*=\s*\[:\]/g;
    try {
        return (0, generateCode_1.mergeContents)({
            tag: SWIFT_TAG,
            src: contents,
            anchor: methodInvocationLineMatcher,
            offset: 0,
            comment: "// ",
            newSrc: methodInvocationBlock,
        }).contents;
    }
    catch (e) {
        return (0, generateCode_1.mergeContents)({
            tag: SWIFT_TAG,
            src: contents,
            anchor: fallbackInvocationLineMatcher,
            offset: 1,
            comment: "// ",
            newSrc: methodInvocationBlock,
        }).contents;
    }
};
var addSwiftPushKitExtension = function (contents) {
    if (contents.includes("// MARK: - RNVoipPushNotificationAppDelegateSwift")) {
        return contents;
    }
    var classNameMatch = contents.match(/(?:public|open|internal|private|fileprivate)?\s*class\s+([A-Za-z_][A-Za-z0-9_]*)\s*:/m);
    var appDelegateClassName = (classNameMatch === null || classNameMatch === void 0 ? void 0 : classNameMatch[1]) || "AppDelegate";
    var swiftExtensionBlock = "\n\n// MARK: - RNVoipPushNotificationAppDelegateSwift\nprivate var n4comVoipRegistry: PKPushRegistry?\n\nextension ".concat(appDelegateClassName, ": PKPushRegistryDelegate {\n  func n4comRegisterVoipPush() {\n    let voipRegistry = PKPushRegistry(queue: DispatchQueue.main)\n    voipRegistry.delegate = self\n    voipRegistry.desiredPushTypes = [.voIP]\n    n4comVoipRegistry = voipRegistry\n\n    self.n4comPerformClassSelector(\n      className: \"RNVoipPushNotificationManager\",\n      selectorName: \"voipRegistration\"\n    )\n  }\n\n  public func pushRegistry(_ registry: PKPushRegistry, didUpdate pushCredentials: PKPushCredentials, for type: PKPushType) {\n    self.n4comPerformClassSelector(\n      className: \"RNVoipPushNotificationManager\",\n      selectorName: \"didUpdatePushCredentials:forType:\",\n      with: pushCredentials,\n      and: type.rawValue as NSString\n    )\n  }\n\n  public func pushRegistry(_ registry: PKPushRegistry, didInvalidatePushTokenFor type: PKPushType) {\n  }\n\n  public func pushRegistry(\n    _ registry: PKPushRegistry,\n    didReceiveIncomingPushWith payload: PKPushPayload,\n    for type: PKPushType,\n    completion: @escaping () -> Void\n  ) {\n    // OneSignal puts additional data under custom.a, not at the payload root.\n    let extra = (payload.dictionaryPayload[\"custom\"] as? [AnyHashable: Any])?[\"a\"] as? [AnyHashable: Any]\n    let originalUuid = (payload.dictionaryPayload[\"uuid\"] as? String)\n      ?? (extra?[\"uuid\"] as? String)\n      ?? UUID().uuidString.lowercased()\n    let uuid = self.n4comMakeSureUUIDisUUID4(originalUuid)\n    let callerNameRaw = (payload.dictionaryPayload[\"callerName\"] as? String)\n      ?? (extra?[\"callerName\"] as? String)\n      ?? \"Unknown\"\n    let callerName = \"\\(callerNameRaw) is Calling\"\n    let handle = (payload.dictionaryPayload[\"handle\"] as? String)\n      ?? (extra?[\"handle\"] as? String)\n      ?? callerNameRaw\n    let isVideo = payload.dictionaryPayload[\"isVideo\"] as? Bool ?? false\n\n    self.n4comPerformClassSelector(\n      className: \"RNVoipPushNotificationManager\",\n      selectorName: \"didReceiveIncomingPushWithPayload:forType:\",\n      with: payload,\n      and: type.rawValue as NSString\n    )\n\n    self.n4comReportIncomingCall(\n      uuid: uuid,\n      handle: handle,\n      callerName: callerName,\n      hasVideo: isVideo,\n      payload: payload.dictionaryPayload as NSDictionary?,\n      completion: completion\n    )\n  }\n\n  private func n4comPerformClassSelector(\n    className: String,\n    selectorName: String,\n    with firstArgument: AnyObject? = nil,\n    and secondArgument: AnyObject? = nil\n  ) {\n    guard let cls: AnyObject = NSClassFromString(className) else {\n      return\n    }\n\n    let selector = NSSelectorFromString(selectorName)\n\n    if firstArgument == nil {\n      _ = cls.perform(selector)\n      return\n    }\n\n    _ = cls.perform(selector, with: firstArgument, with: secondArgument)\n  }\n\n  private func n4comReportIncomingCall(\n    uuid: String,\n    handle: String,\n    callerName: String,\n    hasVideo: Bool,\n    payload: NSDictionary?,\n    completion: @escaping () -> Void\n  ) {\n    let selector = NSSelectorFromString(\"reportNewIncomingCall:handle:handleType:hasVideo:localizedCallerName:supportsHolding:supportsDTMF:supportsGrouping:supportsUngrouping:fromPushKit:payload:withCompletionHandler:\")\n\n    guard\n      let callKeepClass: AnyClass = NSClassFromString(\"RNCallKeep\"),\n      let method = class_getClassMethod(callKeepClass, selector)\n    else {\n      completion()\n      return\n    }\n\n    typealias ReportNewIncomingCallFunction = @convention(c) (\n      AnyClass,\n      Selector,\n      NSString,\n      NSString,\n      NSString,\n      Bool,\n      NSString,\n      Bool,\n      Bool,\n      Bool,\n      Bool,\n      Bool,\n      NSDictionary?,\n      (@convention(block) () -> Void)?\n    ) -> Void\n\n    let implementation = method_getImplementation(method)\n    let function = unsafeBitCast(implementation, to: ReportNewIncomingCallFunction.self)\n\n    function(\n      callKeepClass,\n      selector,\n      uuid as NSString,\n      handle as NSString,\n      \"generic\" as NSString,\n      hasVideo,\n      callerName as NSString,\n      true,\n      true,\n      true,\n      true,\n      true,\n      payload,\n      completion\n    )\n  }\n\n  private func n4comMakeSureUUIDisUUID4(_ value: String) -> String {\n    if value.count == 32 {\n      return value.lowercased()\n    }\n\n    let digest = Insecure.MD5.hash(data: Data(value.utf8))\n    let hashHex = digest.map { String(format: \"%02x\", $0) }.joined()\n\n    let first = hashHex.prefix(8)\n    let second = hashHex.dropFirst(8).prefix(4)\n    let third = hashHex.dropFirst(12).prefix(3)\n    let fourth = hashHex.dropFirst(15).prefix(3)\n    let fifth = hashHex.dropFirst(18).prefix(12)\n\n    return \"\\(first)-\\(second)-4\\(third)-a\\(fourth)-\\(fifth)\".lowercased()\n  }\n}\n");
    return "".concat(contents.trimEnd(), "\n").concat(swiftExtensionBlock, "\n");
};
var applySwiftPatch = function (contents) {
    contents = ensureSwiftImports(contents);
    contents = addSwiftWebRTCFieldTrials(contents);
    contents = addSwiftDidFinishLaunchInvocation(contents);
    contents = addSwiftPushKitExtension(contents);
    return contents;
};
var withIosAppDelegate = function (config) {
    return (0, config_plugins_1.withAppDelegate)(config, function (cfg) {
        var modResults = cfg.modResults;
        if (["objc", "objcpp"].includes(modResults.language)) {
            modResults.contents = applyObjcPatch(modResults.contents);
            return cfg;
        }
        if (modResults.language === "swift") {
            modResults.contents = applySwiftPatch(modResults.contents);
            return cfg;
        }
        throw new Error("Unsupported iOS AppDelegate language: ".concat(modResults.language));
        return cfg;
    });
};
exports.withIosAppDelegate = withIosAppDelegate;
