const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
    get: (key) => ipcRenderer.invoke('get', key),
    set: (key, value) => ipcRenderer.invoke('set', key, value),
    
    loadTomlConfig: () => ipcRenderer.invoke('loadTomlConfig'),
    saveTomlConfig: (data) => ipcRenderer.invoke('saveTomlConfig', data),

    openFile: () => ipcRenderer.invoke('openFile'),
    openDirectory: () => ipcRenderer.invoke('openDirectory'),
    
    openImageFile: () => ipcRenderer.invoke('openImageFile'),
    
    checkPathExists: (path) => ipcRenderer.invoke('checkPathExists', path),
    openFileInDefaultApp: (fileKey) => ipcRenderer.invoke('openFileInDefaultApp', fileKey),
    
    loadLayout: (viewName) => ipcRenderer.invoke('loadLayout', viewName),
    loadDashboardData: () => ipcRenderer.invoke('loadDashboardData'),
    scanForThemes: () => ipcRenderer.invoke('scanForThemes'),
    
    scanForGames: () => ipcRenderer.invoke('scanForGames'),
    launchGame: (xeniaPath, gamePath, titleID) => ipcRenderer.invoke('launchGame', xeniaPath, gamePath, titleID),
    
    downloadXenia: (platform) => ipcRenderer.invoke('download-xenia', platform),
    downloadPatches: () => ipcRenderer.invoke('download-patches'),
    
    loadPatchesForGame: (titleID, patchFileName) => ipcRenderer.invoke('loadPatchesForGame', titleID, patchFileName),
    saveAllPatchesForGame: (fileName, patchList, patchHeader) => ipcRenderer.invoke('saveAllPatchesForGame', fileName, patchList, patchHeader),
    
    onDownloadProgress: (callback) => ipcRenderer.on('download-progress', (event, statusObject) => callback(statusObject)),
    onArtUpdated: (callback) => ipcRenderer.on('art-updated', (event) => callback()),
    onGamepadInput: (callback) => ipcRenderer.on('gamepad-input', (event, message) => callback(message)),
    onControllerReEnabled: (callback) => ipcRenderer.on('controller-re-enabled', () => callback()),
    onWindowFocus: (callback) => ipcRenderer.on('window-focus', () => callback()),
    onGameStarted: (callback) => ipcRenderer.on('game-started', () => callback()),
    onGameStopped: (callback) => ipcRenderer.on('game-stopped', () => callback()),

    joinPaths: (...paths) => ipcRenderer.invoke('join-paths', ...paths),
    getGameCompatibility: (query) => ipcRenderer.invoke('get-game-compatibility', query),
    deleteGame: (path) => ipcRenderer.invoke('delete-game', path),
    checkXeniaUpdate: (platform) => ipcRenderer.invoke('check-xenia-update', platform),

    loadLocales: () => ipcRenderer.invoke('loadLocales'),
    manageGameConfig: (payload) => ipcRenderer.invoke('manage-game-config', payload),
    deepScanGame: (gamePath) => ipcRenderer.invoke('deep-scan-game', gamePath),
    launchXeniaDashboard: (xeniaPath) => ipcRenderer.invoke('launch-xenia-dashboard', xeniaPath),
    openAudioFile: () => ipcRenderer.invoke('openAudioFile'),
    searchSteamGridDBAssets: (data) => ipcRenderer.invoke('search-steamgriddb-assets', data),
    updateGameArt: (data) => ipcRenderer.invoke('update-game-art', data),

    getLocalGameMetadata: (titleID) => ipcRenderer.invoke('get-local-game-metadata', titleID),
    onWindowBlur: (callback) => ipcRenderer.on('window-blur', () => callback()),
    

    translateText: (text, targetLang) => ipcRenderer.invoke('translate-text', text, targetLang),
    checkAbgxStatus: () => ipcRenderer.invoke('check-abgx-status'),

    scanZarTitleID: (gamePath) => ipcRenderer.invoke('scan-zar-titleid', gamePath),
    getAllUserProfiles: () => ipcRenderer.invoke('get-all-user-profiles'),
    setActiveProfileSlot: (slotIndex) => ipcRenderer.invoke('set-active-profile-slot', slotIndex),
    getUserGamerpic: (xuid, slot) => ipcRenderer.invoke('get-user-gamerpic', xuid, slot),
    
    getPlayedGamesList: (xuid) => ipcRenderer.invoke('get-played-games-list', xuid),    
    getGameAchievements: (titleID, xuid, forceRefresh) => ipcRenderer.invoke('get-game-achievements', titleID, xuid, forceRefresh),
    createProfile: (gamertag) => ipcRenderer.invoke('create-profile', gamertag),
    getCachedAchievements: (xuid) => ipcRenderer.invoke('get-cached-achievements', xuid),
    saveAchievementsCache: (data) => ipcRenderer.invoke('save-achievements-cache', data),
    updateGameName: (data) => ipcRenderer.invoke('update-game-name', data),
    renameProfile: (data) => ipcRenderer.invoke('rename-profile', data),
    assignProfileToSlot: (data) => ipcRenderer.invoke('assign-profile-to-slot', data),
    logoutProfileSlot: (slotIndex) => ipcRenderer.invoke('logout-profile-slot', slotIndex),
    deleteProfile: (xuid) => ipcRenderer.invoke('delete-profile', xuid),
    quitApp: () => ipcRenderer.invoke('quit-app')
});

