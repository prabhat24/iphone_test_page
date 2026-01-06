// Picture-in-Picture Handler
// Manages PiP mode for customer video when browser is minimized

class PiPHandler {
    constructor(videoElement) {
        this.videoElement = videoElement;
        this.isPiPActive = false;
        this.pipElement = null;
        this.isSupported = document.pictureInPictureEnabled;
        
        this.init();
    }

    init() {
        if (this.isSupported) {
            logger.info('Picture-in-Picture is supported');
            this.setupVisibilityListener();
            this.setupPiPEventListeners();
        } else {
            logger.warn('Picture-in-Picture is not supported in this browser');
        }
    }

    setupVisibilityListener() {
        // Listen for page visibility changes
        document.addEventListener('visibilitychange', () => {
            this.handleVisibilityChange();
        });

        // Listen for window focus/blur
        window.addEventListener('blur', () => {
            this.handleWindowBlur();
        });

        window.addEventListener('focus', () => {
            this.handleWindowFocus();
        });

        // Listen for window minimize (using visibility API)
        document.addEventListener('fullscreenchange', () => {
            if (!document.fullscreenElement) {
                logger.info('Exited fullscreen');
            }
        });

        logger.info('PiP visibility listeners configured');
    }

    setupPiPEventListeners() {
        this.videoElement.addEventListener('enterpictureinpicture', (e) => {
            this.isPiPActive = true;
            this.pipElement = e.pictureInPictureWindow;
            logger.info('Entered Picture-in-Picture mode');
            addLog('🎬 Picture-in-Picture: ACTIVE', 'info');
            
            // Resize PiP window
            if (this.pipElement) {
                this.pipElement.width = 480;
                this.pipElement.height = 360;
            }
        });

        this.videoElement.addEventListener('leavepictureinpicture', () => {
            this.isPiPActive = false;
            this.pipElement = null;
            logger.info('Exited Picture-in-Picture mode');
            addLog('🎬 Picture-in-Picture: INACTIVE', 'warning');
        });

        this.videoElement.addEventListener('resize', (e) => {
            if (this.isPiPActive && this.pipElement) {
                logger.info(`PiP window resized to ${e.target.width}x${e.target.height}`);
            }
        });
    }

    handleVisibilityChange() {
        const isHidden = document.hidden;
        
        if (isHidden) {
            logger.info('Page became hidden/minimized');
            addLog('⏸️  Browser window hidden - attempting to enable PiP', 'info');
            this.enterPiP();
        } else {
            logger.info('Page became visible');
            addLog('▶️  Browser window visible again', 'info');
            // Optionally exit PiP when page is visible again
            // this.exitPiP();
        }
    }

    handleWindowBlur() {
        logger.info('Window lost focus');
        addLog('📱 Window lost focus', 'info');
    }

    handleWindowFocus() {
        logger.info('Window gained focus');
        addLog('🔔 Window gained focus', 'info');
    }

    async enterPiP() {
        if (!this.isSupported) {
            logger.warn('Picture-in-Picture not supported');
            return;
        }

        if (this.isPiPActive) {
            logger.info('Already in Picture-in-Picture mode');
            return;
        }

        try {
            // Check if video is ready
            // if (this.videoElement.readyState < 2) {
            //     logger.warn('Video not ready for PiP, waiting...');
            //     addLog('⏳ Waiting for video to be ready...', 'warning');
            //     return;
            // }

            await this.videoElement.requestPictureInPicture();
            logger.info('Successfully entered Picture-in-Picture mode');
            addLog('✅ Entered PiP mode', 'info');
        } catch (error) {
            logger.error(`Failed to enter Picture-in-Picture: ${error.message}`);
            addLog(`❌ PiP Error: ${error.message}`, 'error');
        }
    }

    async exitPiP() {
        if (!this.isPiPActive) {
            logger.info('Not in Picture-in-Picture mode');
            return;
        }

        try {
            await document.exitPictureInPicture();
            logger.info('Successfully exited Picture-in-Picture mode');
            addLog('✅ Exited PiP mode', 'info');
        } catch (error) {
            logger.error(`Failed to exit Picture-in-Picture: ${error.message}`);
            addLog(`❌ PiP Exit Error: ${error.message}`, 'error');
        }
    }

    togglePiP() {
        if (this.isPiPActive) {
            this.exitPiP();
        } else {
            this.enterPiP();
        }
    }

    getPiPStatus() {
        return {
            supported: this.isSupported,
            active: this.isPiPActive,
            windowSize: this.isPiPActive && this.pipElement 
                ? `${this.pipElement.width}x${this.pipElement.height}` 
                : 'N/A'
        };
    }
}

// Global PiP handler instance
let pipHandler = null;

// Initialize PiP handler when video element is available
function initPiPHandler() {
    const customerVideo = document.getElementById('customerVideo');
    if (customerVideo && !pipHandler) {
        pipHandler = new PiPHandler(customerVideo);
        logger.info('PiP Handler initialized for customer video');
        addLog('🎬 PiP Handler Ready', 'info');
    }
}

// UI Control functions
function togglePiPMode() {
    if (pipHandler) {
        pipHandler.togglePiP();
    } else {
        addLog('❌ PiP Handler not initialized', 'error');
    }
}

function showPiPStatus() {
    if (pipHandler) {
        const status = pipHandler.getPiPStatus();
        const statusMessage = `
PiP Status:
- Supported: ${status.supported}
- Active: ${status.active}
- Window Size: ${status.windowSize}
        `.trim();
        
        logger.info(statusMessage);
        addLog(statusMessage, 'info');
        console.log('PiP Status:', status);
    } else {
        addLog('❌ PiP Handler not initialized', 'error');
    }
}

function enterPiPMode() {
    if (pipHandler) {
        pipHandler.enterPiP();
    } else {
        addLog('❌ PiP Handler not initialized', 'error');
    }
}

function exitPiPMode() {
    if (pipHandler) {
        pipHandler.exitPiP();
    } else {
        addLog('❌ PiP Handler not initialized', 'error');
    }
}
