import { HMSReactiveStore, 
        selectDevices, 
        selectIsLocalAudioEnabled, 
        selectIsLocalScreenShared, 
        selectIsLocalVideoEnabled, 
        selectIsPeerAudioEnabled, 
        selectIsPeerVideoEnabled, 
        selectLocalMediaSettings, 
        selectPeerByID, 
        selectRoom, 
        selectIsConnectedToRoom,
        selectTrackByID,
        selectRoleByRoleName,
        selectLocalPeer,
        selectRemotePeers,
        selectPeers,
        selectRoleChangeRequest,
        selectRolesMap,
    } from '@100mslive/hms-video-store';
window.HMSReactiveStore = HMSReactiveStore;

let hms;
let hmsActions;
let hmsStore;
let notiHandler = null;
let inPreview = false;
let statsCounter = false;
let hmsNotifications;

function build() {
    hms = new HMSReactiveStore();
    hms.triggerOnSubscribe();
    hmsActions = hms.getActions();
    hmsStore = hms.getStore();
    hmsNotifications = hms.getNotifications();
    //inPreview = false;
    //statsCounter = false;
    
    hmsStore.subscribe(value => {
        if (!notiHandler) return;
        if (value) {
            notiHandler(JSON.stringify({
                type: "JOINED",
                data: jsRoomToRoom(hmsStore.getState(selectRoom)),
            }));
        }
    }, selectIsConnectedToRoom);

    hmsStore.subscribe((value, oldValue) => {
        if (!notiHandler) return;
        if (!oldValue) return; //at build time
        const noti = {
            type: "ROOM_UPDATED",
            data: {
                room: jsRoomToRoom(value),
                update: '',
            }
        };
        if (value.name != oldValue.name) {
            noti.data.update = 'room_name_updated';
            notiHandler(JSON.stringify(noti));
        }
        if (value.recording.server.running != oldValue.recording.server.running) {
            noti.data.update = 'server_recording_state_updated';
            notiHandler(JSON.stringify(noti));
        }
        if (value.recording.browser.running != oldValue.recording.browser.running) {
            noti.data.update = 'browser_recording_state_updated';
            notiHandler(JSON.stringify(noti));
        }
        if (value.rtmp.running != oldValue.rtmp.running) {
            noti.data.update = 'rtmp_streaming_state_updated';
            notiHandler(JSON.stringify(noti));
        }
        if (value.hls.running != oldValue.hls.running) {
            noti.data.update = 'hls_streaming_state_updated';
            notiHandler(JSON.stringify(noti));
        }
        if (value.recording.hls.running != oldValue.recording.hls.running) {
            noti.data.update = 'hls_recording_state_updated';
            notiHandler(JSON.stringify(noti));
        }
    }, selectRoom);

    // hmsStore.subscribe(value => {
    //     if (!notiHandler) return;
    //     if (!statsCounter) return;
    //     notiHandler(JSON.stringify({
    //         type: "HMS_STAT",
    //         event: "on_rtc_stats",
    //         data: JSON.stringify({
    //             bytes_sent: value.publish.bytesSent || 0,
    //             bytes_received: value.subscribe.bytesReceived || 0,
    //             bitrate_sent: value.publish.bitrate || 0,
    //             packets_received: 0, //TODO fill in the blanks
    //             packets_lost: value.subscribe.packetsLost || 0,
    //             bitrate_received: value.subscribe.bitrate || 0,
    //             round_trip_time: value.publish.currentRoundTripTime || 0,
    //         }),
    //     }));
    // }, selectHMSStats.localPeerStats);

    // hmsStore.subscribe(value => {
    //     if (!notiHandler) return;
    //     if (!statsCounter) return;
    //     notiHandler(JSON.stringify({
    //         type: "HMS_STAT",
    //         event: "on_local_audio_stats",
    //         data: JSON.stringify({
    //             peer: jsPeerToPeer(hmsActions.hmsSDKPeers[value.peerID]),
    //             track: jsTrackToTrack(hmsActions.hmsSDKTracks[value.localId]),
    //             local_audio_stats: {
    //                 bytes_received: value.bytesSent,
    //                 bitrate: value.bitrate,
    //                 round_trip_time: value.roundTripTime,
    //         }}),
    //     }));
    // }, selectHMSStats.localAudioTrackStats);
    // hmsStore.subscribe(value => {
    //     if (!notiHandler) return;
    //     if (!statsCounter) return;
    //     notiHandler(JSON.stringify({
    //         type: "HMS_STAT",
    //         event: "on_local_video_stats",
    //         data: JSON.stringify({
    //             peer: jsPeerToPeer(hmsActions.hmsSDKPeers[value.peerID]),
    //             track: jsTrackToTrack(hmsActions.hmsSDKTracks[value.localId]),
    //             local_video_stats: {
    //                 bytes_received: value.bytesSent,
    //                 bitrate: value.bitrate, //TODO fill in the blanks
    //                 round_trip_time: value.roundTripTime,
    //                 frame_rate: value.framesPerSecond,
    //                 resolution: {
    //                     width: value.frameWidth,
    //                     height: value.frameHeight
    //                 }
    //         }}),
    //     }));
    // }, selectHMSStats.localVideoTrackStats);

    hmsNotifications.onNotification(noti => {
        switch (noti.type) {
            case "TRACK_ADDED":
            case 'TRACK_REMOVED':
            case 'TRACK_MUTED':
            case 'TRACK_UNMUTED':
            case 'TRACK_DESCRIPTION_CHANGED':
            case 'TRACK_DEGRADED':
            case 'TRACK_RESTORED':
                noti.peer = jsPeerToPeer(hmsStore.getState(selectPeerByID(noti.data.peerId)));
                noti.data = jsTrackToTrack(noti.data);
                noti.update = {
                            "TRACK_ADDED": "trackAdded",
                            "TRACK_REMOVED": "trackRemoved",
                            "TRACK_MUTED": "trackMuted",
                            "TRACK_UNMUTED": "trackUnMuted",
                            "TRACK_DESCRIPTION_CHANGED": "trackDescriptionChanged",
                            "TRACK_DEGRADED": "trackDegraded",
                            "TRACK_RESTORED": "trackRestored",
                        }[noti.type];
                noti.type = "TRACK_UPDATE";
                break;
            case "PEER_JOINED":
            case "PEER_LEFT":
            case "NAME_UPDATED":
            case "METADATA_UPDATED":
            case "ROLE_UPDATED":
                noti.data = jsPeerToPeer(noti.data);
                noti.update = {
                            "PEER_JOINED": "peerJoined",
                            "PEER_LEFT": "peerLeft",
                            "NAME_UPDATED": "nameChanged",
                            "METADATA_UPDATED": "metadataChanged",
                            "ROLE_UPDATED": "roleUpdated",
                        }[noti.type];
                noti.type = "PEER_UPDATE";
                break;
            case "ROOM_ENDED":
            case "REMOVED_FROM_ROOM":
                noti.data = jsRoomEndToRoomEnd(noti.data);
                break;
            case "NEW_MESSAGE":
                noti.data = {
                    message: {
                        sender: jsPeerToPeer(hmsStore.getState(selectPeerByID(noti.data.peerId))),
                        hms_message_recipient: {
                            recipient_peer: noti.data.recipientPeer ? jsPeerToPeer(hmsStore.getState(selectPeerByID(noti.data.recipientPeer))) : null,
                            recipient_roles: noti.data.recipientRoles ? (() => {
                                let res = [];
                                noti.data.recipientRoles.forEach(e => {
                                    res.push(hmsStore.getState(selectRoleByRoleName(e)));
                                })
                                return res;
                            })() : null,
                            recipient_type: noti.data.recipientPeer ? 'peer' : (noti.data.recipientRoles ? 'roles' : 'broadCast')
                        },
                        message: noti.data.message,
                        type: noti.data.type,
                        time: `${noti.data.time.getFullYear()}-${noti.data.time.getMonth() + 1}-${noti.data.time.getDate()} ${noti.data.time.getHours()}:${noti.data.time.getMinutes()}:${noti.data.time.getSeconds()}`
                    }
                };
                break;
        }
        noti.inPreview = inPreview;
        notiHandler(JSON.stringify(noti));
    });
}

