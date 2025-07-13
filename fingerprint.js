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

    // Load thumbmarkjs library dynamically
    function loadThumbmarkjs() {
        return new Promise((resolve, reject) => {
            if (window.thumbmark) {
                resolve(window.thumbmark);
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@thumbmarkjs/thumbmarkjs@rc/dist/thumbmark.umd.js';
            script.onload = () => {
                if (window.thumbmark) {
                    debugLog('Thumbmarkjs loaded successfully');
                    resolve(window.thumbmark);
                } else {
                    reject(new Error('Thumbmarkjs failed to load'));
                }
            };
            script.onerror = () => reject(new Error('Failed to load thumbmarkjs script'));
            document.head.appendChild(script);
        });
    }

    // Canvas Fingerprinting using thumbmarkjs
    async function getCanvasFingerprint() {
        try {
            if (!window.thumbmark) {
                throw new Error('Thumbmarkjs not loaded');
            }

            const fingerprint = await window.thumbmark.generate();
            debugLog('Canvas fingerprint generated (thumbmarkjs):', fingerprint);
            return fingerprint;
        } catch (e) {
            debugLog('Canvas fingerprinting failed:', e.message);
            return 'canvas_error';
        }
    }





    // Collect fingerprints using thumbmarkjs
    async function collectFingerprints() {
        debugLog('Starting fingerprint collection with thumbmarkjs');

        const fingerprints = {
            canvas: await getCanvasFingerprint(),
            browser: JSON.stringify({
                screen: `${screen.width}x${screen.height}x${screen.colorDepth}`,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                language: navigator.language,
                cookieEnabled: navigator.cookieEnabled,
                hardwareConcurrency: navigator.hardwareConcurrency || 'unknown'
            }),
            host: window.location.hostname,
            path: window.location.pathname,
            userAgent: navigator.userAgent,
            timestamp: Date.now(),
            referrer: document.referrer || 'direct'
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
    async function init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
            return;
        }

        debugLog('Initializing fingerprint collection');

        // Load thumbmarkjs first
        await loadThumbmarkjs();
        debugLog('Thumbmarkjs loaded successfully');

        // Small delay to ensure page is fully loaded
        setTimeout(async () => {
            try {
                const fingerprints = await collectFingerprints();
                await sendFingerprints(fingerprints);
            } catch (e) {
                debugLog('Error during fingerprint collection:', e.message);
            }
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
