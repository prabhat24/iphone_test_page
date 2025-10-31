// VideoPlayerMonitor - Browser compatible version
// Adapted from TypeScript to work in browser environment

// Logger service that uses the existing addLog function from the main script
const logger = {
    info: (message) => {
        console.log('[INFO]', message);
        if (typeof addLog === 'function') {
            addLog(`[VideoMonitor] ${message}`, 'info');
        }
    },
    warn: (message) => {
        console.warn('[WARN]', message);
        if (typeof addLog === 'function') {
            addLog(`[VideoMonitor] ${message}`, 'warning');
        }
    },
    error: (message) => {
        console.error('[ERROR]', message);
        if (typeof addLog === 'function') {
            addLog(`[VideoMonitor] ${message}`, 'error');
        }
    }
};

const VideoPlayerEvent = {
    ENDED: 'ended',
    PAUSE: 'pause',
    PLAYING: 'playing',
    STALLED: 'stalled',
    WAITING: 'waiting',
    None: 'None'
};

class VideoPlayerMonitor {
    constructor(videoElement, streamType) {
        this.videoElement = videoElement;
        this.streamType = streamType;
        this.listenerSetupSuccess = true;
        this.lastestRecordedEvent = VideoPlayerEvent.None;
        this.userType = this.streamType === 'local' ? 'Customer' : 'Agent';
        this.hasEverStartedPlaying = false;
        this.statusLoggingTimeoutId = null;
        // store references to handlers so we can remove them later
        this.eventHandlers = new Map();
    }

    startMonitoring() {
        this.logStatusAfterGivenTimeout(15000);
        this.listenerSetupSuccess = true;

        try {
            const handlers = {
                ended: () => {
                    this.lastestRecordedEvent = VideoPlayerEvent.ENDED;
                    const logString = `${this.logPrefix()} video playback is now ${this.getEventLabel(VideoPlayerEvent.ENDED)} | ${this.logMetaData()}`;
                    console.log(logString);
                    logger.info(logString);
                },
                stalled: () => {
                    this.lastestRecordedEvent = VideoPlayerEvent.STALLED;
                    const logString = `${this.logPrefix()} video playback is now ${this.getEventLabel(VideoPlayerEvent.STALLED)} | ${this.logMetaData()}`;
                    logger.info(logString);
                    console.log(logString);
                    this.logStatusAfterGivenTimeout(15000);
                },
                playing: () => {
                    this.lastestRecordedEvent = VideoPlayerEvent.PLAYING;
                    const logString = `${this.logPrefix()} video playback is now ${this.getEventLabel(VideoPlayerEvent.PLAYING)}`;
                    logger.info(logString);
                    console.log(logString);
                    this.stopLoggingStatus();
                    this.hasEverStartedPlaying = true;
                },
                waiting: () => {
                    this.lastestRecordedEvent = VideoPlayerEvent.WAITING;
                    const logString = `${this.logPrefix()} video playback is now ${this.getEventLabel(VideoPlayerEvent.WAITING)} | ${this.logMetaData()}`;
                    logger.info(logString);
                    console.log(logString);
                    this.logStatusAfterGivenTimeout(15000);
                },
                pause: () => {
                    this.lastestRecordedEvent = VideoPlayerEvent.PAUSE;
                    const logString = `${this.logPrefix()} video playback is now ${this.getEventLabel(VideoPlayerEvent.PAUSE)} | ${this.logMetaData()}`;
                    logger.info(logString);
                    console.log(logString);
                    this.logStatusAfterGivenTimeout(15000);
                }
            };

            for (const key of Object.keys(handlers)) {
                const ev = key;
                const fn = handlers[key];
                this.eventHandlers.set(ev, fn);
                this.videoElement.addEventListener(ev, fn);
            }
        } catch (err) {
            this.listenerSetupSuccess = false;
            logger.error(`[${this.streamType}-video-player] Faced an issue with ${this.userType}'s ${this.streamType} video player while adding listeners`);
            logger.error(err);
        }
        if (this.listenerSetupSuccess) {
            logger.info(
                `[${this.streamType}-video-player] Event listeners have been added for ${this.userType}'s ${this.streamType} video element`
            );
        }
    }

