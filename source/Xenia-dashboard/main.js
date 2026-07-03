
const { app, BrowserWindow, ipcMain, dialog, shell, session, nativeImage, screen } = require('electron');
const path = require('path');
const { default: Store } = require('electron-store');
const fs = require('fs').promises; 
const fsSync = require('fs');
const axios = require('axios');
const decompress = require('decompress'); 
const { exec, spawn } = require('child_process');
const { exec: execCb } = require('child_process');
const util = require('util');
const execPromise = util.promisify(execCb);
const sevenBin = require('7zip-bin');



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
const SYSTEMS_DIR = path.join(CONFIG_DIR, 'systems');




const GAMES_DIR = path.join(CONFIG_DIR, 'Games'); 
const iconPath = path.join(__dirname, 'assets', 'icons', 'icon.png');
const appIcon = nativeImage.createFromPath(iconPath); 



const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.exit(0);
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
                },
                zh: {
                    title: '系统消息',
                    message: 'Xenia仪表板已处于活动状态',
                    detail: '该应用程序已在您的系统上运行。请使用现有窗口继续您的会话。',
                    button: '关闭'
                },
                ja: {
                    title: 'システムメッセージ',
                    message: 'Xeniaダッシュボードはすでにアクティブです',
                    detail: 'このアプリケーションはすでにシステムで実行されています。既存のウィンドウを使用してセッションを続行してください。',
                    button: '閉じる'
                },
                ko: {
                    title: '시스템 메시지',
                    message: 'Xenia 대시보드가 이미 활성화되어 있습니다',
                    detail: '이 응용 프로그램은 이미 시스템에서 실행 중입니다. 기존 창을 사용하여 세션을 계속하십시오.',
                    button: '닫기'
                },
                ru: {
                    title: 'Системное сообщение',
                    message: 'Панель управления Xenia уже активна',
                    detail: 'Это приложение уже работает на вашей системе. Пожалуйста, используйте существующее окно, чтобы продолжить свою сессию.',
                    button: 'Закрыть'
                },
                de: {
                    title: 'Systemnachricht',
                    message: 'Das Xenia-Dashboard ist bereits aktiv',
                    detail: 'Diese Anwendung läuft bereits auf Ihrem System. Bitte verwenden Sie das vorhandene Fenster, um Ihre Sitzung fortzusetzen.',
                    button: 'Schließen'
                },
                pt_BR: {
                    title: 'Mensagem do Sistema',
                    message: 'O painel Xenia já está ativo',
                    detail: 'O aplicativo já está em execução no seu sistema. Use a janela existente para continuar sua sessão.',
                    button: 'Fechar'
                },
                es: {
                    title: 'Mensaje del Sistema',
                    message: 'El panel de Xenia ya está activo',
                    detail: 'La aplicación ya se está ejecutando en su sistema. Utilice la ventana existente para continuar con su sesión.',
                    button: 'Cerrar'
                },
                tr: {
                    title: 'Sistem Mesajı',
                    message: 'Xenia Paneli zaten aktif',
                    detail: 'Uygulama sisteminizde zaten çalışıyor. Lütfen oturumunuza devam etmek için mevcut pencereyi kullanın.',
                    button: 'Kapat'
                },
                it: {
                    title: 'Messaggio di Sistema',
                    message: 'Il pannello di Xenia è già attivo',
                    detail: 'L\'applicazione è già in esecuzione sul tuo sistema. Utilizza la finestra esistente per continuare la tua sessione.',
                    button: 'Chiudi'
                },
                fr: {
                    title: 'Message du Système',
                    message: 'Le tableau de bord Xenia est déjà actif',
                    detail: 'L\'application est déjà en cours d\'exécution sur votre système. Veuillez utiliser la fenêtre existante pour continuer votre session.',
                    button: 'Fermer'
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
        return path.join(path.dirname(xeniaPath), 'content');
    }
    
    return path.join(path.dirname(xeniaPath), 'content');
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

        
        let configFileName = 'xenia-canary.config.toml';
        if (xeniaPath.toLowerCase().includes('netplay')) {
            configFileName = 'xenia-canary-netplay.config.toml';
        }

        if (platform === 'linux' && launchMethod === 'native') {
            const os = require('os');
            
            configPath = path.join(path.dirname(xeniaPath), configFileName);
            
            const configDir = path.dirname(configPath);
            if (!fsSync.existsSync(configDir)) {
                await fs.mkdir(configDir, { recursive: true });
            }
        } else {
            configPath = path.join(path.dirname(xeniaPath), configFileName);
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
        
        
        if (!fsSync.existsSync(ACHIEVEMENTS_DIR)) fsSync.mkdirSync(ACHIEVEMENTS_DIR, { recursive: true });
        if (!fsSync.existsSync(SYSTEMS_DIR)) fsSync.mkdirSync(SYSTEMS_DIR, { recursive: true });

        
        
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
function getEntryPoint() {
    const currentTheme = store.get('currentTheme') || 'NXE-2008';
    
    
    const externalIndex = path.join(SYSTEMS_DIR, currentTheme, 'index.html');

    if (fsSync.existsSync(externalIndex)) {
        console.log(`[Shell] Production Mode: Loading External Index from ${externalIndex}`);
        return externalIndex;
    }
    
    
    return path.join(__dirname, 'index.html');
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
            devTools: false 
        }
    });

    
    mainWindow.setMenu(null); 

    
    mainWindow.webContents.on('before-input-event', (event, input) => {
        const key = input.key.toLowerCase();
        
        if (key === 'f12' || (input.control && input.shift && key === 'i')) {
            event.preventDefault();
        }
        if (input.control && (key === '+' || key === '=' || key === '-')) {
            event.preventDefault();
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

    
    mainWindow.loadFile(getEntryPoint());

    
    mainWindow.webContents.on('did-finish-load', () => {
        
        const primaryDisplay = screen.getPrimaryDisplay();
        const { width, height } = primaryDisplay.bounds;

        
        
        const scaleFactor = Math.min(width / 1920, height / 1080);

        
        mainWindow.webContents.setZoomFactor(scaleFactor);
    });
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
        return { titleID: idFromFileScan, source: 'file-scan (x360tid)' };
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

    ipcMain.handle('manage-system-content', async (event, { action, titleId, fileName, filePath, type, contentType }) => {
    const cliPath = getBinaryPath('xbox-install'); 
    const contentRoot = await getContentRootPath();

    if (!fsSync.existsSync(cliPath)) {
        return { success: false, error: "xbox-install tool not found in bin folder." };
    }

    
    const platform = require('os').platform();
    if (platform !== 'win32') {
        try { fsSync.chmodSync(cliPath, 0o755); } 
        catch (err) { if (err.code !== 'EROFS') console.warn(`[System] Failed to chmod xbox-install: ${err.message}`); }
    }

    const activeXuid = store.get('xuid');
    
    
    
    let globalArgs = ['--json', '--content-root', contentRoot];
    
    
    let profileArgs = [...globalArgs];
    if (activeXuid) {
        profileArgs.push('--xuid', activeXuid);
    }

    
    const runCLI = (args) => new Promise((resolve) => {
        const child = spawn(cliPath, args);
        let output = '';
        
        child.stdout.on('data', (d) => output += d.toString());
        
        child.on('close', (code) => {
            try {
                const parsed = JSON.parse(output);
                
                
                if (parsed.ok === false) {
                    resolve({ success: false, error: parsed.message || "Operation failed in CLI." });
                } else {
                    resolve({ success: true, data: parsed });
                }
            } catch (e) {
                console.error("[xbox-install Output Error]", output);
                resolve({ success: false, error: "Failed to parse tool output." });
            }
        });
        
        child.on('error', (err) => resolve({ success: false, error: err.message }));
    });

    try {
        if (action === 'get-all') {
            const titlesRes = await runCLI(['list', ...profileArgs]);
            if (!titlesRes.success || !titlesRes.data || !titlesRes.data.titles) return titlesRes;

            let allPackages = [];
            for (const tid of titlesRes.data.titles) {
                const pkgRes = await runCLI(['list', '--disabled', ...profileArgs, tid]);
                
                if (pkgRes.success && pkgRes.data.packages) {
                    
                    let realGameName = `Unknown Game`;
                    let gameIconUrl = '';
                    const cleanTid = tid.toUpperCase();
                    if (localGameDB && localGameDB[cleanTid]) {
                        realGameName = localGameDB[cleanTid].title.full;
                        gameIconUrl = localGameDB[cleanTid].artwork.icon || '';
                    }

                    
                    const enrichedPackages = pkgRes.data.packages.map(p => ({
                        ...p,
                        title_id: tid,
                        game_name: realGameName,
                        iconUrl: gameIconUrl
                    }));
                    
                    allPackages.push(...enrichedPackages);
                }
            }

            const typeMap = { 'tu': '000B0000', 'dlc': '00000002', 'saves': '00000001' };
            const filterTarget = typeMap[type];
            
            if (filterTarget) {
                allPackages = allPackages.filter(p => p.content_type === filterTarget);
            }

            return { success: true, data: allPackages };
        }
        else if (action === 'install') {
            
            let args;
            if (contentType  === 'saves') {
                args = ['install', ...profileArgs, filePath];
            } else { 
                args = ['install', ...globalArgs, filePath];
            }
            return await runCLI(args);
        }
        else if (action === 'uninstall') {
            
            let args;
            if (contentType === 'saves') {
                args = ['uninstall', ...profileArgs, titleId, fileName];
            } else {
                args = ['uninstall', ...globalArgs, titleId, fileName];
            }
            return await runCLI(args);
        }
        else if (action === 'toggle') {
            const cmd = type === 'enable' ? 'enable' : 'disable';
            let args;
            if (contentType === 'saves') {
                args = [cmd, ...profileArgs, titleId, fileName];
            } else {
                args = [cmd, ...globalArgs, titleId, fileName];
            }
            return await runCLI(args);
        }
        else if (action === 'export-save') {
            if (!titleId || !fileName) {
                return { success: false, error: "Missing titleId or fileName" };
            }
            const outputDir = path.join(CONFIG_DIR, 'Backups');
            if (!fsSync.existsSync(outputDir)) {
                await fs.mkdir(outputDir, { recursive: true });
            }

            
            let args = ['export-save', ...profileArgs, titleId, fileName, outputDir];

            
            return new Promise((resolve) => {
                const child = spawn(cliPath, args);
                let stdout = '', stderr = '';
                child.stdout.on('data', (d) => stdout += d.toString());
                child.stderr.on('data', (d) => stderr += d.toString());
                child.on('close', (code) => {
                    if (code === 0) {
                        resolve({ success: true, message: stdout.trim() || "Export successful." });
                    } else {
                        resolve({ success: false, error: stderr.trim() || stdout.trim() || "Export failed." });
                    }
                });
                child.on('error', (err) => resolve({ success: false, error: err.message }));
            });
        }
    } catch (e) {
        return { success: false, error: e.message };
    }
});
    
    ipcMain.handle('get-friends-list', async () => {
        try {
            const xeniaPath = store.get('xeniaPath');
            
            if (!xeniaPath || !xeniaPath.toLowerCase().includes('netplay')) {
                return { success: false, error: 'Netplay version required' };
            }

            const configFileName = 'xenia-canary-netplay.config.toml'; 
            
            let configPath;
            const platform = require('os').platform();
            const launchMethod = store.get('linuxLaunchMethod') || 'native'; 
            if (platform === 'linux' && launchMethod === 'native') {
                configPath = path.join(path.dirname(xeniaPath), configFileName);
            } else {
                configPath = path.join(path.dirname(xeniaPath), configFileName);
            }

            if (!fsSync.existsSync(configPath)) return { success: true, friends: [] };

            
            const tomlData = await fs.readFile(configPath, 'utf-8');
            const match = tomlData.match(/^friends_xuids\s*=\s*"(.*?)"/m);
            let xuids = [];
            if (match && match[1]) {
                xuids = match[1].split(',').map(s => s.trim()).filter(s => s.length > 0);
            }

            
            const friendsJsonPath = path.join(CONFIG_DIR, 'data', 'friends.json');
            let friendsNames = {};
            if (fsSync.existsSync(friendsJsonPath)) {
                friendsNames = JSON.parse(await fs.readFile(friendsJsonPath, 'utf-8'));
            }

            
            const friends = xuids.map(xuid => ({
                xuid: xuid,
                name: friendsNames[xuid] || 'Unknown Friend'
            }));

            return { success: true, friends };
        } catch (e) {
            return { success: false, error: e.message };
        }
    });

    ipcMain.handle('add-friend', async (event, { xuid, name }) => {
        try {
            const xeniaPath = store.get('xeniaPath');
            if (!xeniaPath || !xeniaPath.toLowerCase().includes('netplay')) {
                return { success: false, error: 'Netplay version required' };
            }

            const configFileName = 'xenia-canary-netplay.config.toml';
            
            let configPath;
            const platform = require('os').platform();
            const launchMethod = store.get('linuxLaunchMethod') || 'native'; 
            if (platform === 'linux' && launchMethod === 'native') {
                configPath = path.join(path.dirname(xeniaPath), configFileName);
            } else {
                configPath = path.join(path.dirname(xeniaPath), configFileName);
            }

            if (!fsSync.existsSync(configPath)) return { success: false, error: 'Config file not found. Run Xenia Netplay first.' };

            
            let tomlData = await fs.readFile(configPath, 'utf-8');
            const match = tomlData.match(/^friends_xuids\s*=\s*"(.*?)"/m);
            
            let xuids = [];
            if (match && match[1]) {
                xuids = match[1].split(',').map(s => s.trim()).filter(s => s.length > 0);
            }

            if (!xuids.includes(xuid)) {
                xuids.push(xuid);
                const newXuidsStr = xuids.join(',');
                if (match) {
                    tomlData = tomlData.replace(/^friends_xuids\s*=\s*".*?"/m, `friends_xuids = "${newXuidsStr}"`);
                } else {
                    if (tomlData.includes('[Live]')) {
                        tomlData = tomlData.replace('[Live]', `[Live]\nfriends_xuids = "${newXuidsStr}"`);
                    } else {
                        tomlData += `\n[Live]\nfriends_xuids = "${newXuidsStr}"\n`;
                    }
                }
                await fs.writeFile(configPath, tomlData);
            }

            
            const friendsJsonPath = path.join(CONFIG_DIR, 'data', 'friends.json');
            let friendsNames = {};
            if (fsSync.existsSync(friendsJsonPath)) {
                friendsNames = JSON.parse(await fs.readFile(friendsJsonPath, 'utf-8'));
            }
            friendsNames[xuid] = name;
            
            const dataDir = path.dirname(friendsJsonPath);
            if (!fsSync.existsSync(dataDir)) await fs.mkdir(dataDir, { recursive: true });
            await fs.writeFile(friendsJsonPath, JSON.stringify(friendsNames, null, 4));

            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    });

    ipcMain.handle('edit-friend', async (event, { xuid, newName }) => {
        try {
            const xeniaPath = store.get('xeniaPath');
            if (!xeniaPath || !xeniaPath.toLowerCase().includes('netplay')) {
                return { success: false, error: 'Netplay version required' };
            }

            const friendsJsonPath = path.join(CONFIG_DIR, 'data', 'friends.json');
            let friendsNames = {};
            if (fsSync.existsSync(friendsJsonPath)) {
                friendsNames = JSON.parse(await fs.readFile(friendsJsonPath, 'utf-8'));
            }
            friendsNames[xuid] = newName; 
            await fs.writeFile(friendsJsonPath, JSON.stringify(friendsNames, null, 4));
            
            return { success: true };
        } catch (e) { return { success: false, error: e.message }; }
    });

    ipcMain.handle('delete-friend', async (event, xuidToRemove) => {
        try {
            const xeniaPath = store.get('xeniaPath');
            if (!xeniaPath || !xeniaPath.toLowerCase().includes('netplay')) {
                return { success: false, error: 'Netplay version required' };
            }

            const configFileName = 'xenia-canary-netplay.config.toml';
            
            let configPath;
            const platform = require('os').platform();
            const launchMethod = store.get('linuxLaunchMethod') || 'native'; 
            if (platform === 'linux' && launchMethod === 'native') {
                configPath = path.join(path.dirname(xeniaPath), configFileName);
            } else {
                configPath = path.join(path.dirname(xeniaPath), configFileName);
            }

            
            if (fsSync.existsSync(configPath)) {
                let tomlData = await fs.readFile(configPath, 'utf-8');
                const match = tomlData.match(/^friends_xuids\s*=\s*"(.*?)"/m);
                if (match && match[1]) {
                    let xuids = match[1].split(',').map(s => s.trim()).filter(s => s.length > 0);
                    xuids = xuids.filter(id => id !== xuidToRemove); 
                    
                    const newXuidsStr = xuids.join(',');
                    tomlData = tomlData.replace(/^friends_xuids\s*=\s*".*?"/m, `friends_xuids = "${newXuidsStr}"`);
                    await fs.writeFile(configPath, tomlData);
                }
            }

            
            const friendsJsonPath = path.join(CONFIG_DIR, 'data', 'friends.json');
            if (fsSync.existsSync(friendsJsonPath)) {
                let friendsNames = JSON.parse(await fs.readFile(friendsJsonPath, 'utf-8'));
                delete friendsNames[xuidToRemove];
                await fs.writeFile(friendsJsonPath, JSON.stringify(friendsNames, null, 4));
            }
            
            return { success: true };
        } catch (e) { return { success: false, error: e.message }; }
    });

    ipcMain.handle('reload-app-shell', () => {
        if (mainWindow) {
            console.log('[Shell] Reloading application shell with potential new index.html...');
            mainWindow.loadFile(getEntryPoint());
        }
        
    });

ipcMain.handle('download-optimized-settings', async () => {
    const downloadUrl = 'https://github.com/xenia-manager/optimized-settings/archive/refs/heads/main.zip';
    const targetDir = path.join(CONFIG_DIR, 'assets', 'optimized-settings');
    const tempDownloadDir = path.join(CONFIG_DIR, 'temp_downloads');
    const zipPath = path.join(tempDownloadDir, 'opt-settings.zip');
    const extractTemp = path.join(tempDownloadDir, 'extracted_full'); 

    try {
        
        await fs.mkdir(tempDownloadDir, { recursive: true });
        if (fsSync.existsSync(extractTemp)) await fs.rm(extractTemp, { recursive: true, force: true });

        sendProgress({ type: 'optimized', status: 'Downloading Database...', percentage: 20 });

        
        const response = await axios({ url: downloadUrl, method: 'GET', responseType: 'stream' });
        const writer = fsSync.createWriteStream(zipPath);
        response.data.pipe(writer);
        await new Promise((r, j) => { writer.on('finish', r); writer.on('error', j); });

        sendProgress({ type: 'optimized', status: 'Extracting files...', percentage: 50 });

        
        await decompress(zipPath, extractTemp);

        
        
        const rootEntries = await fs.readdir(extractTemp);
        const rootFolderName = rootEntries[0]; 
        const sourceSettingsPath = path.join(extractTemp, rootFolderName, 'settings');

        if (!fsSync.existsSync(sourceSettingsPath)) {
            throw new Error("Could not find 'settings' folder inside the ZIP.");
        }

        sendProgress({ type: 'optimized', status: 'Moving Settings to Assets...', percentage: 80 });

        
        if (fsSync.existsSync(targetDir)) await fs.rm(targetDir, { recursive: true, force: true });
        
        try {
            
            await fs.rename(sourceSettingsPath, targetDir);
        } catch (e) {
            
            await fs.cp(sourceSettingsPath, targetDir, { recursive: true });
        }

        
        
        if (fsSync.existsSync(extractTemp)) await fs.rm(extractTemp, { recursive: true, force: true });
        
        if (fsSync.existsSync(zipPath)) await fs.unlink(zipPath);

        sendProgress({ type: 'optimized', status: 'Cleanup Complete! Ready.', percentage: 100, step: 'done' });
        return { success: true };

    } catch (e) {
        console.error("[Optimized Settings Error]:", e.message);
        
        if (fsSync.existsSync(extractTemp)) try { await fs.rm(extractTemp, { recursive: true }); } catch(err){}
        return { success: false, error: e.message };
    }
});

ipcMain.handle('apply-optimized-settings', async (event, { titleID, gameConfigPath }) => {
    const cleanID = titleID.toUpperCase().trim();
    
    
    const jsonPath = path.join(CONFIG_DIR, 'assets', 'optimized-settings', `${cleanID}.json`);
    const tomlPath = path.join(CONFIG_DIR, 'assets', `${cleanID}.toml`); 
    const assetTomlPath = path.join(CONFIG_DIR, 'assets', 'optimized-settings', `${cleanID}.toml`); 
    
    try {
        let targetFilePath = null;
        let isToml = false;

        
        if (fsSync.existsSync(jsonPath)) {
            targetFilePath = jsonPath;
        } else if (fsSync.existsSync(tomlPath)) {
            targetFilePath = tomlPath;
            isToml = true;
        } else if (fsSync.existsSync(assetTomlPath)) {
            targetFilePath = assetTomlPath;
            isToml = true;
        } else {
            return { success: false, error: `No settings found for ID: ${cleanID}` };
        }

        
        const gameDir = path.dirname(gameConfigPath);
        if (!fsSync.existsSync(gameDir)) {
            await fs.mkdir(gameDir, { recursive: true });
        }

        let jsonData;

        if (isToml) {
            
            console.log(`[Optimized Settings] Parsing TOML: ${targetFilePath}`);
            const parseResult = await runPythonScript('patch_manager', ['load_config', targetFilePath]);
            
            if (!parseResult.success) {
                throw new Error(parseResult.error || "Failed to parse TOML settings.");
            }
            jsonData = parseResult.data;
        } else {
            
            const rawData = await fs.readFile(targetFilePath, 'utf-8');
            jsonData = JSON.parse(rawData);
        }

        
        const result = await runPythonScript('patch_manager', [
            'apply_optimized', 
            gameConfigPath, 
            JSON.stringify(jsonData)
        ]);

        return result;

    } catch (e) {
        console.error(`[Optimized Settings Error]`, e);
        return { success: false, error: `Critical Error: ${e.message}` };
    }
});

    
    ipcMain.handle('check-app-update', async () => {
        try {
            const currentVersion = app.getVersion();
            const repoUrl = 'https://api.github.com/repos/ALHROOBIX/Xenia-Dashboard/releases/latest';
            
            const { data: remoteRelease } = await axios.get(repoUrl, {
                headers: { 'User-Agent': 'Xenia-Dashboard-Updater' }
            });

            
            const latestVersion = remoteRelease.tag_name.replace(/^v/i, '').trim();
            
            
            const isNewer = (curr, late) => {
                const c = curr.split('.').map(Number);
                const l = late.split('.').map(Number);
                for (let i = 0; i < Math.max(c.length, l.length); i++) {
                    if ((l[i] || 0) > (c[i] || 0)) return true;
                    if ((l[i] || 0) < (c[i] || 0)) return false;
                }
                return false;
            };

            const hasUpdate = isNewer(currentVersion, latestVersion);

            return {
                success: true,
                currentVersion,
                latestVersion,
                hasUpdate,
                releaseNotes: remoteRelease.body,
                publishedAt: remoteRelease.published_at
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    
    ipcMain.handle('download-x360tid', async () => {
        try {
            const platform = require('os').platform();
            const isWin = platform === 'win32';
            
            
            const assetName = isWin ? 'x360tid-static_win.zip' : 'x360tid-static_linux.zip';
            const osFolder = isWin ? 'win' : 'linux';
            const binaryName = isWin ? 'x360tid.exe' : 'x360tid';

            const repoUrl = 'https://api.github.com/repos/ALHROOBIX/x360tid/releases/latest';
            
            
            const { data: release } = await axios.get(repoUrl, { headers: { 'User-Agent': 'Xenia-Dashboard' }});
            const asset = release.assets.find(a => a.name === assetName);
            if (!asset) throw new Error(`Asset ${assetName} not found in the latest release.`);

            
            const tempDir = path.join(CONFIG_DIR, 'temp_downloads');
            const zipPath = path.join(tempDir, assetName);
            const extractDir = path.join(tempDir, 'x360tid_extracted');
            const finalTargetDir = path.join(CONFIG_DIR, 'assets', 'bin', osFolder);
            
            if (!fsSync.existsSync(tempDir)) await fs.mkdir(tempDir, { recursive: true });
            if (fsSync.existsSync(extractDir)) await fs.rm(extractDir, { recursive: true, force: true });
            await fs.mkdir(extractDir, { recursive: true });
            if (!fsSync.existsSync(finalTargetDir)) await fs.mkdir(finalTargetDir, { recursive: true });

            
            const response = await axios({ url: asset.browser_download_url, method: 'GET', responseType: 'stream' });
            const writer = fsSync.createWriteStream(zipPath);
            response.data.pipe(writer);
            await new Promise((r, j) => { writer.on('finish', r); writer.on('error', j); });

            
            await decompress(zipPath, extractDir);

            
            async function findBinary(dir, targetName) {
                const entries = await fs.readdir(dir, { withFileTypes: true });
                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);
                    if (entry.isDirectory()) {
                        const found = await findBinary(fullPath, targetName);
                        if (found) return found;
                    } else if (entry.name === targetName) {
                        return fullPath;
                    }
                }
                return null;
            }

            const foundBinaryPath = await findBinary(extractDir, binaryName);
            if (!foundBinaryPath) throw new Error(`${binaryName} not found in the extracted files.`);

            const targetBinaryPath = path.join(finalTargetDir, binaryName);
            if (fsSync.existsSync(targetBinaryPath)) await fs.unlink(targetBinaryPath);
            await fs.copyFile(foundBinaryPath, targetBinaryPath);

            
            if (!isWin) {
                await fs.chmod(targetBinaryPath, 0o755);
            }

            
            await fs.rm(extractDir, { recursive: true, force: true });
            await fs.unlink(zipPath);

            return { success: true };

        } catch (error) {
            console.error('[x360tid Download Error]', error);
            return { success: false, error: error.message };
        }
    });
    
    ipcMain.handle('check-xbox-install-status', async () => {
        const toolPath = getBinaryPath('xbox-install');
        return { exists: fsSync.existsSync(toolPath) };
    });

    
    ipcMain.handle('download-xbox-install', async () => {
        try {
            const platform = require('os').platform();
            const isWin = platform === 'win32';
            
            
            const assetName = isWin ? 'xbox-install-windows.zip' : 'xbox-install-linux.zip';
            const osFolder = isWin ? 'win' : 'linux';
            const binaryName = isWin ? 'xbox-install.exe' : 'xbox-install';

            const repoUrl = 'https://api.github.com/repos/ALHROOBIX/Xbox-Content-Installer/releases/latest';
            
            
            const { data: release } = await axios.get(repoUrl, { headers: { 'User-Agent': 'Xenia-Dashboard' }});
            const asset = release.assets.find(a => a.name === assetName);
            if (!asset) throw new Error(`Asset ${assetName} not found in the latest release.`);

            
            const tempDir = path.join(CONFIG_DIR, 'temp_downloads');
            const zipPath = path.join(tempDir, assetName);
            const extractDir = path.join(tempDir, 'xbox_install_extracted');
            const finalTargetDir = path.join(CONFIG_DIR, 'assets', 'bin', osFolder);
            
            if (!fsSync.existsSync(tempDir)) await fs.mkdir(tempDir, { recursive: true });
            if (fsSync.existsSync(extractDir)) await fs.rm(extractDir, { recursive: true, force: true });
            await fs.mkdir(extractDir, { recursive: true });
            if (!fsSync.existsSync(finalTargetDir)) await fs.mkdir(finalTargetDir, { recursive: true });

            
            const response = await axios({ url: asset.browser_download_url, method: 'GET', responseType: 'stream' });
            const writer = fsSync.createWriteStream(zipPath);
            response.data.pipe(writer);
            await new Promise((r, j) => { writer.on('finish', r); writer.on('error', j); });

            
            await decompress(zipPath, extractDir);

            
            async function findBinary(dir, targetName) {
                const entries = await fs.readdir(dir, { withFileTypes: true });
                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);
                    if (entry.isDirectory()) {
                        const found = await findBinary(fullPath, targetName);
                        if (found) return found;
                    } else if (entry.name === targetName) {
                        return fullPath;
                    }
                }
                return null;
            }

            const foundBinaryPath = await findBinary(extractDir, binaryName);
            if (!foundBinaryPath) throw new Error(`${binaryName} not found in the extracted files.`);

            
            const targetBinaryPath = path.join(finalTargetDir, binaryName);
            if (fsSync.existsSync(targetBinaryPath)) await fs.unlink(targetBinaryPath);
            await fs.copyFile(foundBinaryPath, targetBinaryPath);

            
            if (!isWin) {
                await fs.chmod(targetBinaryPath, 0o755);
            }

            
            await fs.rm(extractDir, { recursive: true, force: true });
            await fs.unlink(zipPath);

            return { success: true };

        } catch (error) {
            console.error('[xbox-install Download Error]', error);
            return { success: false, error: error.message };
        }
    });

    
    

    ipcMain.handle('download-app-update', async (event, platform) => {
        const repoUrl = 'https://api.github.com/repos/ALHROOBIX/Xenia-Dashboard/releases/latest';
        
        
        let currentAppPath;
        if (platform === 'win') {
            
            currentAppPath = process.env.PORTABLE_EXECUTABLE_FILE || app.getPath('exe');
        } else {
            
            currentAppPath = process.env.APPIMAGE || app.getPath('exe');
        }

        const exeDir = path.dirname(currentAppPath); 
        const exeName = path.basename(currentAppPath);
        
        
        const downloadDir = path.join(exeDir, 'dashboard_update_tmp');

        try {
            
            const { data: release } = await axios.get(repoUrl, { headers: { 'User-Agent': 'Xenia-Dashboard' } });
            const asset = release.assets.find(a => 
                platform === 'win' ? a.name.endsWith('.exe') : a.name.endsWith('.AppImage')
            );

            if (!asset) throw new Error("No compatible asset found.");

            
            if (!fsSync.existsSync(downloadDir)) {
                fsSync.mkdirSync(downloadDir, { recursive: true });
            }

            
            const downloadPath = path.join(downloadDir, `new_${exeName}`);

            
            const writer = fsSync.createWriteStream(downloadPath);
            const response = await axios({ url: asset.browser_download_url, method: 'GET', responseType: 'stream' });

            const totalBytes = parseInt(response.headers['content-length'], 10);
            let downloadedBytes = 0;

            response.data.on('data', (chunk) => {
                downloadedBytes += chunk.length;
                const percentage = Math.floor((downloadedBytes / totalBytes) * 100);
                mainWindow.webContents.send('download-progress', { 
                    type: 'app-update', 
                    status: 'Downloading...', 
                    percentage 
                });
            });

            response.data.pipe(writer);
            await new Promise((r, j) => { writer.on('finish', r); writer.on('error', j); });

            
            
            if (platform === 'win') {
                const batchPath = path.join(downloadDir, 'apply_update.bat');
                const script = `
    @echo off
    title Xenia Dashboard Updater
    echo Waiting for Dashboard to close...
    timeout /t 2 /nobreak > nul

    :attempt
    del /f /q "${currentAppPath}"
    if exist "${currentAppPath}" (
        echo File is locked, retrying...
        timeout /t 1 /nobreak > nul
        goto attempt
    )

    echo Moving new version...
    move /y "${downloadPath}" "${currentAppPath}"
    echo Restarting...
    start "" "${currentAppPath}"
    echo Cleaning up...
    rd /s /q "${downloadDir}"
    exit
                `;
                fsSync.writeFileSync(batchPath, script);
                
                spawn('cmd.exe', ['/c', batchPath], {
                    detached: true,
                    stdio: 'ignore',
                    cwd: exeDir 
                }).unref();

            } else {
                
                const scriptPath = path.join(downloadDir, 'apply_update.sh');
                const script = `
    #!/bin/bash
    sleep 2
    # الاستبدال بقوة -f
    mv -f "${downloadPath}" "${currentAppPath}"
    chmod +x "${currentAppPath}"
    # التشغيل المستقل
    "${currentAppPath}" &
    # حذف المجلد المؤقت
    rm -rf "${downloadDir}"
                `;
                fsSync.writeFileSync(scriptPath, script);
                fsSync.chmodSync(scriptPath, 0o755);
                
                spawn('/bin/bash', [scriptPath], {
                    detached: true,
                    stdio: 'ignore',
                    cwd: exeDir
                }).unref();
            }

            
            setTimeout(() => app.exit(0), 500);
            return { success: true };

        } catch (error) {
            console.error("Update Error:", error);
            
            if (fsSync.existsSync(downloadDir)) {
                try { fsSync.rmSync(downloadDir, { recursive: true }); } catch(e){}
            }
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('update-game-name', async (event, { fileName, newName }) => {
        try {
            const cache = await loadCache();
            if (!cache[fileName]) cache[fileName] = {};
            
            
            cache[fileName].name = newName;
            
            await saveCache(cache);
            return { success: true };
        } catch (error) {
            console.error("[Rename Error]", error);
            return { success: false, error: error.message };
        }
    });

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

    
    const processAndSaveArt = async (titleID) => {
        const fileName = path.basename(gamePath);
        const gameNameOnly = path.basename(fileName, path.extname(fileName));

        
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

        return { success: true, titleID: titleID, art: gameArt };
    };

    
    
    
    try {
        console.log(`[ZAR Scan] Attempting fast scan with x360tid for: ${gamePath}`);
        const fastTitleID = await readTitleIDFromFile(gamePath);
        
        if (fastTitleID) {
            console.log(`[ZAR Scan] Fast scan successful! Title ID: ${fastTitleID}`);
            return await processAndSaveArt(fastTitleID); 
        }
    } catch (e) {
        console.warn(`[ZAR Scan] Fast scan encountered an error: ${e.message}`);
    }

    
    
    
    console.log(`[ZAR Scan] Fast scan failed or returned null. Falling back to Xenia slow scan...`);
    try { if (fsSync.existsSync(logPath)) await fsSync.promises.unlink(logPath); } catch (e) {}

    return new Promise(async (resolve) => {
        let xeniaProcess = null;

        try {
            
            if (platform === 'win32') {
                xeniaProcess = spawn(xeniaPath, [gamePath], { 
                    detached: false,
                    cwd: xeniaDir 
                });
            } 
            else if (platform === 'linux') {
                if (launchMethod === 'native') {
                    try { await fsSync.promises.chmod(xeniaPath, 0o755); } catch (e) {}
                    xeniaProcess = spawn(xeniaPath, [gamePath], { 
                        detached: false,
                        cwd: xeniaDir 
                    });
                } 
                else if (launchMethod === 'wine') {
                    xeniaProcess = spawn('wine', [xeniaPath, gamePath], { 
                        detached: false,
                        cwd: xeniaDir 
                    });
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
                    xeniaProcess = exec(command, { 
                        env: protonEnv,
                        cwd: xeniaDir 
                    });
                }
            }

            
            setTimeout(async () => {
                
                if (xeniaProcess) {
                    try { xeniaProcess.kill('SIGKILL'); } catch (e) {}
                }
                
                if (platform === 'linux') {
                    try { exec('pkill -9 -f xenia_canary'); } catch (e) {}
                }

                
                setTimeout(async () => {
                    try {
                        if (!fsSync.existsSync(logPath)) return resolve({ success: false, error: "Log file not created" });

                        const logContent = await fsSync.promises.readFile(logPath, 'utf-8');
                        const match = logContent.match(/Title ID:\s*([0-9A-F]{8})/i);

                        if (match && match[1]) {
                            const titleID = match[1].toUpperCase();
                            console.log(`[ZAR Scan] Xenia slow scan successful! Title ID: ${titleID}`);
                            
                            
                            resolve(await processAndSaveArt(titleID));
                        } else {
                            resolve({ success: false, error: "Title ID not found in Xenia log" });
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


ipcMain.handle('check-x360tid-status', async () => {
    const platform = require('os').platform();
    const toolPath = getBinaryPath('x360tid'); 
    const exists = fsSync.existsSync(toolPath);
    
    return {
        exists: exists,
        
        winUrl: '#',
        linuxUrl: '#'
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
        
        const xeniaDir = path.dirname(xeniaPath);

        if (platform === 'win32') {
            
            currentXeniaProcess = spawn(xeniaPath, [], { 
                detached: true,
                stdio: 'ignore',
                cwd: xeniaDir 
            });
        } 
        else if (platform === 'linux') {
            const launchMethod = store.get('linuxLaunchMethod', 'native'); 
            
            if (launchMethod === 'native') {
                try { await fsPromises.chmod(xeniaPath, 0o755); } catch (e) {}
                currentXeniaProcess = spawn(xeniaPath, [], { 
                    detached: true, 
                    stdio: 'ignore',
                    cwd: xeniaDir 
                });
            } 
            else if (launchMethod === 'wine') {
                currentXeniaProcess = spawn('wine', [xeniaPath], { 
                    detached: true, 
                    stdio: 'ignore',
                    cwd: xeniaDir 
                });
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

                currentXeniaProcess = exec(command, { 
                    env: protonEnv,
                    cwd: xeniaDir 
                });
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
            const configResult = await getXeniaConfigPath(); 
            
            if (configResult.path) {
                const xeniaBaseDir = path.dirname(configResult.path);
                const customConfigPath = path.join(xeniaBaseDir, 'config', `${titleID}.config.toml`);
                
                if (fsSync.existsSync(customConfigPath)) {
                    console.log(`[Game Launcher] 🎯 Applying custom config: ${customConfigPath}`);
                    args.push('--config');
                    args.push(customConfigPath);
                }
            }
        }

        
        const xeniaDir = path.dirname(xeniaPath);

        if (platform === 'win32') {
            console.log(`[Game Launcher] Spawning: ${xeniaPath} ${args.join(' ')}`);
            currentXeniaProcess = spawn(xeniaPath, args, { 
                detached: true,
                stdio: 'ignore',
                cwd: xeniaDir 
            });
        } 
        else if (platform === 'linux') {
            const launchMethod = store.get('linuxLaunchMethod', 'native'); 
            
            if (launchMethod === 'native') {
                try { await fsPromises.chmod(xeniaPath, 0o755); } catch (e) { console.warn(`[Game Launcher] Failed to chmod: ${e.message}`); }
                console.log(`[Game Launcher] Spawning: ${xeniaPath} ${args.join(' ')}`);
                
                currentXeniaProcess = spawn(xeniaPath, args, { 
                    detached: true,
                    stdio: 'ignore',
                    cwd: xeniaDir 
                });

            } else if (launchMethod === 'wine') {
                console.log(`[Game Launcher] Spawning: wine ${xeniaPath} ${args.join(' ')}`);
                currentXeniaProcess = spawn('wine', [xeniaPath, ...args], { 
                    detached: true,
                    stdio: 'ignore',
                    cwd: xeniaDir 
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

                currentXeniaProcess = exec(command, { 
                    env: protonEnv,
                    cwd: xeniaDir 
                });
                
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

    
    ipcMain.handle('getThemeCssUrl', async (event, themeName) => {
        const extCssPath = path.join(SYSTEMS_DIR, themeName, 'themes', 'style.css');
        
        if (fsSync.existsSync(extCssPath)) {
            return `app-sys://${themeName}/themes/style.css`;
        }
        
        return `themes/${themeName}/style.css`;
    });

    
    ipcMain.handle('loadLayout', async (event, viewName) => {
        try {
            const currentTheme = store.get('currentTheme') || 'NXE-2008';
            let filePath;
            
            
            const extThemePath = path.join(SYSTEMS_DIR, currentTheme, 'layouts', `${viewName}.html`);
            
            const intThemePath = path.join(__dirname, 'layouts', currentTheme, `${viewName}.html`);
            
            const basePath = path.join(__dirname, 'layouts', `${viewName}.html`);

            if (fsSync.existsSync(extThemePath)) filePath = extThemePath;
            else if (fsSync.existsSync(intThemePath)) filePath = intThemePath;
            else if (fsSync.existsSync(basePath)) filePath = basePath;
            else throw new Error(`Layout file not found in external, theme, or base: ${viewName}.html`);
            
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

async function forceExitApp() { 
    console.log('[System] Initiating forceful shutdown and cleaning Task Manager...');

    
    try {
        if (session && session.defaultSession) {
            console.log("[Shutdown] Clearing Chromium Cache...");
            await session.defaultSession.clearCache();
        }
    } catch (e) {
        console.error('[Cleanup] Failed to clear Chromium cache:', e.message);
    }

    
    if (controllerProcess && controllerProcess.pid) {
        try {
            if (process.platform === 'win32') {
                
                exec(`taskkill /pid ${controllerProcess.pid} /f /t`);
            } else {
                controllerProcess.kill('SIGKILL');
            }
        } catch (e) {
            console.error('[Cleanup] Controller kill error:', e.message);
        }
    }

    
    if (currentXeniaProcess && currentXeniaProcess.pid) {
        try {
            if (process.platform === 'win32') {
                exec(`taskkill /pid ${currentXeniaProcess.pid} /f /t`);
            } else {
                currentXeniaProcess.kill('SIGKILL');
            }
        } catch (e) {
            console.error('[Cleanup] Xenia kill error:', e.message);
        }
    }

    
    try {
        if (process.platform === 'win32') {
            
            exec('taskkill /f /im controller_service.exe /t');
            exec('taskkill /f /im xenia_canary.exe /t');
            exec('taskkill /f /im x360tid.exe /t');
        } else {
            exec('pkill -9 -f xenia_canary || true');
            exec('pkill -9 -f controller_service || true');
            exec('pkill -9 -f x360tid || true'); 
        }
    } catch (e) {}

    
    
    setTimeout(() => {
        app.exit(0); 
    }, 500);
}

app.on('window-all-closed', () => {
    forceExitApp(); 
});

    
ipcMain.handle('quit-app', () => {
    forceExitApp();
});

app.on('will-quit', () => {
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
    
    
    
    const optimizedDir = path.join(CONFIG_DIR, 'assets', 'optimized-settings');
    const optimizedSet = new Set();
    try {
        if (fsSync.existsSync(optimizedDir)) {
            const optFiles = await fs.readdir(optimizedDir);
            for (const f of optFiles) {
                const lowerF = f.toLowerCase();
                
                if (lowerF.endsWith('.json') || lowerF.endsWith('.toml')) {
                    const cleanFileName = f.substring(0, f.length - 5).replace(/[^A-Z0-9]/ig, '').toUpperCase();
                    optimizedSet.add(cleanFileName);
                }
            }
        }
    } catch (e) {
        console.warn("[Scanner] Failed to read optimized settings:", e.message);
    }
    

    const artSource = store.get('artSource') || 'LocalDB';
    const cache = await loadCache();
    const newCache = { ...cache };
    const gameList = [];
    const gamesToFetch = [];
    let cacheUpdated = false;

    
    const CONTENT_TYPES = {
        '00007000': 'Games on Demand',
        '000D0000': 'Xbox Live Arcade',
        '00004000': 'Game Install' 
    };

    try {
        const entries = await fs.readdir(gameFolder, { recursive: true, withFileTypes: true });
        
        for (const entry of entries) {
            const gamePath = path.join(entry.parentPath, entry.name);
            const gameFileName = entry.name;
            let isXBLA = false;
            let isGOD = false;
            let isGameInstall = false; 
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
                    if (contentTypeDir === '00007000') {
                        isGOD = true;
                    } else if (contentTypeDir === '000D0000') {
                        isXBLA = true;
                    } else if (contentTypeDir === '00004000') {
                        isGameInstall = true; 
                    }
                    detectedTitleID = titleIdDir.toUpperCase();
                }
            }

            
            if (isNormalGame || isXBLA || isGOD || isGameInstall) {
                const cacheKey = gameFileName;
                const gameNameOnly = (isXBLA || isGOD || isGameInstall) ? "" : path.basename(gameFileName, path.extname(gameFileName));

                let game = {
                    name: gameNameOnly,
                    fileName: gameFileName,
                    path: gamePath,
                    titleID: detectedTitleID || (cache[cacheKey]?.titleID) || null,
                    isArcade: isXBLA,
                    isGOD: isGOD,
                    isGameInstall: isGameInstall 
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
                    if (isXBLA) {
                        game.name = `Arcade Game [${game.titleID}]`;
                    } else if (isGOD) {
                        game.name = `GOD Game [${game.titleID}]`; 
                    } else if (isGameInstall) { 
                        game.name = `Installed Game [${game.titleID}]`; 
                    } else {
                        game.name = gameNameOnly;
                    }
                }

                
                const result = (isXBLA || isGOD || isGameInstall) ? { titleID: game.titleID, source: 'folder' } : await _resolveTitleIDInternal(game.path, game, { nameIndex });
                game.titleID = result.titleID;
                game.patchSource = result.source;
                game.patchFiles = result.titleID ? (patchMap[result.titleID] || []) : [];
                game.patchFileName = game.patchFiles.length > 0 ? game.patchFiles[0] : null;

                
                
                game.hasOptimizedSettings = game.titleID ? optimizedSet.has(game.titleID.toUpperCase()) : false;
                

                
                if (result.titleID && (!cache[cacheKey] || cache[cacheKey].titleID !== result.titleID)) {
                    newCache[cacheKey] = { ...newCache[cacheKey], titleID: result.titleID };
                    cacheUpdated = true;
                }

                if (cache[cacheKey]) {
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
        let allThemes = [];

        const readThemeIcons = async (themePath) => {
            const iconsPath = path.join(themePath, 'assets', 'icons');
            if (fsSync.existsSync(iconsPath)) {
                try { return await fs.readdir(iconsPath); } catch (e) { return []; }
            }
            return [];
        };

        try {
            const intDirs = await fs.readdir(path.join(__dirname, 'themes'), { withFileTypes: true });
            for (const d of intDirs) {
                if (d.isDirectory()) {
                    allThemes.push({ name: d.name, type: 'internal', customIcons: [] });
                }
            }
        } catch (e) {}

        try {
            if (fsSync.existsSync(SYSTEMS_DIR)) {
                const extDirs = await fs.readdir(SYSTEMS_DIR, { withFileTypes: true });
                for (const d of extDirs) {
                    if (d.isDirectory()) {
                        const themePath = path.join(SYSTEMS_DIR, d.name);
                        const customIcons = await readThemeIcons(themePath);
                        allThemes.push({ 
                            name: d.name, 
                            type: 'external', 
                            customIcons: customIcons 
                        });
                    }
                }
            }
        } catch (e) {}

        return { success: true, themes: allThemes };
    } catch (error) { 
        return { success: false, error: error.message, themes: [] }; 
    }
});

    
    ipcMain.handle('saveThemeConfig', async (event, themeName, configData) => {
        try {
            const extThemePath = path.join(SYSTEMS_DIR, themeName);
            if (!fsSync.existsSync(extThemePath)) return { success: false, error: 'Theme not found' };
            
            const configPath = path.join(extThemePath, 'config.json');
            await fs.writeFile(configPath, JSON.stringify(configData, null, 4));
            return { success: true };
        } catch (e) { return { success: false, error: e.message }; }
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

ipcMain.handle('check-xenia-update', async (event, platform, variant = 'standard') => {
    try {
        
        let repoUrl = 'https://api.github.com/repos/xenia-canary/xenia-canary/releases/latest';
        let folderName = platform === 'win' ? 'xenia-win' : 'xenia-linux';
        
        let exeName = platform === 'win' ? 'xenia_canary.exe' : 'xenia_canary.AppImage';

        
        if (variant === 'netplay') {
            repoUrl = 'https://api.github.com/repos/AdrianCassar/xenia-canary/releases/latest';
            folderName = platform === 'win' ? 'xenia-netplay-win' : 'xenia-netplay-linux';
            exeName = platform === 'win' ? 'xenia_canary_netplay.exe' : 'xenia_canary_netplay.AppImage';
        }

        const targetDir = path.join(CONFIG_DIR, 'assets', folderName);
        const versionFile = path.join(targetDir, 'version.json');
        
        const possibleExePaths = [
            path.join(targetDir, exeName),
            path.join(targetDir, exeName.replace('.AppImage', '')) 
        ];

        
        const { data: remoteRelease } = await axios.get(repoUrl, {
            headers: { 'User-Agent': 'Xenia-NXE-Launcher' },
            timeout: 5000
        });

        if (!remoteRelease) {
            return { success: false, error: "No latest release found on GitHub." };
        }

        let localData = null;
        let isInstalled = false;
        let isVersionFileExists = false;

        
        for (const p of possibleExePaths) {
            if (fsSync.existsSync(p)) {
                isInstalled = true;
                break;
            }
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

            if (localTag && remoteTag && localTag !== remoteTag) {
                status = 'update-available';
            } else {
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
                
                hash: remoteRelease.target_commitish ? remoteRelease.target_commitish.substring(0, 7) : remoteRelease.tag_name
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


ipcMain.handle('download-xenia', async (event, platform, variant = 'standard') => {
    let repoUrl = 'https://api.github.com/repos/xenia-canary/xenia-canary/releases/latest';
    let folderName = platform === 'win' ? 'xenia-win' : 'xenia-linux';
    let binaryName = platform === 'win' ? 'xenia_canary.exe' : 'xenia_canary.AppImage';

    if (variant === 'netplay') {
        repoUrl = 'https://api.github.com/repos/AdrianCassar/xenia-canary/releases/latest';
        folderName = platform === 'win' ? 'xenia-netplay-win' : 'xenia-netplay-linux';
        binaryName = platform === 'win' ? 'xenia_canary_netplay.exe' : 'xenia_canary_netplay.AppImage';
    }

    const downloadDir = path.join(CONFIG_DIR, 'temp_downloads');
    const finalTargetDir = path.join(CONFIG_DIR, 'assets', folderName);
    const tempExtractDir = path.join(CONFIG_DIR, 'assets', `${folderName}_temp_update`);

    const downloadType = variant === 'netplay' ? `${platform}Netplay` : platform;

    const sendLocalProgress = (payload) => {
        sendProgress({ ...payload, type: downloadType });
    };

    let downloadPath = '';
    let savedBinaryPath = '';

    
    async function findFileRecursive(dir, filename, fallbackExtensions = []) {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                const found = await findFileRecursive(fullPath, filename, fallbackExtensions);
                if (found) return found;
            } else {
                if (entry.name === filename) return fullPath;
                for (const ext of fallbackExtensions) {
                    if (entry.name.endsWith(ext) && entry.name.toLowerCase().includes('xenia')) return fullPath;
                }
            }
        }
        return null;
    }

    
    const getSevenBinPath = () => {
        const sevenBin = require('7zip-bin');
        let binPath = sevenBin.path7za || sevenBin.path7z;
        if (binPath && fsSync.existsSync(binPath)) {
            return binPath;
        }
        
        try {
            const { execSync } = require('child_process');
            const whichResult = execSync('which 7z 2>/dev/null || which 7za 2>/dev/null', { encoding: 'utf-8' }).trim();
            if (whichResult && fsSync.existsSync(whichResult)) return whichResult;
        } catch (e) {}
        throw new Error('7zip not found. Please install 7-Zip or p7zip.');
    };

    try {
        sendLocalProgress({ status: 'Connecting to GitHub server...', percentage: 0, step: 'connect' });

        const { data: release } = await axios.get(repoUrl, { 
            headers: { 'User-Agent': 'Xenia-NXE-Launcher' },
            timeout: 20000 
        });

        if (!release) throw new Error("No latest release found on GitHub.");

        
        let foundAsset = null;
        if (platform === 'win') {
            foundAsset = release.assets.find(a => 
                a.name.toLowerCase().includes('windows') && 
                (a.name.endsWith('.zip') || a.name.endsWith('.7z'))
            );
        } else {
            foundAsset = release.assets.find(a => 
                a.name.toLowerCase().includes('linux') && 
                (a.name.endsWith('.AppImage') || a.name.endsWith('.zip') || a.name.endsWith('.tar.gz'))
            );
        }

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

        
        const ext = path.extname(foundAsset.name).toLowerCase();

        if (ext === '.appimage') {
            
            await fs.copyFile(downloadPath, path.join(tempExtractDir, binaryName));
        } 
        else if (ext === '.7z' || ext === '.zip' || ext === '.tar.gz' || ext === '.tgz') {
            
            const sevenPath = getSevenBinPath();
            
            if (process.platform !== 'win32') {
                try { await fs.chmod(sevenPath, 0o755); } catch (e) {}
            }

            const { execFile } = require('child_process');
            await new Promise((resolve, reject) => {
                const args = ['x', downloadPath, `-o${tempExtractDir}`, '-y'];
                console.log(`[7zip] Running: ${sevenPath} ${args.join(' ')}`);
                const proc = execFile(sevenPath, args, { cwd: downloadDir });
                let stderr = '';
                proc.stderr.on('data', (data) => { stderr += data.toString(); });
                proc.on('close', (code) => {
                    if (code === 0) {
                        resolve();
                    } else {
                        reject(new Error(`7zip extraction failed with code ${code}: ${stderr}`));
                    }
                });
                proc.on('error', (err) => reject(err));
            });
        } 
        else {
            
            if (platform === 'win') await decompress(downloadPath, tempExtractDir);
            else await execPromise(`tar -xf "${downloadPath}" -C "${tempExtractDir}"`);
        }

        sendLocalProgress({ status: 'Installing binaries...', percentage: 100, step: 'install' });

        if (!fsSync.existsSync(finalTargetDir)) await fs.mkdir(finalTargetDir, { recursive: true });

        const fallbackExts = platform === 'win' ? ['.exe'] : ['.AppImage', ''];
        const foundBinaryPath = await findFileRecursive(tempExtractDir, binaryName, fallbackExts);
        
        if (foundBinaryPath) {
            const targetBinaryPath = path.join(finalTargetDir, binaryName);
            if (fsSync.existsSync(targetBinaryPath)) await fs.unlink(targetBinaryPath);
            await fs.copyFile(foundBinaryPath, targetBinaryPath);
            
            const portableFile = path.join(finalTargetDir, 'portable.txt');
            if (!fsSync.existsSync(portableFile)) {
                await fs.writeFile(portableFile, ''); 
            }
            
            store.set('xeniaPath', targetBinaryPath);
            savedBinaryPath = targetBinaryPath;
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
    
    const downloadUrl = 'https://github.com/xenia-canary/game-patches/releases/latest/download/game-patches.7z';
    const assetName = 'game-patches.7z';
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
            console.log(`[Patches] Target from settings: ${patchesDir}`);
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

        
        sendPatchProgress({ status: 'Downloading patches...', percentage: 0, step: 'download' });
        const writer = fsSync.createWriteStream(downloadPath);
        const response = await axios({
            url: downloadUrl,
            method: 'GET',
            responseType: 'stream'
        });

        const totalBytes = parseInt(response.headers['content-length'], 10);
        let downloadedBytes = 0;
        response.data.on('data', (chunk) => {
            downloadedBytes += chunk.length;
            const percentage = Math.floor((downloadedBytes / totalBytes) * 100);
            sendPatchProgress({ status: 'Downloading...', percentage, step: 'download' });
        });

        response.data.pipe(writer);
        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        sendPatchProgress({ status: 'Extracting patches...', percentage: 80, step: 'extract' });

        
        const extractTemp = path.join(downloadDir, 'patches_extracted');
        if (fsSync.existsSync(extractTemp)) await fs.rm(extractTemp, { recursive: true, force: true });
        await fs.mkdir(extractTemp, { recursive: true });

        
        const sevenBin = require('7zip-bin');
        let sevenPath = sevenBin.path7za || sevenBin.path7z;

        
        if (!sevenPath || !fsSync.existsSync(sevenPath)) {
            const { execSync } = require('child_process');
            try {
                const whichResult = execSync('which 7z 2>/dev/null || which 7za 2>/dev/null', { encoding: 'utf-8' }).trim();
                if (whichResult && fsSync.existsSync(whichResult)) {
                    sevenPath = whichResult;
                }
            } catch (e) {}
        }

        if (!sevenPath || !fsSync.existsSync(sevenPath)) {
            throw new Error('7zip binary not found. Please install 7-Zip or p7zip.');
        }

        
        if (process.platform !== 'win32') {
            try { await fs.chmod(sevenPath, 0o755); } catch (e) {}
        }

        
        const { execFile } = require('child_process');
        await new Promise((resolve, reject) => {
            const args = ['x', downloadPath, `-o${extractTemp}`, '-y'];
            console.log(`[7zip] Running: ${sevenPath} ${args.join(' ')}`);
            const proc = execFile(sevenPath, args, { cwd: downloadDir });
            let stderr = '';
            proc.stderr.on('data', (data) => { stderr += data.toString(); });
            proc.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`7zip extraction failed with code ${code}: ${stderr}`));
                }
            });
            proc.on('error', (err) => reject(err));
        });

        
        let sourcePatchesDir = null;
        const findPatchesDir = async (dir) => {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    const files = await fs.readdir(fullPath);
                    if (files.some(f => f.endsWith('.patch.toml'))) {
                        return fullPath;
                    }
                    const found = await findPatchesDir(fullPath);
                    if (found) return found;
                }
            }
            return null;
        };
        sourcePatchesDir = await findPatchesDir(extractTemp);
        if (!sourcePatchesDir) {
            
            sourcePatchesDir = extractTemp;
        }

        sendPatchProgress({ status: 'Installing patches...', percentage: 90, step: 'install' });
        for (const dir of targetDirs) {
            await fs.cp(sourcePatchesDir, dir, { recursive: true, force: true });
            console.log(`[Patches] Copied to: ${dir}`);
        }

        sendPatchProgress({ status: 'Cleaning up...', percentage: 95, step: 'cleanup' });
        await fs.rm(extractTemp, { recursive: true, force: true });
        await fs.unlink(downloadPath);

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


ipcMain.handle('translate-text', async (event, text, targetLang) => {
    try {
        
        const lang = targetLang || 'en';
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${lang}&dt=t&q=${encodeURIComponent(text)}`;
        
        const response = await axios.get(url);
        
        
        const translatedText = response.data[0].map(s => s[0]).join('');
        return { success: true, translatedText };
    } catch (error) {
        console.error("Translation Error:", error);
        return { success: false, error: error.message };
    }
});


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
        contentRoot = path.join(path.dirname(xeniaPath), 'content');
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


ipcMain.handle('get-game-compatibility', async (event, query) => {
    return await fetchGameCompatibility(query);
});





ipcMain.handle('manage-game-config', async (event, { action, titleID, data }) => {
    const xeniaPath = store.get('xeniaPath');
    if (!xeniaPath || xeniaPath.startsWith('Click')) {
        return { success: false, error: "Xenia path not set." };
    }

    
    const configResult = await getXeniaConfigPath(); 
    if (configResult.error) return { success: false, error: configResult.error };

    const globalConfigPath = configResult.path; 
    const xeniaBaseDir = path.dirname(globalConfigPath); 
    const gameConfigDir = path.join(xeniaBaseDir, 'config');
    const gameConfigPath = path.join(gameConfigDir, `${titleID}.config.toml`);

    try {
        
        if (!fsSync.existsSync(gameConfigDir)) {
            await fs.mkdir(gameConfigDir, { recursive: true });
        }

        if (action === 'load') {
            let isNewFile = false;

            
            if (!fsSync.existsSync(gameConfigPath)) {
                if (fsSync.existsSync(globalConfigPath)) {
                    console.log(`[Game Config] Creating Linux/Win config for ${titleID} at: ${gameConfigPath}`);
                    await fs.copyFile(globalConfigPath, gameConfigPath);
                    isNewFile = true;
                } else {
                    
                    await fs.writeFile(gameConfigPath, '# Per-Game Config\n');
                    isNewFile = true;
                }
            }

            const result = await runPythonScript('patch_manager', ['load_config', gameConfigPath]);
            if (!result.success) throw new Error(result.error);
            
            return { 
                success: true, 
                data: result.data, 
                isNew: isNewFile,
                path: gameConfigPath 
            };
        }

        else if (action === 'save') {
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

ipcMain.handle('rename-profile', async (event, { xuid, newName }) => {
    try {
        const contentRoot = await getContentRootPath();
        
        const accountPath = path.join(contentRoot, xuid, 'FFFE07D1', '00010000', xuid, 'Account');
        const toolboxPath = getBinaryPath('xenia_toolbox');

        return new Promise((resolve) => {
            
            const child = spawn(toolboxPath, ['rename', accountPath, newName]);
            let out = '';
            child.stdout.on('data', (d) => { out += d.toString(); });
            child.on('close', () => {
                try { 
                    resolve(JSON.parse(out)); 
                } catch (e) { 
                    resolve({ success: false, error: "Toolbox Error" }); 
                }
            });
        });
    } catch (e) { 
        return { success: false, error: e.message }; 
    }
});


ipcMain.handle('assign-profile-to-slot', async (event, { xuid, slotIndex }) => {
    const configResult = await getXeniaConfigPath();
    if (configResult.error) return { success: false };
    try {
        let content = await fs.readFile(configResult.path, 'utf-8');
        const key = `logged_profile_slot_${slotIndex}_xuid`;
        const regex = new RegExp(`${key}\\s*=\\s*"[0-9A-F]*"`, 'i');
        const newLine = `${key} = "${xuid.toUpperCase()}"`;
        content = regex.test(content) ? content.replace(regex, newLine) : content.replace('[General]', `[General]\n${newLine}`);
        await fs.writeFile(configResult.path, content);
        return { success: true };
    } catch (e) { return { success: false }; }
});


ipcMain.handle('logout-profile-slot', async (event, slotIndex) => {
    const configResult = await getXeniaConfigPath();
    if (configResult.error) return { success: false };
    try {
        let content = await fs.readFile(configResult.path, 'utf-8');
        const key = `logged_profile_slot_${slotIndex}_xuid`;
        const regex = new RegExp(`${key}\\s*=\\s*"[0-9A-F]*"`, 'i');
        content = content.replace(regex, `${key} = ""`);
        await fs.writeFile(configResult.path, content);
        return { success: true };
    } catch (e) { return { success: false }; }
});


ipcMain.handle('delete-profile', async (event, xuid) => {
    try {
        const contentRoot = await getContentRootPath(); 
        const profilePath = path.join(contentRoot, xuid);
        
        if (fsSync.existsSync(profilePath)) {
            
            await fs.rm(profilePath, { recursive: true, force: true });
            console.log(`[System] Profile ${xuid} deleted from disk.`);
            return { success: true };
        }
        return { success: false, error: "Profile folder not found" };
    } catch (e) {
        return { success: false, error: e.message };
    }
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



ipcMain.handle('deep-scan-game', async (event, gamePath) => {
    const toolPath = getBinaryPath('x360tid');
    console.log(`[Deep Scan] Starting x360tid JSON scan for: ${gamePath}`);

    return new Promise((resolve) => {
        
        const command = `"${toolPath}" -j "${gamePath}"`;

        exec(command, { 
            maxBuffer: 1024 * 1024 * 10, 
            timeout: 30000 
        }, (error, stdout, stderr) => {
            let foundID = null;

            try {
                
                const data = JSON.parse(stdout);
                if (Array.isArray(data) && data.length > 0 && data[0].title_id) {
                    foundID = data[0].title_id.toUpperCase();
                }
            } catch (parseError) {
                console.error(`[Deep Scan] JSON Parse Error:`, parseError.message);
            }

            if (foundID) {
                console.log(`[Deep Scan] 🔥 Success! Found ID using x360tid: ${foundID}`);
                
                
                updateGameCacheID(gamePath, foundID);
                
                resolve({ success: true, titleID: foundID });
            } else {
                console.error(`[Deep Scan] Failed to find ID with x360tid.`);
                resolve({ success: false, error: "Could not extract ID from this file." });
            }
        });
    });
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

        
        session.defaultSession.protocol.registerFileProtocol('app-sys', (req, callback) => {
            try {
                let rawUrl = req.url.replace('app-sys://', '');
                let decodedPath = decodeURIComponent(rawUrl).split('?')[0];

                if (process.platform === 'win32' && decodedPath.startsWith('/') && /^\/[a-zA-Z]:/.test(decodedPath)) {
                    decodedPath = decodedPath.substring(1);
                }
                
                const finalPath = path.join(SYSTEMS_DIR, path.normalize(decodedPath));
                
                if (fsSync.existsSync(finalPath)) {
                    return callback({ path: finalPath });
                }
                console.error(`[Sys Protocol] File not found: ${finalPath}`);
                callback({ error: -6 });
            } catch (e) {
                callback({ error: -2 });
            }
        });
        
        session.defaultSession.protocol.registerFileProtocol('app-core', (req, callback) => {
            try {
                let rawUrl = req.url.replace('app-core://', '');
                let decodedPath = decodeURIComponent(rawUrl).split('?')[0];
                
                
                const finalPath = path.join(__dirname, path.normalize(decodedPath));
                
                if (fsSync.existsSync(finalPath)) {
                    return callback({ path: finalPath });
                }
                console.error(`[Core Protocol] File not found: ${finalPath}`);
                callback({ error: -6 });
            } catch (e) {
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

async function readTitleIDFromFile(gamePath) {
    const toolPath = getBinaryPath('x360tid');

    console.log(`[x360tid] Target Binary Path: ${toolPath}`);

    
    if (!fsSync.existsSync(toolPath)) {
        console.error(`[x360tid] Binary not found at ${toolPath}. Skipping file scan.`);
        return null;
    }

    
    if (require('os').platform() !== 'win32') {
        try { fsSync.chmodSync(toolPath, 0o755); } 
        catch (chmodError) { if (chmodError.code !== 'EROFS') console.warn(`[x360tid] chmod warning: ${chmodError.message}`); }
    }

    return new Promise((resolve) => {
        
        const command = `"${toolPath}" -j "${gamePath}"`;
        
        exec(command, (error, stdout, stderr) => {
            if (error && !stdout) {
                console.warn(`[x360tid] Failed to run on ${gamePath}: ${error.message}`);
                resolve(null);
                return;
            }
            
            try {
                
                const data = JSON.parse(stdout);
                
                
                if (Array.isArray(data) && data.length > 0 && data[0].title_id) {
                    const titleId = data[0].title_id.toUpperCase();
                    console.log(`[x360tid] Found Title ID via JSON: ${titleId} for ${gamePath}`);
                    resolve(titleId);
                    return;
                }
            } catch (parseError) {
                console.warn(`[x360tid] Failed to parse JSON output: ${parseError.message}`);
            }
            
            console.warn(`[x360tid] Ran successfully but no Title ID found in JSON.`);
            resolve(null);
        });
    });
}

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