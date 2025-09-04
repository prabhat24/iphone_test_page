const agentVideo = document.getElementById('agentVideo');
const customerVideo = document.getElementById('customerVideo');
const audioSelector = document.getElementById('audioSelector');
const uas = navigator.userAgent.toString().toLowerCase().trim();

let customerStream = 'none';
let audStream = 'none';
let devices = [];

gainPermissions();

// agentVideo.addEventListener('click', () => {
//     if (!agentVideo.play()) {
//         agentVideo.play();
//     }
// });

function startLocalVideo() {
    console.log("Start")
    startCustomerVideo()
}

function stopLocalVideo() {
    console.log("Stop")
    customerStream.getTracks().forEach(track => {
        track.stop();
    });
    customerStream = "none"
}

audioSelector.addEventListener('change', async function () {
    let deviceId = audioSelector.options[audioSelector.selectedIndex].value;
    let deviceLabel = audioSelector.options[audioSelector.selectedIndex].text;
    if (deviceId == 'none') {
        if (audStream != 'none') {
            audStream.getTracks().forEach(track => {
                track.stop();
            });
        }
        audStream = 'none';
    }
    await changeSpeaker(deviceId, deviceLabel);
});

async function changeSpeaker(deviceId, deviceLabel) {
    console.log('Changing output device to : ' + deviceLabel);
    console.log('Device id : ' + deviceId);
    if (uas.includes('android' || uas.includes('linux'))) {
        if (audStream != 'none') {
            audStream.getTracks().forEach(track => {
                track.stop();
            });
        }
        audStream = await new Promise((resolve, reject) => {
            navigator.mediaDevices.getUserMedia({
                audio: { deviceId: deviceId },
                video: false
            }).then(
                stream => {
                    resolve(stream);
                },
                err => {
                    console.log(err);
                    reject(err);
                }
            );
        });
    }
    else {
        agentVideo.setSinkId(deviceId);
    }
}

async function gainPermissions() {
    let ts = await new Promise((resolve, reject) => {
        navigator.mediaDevices.getUserMedia({
            audio: true,
            video: true
        }).then(
            stream => {
                resolve(stream);
            },
            err => {
                console.log(err);
                reject(err);
            }
        );
    });
    ts.getTracks().forEach(track => {
        track.stop();
    });
    startCustomerVideo();
}

async function startCustomerVideo() {
    if (customerStream == 'none') {
        try {
            customerStream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: { facingMode: 'user' }
            });
            customerVideo.srcObject = customerStream;
            attachTrackEvents(customerStream, "customer")
        }
        catch (err) {
            console.log(err);
        }
    }
    populateAudioSelector();
}

function attachTrackEvents(stream, type) {
    if (!stream) {
        console.warn("No MediaStream provided");
        return;
    }

    stream.getTracks().forEach(track => {
        const kind = track.kind; // "audio" or "video"

        track.addEventListener('ended', () => {
            console.log(`[${type} ${kind} track] Event: ended`, track);
            logs.push(`[${type} ${kind} track] Event: ended ` + new Date().toISOString())
            output.textContent = logs.join('\n');
            output.scrollTop = output.scrollHeight;
        });

        track.addEventListener('mute', () => {
            console.log(`[${type} ${kind} track] Event: mute`, track);
            logs.push(`[${type} ${kind} track] Event: mute ` + new Date().toISOString())
            output.textContent = logs.join('\n');
            output.scrollTop = output.scrollHeight;
        });

        track.addEventListener('unmute', () => {
            console.log(`[${type} ${kind} track] Event: unmute`, track);
            logs.push(`[${type} ${kind} track] Event: unmute ` + new Date().toISOString())
            output.textContent = logs.join('\n');
            output.scrollTop = output.scrollHeight;
        });

        console.log(`[${kind} track] Event listeners attached`, track);
    });
}

async function populateAudioSelector() {
    while (audioSelector.options.length > 0) {
        for (var i = 0; i < audioSelector.options.length; i++) {
            audioSelector.remove(i);
        }
    }
    audioSelector.options[audioSelector.options.length] = new Option('Select', 'none');
    let audioDevices = await navigator.mediaDevices.enumerateDevices();
    if (uas.includes('android') || uas.includes('linux')) {
        audioDevices = audioDevices.filter(d => d.kind == 'audioinput');
    }
    else {
        audioDevices = audioDevices.filter(d => d.kind == 'audiooutput');
    }
    audioDevices.forEach(device => {
        audioSelector.options[audioSelector.options.length] = new Option(device.label, device.deviceId);
    });
}

