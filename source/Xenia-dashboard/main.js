
const { app, BrowserWindow, ipcMain, dialog, shell, session, nativeImage } = require('electron');
const path = require('path');
const { default: Store } = require('electron-store');
const fs = require('fs').promises; 
const fsSync = require('fs');
const axios = require('axios');
const decompress = require('decompress'); 
const { exec, spawn } = require('child_process');
const USER_DATA_PATH = app.getPath('userData');
const { exec: execCb } = require('child_process');
const util = require('util');
const execPromise = util.promisify(execCb);



app.commandLine.appendSwitch('force-device-scale-factor', '1');
app.commandLine.appendSwitch('ignore-gpu-blacklist');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-oop-rasterization');

let store;
let mainWindow;
let isAppFocused = true;

let isGameRunning = false;
let controllerProcess = null; 
let currentXeniaProcess = null; 



let CONFIG_DIR;


if (process.env.PORTABLE_EXECUTABLE_DIR) {
    CONFIG_DIR = process.env.PORTABLE_EXECUTABLE_DIR;
} 
else if (process.env.APPIMAGE) {
    CONFIG_DIR = path.dirname(process.env.APPIMAGE);
} 
else if (app.isPackaged) {
    CONFIG_DIR = path.dirname(process.execPath);
} 
else {
    CONFIG_DIR = __dirname;
}

console.log(`[System] CONFIG_DIR set to: ${CONFIG_DIR}`); 


const ZAR_MAPPING_FILE = path.join(CONFIG_DIR, 'data', 'zar_titleids.json');
const CACHE_DIR = path.join(CONFIG_DIR, 'steamgriddb_cache');
const ART_DIR = path.join(CACHE_DIR, 'art');
const CACHE_FILE = path.join(CACHE_DIR, 'db.json');
const ACHIEVEMENTS_DIR = path.join(CONFIG_DIR, 'achievements');
const ACHIEVEMENTS_CACHE_FILE = path.join(CONFIG_DIR, 'data', 'achievement.json');


const GAMES_DIR = path.join(CONFIG_DIR, 'Games'); 
const iconPath = path.join(__dirname, 'assets', 'icons', 'icon.png');
const appIcon = nativeImage.createFromPath(iconPath); 



const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();

            
            const currentLang = store ? store.get('language') : 'en';

            
            const uiMessages = {
                en: {
                    title: 'System Message',
                    message: 'Xenia Dashboard is already active',
                    detail: 'The application is already running on your system. Please use the existing window to continue your session.',
                    button: 'Dismiss'
                },
                ar: {
                    title: 'رسالة النظام',
                    message: 'واجهة زينيا نشطة بالفعل',
                    detail: 'التطبيق يعمل حالياً على نظامك. يرجى استخدام النافذة المفتوحة لمتابعة جلسة اللعب الخاصة بك.',
                    button: 'إغلاق'
                }
            };

            const ui = uiMessages[currentLang] || uiMessages.en;

            dialog.showMessageBox(mainWindow, {
                type: 'none', 
                title: ui.title,
                message: ui.message, 
                detail: ui.detail,   
                buttons: [ui.button],
                defaultId: 0,
                noLink: true
            });
        }
    });
}

async function getContentRootPath() {
    const xeniaPath = store.get('xeniaPath');
    const launchMethod = store.get('linuxLaunchMethod') || 'native';
    const platform = require('os').platform();

    if (platform === 'win32') {

        const portablePath = path.join(path.dirname(xeniaPath), 'content');
        if (fsSync.existsSync(portablePath)) return portablePath;

        return path.join(process.env.LOCALAPPDATA, 'Xenia', 'content');
    } else if (platform === 'linux' && launchMethod === 'native') {
        return path.join(require('os').homedir(), '.local', 'share', 'Xenia', 'content');
    }
    return path.join(path.dirname(xeniaPath), 'content');
}


function getResourcePath(relativePath) {
    if (app.isPackaged) {

        return path.join(process.resourcesPath, relativePath);
    } else {
       
        return path.join(__dirname, relativePath);
    }
}


    function getBinaryPath(name) {
        const platform = require('os').platform();
        
        let osFolder = '';
        let fileName = name;

        if (platform === 'win32') {
            osFolder = 'win';
            fileName = `${name}.exe`;
        } else if (platform === 'linux') {
            osFolder = 'linux';
            fileName = name; 
        } else {
            osFolder = 'mac'; 
            fileName = name;
        }


        const externalPath = path.join(CONFIG_DIR, 'assets', 'bin', osFolder, fileName);
        
        if (fsSync.existsSync(externalPath)) {
            return externalPath;
        }

        if (app.isPackaged) {
            const appPath = app.getAppPath(); 
            const unpackedPath = appPath.replace('app.asar', 'app.asar.unpacked');
            return path.join(unpackedPath, 'assets', 'bin', osFolder, fileName);
        } else {
            // في وضع التطوير
            return path.join(__dirname, 'assets', 'bin', osFolder, fileName);
        }
    }

async function checkPathExistsAsync(checkPath) {
    if (!checkPath) return false;
    try {
        await fs.access(checkPath, fs.constants.F_OK);
        return true;
    } catch { 
        return false; 
    }
}
async function getXeniaConfigPath() {
    if (!store) return { path: null, error: 'Store not initialized' };
    
    const xeniaPath = store.get('xeniaPath');
    const launchMethod = store.get('linuxLaunchMethod') || 'native'; 
    
    if (!xeniaPath) return { path: null, error: "Xenia path not set" };

    try {
        const platform = require('os').platform();
        let configPath;

        if (platform === 'linux' && launchMethod === 'native') {
            const os = require('os');
            configPath = path.join(os.homedir(), '.local', 'share', 'Xenia', 'xenia-canary.config.toml');
            
            const configDir = path.dirname(configPath);
            if (!fsSync.existsSync(configDir)) {
                await fs.mkdir(configDir, { recursive: true });
            }
        } else {
      
            configPath = path.join(path.dirname(xeniaPath), 'xenia-canary.config.toml');
        }

     
        if (!(await checkPathExistsAsync(configPath))) {
            console.log(`[Config] Creating new config file at: ${configPath}`);
            await fs.writeFile(configPath, '# Xenia Canary Config File\n');
        }

        return { path: configPath, error: null };
    } catch (e) {
        console.error(`[Config Error] ${e.message}`);
        return { path: null, error: e.message };
    }
}
async function getXeniaPatchesPath() {
    if (!store) return { path: null, error: 'Store not initialized', exists: false };
    const xeniaPath = store.get('xeniaPath');
    if (!xeniaPath || xeniaPath.startsWith('Click "Select"')) {
        return { path: null, error: "Xenia path not set", exists: false };
    }
    try {
        const xeniaDir = path.dirname(xeniaPath);
        const patchesPath = path.join(xeniaDir, 'patches');
        const exists = await checkPathExistsAsync(patchesPath);
        return { path: patchesPath, error: null, exists: exists };
    } catch (e) {
        return { path: null, error: e.message, exists: false };
    }
}
function normalizeName(str) {
    if (!str) return '';
    return str.toLowerCase().replace(/[^a-z0-9]/gi, ''); 
}
function levenshtein(a, b) {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) matrix[i][j] = matrix[i - 1][j - 1];
            else matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
        }
    }
    return matrix[b.length][a.length];
}
function getHexFromFilename(fileName) {
    const match = /([0-9a-fA-F]{8})/.exec(fileName);
    if (match && match[1]) return match[1].toUpperCase();
    return null;
}
async function scanSinglePatchDir(dirPath) {
    const patchMap = {}; 
    const nameIndex = [];
    try {
        if (!(await checkPathExistsAsync(dirPath))) return { patchMap, nameIndex };
        const files = await fs.readdir(dirPath);
        for (const file of files) {
            if (file.endsWith('.patch.toml')) {
                const match = /([0-9a-fA-F]{8})/.exec(file);
                if (match && match[1]) {
                    const titleID = match[1].toUpperCase();
                    
                    
                    if (!patchMap[titleID]) {
                        patchMap[titleID] = [];
                    }
                    
                    patchMap[titleID].push(file);

                    const cleanName = normalizeName(file.replace('.patch.toml', '').replace(titleID, ''));
                    if (cleanName.length > 2) nameIndex.push({ titleID: titleID, cleanName: cleanName, fileName: file });
                }
            }
        }
    } catch (error) { console.warn(`[Patches] Warning: Failed to scan dir ${dirPath}: ${error.message}`); }
    return { patchMap, nameIndex };
}

async function ensureCacheDirs() {
    try {
        if (!fsSync.existsSync(CACHE_DIR)) fsSync.mkdirSync(CACHE_DIR, { recursive: true });
        if (!fsSync.existsSync(ART_DIR)) fsSync.mkdirSync(ART_DIR, { recursive: true });
        if (!fsSync.existsSync(CACHE_FILE)) fsSync.writeFileSync(CACHE_FILE, JSON.stringify({}));
        if (!fsSync.existsSync(ACHIEVEMENTS_DIR)) { fsSync.mkdirSync(ACHIEVEMENTS_DIR, { recursive: true });
}


        const binPath = path.join(CONFIG_DIR, 'assets', 'bin');
        const winBinPath = path.join(binPath, 'win');
        const linuxBinPath = path.join(binPath, 'linux');

        if (!fsSync.existsSync(winBinPath)) {
            fsSync.mkdirSync(winBinPath, { recursive: true });
            console.log(`[System] Created: ${winBinPath}`);
        }
        
        if (!fsSync.existsSync(linuxBinPath)) {
            fsSync.mkdirSync(linuxBinPath, { recursive: true });
            console.log(`[System] Created: ${linuxBinPath}`);
        }
        
    } catch (err) {
        console.error('[CRITICAL ERROR] Cannot write to app directory. Check permissions!', err);
        dialog.showErrorBox('Permission Error', 'Cannot write to app directory. Please move the app to a folder with write permissions.');
        app.quit();
    }
}
async function loadCache() {
    try {
        if (!fsSync.existsSync(CACHE_FILE)) return {};
        const data = await fs.readFile(CACHE_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (e) { console.error('Cache corrupted, resetting:', e); return {}; }
}
async function saveCache(cacheData) {
    try {
        await fs.writeFile(CACHE_FILE, JSON.stringify(cacheData, null, 2));
    } catch (e) { console.error('Failed to save cache:', e); }
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1920,
        height: 1080,
        fullscreen: true,
        icon: appIcon,
        title: "Xenia Dashboard",
        autoHideMenuBar: true,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            preload: path.join(__dirname, 'preload.js'),
            webSecurity: false,
        }
    });

    mainWindow.on('blur', () => {
        isAppFocused = false;
        console.log('[Window] Lost focus - Gamepad input suspended.');
        mainWindow.webContents.send('window-blur');
    });

    mainWindow.on('focus', () => {
        isAppFocused = true;
        console.log('[Window] Gained focus - Gamepad input resumed.');
        mainWindow.webContents.send('window-focus');
    });

    mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

