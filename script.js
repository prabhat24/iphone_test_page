Object.defineProperty(HTMLMediaElement.prototype, 'playing', {
    get: function(){
        return !!(this.currentTime > 0 && !this.paused && !this.ended && this.readyState > 2);
    }
})

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
            addLog(`[${type} ${kind} track] Event: ended`, 'warning');
        });

        track.addEventListener('mute', () => {
            console.log(`[${type} ${kind} track] Event: mute`, track);
            addLog(`[${type} ${kind} track] Event: mute`, 'warning');
        });

        track.addEventListener('unmute', () => {
            console.log(`[${type} ${kind} track] Event: unmute`, track);
            addLog(`[${type} ${kind} track] Event: unmute`, 'info');
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
            addLog('Device changes detected', 'info');
            populateAudioSelector();
            devices = newDevices;
        }
    }
}

setInterval(updateDevices, 1000);
const output = document.getElementById('output');
const logs = [];

// Enhanced logging function with proper formatting and colors
function addLog(message, type = 'info') {
    const timestamp = new Date().toISOString().replace('T', ' ').substr(0, 19);
    
    // Check if user is at or near the bottom before adding new content
    const isNearBottom = output.scrollTop + output.clientHeight >= output.scrollHeight - 20;
    
    // Create a log entry element
    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry';
    
    // Create timestamp span
    const timestampSpan = document.createElement('span');
    timestampSpan.className = 'log-timestamp';
    timestampSpan.textContent = `[${timestamp}]`;
    
    // Create message span
    const messageSpan = document.createElement('span');
    messageSpan.className = `log-message log-${type}`;
    messageSpan.textContent = message;
    
    // Append both spans to the log entry
    logEntry.appendChild(timestampSpan);
    logEntry.appendChild(messageSpan);
    
    // Add to logs array for text fallback
    logs.push(`[${timestamp}] ${message}`);
    
    // Add to output as HTML
    output.appendChild(logEntry);
    
    // Only auto-scroll if user was already at or near the bottom
    if (isNearBottom) {
        output.scrollTop = output.scrollHeight;
    }
}

// Function to update output display (for backward compatibility)
function updateOutput() {
    // Check if user is at or near the bottom before auto-scrolling
    const isNearBottom = output.scrollTop + output.clientHeight >= output.scrollHeight - 20;
    
    // Only auto-scroll if user was already at or near the bottom
    if (isNearBottom) {
        output.scrollTop = output.scrollHeight;
    }
}

// Initialize logging
addLog('Application started - Permission Logger initialized', 'info');

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

    //   const logLine = `[${timestamp}] Camera: ${cameraStatus}, Mic: ${micStatus}, Location: ${locationStatus}`;
    //   addLog(logLine, 'info');

    // Show full log on screen
    updateOutput();
}

setInterval(checkPermissions, 1000);
checkPermissions();

[
    'abort', 'canplay', 'canplaythrough', 'durationchange', 'emptied', 'ended',
    'error', 'loadeddata', 'loadedmetadata', 'loadstart', 'pause', 'play', 'playing', 'ratechange', 'seeked', 'seeking', 'stalled',
    'volumechange', 'waiting'
].forEach(event => {
    agentVideo.addEventListener(event, () => {
        console.log(event)
        // Color code important events differently
        const eventType = ['ended', 'pause', 'stalled', 'waiting'].includes(event) ? 'warning' : 
                         ['playing'].includes(event) ? 'info' : 'info';
        addLog(`Agent Video ${event}`, eventType);
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
        // Color code important events differently
        const eventType = ['ended', 'pause', 'stalled', 'waiting'].includes(event) ? 'warning' : 
                         ['playing'].includes(event) ? 'info' : 'info';
        addLog(`Customer Video ${event}`, eventType);
    });
});

document.addEventListener("visibilitychange", () => {
    console.log(`[Visibility] Document visibility changed: ${document.visibilityState}`);
    addLog(`[Visibility] Document visibility changed: ${document.visibilityState}`, 'info');

    // Play agentVideo when page becomes visible
    if (document.visibilityState === 'visible') {
        try {
            agentVideo.play().then(() => {
                console.log(`[Visibility] agentVideo resumed playing`);
                addLog(`[Visibility] agentVideo resumed playing`, 'info');
            }).catch(err => {
                console.log(`[Visibility] Error playing agentVideo:`, err);
                addLog(`[Visibility] Error playing agentVideo: ${err.message}`, 'error');
            });
        } catch (err) {
            console.log(`[Visibility] Error playing agentVideo:`, err);
            addLog(`[Visibility] Error playing agentVideo: ${err.message}`, 'error');
        }
    }
});

window.addEventListener("focus", () => {
    startPlayingVideoWithInteraction();
});

