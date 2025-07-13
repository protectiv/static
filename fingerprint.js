(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        debug: false,
        endpoint: '/cgi-bin/.protectiv/fingerprint',
        timeout: 5000,
        retries: 3
    };

    // Debug logging function
    function debugLog(message, data = null) {
        if (CONFIG.debug) {
            console.log('[Fingerprint]', message, data || '');
        }
    }

    // Canvas Fingerprinting
    function getCanvasFingerprint() {
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Set canvas size
            canvas.width = 200;
            canvas.height = 50;
            
            // Draw text with different fonts and styles
            ctx.textBaseline = 'top';
            ctx.font = '14px Arial';
            ctx.fillStyle = '#f60';
            ctx.fillRect(125, 1, 62, 20);
            
            ctx.fillStyle = '#069';
            ctx.fillText('Canvas fingerprint 🎨', 2, 15);
            
            ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
            ctx.fillText('Canvas fingerprint 🎨', 4, 17);
            
            // Add some geometric shapes
            ctx.globalCompositeOperation = 'multiply';
            ctx.fillStyle = 'rgb(255,0,255)';
            ctx.beginPath();
            ctx.arc(50, 25, 20, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.fill();
            
            // Get the canvas data
            const dataURL = canvas.toDataURL();
            
            // Create a simple hash of the canvas data
            let hash = 0;
            for (let i = 0; i < dataURL.length; i++) {
                const char = dataURL.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32-bit integer
            }
            
            debugLog('Canvas fingerprint generated:', hash.toString(16));
            return hash.toString(16);
        } catch (e) {
            debugLog('Canvas fingerprinting failed:', e.message);
            return 'canvas_error';
        }
    }

    // Screen and Browser Fingerprinting
    function getBrowserFingerprint() {
        try {
            const fingerprint = {
                screen: `${screen.width}x${screen.height}x${screen.colorDepth}`,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                language: navigator.language,
                platform: navigator.platform,
                cookieEnabled: navigator.cookieEnabled,
                doNotTrack: navigator.doNotTrack,
                hardwareConcurrency: navigator.hardwareConcurrency || 'unknown'
            };
            
            debugLog('Browser fingerprint:', fingerprint);
            return JSON.stringify(fingerprint);
        } catch (e) {
            debugLog('Browser fingerprinting failed:', e.message);
            return 'browser_error';
        }
    }

    // WebGL Fingerprinting
    function getWebGLFingerprint() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            
            if (!gl) {
                return 'webgl_not_supported';
            }

            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            const vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'unknown';
            const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'unknown';
            
            const webglData = {
                vendor: vendor,
                renderer: renderer,
                version: gl.getParameter(gl.VERSION),
                shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
                maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
                maxViewportDims: gl.getParameter(gl.MAX_VIEWPORT_DIMS)
            };

            debugLog('WebGL fingerprint:', webglData);
            return JSON.stringify(webglData);
        } catch (e) {
            debugLog('WebGL fingerprinting failed:', e.message);
            return 'webgl_error';
        }
    }

    // Audio Context Fingerprinting
    function getAudioFingerprint() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) {
                return 'audio_not_supported';
            }

            const audioCtx = new AudioContext();
            const oscillator = audioCtx.createOscillator();
            const analyser = audioCtx.createAnalyser();
            const gainNode = audioCtx.createGain();
            const scriptProcessor = audioCtx.createScriptProcessor(4096, 1, 1);

            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(10000, audioCtx.currentTime);

            gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
            oscillator.connect(analyser);
            analyser.connect(scriptProcessor);
            scriptProcessor.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            oscillator.start(0);

            const audioData = {
                sampleRate: audioCtx.sampleRate,
                maxChannelCount: audioCtx.destination.maxChannelCount,
                numberOfInputs: audioCtx.destination.numberOfInputs,
                numberOfOutputs: audioCtx.destination.numberOfOutputs,
                channelCount: audioCtx.destination.channelCount
            };

            oscillator.stop();
            audioCtx.close();

            debugLog('Audio fingerprint:', audioData);
            return JSON.stringify(audioData);
        } catch (e) {
            debugLog('Audio fingerprinting failed:', e.message);
            return 'audio_error';
        }
    }

    // Font Detection
    function getFontFingerprint() {
        try {
            const baseFonts = ['monospace', 'sans-serif', 'serif'];
            const testFonts = [
                'Arial', 'Arial Black', 'Arial Narrow', 'Arial Rounded MT Bold',
                'Calibri', 'Cambria', 'Comic Sans MS', 'Consolas', 'Courier',
                'Courier New', 'Georgia', 'Helvetica', 'Impact', 'Lucida Console',
                'Lucida Sans Unicode', 'Microsoft Sans Serif', 'MS Gothic',
                'MS PGothic', 'MS Sans Serif', 'MS Serif', 'Palatino Linotype',
                'Segoe UI', 'Tahoma', 'Times', 'Times New Roman', 'Trebuchet MS',
                'Verdana', 'Wingdings'
            ];

            const testString = 'mmmmmmmmmmlli';
            const testSize = '72px';
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            const baseFontWidths = {};
            baseFonts.forEach(baseFont => {
                ctx.font = testSize + ' ' + baseFont;
                baseFontWidths[baseFont] = ctx.measureText(testString).width;
            });

            const availableFonts = [];
            testFonts.forEach(testFont => {
                baseFonts.forEach(baseFont => {
                    ctx.font = testSize + ' ' + testFont + ', ' + baseFont;
                    const width = ctx.measureText(testString).width;
                    if (width !== baseFontWidths[baseFont]) {
                        if (availableFonts.indexOf(testFont) === -1) {
                            availableFonts.push(testFont);
                        }
                    }
                });
            });

            debugLog('Available fonts:', availableFonts);
            return availableFonts.sort().join(',');
        } catch (e) {
            debugLog('Font fingerprinting failed:', e.message);
            return 'font_error';
        }
    }

    // Collect all fingerprints
    function collectFingerprints() {
        debugLog('Starting fingerprint collection');
        
        const fingerprints = {
            canvas: getCanvasFingerprint(),
            browser: getBrowserFingerprint(),
            webgl: getWebGLFingerprint(),
            audio: getAudioFingerprint(),
            fonts: getFontFingerprint(),
            host: window.location.hostname,
            path: window.location.pathname,
            userAgent: navigator.userAgent,
            timestamp: Date.now(),
            referrer: document.referrer || 'direct',
            cookieEnabled: navigator.cookieEnabled,
            javaEnabled: typeof navigator.javaEnabled === 'function' ? navigator.javaEnabled() : false,
            plugins: Array.from(navigator.plugins).map(p => p.name).join(','),
            mimeTypes: Array.from(navigator.mimeTypes).map(m => m.type).join(',')
        };

        debugLog('Fingerprints collected:', fingerprints);
        return fingerprints;
    }

    // Send fingerprints to server
    async function sendFingerprints(fingerprints, attempt = 1) {
        try {
            debugLog(`Sending fingerprints (attempt ${attempt})`);
            
            const response = await fetch(CONFIG.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify(fingerprints),
                signal: AbortSignal.timeout(CONFIG.timeout)
            });

            if (response.ok) {
                debugLog('Fingerprints sent successfully');
                return true;
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            debugLog(`Failed to send fingerprints (attempt ${attempt}):`, error.message);
            
            if (attempt < CONFIG.retries) {
                // Exponential backoff
                const delay = Math.pow(2, attempt) * 1000;
                debugLog(`Retrying in ${delay}ms`);
                
                return new Promise(resolve => {
                    setTimeout(() => {
                        resolve(sendFingerprints(fingerprints, attempt + 1));
                    }, delay);
                });
            }
            
            return false;
        }
    }

    // Initialize fingerprinting
    function init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
            return;
        }

        debugLog('Initializing fingerprint collection');
        
        // Small delay to ensure page is fully loaded
        setTimeout(() => {
            const fingerprints = collectFingerprints();
            sendFingerprints(fingerprints);
        }, 100);
    }

    // Start the process
    init();

    // Expose API for external use
    window.ProtectivFingerprint = {
        collect: collectFingerprints,
        send: sendFingerprints,
        config: CONFIG
    };

})();