async function _scanAllPatchesInternal() {
    try {
        let finalPatchMap = {};
        let finalNameIndex = [];

        const mergeResults = (sourceMap, sourceIndex) => {
            finalNameIndex = [...finalNameIndex, ...sourceIndex];
            
            for (const [id, files] of Object.entries(sourceMap)) {
                if (finalPatchMap[id]) {
                    const existingSet = new Set(finalPatchMap[id]);
                    files.forEach(f => existingSet.add(f));
                    finalPatchMap[id] = Array.from(existingSet);
                } else {
                    finalPatchMap[id] = files;
                }
            }
        };

        const dynamicDirResult = await getXeniaPatchesPath();
        if (dynamicDirResult.path && dynamicDirResult.exists) {
            console.log(`[Patches] Scanning User Path: ${dynamicDirResult.path}`);
            const { patchMap, nameIndex } = await scanSinglePatchDir(dynamicDirResult.path);
            mergeResults(patchMap, nameIndex);
        }

        const externalWinPatches = path.join(CONFIG_DIR, 'assets', 'xenia-win', 'patches');
        const externalLinuxPatches = path.join(CONFIG_DIR, 'assets', 'xenia-linux', 'patches');

        if (fsSync.existsSync(externalWinPatches)) {
            const { patchMap, nameIndex } = await scanSinglePatchDir(externalWinPatches);
            mergeResults(patchMap, nameIndex);
        }

        if (fsSync.existsSync(externalLinuxPatches)) {
            const { patchMap, nameIndex } = await scanSinglePatchDir(externalLinuxPatches);
            mergeResults(patchMap, nameIndex);
        }

        console.log(`[Patches] Total games with patches found: ${Object.keys(finalPatchMap).length}`);
        return { patchMap: finalPatchMap, nameIndex: finalNameIndex };

    } catch (error) {
        console.error('[Patches] Scan Error:', error.message);
        return { patchMap: {}, nameIndex: [] };
    }
}

async function _resolveTitleIDInternal(gameFilePath, game, options) {
    const nameIndex = options.nameIndex || [];
    if (game.titleID && /^[0-9a-fA-F]{8}$/.test(game.titleID)) {
        return { titleID: game.titleID, source: 'cache' };
    }
    const idFromFilename = getHexFromFilename(game.name);
    if (idFromFilename) {
        return { titleID: idFromFilename, source: 'filename' };
    }
    const idFromFileScan = await readTitleIDFromFile(gameFilePath);
    if (idFromFileScan) {
        return { titleID: idFromFileScan, source: 'file-scan (abgx360)' };
    }
    const gameNameClean = normalizeName(game.name);
    if (gameNameClean.length > 2 && nameIndex.length > 0) {
        let bestMatch = null;
        let bestScore = Infinity;
        for (const patch of nameIndex) {
            const score = levenshtein(gameNameClean, patch.cleanName);
            const similarity = 1 - (score / Math.max(gameNameClean.length, patch.cleanName.length));
            if (similarity > 0.6 && score < bestScore) { 
                bestScore = score;
                bestMatch = patch;
            }
        }
        if (bestMatch) {
            return { titleID: bestMatch.titleID, source: 'fuzzy-name' };
        }
    }
    return { titleID: null, source: 'none' };
}


function runPythonScript(scriptName, args = []) {
    return new Promise((resolve, reject) => {
        const platform = require('os').platform();
        
        const nameClean = scriptName.replace('.py', '');
        const binaryName = platform === 'win32' ? `${nameClean}.exe` : nameClean;
        const osFolder = platform === 'win32' ? 'win' : 'linux'; 

        let binaryPath;
        
   
        if (app.isPackaged) {
            
            const appPath = app.getAppPath();
            const unpackedPath = appPath.replace('app.asar', 'app.asar.unpacked');
            binaryPath = path.join(unpackedPath, 'assets', 'bin', osFolder, binaryName);
        } else {
            
            binaryPath = path.join(__dirname, 'assets', 'bin', osFolder, binaryName);
        }

        console.log(`[Python Process] Target Binary: ${binaryPath}`);

        
        if (!fsSync.existsSync(binaryPath)) {
            console.error(`[Python Process] Binary NOT found at: ${binaryPath}`);
            return reject(new Error(`Binary executable not found: ${binaryName} in folder ${osFolder}`));
        }

        
        if (platform !== 'win32') {
            try { 
                fsSync.chmodSync(binaryPath, 0o755); 
            } catch (e) { 
                console.log('[Python Process] chmod skipped.');
            }
        }

        const processCmd = binaryPath;
        const processArgs = args;

        console.log(`[Python Process] Spawning: ${processCmd}`);
        
        const pyProc = spawn(processCmd, processArgs);
        
        let stdoutData = '';
        let stderrData = '';

        pyProc.stdout.on('data', (data) => {
            stdoutData += data.toString();
        });

        pyProc.stderr.on('data', (data) => {
            stderrData += data.toString();
        });

        pyProc.on('close', (code) => {
            if (code !== 0) {
                 console.error(`[Python Process] Failed with code ${code}: ${stderrData}`);
                 return reject(new Error(stderrData || `Process exited with code ${code}`));
            }

            try {
                if (!stdoutData.trim()) return resolve({ success: true }); 
                const result = JSON.parse(stdoutData);
                resolve(result);
            } catch (e) {
                resolve({ success: true, raw: stdoutData });
            }
        });

        pyProc.on('error', (err) => {
            console.error('[Python Process Spawn Error]', err);
            reject(new Error(`Failed to spawn process: ${err.message}`));
        });
    });
}


function startControllerService() {
    console.log('[Controller Service] Starting controller service...');
    
    const binaryPath = getBinaryPath('controller_service');


    const spawnOptions = {
        stdio: ['pipe', 'pipe', 'pipe'], 
        windowsHide: true 
    };

    if (fsSync.existsSync(binaryPath)) {
        console.log(`[Controller Service] Launching Binary from: ${binaryPath}`);
        
        if (process.platform !== 'win32') {
            try { 
                fsSync.chmodSync(binaryPath, 0o755); 
            } catch (e) { 
                if (e.code !== 'EROFS') console.warn('Chmod warning:', e.message); 
            }
        }

        controllerProcess = spawn(binaryPath, [], spawnOptions);
    } else {
        console.log(`[Controller Service] Binary not found. Falling back to Python script.`);
        const pyCommand = process.platform === 'win32' ? 'python' : 'python3';
        controllerProcess = spawn(pyCommand, [scriptPath], spawnOptions);
    }


    if (controllerProcess && controllerProcess.stdin) {
        controllerProcess.stdin.write('INIT_WATCHDOG\n');
    }

    let buffer = "";

controllerProcess.stdout.on('data', (data) => {
        buffer += data.toString();
        let lines = buffer.split('\n');
        buffer = lines.pop(); 

        for (const line of lines) {
            if (line.trim() === "") continue;
            try {
                const message = JSON.parse(line);
                
                if (message.status === 'error') {
                    console.error(`[Controller Service] ${message.message}`);
                } else if (message.status === 'info') {
                    console.log(`[Controller Service] ${message.message}`);
                }
                else if (message.event) {
                    if (isGameRunning || !isAppFocused) continue; 
                    
                    if (mainWindow) {
                        mainWindow.webContents.send('gamepad-input', message);
                    }
                }
            } catch (e) {
            }
        }
    });

    controllerProcess.stderr.on('data', (data) => {
        const msg = data.toString();
        if (!msg.includes("JoyConnection")) { 
            console.error(`[Controller Service STDErr] ${msg}`);
        }
    });

    controllerProcess.on('close', (code) => {
        console.log(`[Controller Service] Process stopped (Code: ${code}).`);
        if (!isGameRunning && code !== 0 && code !== null) {
             console.log(`[Controller Service] Restarting in 5s...`);
             setTimeout(startControllerService, 5000);
        }
    });
    
    controllerProcess.on('error', (err) => {
        console.error('[Controller Service] Failed to spawn process:', err.message);
    });
}

function restartControllerService() {
    console.log('[Controller Service] Attempting to restart controller service...');
    
    if (controllerProcess) {
        controllerProcess.kill('SIGKILL'); 
        controllerProcess = null;
    }
    
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('controller-re-enabled');
    }
    
    setTimeout(() => {
        startControllerService();
    }, 1500); 
}

function sendProgress(payload) {
    if (mainWindow && !mainWindow.isDestroyed()) {
        const data = typeof payload === 'string' 
            ? { status: payload, percentage: 0 } 
            : payload;
            
        mainWindow.webContents.send('download-progress', data);
    }
}


function registerIpcHandlers() {
    console.log('[Debug Main] Registering IPC Handlers...');

    ipcMain.handle('join-paths', (event, ...paths) => {
        return path.join(...paths);
    });
     ipcMain.handle('openImageFile', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
            { name: 'Images', extensions: ['jpg', 'png', 'gif', 'webp', 'jpeg', 'bmp'] }
        ]
    });
    return canceled ? null : filePaths[0];
});

ipcMain.handle('scan-zar-titleid', async (event, gamePath) => {
    const platform = require('os').platform();
    const xeniaPath = store.get('xeniaPath');
    const launchMethod = store.get('linuxLaunchMethod', 'native'); 
    const artSource = store.get('artSource') || 'LocalDB';
    
    if (!xeniaPath || !fsSync.existsSync(xeniaPath)) {
        return { success: false, error: "Xenia path not set" };
    }

    const xeniaDir = path.dirname(xeniaPath);
    const logPath = path.join(xeniaDir, 'xenia.log');

    try { if (fsSync.existsSync(logPath)) await fs.unlink(logPath); } catch (e) {}

    return new Promise(async (resolve) => {
        let xeniaProcess = null;

        try {

            if (platform === 'win32') {
                xeniaProcess = spawn(xeniaPath, [gamePath], { detached: false });
            } 
            else if (platform === 'linux') {
                if (launchMethod === 'native') {
                    try { await fsSync.promises.chmod(xeniaPath, 0o755); } catch (e) {}
                    xeniaProcess = spawn(xeniaPath, [gamePath], { detached: false });
                } 
                else if (launchMethod === 'wine') {
                    xeniaProcess = spawn('wine', [xeniaPath, gamePath], { detached: false });
                } 
                else if (launchMethod === 'proton') {
                    const protonPath = store.get('protonPath');
                    const compatDataPath = path.join(CONFIG_DIR, 'proton_compat_data'); 
                    if (!fsSync.existsSync(compatDataPath)) fsSync.mkdirSync(compatDataPath, { recursive: true }); 
                    
                    const steamInstallPath = path.dirname(path.dirname(path.dirname(protonPath))); 
                    const protonEnv = {
                        ...process.env, 
                        'STEAM_COMPAT_DATA_PATH': compatDataPath, 
                        'STEAM_COMPAT_CLIENT_INSTALL_PATH': steamInstallPath
                    };

                    const command = `"${protonPath}" run "${xeniaPath}" "${gamePath}"`;
                    xeniaProcess = exec(command, { env: protonEnv });
                }
            }

            setTimeout(async () => {

                if (xeniaProcess) {
                    try { xeniaProcess.kill('SIGKILL'); } catch (e) {}
                }

                if (platform === 'linux') {
                    try {

                        exec('pkill -9 -f xenia_canary');
                    } catch (e) {}
                }

                setTimeout(async () => {
                    try {
                        if (!fsSync.existsSync(logPath)) return resolve({ success: false, error: "Log file not created" });

                        const logContent = await fsSync.promises.readFile(logPath, 'utf-8');
                        const match = logContent.match(/Title ID:\s*([0-9A-F]{8})/i);

                        if (match && match[1]) {
                            const titleID = match[1].toUpperCase();
                            const fileName = path.basename(gamePath);
                            const gameNameOnly = path.basename(fileName, path.extname(fileName));

                            // تحديث الملفات والكاش (نفس المنطق السابق)
                            let zarData = {};
                            if (fsSync.existsSync(ZAR_MAPPING_FILE)) {
                                zarData = JSON.parse(await fsSync.promises.readFile(ZAR_MAPPING_FILE, 'utf-8'));
                            }
                            zarData[fileName] = { "Title ID": titleID };
                            await fsSync.promises.writeFile(ZAR_MAPPING_FILE, JSON.stringify(zarData, null, 4));

                            const cache = await loadCache();
                            let gameArt = { coverUrl: '', heroUrl: '', logoUrl: '', iconUrl: '' };

                            if (artSource === 'LocalDB' && localGameDB[titleID]) {
                                const dbData = localGameDB[titleID];
                                gameArt.coverUrl = await ensureLocalImage(dbData.artwork.boxart, 'cover', gameNameOnly);
                                gameArt.heroUrl = await ensureLocalImage(dbData.artwork.background, 'hero', gameNameOnly);
                                gameArt.logoUrl = await ensureLocalImage(dbData.artwork.banner, 'logo', gameNameOnly);
                                gameArt.iconUrl = await ensureLocalImage(dbData.artwork.icon, 'icon', gameNameOnly);
                            } 
                            
                            cache[fileName] = { ...gameArt, titleID: titleID };
                            await saveCache(cache);

                            if (artSource === 'SteamGridDB') {
                                const apiKey = store.get('steamGridDBKey');
                                if (apiKey) fetchGamesInBackground([{ originalName: fileName, cleanName: cleanGameName(gameNameOnly) }], apiKey, cache);
                            }

                            resolve({ success: true, titleID: titleID, art: gameArt });
                        } else {
                            resolve({ success: false, error: "Title ID not found" });
                        }
                    } catch (err) {
                        resolve({ success: false, error: err.message });
                    }
                }, 1000); 
            }, 5000);

        } catch (err) {
            resolve({ success: false, error: err.message });
        }
    });
});