function jsPermissionsToPermissions(params) {
    if (!params) return null;
    return {
        'end_room': params.endRoom,
        'stop_presentation': params.stopPresentation,
        'remove_others': params.removeOthers,
        'mute': params.mute,
        'un_mute': params.unMute,
        'change_role_force': params.changeRoleForce,
        'change_role': params.changeRole
    };
}
function jsSubscribeParamsToSubscribeSettings(params) {
    if (!params) return null;
    return {
        max_subs_bit_rate: params.maxSubsBitRate,
        map_display_tiles: params.maxDisplayTiles,
        subscribe_to_roles: params.subcribesToRoles,
    }
}
function jsPublishParamsToPublishSettings(params) {
    if (!params) return null;
    return {
        allowed: params.allowed,
        audio_setting: {
            bit_rate: params.audio.bitRate,
            codec: params.audio.codec,
        },
        video_setting: {
            codec: params.video.codec,
            frame_rate: params.video.frameRate,
            width: params.video.width,
            height: params.video.height,
        },
        screen_setting: {
            codec: params.screen.codec,
            frame_rate: params.screen.frameRate,
            width: params.screen.width,
            height: params.screen.height,
        },
        video_simulCast: params.videoSimulCastLayers,
        screen_simulCast: params.screenSimulCastLayers
  };
}
function jsRoleToRole(params) {
    if (!params) return null;
    return {
        name:params.name,
        publish_settings:jsPublishParamsToPublishSettings(params.publishParams),
        subscribe_settings:jsSubscribeParamsToSubscribeSettings(params.subscribeParams),
        permissions:jsPermissionsToPermissions(params.permissions),
        priority:params.priority,
    };
}
function jsPeerToPeer(params) {
    if (!params) return null;
    return {
        "peer_id":params.id,
        "name":params.name,
        "is_local":params.isLocal,
        "role":jsRoleToRole(hmsStore.getState(selectRoleByRoleName(params.roleName))),
        "metadata":params.metadata,
        "customer_user_id":params.customerUserId,
        "network_quality":params.networkQuality,
    };
}

