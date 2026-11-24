# iOS: WebRTC field trials and CallKit hold

The iOS config plugin injects a block into `AppDelegate.swift` that enables two
WebRTC field trials before React Native starts. Without it, **audio is lost in
both directions the first time a call is taken off hold.**

This document explains why the block exists, why it looks the way it does, and
what to check when upgrading Expo or `react-native-webrtc`.

Relevant code: [`plugin/src/ios/appDelegate.ts`](../plugin/src/ios/appDelegate.ts),
function `addSwiftWebRTCFieldTrials`.

---

## The symptom

1. Answer or place a call — audio is fine.
2. Put the call on hold (CallKit UI, or a second incoming call).
3. Take it off hold.
4. The call is connected and the UI looks correct, but **neither side hears
   anything** for the rest of the call.

Two details that make this recognisable:

- Toggling the speaker restores audio. This is the giveaway — it forces an audio
  route change, which rebuilds the audio unit through a different code path.
- On the sending side, the local media source's `totalAudioEnergy` freezes at
  the value it held when the call went on hold, while inbound RTP keeps
  arriving. So it is not a signalling or network fault: capture has stopped
  producing samples and playout is not rendering.

## Root cause

CallKit deactivates the app's `AVAudioSession` to put a call on hold, which
WebRTC sees as an audio session interruption. On interruption end, WebRTC's
default path calls `UpdateAudioUnit()` on a voice-processing audio unit that is
still in the *started* state. Because the unit reports itself as running, the
update is effectively a no-op: the unit is never torn down and rebuilt, so
capture and playout never resume.

The `WebRTC-Audio-iOS-Holding` field trial changes
`AudioDeviceIOS::HandleInterruptionEnd()` to stop and uninitialize the audio
unit and re-derive its buffer sizes before updating it, so the unit really is
rebuilt and audio restarts.