async function ensureCacheDirs() {
    try {
        if (!fsSync.existsSync(CACHE_DIR)) fsSync.mkdirSync(CACHE_DIR, { recursive: true });
        
        const binPath = path.join(CONFIG_DIR, 'assets', 'bin');
        const winPath = path.join(binPath, 'win');
        const linuxPath = path.join(binPath, 'linux');

        [winPath, linuxPath].forEach(p => {
            if (!fsSync.existsSync(p)) fsSync.mkdirSync(p, { recursive: true });
        });
    } catch (err) { console.error('Error creating dirs:', err); }
}

ipcMain.handle('check-abgx-status', async () => {
    const platform = require('os').platform();
    const abgxPath = getBinaryPath('abgx360'); 
    const exists = fsSync.existsSync(abgxPath);
    
    return {
        exists: exists,
        winUrl: 'https://www.hadzz.com/abgx/download.php',
        linuxUrl: 'https://www.hadzz.com/abgx/download.php'
    };
});

ipcMain.handle('loadLocales', async () => {
    try {
        const possiblePaths = [
            path.join(CONFIG_DIR, 'data', 'locales.json'),
            
            path.join(process.resourcesPath, 'data', 'locales.json'),
            
            path.join(__dirname, 'data', 'locales.json')
        ];

        let finalPath = null;
        for (const p of possiblePaths) {
            if (fsSync.existsSync(p)) {
                finalPath = p;
                console.log(`[Locales] Loaded from: ${finalPath}`);
                break;
            }
        }

        if (!finalPath) {
            throw new Error("locales.json not found in any expected location.");
        }

        const data = await fs.readFile(finalPath, 'utf-8');
        return { success: true, data: JSON.parse(data) };
    } catch (error) {
        console.error("[Locales] Error loading languages:", error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('launch-xenia-dashboard', async (event, xeniaPath) => {
    const platform = require('os').platform();
    const fsPromises = require('fs').promises;

    console.log(`[Dashboard Launcher] Opening Xenia without game...`);

    if (isGameRunning && currentXeniaProcess) {
        console.log("[Dashboard Launcher] Killing running game...");
        try {
            currentXeniaProcess.kill('SIGKILL');
            await new Promise(resolve => setTimeout(resolve, 1000));
            isGameRunning = false;
            currentXeniaProcess = null;
        } catch (e) {
            console.error("[Dashboard Launcher] Failed to kill process:", e);
        }
    }

    try {
        if (platform === 'win32') {
            currentXeniaProcess = spawn(xeniaPath, [], { 
                detached: true,
                stdio: 'ignore'
            });
        } 
        else if (platform === 'linux') {
            const launchMethod = store.get('linuxLaunchMethod', 'native'); 
            
            if (launchMethod === 'native') {
                try { await fsPromises.chmod(xeniaPath, 0o755); } catch (e) {}
                currentXeniaProcess = spawn(xeniaPath, [], { detached: true, stdio: 'ignore' });
            } 
            else if (launchMethod === 'wine') {
                currentXeniaProcess = spawn('wine', [xeniaPath], { detached: true, stdio: 'ignore' });
            } 
            else if (launchMethod === 'proton') {
                const protonPath = store.get('protonPath');
                if (!protonPath || !fsSync.existsSync(protonPath)) {
                    return { success: false, error: "Proton path not set or not found." };
                }

                const compatDataPath = path.join(CONFIG_DIR, 'proton_compat_data'); 
                if (!fsSync.existsSync(compatDataPath)) fsSync.mkdirSync(compatDataPath, { recursive: true }); 

                const steamInstallPath = path.dirname(path.dirname(path.dirname(protonPath))); 
                
                const protonEnv = {
                    ...process.env, 
                    'STEAM_COMPAT_DATA_PATH': compatDataPath, 
                    'STEAM_COMPAT_CLIENT_INSTALL_PATH': steamInstallPath
                };

                const command = `"${protonPath}" run "${xeniaPath}"`;
                console.log(`[Game Launcher] Executing (Proton): ${command}`);

                currentXeniaProcess = exec(command, { env: protonEnv });
            }
        }

        if (currentXeniaProcess) {
            currentXeniaProcess.on('spawn', () => {
                isGameRunning = true;
                mainWindow.webContents.send('game-started'); 
                console.log('[Game Launcher] Xenia process started...');
            });

            currentXeniaProcess.on('close', (code) => {
                isGameRunning = false;
                currentXeniaProcess = null;
                mainWindow.webContents.send('game-stopped'); 
                restartControllerService();
            });
        }
        
        return { success: true };

    } catch (error) {
        console.error(`[Dashboard Launcher] Error: ${error.message}`);
        return { success: false, error: error.message };
    }
});
ipcMain.handle('launchGame', async (event, xeniaPath, gamePath, titleID) => { 
    const platform = require('os').platform();
    const fsPromises = require('fs').promises;

    console.log(`[Game Launcher] Request to launch: ${path.basename(gamePath)}`);


    if (isGameRunning && currentXeniaProcess) {
        console.log("[Game Launcher] Another game is running. Killing it to switch...");
        try {
            currentXeniaProcess.kill('SIGKILL'); 
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            isGameRunning = false;
            currentXeniaProcess = null;
            console.log("[Game Launcher] Old process killed. Starting new game...");
        } catch (e) {
            console.error("[Game Launcher] Failed to kill existing process:", e);
        }
    }
 

    try {

        const args = [gamePath]; 
        
        if (titleID) {
            const xeniaDir = path.dirname(xeniaPath);
            const customConfigPath = path.join(xeniaDir, 'config', `${titleID}.config.toml`);
            
            if (fsSync.existsSync(customConfigPath)) {
                console.log(`[Game Launcher] 🎯 Applying custom config: ${customConfigPath}`);
                args.push('--config');
                args.push(customConfigPath);
            }
        }
        

        if (platform === 'win32') {
            console.log(`[Game Launcher] Spawning: ${xeniaPath} ${args.join(' ')}`);
            currentXeniaProcess = spawn(xeniaPath, args, { 
                detached: true,
                stdio: 'ignore'
            });
        } 
        else if (platform === 'linux') {
            const launchMethod = store.get('linuxLaunchMethod', 'native'); 
            
            if (launchMethod === 'native') {
                try { await fsPromises.chmod(xeniaPath, 0o755); } catch (e) { console.warn(`[Game Launcher] Failed to chmod: ${e.message}`); }
                console.log(`[Game Launcher] Spawning: ${xeniaPath} ${args.join(' ')}`);
                
                currentXeniaProcess = spawn(xeniaPath, args, { 
                    detached: true,
                    stdio: 'ignore'
                });

            } else if (launchMethod === 'wine') {
                console.log(`[Game Launcher] Spawning: wine ${xeniaPath} ${args.join(' ')}`);
                currentXeniaProcess = spawn('wine', [xeniaPath, ...args], { 
                    detached: true,
                    stdio: 'ignore'
                });

            } else if (launchMethod === 'proton') {
                const protonPath = store.get('protonPath');
                if (!protonPath || !fsSync.existsSync(protonPath)) {
                    return { success: false, error: "Proton path not set or not found." };
                }

                const compatDataPath = path.join(CONFIG_DIR, 'proton_compat_data'); 
                if (!fsSync.existsSync(compatDataPath)) fsSync.mkdirSync(compatDataPath, { recursive: true }); 

                const steamInstallPath = path.dirname(path.dirname(path.dirname(protonPath))); 
                
                const protonEnv = {
                    ...process.env, 
                    'STEAM_COMPAT_DATA_PATH': compatDataPath, 
                    'STEAM_COMPAT_CLIENT_INSTALL_PATH': steamInstallPath
                };
                
                
                let argString = `"${gamePath}"`; 
                if (args.length > 1) { 
                     argString += ` --config "${args[2]}"`;
                }

                const command = `"${protonPath}" run "${xeniaPath}" ${argString}`;
                console.log(`[Game Launcher] Executing (Proton): ${command}`);

                currentXeniaProcess = exec(command, { env: protonEnv });
                
                isGameRunning = true; 
                currentXeniaProcess.on('close', (code) => {
                    if (!isGameRunning) return; 
                    isGameRunning = false;
                    currentXeniaProcess = null;
                    console.log(`[Game Launcher] Proton process closed (Code: ${code}).`);
                    restartControllerService();
                });
                
                return { success: true };
            } else {
                return { success: false, error: `Unknown linuxLaunchMethod: ${launchMethod}` };
            }
        } else {
            return { success: false, error: `Unsupported platform: ${platform}` };
        }

        if (currentXeniaProcess) {
            currentXeniaProcess.on('spawn', () => {
                isGameRunning = true;
                console.log('[Game Launcher] Xenia process started. Controller input to dashboard is BLOCKED.');
            });

            currentXeniaProcess.on('close', (code) => {
                console.log(`[Game Launcher] Xenia process closed (Code: ${code}). Restoring Input.`);
                isGameRunning = false;
                currentXeniaProcess = null;
                restartControllerService();
            });

            currentXeniaProcess.on('error', (err) => {
                isGameRunning = false;
                currentXeniaProcess = null;
                console.error(`[Game Launcher] Failed to start Xenia process: ${err.message}`);
                restartControllerService();
            });
        }
        
        return { success: true };

    } catch (error) {
        console.error(`[Game Launcher] Critical error: ${error.message}`);
        isGameRunning = false;
        currentXeniaProcess = null;
        return { success: false, error: error.message };
    }
});

    ipcMain.handle('openAudioFile', async () => {
        const { canceled, filePaths } = await dialog.showOpenDialog({
            properties: ['openFile'],
            filters: [
                { name: 'Audio Files', extensions: ['wav', 'mp3', 'ogg', 'm4a'] }
            ]
        });
        return canceled ? null : filePaths[0];
    });

    ipcMain.handle('loadLayout', async (event, viewName) => {
        try {
            const currentTheme = store.get('currentTheme') || 'NXE-2008';
            let filePath;
            const themePath = path.join(__dirname, 'layouts', currentTheme, `${viewName}.html`);
            const basePath = path.join(__dirname, 'layouts', `${viewName}.html`);
            if (fsSync.existsSync(themePath)) filePath = themePath;
            else if (fsSync.existsSync(basePath)) filePath = basePath;
            else throw new Error(`Layout file not found in theme or base: ${viewName}.html`);
            const html = await fs.readFile(filePath, 'utf-8');
            return { success: true, html };
        } catch (error) {
            return { success: false, error: error.message, html: `<h1>Error loading ${viewName}</h1>` };
        }
    });
    ipcMain.handle('loadDashboardData', async () => {
        try {
            const possiblePaths = [
                path.join(process.resourcesPath, 'data', 'dashboard-data.json'),
                path.join(__dirname, 'data', 'dashboard-data.json'),
                path.join(CONFIG_DIR, 'data', 'dashboard-data.json')
            ];

            let finalPath = null;
            for (const p of possiblePaths) {
                if (fsSync.existsSync(p)) {
                    finalPath = p;
                    break;
                }
            }

            if (!finalPath) {
                throw new Error("dashboard-data.json not found inside app or external folder.");
            }

            console.log(`[Dashboard Data] Loading from: ${finalPath}`);
            const data = await fs.readFile(finalPath, 'utf-8');
            return { success: true, data: JSON.parse(data) };

        } catch (error) {
            console.error("[Dashboard Data Error]", error); 
            return { success: false, error: error.message };
        }
    });
    
    ipcMain.handle('get', (event, key) => store.get(key));
    ipcMain.handle('set', (event, key, value) => store.set(key, value));
    
    ipcMain.handle('checkPathExists', (event, checkPath) => {
        return checkPathExistsAsync(checkPath);
    });
    
    ipcMain.handle('openFile', async () => {
        const { canceled, filePaths } = await dialog.showOpenDialog({ properties: ['openFile'] });
        return canceled ? null : filePaths[0];
    });
    ipcMain.handle('openDirectory', async () => {
        const { canceled, filePaths } = await dialog.showOpenDialog({ properties: ['openDirectory'] });
        return canceled ? null : filePaths[0];
    });
    
    ipcMain.handle('openFileInDefaultApp', async (event, fileKey) => {
        try {
            let filePath;
            if (fileKey === 'config') {
                const configResult = await getXeniaConfigPath(); 
                if (configResult.error) return { success: false, error: configResult.error };
                filePath = configResult.path;
            }
            if (filePath && fsSync.existsSync(filePath)) { 
                await shell.openPath(filePath);
                return { success: true };
            }
            return { success: false, error: "File not found" };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

function forceExitApp() {
    console.log('[System] Initiating forceful shutdown...');

    if (controllerProcess) {
        try {
            controllerProcess.kill('SIGKILL'); 
        } catch (e) {
            console.error('[Cleanup] Controller kill error:', e.message);
        }
    }

    if (currentXeniaProcess) {
        try {
            currentXeniaProcess.kill('SIGKILL');
        } catch (e) {
            console.error('[Cleanup] Xenia kill error:', e.message);
        }
    }

    if (process.platform === 'linux') {
        try {
            const { execSync } = require('child_process');
            execSync('pkill -9 -f xenia_canary || true');
            execSync('pkill -9 -f controller_service || true');
        } catch (e) {}
    }

    app.exit(0); 
}

ipcMain.handle('quit-app', () => {
    forceExitApp();
});


async function ensureLocalImage(url, type, gameName) {
    if (!url || !url.startsWith('http')) return ''; 

    try {
        const safeName = normalizeName(gameName).replace(/ /g, '_'); 
        const ext = path.extname(url) || '.jpg'; 
        const fileName = `${safeName}-${type}${ext}`;
        const localPath = path.join(ART_DIR, fileName);

        if (fsSync.existsSync(localPath)) {
            return `app-art://${fileName}`;
        }

        console.log(`[LocalDB] Downloading ${type} for: ${gameName}`);
        const response = await axios({ url, method: 'GET', responseType: 'stream' });
        
        const writer = fsSync.createWriteStream(localPath);
        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        return `app-art://${fileName}`;

    } catch (e) {
        console.warn(`[LocalDB] Failed to download ${type}: ${e.message}`);
        return ''; 
    }
}


ipcMain.handle('scanForGames', async () => {
    const { patchMap, nameIndex } = await _scanAllPatchesInternal();
    const gameFolder = store.get('gameFolderPath');
    const folderExists = await checkPathExistsAsync(gameFolder);
    
    if (!gameFolder || !folderExists) {
         return { success: true, games: [] };
    }
    
    const artSource = store.get('artSource') || 'LocalDB';
    const cache = await loadCache();
    const newCache = { ...cache };
    const gameList = [];
    const gamesToFetch = [];
    let cacheUpdated = false;

    const CONTENT_TYPES = {
        '00007000': 'Games on Demand',
        '000D0000': 'Xbox Live Arcade'
    };

    try {
        const entries = await fs.readdir(gameFolder, { recursive: true, withFileTypes: true });
        
        for (const entry of entries) {
            const gamePath = path.join(entry.parentPath, entry.name);
            const gameFileName = entry.name;
            let isXBLA = false;
            let detectedTitleID = null;

            const isNormalGame = entry.isFile() && 
                               (entry.name.toLowerCase().endsWith('.iso') || 
                                entry.name.toLowerCase().endsWith('.xex') ||
                                entry.name.toLowerCase().endsWith('.zar'));

            const isHashFile = entry.isFile() && !entry.name.includes('.') && entry.name.length > 15;
            
            if (isHashFile) {
                const pathParts = gamePath.split(path.sep);
                const contentTypeDir = pathParts[pathParts.length - 2];
                const titleIdDir = pathParts[pathParts.length - 3];

                if (CONTENT_TYPES[contentTypeDir] && /^[0-9A-F]{8}$/i.test(titleIdDir)) {
                    isXBLA = true;
                    detectedTitleID = titleIdDir.toUpperCase();
                }
            }

            if (isNormalGame || isXBLA) {
                const cacheKey = gameFileName;
                const gameNameOnly = isXBLA ? "" : path.basename(gameFileName, path.extname(gameFileName));

                let game = {
                    name: gameNameOnly,
                    fileName: gameFileName,
                    path: gamePath,
                    titleID: detectedTitleID || (cache[cacheKey]?.titleID) || null,
                    isArcade: isXBLA
                };

                if (game.titleID) {
                    const cleanID = game.titleID.toUpperCase();
                    if (localGameDB[cleanID]) {
                        game.name = localGameDB[cleanID].title.full;
                    }
                }

                if (!game.name || game.name.trim() === "") {
                    game.name = gameNameOnly || "Unknown Game " + (game.titleID || Math.random().toString(36).substring(7));
                }

                if (!game.name || game.name === "") {
                    game.name = isXBLA ? `Arcade Game [${game.titleID}]` : gameNameOnly;
                }

                const result = isXBLA ? { titleID: game.titleID, source: 'folder' } : await _resolveTitleIDInternal(game.path, game, { nameIndex });
                game.titleID = result.titleID;
                game.patchSource = result.source;
                game.patchFiles = result.titleID ? (patchMap[result.titleID] || []) : [];
                game.patchFileName = game.patchFiles.length > 0 ? game.patchFiles[0] : null;

                if (result.titleID && (!cache[cacheKey] || cache[cacheKey].titleID !== result.titleID)) {
                    newCache[cacheKey] = { ...newCache[cacheKey], titleID: result.titleID };
                    cacheUpdated = true;
                }

                if (cache[cacheKey]?.coverUrl) {
                    game = { ...game, ...cache[cacheKey] };
                } else if (game.titleID && localGameDB[game.titleID]) {
                    const dbData = localGameDB[game.titleID];
                    const artData = {
                        coverUrl: await ensureLocalImage(dbData.artwork.boxart, 'cover', game.name),
                        heroUrl: await ensureLocalImage(dbData.artwork.background, 'hero', game.name),
                        logoUrl: await ensureLocalImage(dbData.artwork.banner, 'logo', game.name),
                        iconUrl: await ensureLocalImage(dbData.artwork.icon, 'icon', game.name)
                    };
                    game = { ...game, ...artData };
                    newCache[cacheKey] = { ...newCache[cacheKey], ...artData, titleID: game.titleID };
                    cacheUpdated = true;
                }

                if (!game.path || !game.name) {
                    console.warn(`[Scanner] Skipping invalid game entry: ${gameFileName}`);
                    continue; 
                }
                gameList.push(game);
            }
        }
        
        if (cacheUpdated) await saveCache(newCache);
        return { success: true, games: gameList };

    } catch (error) {
        console.error('[Scanner] Arcade scan failed:', error);
        return { success: false, error: error.message, games: [] };
    }
});
    ipcMain.handle('scanForThemes', async () => {
        try {
            const dirs = await fs.readdir(path.join(__dirname, 'themes'), { withFileTypes: true });
            return { success: true, themes: dirs.filter(d => d.isDirectory()).map(d => d.name) };
        } catch { return { success: true, themes: [] }; }
    });

    ipcMain.handle('loadTomlConfig', async () => {
        const configResult = await getXeniaConfigPath(); 
        if (configResult.error) {
            return { success: false, error: configResult.error };
        }
        try {
         
            const result = await runPythonScript('patch_manager', ['load_config', configResult.path]);
            if (!result.success) {
                throw new Error(result.error || "Unknown Python error");
            }
            return { success: true, data: result.data };
        } catch (e) {
            return { success: false, error: `Python Load Config Error: ${e.message}` };
        }
    });
   
    ipcMain.handle('saveTomlConfig', async (event, data) => {
        const configResult = await getXeniaConfigPath(); 
        if (configResult.error) {
            return { success: false, error: configResult.error };
        }
        try {
            const configJson = JSON.stringify(data);
            const result = await runPythonScript('patch_manager', [
                'save_config', 
                configResult.path,
                configJson
            ]);
            if (!result.success) {
                throw new Error(result.error || "Unknown Python error during save");
            }
            return { success: true };
        } catch (e) {
            return { success: false, error: `Python Save Config Error: ${e.message}` };
        }
    });




    async function writeVersionFile(targetDir, releaseData) {
        const versionFile = path.join(targetDir, 'version.json');
        const data = {
            tag_name: releaseData.tag_name,
            published_at: releaseData.published_at,
            commit_hash: releaseData.target_commitish,
            install_date: new Date().toISOString()
        };
        await fs.writeFile(versionFile, JSON.stringify(data, null, 2));
    }
    
    ipcMain.handle('check-xenia-update', async (event, platform) => {
        try {
            const folderName = platform === 'win' ? 'xenia-win' : 'xenia-linux';
            const targetDir = path.join(CONFIG_DIR, 'assets', folderName);
            const versionFile = path.join(targetDir, 'version.json');
            const exeName = platform === 'win' ? 'xenia_canary.exe' : 'xenia_canary';
            const exePath = path.join(targetDir, exeName);

         
            const repoUrl = 'https://api.github.com/repos/xenia-canary/xenia-canary-releases/releases/latest';
            const { data: remoteRelease } = await axios.get(repoUrl, {
                headers: { 'User-Agent': 'Xenia-NXE-Launcher' },
                timeout: 5000
            });

            let localData = null;
            let isInstalled = false;
            let isVersionFileExists = false;

            if (fsSync.existsSync(exePath)) {
                isInstalled = true;
            } else if (platform !== 'win') {
                try {
                    if (fsSync.existsSync(targetDir)) {
                        const files = await fs.readdir(targetDir);
                        if (files.some(f => f.includes('xenia') && !f.endsWith('.json'))) isInstalled = true;
                    }
                } catch(e) {}
            }

            if (fsSync.existsSync(versionFile)) {
                try {
                    const localJson = await fs.readFile(versionFile, 'utf-8');
                    localData = JSON.parse(localJson);
                    isVersionFileExists = true;
                } catch (e) { console.warn("Version file corrupted"); }
            }

   
            let status = 'not-installed';
            
            if (!isInstalled && !isVersionFileExists) {
                status = 'not-installed';
            } else if (!isInstalled && isVersionFileExists) {
                status = 'broken-install';
            } else if (isInstalled && !localData) {
                status = 'unknown-version';
            } else {
             
                const remoteTag = remoteRelease.tag_name ? remoteRelease.tag_name.trim() : null;
                const localTag = localData.tag_name ? localData.tag_name.trim() : null;

                console.log(`[Update Check] Local Tag: "${localTag}" | Remote Tag: "${remoteTag}"`);

                if (localTag && remoteTag && localTag !== remoteTag) {
                    status = 'update-available';
                } 
                else {
                    const remoteDate = new Date(remoteRelease.published_at).getTime();
                    const localDate = new Date(localData.published_at).getTime();
                    if (remoteDate > localDate + (60 * 1000)) {
                        status = 'update-available';
                    } else {
                        status = 'up-to-date';
                    }
                }
            }

            return {
                success: true,
                status: status,
                remote: {
                    tag: remoteRelease.tag_name, 
                    date: remoteRelease.published_at,
                    hash: remoteRelease.target_commitish.substring(0, 7)
                },
                local: localData ? {
                    tag: localData.tag_name, 
                    date: localData.published_at,
                    hash: localData.commit_hash ? localData.commit_hash.substring(0, 7) : '???'
                } : null
            };

        } catch (error) {
            console.error('[Update Check Error]', error.message);
            
            if (error.response && error.response.status === 403) {
                return { success: false, error: "GitHub Rate Limit Exceeded. Wait 1 hour." };
            }
            
            return { success: false, error: error.message };
        }
    });

ipcMain.handle('download-xenia', async (event, platform) => {
    const repoUrl = 'https://api.github.com/repos/xenia-canary/xenia-canary-releases/releases/latest';
    const winAssetName = 'xenia_canary_windows.zip';
    const linuxAssetPrefix = 'xenia_canary_linux'; 
    
    const downloadDir = path.join(CONFIG_DIR, 'temp_downloads');
    const folderName = platform === 'win' ? 'xenia-win' : 'xenia-linux';
    const finalTargetDir = path.join(CONFIG_DIR, 'assets', folderName);
    const tempExtractDir = path.join(CONFIG_DIR, 'assets', `${folderName}_temp_update`);
    const binaryName = platform === 'win' ? 'xenia_canary.exe' : 'xenia_canary';

    const downloadType = platform === 'win' ? 'win' : 'linux';

    const sendLocalProgress = (payload) => {
        sendProgress({ ...payload, type: downloadType });
    };

    let downloadPath = '';
    let savedBinaryPath = ''; 

    async function findFileRecursive(dir, filename) {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                const found = await findFileRecursive(fullPath, filename);
                if (found) return found;
            } else if (entry.name === filename) return fullPath;
        }
        return null;
    }

    try {
        
        sendLocalProgress({ status: 'Connecting to GitHub server...', percentage: 0, step: 'connect' });

        const { data: release } = await axios.get(repoUrl, { 
            headers: { 'User-Agent': 'Xenia-NXE-Launcher' },
            timeout: 20000 
        });

        let foundAsset = null;
        if (platform === 'win') foundAsset = release.assets.find(a => a.name === winAssetName);
        else foundAsset = release.assets.find(a => a.name.startsWith(linuxAssetPrefix));

        if (!foundAsset) throw new Error(`Release asset not found for ${platform}`);

        if (!fsSync.existsSync(downloadDir)) await fs.mkdir(downloadDir, { recursive: true });
        downloadPath = path.join(downloadDir, foundAsset.name);
        if (fsSync.existsSync(downloadPath)) await fs.unlink(downloadPath);

        const writer = fsSync.createWriteStream(downloadPath);
        const response = await axios({
            url: foundAsset.browser_download_url, 
            method: 'GET', 
            responseType: 'stream',
            timeout: 20000 
        });

        const totalBytes = parseInt(response.headers['content-length'], 10);
        let downloadedBytes = 0;
        response.data.on('data', (chunk) => {
            downloadedBytes += chunk.length;
            const pct = Math.floor((downloadedBytes / totalBytes) * 100);
            sendLocalProgress({ status: `Downloading package... (${pct}%)`, percentage: pct, step: 'download' });
        });

        response.data.pipe(writer);
        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        sendLocalProgress({ status: 'Extracting files (Unpacking)...', percentage: 100, step: 'extract' });
        
        if (fsSync.existsSync(tempExtractDir)) await fs.rm(tempExtractDir, { recursive: true, force: true });
        await fs.mkdir(tempExtractDir, { recursive: true });

        if (platform === 'win') await decompress(downloadPath, tempExtractDir);
        else await execPromise(`tar -xf "${downloadPath}" -C "${tempExtractDir}"`);

        sendLocalProgress({ status: 'Installing binaries...', percentage: 100, step: 'install' });

        if (!fsSync.existsSync(finalTargetDir)) await fs.mkdir(finalTargetDir, { recursive: true });

        const foundBinaryPath = await findFileRecursive(tempExtractDir, binaryName);
        if (foundBinaryPath) {
            const targetBinaryPath = path.join(finalTargetDir, binaryName);
            if (fsSync.existsSync(targetBinaryPath)) await fs.unlink(targetBinaryPath);
            await fs.copyFile(foundBinaryPath, targetBinaryPath);
            
            store.set('xeniaPath', targetBinaryPath);
            savedBinaryPath = targetBinaryPath;
            console.log(`[Auto-Config] Xenia path automatically set to: ${targetBinaryPath}`);
        } else {
            throw new Error(`Could not find ${binaryName} inside archive!`);
        }

        if (platform !== 'win') {
            sendLocalProgress({ status: 'Setting permissions...', percentage: 100, step: 'config' });
            if (fsSync.existsSync(savedBinaryPath)) await fs.chmod(savedBinaryPath, 0o755);
        }

        sendLocalProgress({ status: 'Cleaning up temporary files...', percentage: 100, step: 'cleanup' });
        await writeVersionFile(finalTargetDir, release);
        await fs.rm(tempExtractDir, { recursive: true, force: true });
        try { await fs.unlink(downloadPath); } catch(e){}

        sendLocalProgress({ status: `Update Complete! (${release.tag_name})`, percentage: 100, step: 'done' });
        return { success: true, newPath: savedBinaryPath };

    } catch (error) {
        console.error('[Download Error]', error);
        let errorMsg = error.message;
        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
            errorMsg = "Connection timed out. Please check your internet.";
        }
        else if (error.response && error.response.status === 403) {
            errorMsg = "GitHub Rate Limit! Please wait 1 hour before downloading again.";
        }
        sendLocalProgress({ status: `Error: ${errorMsg}`, percentage: 0, step: 'error' });
        try { if (fsSync.existsSync(downloadPath)) await fs.unlink(downloadPath); } catch(e){}
        return { success: false, error: errorMsg };
    }
});

    ipcMain.handle('download-patches', async () => {
        const downloadUrl = 'https://github.com/xenia-canary/game-patches/releases/latest/download/game-patches.zip';
        const assetName = 'game-patches.zip';
        const downloadDir = path.join(CONFIG_DIR, 'temp_downloads');
        const downloadPath = path.join(downloadDir, assetName);

        const sendPatchProgress = (payload) => {
            sendProgress({ ...payload, type: 'patches' });
        };

        try {
            const currentXeniaPath = store.get('xeniaPath');
            let targetDirs = [];

            if (currentXeniaPath && !currentXeniaPath.startsWith('Click')) {
                const xeniaDir = path.dirname(currentXeniaPath);
                const patchesDir = path.join(xeniaDir, 'patches');
                targetDirs.push(patchesDir);
                console.log(`[Patches] Target found from settings: ${patchesDir}`);
            } else {
                targetDirs.push(path.join(CONFIG_DIR, 'assets', 'xenia-win', 'patches'));
                targetDirs.push(path.join(CONFIG_DIR, 'assets', 'xenia-linux', 'patches'));
            }

            sendPatchProgress({ status: 'Preparing...', percentage: 0, step: 'connect' });
            if (!fsSync.existsSync(downloadDir)) await fs.mkdir(downloadDir, { recursive: true });

            for (const dir of targetDirs) {
                if (fsSync.existsSync(dir)) {
                    await fs.rm(dir, { recursive: true, force: true });
                }
                await fs.mkdir(dir, { recursive: true });
            }

            sendPatchProgress({ status: `Downloading patches...`, percentage: 0, step: 'download' });
            const writer = fsSync.createWriteStream(downloadPath);
            const response = await axios({
                url: downloadUrl, method: 'GET', responseType: 'stream'
            });

            const totalBytes = parseInt(response.headers['content-length'], 10);
            let downloadedBytes = 0;

            response.data.on('data', (chunk) => {
                downloadedBytes += chunk.length;
                const percentage = Math.floor((downloadedBytes / totalBytes) * 100);
                sendPatchProgress({ status: 'Downloading...', percentage: percentage, step: 'download' });
            });

            response.data.pipe(writer);
            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            sendPatchProgress({ status: 'Installing patches...', percentage: 100, step: 'extract' });
            
            for (const dir of targetDirs) {
                console.log(`[Patches] Extracting to: ${dir}`);
                await decompress(downloadPath, dir, { strip: 1 });
            }

            sendPatchProgress({ status: 'Cleaning up...', percentage: 100, step: 'cleanup' });
            await fs.unlink(downloadPath);
            if (fsSync.existsSync(downloadDir)) await fs.rm(downloadDir, { recursive: true, force: true });

            sendPatchProgress({ status: 'Patches installed successfully!', percentage: 100, step: 'done' });
            return { success: true };

        } catch (error) {
            console.error('[Patches Error]', error.message);
            
            let errorMsg = error.message;
            if (error.response && error.response.status === 403) {
                errorMsg = "GitHub Rate Limit! Please wait.";
            }

            sendPatchProgress({ status: `Error: ${errorMsg}`, percentage: 0, step: 'error' });
            return { success: false, error: errorMsg };
        }
    });
    ipcMain.handle('loadPatchesForGame', async (event, titleID, patchFileName) => {
        
        const dynamicDirResult = await getXeniaPatchesPath();
        
        const possiblePaths = [
            dynamicDirResult.path ? path.join(dynamicDirResult.path, patchFileName) : null,
            
            path.join(CONFIG_DIR, 'assets', 'xenia-win', 'patches', patchFileName),
            path.join(CONFIG_DIR, 'assets', 'xenia-linux', 'patches', patchFileName),

            path.join(__dirname, 'assets', 'xenia-win', 'patches', patchFileName),
            path.join(__dirname, 'assets', 'xenia-linux', 'patches', patchFileName)
        ].filter(p => p !== null);

        let patchFilePath = null;
        
        for (const p of possiblePaths) {
            if (await checkPathExistsAsync(p)) {
                patchFilePath = p;
                break;
            }
        }

        if (patchFilePath === null) {
            return { success: false, error: `Patch file ${patchFileName} not found.` };
        }

        try {
            console.log(`[Patch Loader] Loading patch from: ${patchFilePath}`);
            const result = await runPythonScript('patch_manager', ['load_patches', patchFilePath]);
            
            if (!result.success) {
                throw new Error(result.error || "Unknown Python error");
            }
            
            return { 
                success: true, 
                data: {
                    ...result.header, 
                    patch: result.patches 
                }
            };
        } catch (error) {
            console.error('[Python Load] Error loading game patches:', error.message);
            return { success: false, error: `Python Error: ${error.message}` };
        }
    });
    ipcMain.handle('savePatchState', async (event, titleID, patchName, isEnabled) => {
        console.error("[CRITICAL] 'savePatchState' was called, but is deprecated. Use 'saveAllPatchesForGame'.");
        return { success: false, error: "'savePatchState' is deprecated." };
    });
    ipcMain.handle('saveAllPatchesForGame', async (event, patchFileName, patchList, patchHeader) => {
        const dynamicDirResult = await getXeniaPatchesPath();
        
        const internalWinDir = path.join(__dirname, 'assets', 'xenia-win', 'patches');
        const internalLinuxDir = path.join(__dirname, 'assets', 'xenia-linux', 'patches');
        
        const externalWinDir = path.join(CONFIG_DIR, 'assets', 'xenia-win', 'patches');
        const externalLinuxDir = path.join(CONFIG_DIR, 'assets', 'xenia-linux', 'patches');

        const possiblePaths = [
            dynamicDirResult.path ? path.join(dynamicDirResult.path, patchFileName) : null,
            path.join(externalWinDir, patchFileName),   
            path.join(externalLinuxDir, patchFileName), 
            path.join(internalWinDir, patchFileName),
            path.join(internalLinuxDir, patchFileName)
        ].filter(p => p !== null);

        let patchFilePath = null;
        
        for (const p of possiblePaths) {
            if (await checkPathExistsAsync(p)) {
                patchFilePath = p;
                break;
            }
        }

        if (patchFilePath === null) {
            return { success: false, error: `Patch file ${patchFileName} not found. Cannot save.` };
        }

        const isInternal = patchFilePath.includes(internalWinDir) || patchFilePath.includes(internalLinuxDir);
        const isExternal = patchFilePath.includes(CONFIG_DIR); 
        const isDynamic = dynamicDirResult.path && patchFilePath.includes(dynamicDirResult.path);

        if (isInternal && !isDynamic && !isExternal) {
            if (!dynamicDirResult.path) {
                return { success: false, error: "Xenia path is not set. Cannot copy internal patch to editable location." };
            }
            
            if (!dynamicDirResult.exists) {
                try {
                    await fs.mkdir(dynamicDirResult.path, { recursive: true });
                } catch (mkdirError) {
                     return { success: false, error: `Failed to create 'patches' directory: ${mkdirError.message}` };
                }
            }
            
            const newPath = path.join(dynamicDirResult.path, patchFileName);
            
            if (!(await checkPathExistsAsync(newPath))) {
                 try {
                    await fs.copyFile(patchFilePath, newPath);
                    patchFilePath = newPath; 
                } catch (copyError) {
                    return { success: false, error: `Failed to copy patch: ${copyError.message}` };
                }
            } else {
                patchFilePath = newPath;
            }
        }

        try {
            console.log(`[Patch Save] Saving to: ${patchFilePath}`);
            const patchesJson = JSON.stringify(patchList);
            const headerJson = JSON.stringify(patchHeader);
            
            const result = await runPythonScript('patch_manager', [
                'save_patches',
                patchFilePath,
                patchesJson,
                headerJson
            ]);
            
            if (result.success) {
                console.log(`[Python Save] Successfully saved changes to ${patchFilePath}`);
                return { success: true };
            } else {
                throw new Error(result.error || "Unknown Python error during save");
            }
        } catch (error) {
            console.error('[Python Save] Error saving patch file:', error.message);
            return { success: false, error: `Python Save Error: ${error.message}` };
        }
    });



ipcMain.handle('delete-game', async (event, gamePath) => {
    console.log(`[Delete Handler] Request to delete: ${gamePath}`);
    try {
        if (!gamePath) throw new Error("No file path provided");
        
        if (fsSync.existsSync(gamePath)) {
            await fs.unlink(gamePath);
            console.log(`[Delete Handler] Successfully deleted: ${gamePath}`);
            return { success: true };
        } else {
            return { success: false, error: "File not found" };
        }
    } catch (error) {
        console.error(`[Delete Handler] Error: ${error.message}`);
        return { success: false, error: error.message };
    }
});

}

async function autoCleanupArt() {
    try {
        console.log('[Auto-Cleanup] Checking for orphaned images...');
        
        if (!fsSync.existsSync(CACHE_FILE)) return;
        if (!fsSync.existsSync(ART_DIR)) return;

        const data = await fs.readFile(CACHE_FILE, 'utf-8');
        const cache = JSON.parse(data);
        const validFiles = new Set();

        Object.values(cache).forEach(gameData => {
            ['coverUrl', 'heroUrl', 'logoUrl', 'iconUrl'].forEach(key => {
                const url = gameData[key];
                if (url && typeof url === 'string' && url.startsWith('app-art://')) {
                    const fileName = url.replace('app-art://', '').split('?')[0];
                    validFiles.add(fileName);
                }
            });
        });

        const filesOnDisk = await fs.readdir(ART_DIR);
        let deletedCount = 0;

        for (const file of filesOnDisk) {
            if (file.startsWith('.') || file === 'db.json') continue;

            if (!validFiles.has(file)) {
                await fs.unlink(path.join(ART_DIR, file));
                deletedCount++;
            }
        }
        
        if (deletedCount > 0) {
            console.log(`[Auto-Cleanup] Successfully deleted ${deletedCount} unused images.`);
        }
    } catch (error) {
        console.error('[Auto-Cleanup] Error:', error.message);
    }
}

(async () => {
    try {
        const { default: Store } = await import('electron-store');

        await app.whenReady();
        
        store = new Store({ cwd: CONFIG_DIR, name: 'nxe-user-config' });
        console.log(`[Debug] Config saved to: ${path.join(CONFIG_DIR, 'nxe-user-config.json')}`);
        console.log(`[Debug] Cache saved to: ${CACHE_DIR}`);



        session.defaultSession.protocol.registerFileProtocol('app-art', (req, callback) => {
            try {
                let rawUrl = req.url.replace('app-art://', '');
                let decodedPath = decodeURIComponent(rawUrl).split('?')[0];

                let finalPath = '';


                if (process.platform === 'win32') {
                
                    if (decodedPath.startsWith('/') && /^\/[a-zA-Z]:/.test(decodedPath)) {
                        decodedPath = decodedPath.substring(1);
                    }
                    
                    finalPath = path.normalize(decodedPath);

                    if (!path.isAbsolute(finalPath)) {
                        finalPath = path.join(ART_DIR, path.basename(finalPath));
                    }
                }
                else {
                    finalPath = decodedPath;
                    
                    if (!finalPath.startsWith('/')) {
                        finalPath = path.join(ART_DIR, finalPath);
                    }
                }

                if (fsSync.existsSync(finalPath)) {
                    return callback({ path: finalPath });
                } else {
                    const fallbackPath = path.join(ART_DIR, path.basename(finalPath));
                    if (fsSync.existsSync(fallbackPath)) {
                        return callback({ path: fallbackPath });
                    }
                }

                console.error(`[Protocol] File not found: ${finalPath}`);
                callback({ error: -6 }); 
            } catch (e) {
                console.error('[Protocol] Error:', e);
                callback({ error: -2 });
            }
        });

        await ensureCacheDirs();
        await autoCleanupArt();
        registerIpcHandlers();
        createWindow();
        
        startControllerService();

        app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
    } catch (error) {
        console.error('فشل في تهيئة التطبيق:', error);
        app.quit();
    }
})();

app.on('window-all-closed', () => {
    forceExitApp(); 
});


async function readTitleIDFromFile(gamePath) {
    

    const abgxPath = getBinaryPath('abgx360');

    console.log(`[abgx360] Target Binary Path: ${abgxPath}`);

    if (!fsSync.existsSync(abgxPath)) {
        console.error(`[abgx360] Binary not found at ${abgxPath}. Skipping file scan.`);
        return null;
    }


    if (require('os').platform() !== 'win32') {
        try {
            fsSync.chmodSync(abgxPath, 0o755);
        } catch (chmodError) {
            if (chmodError.code !== 'EROFS') {
                console.warn(`[abgx360] chmod warning: ${chmodError.message}`);
            }
        }
    }

    return new Promise((resolve) => {
        const command = `"${abgxPath}" -vwo "${gamePath}"`;
        
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.warn(`[abgx360] Failed to run on ${gamePath}: ${error.message}`);
                resolve(null);
                return;
            }
            
            const lines = stdout.split('\n');
            for (const line of lines) {
                if (line.includes('Title ID:')) {
                    const match = line.match(/Title ID: *\s*([0-9a-fA-F]{8})/);
                    if (match && match[1]) {
                        console.log(`[abgx360] Found Title ID: ${match[1]} for ${gamePath}`);
                        resolve(match[1].toUpperCase());
                        return;
                    }
                }
            }
            
            console.warn(`[abgx360] Ran successfully but no Title ID found.`);
            resolve(null);
        });
    });
}