    logStatusAfterGivenTimeout(timeout) {
        // stop earlier logging if any
        this.stopLoggingStatus();
        // start new timeout for logging
        this.statusLoggingTimeoutId = setTimeout(() => {
            if (this.hasEverStartedPlaying) {
                logger.warn(
                    `${this.logPrefix()} video played once but not played again after ${timeout/1000} seconds of ${this.lastestRecordedEvent} event | ${this.logMetaData()}`
                );
            }
            else {
                logger.warn(
                    `${this.logPrefix()} video never played and has not started playing yet even after ${timeout/1000} seconds of load | ${this.logMetaData()}`
                );
            }
        }, timeout);
    }

    stopLoggingStatus() {
        console.log(`${this.logPrefix()} Stopping any pending status logging timers.`);
        clearTimeout(this.statusLoggingTimeoutId);
    }

    getEventLabel(event) {
        return event === VideoPlayerEvent.PAUSE ? 'paused' : event;
    }

    getVisibilityPrefix() {
        try {
            if (typeof document !== 'undefined' && document.visibilityState) {
                return `[visibility:${document.visibilityState}]`;
            }
        } catch (e) {
            // ignore, return unknown
        }
        return `[visibility:unknown]`;
    }

    logPrefix() {
        return `[${this.streamType}-video-player] | ${this.getVisibilityPrefix()} | ${this.userType} ${this.streamType}`;
    }

    destroy() {
        // remove listeners, clear timers, any other cleanup
        this.stopLoggingStatus();
        this.removeAllEventListeners();
    }

    removeAllEventListeners() {
        for (const [event, handler] of this.eventHandlers.entries()) {
            try {
                this.videoElement.removeEventListener(event, handler);
            } catch (e) {
                // ignore
            }
        }
        this.eventHandlers.clear();
    }

    // Return a structured snapshot of relevant video element metadata.
    getMetaData() {
        const readyStateMap = {
            0: 'HAVE_NOTHING',
            1: 'HAVE_METADATA',
            2: 'HAVE_CURRENT_DATA',
            3: 'HAVE_FUTURE_DATA',
            4: 'HAVE_ENOUGH_DATA'
        };
        const networkStateMap = {
            0: 'NETWORK_EMPTY',
            1: 'NETWORK_IDLE',
            2: 'NETWORK_LOADING',
            3: 'NETWORK_NO_SOURCE'
        };

        const err = this.videoElement.error;

        return {
            currentTime: Number(this.videoElement.currentTime?.toFixed?.(2) ?? this.videoElement.currentTime),
            readyState: readyStateMap[this.videoElement.readyState],
            networkState: networkStateMap[this.videoElement.networkState],
            paused: this.videoElement.paused,
            ended: this.videoElement.ended,
            muted: this.videoElement.muted,
            volume: this.videoElement.volume,
            error: err ? { code: err.code, message: err.message } : null
        };
    }

    // Return metadata as a compact or pretty JSON string for logging.
    _formatMetaData(pretty = true, data) {
        return pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
    }

    // Convenience method to log metadata
    logMetaData(pretty = true) {
        const payload = this._formatMetaData(pretty, this.getMetaData());
        return payload;
    }
}

class VideoPlayerMonitorFactory {
    static instances = new Map();

    // creates or returns existing monitor
    static get(streamType, videoElement) {
        const existing = this.instances.get(streamType);
        if (existing) {
            return existing;
        }
        const monitor = new VideoPlayerMonitor(videoElement, streamType);
        this.instances.set(streamType, monitor);
        return monitor;
    }

    static getLocal(videoElement) {
        return this.get('local', videoElement);
    }

    static getRemote(videoElement) {
        return this.get('remote', videoElement);
    }

    // destroy a single monitor either local or remote
    static destroy(streamType) {
        const inst = this.instances.get(streamType);
        if (!inst) return;
        inst.destroy();
        this.instances.delete(streamType);
    }

    // destroy all the monitors
    static destroyAll() {
        for (const [k, v] of this.instances) {
            v.destroy();
        }
        this.instances.clear();
    }
}

// Make VideoPlayerMonitorFactory available globally
window.VideoPlayerMonitorFactory = VideoPlayerMonitorFactory;
window.VideoPlayerEvent = VideoPlayerEvent;