startPlayingVideo = () => {
    console.log("[start] why didnt you play here")
    console.log(`[Focus] Window ${document.hasFocus() ? "has" : "does not have"} focus`);
    addLog(`[Focus] Window ${document.hasFocus() ? "has" : "does not have"} focus`, 'info');

    // Play agentVideo when window gains focus
    if (document.hasFocus()) {
        try {
            agentVideo.play().then(() => {
                console.log(`[Focus] agentVideo resumed playing`);
                addLog(`[Focus] agentVideo resumed playing`, 'info');
            }).catch(err => {
                console.log(`[Focus] Error playing agentVideo:`, err);
                addLog(`[Focus] Error playing agentVideo: ${err.message}`, 'error');
            });
        } catch (err) {
            console.log(`[Focus] Error playing agentVideo:`, err);
            addLog(`[Focus] Error playing agentVideo: ${err.message}`, 'error');
        }
    }
}

window.addEventListener("blur", () => {
    console.log(`[Focus] Window ${document.hasFocus() ? "has" : "does not have"} focus`);
    addLog(`[Focus] Window ${document.hasFocus() ? "has" : "does not have"} focus`, 'info');
});

console.log(`[Visibility] Initial state: ${document.visibilityState}`);
addLog(`[Visibility] Initial state: ${document.visibilityState}`, 'info');
console.log(`[Focus] Initial state: ${document.hasFocus()}`);
addLog(`[Focus] Initial state: ${document.hasFocus()}`, 'info');

// Function to simulate user interaction and enable autoplay
function simulateUserInteraction() {
    // Method 1: Create a fake click event
    const fakeEvent = new MouseEvent('click', {
        view: window,
        bubbles: true,
        cancelable: true
    });
    document.dispatchEvent(fakeEvent);
    
    // Method 2: Create an invisible button and click it programmatically
    const invisibleButton = document.createElement('button');
    invisibleButton.style.position = 'absolute';
    invisibleButton.style.left = '-9999px';
    invisibleButton.style.width = '1px';
    invisibleButton.style.height = '1px';
    invisibleButton.style.opacity = '0';
    document.body.appendChild(invisibleButton);
    invisibleButton.click();
    document.body.removeChild(invisibleButton);
    
    // Method 3: Try to enable audio context (for audio autoplay)
    if (window.AudioContext || window.webkitAudioContext) {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }
        } catch (e) {
            console.log('AudioContext interaction failed:', e);
        }
    }
    
    console.log("[Interaction] Simulated user interaction for autoplay");
    addLog(`[Interaction] Simulated user interaction for autoplay`, 'info');
}

function startPlayingVideoWithInteraction() {
    // First simulate user interaction
    simulateUserInteraction();
    
    // Small delay to ensure the interaction is registered
    setTimeout(() => {
        startPlayingVideo();
        addLog(`Customer video debug message ${document.getElementById('customerVideo').playing}}`)
        document.getElementById('customerVideo').playing ? addLog("Customer video is playing", 'error') : console.log("Customer video is NOT playing", 'error');
    }, 1000);
}

// Backup: Add a one-time real user interaction listener
let hasRealInteraction = false;
function enableAutoplayOnFirstInteraction() {
    if (hasRealInteraction) return;
    
    hasRealInteraction = true;
    console.log("[Interaction] Real user interaction detected, enabling autoplay");
    addLog(`[Interaction] Real user interaction detected, enabling autoplay`, 'info');
    
    // Try to play the video now that we have real user interaction
    startPlayingVideo();
    
    // Remove the listeners since we only need one interaction
    document.removeEventListener('click', enableAutoplayOnFirstInteraction);
    document.removeEventListener('touchstart', enableAutoplayOnFirstInteraction);
    document.removeEventListener('keydown', enableAutoplayOnFirstInteraction);
}

// Add listeners for real user interactions (as backup)
document.addEventListener('click', enableAutoplayOnFirstInteraction, { once: true });
document.addEventListener('touchstart', enableAutoplayOnFirstInteraction, { once: true });
document.addEventListener('keydown', enableAutoplayOnFirstInteraction, { once: true });

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startPlayingVideoWithInteraction);
} else {
    startPlayingVideoWithInteraction();
}

// Function to copy all logs to clipboard
function copyLogsToClipboard() {
    try {
        // Get all log text from the logs array
        const allLogsText = logs.join('\n');
        
        // Use the modern clipboard API if available
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(allLogsText).then(() => {
                // addLog('Logs copied to clipboard successfully!', 'info');
            }).catch(err => {
                addLog('Failed to copy logs to clipboard: ' + err.message, 'error');
                fallbackCopyToClipboard(allLogsText);
            });
        } else {
            // Fallback method for older browsers or non-secure contexts
            fallbackCopyToClipboard(allLogsText);
        }
    } catch (err) {
        addLog('Error copying logs: ' + err.message, 'error');
    }
}

// Fallback clipboard copy method
function fallbackCopyToClipboard(text) {
    try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
    } catch (err) {
        addLog('Fallback copy failed: ' + err.message, 'error');
    }
}

// Function to scroll to the latest log entry
function goToLatestLog() {
    output.scrollTop = output.scrollHeight;
}