ipcMain.handle('deep-scan-game', async (event, gamePath) => {
    const abgxPath = getBinaryPath('abgx360');
    console.log(`[Deep Scan] Starting heavy scan for: ${gamePath}`);

    return new Promise((resolve) => {
        const command = `"${abgxPath}" -p --noverify -v "${gamePath}"`;

        exec(command, { 
            maxBuffer: 1024 * 1024 * 10,
            timeout: 30000 
        }, (error, stdout, stderr) => {
            const output = (stdout || '') + (stderr || '');
            const match = output.match(/Title\s*ID\s*:\s*([0-9A-F]{8})/i);

            if (match && match[1]) {
                const newID = match[1].toUpperCase();
                console.log(`[Deep Scan] 🔥 Success! Found ID: ${newID}`);
                
                updateGameCacheID(gamePath, newID);
                
                resolve({ success: true, titleID: newID });
            } else {
                console.error(`[Deep Scan] Failed to find ID even with verbose mode.`);
                resolve({ success: false, error: "Could not extract ID from this file." });
            }
        });
    });
});

async function updateGameCacheID(gamePath, newID) {
    try {
        const cache = await loadCache();
        const gameName = path.basename(gamePath, path.extname(gamePath));
        
        if (cache[gameName]) {
            cache[gameName].titleID = newID;
        } else {
            cache[gameName] = { titleID: newID };
        }
        await saveCache(cache);
    } catch(e) { console.error("Cache update failed:", e); }
}

