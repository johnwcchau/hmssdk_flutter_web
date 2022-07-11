# hmssdk_flutter_web

hmssdk_flutter web 3rd-party implementation

## How to use
- Simply add this into `pubspec.yaml`
  
  ```yaml
  dependencies:
    hmssdk_flutter_web: ^0.0.3
  ```

- Or do it manually

  1. Clone this repo and place it in some directory you like (`<<DIR_TO_PLUGIN>>`)

  2. *Optional*: You may want to rebuild/update the javascript part using **(may break this plugin due to version difference)**
    ```bash
    cd webpack
    npm install
    # # In case you had never used webpack
    # # see https://webpack.js.org/
    # npm install --global webpack
    # npm install --global webpack-cli
    webpack
    ```

  3. Then in your projects `pubspec.yaml`

    ```yaml
    dependencies:
      hmssdk_flutter_web:
        path: <<DIR_TO_PLUGIN>>
    ```

**Note:** Instead of using `HMSVideoView` from `package:hmssdk_flutter/hmssdk_flutter.dart`, use `HMSVideoView` from this package (my `HMSVideoView` simply adds javascript parts into original file so it will also work for Android/iOS)
  ```dart
  import 'package:hmssdk_flutter_web/hmssdk_flutter_web.dart' as hmsweb;

  // and in your build function ...
  return hmsweb.HMSVideoView(
      matchParent: true,
      scaleType: ScaleType.SCALE_ASPECT_FIT,
      track: track as HMSVideoTrack)

  ```

## How this works

This simply bridges high-level `hms-video-store` javascript library into flutter-web.

- `lib/hmssdk_flutter_web.dart`
  
  is the entry point, redirects imports based on platform (dart.library.js)
- `lib/implementation.dart`
  
  is the main implementation, register this plugin and connects to native javascript parts
- `webpack/*` 
  
  is the js side `hms-video-store` package with the *magic* code inside `hmssdk.js`
- `assets/hmssdk_flutter_web.js`
  
  is the compiled/minimized js package, at plugin registration time this file will be automatically imported as a `<script>` into `<head>` of `index.html`

## Works to do
- This plugin uses high-level `hms-video-store`, which makes every call from dart-side very 'bouncy' 
  
  (low level js api -> argument remapping -> hms-video-store -> remapping by me again -> json -> pass to dart -> json-decode into map -> hmssdk-flutter)
  
  - It would be better if developers give me access to lower level js api, which i assume have similar parameter structure as dart-side?

- It would also be better if the original plugin get converted into Federated plugin and get rid of channels

- So far build / room / video / screen share api works, but I didn't check/debug other parts as I do not use them for my (client's) project, debugging them is not hard, but time wasting as you are going to find the parameter dict/map structure in the original libraries (both dart and js) and do conversion between them

  - Most conversion are done in `webpack/hmssdk.js`, e.g. `function jsRoomToRoom()`

- I am passing all parameters between js and dart using json, so not ideal, but I don't want to spend time to create dart @JS classes simply for parameter passing, maybe there are some better methods?