function jsTrackToTrack(params) {
    if (!params) return null;
    let audioSetting = params['type'] == 'audio' ? hmsActions.hmsSDKTracks[params['id']].settings: null;
    let videoSetting = params['type'] == 'video' ? hmsActions.hmsSDKTracks[params['id']].settings: null;
    if (audioSetting) {
        audioSetting = {
            bit_rate: audioSetting['maxBitrate'],
            volume: audioSetting['volume'],
            audio_codec: audioSetting['codec']
        };
    }
    if (videoSetting) {
        videoSetting = {
            resolution: {
                height: videoSetting['height'],
                width: videoSetting['width']
            },
            video_codec: videoSetting['codec'],
            bit_Rate: videoSetting['maxBitrate'],
            max_frame_rate: videoSetting['maxFramerate'],
            camera_facing: '',
        };
    }
    return {
        instance_of: params['type'] == 'video',
        track_id: params['id'],
        track_description: '',
        track_source: params['source'].toUpperCase(),
        track_kind: params["type"].toUpperCase(),
        track_mute: !!params['enabled'],
        volume: params['volume'],
        is_degraded: !!params['degraded'],
        hms_audio_track_settings: audioSetting,
        hms_video_track_settings: videoSetting
    };
}
function jsRoomToRoom(params) {
    if (!params) return null;
    let peers = [];
    if (params['peers']) {
        params['peers'].forEach(e => {
            peers.push(jsPeerToPeer(hmsStore.getState(selectPeerByID(e))));
        });
    }
    let result = {
        browser_recording_state: params['recording']['browser'],
        rtmp_streaming_state: params['rtmp'],
        server_recording_state: params['recording']['server'],
        hls_streaming_state: params['hls'],
        hls_recording_state: params['recording']['hls'],
        id: params['id'],
        name: params['name'],
        peer_count: peers.length,
        //TODO check startedAt unit (sec/ms/us)?
        //started_at: Date.parse(params['startedAt']),
        session_id: params['sessionId'],
        peers: peers,
    }
    if (result.browser_recording_state && result.browser_recording_state.startedAt) {
        result.browser_recording_state.started_at = result.browser_recording_state.startedAt;
    }
    if (result.server_recording_state && result.server_recording_state.startedAt) {
        result.server_recording_state.started_at = result.server_recording_state.startedAt;
    }
    if (result.hls_recording_state && result.hls_recording_state.startedAt) {
        result.hls_recording_state.started_at = result.hls_recording_state.startedAt;
    }
    return result;
}
function jsRoomEndToRoomEnd(params) {
    if (!params) return null;
    return {
        removed_from_room: {
            peer_who_removed: params.requestedBy ? jsPeerToPeer(hmsStore.getState(selectPeerByID(params.requestedBy))): null,
            reason: params.reason,
            room_was_ended: params.roomEnded,
        }
    }
}