function checkSameDevices(deviceList1, deviceList2) {
    if (deviceList1.length != deviceList2.length) {
        return false;
    }
    for (var i = 0; i < deviceList1[i].length; i++) {
        if (deviceList1[i].kind != deviceList2[i].kind) {
            return false;
        }
        if (deviceList1[i].label != deviceList2[i].label) {
            return false;
        }
        if (deviceList1[i].deviceId != deviceList2[i].deviceId) {
            return false;
        }
        if (deviceList1[i].groupId != deviceList2[i].groupId) {
            return false;
        }
    }
    return true;
}

async function updateDevices() {
    let newDevices = await navigator.mediaDevices.enumerateDevices();
    if (devices.length == 0) {
        devices = newDevices;
    }
    else {
        if (!checkSameDevices(devices, newDevices)) {
            console.log('Device changes detected');
            populateAudioSelector();
            devices = newDevices;
        }
    }
}

setInterval(updateDevices, 1000);
const output = document.getElementById('output');
const logs = [];

async function getPermissionStatus(name) {
    try {
        const status = await navigator.permissions.query({ name });
        return status.state;
    } catch (err) {
        return 'not supported';
    }
}

async function checkPermissions() {
    const cameraStatus = await getPermissionStatus('camera');
    const micStatus = await getPermissionStatus('microphone');
    const locationStatus = await getPermissionStatus('geolocation');
    const timestamp = new Date().toLocaleTimeString();

    //   const logLine = `[${timestamp}] Camera: ${cameraStatus}, Mic: ${micStatus}, Location: ${locationStatus}`;
    //   logs.push(logLine);

    // Show full log on screen
    output.textContent = logs.join('\n');
    output.scrollTop = output.scrollHeight;
}

setInterval(checkPermissions, 1000);
checkPermissions();

[
    'abort', 'canplay', 'canplaythrough', 'durationchange', 'emptied', 'ended',
    'error', 'loadeddata', 'loadedmetadata', 'loadstart', 'pause', 'play', 'playing', 'ratechange', 'seeked', 'seeking', 'stalled', 'suspend',
    'volumechange', 'waiting'
].forEach(event => {
    agentVideo.addEventListener(event, () => {
        console.log(event)
        logs.push("Agent Video " + event + " " + new Date().toISOString())
        output.textContent = logs.join('\n');
        output.scrollTop = output.scrollHeight;
    });
});

// important events : ended, pause, playing, stalled, waiting
// events that can be ignored : abort, canplay, canplaythrough, durationchange, emptied, error, loadeddata, loadedmetadata, loadstart, play, ratechange, seeked, seeking, volumechange, suspend

[
    'abort', 'canplay', 'canplaythrough', 'durationchange', 'emptied', 'ended',
    'error', 'loadeddata', 'loadedmetadata', 'loadstart', 'pause', 'play', 'playing', 'ratechange', 'seeked', 'seeking', 'stalled', 'suspend',
    'volumechange', 'waiting'
].forEach(event => {
    customerVideo.addEventListener(event, () => {
        console.log(event)
        logs.push("Customer Video " + event + " " + new Date().toISOString())
        output.textContent = logs.join('\n');
        output.scrollTop = output.scrollHeight;
    });
});

document.addEventListener("visibilitychange", () => {
    console.log(`[Visibility] Document visibility changed: ${document.visibilityState}`);
    logs.push(`[Visibility] Document visibility changed: ${document.visibilityState} ` + new Date().toISOString())
    output.textContent = logs.join('\n');
    output.scrollTop = output.scrollHeight;

});

window.addEventListener("focus", () => {
    console.log(`[Focus] Window ${document.hasFocus() ? "has" : "does not have"} focus`);
    logs.push(`[Focus] Window ${document.hasFocus() ? "has" : "does not have"} focus` + new Date().toISOString())
    output.textContent = logs.join('\n');
    output.scrollTop = output.scrollHeight;

});

window.addEventListener("blur", () => {
    console.log(`[Focus] Window ${document.hasFocus() ? "has" : "does not have"} focus`);
    logs.push(`[Focus] Window ${document.hasFocus() ? "has" : "does not have"} focus` + new Date().toISOString())
    output.textContent = logs.join('\n');
    output.scrollTop = output.scrollHeight;

});

console.log(`[Visibility] Initial state: ${document.visibilityState}`);
logs.push(`[Visibility] Initial state: ${document.visibilityState} ` + new Date().toISOString());
console.log(`[Focus] Initial state: ${document.hasFocus()}`);
logs.push(`[Focus] Initial state: ${document.hasFocus()} ` + new Date().toISOString());
output.textContent = logs.join('\n');
output.scrollTop = output.scrollHeight;