function findLocalArt(basePath) {
    const exts = ['.png', '.jpg', '.jpeg'];
    let art = { coverUrl: '', heroUrl: '', logoUrl: '' };
    for (const ext of exts) {
        if (!art.coverUrl && fsSync.existsSync(`${basePath}-cover${ext}`)) art.coverUrl = `app-art://${basePath}-cover${ext}`;
        if (!art.heroUrl && fsSync.existsSync(`${basePath}-hero${ext}`)) art.heroUrl = `app-art://${basePath}-hero${ext}`;
        if (!art.logoUrl && fsSync.existsSync(`${basePath}-logo${ext}`)) art.logoUrl = `app-art://${basePath}-logo${ext}`;
    }
    return art;
}
function cleanGameName(name) {
    return name.replace(/\s*\(.*?\)\s*/g, ' ').replace(/\s*\[.*?\]\s*/g, ' ').trim();
}
async function fetchGamesInBackground(games, apiKey, cache) {
    const newCache = { ...cache };
    let artFetched = false;
    for (const game of games) {
        try {
            const art = await fetchGameArt(game.cleanName, apiKey, game.originalName);
            if (art && (art.coverUrl || art.heroUrl || art.logoUrl || art.iconUrl)) {
                newCache[game.originalName] = art;
                artFetched = true;
            }
        } catch (e) {
            console.error(`[SteamGridDB] Error for ${game.cleanName}: ${e.message}`);
        }
    }
    if (artFetched) {
        await saveCache(newCache);
        console.log('[SteamGridDB] Background fetch complete. Cache updated.');
        if (mainWindow) mainWindow.webContents.send('art-updated');
    }
}
async function fetchGameArt(cleanName, apiKey, originalName) {
    const headers = { 'Authorization': `Bearer ${apiKey}`, 'User-Agent': 'Xbox-NXE-Launcher (v1.0)' };
    try {
        const searchRes = await axios.get(`https://www.steamgriddb.com/api/v2/search/autocomplete/${encodeURIComponent(cleanName)}`, { headers });
        if (!searchRes.data.success || !searchRes.data.data.length) throw new Error('Not found');
        const gameId = searchRes.data.data[0].id;
        const [grid, hero, logo, icon] = await Promise.all([
            axios.get(`https://www.steamgriddb.com/api/v2/grids/game/${gameId}`, { headers }).catch(() => ({ data: { data: [] } })),
            axios.get(`https://www.steamgriddb.com/api/v2/heroes/game/${gameId}`, { headers }).catch(() => ({ data: { data: [] } })),
            axios.get(`https://www.steamgriddb.com/api/v2/logos/game/${gameId}`, { headers }).catch(() => ({ data: { data: [] } })),
            axios.get(`https://www.steamgriddb.com/api/v2/icons/game/${gameId}`, { headers }).catch(() => ({ data: { data: [] } }))
        ]);
        const safeName = originalName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const download = async (url, type) => {
            if (!url) return '';
            try {
                const res = await axios({ url, method: 'GET', responseType: 'stream' });
                const dest = path.join(ART_DIR, `${safeName}-${type}.png`);
                const writer = fsSync.createWriteStream(dest);
                res.data.pipe(writer);
                await new Promise((resolve, reject) => {
                    writer.on('finish', resolve);
                    writer.on('error', reject);
                });
                return `app-art://${path.basename(dest)}`;
            } catch (e) { return ''; }
        };
        return {
            coverUrl: await download(grid.data.data[0]?.url, 'cover'),
            heroUrl: await download(hero.data.data[0]?.url, 'hero'),
            logoUrl: await download(logo.data.data[0]?.url, 'logo'),
            iconUrl: await download(icon.data.data[0]?.url, 'icon')
        };
    } catch (e) { return null; }
}



