exports.description = "Measure connection speed to the server"
exports.version = 1.8
exports.apiRequired = 10
exports.repo = "pavelnil/HFS-SpeedTest"
exports.preview = ["https://github.com/pavelnil/HFS-SpeedTest/blob/main/screenshots/screenshot1.jpg?raw=true","https://github.com/pavelnil/HFS-SpeedTest/blob/main/screenshots/screenshot2.jpg?raw=true","https://github.com/pavelnil/HFS-SpeedTest/blob/main/screenshots/screenshot3.jpg?raw=true","https://github.com/pavelnil/HFS-SpeedTest/blob/main/screenshots/screenshot4.jpg?raw=true","https://github.com/pavelnil/HFS-SpeedTest/blob/main/screenshots/screenshot5.jpg?raw=true"]

exports.config = {
    allowedAccounts: {
        defaultValue: 'admin',
        helperText: 'Allowed accounts/groups separated by "|". Example: admin|group1'
    },
    speedtestUrl: {
        defaultValue: '/speedtest',
        helperText: 'URL to access the test. Example: /network-test'
    },
    testDuration: {
        defaultValue: 5,
        helperText: 'Download/upload test duration in seconds. Example: 5'
    },
    pingCount: {
        defaultValue: 10,
        helperText: 'Number of pings to measure latency. Example: 10'
    },
    allowAnonymous: {
        defaultValue: false,
        helperText: 'Allow anonymous users to use the test',
        type: 'boolean'
    },
    enableGeoIP: {
        defaultValue: false,
        helperText: 'Enable country and city detection by IP',
        type: 'boolean'
    }
};

let downloadBuffer = null;
let bufferLastAccess = 0;
let bufferCleanupTimer = null;
const BUFFER_TIMEOUT = 30 * 60 * 1000;
const BUFFER_SIZE = 100 * 1024 * 1024;
const PLUGIN_NAME = 'speedtest';