window.hmssdkjsVideoView = function(video, argsJson) {
    const args = JSON.parse(argsJson);
    if (!video) return;
    if (!args.track) return;
    //if (!track) return;
    if (args.type == "attach") {
        video.autoplay = true;
        video.muted = true;
        video.playsinline = true;
        hmsActions.attachVideo(args.track, video);
    } else {
        hmsActions.detachVideo(args.track, video);
    }
}
window.hmssdkjsSetNotificationsHandler = function (handler) {
    notiHandler = handler;
};

function HLSMeetingURLVariantArrayToJs(params) {
    if (!params) return null;
    let result = [];
    params.forEach(e => {
        result.push({
            meetingURL: e["meeting_url"],
            metadata: e["meta_data"]
        });
    });
    return result;
}

window.hmssdkjsHandleMethodCall = async function (method, args) {
    args = args ? JSON.parse(args) : null;
    console.log("Platform Call", method, args);
    switch (method) {
        
        // MARK: Build Actions
        case 'build':
            build();
            return true;
        case 'join':
            hmsActions.join({
                authToken: args['auth_token'],
                userName: args['user_name'],
                metaData: args["meta_data"],
                initEndpoint: args['end_point'],
                captureNetworkQualityInPreview: args['capture_network_quality_in_preview']
            });
            inPreview = false;
            return true;
        case 'preview':
            hmsActions.preview({
                authToken: args['auth_token'],
                userName: args['user_name'],
                metaData: args["meta_data"],
                initEndpoint: args['end_point'],
                captureNetworkQualityInPreview: args['capture_network_quality_in_preview']
            });
            inPreview = true;
            return true;
        case 'leave':
            hmsActions.leave();
            return null;
        
        // MARK: Room Actions
        case "get_room":
            return JSON.stringify(jsRoomToRoom(hmsStore.getState(selectRoom)));
        case "get_local_peer":
            return JSON.stringify(jsPeerToPeer(hmsStore.getState(selectLocalPeer)));
        case "get_remote_peers": {
            let peers = [];
            hmsStore.getState(selectRemotePeers).forEach(e => {
                peers.push(jsPeerToPeer(e));
            });
            return JSON.stringify(peers);
        }
        case "get_peers": {
            let peers = [];
            hmsStore.getState(selectPeers).forEach(e => {
                peers.push(jsPeerToPeer(e));
            });
            return JSON.stringify(peers);
        }

        // MARK: Audio Helpers
        case 'switch_audio':
            await hmsActions.setLocalAudioEnabled(!args['is_on']);
            return true;
        case 'is_audio_mute': {
            const peerId = args['peer_id'];
            if (!peerId) return !hmsStore.getState(selectIsLocalAudioEnabled);
            return hmsStore.getState(selectIsPeerAudioEnabled(peerId));
        }
        case 'mute_all': {
            // const options = {
            //     enabled: false, // false to mute, true to unmute
            //     type: 'audio', // optional, audio/video, mutes both if not passed
            //     source: 'regular' // optional, mutes all sources(regular, screen etc.) if not passed
            // };
            // await hmsActions.setRemoteTracksEnabled(options);
            Object.keys(hmsActions.hmsSDKTracks).forEach(e => {
                const track = hmsActions.hmsSDKTracks[e];
                if (track.type == 'audio') track.enabled = false;
            });
            return true;
        }
        case 'un_mute_all': {
            // const options = {
            //     enabled: true, // false to mute, true to unmute
            //     type: 'audio', // optional, audio/video, mutes both if not passed
            // };
            // await hmsActions.setRemoteTracksEnabled(options);
            Object.keys(hmsActions.hmsSDKTracks).forEach(e => {
                const track = hmsActions.hmsSDKTracks[e];
                if (track.type == 'audio') track.enabled = true;
            });
            return true;
        }
        case 'set_volume': {
            const trackId = args['track_id'];
            const volume = args['volume'];
            await hmsActions.setVolume(volume, trackId);
            return null;
        }

        // MARK: Video Helpers
        case 'switch_video':
            await hmsActions.setLocalVideoEnabled(!args['is_on']);
            return true;
        case 'switch_camera':
            const devices = hmsStore.getState(selectDevices).videoInput;
            const selected = hmsStore.getState(selectLocalMediaSettings).videoInputDeviceId;
            let selectedIdx = 0;
            for (let i = 0; i < devices.length; i++) {
                if (selected == devices[i].deviceId) {
                    selectedIdx = i;
                    break;
                }
            }
            if (++selectedIdx >= devices.length) selectedIdx = 0;
            await hmsActions.setVideoSettings({ deviceId: devices[selectedIdx].deviceId });
            return null;
        case 'start_capturing':
            await hmsActions.setLocalVideoEnabled(true);
            return true;
        case 'stop_capturing':
            await hmsActions.setLocalVideoEnabled(false);
            return true;
        case 'is_video_mute': {
            const peerId = args['peed_id'];
            if (!peerId) return !hmsStore.getState(selectIsLocalVideoEnabled);
            return hmsStore.getState(selectIsPeerVideoEnabled(peerId));
        }
        case 'set_playback_allowed': {
            const allowed = args['allowed'];
            // const options = {
            //     enabled: allowed, // false to mute, true to unmute
            //     type: 'video', // optional, audio/video, mutes both if not passed
            // };
            // await hmsActions.setRemoteTracksEnabled(options);
            Object.keys(hmsActions.hmsSDKTracks).forEach(e => {
                const track = hmsActions.hmsSDKTracks[e];
                if (track.type == 'video') track.enabled = allowed;
            });
            return true;
        }

        // MARK: Messaging
        case "send_broadcast_message": {
            const msg = args["message"];
            const type = args["type"] || "chat";
            return hmsActions.sendBroadcastMessage(msg, type);
        }
        case "send_direct_message": {
            const msg = args["message"];
            const peerId = args["peer_id"];
            const type = args["type"] || "chat";
            return hmsActions.sendDirectMessage(msg, peerId, type);
        }
        case "send_group_message": {
            const msg = args["message"];
            const roles = args["roles"];
            const type = args["type"] || "chat";
            return hmsActions.sendGroupMessage(msg, roles, type);
        }

        // MARK: Role based Actions
        case "get_roles": {
            let res = [];
            const roles = hmsStore.getState(selectRolesMap);
            Object.keys(roles).forEach(e => {
                res.push(jsRoleToRole(roles[e]));
            })
            return {roles: res};
        }
        case "change_role":
            return hmsActions.changeRole(args["peer_id"], args["role_name"], args["force_change"]);
        case "accept_change_role":
            return hmsActions.acceptChangeRole(hmsStore.getState(selectRoleChangeRequest));
        case "end_room":
            return hmsActions.endRoom(!!args["lock"], args["reason"] || "End room invoked");
        case "remove_peer":
            return hmsActions.removePeer(args["peer_id"], args["reason"] || "Removed from room");   
        case "on_change_track_state_request":
            return hmsActions.setRemoteTrackEnabled(args["track_id"], args["mute"]);
        case "change_track_state_for_role":
            return hmsActions.setRemoteTracksEnabled({
                enabled: args["mute"],
                roles: args["roles"],
                type: args["type"],
                source: args["source"]
            });

        // MARK: Peer Actions
        case "change_metadata":
            return hmsActions.changeMetadata(args["metadata"]);
        case "change_name" : 
            return hmsActions.changeName(args["name"]);

        // MARK: Recording
        case "start_rtmp_or_recording": 
            return hmsActions.startRTMPOrRecording({
                meetingURL: args["meeting_url"],
                rtmpURLs: args["rtmp_urls"],
                record: args["to_record"],
                resolution: args["resolution"]
            });
        case "stop_rtmp_and_recording":
            return hmsActions.stopRTMPAndRecording();

        // MARK: HLS
        case "hls_start_streaming": 
            return hmsActions.startHLSStreaming({
                variants: HLSMeetingURLVariantArrayToJs(args["meeting_url_variants"]),
                recording: args["recording_config"] ? {
                    singleFilePerLayer: args["recording_config"]["single_file_per_layer"],
                    hlsVod: args["recording_config"]["video_on_demand"]
                } : null
            });
        case "hls_stop_streaming":
            return hmsActions.stopHLSStreaming({
                variants: HLSMeetingURLVariantArrayToJs(args["meeting_url_variants"]),
            });

        //TODO implement these
        // // MARK: Logger
        // case "start_hms_logger", "remove_hms_logger" : {
        //     loggerActions(call, result)
        // }

        // MARK: Screenshare
        case 'start_screen_share': {
            await hmsActions.setScreenShareEnabled(true);
            return true;
        }
        case 'stop_screen_share': {
            await hmsActions.setScreenShareEnabled(false);
            return true;
        }
        case 'is_screen_share_active': {
            return hmsStore.getState(selectIsLocalScreenShared);
        }
        case "update_hms_video_track_settings": {
            const setting = args['video_track_setting'];
            return await hmsActions.setVideoSettings({
                width: setting['width'],
                height: setting['height'],
                codec: setting['video_codec'],
                maxFramerate: setting['max_frame_rate'],
                maxBitrate: setting['max_bit_rate'],
            });
        }
        case "get_track_by_id": {
            return JSON.stringify(jsTrackToTrack(hmsState.getState(selectTrackByID(args['track_id']))));
        }
        case "get_all_tracks": {
            const peerId = args['peer_id'];
            const peer = hmsState.getState(selectPeerByID(peerId));
            let tracks = [];

            if (peer.videoTrack) tracks.push(jsTrackToTrack(hmsState.getState(selectTrackByID(peer.videoTrack))));
            if (peer.audioTrack) tracks.push(jsTrackToTrack(hmsState.getState(selectTrackByID(peer.audioTrack))));
            for (let i = 0; i < peer.auxiliaryTracks.length; i++) {
                tracks.push(jsTrackToTrack(hmsState.getState(selectTrackByID(peer.auxiliaryTracks[i]))));
            }
            return JSON.stringify(tracks);
        }

        case "start_stats_listener":
            statsCounter = true;
            return null;
        case "remove_stats_listener":
            statsCounter = false;
            return null;
        default:
            alert(method);
            alert(args);
            throw {
                code: 'Unimplemented',
                details: `hmssdk_flutter for web doesn't implement '${method}`,
            };
    }
}