const CACHE_DATA_DIR = path.join(CONFIG_DIR, 'data');

if (!fsSync.existsSync(CACHE_DATA_DIR)) {
    try { fsSync.mkdirSync(CACHE_DATA_DIR, { recursive: true }); } catch (e) {}
}

const COMPAT_CACHE_FILE = path.join(CACHE_DATA_DIR, 'compatibility_cache.json');
let compatCache = {};

try {
    if (fsSync.existsSync(COMPAT_CACHE_FILE)) {
        compatCache = JSON.parse(fsSync.readFileSync(COMPAT_CACHE_FILE, 'utf-8'));
    }
} catch (e) { console.warn("[Compat] Cache reset"); }

function saveCompatCache() {
    try { fsSync.writeFileSync(COMPAT_CACHE_FILE, JSON.stringify(compatCache, null, 2)); } catch (e) {}
}

async function fetchGameCompatibility(query) {
    if (!query) return { state: 'unknown', tags: [], issues: [] };

    let cleanQuery = query.trim();
    let isTitleID = false;

    const titleIdPattern = /^[0-9A-F]{8}$/i;
    
    if (titleIdPattern.test(cleanQuery)) {
        console.log(`[Compat] 🎯 Searching by ID: ${cleanQuery}`);
        isTitleID = true;
    } else {
        cleanQuery = query
            .replace(/\s*[\(\[].*?[\)\]]/g, "") 
            .replace(/[^a-zA-Z0-9\s\-\:]/g, "") 
            .replace(/\s+/g, " ")               
            .trim();
        console.log(`[Compat] 🔍 Searching by Name: "${cleanQuery}"`);
    }
    

    const CACHE_DURATION = 604800000; 

    const now = Date.now();
    if (compatCache[cleanQuery] && (now - compatCache[cleanQuery].timestamp < CACHE_DURATION)) { 
        return compatCache[cleanQuery].data;
    }

    
    console.log(`[Compat] 🌐 Connecting to GitHub for: "${cleanQuery}" (Live Check)`);

    try {
        const searchUrl = `https://github.com/xenia-canary/game-compatibility/issues?q=is%3Aissue+state%3Aopen+${encodeURIComponent(cleanQuery)}`;
        
        const response = await axios.get(searchUrl, {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml'
            },
            timeout: 15000
        });

        const html = response.data;
        
        const regex = />\s*(state-[a-z]+|supports-[a-z0-9]+|gpu-[a-z0-9\-]+|audio-[a-z0-9\-]+|tech-[a-z0-9\-]+|marketplace-[a-z]+)\s*</g;
        
        let match;
        const foundLabels = [];
        
        while ((match = regex.exec(html)) !== null) {
            const label = match[1].trim(); 
            if (!foundLabels.includes(label)) {
                foundLabels.push(label);
            }
        }

        console.log(`[Compat] Found labels for "${cleanQuery}":`, foundLabels);

        let result = { state: 'unknown', tags: [], issues: [] };
        
        const statePriority = [
            'state-playable', 
            'state-gameplay', 
            'state-menus', 
            'state-title', 
            'state-intro', 
            'state-load',    
            'state-hang',    
            'state-crash', 
            'state-nothing'
        ];

        for (const p of statePriority) {
            if (foundLabels.includes(p)) {
                result.state = p;
                break;
            }
        }

        if (result.state === 'unknown' && foundLabels.length > 0 && isTitleID) {
             const anyState = foundLabels.find(l => l.startsWith('state-'));
             if (anyState) result.state = anyState;
        }

        foundLabels.forEach(label => {
            if (label.startsWith('supports-')) {
                result.tags.push(label.replace('supports-', '')); 
            } else if (label.startsWith('gpu-') || label.startsWith('audio-') || label.startsWith('tech-')) {
                result.issues.push(label);
            }
        });

        compatCache[cleanQuery] = { timestamp: now, data: result };
        saveCompatCache();

        return result;

    } catch (error) {
        console.error(`[Compat] Error fetching: ${error.message}`);
        return { state: 'unknown', tags: [], issues: [] };
    }
}