Both code paths are already compiled into the WebRTC binary. The trial only
selects between them at runtime — see [Field trials, briefly](#field-trials-briefly).

## Why this regressed

The app previously used the `nimbleape` fork of `react-native-webrtc`, which
hardcoded this trial on. Moving to stock `react-native-webrtc` (124.0.7) dropped
it, because stock only enables the NWPathMonitor trial. Nothing failed to
compile and nothing logged a warning — the only symptom was silence after hold.

That silent failure mode is the main reason the fix lives in this plugin rather
than in a fork. See [Why a config plugin and not a fork](#why-a-config-plugin-and-not-a-fork).

---

## Field trials, briefly

"Field trial" is Chrome's name for an A/B test switch, inherited by WebRTC when
it was extracted into a standalone library. Both branches ship in the binary and
one is chosen at runtime by name:

```cpp
if (field_trial::IsEnabled("WebRTC-Audio-iOS-Holding")) { /* A */ } else { /* B */ }
```

Consequences worth knowing:

- Nothing is downloaded or added. We are selecting an already-compiled branch.
- It is **global process state**, applied once via
  `RTCInitFieldTrialDictionary()`, and fixed for the life of the process.
- Being default-off, it is the less-travelled path. It is not "a correct setting
  someone forgot" — Google left it off, so it gets less real-world coverage.
  `react-native-webrtc` issue #632 discusses this trial alongside crash concerns
  around interruption-restart. We have not reproduced a crash, but unusual
  interruptions (an inbound GSM call mid-VoIP-call, Siri, alarms) are the place
  to look if one appears.

---

## The two trials we set

```swift
let n4comFieldTrials: [AnyHashable: Any] = [
  kRTCFieldTrialUseNWPathMonitor: kRTCFieldTrialEnabledValue,
  "WebRTC-Audio-iOS-Holding": kRTCFieldTrialEnabledValue,
]
let n4comWebRTCOptions = WebRTCModuleOptions.sharedInstance()
n4comWebRTCOptions.fieldTrials = n4comFieldTrials
```

### Why `kRTCFieldTrialUseNWPathMonitor` is repeated — do not remove it

**`fieldTrials` replaces the default; it does not merge into it.** From
`node_modules/react-native-webrtc/ios/RCTWebRTC/WebRTCModule.m`, in
`WebRTCModule.init`:

```objc
NSDictionary *fieldTrials = options.fieldTrials;

// Initialize field trials.
if (fieldTrials == nil) {
    // Fix for dual-sim connectivity:
    // https://bugs.chromium.org/p/webrtc/issues/detail?id=10966
    fieldTrials = @{kRTCFieldTrialUseNWPathMonitor : kRTCFieldTrialEnabledValue};
}
RTCInitFieldTrialDictionary(fieldTrials);
```

There is no merge step anywhere. The dictionary we assign is passed to
`RTCInitFieldTrialDictionary` verbatim, and the default is never consulted. So
setting only the holding trial would silently **disable** NWPathMonitor and
reintroduce the dual-SIM connectivity bug
([webrtc:10966](https://bugs.chromium.org/p/webrtc/issues/detail?id=10966)):
calls failing to establish or recover on dual-SIM/eSIM devices, because the
legacy BSD-route-socket monitor misreads interface state when two cellular
interfaces exist.

That would be a bad trade — a bug visible only on dual-SIM hardware, presenting
as "calls sometimes don't connect", with nothing pointing back at this change.

**If you add a third trial, keep both existing keys in the literal.**

Note also that the guard tests `== nil`, so an empty dictionary (`[:]`)
suppresses the default just as effectively as a populated one. The only way back
to stock behaviour is leaving `fieldTrials` unset.

### Why one is a constant and one is a string literal

`WebRTC.framework`'s `RTCFieldTrials.h` exports constants for only a handful of
trials — `kRTCFieldTrialUseNWPathMonitor`, `kRTCFieldTrialH264HighProfileKey`,
and a few others. `WebRTC-Audio-iOS-Holding` is not among them, so it has to be
passed as a raw string. A typo in that string fails silently: unknown trial names
are ignored, and you are back to silent audio after hold.

### Why it must run before `startReactNative()`

`WebRTCModule` reads `WebRTCModuleOptions.sharedInstance()` and calls
`RTCInitFieldTrialDictionary()` in its **own `-init`**, which the React Native
bridge triggers when JS first requires the module. `WebRTCModuleOptions.init`
defaults `fieldTrials` to `nil`, so whatever we have assigned by that moment is
what takes effect — and once `RTCInitFieldTrialDictionary` has run, it is fixed
for the process.

That is the entire reason this sits at the top of
`didFinishLaunchingWithOptions` rather than somewhere more natural like call
setup. Setting it later is silently useless.

---

## How the plugin injects it

`addSwiftWebRTCFieldTrials` uses Expo's `mergeContents`, tagged
`RNVoipWebRTCFieldTrialsSwift`, plus `import WebRTC` and
`import react_native_webrtc` added by `ensureSwiftImports`.

Two constraints shaped the implementation:

**`mergeContents` matches line by line.** Its `addLines` helper does
`lines.findIndex(line => line.match(find))`, so an anchor regex cannot span the
multi-line `didFinishLaunchingWithOptions` signature. Anchors must match a
single line. An `offset` of `0` inserts *above* the matched line.

**Landing too late is indistinguishable from not inserting at all.** So the
anchors are tried earliest-first, and every fallback is still ahead of
`WebRTCModule` being created:

1. `let delegate = ReactNativeDelegate()`
2. `bindReactNativeFactory(`
3. `factory.startReactNative(`

If all three miss, the plugin **throws** rather than guessing. A failed
`prebuild` is recoverable; a silently misplaced block ships a bug that only
manual device testing catches.

The `mergeContents` tag makes the block idempotent — re-running `prebuild`
replaces it rather than duplicating it.

### Imports

`react-native-webrtc` is a peer dependency (`>=124.0.0`), so both modules are
always present and no `#if canImport` guard is needed.

We import the `react_native_webrtc` module rather than reaching for the
bridging header, and that works today. If a future version's umbrella header
starts failing to build as a clang module — it pulls in `WebRTCModule.h` and
`RCTConvert+WebRTC.h`, which drag in React bridge headers — the fallback is to
import the single header instead, which needs only Foundation and WebRTC:

```objc
// in the app's -Bridging-Header.h
#import <react-native-webrtc/WebRTCModuleOptions.h>
```

### Known gap: Objective-C AppDelegate

Only the Swift path is patched. `applyObjcPatch` — used for older,
Objective-C AppDelegate templates — does **not** set the field trials. Expo SDK
54 generates a Swift AppDelegate, so this does not affect current consumers, but
an app on an ObjC template would still lose audio after hold.

---

## Why a config plugin and not a fork

`react-native-webrtc`'s podspec depends on `JitsiWebRTC ~> 124.0.0`, which
supplies `WebRTC.xcframework` as a **prebuilt binary**. So `react-native-webrtc`
is only the ObjC/JS wrapper, and a fork would be thin — roughly a four-line
change to the `if (fieldTrials == nil)` default, with no need to build libwebrtc.

We chose the plugin anyway:

- **No capability difference.** The C++ that reads the trial is inside the
  binary, which a fork does not touch. Both approaches flip the same runtime
  flag through the same `RTCInitFieldTrialDictionary` call.
- **A fork is the weaker mechanism.** It would change a *default* guarded by
  `if (fieldTrials == nil)`, which is bypassed the moment anything assigns
  `fieldTrials`. Our explicit assignment always wins, because it is the value
  that guard checks for.
- **Failure modes are asymmetric.** The plugin fails loudly at build time: a
  missed anchor throws during `prebuild`, a renamed module is a Swift compile
  error. A fork fails silently in production — bump the dependency, forget to
  rebase, everything compiles, and audio breaks only after someone holds a call.
  This project has already been burned by exactly that.
- **Cost of ownership.** A fork puts us back on the libwebrtc milestone
  treadmill (rebase, re-tag, re-test per release), turns the peer dependency and
  the app's exact `124.0.7` pin into git refs, and loses `npm outdated` and
  version-matched upstream issue reports.

**Revisit this if we need behaviour no field trial exposes** — patching
`AudioDeviceIOS` itself, adding a native API, or carrying an upstream fix that
is not a runtime toggle. A field trial is a supported runtime switch, and
forking to flip one is the wrong tool. The counter-argument, for the record: a
fork would also cover bare React Native consumers that never run Expo config
plugins. That is hypothetical while this SDK ships a config plugin.

---

## Maintenance

### After upgrading Expo SDK

The anchors depend on the generated `AppDelegate.swift`. `prebuild` will throw if
all three miss, so a clean `prebuild` is the check. Confirm the block still
lands **above** `startReactNative`:

```bash
npx expo prebuild -p ios --clean
grep -n -A3 "RNVoipWebRTCFieldTrialsSwift" ios/*/AppDelegate.swift
```

`ios/` is generated and typically gitignored, so a hand-edit there is lost on the
next `prebuild`. Changes belong in this plugin.

### After upgrading `react-native-webrtc`

Check that `WebRTCModule.init` still reads
`WebRTCModuleOptions.sharedInstance().fieldTrials` and still **replaces** rather
than merges. If upstream ever merges instead, the repeated
`kRTCFieldTrialUseNWPathMonitor` becomes redundant (harmless, but the comment
should be corrected). Also confirm `WebRTC-Audio-iOS-Holding` still exists —
trials do get retired once an experiment concludes, and an unknown name is
ignored silently.

### Verifying on a device

This cannot be verified in the simulator; it needs CallKit hold on real
hardware. The regression test is the symptom above: place a call, hold, unhold,
confirm audio both ways.

To see the mechanism directly, temporarily add to the AppDelegate block:

```swift
n4comWebRTCOptions.loggingSeverity = .info
```

That surfaces `AudioDeviceIOS`'s own `RTCLog` output around interruption
handling, including the interruption-end and audio-unit-update lines, so you can
see whether the holding path ran on unhold.

To check ordering, log a line right after the assignment. `WebRTCModule.init`
emits `Using video encoder factory:` via `RCTLogInfo` a few statements after
`RTCInitFieldTrialDictionary` (`WebRTCModule.m:69`), so your line must appear
**before** that one in the console. If it appears after, the trials were set too
late and are having no effect.

Both are diagnostics only — do not leave them in the plugin.