exports.init = (api) => {
    const path = api.require('path');
    const fs = api.require('fs');
    const crypto = api.require('crypto');
    const { join } = path;
    const { readFileSync } = fs;

    const getConfig = api.getConfig;
    const setError = api.setError;
    
    const initDownloadBuffer = () => {
        if (!downloadBuffer || downloadBuffer.length !== BUFFER_SIZE) {
            downloadBuffer = Buffer.alloc(BUFFER_SIZE);
            crypto.randomFillSync(downloadBuffer);
            console.log(`[${PLUGIN_NAME}] Initialized download buffer: ${BUFFER_SIZE} bytes`);
        }
    };
    
    const scheduleBufferCleanup = () => {
        if (bufferCleanupTimer) {
            clearTimeout(bufferCleanupTimer);
            bufferCleanupTimer = null;
        }
        
        bufferCleanupTimer = setTimeout(() => {
            if (downloadBuffer && Date.now() - bufferLastAccess > BUFFER_TIMEOUT) {
                const bufferSize = downloadBuffer.length;
                downloadBuffer = null;
                console.log(`[${PLUGIN_NAME}] Cleared download buffer (${bufferSize} bytes) after 30 minutes of inactivity`);
            }
        }, BUFFER_TIMEOUT);
    };

    exports.middleware = async ctx => {
        const { 
            allowedAccounts, 
            speedtestUrl, 
            testDuration, 
            pingCount, 
            allowAnonymous,
            enableGeoIP
        } = getConfig();
        
        const currentUrl = ctx.path.replace(/\/$/, '');
        const isSpeedTestPage = currentUrl === speedtestUrl;
        const isPingOrDownload = ctx.method === 'GET' && ctx.path.startsWith('/~') && ctx.get('X-SpeedTest');
        const isUpload = ctx.method === 'POST' && ctx.path === '/~/upload' && ctx.get('X-SpeedTest');
        const isIPRequest = ctx.path === '/~/ip';
        const isCalibration = ctx.get('X-SpeedTest') === 'calibration';
        const isCalibrationUpload = ctx.path === '/~/upload-calibration';

        if (!isSpeedTestPage && !isPingOrDownload && !isUpload && !isIPRequest && !isCalibration && !isCalibrationUpload) return;
        
        try {
            if (!allowAnonymous && !isCalibration && !isCalibrationUpload) {
                const user = ctx.state.account?.username;
                if (!user) {
                    if (isSpeedTestPage) {
                        return ctx.redirect(`~/login?from=${encodeURIComponent(ctx.path)}`);
                    } else {
                        ctx.status = 401;
                        ctx.body = 'Unauthorized';
                        return;
                    }
                }
                
                const allowed = allowedAccounts.split('|');
                if (!api.ctxBelongsTo(ctx, allowed)) {
                    ctx.status = 403;
                    ctx.body = 'Access denied';
                    return;
                }
            }

            if (isSpeedTestPage) {
                let html = readFileSync(join(__dirname, 'public', 'speedtest.html'), 'utf8');

                const pluginBasePath = `/~/plugins/${path.basename(__dirname)}`;
    
                html = html
                    .replace(/src="\.\.\/\.\.\//g, `src="${pluginBasePath}/`)
                    .replace(/href="\.\.\/\.\.\//g, `href="${pluginBasePath}/`);
    
                const settingsScript = `
                    <script>
                        window.speedtestSettings = {
                            testDuration: ${testDuration},
                            pingCount: ${pingCount},
                            enableGeoIP: ${enableGeoIP}
                        };
                    </script>
                `;

                html = html.replace('</head>', `${settingsScript}</head>`);
    
                ctx.type = 'html';
                ctx.body = html;
                return;
            }

            if (isIPRequest) {
                ctx.status = 200;
                ctx.body = {
                    ip: ctx.ip,
                    ips: ctx.ips,
                    ipVersion: ctx.ip.includes(':') ? 'IPv6' : 'IPv4'
                };
                ctx.type = 'json';
                return;
            }

            if (isCalibration) {
                let calibrationSize = 1 * 1024 * 1024;
                const requestedSize = ctx.get('X-Calibration-Size');
                
                if (requestedSize) {
                    const size = parseInt(requestedSize);
                    if (!isNaN(size) && size > 0) {
                        calibrationSize = Math.min(size, BUFFER_SIZE);
                    }
                }
                
                if (!downloadBuffer) {
                    initDownloadBuffer();
                }
                
                ctx.status = 200;
                ctx.body = downloadBuffer.slice(0, calibrationSize);
                return;
            }

            if (isCalibrationUpload) {
                ctx.request.req.on('data', () => {});
                await new Promise(resolve => ctx.request.req.on('end', resolve));
                ctx.status = 200;
                ctx.body = '';
                return;
            }

            if (isPingOrDownload) {
                const testType = ctx.get('X-SpeedTest');
                if (testType === 'ping') {
                    ctx.status = 200;
                    ctx.body = '';
                    return;
                }
                
                if (testType === 'download') {
                    initDownloadBuffer();
                    bufferLastAccess = Date.now();
                    scheduleBufferCleanup();
                    
                    let chunkSizeBytes = 1 * 1024 * 1024;
                    const requestedSize = ctx.get('X-Chunk-Size');
                    
                    if (requestedSize) {
                        const requestedBytes = parseInt(requestedSize);
                        const minAllowed = 50 * 1024;
                        
                        if (!isNaN(requestedBytes) && 
                            requestedBytes >= minAllowed && 
                            requestedBytes <= BUFFER_SIZE) {
                            chunkSizeBytes = requestedBytes;
                        }
                    }
                    
                    ctx.status = 200;
                    ctx.set('Cache-Control', 'no-cache, no-store, must-revalidate');
                    ctx.set('Pragma', 'no-cache');
                    ctx.set('Expires', '0');
                    ctx.body = downloadBuffer.slice(0, chunkSizeBytes);
                    return;
                }
            }

            if (isUpload) {
                const testType = ctx.get('X-SpeedTest');
                
                if (testType === 'upload') {
                    ctx.request.req.on('data', () => {});
                    await new Promise(resolve => ctx.request.req.on('end', resolve));
                    ctx.status = 200;
                    ctx.body = '';
                    return;
                }
            }

        } catch (e) {
            setError(`speedtest plugin error: ${e.message}`);
            ctx.status = 500;
            ctx.body = 'Internal server error';
        }
    }

    scheduleBufferCleanup();
    
    return {
        frontend_js: 'main.js'
    };
};

exports.unload = () => {
    if (bufferCleanupTimer) {
        clearTimeout(bufferCleanupTimer);
        bufferCleanupTimer = null;
    }
    
    if (downloadBuffer) {
        const bufferSize = downloadBuffer.length;
        downloadBuffer = null;
        console.log(`[${PLUGIN_NAME}] Unloaded plugin and cleared download buffer (${bufferSize} bytes)`);
    }
};