ipcMain.handle('get-game-compatibility', async (event, query) => {
    return await fetchGameCompatibility(query);
});



ipcMain.handle('manage-game-config', async (event, { action, titleID, data }) => {
    const xeniaPath = store.get('xeniaPath');
    if (!xeniaPath || xeniaPath.startsWith('Click')) {
        return { success: false, error: "Xenia path not set." };
    }

    const xeniaDir = path.dirname(xeniaPath);
    const configDir = path.join(xeniaDir, 'config');
    const globalConfigPath = path.join(xeniaDir, 'xenia-canary.config.toml');
    const gameConfigPath = path.join(configDir, `${titleID}.config.toml`);

    try {
        if (!fsSync.existsSync(configDir)) {
            await fs.mkdir(configDir, { recursive: true });
        }

        if (action === 'load') {
            let targetPath = gameConfigPath;
            let isNewFile = false;

            if (!fsSync.existsSync(gameConfigPath)) {
                if (fsSync.existsSync(globalConfigPath)) {
                    console.log(`[Game Config] Creating new config for ${titleID} from base.`);
                    await fs.copyFile(globalConfigPath, gameConfigPath);
                    isNewFile = true;
                } else {
                    return { success: false, error: "Global config not found to copy from." };
                }
            }

            const result = await runPythonScript('patch_manager', ['load_config', targetPath]);
            
            if (!result.success) throw new Error(result.error);
            
            return { 
                success: true, 
                data: result.data, 
                isNew: isNewFile,
                path: targetPath 
            };
        }

        else if (action === 'save') {
            console.log(`[Game Config] Saving config for ${titleID}`);
            const configJson = JSON.stringify(data);
            
            const result = await runPythonScript('patch_manager', [
                'save_config', 
                gameConfigPath,
                configJson
            ]);

            if (!result.success) throw new Error(result.error);
            return { success: true };
        }

    } catch (error) {
        console.error(`[Game Config Error] ${error.message}`);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-all-user-profiles', async () => {
    try {
        const contentPath = await getContentRootPath(); 
        const toolboxPath = getBinaryPath('xenia_toolbox');
        const configResult = await getXeniaConfigPath();
        
        const configContent = await fs.readFile(configResult.path, 'utf-8');
        const slotMap = {};
        for (let i = 0; i < 4; i++) {
            const regex = new RegExp(`logged_profile_slot_${i}_xuid\\s*=\\s*"([0-9A-F]+)"`, 'i');
            const match = configContent.match(regex);
            if (match) slotMap[match[1].toUpperCase()] = i;
        }

        const result = await new Promise((resolve) => {
            const child = spawn(toolboxPath, ['scan', contentPath]); 
            let out = '';
            child.stdout.on('data', (d) => { out += d.toString(); });
            child.on('close', () => {
                try { resolve(JSON.parse(out)); } catch (e) { resolve([]); }
            });
        });

        return { 
            success: true, 
            profiles: result.map(p => ({
                ...p,
                slot: slotMap[p.xuid.toUpperCase()] ?? null 
            })),
            activeSlot: parseInt(configContent.match(/user_profile_slot\s*=\s*(\d+)/)?.[1] || 0)
        };
    } catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle('create-profile', async (event, gamertag) => {
    try {
        const toolboxPath = getBinaryPath('xenia_toolbox');
        const contentPath = await getContentRootPath();
        
        return new Promise((resolve) => {
            const child = spawn(toolboxPath, ['create', gamertag, contentPath]);
            let out = '';
            child.stdout.on('data', (d) => { out += d.toString(); });
            child.on('close', () => {
                try { resolve(JSON.parse(out)); } catch (e) { resolve({ success: false }); }
            });
        });
    } catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle('get-played-games-list', async (event, xuid) => {
    try {
        const contentRoot = await getContentRootPath(); 
        const gpdFolder = path.join(contentRoot, xuid, 'FFFE07D1', '00010000', xuid);
        
        if (!fsSync.existsSync(gpdFolder)) return { success: true, games: [] };

        const files = await fs.readdir(gpdFolder);
        const playedGames = [];

        for (const file of files) {
            if (file.endsWith('.gpd') && !file.includes('FFFE07D1')) {
                const titleID = path.basename(file, '.gpd').toUpperCase();
                const meta = localGameDB[titleID] || { title: { full: `Game ${titleID}` }, artwork: { boxart: "" } };
                
                playedGames.push({
                    titleID: titleID,
                    name: meta.title.full,
                    coverUrl: meta.artwork.boxart || 'assets/icons/placeholder.png'
                });
            }
        }
        return { success: true, games: playedGames };
    } catch (e) {
        return { success: false, error: e.message };
    }
});


ipcMain.handle('get-game-achievements', async (event, titleID, xuid, forceRefresh = false) => {
    try {
        const contentRoot = await getContentRootPath();
        const gpdPath = path.resolve(contentRoot, xuid, 'FFFE07D1', '00010000', xuid, `${titleID}.gpd`);
        const outImgDir = path.resolve(CONFIG_DIR, 'achievements', xuid, titleID);
        const cacheJsonPath = path.join(outImgDir, 'achievements.json');

        if (!fsSync.existsSync(gpdPath)) return { success: false, error: "GPD not found" };

        if (!forceRefresh && fsSync.existsSync(cacheJsonPath)) {
            const cachedData = await fs.readFile(cacheJsonPath, 'utf-8');
            return { success: true, achievements: JSON.parse(cachedData) };
        }

        if (!fsSync.existsSync(outImgDir)) fsSync.mkdirSync(outImgDir, { recursive: true });

        const toolboxPath = getBinaryPath('xenia_toolbox');
        
        return new Promise((resolve) => {
            const child = spawn(toolboxPath, ['achievements', gpdPath, outImgDir]);
            let output = '';
            child.stdout.on('data', (d) => { output += d.toString(); });
            
            child.on('close', async () => {
                try {
                    const achievements = JSON.parse(output.trim());
                    const formatted = achievements.map(ach => {
                        
                        if (!ach.image_path || ach.image_path === "") {
                            return { 
                                ...ach, 
                                full_image: null 
                            };
                        }

                        const absolutePath = path.join(outImgDir, ach.image_path);
                        const webPath = absolutePath.replace(/\\/g, '/');
                        
                        return { 
                            ...ach, 
                            full_image: `app-art:///${webPath}` 
                        };
                    });

                    await fs.writeFile(cacheJsonPath, JSON.stringify(formatted));
                    resolve({ success: true, achievements: formatted });
                } catch (e) { 
                    resolve({ success: false, error: "Parse Failed" }); 
                }
            });
        });
    } catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle('get-cached-achievements', async (event, xuid) => {
    try {
        if (fsSync.existsSync(ACHIEVEMENTS_CACHE_FILE)) {
            const rawData = await fs.readFile(ACHIEVEMENTS_CACHE_FILE, 'utf-8');
            const cache = JSON.parse(rawData);
            return { success: true, data: cache[xuid] || [] };
        }
        return { success: true, data: [] };
    } catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle('save-achievements-cache', async (event, { xuid, achievementsList }) => {
    try {
        let cache = {};
        if (fsSync.existsSync(ACHIEVEMENTS_CACHE_FILE)) {
            const rawData = await fs.readFile(ACHIEVEMENTS_CACHE_FILE, 'utf-8');
            cache = JSON.parse(rawData);
        }
        cache[xuid] = achievementsList;
        const dataDir = path.dirname(ACHIEVEMENTS_CACHE_FILE);
        if (!fsSync.existsSync(dataDir)) fsSync.mkdirSync(dataDir, { recursive: true });
        
        await fs.writeFile(ACHIEVEMENTS_CACHE_FILE, JSON.stringify(cache, null, 4));
        return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle('set-active-profile-slot', async (event, slotIndex) => {
    const configResult = await getXeniaConfigPath();
    if (configResult.error) return { success: false };
    
    try {
        let content = await fs.readFile(configResult.path, 'utf-8');
        const key = 'user_profile_slot';
        
        const regex = new RegExp(`${key}\\s*=\\s*\\d+`, 'g');
        
        if (regex.test(content)) {
            content = content.replace(regex, `${key} = ${slotIndex}`);
        } else {
            
            if (content.includes('[General]')) {
                content = content.replace('[General]', `[General]\n${key} = ${slotIndex}`);
            } else {
                content = `[General]\n${key} = ${slotIndex}\n\n` + content;
            }
        }
        
        await fs.writeFile(configResult.path, content);
        console.log(`[System] Successfully switched to Slot ${slotIndex}`);
        return { success: true };
    } catch (e) { 
        console.error("[Config Error]", e);
        return { success: false }; 
    }
});

async function findProfileGPD(dir) {
    try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                const found = await findProfileGPD(fullPath);
                if (found) return found;
            } else if (entry.name.toUpperCase() === 'FFFE07D1.GPD') {
                return fullPath;
            }
        }
    } catch (e) { return null; }
    return null;
}

ipcMain.handle('get-user-gamerpic', async (event, xuid, slot) => {
    const xeniaPath = store.get('xeniaPath');
    
    if (slot !== undefined && slot !== null) {
        const customPic = store.get(`customAvatar_slot_${slot}`);
        if (customPic && fsSync.existsSync(customPic)) {
            const normalizedPath = customPic.replace(/\\/g, '/');
            return { success: true, url: `app-art:///${normalizedPath}` }; 
        }
    }

    const launchMethod = store.get('linuxLaunchMethod') || 'native';
    if (!xeniaPath || !xuid) return { success: false };

    let contentRoot;
    if (process.platform === 'linux' && launchMethod === 'native') {
        contentRoot = path.join(require('os').homedir(), '.local', 'share', 'Xenia', 'content');
    } else {
        contentRoot = path.join(path.dirname(xeniaPath), 'content');
    }

    const gpdPath = await findProfileGPD(path.join(contentRoot, xuid));
    if (!gpdPath) return { success: false };

    const toolboxPath = getBinaryPath('xenia_toolbox');
    const outputPath = path.join(CACHE_DIR, `gamerpic_${xuid}.png`);

    return new Promise((resolve) => {
        const child = require('child_process').spawn(toolboxPath, ['image', gpdPath, outputPath]);
        child.on('close', () => {
            if (fsSync.existsSync(outputPath)) {
                resolve({ success: true, url: `app-art://${path.basename(outputPath)}?t=${Date.now()}` });
            } else resolve({ success: false });
        });
    });
});


ipcMain.handle('search-steamgriddb-assets', async (event, { gameName, type }) => {
    const apiKey = store.get('steamGridDBKey');
    if (!apiKey) return { success: false, error: "API Key missing" };

    try {
        const headers = { 'Authorization': `Bearer ${apiKey}` };
        
        const searchRes = await axios.get(`https://www.steamgriddb.com/api/v2/search/autocomplete/${encodeURIComponent(gameName)}`, { headers });
        
        if (!searchRes.data.success || !searchRes.data.data.length) {
            return { success: false, error: "Game not found on SteamGridDB" };
        }

        const gameId = searchRes.data.data[0].id;
        let endpoint = '';
        
        switch (type) {
            case 'cover': endpoint = 'grids'; break;
            case 'hero':  endpoint = 'heroes'; break;
            case 'logo':  endpoint = 'logos'; break;
            case 'icon':  endpoint = 'icons'; break;
        }

        const assetsRes = await axios.get(`https://www.steamgriddb.com/api/v2/${endpoint}/game/${gameId}`, { headers });
        
        if (!assetsRes.data.success) return { success: false, error: "Failed to fetch assets" };

        const assets = assetsRes.data.data.map(item => {
            const isIconOrLogo = (type === 'icon' || type === 'logo');
            
            return {
                
                thumb: isIconOrLogo ? item.url : (item.thumb || item.url),
                
                full: item.url
            };
        });

        return { success: true, assets: assets };

    } catch (error) {
        console.error("[Art Manager] Fetch Error:", error.message);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('update-game-art', async (event, { gameName, type, url, isLocal }) => {
    try {
        const cache = await loadCache();
        
        if (!cache[gameName]) cache[gameName] = {};

        let finalUrl = url;

        if (!isLocal && url.startsWith('http')) {
            const safeNameForFile = gameName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const ext = type === 'icon' ? '.png' : '.jpg';
            const destPath = path.join(ART_DIR, `${safeNameForFile}-${type}-${Date.now()}${ext}`);
            
            const response = await axios({ url, method: 'GET', responseType: 'stream' });
            const writer = fsSync.createWriteStream(destPath);
            response.data.pipe(writer);
            
            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });
            
            finalUrl = `app-art://${path.basename(destPath)}`;
        }

        if (type === 'cover') cache[gameName].coverUrl = finalUrl;
        if (type === 'hero') cache[gameName].heroUrl = finalUrl;
        if (type === 'logo') cache[gameName].logoUrl = finalUrl;
        if (type === 'icon') cache[gameName].iconUrl = finalUrl;

        await saveCache(cache); 
        return { success: true, path: finalUrl };

    } catch (error) {
        console.error("[Art Manager] Save Error:", error);
        return { success: false, error: error.message };
    }
});



let localGameDB = {};
function getDatabasePath(fileName) {
    const platform = require('os').platform();
    
    const possiblePaths = [
        path.join(__dirname, 'data', fileName),
        
        path.join(CONFIG_DIR, 'data', fileName), 
        
        path.join(process.resourcesPath, 'data', fileName),
        
        path.join(path.dirname(process.execPath), 'data', fileName)
    ];

    for (const p of possiblePaths) {
        try {
            if (fsSync.existsSync(p)) {
                console.log(`[System] ✅ Found database: ${fileName} at: ${p}`);
                return p;
            }
        } catch (err) {
        }
    }

    console.error(`[System] ❌ Critical: Could not find ${fileName} in any location.`);
    return null;
}

function loadLocalDB() {
    try {
        const dbPath = getDatabasePath('x360db_titles_merged.json');

        if (dbPath) {
            const rawData = fsSync.readFileSync(dbPath, 'utf-8'); 
            localGameDB = JSON.parse(rawData);
            
            console.log(`[LocalDB] Successfully loaded from: ${dbPath}`);
            console.log(`[LocalDB] Loaded ${Object.keys(localGameDB).length} titles.`);
        } else {
            console.warn(`[LocalDB] Warning: Database file not found!`);
            console.warn(`[LocalDB] Please ensure 'data/x360db_titles_merged.json' is in the correct folder.`);
        }
    } catch (e) {
        console.error("[LocalDB] Critical Error loading JSON database:", e);
    }
}

loadLocalDB();

ipcMain.handle('get-local-game-metadata', async (event, titleID) => {
    if (!titleID) return { found: false, error: "No TitleID provided" };

    const cleanID = titleID.toUpperCase();
    
    if (localGameDB[cleanID]) {
        const data = localGameDB[cleanID];
        console.log(`[LocalDB] Found match for ${cleanID}: ${data.title.full}`);
        
        return {
            found: true,
            metadata: {
                title: data.title.full,
                developer: data.developer,
                publisher: data.publisher,
                description: data.description ? (data.description.full || data.description.short) : '',
                rating: data.user_rating,
                releaseDate: data.release_date,
                genre: (data.genre && Array.isArray(data.genre)) ? data.genre.join(', ') : (data.genre || 'Unknown'),
                assets: {
                    cover: data.artwork.boxart,
                    hero: data.artwork.background,
                    logo: data.artwork.banner,
                    icon: data.artwork.icon,
                    screenshots: data.artwork.gallery || []
                }
            }
        };
    }
    
    return { found: false, error: "TitleID not found in local database" };
});

ipcMain.handle('update-local-db', async () => {
    
    loadLocalDB();
    return { success: true, count: Object.keys(localGameDB).length };
});

ipcMain.handle('translate-text', async (event, text) => {
    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=ar&dt=t&q=${encodeURIComponent(text)}`;
        const response = await axios.get(url);
        
        const translatedText = response.data[0].map(s => s[0]).join('');
        return { success: true, translatedText };
    } catch (error) {
        console.error("Translation Error:", error);
        return { success: false, error: error.message };
    }
});