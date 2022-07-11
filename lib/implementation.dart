import 'dart:async';
import 'dart:convert';
// In order to *not* need this ignore, consider extracting the "web" version
// of your plugin as a separate package, instead of inlining it in the same
// package as the core of your plugin.
// ignore: avoid_web_libraries_in_flutter
import 'dart:html' as html;
import 'dart:ui' as ui;
import 'dart:js_util';
import 'package:flutter/services.dart';
import 'package:flutter_web_plugins/flutter_web_plugins.dart';
import 'package:js/js.dart';

import 'plugin_event_channel.dart' as mypec;

Map<int, html.VideoElement> _videoViews = {};
Map get videoViews => _videoViews;

@JS()
external hmssdkjsHandleMethodCall(String method, dynamic arguments);
@JS()
external hmssdkjsSetNotificationsHandler(Function(String notiJson) handler);
@JS()
external hmssdkjsVideoView(html.VideoElement video, String argsJson);

/// A web implementation of the HmssdkFlutterWeb plugin.
class HmssdkFlutterWeb {
  // ignore: unused_field
  static late mypec.PluginEventChannel _meetingEventChannel;
  // ignore: unused_field
  static late mypec.PluginEventChannel _previewEventChannel;
  // ignore: unused_field
  static late mypec.PluginEventChannel _logsEventChannel;
  // ignore: unused_field
  static late mypec.PluginEventChannel _rtcStatsChannel;
  static final _meetingStreamController = StreamController();
  static final _previewStreamController = StreamController();
  static final _logsStreamController = StreamController();
  static final _rtcStreamController = StreamController();

  static Future importJsLibrary() async {
    const url =
        './assets/packages/hmssdk_flutter_web/assets/hmssdk_flutter_web.js';
    final script = html.ScriptElement()
      ..type = 'text/javascript'
      ..charset = 'utf-8'
      ..async = true
      ..src = url;
    html.querySelector('head')!.children.add(script);
    return script.onLoad.first;
  }

  static void registerWith(Registrar registrar) {
    final MethodChannel channel = MethodChannel(
      'hmssdk_flutter',
      const StandardMethodCodec(),
      registrar,
    );

    final pluginInstance = HmssdkFlutterWeb();
    channel.setMethodCallHandler(pluginInstance.handleMethodCall);

    _meetingEventChannel = mypec.PluginEventChannel(
        'meeting_event_channel', const StandardMethodCodec(), registrar)
      ..setController(_meetingStreamController);

    _previewEventChannel = mypec.PluginEventChannel(
        'preview_event_channel', const StandardMethodCodec(), registrar)
      ..setController(_previewStreamController);
    _logsEventChannel = mypec.PluginEventChannel(
        "logs_event_channel", const StandardMethodCodec(), registrar)
      ..setController(_logsStreamController);
    _rtcStatsChannel = mypec.PluginEventChannel(
        "rtc_event_channel", const StandardMethodCodec(), registrar)
      ..setController(_rtcStreamController);
    // ignore: undefined_prefixed_name
    ui.platformViewRegistry.registerViewFactory('HMSVideoWebView', (id) {
      if (videoViews[id] == null) {
        videoViews[id] = html.VideoElement();
      }
      return videoViews[id]!;
    });

    importJsLibrary().then((value) {
      hmssdkjsSetNotificationsHandler(allowInterop(notificationHandler));
    });
  }

  static void notificationHandler(String notiJson) {
    print("Notified $notiJson");
    final Map notification = jsonDecode(notiJson);
    final data = notification["data"];
    final bool inPreview = notification["inPreview"] ?? false;

    switch (notification["type"]) {
      case "JOINED":
        _meetingStreamController.sink.add({
          "event_name": "on_join_room",
          "data": {"room": data}
        });
        break;
      case "ROOM_UPDATED":
        {
          final args = {"event_name": "on_room_update", "data": data};
          _meetingStreamController.sink.add(args);
          if (inPreview) {
            _previewStreamController.sink.add(args);
          }
          break;
        }
      case 'HMS_STAT':
        {
          _rtcStreamController.sink
              .add({"event_name": notification["event"], "data": data});
          break;
        }
      case "PEER_LIST":
        //print('$data are the peers in the room'); // received right after join
        break;
      case "NEW_MESSAGE":
        _meetingStreamController.sink
            .add({"event_name": "on_message", "data": data});
        break;
      case "ERROR":
        {
          final args = {
            "event_name": "on_error",
            "data": {"error": data}
          };
          _meetingStreamController.sink.add(args);
          if (inPreview) {
            _previewStreamController.sink.add(args);
          }
          break;
        }
      case "RECONNECTING":
        _meetingStreamController.sink.add({
          "event_name": "on_re_connecting",
        });
        break;
      case "RECONNECTED":
        _meetingStreamController.sink.add({
          "event_name": "on_re_connected",
        });
        break;
      case 'PEER_UPDATE':
        {
          final args = {
            "event_name": "on_peer_update",
            "data": {
              'peer': data,
              'update': notification['update'],
            }
          };
          _meetingStreamController.sink.add(args);
          if (inPreview) {
            _previewStreamController.sink.add(args);
          }
          break;
        }
      case 'TRACK_UPDATE':
        _meetingStreamController.sink.add({
          "event_name": "on_track_update",
          "data": {
            'track': data,
            'peer': notification['peer'],
            'update': notification['update'],
          }
        });
        break;
      case "ROOM_ENDED":
        _meetingStreamController.sink
            .add({"event_name": "on_removed_from_room", "data": data});
        break;
      case "REMOVED_FROM_ROOM":
        _meetingStreamController.sink
            .add({"event_name": "on_removed_from_room", "data": data});
        break;
      case "DEVICE_CHANGE_UPDATE":
        //print('device changed - $data');
        break;
      default:
        break;
    }
  }

  /// Handles method calls over the MethodChannel of this plugin.
  /// Note: Check the "federated" architecture for a new way of doing this:
  /// https://flutter.dev/go/federated-plugins
  Future<dynamic> handleMethodCall(MethodCall call) async {
    switch (call.method) {
      case 'getPlatformVersion':
        return getPlatformVersion();
      case 'get_room':
      case 'get_local_peer':
      case 'get_track_by_id':
      case 'get_all_tracks':
        final json = await promiseToFuture(
            hmssdkjsHandleMethodCall(call.method, jsonEncode(call.arguments)));
        return jsonDecode(json);
      default:
        return promiseToFuture(
            hmssdkjsHandleMethodCall(call.method, jsonEncode(call.arguments)));
    }
  }

  /// Returns a [String] containing the version of the platform.
  Future<String> getPlatformVersion() {
    final version = html.window.navigator.userAgent;
    return Future.value(version);
  }
}
