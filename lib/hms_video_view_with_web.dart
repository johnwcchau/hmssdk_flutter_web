// Dart imports:
import 'dart:convert';
import 'dart:io' show Platform;

// Flutter imports:
import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show StandardMessageCodec;

// Project imports:
import 'package:hmssdk_flutter/hmssdk_flutter.dart';
import 'package:flutter/foundation.dart' show kIsWeb;

import 'stub.dart' if (dart.library.js) 'implementation.dart';

///100ms HMSVideoView
///
///HMSVideoView used to render video in ios and android devices
///
/// To use,import package:`hmssdk_flutter/ui/meeting/hms_video_view.dart`.
///
/// just pass the videotracks of local or remote peer and internally it passes [peer_id], [is_local] and [track_id] to specific views.
///
/// if you want to pass height and width you can pass as a map.
class HMSVideoView extends StatefulWidget {
  /// [HMSVideoView] will render video using trackId from HMSTrack
  final HMSVideoTrack track;
  final bool matchParent;

  final ScaleType scaleType;
  final bool setMirror;

  HMSVideoView(
      {Key? key,
      required this.track,
      this.setMirror = false,
      this.matchParent = true,
      this.scaleType = ScaleType.SCALE_ASPECT_FIT})
      : super(key: key ?? ObjectKey(track.trackId));

  @override
  State<StatefulWidget> createState() => HMSVideoViewState();
}

class HMSVideoViewState extends State<HMSVideoView> {
  HMSVideoViewState();

  int? _id;
  void onPlatformViewCreated(int id) {}

  @override
  void dispose() {
    if (kIsWeb && _id != null) {
      final view = videoViews.remove(_id)!;
      hmssdkjsVideoView(
          view,
          jsonEncode({
            "type": "dispose",
            "track": widget.track.trackId,
          }));
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (kIsWeb) {
      final mirror =
          widget.track.source != "REGULAR" ? false : widget.setMirror;
      final view = HtmlElementView(
        viewType: 'HMSVideoWebView',
        onPlatformViewCreated: (id) {
          _id = id;
          final view = videoViews[id]!;
          hmssdkjsVideoView(
              view,
              jsonEncode({
                "type": "attach",
                "track": widget.track.trackId,
                // "setMirror":
                //     widget.track.source != "REGULAR" ? false : widget.setMirror,
                "matchParent": widget.matchParent,
                "scaleType": widget.scaleType.name,
              }));
        },
      );
      if (mirror) return Transform.scale(scaleX: -1, child: view);
      return view;
    }

    ///AndroidView for android it uses surfaceRenderer provided internally by webrtc.
    if (Platform.isAndroid) {
      return AndroidView(
        viewType: 'HMSVideoView',
        onPlatformViewCreated: onPlatformViewCreated,
        creationParamsCodec: const StandardMessageCodec(),
        creationParams: {
          'track_id': widget.track.trackId,
          'set_mirror':
              widget.track.source != "REGULAR" ? false : widget.setMirror,
          'scale_type': widget.scaleType.value,
          'match_parent': widget.matchParent
        },
        gestureRecognizers: const {},
      );
    } else if (Platform.isIOS) {
      ///UiKitView for ios it uses VideoView provided by 100ms ios_sdk internally.
      return UiKitView(
        viewType: 'HMSFlutterPlatformView',
        onPlatformViewCreated: onPlatformViewCreated,
        creationParamsCodec: const StandardMessageCodec(),
        creationParams: {
          'track_id': widget.track.trackId,
          'set_mirror':
              widget.track.source != "REGULAR" ? false : widget.setMirror,
          'scale_type': widget.scaleType.value,
          'match_parent': widget.matchParent
        },
        gestureRecognizers: const {},
      );
    } else {
      throw UnimplementedError(
          'Video View is not implemented for this platform ${Platform.localHostname}');
    }
  }
}
