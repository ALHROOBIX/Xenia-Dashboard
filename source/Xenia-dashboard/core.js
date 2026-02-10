
document.addEventListener('alpine:init', () => {
    
    let isScanning = false;
    
    let keyRepeatTimers = {
        x: { delay: null, interval: null },
        y: { delay: null, interval: null }
    };


    const DEFAULT_PRESETS = [
        { 
            id: 'xbox-classic', name: 'NXE Classic', 
            colors: { 
                primary: '#90c31d', light: '#d0e4a1', dark: '#61920c', 
                bgTop: '#5f5f5f', bgBottom: '#3a3a3a', 
                listBgTop: '#2d3235', listBgBottom: '#202326', 
                text: '#ffffff', textSec: '#cccccc',
                panel: '#000000', alert: '#ff6b6b',
                btnA: '#59c853', btnB: '#e5443a', btnX: '#3a82e5', btnY: '#f2c40e'
            } 
        },
        { 
            id: 'blades-orange', name: 'Blades Orange', 
            colors: { 
                primary: '#ff8c00', light: '#ffb347', dark: '#b36200', 
                bgTop: '#4a3b2a', bgBottom: '#291e12', 
                listBgTop: '#3d2e1e', listBgBottom: '#1f160d', 
                text: '#ffffff', textSec: '#d6c2b0',
                panel: '#1f160d', alert: '#ff4444',
                btnA: '#59c853', btnB: '#e5443a', btnX: '#3a82e5', btnY: '#f2c40e'
            } 
        },
        { 
            id: 'kinect-purple', name: 'Kinect Purple', 
            colors: { 
                primary: '#9b59b6', light: '#d2b4de', dark: '#71368a', 
                bgTop: '#3e2745', bgBottom: '#1f1024', 
                listBgTop: '#2e1a33', listBgBottom: '#150b17', 
                text: '#ffffff', textSec: '#dcc6e0',
                panel: '#150b17', alert: '#ff6b6b',
                btnA: '#59c853', btnB: '#e5443a', btnX: '#3a82e5', btnY: '#f2c40e'
            } 
        },
        { 
            id: 'midnight-blue', name: 'Midnight Blue', 
            colors: { 
                primary: '#3498db', light: '#85c1e9', dark: '#2980b9', 
                bgTop: '#212f3d', bgBottom: '#17202a', 
                listBgTop: '#1a2530', listBgBottom: '#0d1317', 
                text: '#ffffff', textSec: '#abc8e0',
                panel: '#0d1317', alert: '#ff6b6b',
                btnA: '#59c853', btnB: '#e5443a', btnX: '#3a82e5', btnY: '#f2c40e'
            } 
        }
    ];

    Alpine.store('app', {
        currentView: 'dashboard',
        currentViewHTML: '<h1>Loading...</h1>', 
        viewStack: [],
        isPageTransitioning: false, 
        isControllerLocked: false, 
        
        currentTheme: 'NXE-2008',
        themesList: [],
        libraryMemoryIndex: 0,
        playerTag: 'XeniaUser',
        gamerscore: 1337,
        userAvatar: null,     
        settings: {
            xeniaPath: 'Click "Select" to set xenia_canary.exe path',
            gameFolderPath: 'Click "Select" to set your game folder',
            apiKey: '',
            linuxLaunchMethod: 'native', 
            protonPath: '',
        },
        apiSaveStatus: false, 
        downloadStatuses: {
            win: { status: 'idle', percentage: 0, step: 'idle' },
            linux: { status: 'idle', percentage: 0, step: 'idle' },
            patches: { status: 'idle', percentage: 0, step: 'idle' }
        },
        focusedList: 'master', 
        masterMenu: [], masterIndex: 1, detailMenu: [], detailIndex: 0,        
        selectedGame: null,
        originalOpenTray: null, 
        gamesList: [],
        filteredLibraryGames: [],
        gameDetails: { title: '', logoUrl: '', heroUrl: '' },
        gameExtendedInfo: { 
            description: '',
            originalDescription: '',
            translatedDescription: '',
            isTranslating: false,      
            developer: '', 
            publisher: '', 
            genre: '', 
            releaseDate: '', 
            rating: '', 
            screenshots: [],
            loading: false
        },
        abgxStatus: { exists: true, winUrl: '', linuxUrl: '' },
        showAbgxNotify: false,
        
        settingsMenu: [
            { id: 'core', name: 'Core Configuration', view: 'settings-core', icon: 'assets/icons/Console-Xbox.png' },
            { id: 'colors', name: 'Interface Colors', view: 'settings-colors', icon: 'assets/icons/icon-theme.png' },
            { id: 'system', name: 'System Settings', view: 'settings-system', icon: 'assets/icons/System Settings.png' },
            { id: 'display', name: 'Wallpaper Settings', view: 'settings-display', icon: 'assets/icons/wallpaper_settings.png' },
            { id: 'audio', name: 'Sound Settings', view: 'settings-audio', icon: 'assets/icons/Sound.png' },
            { id: 'language', name: 'Language', view: 'language-select', icon: 'assets/icons/earth.png' }
            
        ],


        aboutMenu: [
            { id: 'app_info', name: 'App Info', icon: 'assets/icons/icon.png' },
            { id: 'developer', name: 'Developer', icon: 'assets/icons/Dev.webp' },
            { id: 'help', name: 'Help', icon: 'assets/icons/Help.webp' },
            { id: 'legal', name: 'Legal', icon: 'assets/icons/Legal.webp' }
        ],


        systemTime: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        
        
        colorPresets: [], 
        activeColorThemeId: 'xbox-classic',
        customColors: { 
            primary: '#90c31d', light: '#d0e4a1', dark: '#61920c', 
            bgTop: '#5f5f5f', bgBottom: '#3a3a3a',
            listBgTop: '#2d3235', listBgBottom: '#202326',
            text: '#ffffff', textSec: '#cccccc',
            panel: '#000000', alert: '#ff6b6b',
            btnA: '#59c853', btnB: '#e5443a', btnX: '#3a82e5', btnY: '#f2c40e'
        },
        newThemeName: '', 

        displaySettings: {
            wallpaperPath: null, wallpaperName: 'Default',
            stagePath: null, stageName: 'Default',
            flourishPath: null, flourishName: 'Default'
        },
        displayItems: ['wallpaper', 'stage', 'flourish'], 

        coreSettingsItems: [
            { id: 'config-file', name: 'xenia canary config', icon: 'assets/icons/xenia canary.png', view: 'settings-config' },
            { id: 'xenia-path', name: 'xenia path', icon: 'assets/icons/Xbox-360_files.png' },
            { id: 'game-folder', name: 'Game Folders', icon: 'assets/icons/xbox 360-gamepad.png' },
            { id: 'linux-launch', name: 'Linux Launch Method', icon: 'assets/icons/linux.png' },
            { id: 'proton-path', name: 'Proton Path', icon: 'assets/icons/steam.png' },
            { id: 'steamgrid-api', name: 'steamgriddb api', icon: 'assets/icons/steamgriddb.png' },

            { id: 'download-xenia-win', name: 'Download Xenia (Windows)', icon: 'assets/icons/Windows.png' },
            { id: 'download-xenia-linux', name: 'Download Xenia (Linux)', icon: 'assets/icons/linux.png' },
            { id: 'download-patches', name: 'Download Game Patches', icon: 'assets/icons/xenia canary.png' },
            { id: 'open-xenia-dash', name: 'Open Xenia Dashboard', icon: 'assets/icons/xenia canary.png' },
            { 
                id: 'art-source', 
                name: 'Metadata Source', 
                icon: 'assets/icons/database.png',
                
            },
            
        ],

        soundSettings: {
            masterVolume: 1.0, 
            bgmVolume: 0.5,   
            bgmFile: null,     
            files: {
                select: 'default',
                back: 'default',
                focus: 'default',
                channelUp: 'default',
                channelDown: 'default',
                panelLeft: 'default',
                panelRight: 'default',
                panelUnfold: 'default'
            }
        },

        audioMenu: [ 
            { id: 'volume', name: 'Master Volume', type: 'slider' },
            { id: 'bgmVolume', name: 'Music Volume', type: 'slider' },
            { id: 'bgmFile', name: 'Background Music', type: 'file' },
            { id: 'select', name: 'Select Sound', type: 'file' },
            { id: 'back', name: 'Back Sound', type: 'file' },
            { id: 'focus', name: 'Navigation Sound', type: 'file' },
            { id: 'panelUnfold', name: 'Menu Open', type: 'file' },
            { id: 'channelUp', name: 'Blade Up', type: 'file' },
            { id: 'channelDown', name: 'Blade Down', type: 'file' },
            { id: 'panelLeft', name: 'Tab Left', type: 'file' },
            { id: 'panelRight', name: 'Tab Right', type: 'file' }
        ],
        activeSoundElement: null,
        audioCache: {},
        focusedCollection: null, focusedIndex: 0, selectedIndexForAnimation: -1, gameSelectionAnimating: false,
        focusedGamePatchInfo: null, patchList: [], patchHeader: {}, patchesLoadingError: null,
        isPatchSelectorOpen: false, 
        patchSelectorFiles: [],     
        patchSelectorIndex: 0,      
        xeniaConfig: {}, configCategories: [], focusedConfigCategoryIndex: 0, configSaveStatus: 'idle',
        xeniaConfigError: null, configFocusedPanel: 'categories', currentConfigOptions: [], configOptionIndex: 0,
        patchSaveStatus: 'idle',
        isLbPressed: false,


        librarySearch: '', 
        isKeyboardOpen: false,
        keyboardRow: 1, 
        keyboardCol: 0,
        isCaps: false,
        isSymbols: false,
        isAccents: false,
        searchCursorPos: 0,
        
        keyboardLayouts: {
            normal: [
                ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
                ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
                ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', '-'],
                ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '@']
            ],
            shift: [
                ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
                ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
                ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', '-'],
                ['Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '@']
            ],
            symbols: [
                ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')'],
                ['~', '`', '_', '+', '{', '}', '|', ':', '"', '?'],
                ['[', ']', '\\', ';', '\'', '<', '>', '/', '=', '-'],
                ['.com', '.net', 'http', 'www', '.org', ',', '.', '@', ' ', ' ']
            ],

            accents: [
                ['à', 'á', 'â', 'ä', 'æ', 'ã', 'å', 'ā', '1', '0'],
                ['è', 'é', 'ê', 'ë', 'ē', 'ė', 'ę', '2', '3', '4'],
                ['î', 'ï', 'í', 'ī', 'į', 'ì', '5', '6', '7', '8'],
                ['ô', 'ö', 'ò', 'ó', 'œ', 'ø', 'ō', 'õ', '9', '@']
            ]

        },
        get currentKeys() {
            if (this.isSymbols) return this.keyboardLayouts.symbols;
            if (this.isAccents) return this.keyboardLayouts.accents; 
            if (this.isCaps) return this.keyboardLayouts.shift;
            return this.keyboardLayouts.normal;
        },

        showGameInfoOverlay: false,
        isGuideOpen: false,
        guideTabIndex: 1,
        guideMenuIndex: 0,
        guideTabs: [
            { id: 'home', name: 'Xbox Guide' },
            { id: 'games', name: 'Games' }
        ],
        inputLocked: false,


        xeniaUpdateInfo: {
            win: { 
                status: 'idle', 
                localVer: '---', remoteVer: '---', localDate: '', remoteDate: '', 
                showButton: true, btnText: 'Check', 
                message: 'Press (Y) to Check for Updates', 
                color: '#ffffff' 
            },
            linux: { 
                status: 'idle', 
                localVer: '---', remoteVer: '---', localDate: '', remoteDate: '', 
                showButton: true, btnText: 'Check', 
                message: 'Press (Y) to Check for Updates', 
                color: '#ffffff' 
            }
        },

        language: 'en',
        translations: {}, 

        t(key) {
            const keys = key.split('.');
            let current = this.translations[this.language];
            
            for (const k of keys) {
                if (current && current[k]) {
                    current = current[k];
                } else {
                    return key; 
                }
            }
            return current;
        },

        languageOptions: [
            { code: 'en', name: 'English', native: 'United States', flag: '🇺🇸' },
            { code: 'ar', name: 'العربية', native: 'المملكة العربية السعودية', flag: '🇸🇦' },
            { code: 'zh', name: '中文', native: '中国', flag: '🇨🇳' },
            { code: 'ja', name: '日本語', native: '日本', flag: '🇯🇵' },
            { code: 'ko', name: '한국어', native: '대한민국', flag: '🇰🇷' },
            { code: 'ru', name: 'Русский', native: 'Россия', flag: '🇷🇺' },
            { code: 'de', name: 'Deutsch', native: 'Deutschland', flag: '🇩🇪' },
            { code: 'pt_BR', name: 'Português (Brasil)', native: 'Brasil', flag: '🇧🇷' },
            { code: 'es', name: 'Español', native: 'España', flag: '🇪🇸' },
            { code: 'tr', name: 'Türkçe', native: 'Türkiye', flag: '🇹🇷' },
            { code: 'it', name: 'Italiano', native: 'Italia', flag: '🇮🇹' },
            { code: 'fr', name: 'Français', native: 'France', flag: '🇫🇷' }
        ],

        configMode: 'global', 
        editingGameInfo: null, 

        
        isArtManagerOpen: false,
        artManagerData: {
            gameIndex: -1,     
            gameName: '',      
            selectedTab: 'cover', 
            source: 'steam',   
            assets: [],       
            loading: false,
            focusedAssetIndex: 0, 
            error: null
        },
        artTabs: ['cover', 'hero', 'logo', 'icon'],
        isGameRunning: false,

        rtLock: false, 
        ltLock: false,
        profilesList: [],
        activeProfileSlot: 0,
        focusedProfileIndex: 0, 
        isProfileSelectorOpen: false,
        achievementsGamesList: [],
        isCreatingProfile: false, 
        newProfileName: '',
        isAchievementOverlayOpen: false,
        selectedAchievementGame: null,
        focusedAchievementIndex: 0,
        ach_lock: false,
    });

    Alpine.store('actions', {

        openAchievementOverlay() {
            const app = Alpine.store('app');
            const game = app.achievementsGamesList[app.focusedIndex];
            if (game && !game.loading) {
                app.selectedAchievementGame = game;
                app.focusedAchievementIndex = 0;
                app.isAchievementOverlayOpen = true;
                this.playSound('panelUnfold');
            }
        },

        closeAchievementOverlay() {
            const app = Alpine.store('app');
            app.isAchievementOverlayOpen = false;
            this.playSound('back');
        },

        moveAchievementGridFocus(rowDir, colDir) {
            const app = Alpine.store('app');
            if (!app.selectedAchievementGame || app.ach_lock) return;

            const achievements = app.selectedAchievementGame.realAchievements;
            const cols = 8; 
            let newIndex = app.focusedAchievementIndex;

            if (colDir !== 0) newIndex += colDir;
            if (rowDir !== 0) newIndex += (rowDir * cols);

            if (newIndex >= 0 && newIndex < achievements.length) {
                app.focusedAchievementIndex = newIndex;
                this.playSound('focus');
                app.ach_lock = true;
                setTimeout(() => { app.ach_lock = false; }, 150);

                
                const el = document.getElementById('ach-slot-' + newIndex);
                if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        },
        async loadAchievementsData() {
            const app = Alpine.store('app');
            const xuid = await window.electronAPI.get('xuid');
            
            if (!xuid) {
                console.error("No XUID found, cannot load achievements.");
                return;
            }

            const result = await window.electronAPI.getPlayedGamesList(xuid);
            
            if (result.success) {
                
                app.achievementsGamesList = result.games.map(g => ({
                    ...g,
                    realAchievements: [],
                    earnedCount: 0,   
                    totalAchCount: 0, 
                    earnedScore: 0,    
                    loading: true
                }));

                
                for (const game of app.achievementsGamesList) {
                    try {
                        const achRes = await window.electronAPI.getGameAchievements(game.titleID, xuid);
                        
                        if (achRes.success && achRes.achievements) {
                            game.realAchievements = achRes.achievements;
                            
                            const unlockedList = achRes.achievements.filter(a => a.unlocked === true);
                            
                            game.earnedCount = unlockedList.length; 
                            game.totalAchCount = achRes.achievements.length; 
                            
                            game.earnedScore = unlockedList.reduce((sum, a) => {
                                return sum + (Number(a.score) || 0);
                            }, 0);
                        }
                    } catch (e) {
                        console.error(`Error loading achievements for ${game.titleID}:`, e);
                    } finally {
                        game.loading = false;
                    }
                }
            }
        },


        async refreshCurrentGame() {
            const app = Alpine.store('app');
            const xuid = await window.electronAPI.get('xuid');
            const currentGame = app.achievementsGamesList[app.focusedIndex];

            if (!currentGame || currentGame.loading) return;

            currentGame.loading = true;

            try {
                const achRes = await window.electronAPI.getGameAchievements(currentGame.titleID, xuid, true);
                
                if (achRes.success && achRes.achievements) {
                    currentGame.realAchievements = achRes.achievements;
                    
                    // 3. إعادة حساب الأرقام بعد التحديث
                    const unlockedList = achRes.achievements.filter(a => a.unlocked === true);
                    currentGame.earnedCount = unlockedList.length;
                    currentGame.totalAchCount = achRes.achievements.length;
                    currentGame.earnedScore = unlockedList.reduce((sum, a) => sum + (Number(a.score) || 0), 0);
                    
                    console.log(`[Success] Achievements Refreshed for: ${currentGame.titleName}`);
                }
            } catch (e) {
                console.error("[Error] Refresh failed:", e);
            } finally {
                currentGame.loading = false;
            }
        },

        createNewProfilePrompt() {
            const app = Alpine.store('app');
            app.newProfileName = ''; 
            app.isCreatingProfile = true;
            this.playSound('panelUnfold');
            
            
            setTimeout(() => {
                const input = document.getElementById('new-profile-input');
                if (input) input.focus();
            }, 100);
        },
        cancelCreateProfile() {
            const app = Alpine.store('app');
            
            app.isCreatingProfile = false; 
            
            app.isProfileSelectorOpen = true; 
            
            this.playSound('back');
        },

        async submitNewProfile() {
            const app = Alpine.store('app');
            if (!app.newProfileName.trim()) return;

            this.playSound('select');
            const result = await window.electronAPI.createProfile(app.newProfileName);
            
            if (result.success) {
                app.isCreatingProfile = false; 
                
                await this.refreshProfileData(); 
                
                this.playSound('channelUp');
            }
        },

        startRenameProfilePrompt() {
            const app = Alpine.store('app');
            const profile = app.profilesList[app.focusedProfileIndex];
            if (!profile) return;

            this.playSound('panelUnfold');
            app.newProfileName = profile.gamertag;
            app.isRenamingProfile = true;
            

            setTimeout(() => {
                const input = document.getElementById('rename-profile-input');
                if (input) {
                    input.focus();
                    input.select();
                }
            }, 100);
        },


        cancelRenameProfile() {
            const app = Alpine.store('app');
            app.isRenamingProfile = false;
            app.newProfileName = '';
            this.playSound('back');
        },


        async submitProfileRename() {
            const app = Alpine.store('app');
            const profile = app.profilesList[app.focusedProfileIndex];
            if (!app.newProfileName.trim() || !profile) return;

            this.playSound('select');

            const result = await window.electronAPI.renameProfile({ 
                xuid: profile.xuid, 
                newName: app.newProfileName 
            });
            
            if (result.success) {
                app.isRenamingProfile = false;
                await this.refreshProfileData();
                this.playSound('channelUp');
            }
        },

        async loginFocusedProfile() {
            const app = Alpine.store('app');
            const profile = app.profilesList[app.focusedProfileIndex];
            if (profile && profile.slot === null) {

                const usedSlots = app.profilesList.map(p => p.slot).filter(s => s !== null);
                let targetSlot = [0, 1, 2, 3].find(s => !usedSlots.includes(s));
                
                if (targetSlot !== undefined) {
                    this.playSound('select');
                    const res = await window.electronAPI.assignProfileToSlot({ xuid: profile.xuid, slotIndex: targetSlot });
                    if (res.success) await this.refreshProfileData();
                }
            }
        },


        async logoutFocusedProfile() {
            const app = Alpine.store('app');
            const profile = app.profilesList[app.focusedProfileIndex];
            if (profile && profile.slot !== null) {
                this.playSound('back');
                const res = await window.electronAPI.logoutProfileSlot(profile.slot);
                if (res.success) await this.refreshProfileData();
            }
        },

                async handleProfileClick(profile) {
            if (profile.slot !== null) {
                await this.switchActiveProfile(profile.slot);
            } else {
                await this.loginFocusedProfile();
            }
        },

        async deleteFocusedProfile() {
            const app = Alpine.store('app');
            const profile = app.profilesList[app.focusedProfileIndex];
            
            if (!profile || app.focusedProfileIndex === app.profilesList.length) return;

            if (profile.slot === app.activeProfileSlot) {
                alert("Cannot delete the active profile. Switch to another profile first.");
                return;
            }

            if (confirm(`⚠️ Warning: Delete "${profile.gamertag}"? All saves and achievements will be lost forever.`)) {
                this.playSound('back');
                const result = await window.electronAPI.deleteProfile(profile.xuid);
                if (result.success) {
                    await this.refreshProfileData();
                    app.focusedProfileIndex = Math.max(0, app.focusedProfileIndex - 1);
                }
            }
        },


        scrollToFocusedElement(elementId) {
            const el = document.getElementById(elementId);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
            }
        },

        moveProfileFocus(direction) {
            const app = Alpine.store('app');
            let newIndex = app.focusedProfileIndex + direction;
            
            if (newIndex >= 0 && newIndex < app.profilesList.length) {
                app.focusedProfileIndex = newIndex;
                this.playSound('focus');
                
                this.scrollToFocusedElement('profile-item-' + newIndex);
            }
        },

        updateAchievementScroll() {
            const track = document.querySelector('.achievements-track');
            if (track) {
                const offset = this.app.focusedIndex * -450; 
                track.style.transform = `translateX(${offset}px)`;
            }
        },

        async openProfileSelector() {
            const app = Alpine.store('app');
            this.playSound('panelUnfold');
            
            await this.refreshProfileData(); 
            
            app.focusedProfileIndex = app.profilesList.findIndex(p => p.slot === app.activeProfileSlot);
            if (app.focusedProfileIndex === -1) app.focusedProfileIndex = 0;
            
            app.isProfileSelectorOpen = true;
        },
                
        async loadAllProfiles() {
            const app = Alpine.store('app');
            const result = await window.electronAPI.getAllUserProfiles();
            
            if (result.success) {
                app.profilesList = result.profiles;
                app.activeProfileSlot = result.activeSlot;
                
                const active = result.profiles.find(p => p.slot === result.activeSlot);
                if (active) {
                    app.playerTag = active.gamertag;
                    app.gamerscore = active.total_gamerscore;
                }
            }
        },
        
        async switchActiveProfile(slot) {
            const app = Alpine.store('app');
            if (slot === null) {
                alert("This profile must be assigned to a slot in Xenia settings first.");
                return;
            }
            
            const result = await window.electronAPI.setActiveProfileSlot(slot);
            if (result.success) {
                const profile = app.profilesList.find(p => p.slot === slot);
                if (profile) {
                    await window.electronAPI.set('xuid', profile.xuid);
                }
                
                await this.refreshProfileData(); 
                app.isProfileSelectorOpen = false;
                this.playSound('select');
            }
        },

        async createNewProfile(name) {
            if (!name) return;
            const result = await window.electronAPI.createProfile(name);
            if (result.success) {
                await this.refreshProfileData();
                this.playSound('panelUnfold');
            } else {
                alert("Error: " + result.error);
            }
        },

        async performZarScan() {
            const app = Alpine.store('app');
            const index = app.focusedIndex;
            const game = app.filteredLibraryGames[index];

            if (!game || !game.path.toLowerCase().endsWith('.zar')) return;

            this.playSound('select');
            const btnText = document.getElementById('zar-scan-text');
            if (btnText) btnText.innerText = "Extracting ID & Art...";

            try {
                const result = await window.electronAPI.scanZarTitleID(game.path);
                
                if (result.success) {
                    game.titleID = result.titleID;
                    if (result.art) {
                        game.coverUrl = result.art.coverUrl;
                        game.heroUrl = result.art.heroUrl;
                        game.logoUrl = result.art.logoUrl;
                        game.iconUrl = result.art.iconUrl;
                    }

                    this.updateGameDetails();
                    this.playSound('channelUp');
                } else {
                    alert(`Scan Failed: ${result.error}`);
                }
            } catch (e) {
                alert("Error: " + e.message);
            } finally {
                if (btnText) btnText.innerText = "Scan ZAR Title ID";
            }
        },

        manageBGM(action) {
            const app = Alpine.store('app');
            const bgmPlayer = document.getElementById('bgm-player');
            if (!bgmPlayer || !app.soundSettings.bgmFile) return;

            if (action === 'pause') {
                bgmPlayer.pause();
            } else if (action === 'play') {
                if (!app.isGameRunning) {
                    bgmPlayer.play().catch(e => console.log("BGM play blocked"));
                }
            }
        },
        async translateDescription() {
            const app = Alpine.store('app');
            const info = app.gameExtendedInfo;

            if (!info.description || info.isTranslating) return;

            if (!info.originalDescription) {
                info.originalDescription = info.description;
            }

            this.playSound('focus');
            info.isTranslating = true;


            const result = await window.electronAPI.translateText(info.originalDescription, app.language);

            if (result.success) {
                info.translatedDescription = result.translatedText;
                info.description = result.translatedText; 
                this.playSound('select');
            }
            info.isTranslating = false;
        },

        handleTranslationClick() {
            const info = Alpine.store('app').gameExtendedInfo;

            if (info.translatedDescription) {
                this.revertToOriginal();
            } 
            else {
                this.translateDescription();
            }
        },

        async checkAbgxTool() {
            const app = Alpine.store('app');
            const status = await window.electronAPI.checkAbgxStatus();
            app.abgxStatus = status;
            
            if (!status.exists) {
                app.showAbgxNotify = true;
            }
        },
        async verifyAbgxTool() {
            const app = Alpine.store('app');
            const result = await window.electronAPI.checkAbgxStatus();
            app.abgxStatus = result;
        },

        revertToOriginal() {
            const app = Alpine.store('app');
            const info = app.gameExtendedInfo;

            if (info.originalDescription) {
                info.description = info.originalDescription;
                info.translatedDescription = ''; 
                this.playSound('back');
            }
        },
        async toggleArtSource() {
            const app = Alpine.store('app');
            const current = app.settings.artSource || 'LocalDB';
            
            const next = (current === 'LocalDB') ? 'SteamGridDB' : 'LocalDB';
            
            app.settings.artSource = next;
            
            await window.electronAPI.set('artSource', next);
            
            this.playSound('select');
        },

        openArtManager() {
            const app = Alpine.store('app');
            
            if (app.isArtManagerOpen) return; 

            const game = app.filteredLibraryGames[app.focusedIndex];
            if (!game) return;

            this.playSound('panelUnfold');
            app.isArtManagerOpen = true;
            
            app.artManagerData = {
                gameIndex: app.focusedIndex,
                gameName: game.name,
                cleanName: game.cleanName || game.name,
                selectedTab: 'cover',
                assets: [],
                loading: false,
                focusedAssetIndex: 0, 
                error: null
            };
            
            this.fetchArtAssets();
        },

        closeArtManager() {
            const app = Alpine.store('app');
            this.playSound('back');
            app.isArtManagerOpen = false;
        },

        async fetchArtAssets() {
            const app = Alpine.store('app');
            const game = app.filteredLibraryGames[app.artManagerData.gameIndex];
            
            app.artManagerData.loading = true;
            app.artManagerData.assets = [];
            app.artManagerData.error = null;

            const currentSource = app.settings.artSource || 'LocalDB';
            
            console.log(`[Art Manager] Fetching for "${game.name}" using source: [${currentSource}]`);

            try {

                if (currentSource === 'SteamGridDB') {
                    const result = await window.electronAPI.searchSteamGridDBAssets({
                        gameName: app.artManagerData.cleanName, 
                        type: app.artManagerData.selectedTab
                    });

                    if (result.success) {
                        app.artManagerData.assets = result.assets;
                    } else {
                        app.artManagerData.error = result.error || "No results from SteamGridDB";
                    }
                } 

                else if (currentSource === 'LocalDB') {
                    if (!game.titleID) {
                        throw new Error("Game has no Title ID. Cannot search Local DB.");
                    }

                    const result = await window.electronAPI.getLocalGameMetadata(game.titleID);
                    
                    if (result.found && result.metadata && result.metadata.assets) {
                        const tab = app.artManagerData.selectedTab; 
                        let targetUrl = '';

                        
                        if (tab === 'cover') targetUrl = result.metadata.assets.cover;
                        if (tab === 'hero')  targetUrl = result.metadata.assets.hero; 
                        if (tab === 'logo')  targetUrl = result.metadata.assets.logo;
                        if (tab === 'icon')  targetUrl = result.metadata.assets.icon;

                        
                        
                        if (targetUrl) {
                            app.artManagerData.assets = [{
                                thumb: targetUrl,
                                full: targetUrl
                            }];
                        } else {
                            app.artManagerData.error = "Image not found in Local DB for this type.";
                        }
                    } else {
                        app.artManagerData.error = "Game ID not found in Local Database.";
                    }
                }

            } catch (e) {
                console.error("[Art Manager] Fetch error:", e);
                app.artManagerData.error = e.message || "Connection Failed";
            }
            
            app.artManagerData.loading = false;
        },

        changeArtTab(direction) {
            const app = Alpine.store('app');
            const tabs = app.artTabs;
            let current = tabs.indexOf(app.artManagerData.selectedTab);
            let next = current + direction;
            
            if (next < 0) next = tabs.length - 1;
            if (next >= tabs.length) next = 0;
            
            app.artManagerData.selectedTab = tabs[next];
            this.playSound('focus');
            this.fetchArtAssets(); 
        },
        moveArtGridFocus(rowDir, colDir) {
            const app = Alpine.store('app');
            const assets = app.artManagerData.assets;
            if (assets.length === 0) return;

            const gridContainer = document.querySelector('.art-grid');
            let cols = 1;

            if (gridContainer) {
                const computedStyle = window.getComputedStyle(gridContainer);
                const gridColumns = computedStyle.gridTemplateColumns.split(' ');
                cols = gridColumns.length;
            }

            let currentIndex = app.artManagerData.focusedAssetIndex;
            let newIndex = currentIndex;

            if (colDir !== 0) {
                newIndex += colDir;
            } 
            else if (rowDir !== 0) {
                const target = currentIndex + (rowDir * cols);
                
                if (target >= 0 && target < assets.length) {
                    newIndex = target;
                } else {
                    return; 
                }
            }

            if (newIndex < 0) newIndex = 0;
            if (newIndex >= assets.length) newIndex = assets.length - 1;

            if (newIndex !== currentIndex) {
                app.artManagerData.focusedAssetIndex = newIndex;
                this.playSound('focus');
                
                setTimeout(() => {
                    const el = document.getElementById('art-item-' + newIndex);
                    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                }, 10);
            }
        },

        async applyArtAsset(url, isLocal = false) {
            const app = Alpine.store('app');
            const game = app.filteredLibraryGames[app.artManagerData.gameIndex];
            
            this.playSound('select');
            
            const result = await window.electronAPI.updateGameArt({
                gameName: game.fileName, 
                type: app.artManagerData.selectedTab,
                url: url,
                isLocal: isLocal
            });

            if (result.success) {
                if (app.artManagerData.selectedTab === 'cover') game.coverUrl = result.path;
                if (app.artManagerData.selectedTab === 'hero') game.heroUrl = result.path;
                if (app.artManagerData.selectedTab === 'logo') game.logoUrl = result.path;
                if (app.artManagerData.selectedTab === 'icon') game.iconUrl = result.path;
                
                this.updateGameDetails();
                
                this.closeArtManager();
            } else {
                alert("Failed to save image: " + result.error);
            }
        },

        async browseLocalArtAsset() {
            const app = Alpine.store('app');
            const filePath = await window.electronAPI.openImageFile();
            if (filePath) {
                const artProtocolUrl = `file://${filePath.replace(/\\/g, '/')}`;
                await this.applyArtAsset(artProtocolUrl, true);
            }
        },
        playSound(soundKey) {
            const app = Alpine.store('app');
            

            let targetId = soundKey + '-sound';
            const kebabKey = soundKey.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
            

            let audioElement = app.audioCache[soundKey];


            if (!audioElement) {
                audioElement = document.getElementById(targetId) || document.getElementById(kebabKey + '-sound');
                
                if (audioElement) {
                    app.audioCache[soundKey] = audioElement;
                } else {
                    return;
                }
            }


            if (app.activeSoundElement && app.activeSoundElement !== audioElement) {
                app.activeSoundElement.pause();
                app.activeSoundElement.currentTime = 0;
            }


            const vol = (app.soundSettings && app.soundSettings.masterVolume !== undefined) 
                        ? app.soundSettings.masterVolume : 1.0;

            audioElement.volume = vol;
            audioElement.currentTime = 0;
            
            audioElement.play().then(() => {

                app.activeSoundElement = audioElement;
            }).catch(e => {});


        },

  
    async updateMusicVolume(direction) {
        const app = Alpine.store('app');
        const bgmPlayer = document.getElementById('bgm-player');

        let newVol = app.soundSettings.bgmVolume + (direction * 0.1);
        if (newVol > 1) newVol = 1;
        if (newVol < 0) newVol = 0;
        newVol = Math.round(newVol * 10) / 10;

        if (newVol !== app.soundSettings.bgmVolume) {
            app.soundSettings.bgmVolume = newVol;
            
            if (bgmPlayer) bgmPlayer.volume = newVol;
            
            await window.electronAPI.set('bgmVolume', newVol);
        }
    },

    async updateMasterVolume(direction) {
        const app = Alpine.store('app');
        
        let newVol = app.soundSettings.masterVolume + (direction * 0.1);
        
        if (newVol > 1) newVol = 1;
        if (newVol < 0) newVol = 0;
        
        newVol = Math.round(newVol * 10) / 10;

        if (newVol !== app.soundSettings.masterVolume) {
            app.soundSettings.masterVolume = newVol;
            
            await window.electronAPI.set('soundVolume', newVol);
            
            this.playSound('focus'); 
        }
    },

        async changeSoundEffect() {
            const app = Alpine.store('app');
            const item = app.audioMenu[app.focusedIndex]; 
            
            if (!item || item.type !== 'file') return;

            this.playSound('select');

            setTimeout(async () => {
                const filePath = await window.electronAPI.openAudioFile();
                
                if (filePath) {

                    if (item.id === 'bgmFile') {
                        app.soundSettings.bgmFile = filePath;
                        
                        const bgmPlayer = document.getElementById('bgm-player');
                        if (bgmPlayer) {
                            bgmPlayer.src = `file://${filePath.replace(/\\/g, '/')}`;
                            bgmPlayer.volume = app.soundSettings.bgmVolume;
                            bgmPlayer.play().catch(e => console.error("BGM Play Error:", e));
                        }
                        await window.electronAPI.set('bgmFile', filePath);
                    } 

                    else {

                        app.soundSettings.files[item.id] = filePath;
                        

                        const kebabKey = item.id.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
                        let el = document.getElementById(item.id + '-sound') || document.getElementById(kebabKey + '-sound');

                        if (el) {
                            el.src = `file://${filePath.replace(/\\/g, '/')}`;
                            el.load();
                            el.onloadeddata = () => {
                                this.playSound(item.id);
                                el.onloadeddata = null; 
                            };
                        }

                        const rawSoundFiles = JSON.parse(JSON.stringify(app.soundSettings.files));
                        await window.electronAPI.set('soundFiles', rawSoundFiles);
                        
                        console.log("[Audio] New sound saved to JSON:", item.id);
                    }
                }
            }, 100);
        },
        async resetSoundSettings() {
            const app = Alpine.store('app');
            
            console.log("[Audio] Resetting sound settings...");

            try {
                await window.electronAPI.set('bgmFile', null);
                
                await window.electronAPI.set('soundVolume', 1.0);
                await window.electronAPI.set('bgmVolume', 0.5);
                
                
                const defaultFiles = {
                    select: 'default', back: 'default', focus: 'default',
                    channelUp: 'default', channelDown: 'default',
                    panelLeft: 'default', panelRight: 'default', panelUnfold: 'default'
                };
                await window.electronAPI.set('soundFiles', defaultFiles);
                
                console.log("[Audio] Settings saved to disk successfully.");
            } catch (e) {
                console.error("[Audio] Failed to save reset settings:", e);
            }

            app.soundSettings.masterVolume = 1.0;
            app.soundSettings.bgmVolume = 0.5;
            app.soundSettings.bgmFile = null;
            app.soundSettings.files = {
                select: 'default', back: 'default', focus: 'default',
                channelUp: 'default', channelDown: 'default',
                panelLeft: 'default', panelRight: 'default', panelUnfold: 'default'
            };

            const bgmPlayer = document.getElementById('bgm-player');
            if (bgmPlayer) {
                bgmPlayer.pause();
                bgmPlayer.currentTime = 0;
                bgmPlayer.removeAttribute('src'); 
                bgmPlayer.load(); 
                console.log("[Audio] BGM Player stopped and cleared.");
            }

            
            const soundKeys = ['select', 'back', 'focus', 'channelUp', 'channelDown', 'panelLeft', 'panelRight', 'panelUnfold'];
            
            for (const key of soundKeys) {
                try {
                    const kebabKey = key.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
                    const fileName = key.replace(/([A-Z])/g, '-$1').toLowerCase();
                    
                    let el = document.getElementById(key + '-sound');
                    if (!el) el = document.getElementById(kebabKey + '-sound');
                    
                    if (el) {
                        el.src = `assets/audio/${fileName}.wav`;
                        el.load();
                    }
                } catch (err) {
                    console.warn(`[Audio] Failed to reset element for ${key}:`, err);
                }
            }

            try {
                const feedback = new Audio('assets/audio/panel-unfold.wav');
                feedback.volume = 1.0; 
                feedback.play().catch(e => {}); 
            } catch(e) {}

            const host = document.getElementById('view-host');
            if(host) {
                host.style.transition = "filter 0.1s";
                host.style.filter = "brightness(1.5)";
                setTimeout(() => {
                    host.style.filter = "";
                    setTimeout(() => host.style.transition = "", 100);
                }, 150);
            }
        },
        async loadUserSounds() {
            const app = Alpine.store('app');
            
            const savedVol = await window.electronAPI.get('soundVolume');
            const savedBgmVol = await window.electronAPI.get('bgmVolume');
            const savedBgmFile = await window.electronAPI.get('bgmFile');
            const savedFiles = await window.electronAPI.get('soundFiles');

            if (savedVol !== undefined && savedVol !== null) app.soundSettings.masterVolume = parseFloat(savedVol);
            if (savedBgmVol !== undefined && savedBgmVol !== null) app.soundSettings.bgmVolume = parseFloat(savedBgmVol);
            
            if (savedBgmFile && savedBgmFile.length > 3 && savedBgmFile !== "null") {
                app.soundSettings.bgmFile = savedBgmFile;
                
                const bgmPlayer = document.getElementById('bgm-player');
                if (bgmPlayer) {
                    bgmPlayer.src = `file://${savedBgmFile.replace(/\\/g, '/')}`;
                    bgmPlayer.volume = app.soundSettings.bgmVolume;
                    bgmPlayer.play().catch(e => console.log("Auto-play blocked:", e));
                }
            } else {
                app.soundSettings.bgmFile = null;
            }

            app.audioCache = {}; 
            if (savedFiles) {
                app.soundSettings.files = { ...app.soundSettings.files, ...savedFiles };
                for (const [key, path] of Object.entries(savedFiles)) {
                    if (path && path !== 'default') {
                        const kebabKey = key.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
                        let el = document.getElementById(key + '-sound');
                        if (!el) el = document.getElementById(kebabKey + '-sound');
                        if (el) {
                            el.src = `file://${path.replace(/\\/g, '/')}`;
                            el.load(); 
                        }
                    }
                }
            }
        },

        async changeUserAvatar() {
            const app = Alpine.store('app');
            
            this.playSound('panelUnfold');

            await this.refreshProfileData();

            const currentIndex = app.profilesList.findIndex(p => p.slot === app.activeProfileSlot);
            app.focusedProfileIndex = currentIndex !== -1 ? currentIndex : 0;

            app.isProfileSelectorOpen = true;
        },
        async browseNewGamerpic() {
            const app = Alpine.store('app');
            const targetProfile = app.profilesList[app.focusedProfileIndex];
            if (!targetProfile) return;

            this.playSound('select');

            const filePath = await window.electronAPI.openImageFile();
            
            if (filePath) {
                await window.electronAPI.set(`customAvatar_slot_${targetProfile.slot}`,'file://' + filePath);
                
                await this.refreshProfileData();
            }
        },

        async launchXeniaDashboard() {
            const app = Alpine.store('app');
            const xeniaPath = app.settings.xeniaPath;

            if (!xeniaPath || xeniaPath.startsWith('Click "Select"') || xeniaPath.startsWith('[Not Found]')) {
                alert("Please set Xenia Path first!");
                this.loadView('settings-core');
                return;
            }

            this.playSound('select');
            console.log("Launching Xenia Dashboard...");

            try {
                const result = await window.electronAPI.launchXeniaDashboard(xeniaPath);
                if (!result.success) {
                    alert("Failed to open Xenia: " + result.error);
                }
            } catch (e) {
                console.error("Error launching dashboard:", e);
            }
        },

        async refreshProfileData() {
            const app = Alpine.store('app');
            const res = await window.electronAPI.getAllUserProfiles();
            
            if (res.success) {
                app.profilesList = res.profiles;
                app.activeProfileSlot = res.activeSlot;

                const active = res.profiles.find(p => p.slot === res.activeSlot) || res.profiles[0];
                if (active) {
                    app.playerTag = active.gamertag;
                    app.gamerscore = active.total_gamerscore;
                    
                    const pic = await window.electronAPI.getUserGamerpic(active.xuid, active.slot);
                    app.userAvatar = pic.success ? pic.url : null;
                }

                for (let profile of app.profilesList) {
                    const pPic = await window.electronAPI.getUserGamerpic(profile.xuid, profile.slot);
                    profile.avatar = pPic.success ? `${pPic.url}?t=${Date.now()}` : null;
                }
            }
        },

        async changeFocusedProfileAvatar() {
            const app = Alpine.store('app');
            const targetProfile = app.profilesList[app.focusedProfileIndex];
            if (!targetProfile) return;

            this.playSound('select');

            const filePath = await window.electronAPI.openImageFile();
            
            if (filePath) {
                await window.electronAPI.set(`customAvatar_slot_${targetProfile.slot}`, filePath);
                
                await this.refreshProfileData();
                this.playSound('select');
            }
        },

        async updateDatabase() {
            const app = Alpine.store('app');
            alert("Downloading latest database...");
            const result = await window.electronAPI.updateLocalDB();
            if (result.success) {
                alert(`Database updated! ${result.count} games indexed.`);
            } else {
                alert("Failed to update: " + result.error);
            }
        },

        async performDeepScan() {
            const app = Alpine.store('app');
            const game = app.filteredLibraryGames[app.focusedIndex];

            if (!game) return;

            const btnText = document.getElementById('deep-scan-text');
            if(btnText) btnText.innerText = "Scanning...";
            
            this.playSound('select');

            try {
                const result = await window.electronAPI.deepScanGame(game.path);
                
                if (result.success && result.titleID) {
                    game.titleID = result.titleID;
                    
                    this.updateGameDetails();
                    
                    this.playSound('channelUp'); 
                    
                    alert(`Success! Title ID found: ${result.titleID}`);
                } else {
                    alert("Deep Scan failed. This ISO might be severely damaged or not an Xbox 360 game.");
                }
            } catch (e) {
                alert(`Error: ${e.message}`);
            } finally {
                if(btnText) btnText.innerText = "Deep Scan";
            }
        },

        async openGameConfig() {
            const app = Alpine.store('app');
            const game = app.filteredLibraryGames[app.focusedIndex];

            if (!game || !game.titleID) {
                alert("This game has no Title ID. Cannot create config.");
                return;
            }

            this.playSound('select');
            
            app.configMode = 'game';
            app.editingGameInfo = { name: game.name, titleID: game.titleID };
            
            await this.loadView('settings-config');
            
            app.xeniaConfig = {};
            app.configCategories = [];
            app.xeniaConfigError = null;
            
            try {
                const result = await window.electronAPI.manageGameConfig({
                    action: 'load',
                    titleID: game.titleID
                });

                if (!result.success) throw new Error(result.error);

                app.xeniaConfig = result.data;
                app.configCategories = Object.keys(result.data).filter(key => 
                    result.data[key] && Object.keys(result.data[key]).length > 0
                );
                
                app.focusedConfigCategoryIndex = 0;
                this.updateCurrentConfigOptions();
                
                
                
            } catch (e) {
                console.error("Failed to load game config:", e);
                app.xeniaConfigError = e.message;
            }
        },

        
        filterLibrary() {
            const app = Alpine.store('app');
            if (!app.gamesList) {
                app.filteredLibraryGames = [];
                return;
            }

            const query = (app.librarySearch || '').toLowerCase().trim();
            if (!query) {
                app.filteredLibraryGames = [...app.gamesList];
            } else {
                app.filteredLibraryGames = app.gamesList.filter(g => 
                    g && g.name && g.name.toLowerCase().includes(query)
                );
            }
            app.focusedIndex = 0;
            this.updateGameDetails();
        },

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        try {
            const d = new Date(dateString);
            return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        } catch (e) { return dateString; }
    },

    getTimeDifference(dateString) {
        try {
            const now = new Date();
            const past = new Date(dateString);
            const diffTime = Math.abs(now - past);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
            if(diffDays <= 1) return "Just released!";
            if(diffDays < 30) return `${diffDays} days ago`;
            return "Old version";
        } catch(e) { return "New"; }
    },

    async checkXeniaUpdates(platform) {
        const app = Alpine.store('app');
        const infoKey = platform; 
        
        app.xeniaUpdateInfo[infoKey].btnText = 'Checking...';
        
        try {
            const result = await window.electronAPI.checkXeniaUpdate(platform);
            
            if (result.success) {
                const data = app.xeniaUpdateInfo[infoKey];
                
                data.remoteVer = result.remote.tag; 
                data.remoteDate = this.formatDate(result.remote.date);
                
                if (result.local) {
                    data.localVer = result.local.tag; 
                    data.localDate = this.formatDate(result.local.date);
                } else {
                    data.localVer = '---';
                    data.localDate = 'Not Installed';
                }

                if (result.status === 'not-installed') {
                    data.status = 'not-installed';
                    data.btnText = 'Install Now';
                    data.message = 'Xenia is not installed.';
                    data.color = '#ff6b6b'; 
                } else if (result.status === 'broken-install') {
                    data.status = 'broken';
                    data.btnText = 'Repair (Re-install)';
                    data.message = 'Files missing or corrupted!';
                    data.color = '#ff6b6b'; 
                } else if (result.status === 'update-available') {
                    data.status = 'update-available';
                    data.btnText = 'Update Now';
                    data.message = `New update available! (${this.getTimeDifference(result.remote.date)})`;
                    data.color = '#59c853'; 
                } else if (result.status === 'up-to-date') {
                    data.status = 'up-to-date';
                    data.btnText = 'Re-install';
                    data.message = 'You have the latest version.';
                    data.color = '#3a82e5'; 
                } else { 
                    data.status = 'unknown';
                    data.btnText = 'Update / Repair';
                    data.message = 'Unknown version installed.';
                    data.color = '#f2c40e'; 
                }
            }
        } catch (e) {
            console.error("Check Update Error:", e);
            app.xeniaUpdateInfo[infoKey].message = 'Connection Error.';
        }
    },
        async downloadXenia(platform) {
            const app = Alpine.store('app');
            
            const statusKey = platform; 
            
            if (app.downloadStatuses[statusKey].status.includes('Downloading') || app.downloadStatuses[statusKey].status.includes('Extracting')) {
                return;
            }

            this.playSound('select');
            
            app.downloadStatuses[statusKey] = { status: 'Preparing...', percentage: 0, step: 'connect', type: statusKey };
            
            try {
                const result = await window.electronAPI.downloadXenia(platform);
                
                if (result.success) {
                    if (result.newPath) {
                        app.settings.xeniaPath = result.newPath;
                        
                        await this.initializeAppSettings();
                    }

                    app.downloadStatuses[statusKey] = { status: 'idle', percentage: 100, step: 'done', type: statusKey }; 
                    
                    await this.checkXeniaUpdates(platform);
                    
                    app.xeniaUpdateInfo[statusKey].message = "Successfully Installed & Configured!";
                    app.xeniaUpdateInfo[statusKey].color = "#59c853";
                    
                    this.playSound('channelUp');

                    setTimeout(() => {
                        this.checkXeniaUpdates(platform);
                    }, 3000);
                    
                } else {
                    app.downloadStatuses[statusKey] = { status: `Error: ${result.error}`, percentage: 0, step: 'error', type: statusKey };
                }
            } catch (e) {
                app.downloadStatuses[statusKey] = { status: `Error: ${e.message}`, percentage: 0, step: 'error', type: statusKey };
            }
        },

        async loadView(viewName) {
            const app = Alpine.store('app');
            if (app.isPageTransitioning) return;
            app.isPageTransitioning = true;
            
            this.manageCoverLoading(viewName);
            
            const host = document.getElementById('view-host');
            this.playSound('panelRight');
            host.classList.add('nxe-page-blur-out');
            await new Promise(r => setTimeout(r, 400)); 
            
            try {
                const result = await window.electronAPI.loadLayout(viewName);
                if (!result.success) throw new Error(result.error);
                app.viewStack.push(app.currentView);
                app.currentView = viewName;
                app.currentViewHTML = result.html; 
                this.setFocusContext(viewName);
            } catch (err) {
                app.currentViewHTML = `<h1 style="color:red;">Failed to load view: ${viewName}</h1>`;
            }
            
            host.classList.remove('nxe-page-blur-out');
            host.classList.add('nxe-page-slide-in');
            await new Promise(r => setTimeout(r, 400)); 
            host.classList.remove('nxe-page-slide-in');
            app.isPageTransitioning = false;
        },

        async goBack() {
            const app = Alpine.store('app');
            if (app.isPageTransitioning || app.viewStack.length === 0) return;
            app.isPageTransitioning = true;
            this.playSound('panelLeft');
            
            const targetView = app.viewStack[app.viewStack.length - 1];
            this.manageCoverLoading(targetView);
            
            if (app.currentView === 'settings-colors') {
                this.loadUserColors(); 
            }

            const previousView = app.viewStack.pop(); 
            const host = document.getElementById('view-host');
            host.classList.add('nxe-page-slide-out');
            await new Promise(r => setTimeout(r, 400)); 
            
            if (app.currentView === 'patches-manager') {
                app.patchList = []; 
                app.patchHeader = {}; 
                app.patchesLoadingError = null;
                app.configFocusedPanel = 'categories'; 
                app.configOptionIndex = 0;
            }
            if (app.currentView === 'settings-config') {
                app.xeniaConfig = {}; 
                app.configCategories = []; 
                app.focusedConfigCategoryIndex = 0;
                app.xeniaConfigError = null; 
                app.configFocusedPanel = 'categories';
                app.currentConfigOptions = []; 
                app.configOptionIndex = 0; 
                app.configSaveStatus = 'idle';
                app.configMode = 'global';
                app.editingGameInfo = null;
            }
            
            try {
                const result = await window.electronAPI.loadLayout(previousView);
                if (!result.success) throw new Error(result.error);
                app.currentView = previousView;
                app.currentViewHTML = result.html; 
                this.setFocusContext(previousView);
            } catch (err) {
                app.currentViewHTML = `<h1 style="color:red;">Failed to load view: ${previousView}</h1>`;
            }
            host.classList.remove('nxe-page-slide-out');
            host.classList.add('nxe-page-unblur-in');
            await new Promise(r => setTimeout(r, 400)); 
            host.classList.remove('nxe-page-unblur-in');
            app.isPageTransitioning = false;
        },

        async loadView(viewName) {
            const app = Alpine.store('app');
            if (app.isPageTransitioning) return;
            app.isPageTransitioning = true;
            const host = document.getElementById('view-host');
            this.playSound('panelRight');
            host.classList.add('nxe-page-blur-out');
            await new Promise(r => setTimeout(r, 400)); 
            try {
                const result = await window.electronAPI.loadLayout(viewName);
                if (!result.success) throw new Error(result.error);
                app.viewStack.push(app.currentView);
                app.currentView = viewName;
                app.currentViewHTML = result.html; 
                this.setFocusContext(viewName);
            } catch (err) {
                app.currentViewHTML = `<h1 style="color:red;">Failed to load view: ${viewName}</h1>`;
            }
            host.classList.remove('nxe-page-blur-out');
            host.classList.add('nxe-page-slide-in');
            await new Promise(r => setTimeout(r, 400)); 
            host.classList.remove('nxe-page-slide-in');
            app.isPageTransitioning = false;
        },
        async goBack() {
            const app = Alpine.store('app');
            if (app.isPageTransitioning || app.viewStack.length === 0) return;
            app.isPageTransitioning = true;
            this.playSound('panelLeft');
            
            if (app.currentView === 'settings-colors') {
                this.loadUserColors(); 
            }

            const previousView = app.viewStack.pop();
            const host = document.getElementById('view-host');
            host.classList.add('nxe-page-slide-out');
            await new Promise(r => setTimeout(r, 400)); 
            
            if (app.currentView === 'patches-manager') {
                app.patchList = []; app.patchHeader = {}; app.patchesLoadingError = null;
                app.configFocusedPanel = 'categories'; app.configOptionIndex = 0;
            }
            if (app.currentView === 'settings-config') {
                app.xeniaConfig = {}; app.configCategories = []; app.focusedConfigCategoryIndex = 0;
                app.xeniaConfigError = null; app.configFocusedPanel = 'categories';
                app.currentConfigOptions = []; app.configOptionIndex = 0; app.configSaveStatus = 'idle';
            }
            
            try {
                const result = await window.electronAPI.loadLayout(previousView);
                if (!result.success) throw new Error(result.error);
                app.currentView = previousView;
                app.currentViewHTML = result.html; 
                this.setFocusContext(previousView);
            } catch (err) {
                 app.currentViewHTML = `<h1 style="color:red;">Failed to load view: ${previousView}</h1>`;
            }
            host.classList.remove('nxe-page-slide-out');
            host.classList.add('nxe-page-unblur-in');
            await new Promise(r => setTimeout(r, 400)); 
            host.classList.remove('nxe-page-unblur-in');
            app.isPageTransitioning = false;
        },
        
        applyColorTheme(themeColors) {
            if (!themeColors) return;
            const root = document.documentElement;
            root.style.setProperty('--nxe-brand-primary', themeColors.primary);
            root.style.setProperty('--nxe-brand-light', themeColors.light);
            root.style.setProperty('--nxe-brand-dark', themeColors.dark);
            root.style.setProperty('--nxe-bg-top', themeColors.bgTop);
            root.style.setProperty('--nxe-bg-bottom', themeColors.bgBottom);
            root.style.setProperty('--nxe-list-bg-top', themeColors.listBgTop || '#2d3235');
            root.style.setProperty('--nxe-list-bg-bottom', themeColors.listBgBottom || '#202326');
            root.style.setProperty('--nxe-text-primary', themeColors.text || '#ffffff');
            root.style.setProperty('--nxe-text-secondary', themeColors.textSec || '#cccccc');
            root.style.setProperty('--nxe-panel-color', themeColors.panel || '#000000');
            root.style.setProperty('--nxe-alert-color', themeColors.alert || '#ff6b6b');
            root.style.setProperty('--nxe-btn-a', themeColors.btnA || '#59c853');
            root.style.setProperty('--nxe-btn-b', themeColors.btnB || '#e5443a');
            root.style.setProperty('--nxe-btn-x', themeColors.btnX || '#3a82e5');
            root.style.setProperty('--nxe-btn-y', themeColors.btnY || '#f2c40e');
        },
        previewTheme(index) {
            const app = Alpine.store('app');
            const preset = app.colorPresets[index];
            if (preset.id === 'custom') {
                this.applyColorTheme(app.customColors);
            } else {
                this.applyColorTheme(preset.colors);
            }
        },
        async saveThemeSelection(index) {
            const app = Alpine.store('app');
            const preset = app.colorPresets[index];
            app.activeColorThemeId = preset.id;
            
            await window.electronAPI.set('activeColorThemeId', preset.id);
            if (preset.id === 'custom') {
                await window.electronAPI.set('userCustomColors', app.customColors);
            }
            
            this.playSound('select');
            const host = document.getElementById('view-host');
            host.style.filter = "brightness(1.5)";
            setTimeout(() => host.style.filter = "", 150);
        },
        async loadUserColors() {
            const app = Alpine.store('app');
            const userSavedThemes = await window.electronAPI.get('userSavedThemes') || [];
            const savedCustom = await window.electronAPI.get('userCustomColors');
            if (savedCustom) app.customColors = savedCustom;

            app.colorPresets = [
                ...DEFAULT_PRESETS,
                ...userSavedThemes,
                { id: 'custom', name: 'Create Custom Theme', colors: null }
            ];

            const savedId = await window.electronAPI.get('activeColorThemeId');
            if (savedId) app.activeColorThemeId = savedId;
            
            let preset = app.colorPresets.find(p => p.id === app.activeColorThemeId);
            if (!preset) {
                preset = app.colorPresets[0];
                app.activeColorThemeId = preset.id;
                await window.electronAPI.set('activeColorThemeId', preset.id);
            }
            
            if (preset.id === 'custom') {
                this.applyColorTheme(app.customColors);
            } else {
                this.applyColorTheme(preset.colors);
            }
        },
        async updateCustomColor(key, value) {
            const app = Alpine.store('app');
            app.customColors[key] = value;
            if (app.activeColorThemeId === 'custom') {
                this.applyColorTheme(app.customColors);
            }
            await window.electronAPI.set('userCustomColors', app.customColors);
        },

        async saveNewCustomPreset() {
            const app = Alpine.store('app');
            
            if (!app.newThemeName || app.newThemeName.trim() === '') {
                alert("Please enter a theme name.");
                return;
            }

            if (document.activeElement instanceof HTMLElement) {
                document.activeElement.blur();
            }

            const newThemeId = 'user-' + Date.now();
            const newTheme = {
                id: newThemeId,
                name: app.newThemeName,
                colors: { ...app.customColors }
            };

            let userSavedThemes = await window.electronAPI.get('userSavedThemes') || [];
            userSavedThemes.push(newTheme);
            await window.electronAPI.set('userSavedThemes', userSavedThemes);

            app.newThemeName = '';

            app.colorPresets = [
                ...DEFAULT_PRESETS,
                ...userSavedThemes,
                { id: 'custom', name: 'Create Custom Theme', colors: null }
            ];
            
            app.activeColorThemeId = newThemeId;
            await window.electronAPI.set('activeColorThemeId', newThemeId);

            this.playSound('select');
            
            app.focusedIndex = app.colorPresets.length - 2; 
            
            const host = document.getElementById('view-host');
            if(host) {
                host.style.filter = "brightness(1.5)";
                setTimeout(() => host.style.filter = "", 150);
            }
        },
        async deleteFocusedTheme() {
            const app = Alpine.store('app');
            const item = app.colorPresets[app.focusedIndex];
            if (!item || !item.id.startsWith('user-')) return;

            if (!confirm(`Are you sure you want to delete "${item.name}"?`)) return;

            let userSavedThemes = await window.electronAPI.get('userSavedThemes') || [];
            userSavedThemes = userSavedThemes.filter(t => t.id !== item.id);
            await window.electronAPI.set('userSavedThemes', userSavedThemes);

            app.colorPresets = [
                ...DEFAULT_PRESETS,
                ...userSavedThemes,
                { id: 'custom', name: 'Create Custom Theme', colors: null }
            ];

            if (app.activeColorThemeId === item.id) {
                app.activeColorThemeId = 'xbox-classic';
                await window.electronAPI.set('activeColorThemeId', 'xbox-classic');
                this.applyColorTheme(DEFAULT_PRESETS[0].colors);
            }

            if (app.focusedIndex >= app.colorPresets.length) {
                app.focusedIndex = app.colorPresets.length - 1;
            }
            
            this.previewTheme(app.focusedIndex);
            this.playSound('back'); 
        },

        async changeWallpaper() {
            const app = Alpine.store('app');
            const filePath = await window.electronAPI.openImageFile();
            if (filePath) {
                await window.electronAPI.set('userWallpaper', filePath);
                app.displaySettings.wallpaperPath = filePath;
                app.displaySettings.wallpaperName = filePath.split(/[\\/]/).pop(); 
                this.applyDisplaySettings();
                this.playSound('select');
            }
        },
        async changeStage() {
            const app = Alpine.store('app');
            const filePath = await window.electronAPI.openImageFile();
            if (filePath) {
                await window.electronAPI.set('userStage', filePath);
                app.displaySettings.stagePath = filePath;
                app.displaySettings.stageName = filePath.split(/[\\/]/).pop();
                this.applyDisplaySettings();
                this.playSound('select');
            }
        },
        async changeFlourish() {
            const app = Alpine.store('app');
            const filePath = await window.electronAPI.openImageFile();
            if (filePath) {
                await window.electronAPI.set('userFlourish', filePath);
                app.displaySettings.flourishPath = filePath;
                app.displaySettings.flourishName = filePath.split(/[\\/]/).pop();
                this.applyDisplaySettings();
                this.playSound('select');
            }
        },
        async resetDisplaySettings() {
            const app = Alpine.store('app');
            await window.electronAPI.set('userWallpaper', null);
            await window.electronAPI.set('userStage', null);
            await window.electronAPI.set('userFlourish', null);
            
            app.displaySettings.wallpaperPath = null;
            app.displaySettings.wallpaperName = 'Default';
            app.displaySettings.stagePath = null;
            app.displaySettings.stageName = 'Default';
            app.displaySettings.flourishPath = null;
            app.displaySettings.flourishName = 'Default';
            
            this.applyDisplaySettings();
            this.playSound('panelUnfold'); 
        },
        applyDisplaySettings() {
            const app = Alpine.store('app');
            const root = document.documentElement;
            if (app.displaySettings.wallpaperPath) {
                const cleanPath = app.displaySettings.wallpaperPath.replace(/\\/g, '/');
                root.style.setProperty('--nxe-user-wallpaper', `url('file://${cleanPath}')`);
            } else {
                root.style.removeProperty('--nxe-user-wallpaper');
            }
            if (app.displaySettings.stagePath) {
                const cleanPath = app.displaySettings.stagePath.replace(/\\/g, '/');
                root.style.setProperty('--nxe-user-stage', `url('file://${cleanPath}')`);
            } else {
                root.style.removeProperty('--nxe-user-stage');
            }
            if (app.displaySettings.flourishPath) {
                const cleanPath = app.displaySettings.flourishPath.replace(/\\/g, '/');
                root.style.setProperty('--nxe-user-flourish', `url('file://${cleanPath}')`);
            } else {
                root.style.removeProperty('--nxe-user-flourish');
            }
        },
        async loadDisplaySettings() {
            const app = Alpine.store('app');
            const savedWallpaper = await window.electronAPI.get('userWallpaper');
            const savedStage = await window.electronAPI.get('userStage');
            const savedFlourish = await window.electronAPI.get('userFlourish');

            if (savedWallpaper) {
                const exists = await window.electronAPI.checkPathExists(savedWallpaper);
                if (exists) {
                    app.displaySettings.wallpaperPath = savedWallpaper;
                    app.displaySettings.wallpaperName = savedWallpaper.split(/[\\/]/).pop();
                }
            }
            if (savedStage) {
                const exists = await window.electronAPI.checkPathExists(savedStage);
                if (exists) {
                    app.displaySettings.stagePath = savedStage;
                    app.displaySettings.stageName = savedStage.split(/[\\/]/).pop();
                }
            }
            if (savedFlourish) {
                const exists = await window.electronAPI.checkPathExists(savedFlourish);
                if (exists) {
                    app.displaySettings.flourishPath = savedFlourish;
                    app.displaySettings.flourishName = savedFlourish.split(/[\\/]/).pop();
                }
            }
            this.applyDisplaySettings();
        },

        async applyTheme(themeName) {
            if (!themeName) return;
            const app = Alpine.store('app');
            if (themeName === app.currentTheme) return;
            await window.electronAPI.set('currentTheme', themeName);
            app.currentTheme = themeName;
            window.location.reload(); 
        },
        async loadGameLibraryData() {
            const app = Alpine.store('app');
            app.gamesList = [];
            try {
                await this.scanForGames(true); 
            } catch (e) {
                console.error("Error loading game library data:", e);
            }
        },
        setFocusContext(viewName) {
            const app = Alpine.store('app');
            app.focusedList = null; 
            switch (viewName) {

                case 'achievements':

                    app.focusedCollection = 'achievementsGamesList';
                    app.focusedIndex = 0;


                    const folderPath = app.settings.gameFolderPath;
                    const isPathReady = folderPath &&
                    !folderPath.startsWith('Click "Select"') &&
                    !folderPath.startsWith('[Not Found]') &&
                    !folderPath.startsWith('[Folder Not Valid]');

                    if (isPathReady && !app.isInitialScanDone) {
                        console.log('[Fix] Path is valid and first scan triggered.');

                        app.isInitialScanDone = true;

                        this.loadGameLibraryData();
                    } else {
                        console.log('[Fix] Scan skipped: Already scanned once or path invalid.');
                    }
                    break;

                case 'language-select':
                app.focusedCollection = 'languageOptions';
                

                app.focusedIndex = app.language === 'ar' ? 1 : 0;
                
                app.configFocusedPanel = 'categories';
                break;

                case 'game-library':
                
                    if (!app.filteredLibraryGames) app.filteredLibraryGames = [];
                    
                    if (app.librarySearch && app.librarySearch.trim() !== '') {
                        this.filterLibrary();
                    } else {
                        app.filteredLibraryGames = [...app.gamesList];
                    }

                    app.focusedCollection = 'filteredLibraryGames';
                    
                    if (app.filteredLibraryGames.length > 0) {
                        if (app.libraryMemoryIndex < app.filteredLibraryGames.length) {
                            app.focusedIndex = app.libraryMemoryIndex;
                        } else {
                            app.focusedIndex = 0;
                            app.libraryMemoryIndex = 0; 
                        }
                    } else {
                        app.focusedIndex = 0;
                    }
                    
                    setTimeout(() => {
                        this.scrollToFocusedElement('game-item-' + app.focusedIndex);
                        this.updateGameDetails();
                    }, 50);
                    
                    this.loadGameLibraryData(); 
                    break;
                case 'settings-hub':
                    app.focusedCollection = 'settingsMenu'; app.focusedIndex = 0; break;
                case 'settings-colors':
                    app.focusedCollection = 'colorPresets';
                    const activeIndex = app.colorPresets.findIndex(p => p.id === app.activeColorThemeId);
                    app.focusedIndex = activeIndex !== -1 ? activeIndex : 0;
                    break;
                case 'settings-core':
                    app.focusedCollection = 'coreSettingsItems'; app.focusedIndex = 0; 
                    this.initializeAppSettings(); 
                    break;
                case 'settings-system':
                    app.focusedCollection = 'themesList'; app.focusedIndex = 0; 
                    this.scanForThemes();
                    break;
                case 'settings-display':
                    app.focusedCollection = 'displayItems'; 
                    app.focusedIndex = 0;
                    break;
                case 'dashboard':
                    app.focusedList = 'master'; 
                    app.focusedCollection = null;
                    this.loadDashboardData(); 
                    break;
                case 'settings-config':
                    app.focusedCollection = null;
                    app.focusedConfigCategoryIndex = 0;
                    app.configFocusedPanel = 'categories';
                    app.configOptionIndex = 0;
                    break;
                case 'patches-manager':
                    app.focusedCollection = 'patchList';
                    app.focusedIndex = 0;
                    app.configFocusedPanel = 'categories';
                    app.configOptionIndex = 0;
                    app.patchSaveStatus = 'idle';
                    this.loadPatchesForGame();
                    break;

                case 'settings-audio':
                    app.focusedCollection = 'audioMenu'; 
                    app.focusedIndex = 0;
                    break;  
                case 'about-hub':
                    app.focusedCollection = 'aboutMenu';
                    app.focusedIndex = 0;
                    this.scrollToFocusedElement('about-item-0');
                    break;  
            }
            
        },
        async loadDashboardData() {
            const app = Alpine.store('app');
            if (app.masterMenu.length > 0) return; 
            const result = await window.electronAPI.loadDashboardData();
            if (result.success) {
                app.masterMenu = result.data.masterMenu;
                this.updateDetailMenu(); 
            } else {
                app.currentViewHTML = `<h1 style="color:red;">Failed to load dashboard-data.json</h1>`;
            }
        },
        updateDetailMenu() {
            const app = Alpine.store('app');
            if (app.masterMenu.length === 0) return; 
            app.detailMenu = [...app.masterMenu[app.masterIndex].detailMenu];
            app.detailIndex = 0;
            if (!app.originalOpenTray) {
                const original = app.detailMenu.find(item => item.id === 'opentray');
                if (original) {
                    app.originalOpenTray = JSON.parse(JSON.stringify(original));
                }
            }

            if (app.selectedGame && app.masterIndex === 1) {
                const openTrayItem = app.detailMenu.find(item => item.id === 'opentray');
                if (openTrayItem) {
                    openTrayItem.animationState = 'out';
                    setTimeout(() => {
                        openTrayItem.name = app.selectedGame.name.replace(/\s*\(.*?\)\s*/g, ' ').replace(/\s*\[.*?\]\s*/g, ' ').trim();
                        openTrayItem.icon = app.selectedGame.iconUrl || app.selectedGame.coverUrl || 'assets/icons/placeholder.png';

                        openTrayItem.isGameIcon = true; 
                        openTrayItem.isGame = false; 

                        openTrayItem.heroUrl = app.selectedGame.heroUrl || 'none';
                        openTrayItem.logoUrl = app.selectedGame.logoUrl || ''; 
                        openTrayItem.animationState = 'in';
                        setTimeout(() => {
                            if(openTrayItem) openTrayItem.animationState = 'idle';
                        }, 200);
                    }, 200);
                }
            }
        },
        moveMaster(direction) {
            const app = Alpine.store('app');
            let newIndex = app.masterIndex + direction;
            if (newIndex < 0) newIndex = 0;
            if (newIndex >= app.masterMenu.length) newIndex = app.masterMenu.length - 1;
            if (newIndex !== app.masterIndex) {
                app.masterIndex = newIndex;
                this.playSound(direction > 0 ? 'channelDown' : 'channelUp'); 
                this.updateDetailMenu();
            }
        },
        moveDetail(direction) {
            const app = Alpine.store('app');
            

            if (app.detailIndex === 0 && direction === -1) {
                app.focusedList = 'master';
                this.playSound('focus');
                return;
            }

            let newIndex = app.detailIndex + direction;
            if (newIndex < 0) newIndex = 0;
            if (newIndex >= app.detailMenu.length) newIndex = app.detailMenu.length - 1;
            
            if (newIndex !== app.detailIndex) {
                app.detailIndex = newIndex;
                this.playSound('focus');
            }
        },
        selectDetailItem() {
            const app = Alpine.store('app');
            const item = app.detailMenu[app.detailIndex];
            if (!item) return;
            if (item.view === 'opentray') {
                if (app.selectedGame) {
                    this.playSound('select');
                    this.launchGame(app.selectedGame);
                    app.selectedGame = null; 
                    if (app.originalOpenTray) {
                        const openTrayItem = app.detailMenu.find(i => i.id === 'opentray');
                        if (openTrayItem) {
                            openTrayItem.animationState = 'out';
                            setTimeout(() => {
                                Object.assign(openTrayItem, app.originalOpenTray);
                                openTrayItem.isGame = false;
                                openTrayItem.isGameIcon = false;
                                openTrayItem.logoUrl = '';
                                openTrayItem.animationState = 'in';
                                setTimeout(() => {
                                    if(openTrayItem) openTrayItem.animationState = 'idle';
                                }, 200);
                            }, 200);
                        }
                    }
                }else {


                    window.electronAPI.openFile().then(result => {

                        const selectedPath = (typeof result === 'string') ? result : result.filePath;

                        if (selectedPath) {
                            this.playSound('select');
                            

                            const xeniaPath = app.settings.xeniaPath;

                            if (!xeniaPath) {
                                alert("Please set Xenia Path in settings first!");
                                return;
                            }

                            window.electronAPI.launchGame(xeniaPath, selectedPath, '');
                        }
                    }).catch(err => console.error("Error selection:", err));
                }
            } else {
                this.loadView(item.view); 
            }
        },
        async launchGame(game) {
            const app = Alpine.store('app');
            const xeniaPath = app.settings.xeniaPath;
            
            if (!game || !game.path) { 
                console.error("Launch failed: No game path."); 
                return; 
            }
            
            if (!xeniaPath || xeniaPath.startsWith('Click "Select"') || xeniaPath.startsWith('[Not Found]')) {
                console.error("Launch failed: Xenia path is not set.");
                this.loadView('settings-core'); 
                return;
            }
            
            console.log(`Launching game: ${game.name} (ID: ${game.titleID})`);
            
            try {

                const result = await window.electronAPI.launchGame(xeniaPath, game.path, game.titleID);
                
                if (!result.success) console.error("Failed to launch game:", result.error);
            } catch (e) { 
                console.error("Error during game launch IPC:", e); 
            }
        },
        async loadUserConfig() {
            const app = Alpine.store('app');

            const savedArtSource = await window.electronAPI.get('artSource');
            if (savedArtSource) {
                app.settings.artSource = savedArtSource;
            } else {
                app.settings.artSource = 'LocalDB';
            }
            
            let [playerTag, gamerscore, xeniaPath, gameFolder, apiKey, linuxLaunchMethod, protonPath, savedLang] = await Promise.all([
                window.electronAPI.get('playerTag'),
                window.electronAPI.get('gamerscore'),
                window.electronAPI.get('xeniaPath'),
                window.electronAPI.get('gameFolderPath'),
                window.electronAPI.get('steamGridDBKey'),
                window.electronAPI.get('linuxLaunchMethod'), 
                window.electronAPI.get('protonPath'),
                window.electronAPI.get('language')
            ]);

            if (playerTag) app.playerTag = playerTag; else await window.electronAPI.set('playerTag', app.playerTag); 
            if (gamerscore) app.gamerscore = gamerscore; else await window.electronAPI.set('gamerscore', app.gamerscore);
            if (xeniaPath) app.settings.xeniaPath = xeniaPath;
            if (gameFolder) app.settings.gameFolderPath = gameFolder;
            if (apiKey) app.settings.apiKey = apiKey;
            
            if (linuxLaunchMethod) {
                app.settings.linuxLaunchMethod = linuxLaunchMethod;
            } else {
                await window.electronAPI.set('linuxLaunchMethod', 'native');
                app.settings.linuxLaunchMethod = 'native';
            }
            
            if (protonPath) app.settings.protonPath = protonPath;

            if (savedLang) {
                app.language = savedLang;
                this.applyDirection(savedLang);
            }
        },
        async initializeAppSettings() {
            const app = Alpine.store('app');
            
            app.xeniaUpdateInfo.win.message = 'Press (Y) to Check for Updates';
            app.xeniaUpdateInfo.linux.message = 'Press (Y) to Check for Updates';

            let currentXeniaPath = app.settings.xeniaPath;
            
            if (currentXeniaPath) {
                currentXeniaPath = currentXeniaPath.replace(/\[Not Found\]\s*/g, '').replace(/\[File Not Valid\]\s*/g, '');
            }

            if (currentXeniaPath && currentXeniaPath !== 'Click "Select" to set xenia_canary.exe path') {
                const xeniaExists = await window.electronAPI.checkPathExists(currentXeniaPath); 
                
                if (!xeniaExists) {
                    app.settings.xeniaPath = `[Not Found] ${currentXeniaPath}`; 
                } else {
                    app.settings.xeniaPath = currentXeniaPath;
                }
            }


            let currentGamePath = app.settings.gameFolderPath;
            
            if (currentGamePath) {
                currentGamePath = currentGamePath.replace(/\[Not Found\]\s*/g, '').replace(/\[Folder Not Valid\]\s*/g, '');
            }

            if (currentGamePath && currentGamePath !== 'Click "Select" to set your game folder') {
                const gameFolderExists = await window.electronAPI.checkPathExists(currentGamePath); 
                
                if (!gameFolderExists) {
                    app.settings.gameFolderPath = `[Not Found] ${currentGamePath}`;
                } else {
                    app.settings.gameFolderPath = currentGamePath;
                }
            }


            let currentProtonPath = app.settings.protonPath;
            
            if (currentProtonPath) {
                currentProtonPath = currentProtonPath.replace(/\[Not Found\]\s*/g, '').replace(/\[File Not Valid\]\s*/g, '');
            }

            if (app.settings.linuxLaunchMethod === 'proton' && currentProtonPath) {
                const protonExists = await window.electronAPI.checkPathExists(currentProtonPath); 
                
                if (!protonExists) {
                    app.settings.protonPath = `[Not Found] ${currentProtonPath}`; 
                } else {
                    app.settings.protonPath = currentProtonPath;
                }
            } else if (!currentProtonPath) {
                 app.settings.protonPath = 'Click "Select" to set proton path (if using Proton)';
            }
        },
        async browseXeniaPath() {
            const filePath = await window.electronAPI.openFile();
            if (filePath) {
                const pathExists = await window.electronAPI.checkPathExists(filePath); 
                if (pathExists) {
                    await window.electronAPI.set('xeniaPath', filePath);
                    Alpine.store('app').settings.xeniaPath = filePath;
                } else {
                    Alpine.store('app').settings.xeniaPath = `[File Not Valid] ${filePath}`;
                }
            }
        },
        async browseGameFolder() {
            const folderPath = await window.electronAPI.openDirectory();
            if (folderPath) {
                const pathExists = await window.electronAPI.checkPathExists(folderPath); 
                if (pathExists) {
                    await window.electronAPI.set('gameFolderPath', folderPath);
                    Alpine.store('app').settings.gameFolderPath = folderPath;
                } else {
                    Alpine.store('app').settings.gameFolderPath = `[Folder Not Valid] ${folderPath}`;
                }
            }
        },
        async browseProtonPath() {
            const filePath = await window.electronAPI.openFile();
            if (filePath) {
                const pathExists = await window.electronAPI.checkPathExists(filePath); 
                if (pathExists) {
                    await window.electronAPI.set('protonPath', filePath);
                    Alpine.store('app').settings.protonPath = filePath;
                } else {
                    Alpine.store('app').settings.protonPath = `[File Not Valid] ${filePath}`;
                }
            }
        },
        async downloadPatches() {
            const app = Alpine.store('app');
            
            if (app.downloadStatuses.patches.status.includes('Downloading') || app.downloadStatuses.patches.status.includes('Extracting')) {
                return; 
            }

            this.playSound('select');
            
            app.downloadStatuses.patches = { status: 'Preparing...', percentage: 0, step: 'connect', type: 'patches' };
            
            try {
                const result = await window.electronAPI.downloadPatches();
                if (result.success) {
                    app.downloadStatuses.patches = { status: 'Patches installed!', percentage: 100, step: 'done', type: 'patches' };
                } else {
                    app.downloadStatuses.patches = { status: `Error: ${result.error}`, percentage: 0, step: 'error', type: 'patches' };
                }
            } catch (e) {
                app.downloadStatuses.patches = { status: `Error: ${e.message}`, percentage: 0, step: 'error', type: 'patches' };
            }
        },
        async saveApiKey() {
            const app = Alpine.store('app');
            if (app.apiSaveStatus) return; 
            const key = document.getElementById('steamgrid-api-input').value;
            await window.electronAPI.set('steamGridDBKey', key);
            app.settings.apiKey = key;
            document.getElementById('steamgrid-api-input').blur();
            this.playSound('select'); 
            app.apiSaveStatus = true; 
            setTimeout(() => { app.apiSaveStatus = false; }, 2000);
        },
        focusApiKeyInput() {
            setTimeout(() => {
                const input = document.getElementById('steamgrid-api-input');
                if (input) { input.focus(); input.select(); }
            }, 0);
        },
        async editConfigFile() {
            await window.electronAPI.openFileInDefaultApp('config');
        },
        async scanForGames(forceScan = false) {
            const app = Alpine.store('app');
            if (isScanning && !forceScan) return; 
            
            isScanning = true; 
            try {
                const result = await window.electronAPI.scanForGames();
                if (result.success) {
                    app.gamesList = result.games; 
                    

                    if (app.librarySearch && app.librarySearch.trim() !== '') {
                        
                        this.filterLibrary(); 
                    } else {
                        app.filteredLibraryGames = result.games;
                    }
                }
                this.updateGameDetails();
            } catch (e) {
                console.error("Failed to scan games:", e);
            }
            isScanning = false; 
        },
        async scanForThemes() {
             const app = Alpine.store('app');
            if (app.themesList.length > 0) return;
            const result = await window.electronAPI.scanForThemes();
            if (result.success) {
                app.themesList = result.themes.map(name => ({ 
                    name: name,
                    icon: 'assets/icons/icon-theme.png' 
                }));
            }
        },
        updateGameDetails() {
            const app = Alpine.store('app');
            const actions = Alpine.store('actions');
            
            const game = app.filteredLibraryGames[app.focusedIndex];
            
            if (!game) {
                app.focusedGamePatchInfo = null;
                app.gameDetails = { title: '', logoUrl: '', heroUrl: 'none' };
                app.gameExtendedInfo = { description: '', developer: '', genre: '', screenshots: [], loading: false };
                return;
            }

            app.gameDetails.title = game.name;
            app.gameDetails.logoUrl = game.logoUrl || '';
            app.gameDetails.heroUrl = game.heroUrl ? `url('${game.heroUrl}')` : 'none';


            app.gameExtendedInfo.loading = true;
            app.gameExtendedInfo.screenshots = []; 
            
            if (game.titleID) {

                window.electronAPI.getLocalGameMetadata(game.titleID).then(result => {
                    if (result.found && result.metadata) {
                        app.gameExtendedInfo = {
                            description: result.metadata.description || 'No description available.',
                            developer: result.metadata.developer || 'Unknown',
                            publisher: result.metadata.publisher || 'Unknown',
                            genre: result.metadata.genre || 'Unknown',
                            releaseDate: result.metadata.releaseDate || '',
                            rating: result.metadata.rating || '',

                            screenshots: result.metadata.assets.screenshots || [],
                            loading: false
                        };
                    } else {
                        app.gameExtendedInfo = { 
                            description: 'No details found in Local Database for this Title ID.', 
                            developer: '', publisher: '', genre: '', rating: '',
                            screenshots: [], 
                            loading: false 
                        };
                    }
                });
            } else {
                app.gameExtendedInfo = { 
                    description: 'Game has no Title ID. Please scan it first.', 
                    screenshots: [], 
                    loading: false 
                };
            }


            const hasFiles = (game.patchFiles && game.patchFiles.length > 0) || game.patchFileName;

            if (game.titleID && hasFiles) {
                const filesList = (game.patchFiles && game.patchFiles.length > 0) 
                                  ? game.patchFiles 
                                  : [game.patchFileName];

                app.focusedGamePatchInfo = {
                    titleID: game.titleID,
                    availableFiles: filesList, 
                    fileName: filesList[0], 
                    source: game.patchSource,
                    error: null
                };
            } else {
                app.focusedGamePatchInfo = {
                    titleID: game.titleID || null,
                    availableFiles: [],
                    fileName: null,
                    source: 'none',
                    error: game.titleID ? "ID found, no patch file." : "No Title ID found."
                };
            }

            actions.fetchCompatibilityForGame(game);
        },
        moveFocus(direction) {
            const app = Alpine.store('app');
            const actions = Alpine.store('actions');

            if (app.navThrottle) return;
                app.navThrottle = true;
                setTimeout(() => { app.navThrottle = false; }, 150); 
                

                if (app.currentView === 'achievements') {
                    const collection = app.achievementsGamesList;
                    if (!collection || collection.length === 0) return;

                    let newIndex = app.focusedIndex + direction;

                    if (newIndex >= 0 && newIndex < collection.length) {
                        app.focusedIndex = newIndex;
                        this.playSound('focus');

                        this.scrollToFocusedElement('ach-card-' + newIndex);
                    }
                return;
            }
            
            if (app.focusedCollection === 'displayItems') {
                let newIndex = app.focusedIndex + direction;
                if (newIndex < 0) newIndex = 0;
                if (newIndex > 2) newIndex = 2;
                if (newIndex !== app.focusedIndex) {
                    app.focusedIndex = newIndex;
                    this.playSound('focus');
                    this.scrollToFocusedElement('display-item-' + newIndex);
                }
                return;
            }

            if (!app.focusedCollection) return;
            const collection = app[app.focusedCollection];
            if (!collection || collection.length === 0) return;
            
            let newIndex = app.focusedIndex + direction;
            if (newIndex < 0) newIndex = 0;
            if (newIndex >= collection.length) newIndex = collection.length - 1;
            
            if (newIndex !== app.focusedIndex) {
                app.focusedIndex = newIndex;
                this.playSound('focus');
                

                if (app.focusedCollection === 'gamesList' || app.focusedCollection === 'filteredLibraryGames') {
                    
                    app.libraryMemoryIndex = newIndex; 
                    
                    this.updateGameDetails(); 

                    if (this.compatDebounce) clearTimeout(this.compatDebounce);
                    
                    this.compatDebounce = setTimeout(() => {
                        const game = app.filteredLibraryGames[newIndex];
                        if (game) this.fetchCompatibilityForGame(game);
                    }, 300);
                }
                
                const idPrefixMap = {
                    'gamesList': 'game-item-',
                    'filteredLibraryGames': 'game-item-',
                    'settingsMenu': 'hub-item-',
                    'coreSettingsItems': 'core-item-',
                    'themesList': 'system-item-',
                    'patchList': 'patch-item-',
                    'colorPresets': 'color-item-',
                    'languageOptions': 'lang-item-',
                    'audioMenu': 'audio-item-',
                    'aboutMenu': 'about-item-'
                };
                
                const prefix = idPrefixMap[app.focusedCollection];
                if (prefix) {
                    this.scrollToFocusedElement(prefix + newIndex);
                }
            }

        },
        scrollToFocusedElement(elementId) {
            setTimeout(() => {
                const element = document.getElementById(elementId);
                if (element) {
                    element.scrollIntoView({
                        behavior: 'smooth',
                        block: 'nearest',
                        inline: 'nearest'
                    });
                }
            }, 0); 
        },
        async loadXeniaConfig() {
            const app = Alpine.store('app');
            app.xeniaConfig = {};
            app.configCategories = [];
            app.xeniaConfigError = null;
            try {
                const result = await window.electronAPI.loadTomlConfig();
                if (!result.success) throw new Error(result.error);
                app.xeniaConfig = result.data;
                app.configCategories = Object.keys(result.data).filter(key => 
                    result.data[key] && Object.keys(result.data[key]).length > 0
                );
                app.focusedConfigCategoryIndex = 0;
                this.updateCurrentConfigOptions();
            } catch (e) {
                console.error("Failed to load Xenia config:", e.message);
                app.xeniaConfigError = e.message;
            }
        },
    async saveXeniaConfig() {
        const app = Alpine.store('app');
        if (app.configSaveStatus === 'saving') return; 
        
        app.configSaveStatus = 'saving';
        this.playSound('select'); 
        
        try {
            const plainConfig = JSON.parse(JSON.stringify(app.xeniaConfig));
            let result;

            if (app.configMode === 'game' && app.editingGameInfo) {
                result = await window.electronAPI.manageGameConfig({
                    action: 'save',
                    titleID: app.editingGameInfo.titleID,
                    data: plainConfig
                });
            } else {
                result = await window.electronAPI.saveTomlConfig(plainConfig);
            }

            if (result && result.success) {
                app.configSaveStatus = 'saved';
                setTimeout(() => { app.configSaveStatus = 'idle'; }, 2000);
            } else {
                throw new Error(result ? result.error : 'Unknown saving error');
            }
        } catch (error) {
            console.error("Failed to save config:", error);
            alert(`Failed to save config: ${error.message}`);
            app.configSaveStatus = 'idle';
        }
    },
        updateCurrentConfigOptions() {
            const app = Alpine.store('app');
            if (app.configCategories.length === 0) return;
            const categoryName = app.configCategories[app.focusedConfigCategoryIndex];
            const options = app.xeniaConfig[categoryName];
            app.currentConfigOptions = Object.entries(options).map(([key, value]) => ({
                key: key,
                value: value,
                type: typeof value
            }));
            app.configOptionIndex = 0;
        },
        moveConfigCategory(direction) {
            const app = Alpine.store('app');
            if (app.configCategories.length === 0) return;
            let newIndex = app.focusedConfigCategoryIndex + direction;
            if (newIndex < 0) newIndex = 0;
            if (newIndex >= app.configCategories.length) newIndex = app.configCategories.length - 1;
            if (newIndex !== app.focusedConfigCategoryIndex) {
                app.focusedConfigCategoryIndex = newIndex;
                this.playSound('focus');
                this.updateCurrentConfigOptions();
                this.scrollToFocusedElement('config-category-' + newIndex);
            }
        },
        moveConfigOption(direction) {
            const app = Alpine.store('app');
            if (app.currentConfigOptions.length === 0) return;
            let newIndex = app.configOptionIndex + direction;
            if (newIndex < 0) newIndex = 0;
            if (newIndex >= app.currentConfigOptions.length) newIndex = app.currentConfigOptions.length - 1;
            if (newIndex !== app.configOptionIndex) {
                app.configOptionIndex = newIndex;
                this.playSound('focus');
                this.scrollToFocusedElement('config-option-' + newIndex);
            }
        },
        selectConfigOption() {
            const app = Alpine.store('app');
            this.playSound('select');
            const option = app.currentConfigOptions[app.configOptionIndex];
            if (!option) return;
            const categoryName = app.configCategories[app.focusedConfigCategoryIndex];
            if (option.type === 'boolean') {
                app.xeniaConfig[categoryName][option.key] = !app.xeniaConfig[categoryName][option.key];
            } else {
                const inputId = `${categoryName}_${option.key}`;
                setTimeout(() => {
                    const input = document.getElementById(inputId);
                    if (input) {
                        input.focus();
                        if (input.type === 'text') input.select();
                    }
                }, 0);
            }
        },
        async saveAllPatches() {
            const app = Alpine.store('app');
            if (app.patchSaveStatus === 'saving') return;
            app.patchSaveStatus = 'saving';
            this.playSound('select');
            
            if (!app.focusedGamePatchInfo || !app.focusedGamePatchInfo.fileName) {
                console.error("[Save Error] No filename found.");
                app.patchSaveStatus = 'error';
                setTimeout(() => { app.patchSaveStatus = 'idle'; }, 2000);
                return;
            }
            
            const { fileName } = app.focusedGamePatchInfo;
            
            try {
                const patchesToSave = JSON.parse(JSON.stringify(app.patchList));
                const headerToSave = JSON.parse(JSON.stringify(app.patchHeader));
                const result = await window.electronAPI.saveAllPatchesForGame(
                    fileName, 
                    patchesToSave, 
                    headerToSave
                );
                if (result.success) {
                    app.patchSaveStatus = 'saved';
                } else {
                    app.patchSaveStatus = 'error';
                    console.error("Failed to save patches:", result.error);
                }
                setTimeout(() => { 
                    app.patchSaveStatus = 'idle'; 
                }, 2000);
            } catch (error) {
                console.error("Critical error saving patches:", error);
                app.patchSaveStatus = 'error';
                setTimeout(() => { app.patchSaveStatus = 'idle'; }, 2000);
            }
        },

        openPatchManagerSmart() {
            const app = Alpine.store('app');
            
            if (!app.focusedGamePatchInfo || app.focusedGamePatchInfo.availableFiles.length === 0) {
                return;
            }

            const files = app.focusedGamePatchInfo.availableFiles;

            if (files.length === 1) {
                app.focusedGamePatchInfo.fileName = files[0];
                this.playSound('select');
                this.loadView('patches-manager');
            } 
            else {
                this.playSound('panelUnfold');
                app.patchSelectorFiles = files;
                app.patchSelectorIndex = 0;
                app.isPatchSelectorOpen = true; 
            }
        },

            selectPatchFileAndOpen() {
                const app = Alpine.store('app');
                const selectedFile = app.patchSelectorFiles[app.patchSelectorIndex];
                
                if (selectedFile) {
                    app.focusedGamePatchInfo.fileName = selectedFile;
                    app.isPatchSelectorOpen = false; 
                    this.playSound('select');
                    this.loadView('patches-manager');
                }
            },
        async loadPatchesForGame() {
            const app = Alpine.store('app');
            if (!app.focusedGamePatchInfo || !app.focusedGamePatchInfo.titleID) {
                app.patchesLoadingError = "No game selected or ID not found.";
                return;
            }
            if (!app.focusedGamePatchInfo.fileName) {
                 app.patchesLoadingError = `ID (${app.focusedGamePatchInfo.titleID}) found, but no patch file exists.`;
                 return;
            }
            app.patchList = [];
            app.patchHeader = {};
            app.patchesLoadingError = null;
            const { titleID, fileName } = app.focusedGamePatchInfo;
            const result = await window.electronAPI.loadPatchesForGame(titleID, fileName);
            if (result.success) {
                const fullData = result.data;
                if (fullData.patch && Array.isArray(fullData.patch)) {
                    app.patchList = fullData.patch.map((patch, index) => {
                        patch.id = `complex_patch_${index}`;
                        return patch;
                    });
                    delete fullData.patch;
                    app.patchHeader = fullData;
                }
                else if (fullData) {
                     let simplePatches = [];
                     Object.keys(fullData).forEach(key => {
                         if (key.startsWith('patch_')) {
                             let patch = fullData[key];
                             patch.id = key;
                             simplePatches.push(patch);
                             delete fullData[key];
                         }
                     });
                     if (simplePatches.length > 0) {
                         app.patchList = simplePatches;
                         app.patchHeader = fullData;
                     } else {
                         app.patchesLoadingError = "File found, but '[[patch]]' array is missing.";
                     }
                }
            } else {
                app.patchesLoadingError = result.error;
            }
        },
        togglePatch(patch) {
            const app = Alpine.store('app');
            const newEnabledState = !patch.is_enabled;
            patch.is_enabled = newEnabledState; 
            this.playSound('select');
            app.patchSaveStatus = 'idle'; 
        },
        selectFocusedItem() {
            const app = Alpine.store('app');
            const actions = Alpine.store('actions');
            
            if (app.isPageTransitioning) return;
            
            if (app.focusedCollection === 'displayItems') {
                this.playSound('select');
                if (app.focusedIndex === 0) this.changeWallpaper();
                else if (app.focusedIndex === 1) this.changeStage();
                else if (app.focusedIndex === 2) this.changeFlourish();
                return;
            }

            if (!app.focusedCollection) return;
            const collection = app[app.focusedCollection];
            const item = collection ? collection[app.focusedIndex] : null;
            if (!item) return;

            switch (app.focusedCollection) {
                case 'languageOptions':
                    this.playSound('select');
                    const selectedLang = app.languageOptions[app.focusedIndex].code;
                    this.setLanguage(selectedLang);
                    break;

                case 'settingsMenu':
                    if (item.view) {
                        this.playSound('select');
                        this.loadView(item.view);
                    }
                    break;
                    
                case 'filteredLibraryGames': 
                case 'gamesList':
                    if (item && item.path && !app.gameSelectionAnimating) {
                        app.gameSelectionAnimating = true;
                        app.selectedGame = item;
                        app.selectedIndexForAnimation = app.focusedIndex;
                        this.playSound('select');
                        
                        setTimeout(() => {
                            this.goBack(); 
                            setTimeout(() => {
                                const app = Alpine.store('app');
                                const actions = Alpine.store('actions');
                                app.masterIndex = 1; 
                                actions.updateDetailMenu();
                                app.detailIndex = 0; 
                                app.focusedList = 'detail';
                                app.gameSelectionAnimating = false;
                                app.selectedIndexForAnimation = -1;
                            }, 850);
                        }, 600);
                    }
                    break;

                case 'coreSettingsItems':

                if (item.id === 'art-source') {
                        actions.toggleArtSource();
                        break;
                }

                if (item.id === 'open-xenia-dash') {
                    this.launchXeniaDashboard(); 
                    break; 
                }
                    
                    if (item.view) {
                        this.playSound('select');
                        
                        if (item.view === 'settings-config') {
                            const app = Alpine.store('app'); 
                            app.configMode = 'global';
                            app.editingGameInfo = null;
                        }
                       

                        this.loadView(item.view);
                        break;
                    }
                    
                    if (item.id === 'linux-launch') {
                        this.playSound('select');
                        const methods = ['native', 'wine', 'proton'];
                        let current = app.settings.linuxLaunchMethod;
                        let nextIndex = (methods.indexOf(current) + 1) % methods.length;
                        const newMethod = methods[nextIndex];
                        app.settings.linuxLaunchMethod = newMethod;
                        window.electronAPI.set('linuxLaunchMethod', newMethod);
                        this.initializeAppSettings(); 
                        break;
                    }

                    if (item.id === 'download-xenia-win') {
                        this.downloadXenia('win'); 
                        break;
                    }
                    if (item.id === 'download-xenia-linux') {
                        this.downloadXenia('linux'); 
                        break;
                    }
                    if (item.id === 'download-patches') {
                        this.downloadPatches();
                        break;
                    }

                    if (item.id === 'proton-path') {
                        this.playSound('select');
                        this.browseProtonPath();
                        break;
                    }
                    
                    const actionMap = {
                        'xenia-path': 'browseXeniaPath',
                        'game-folder': 'browseGameFolder',
                        'steamgrid-api': 'focusApiKeyInput'
                    };
                    
                    if (actionMap[item.id]) {
                        this.playSound('select');
                        this[actionMap[item.id]]();
                    }
                    break;

                case 'themesList': 
                    this.playSound('select');
                    this.applyTheme(item.name);
                    break;
                
                case 'colorPresets': 
                    this.saveThemeSelection(app.focusedIndex);
                    if (item.id === 'custom') {
                        this.applyColorTheme(app.customColors);
                    }
                    break;

                case 'patchList':
                    this.togglePatch(item);
                    break;
            }
        },

            toggleGuide() {
                const app = Alpine.store('app');
                app.isGuideOpen = !app.isGuideOpen;
                
                if (app.isGuideOpen) {
                    this.playSound('panelUnfold');
                    app.guideTabIndex = 0; 
                    app.guideMenuIndex = 0;
                    if(this.coverLoader) this.coverLoader.loadQueueCovers();
                } else {
                    this.playSound('back');
                }
            },

            async performShutdown() {
                const actions = Alpine.store('actions');
                actions.playSound('back'); 
                
                const overlay = document.getElementById('shutdown-overlay');
                if (overlay) {
                    overlay.classList.add('shutdown-active');
                }

                await new Promise(r => setTimeout(r, 600));
                window.electronAPI.quitApp(); 
            },

            moveGuideTab(direction) {
                const app = Alpine.store('app');
                let newIndex = app.guideTabIndex + direction;
                
                if (newIndex < 0) newIndex = app.guideTabs.length - 1;
                if (newIndex >= app.guideTabs.length) newIndex = 0;
                
                app.guideTabIndex = newIndex;
                app.guideMenuIndex = 0; 
                this.playSound('panelLeft'); 
            },


            moveGuideMenu(direction) {
                const app = Alpine.store('app');
                const dir = parseInt(direction);
                if (isNaN(dir)) return;

                const currentTab = app.guideTabs[app.guideTabIndex].id;
                let maxIndex = 0;

                if (currentTab === 'home') {
                    maxIndex = 2;
                } 
                else if (currentTab === 'games') {
                    const count = app.gamesList.length;
                    maxIndex = count > 0 ? count - 1 : 0;
                } 

                let newIndex = app.guideMenuIndex + dir;

                if (newIndex < 0) newIndex = 0;
                if (newIndex > maxIndex) newIndex = maxIndex;

                if (newIndex !== app.guideMenuIndex) {
                    app.guideMenuIndex = newIndex;
                    this.playSound('focus');
                    
                    setTimeout(() => {
                        let elementId = null;
                        
                        if (currentTab === 'home') {
                            elementId = 'guide-home-' + newIndex;
                        } 
                        else if (currentTab === 'games') {
                            elementId = 'guide-game-' + newIndex;
                        } 
                        
                        if (elementId) {
                            const el = document.getElementById(elementId);
                            if (el) {
                                el.scrollIntoView({block: 'nearest', behavior: 'smooth'});
                            }
                        }
                    }, 10);
                }
            },

            executeGuideAction() {
                const app = Alpine.store('app');
                const currentTab = app.guideTabs[app.guideTabIndex].id;

                if (currentTab === 'home') { 
                    if (app.guideMenuIndex === 0) {
                        app.isGuideOpen = false;
                        this.playSound('back');
                    } else if (app.guideMenuIndex === 2) {
                        this.performShutdown();
                        return; 
                    }
                } 
                else if (currentTab === 'games') {
                    const game = app.gamesList[app.guideMenuIndex];
                    if(game) {
                        this.launchGame(game);
                        app.isGuideOpen = false;
                    }
                }
                
                this.playSound('select');
            },


            updateCursorVisuals() {
                const app = Alpine.store('app');
                const input = document.querySelector('.xbox-kb-input');
                const cursor = document.querySelector('.input-cursor');
                const container = document.querySelector('.xbox-kb-input-row');
                
                if (!input || !cursor || !container) return;

 

                const targetVar = 'librarySearch';
                const currentText = app[targetVar] || "";

                let textUpToCursor = currentText.substring(0, app.searchCursorPos);
                
                const span = document.createElement('span');
                const inputStyle = window.getComputedStyle(input);
                const containerStyle = window.getComputedStyle(container);
                
                span.style.fontFamily = inputStyle.fontFamily;
                span.style.fontSize = inputStyle.fontSize;
                span.style.fontWeight = inputStyle.fontWeight;
                span.style.letterSpacing = inputStyle.letterSpacing;
                span.style.textTransform = inputStyle.textTransform; 
                span.style.whiteSpace = 'pre'; 
                
                span.textContent = textUpToCursor;
                
                span.style.visibility = 'hidden';
                span.style.position = 'absolute';
                document.body.appendChild(span);
                
                const textWidth = span.offsetWidth;
                document.body.removeChild(span);

                const paddingLeft = parseFloat(containerStyle.paddingLeft) || 15;
                
                cursor.style.left = (paddingLeft + textWidth + 1) + 'px';
                
                cursor.style.animation = 'none';
                cursor.offsetHeight; 
                cursor.style.animation = ''; 
            },


            moveTextCursor(direction) {
                const app = Alpine.store('app');
                
                const targetVar = 'librarySearch';
                const currentText = app[targetVar] || "";
                
                const textLen = currentText.length;

                let newPos = app.searchCursorPos + direction;
                
                if (newPos < 0) newPos = 0;
                if (newPos > textLen) newPos = textLen;

                if (newPos !== app.searchCursorPos) {
                    app.searchCursorPos = newPos;
                    this.updateCursorVisuals();
                    this.playSound('focus');
                }
            },

            toggleKeyboard() {
                const app = Alpine.store('app');
                app.isKeyboardOpen = !app.isKeyboardOpen;
                
                if (app.isKeyboardOpen) {
                    this.playSound('panelUnfold');
                    app.keyboardRow = 1;
                    app.keyboardCol = 0;
                    app.isCaps = false;
                    app.isSymbols = false;
                    app.isAccents = false;
                    
                    const targetVar = 'librarySearch';
                    app.searchCursorPos = (app[targetVar] || "").length;
                    
                    setTimeout(() => this.updateCursorVisuals(), 50);
                } else {
                    this.playSound('back');
                }
            },

            moveKeyboardFocus(rowDir, colDir) {
                const app = Alpine.store('app');
                const layout = app.currentKeys;
                
                let newRow = app.keyboardRow + rowDir;
                let newCol = app.keyboardCol + colDir;

                if (newRow < 0) newRow = layout.length - 1;
                if (newRow >= layout.length) newRow = 0;

                const rowLength = layout[newRow].length;
                if (newCol < 0) newCol = rowLength - 1;
                if (newCol >= rowLength) newCol = 0;

                if (newRow !== app.keyboardRow || newCol !== app.keyboardCol) {
                    app.keyboardRow = newRow;
                    app.keyboardCol = newCol;
                    this.playSound('focus');
                }
            },

            pressKeyboardKey() {
                const app = Alpine.store('app');
                const key = app.currentKeys[app.keyboardRow][app.keyboardCol];
                const targetVar = app.keyboardMode === 'rename' ? 'renameInput' : 'librarySearch';
                const currentText = app[targetVar] || "";
                const pos = app.searchCursorPos;

                app[targetVar] = currentText.slice(0, pos) + key + currentText.slice(pos);
                app.searchCursorPos++;

                this.playSound('select');


                if (app.currentView === 'game-library' && app.keyboardMode === 'search') {
                    this.filterLibrary(); 
                }

                setTimeout(() => this.updateCursorVisuals(), 0);
            },


            handleKeyboardSpecial(action) {
                const app = Alpine.store('app');
                const actions = Alpine.store('actions');
                


                const targetVar = app.keyboardMode === 'rename' ? 'renameInput' : 'librarySearch';


                const currentText = app[targetVar] || "";
                const pos = app.searchCursorPos;

                if (action === 'BACKSPACE') {
                    if (pos > 0) {

                        app[targetVar] = currentText.slice(0, pos - 1) + currentText.slice(pos);
                        app.searchCursorPos--;
                        actions.playSound('back');
                        setTimeout(() => this.updateCursorVisuals(), 0);
                    }
                } 
                else if (action === 'SPACE') {

                    app[targetVar] = currentText.slice(0, pos) + " " + currentText.slice(pos);
                    app.searchCursorPos++;
                    actions.playSound('select');
                    setTimeout(() => this.updateCursorVisuals(), 0);
                }
                else if (action === 'CAPS') {
                    app.isCaps = !app.isCaps;
                    app.isSymbols = false;
                    app.isAccents = false;
                    actions.playSound('focus');
                }
                else if (action === 'SYMBOLS') {
                    app.isSymbols = !app.isSymbols;
                    app.isCaps = false;
                    app.isAccents = false;
                    actions.playSound('focus');
                }
                else if (action === 'ACCENTS') {
                    app.isAccents = !app.isAccents;
                    app.isSymbols = false;
                    app.isCaps = false;
                    actions.playSound('focus');
                }
                
                else if (action === 'DONE') {
                    if (app.keyboardMode === 'rename') {
                        this.submitRename();
                    } else {
                        this.toggleKeyboard();
                    }
                    return;
                }
                

                if (action !== 'DONE') {

                    if (app.currentView === 'game-library' && app.keyboardMode === 'search') {
                        actions.filterLibrary(); 
                    }
                }
            },

        getCompatConfig(state) {
            const config = {
                'state-playable': { text: 'PLAYABLE', color: '#238636', bg: '#23863690', icon: '✔' },
                'state-gameplay': { text: 'GAMEPLAY', color: '#d29922', bg: '#d2992290', icon: '🎮' },
                
                'state-menus':    { text: 'MENUS',    color: '#9e6a03', bg: '#9e6a0390', icon: '☰' },
                'state-title':    { text: 'TITLE',    color: '#8b949e', bg: '#8b949e90', icon: '📺' },
                
                'state-intro':    { text: 'INTRO',    color: '#da3633', bg: '#da363390', icon: '🎬' },
                'state-load':     { text: 'LOADS',    color: '#8957e5', bg: '#8957e590', icon: '⏳' },
                
                'state-hang':     { text: 'HANG',     color: '#b31d28', bg: '#b31d2890', icon: '❄' },
                'state-crash':    { text: 'CRASH',    color: '#6e1818', bg: '#6e181890', icon: '💥' },
                'state-nothing':  { text: 'BROKEN',   color: '#30363d', bg: '#00000090', icon: '❌' },
                
                'unknown':        { text: 'UNK',      color: '#666666', bg: '#33333390', icon: '?' }
            };
            return config[state] || config['unknown'];
        },

        async fetchCompatibilityForGame(game) {
            const app = Alpine.store('app');
            
            const gameIndex = app.gamesList.findIndex(g => g.path === game.path);
            const filteredIndex = app.filteredLibraryGames.findIndex(g => g.path === game.path);
            
            if (gameIndex === -1) return;

            if (app.gamesList[gameIndex].compatFetched) return;

            const loadingConfig = { text: 'LOADING', color: '#888', bg: '#00000090', icon: '⏳' };
            
            app.gamesList[gameIndex].compatConfig = loadingConfig;
            app.gamesList[gameIndex].compatFetched = true;

            try {
                const query = game.titleID ? game.titleID : game.name;
                const data = await window.electronAPI.getGameCompatibility(query);
                const conf = this.getCompatConfig(data.state);
                
                app.gamesList[gameIndex].compatConfig = conf;
                app.gamesList[gameIndex].compatIssues = data.issues;
                app.gamesList[gameIndex].compatTags = data.tags.map(t => ({ 
                    text: t === '1080p' ? '1080p' : t, 
                    color: t === '1080p' ? '#2188ff' : '#888' 
                }));

                if (filteredIndex !== -1) {
                    app.filteredLibraryGames[filteredIndex].compatConfig = conf;
                    app.filteredLibraryGames[filteredIndex].compatIssues = data.issues;
                    app.filteredLibraryGames[filteredIndex].compatTags = app.gamesList[gameIndex].compatTags;
                }

            } catch (e) {
                console.warn("Compat error", e);
                const currentIndex = app.gamesList.findIndex(g => g.name === game.name);
                if (currentIndex !== -1) {
                     const errorConfig = this.getCompatConfig('unknown');
                     app.gamesList[currentIndex] = {
                        ...app.gamesList[currentIndex],
                        compatConfig: errorConfig
                     };
                }
            }
        },

        async deleteFocusedGame() {
            const app = Alpine.store('app');
            
            if (app.currentView !== 'game-library' || app.gamesList.length === 0) return;

            const game = app.gamesList[app.focusedIndex];
            if (!game) return;

            if (confirm(`Are you sure you want to delete "${game.name}" permanently?`)) {
                try {
                    const result = await window.electronAPI.deleteGame(game.path);
                    
                    if (result.success) {
                        this.playSound('back');
                        
                        app.gamesList.splice(app.focusedIndex, 1);

                        if (app.focusedIndex >= app.gamesList.length) {
                            app.focusedIndex = Math.max(0, app.gamesList.length - 1);
                        }

                        this.updateGameDetails(); 
                        
                    } else {
                        alert(`Failed to delete game: ${result.error}`);
                    }
                } catch (e) {
                    console.error("Delete error:", e);

                    alert("Error calling delete handler.");
                }
            }
        },
        async loadLocales() {
            const app = Alpine.store('app');
            try {
                const result = await window.electronAPI.loadLocales();
                if (result.success) {
                    app.translations = result.data;
                    console.log("[i18n] Locales loaded successfully");
                }
            } catch (e) {
                console.error("[i18n] Failed to load locales:", e);
            }
        },

        async setLanguage(lang) {
            const app = Alpine.store('app');
            this.playSound('select');
            
            await window.electronAPI.set('language', lang);
            app.language = lang;
            
            this.applyDirection(lang);
        },

       applyDirection(lang) {
            const html = document.documentElement;
            

            const rtlLanguages = ['ar'];
            

            const ltrLanguages = ['en', 'zh', 'ja', 'ko', 'ru', 'de', 'pt_BR', 'es', 'tr', 'it', 'fr'];
            
            if (rtlLanguages.includes(lang)) {
                html.setAttribute('dir', 'rtl');
                html.lang = lang;
                html.classList.add('is-rtl');
            } else if (ltrLanguages.includes(lang)) {
                html.setAttribute('dir', 'ltr');
                html.lang = lang;
                html.classList.remove('is-rtl');
            } else {

                html.setAttribute('dir', 'ltr');
                html.lang = 'en';
                html.classList.remove('is-rtl');
            }
        }

    });

    window.getGuideTabName = function(offset) {
    const app = Alpine.store('app');
    let index = app.guideTabIndex + offset;
    if (index < 0) index = app.guideTabs.length - 1;
    if (index >= app.guideTabs.length) index = 0;
    return app.guideTabs[index].name;
}

    document.addEventListener('keydown', (e) => {
        const key = e.key;
        const actions = Alpine.store('actions');
        const app = Alpine.store('app');
        

        if (key === 'Tab') { 
            e.preventDefault();
            actions.toggleGuide();
            return;
        }

        if ((key === 'z' || key === 'Z') && !app.isKeyboardOpen) {
            if (app.currentView === 'game-library') {
                const game = app.filteredLibraryGames[app.focusedIndex];
                if (game && game.fileName.toLowerCase().endsWith('.zar') && !game.titleID) {
                    actions.performZarScan();
                    e.preventDefault();
                    return;
                }
            }
        }

        if (app.isGuideOpen) {
            if (key === 'ArrowUp') actions.moveGuideMenu(-1);
            if (key === 'ArrowDown') actions.moveGuideMenu(1);
            if (key === 'ArrowLeft') actions.moveGuideTab(-1);
            if (key === 'ArrowRight') actions.moveGuideTab(1);
            if (key === 'Enter') actions.executeGuideAction();
            if (key === 'Escape') actions.toggleGuide();
            return;
        }

        if (app.currentView === 'achievements') {
            if (e.key === 'ArrowRight') {
                e.preventDefault();
                actions.moveFocus(1);
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                actions.moveFocus(-1);
            }
        }

        if (app.currentView === 'achievements') {
            if (app.isAchievementOverlayOpen) {
                if (key === 'Escape' || key === 'Backspace') {
                    actions.closeAchievementOverlay();
                    return;
                }
                if (key === 'ArrowUp') actions.moveAchievementGridFocus(-1, 0);
                if (key === 'ArrowDown') actions.moveAchievementGridFocus(1, 0);
                if (key === 'ArrowLeft') actions.moveAchievementGridFocus(0, -1);
                if (key === 'ArrowRight') actions.moveAchievementGridFocus(0, 1);
                return;
            }

            if (key === 'Enter') {
                actions.openAchievementOverlay();
                return;
            }
        }


        if (app.isProfileSelectorOpen) {
            e.stopImmediatePropagation(); 

            if (app.isCreatingProfile) {
                
                if (key === 'Escape') {
                    actions.cancelCreateProfile();
                    return;
                }
                if (key === 'Enter') {
                    actions.submitNewProfile();
                    return;
                }
                return;
            }

            if (app.isRenamingProfile) {
                if (key === 'Escape') {
                    actions.cancelRenameProfile();
                    return;
                }
                if (key === 'Enter') {
                    actions.submitProfileRename();
                    return;
                }
                return;
            }
            
            if (key === 'ArrowDown') {
                app.focusedProfileIndex = Math.min(app.focusedProfileIndex + 1, app.profilesList.length - 1);
                actions.playSound('focus');
            } else if (key === 'ArrowUp') {
                app.focusedProfileIndex = Math.max(app.focusedProfileIndex - 1, 0);
                actions.playSound('focus');
            } 
            else if (key === 'x' || key === 'X') {
                actions.changeFocusedProfileAvatar();
            }
            else if (key === 'o' || key === 'O') {
                actions.createNewProfilePrompt();
            }

            else if (key === '[') {
                actions.logoutFocusedProfile();
            }
            else if (key === ']') {
                actions.loginFocusedProfile();
            }
            
            else if (key === 'Delete') {
                if (app.isProfileSelectorOpen) actions.deleteFocusedProfile();
            }
            
            else if (key === 'Enter' || key === 'a' || key === 'A') {
                if (app.focusedProfileIndex === app.profilesList.length) {
                    actions.createNewProfilePrompt();
                } else {
                    const sel = app.profilesList[app.focusedProfileIndex];
                    if (sel) actions.switchActiveProfile(sel.slot);
                }
            } else if (key === 'Backspace') {
                app.isProfileSelectorOpen = false;
                actions.playSound('back');
            }
            return; 
        }
        
        if (app.isPageTransitioning || app.gameSelectionAnimating) {
            e.preventDefault();
            return;
        }

        if (app.currentView === 'dashboard' && (key === 'y' || key === 'Y')) {
            actions.changeUserAvatar();
            return;
        }
        
        if (app.isArtManagerOpen) {
            if (key === 'Escape' || key === 'Backspace' || key === 'm' || key === 'M') {
                actions.closeArtManager();
                return;
            }

            if (key === 'q' || key === 'Q' || key === 'PageUp') { actions.changeArtTab(-1); return; }
            if (key === 'e' || key === 'E' || key === 'PageDown') { actions.changeArtTab(1); return; }

            if (key === 'ArrowUp')    { actions.moveArtGridFocus(-1, 0); return; }
            if (key === 'ArrowDown')  { actions.moveArtGridFocus(1, 0); return; }
            if (key === 'ArrowLeft')  { actions.moveArtGridFocus(0, -1); return; }
            if (key === 'ArrowRight') { actions.moveArtGridFocus(0, 1); return; }

            if (key === 'Enter') {
                const asset = app.artManagerData.assets[app.artManagerData.focusedAssetIndex];
                if (asset) actions.applyArtAsset(asset.full, false);
            }
            
            if (key === 'x' || key === 'X') actions.browseLocalArtAsset();
            return;
        }


        if (app.isKeyboardOpen) {
            
            
            if (document.activeElement && document.activeElement.tagName === 'INPUT') {
                e.preventDefault(); 
            }


            if (key === 'Backspace') {
                actions.handleKeyboardSpecial('BACKSPACE');
                return;
            }


            if (key === ' ') { 
                actions.handleKeyboardSpecial('SPACE');
                return;
            }

            if (key === 'Enter') {
                actions.handleKeyboardSpecial('DONE');
                return;
            }

            if (key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
                const targetVar = 'librarySearch';
                const currentText = app[targetVar] || "";
                const pos = app.searchCursorPos;

                app[targetVar] = currentText.slice(0, pos) + key + currentText.slice(pos);
                app.searchCursorPos++;

                
                if (app.currentView === 'game-library') actions.filterLibrary();

                setTimeout(() => actions.updateCursorVisuals(), 0);
                return; 
            }


            if (key === 'ArrowUp') actions.moveKeyboardFocus(-1, 0);
            else if (key === 'ArrowDown') actions.moveKeyboardFocus(1, 0);
            else if (key === 'ArrowLeft') actions.moveKeyboardFocus(0, -1);
            else if (key === 'ArrowRight') actions.moveKeyboardFocus(0, 1);
            
            return;
        }


        const isInputFocused = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.type === 'checkbox';
        if (isInputFocused) {
            if (key === 'Enter') {
                e.preventDefault();
                e.target.blur();
                if (e.target.id === 'steamgrid-api-input') actions.saveApiKey();
            } else if (key === 'Escape') {
                e.preventDefault();
                e.target.blur();
            }
            return;
        }

        if (app.currentView === 'settings-audio') {
            const item = app.audioMenu[app.focusedIndex];

            if (key === 'y' || key === 'Y') {
                actions.resetSoundSettings();
                e.preventDefault();
                return;
            }

            if (item.type === 'slider') {
                const dirMultiplier = app.language === 'ar' ? -1 : 1;

                if (key === 'ArrowRight') {
                    const val = 1 * dirMultiplier;
                    if (item.id === 'volume') actions.updateMasterVolume(val);
                    else if (item.id === 'bgmVolume') actions.updateMusicVolume(val);
                    return; 
                }
                if (key === 'ArrowLeft') {
                    const val = -1 * dirMultiplier;
                    if (item.id === 'volume') actions.updateMasterVolume(val);
                    else if (item.id === 'bgmVolume') actions.updateMusicVolume(val);
                    return;
                }
            }

            if (key === 'Enter') {
                if (item.type === 'file') {
                    actions.changeSoundEffect();
                } else if (item.type === 'slider') {
                    actions.playSound('select');
                }
                return;
            }

            if (key === 'Escape' || key === 'Backspace') {
                actions.goBack();
                return;
            }

            if (key === 'ArrowUp') { actions.moveFocus(-1); return; }
            if (key === 'ArrowDown') { actions.moveFocus(1); return; }
        }
        

        if (key === 'r' || key === 'R') {
            if (app.currentView === 'game-library') {
                app.showGameInfoOverlay = !app.showGameInfoOverlay;
                actions.playSound('focus');
                e.preventDefault();
                return;
            }
        }

        if (key === 'm' || key === 'M') {
            if (app.currentView === 'game-library' && !app.isArtManagerOpen && !app.isKeyboardOpen) {
                actions.openArtManager();
                e.preventDefault();
                return;
            }
        }

        
        if (key === 'y' || key === 'Y') {
            if (app.currentView === 'settings-display') { actions.resetDisplaySettings(); e.preventDefault(); return; }
            if (app.currentView === 'settings-colors') { actions.deleteFocusedTheme(); e.preventDefault(); return; }
            if (app.currentView === 'game-library') { actions.deleteFocusedGame(); e.preventDefault(); return; }

            if (app.currentView === 'settings-core') {
                if (app.focusedIndex === 6) { actions.checkXeniaUpdates('win'); actions.playSound('select'); e.preventDefault(); return; }
                if (app.focusedIndex === 7) { actions.checkXeniaUpdates('linux'); actions.playSound('select'); e.preventDefault(); return; }
            }
        }
        
        if (key === 'Delete' || key === 'Backspace') {
            if (app.currentView === 'settings-colors' && key === 'Delete') {
                actions.deleteFocusedTheme();
                e.preventDefault();
                return;
            }
        }

        if (key === 'l' || key === 'L') {
            if (app.currentView === 'game-library') {
                e.preventDefault();
                actions.openGameConfig();
                return;
            }
        }

        if (key === 'x' || key === 'X' || key === ' ') {
            
            if (app.currentView === 'settings-colors' && app.colorPresets[app.focusedIndex].id === 'custom') {
                e.preventDefault();
                actions.saveNewCustomPreset();
                return;
            }
            
            if (app.currentView === 'game-library') {
                const hasPatches = app.focusedGamePatchInfo && 
                                   (app.focusedGamePatchInfo.fileName || 
                                   (app.focusedGamePatchInfo.availableFiles && app.focusedGamePatchInfo.availableFiles.length > 0));
                
                if (hasPatches) {
                    actions.playSound('select'); 
                    actions.openPatchManagerSmart(); 
                    e.preventDefault(); 
                    return;
                }
            }
            
            if (app.currentView === 'patches-manager') { e.preventDefault(); actions.saveAllPatches(); return; }
            if (app.currentView === 'settings-config') { e.preventDefault(); actions.saveXeniaConfig(); return; }
        }
        e.preventDefault(); 


        if (app.focusedCollection === 'colorPresets') {
             switch (key) {
                case 'ArrowUp': actions.moveFocus(-1); actions.previewTheme(app.focusedIndex); break;
                case 'ArrowDown': actions.moveFocus(1); actions.previewTheme(app.focusedIndex); break;
                case 'Enter': actions.saveThemeSelection(app.focusedIndex); break;
                case 'Escape': case 'Backspace': actions.goBack(); break;
            }
            return;
        }

        if (app.currentView === 'dashboard') {
                if (app.focusedList === 'master') {
                    switch (key) {
                        case 'ArrowUp': actions.moveMaster(-1); break;
                        case 'ArrowDown': actions.moveMaster(1); break;
                        case 'ArrowRight': case 'ArrowLeft': app.focusedList = 'detail'; actions.playSound('focus'); break;
                        case 'Enter': app.focusedList = 'detail'; actions.playSound('select'); break;
                    }
                } else if (app.focusedList === 'detail') {
                    switch (key) {
                        case 'ArrowLeft': actions.moveDetail(-1); break;
                        case 'ArrowRight': actions.moveDetail(1); break;
                        case 'Enter': actions.selectDetailItem(); break;
                        case 'Escape': case 'Backspace': app.focusedList = 'master'; actions.playSound('back'); break;
                        case 'ArrowUp': app.focusedList = 'master'; actions.moveMaster(-1); break;
                        case 'ArrowDown': app.focusedList = 'master'; actions.moveMaster(1); break;
                    }
                }
                return;
            }

        else if (app.currentView === 'settings-config') {
            if (app.configFocusedPanel === 'categories') {
                switch (key) {
                    case 'ArrowUp': actions.moveConfigCategory(-1); break;
                    case 'ArrowDown': actions.moveConfigCategory(1); break;
                    case 'ArrowRight': case 'Enter': app.configFocusedPanel = 'options'; actions.playSound('focus'); break;
                    case 'Escape': case 'Backspace': actions.goBack(); break;
                }
            } else {
                switch (key) {
                    case 'ArrowUp': actions.moveConfigOption(-1); break;
                    case 'ArrowDown': actions.moveConfigOption(1); break;
                    case 'Enter': actions.selectConfigOption(); break;
                    case 'ArrowLeft': case 'Escape': case 'Backspace': app.configFocusedPanel = 'categories'; actions.playSound('back'); break;
                }
            }
        } 
        else if (app.currentView === 'patches-manager') {
             if (app.configFocusedPanel === 'categories') {
                switch (key) {
                    case 'ArrowUp': actions.moveFocus(-1); break; 
                    case 'ArrowDown': actions.moveFocus(1); break; 
                    case 'ArrowRight': case 'Enter': actions.selectFocusedItem(); break;
                    case 'Escape': case 'Backspace': actions.goBack(); break;
                }
            }
        } 
        else {
            if (app.focusedCollection === 'coreSettingsItems' && key === 'Enter') {
                if (app.focusedIndex === 6) actions.downloadXenia('win');
                else if (app.focusedIndex === 7) actions.downloadXenia('linux');
                else if (app.focusedIndex === 8) actions.downloadPatches();
                else actions.selectFocusedItem();
                return;

            }

            const collection = app.focusedCollection;
            if (collection === 'gamesList' || collection === 'filteredLibraryGames') {
                switch (key) {
                    case 'ArrowLeft': actions.moveFocus(-1); break; 
                    case 'ArrowRight': actions.moveFocus(1); break; 
                    case 'Enter': actions.selectFocusedItem(); break;
                    case 'Escape': case 'Backspace': actions.goBack(); break;
                }
            } else {
                switch (key) {
                    case 'ArrowUp': actions.moveFocus(-1); break;
                    case 'ArrowDown': actions.moveFocus(1); break;
                    case 'Enter': actions.selectFocusedItem(); break;
                    case 'Escape': case 'Backspace': actions.goBack(); break;
                }
            }
        }
    });

    async function initializeApp() {
        console.log('[Debug Core.js] 1. Initializing App...');
        await Alpine.store('actions').loadLocales();
        await Alpine.store('actions').loadUserConfig();
        await Alpine.store('actions').loadDisplaySettings();
        await Alpine.store('actions').loadUserColors();
        await Alpine.store('actions').refreshProfileData();
        await Alpine.store('actions').loadUserSounds();
        await Alpine.store('actions').checkAbgxTool();
        await Alpine.store('actions').verifyAbgxTool();

        window.electronAPI.onWindowBlur(() => {
            Alpine.store('actions').manageBGM('pause');
            if (app.activeSoundElement) {
                app.activeSoundElement.pause();
                app.activeSoundElement.currentTime = 0;
            }

            if (keyRepeatTimers.x.delay) clearTimeout(keyRepeatTimers.x.delay);
            if (keyRepeatTimers.x.interval) clearInterval(keyRepeatTimers.x.interval);
            if (keyRepeatTimers.y.delay) clearTimeout(keyRepeatTimers.y.delay);
            if (keyRepeatTimers.y.interval) clearInterval(keyRepeatTimers.y.interval);

            keyRepeatTimers.x = { delay: null, interval: null };
            keyRepeatTimers.y = { delay: null, interval: null };

            app.isControllerLocked = true;
            setTimeout(() => { app.isControllerLocked = false; }, 150);
        });

        window.electronAPI.onWindowFocus(() => {
            Alpine.store('actions').manageBGM('play');
        });

        window.electronAPI.onGameStarted(() => {
            app.isGameRunning = true;
            Alpine.store('actions').manageBGM('pause');
            if (app.activeSoundElement) {
                app.activeSoundElement.pause();
                app.activeSoundElement.currentTime = 0;
            }
        });

        window.electronAPI.onGameStopped(() => {
            app.isGameRunning = false;
            Alpine.store('actions').manageBGM('play');
        });

        setInterval(() => {
        const app = Alpine.store('app');
        app.systemTime = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        }, 1000);
        
        console.log('[Debug Core.js] 2. User config loaded.');
        let savedTheme = await window.electronAPI.get('currentTheme');
        if (savedTheme === null || savedTheme === undefined || savedTheme === '') {
            savedTheme = 'NXE-2008'; 
            await window.electronAPI.set('currentTheme', savedTheme); 
        }
        const app = Alpine.store('app');
        app.currentTheme = savedTheme;
        const themeStylesheet = document.getElementById('theme-stylesheet');
        themeStylesheet.href = `themes/${savedTheme}/style.css`;

        setTimeout(async () => {
            await Alpine.store('actions').scanForGames(true);
        }, 1000);
        
        window.electronAPI.onArtUpdated(() => { 
            const app = Alpine.store('app');
            if (app.currentView === 'game-library') {
                Alpine.store('actions').loadGameLibraryData();
            }
        });
        
        window.electronAPI.onDownloadProgress((data) => {
            const app = Alpine.store('app');


            if (data.type && app.downloadStatuses && app.downloadStatuses[data.type]) {
                app.downloadStatuses[data.type] = data;
            } 
            else {
                console.warn("Received progress without type or invalid type:", data);
            }
        });
        
        window.electronAPI.onControllerReEnabled(() => {
            console.log("[Controller] Re-enabling with cooldown...");
            
            Alpine.store('app').isControllerLocked = true;
            
            Object.values(keyRepeatTimers.x).forEach(clearTimeout);
            Object.values(keyRepeatTimers.y).forEach(clearTimeout);
            keyRepeatTimers = { x: { delay: null, interval: null }, y: { delay: null, interval: null } };
            

            setTimeout(() => {
                Alpine.store('app').isControllerLocked = false;
                console.log("[Controller] Unlocked and ready.");
            }, 800); 
        });

        const REPEAT_DELAY = 400;
        const REPEAT_INTERVAL = 150;

const getMoveAction = (axis, value) => {
    const actions = Alpine.store('actions');
    const app = Alpine.store('app');
    return () => {
        if (axis === 'x') {
            if (value === 1) {
                if (app.focusedList === 'master') { app.focusedList = 'detail'; actions.playSound('focus'); }
                else if (app.focusedList === 'detail') actions.moveDetail(1);
                else if (app.currentView === 'game-library') actions.moveFocus(1);
                else if (app.currentView === 'settings-config' && app.configFocusedPanel === 'categories') { app.configFocusedPanel = 'options'; actions.playSound('focus'); }
                else if (app.currentView === 'patches-manager' && app.configFocusedPanel === 'categories') { actions.selectFocusedItem(); }
            } else if (value === -1) {
                if (app.focusedList === 'detail') actions.moveDetail(-1);
                else if (app.focusedList === 'master') { app.focusedList = 'detail'; actions.playSound('focus'); }
                
                else if (app.currentView === 'game-library') actions.moveFocus(-1);
                else if (app.currentView === 'settings-config' && app.configFocusedPanel === 'options') { app.configFocusedPanel = 'categories'; actions.playSound('back'); }
            }
        } else if (axis === 'y') {
            if (value === 1) {
                if (app.focusedCollection === 'colorPresets') { actions.moveFocus(1); actions.previewTheme(app.focusedIndex); }
                else if (app.focusedList === 'master') actions.moveMaster(1);
                else if (app.focusedList === 'detail') { app.focusedList = 'master'; actions.moveMaster(1); } 
                else if (app.currentView === 'settings-config') app.configFocusedPanel === 'categories' ? actions.moveConfigCategory(1) : actions.moveConfigOption(1);
                else if (app.focusedCollection) actions.moveFocus(1);
            } else if (value === -1) {
                if (app.focusedCollection === 'colorPresets') { actions.moveFocus(-1); actions.previewTheme(app.focusedIndex); }
                else if (app.focusedList === 'master') actions.moveMaster(-1);
                else if (app.focusedList === 'detail') { app.focusedList = 'master'; actions.moveMaster(-1); }
                else if (app.currentView === 'settings-config') app.configFocusedPanel === 'categories' ? actions.moveConfigCategory(-1) : actions.moveConfigOption(-1);
                else if (app.focusedCollection) actions.moveFocus(-1);
            }
        }
    };
};

        const stopRepeat = (axis) => {
            if (keyRepeatTimers[axis].delay) clearTimeout(keyRepeatTimers[axis].delay);
            if (keyRepeatTimers[axis].interval) clearInterval(keyRepeatTimers[axis].interval);
            keyRepeatTimers[axis] = { delay: null, interval: null };
        };

        window.electronAPI.onGamepadInput((message) => {
            const actions = Alpine.store('actions');
            const app = Alpine.store('app');

            if (message.event === 'button_left_thumb' && message.value === 1) {
                if (app.currentView === 'game-library' && !app.isKeyboardOpen) {
                    const game = app.filteredLibraryGames[app.focusedIndex];
                    if (game && game.fileName.toLowerCase().endsWith('.zar') && !game.titleID) {
                        actions.performZarScan();
                        return;
                    }
                }
            }


            if (message.event === 'right_trigger') {
                if (message.value > 0.8 && !app.rtLock) {
                    if (app.currentView === 'game-library' && !app.isArtManagerOpen && !app.isGuideOpen && !app.isKeyboardOpen) {
                        app.rtLock = true;
                        actions.openArtManager();
                    }
                } 
                
                else if (message.value < 0.1) {
                    app.rtLock = false; 
                }
            }

            if (app.isArtManagerOpen) {
                if (message.event === 'button_b' && message.value === 1) {
                    actions.closeArtManager();
                }
                
                if (message.value === 1) {
                    if (message.event === 'button_left_bumper')  actions.changeArtTab(-1);
                    if (message.event === 'button_right_bumper') actions.changeArtTab(1);
                }

                if (message.event === 'dpad_y' && message.value !== 0) {
                    if (!app.dpad_lock) { 
                        actions.moveArtGridFocus(message.value, 0);
                        app.dpad_lock = true; 
                        setTimeout(() => app.dpad_lock = false, 200); 
                    }
                }
                if (message.event === 'dpad_x' && message.value !== 0) {
                    if (!app.dpad_lock) {
                        actions.moveArtGridFocus(0, message.value);
                        app.dpad_lock = true;
                        setTimeout(() => app.dpad_lock = false, 200);
                    }
                }
                
                if (message.event === 'left_stick_y' && Math.abs(message.value) > 0.5) {
                    if(!app.stick_lock_art) {
                        actions.moveArtGridFocus(message.value > 0 ? 1 : -1, 0);
                        app.stick_lock_art = true; setTimeout(() => app.stick_lock_art = false, 200);
                    }
                }
                if (message.event === 'left_stick_x' && Math.abs(message.value) > 0.5) {
                    if(!app.stick_lock_art) {
                        actions.moveArtGridFocus(0, message.value > 0 ? 1 : -1);
                        app.stick_lock_art = true; setTimeout(() => app.stick_lock_art = false, 200);
                    }
                }

                if (message.value === 1) {
                    if (message.event === 'button_a') {
                        const asset = app.artManagerData.assets[app.artManagerData.focusedAssetIndex];
                        if (asset) actions.applyArtAsset(asset.full, false);
                    }
                    if (message.event === 'button_x') actions.browseLocalArtAsset();
                }

                return;
            }
            if (message.event === 'button_right_bumper' && message.value === 1) {
                

                if (app.currentView === 'game-library' && !app.isKeyboardOpen) {
                    
                    app.showGameInfoOverlay = !app.showGameInfoOverlay;
                    actions.playSound('focus');
                    console.log(`[Input] RB Pressed. Show Info: ${app.showGameInfoOverlay}`);
                    return; 
                }
                
            }
            if (message.event === 'left_trigger') {
                const app = Alpine.store('app');
                
                if (message.value > 0.8 && !app.ltLock) {
                    if (app.showGameInfoOverlay && !app.isKeyboardOpen) {
                        app.ltLock = true;
                        actions.handleTranslationClick();
                        console.log(`[Input] LT Pressed. Executing Translation Toggle.`);
                    }
                } 
                else if (message.value < 0.1) {
                    app.ltLock = false;
                }
            }
            

            if (message.event === 'button_left_bumper') {
                app.isLbPressed = (message.value === 1);

                if (message.value === 1) {
                    if (app.currentView === 'game-library' && !app.isKeyboardOpen) {
                        setTimeout(() => {
                            if (!app.isGuideOpen && !app.inputLocked) {
                                actions.openGameConfig();
                            }
                        }, 250);
                    }
                }

            }


            if (message.event === 'button_left_bumper') {
                app.isLbPressed = (message.value === 1);
            }

            if (message.event === 'button_start' && message.value === 1) {
                

                if (app.isLbPressed) {
                    console.log("Combo Activated: LB + Start -> Opening Guide");
                    actions.toggleGuide();
                    

                    app.inputLocked = true;
                    setTimeout(() => app.inputLocked = false, 300);
                    return;
                }


                if (app.isProfileSelectorOpen && !app.isCreatingProfile && !app.isRenamingProfile) {
                    actions.startRenameProfilePrompt();
                    return;
                }


                if (app.isKeyboardOpen && app.keyboardMode === 'rename') {
                    actions.handleKeyboardSpecial('DONE'); 
                    return;
                }


                if (app.currentView === 'game-library' && !app.isKeyboardOpen && !app.isGuideOpen) {
                    actions.startRename();
                    return;
                }


                return;
            }

            if (message.event.startsWith('button_') && message.value === 0) return;

            if (app.isControllerLocked || app.isPageTransitioning || app.inputLocked) return;


            if ((app.currentView === 'game-library') && message.event === 'button_right_thumb') {
                actions.toggleKeyboard();
                return; 
            }

            if (app.isKeyboardOpen) {
                
                if (message.event === 'dpad_y' && message.value !== 0) actions.moveKeyboardFocus(message.value, 0);
                else if (message.event === 'dpad_x' && message.value !== 0) actions.moveKeyboardFocus(0, message.value);
                
                else if (message.event === 'left_stick_y' && Math.abs(message.value) > 0.5) {
                     if(!app.stick_lock) { 
                         actions.moveKeyboardFocus(message.value > 0 ? 1 : -1, 0); 
                         app.stick_lock=true; setTimeout(()=>app.stick_lock=false, 150); 
                     }
                }
                else if (message.event === 'left_stick_x' && Math.abs(message.value) > 0.5) {
                     if(!app.stick_lock) { 
                         actions.moveKeyboardFocus(0, message.value > 0 ? 1 : -1); 
                         app.stick_lock=true; setTimeout(()=>app.stick_lock=false, 150); 
                     }
                }

                else if (message.event === 'button_a') actions.pressKeyboardKey();
                else if (message.event === 'button_x') actions.handleKeyboardSpecial('BACKSPACE');
                else if (message.event === 'button_y') actions.handleKeyboardSpecial('SPACE');
                else if (message.event === 'button_b') actions.toggleKeyboard();
                
                else if (message.event === 'button_start') actions.handleKeyboardSpecial('DONE');
                
                else if (message.event === 'button_left_thumb') actions.handleKeyboardSpecial('CAPS');
                
                else if (message.event === 'button_left_bumper') {
                    actions.moveTextCursor(-1); 
                }
                else if (message.event === 'button_right_bumper') {
                    actions.moveTextCursor(1); 
                }

                else if (message.event === 'left_trigger' && message.value > 0.5) {
                    if(!app.trig_lock) { 
                        actions.handleKeyboardSpecial('SYMBOLS'); 
                        app.trig_lock=true; setTimeout(()=>app.trig_lock=false, 300); 
                    }
                }
                
                else if (message.event === 'right_trigger' && message.value > 0.5) {
                    if(!app.trig_lock) { 
                        actions.handleKeyboardSpecial('ACCENTS'); 
                        app.trig_lock=true; setTimeout(()=>app.trig_lock=false, 300); 
                    }
                }

                return; 
            }

            if (message.event === 'button_guide') {
                actions.toggleGuide();
                app.inputLocked = true;
                setTimeout(() => app.inputLocked = false, 300); 
                return;
            }

            if (app.isGuideOpen) {
                let actionTaken = false;

                if (message.event === 'dpad_y') {
                    if (message.value !== 0) {
                        actions.moveGuideMenu(message.value); 
                        actionTaken = true;
                    }
                } 
                else if (message.event === 'dpad_x') {
                    if (message.value !== 0) {
                        actions.moveGuideTab(message.value);
                        actionTaken = true;
                    }
                }
                // 
                else if (message.event === 'button_a') {
                    actions.executeGuideAction();
                    actionTaken = true;
                }
                else if (message.event === 'button_b') {
                    actions.toggleGuide(); 
                    actionTaken = true;
                }

                if (actionTaken) {
                    app.inputLocked = true;
                    setTimeout(() => app.inputLocked = false, 150); 
                }
                return; 
            }

        
            if (app.currentView === 'achievements' && !app.isGuideOpen) {

                if (app.isAchievementOverlayOpen) {

                    if (message.event === 'button_b' && message.value === 1) {
                        actions.closeAchievementOverlay();
                        return;
                    }

                    if (message.event === 'dpad_y' && message.value !== 0) {
                        actions.moveAchievementGridFocus(message.value, 0); 
                    }
                    if (message.event === 'dpad_x' && message.value !== 0) {
                        actions.moveAchievementGridFocus(0, message.value); 
                    }
                    
                    return;
                }

                
                if (!app.isAchievementOverlayOpen) {
                    
                    if (message.event === 'button_a' && message.value === 1) {
                        actions.openAchievementOverlay();
                        return;
                    }

                    if (message.event === 'dpad_x' && message.value !== 0) {
                        actions.moveFocus(message.value);
                        return;
                    }

                    if ((message.event === 'button_y' || message.event === 'Y') && message.value !== 0) {
                        actions.refreshCurrentGame();
                        return;
                    }
                }
            }

            if (app.isProfileSelectorOpen) {
                if (app.isCreatingProfile) {
                    if (message.event === 'button_b' && message.value === 1) {
                        actions.cancelCreateProfile();
                    } 
                    else if ((message.event === 'button_a' || message.event === 'button_start') && message.value === 1) {
                        actions.submitNewProfile();
                    }
                    return;
                }

                if (app.isRenamingProfile) {
                    if (message.event === 'button_b' && message.value === 1) {
                        actions.cancelRenameProfile();
                    } 
                    else if ((message.event === 'button_a' || message.event === 'button_start') && message.value === 1) {
                        actions.submitProfileRename();
                    }
                    return;
                }


                if (message.event === 'dpad_y' && message.value !== 0) {
                    actions.moveProfileFocus(message.value); 
                }
                
                else if (message.event === 'button_a' && message.value === 1) {
                    const selectedProfile = app.profilesList[app.focusedProfileIndex];
                    if (app.focusedProfileIndex === app.profilesList.length) {
                        actions.createNewProfilePrompt();
                    } 
                    else if (selectedProfile) {
                        actions.switchActiveProfile(selectedProfile.slot);
                    }
                }
                else if (message.event === 'button_y' && message.value === 1) {
                    actions.createNewProfilePrompt();
                }
                else if (message.event === 'button_x' && message.value === 1) {
                    actions.changeFocusedProfileAvatar();
                }
                else if (message.event === 'button_b' && message.value === 1) {
                    app.isProfileSelectorOpen = false;
                    actions.playSound('back');
                }

                else if (message.event === 'button_start' && message.value === 1) {
                    actions.startRenameProfilePrompt();
                }
                
                return;
            }


            if (app.isPatchSelectorOpen) {
                if (message.event === 'dpad_y') {
                    if (message.value === -1 && app.patchSelectorIndex > 0) {
                        app.patchSelectorIndex--;
                        actions.playSound('focus');
                    } else if (message.value === 1 && app.patchSelectorIndex < app.patchSelectorFiles.length - 1) {
                        app.patchSelectorIndex++;
                        actions.playSound('focus');
                    }
                } 
                else if (message.event === 'button_a') {
                    actions.selectPatchFileAndOpen();
                } 
                else if (message.event === 'button_b' || message.event === 'button_x') {
                    app.isPatchSelectorOpen = false;
                    actions.playSound('back');
                }
                
                return;
            }
            
            if (app.isControllerLocked || app.isPageTransitioning) return;
            
            
             if (message.event === 'button_back') {
                if (app.currentView === 'game-library') {
                    const game = app.filteredLibraryGames[app.focusedIndex];
                    
                    if (game && !game.titleID) {
                        actions.performDeepScan();
                        return;
                    }
                }
            }

            
            if (app.currentView === 'settings-audio') {
                const item = app.audioMenu[app.focusedIndex];

                
                if (item.type === 'slider') {
                    const isBgm = (item.id === 'bgmVolume');
                    
                    const dirMultiplier = app.language === 'ar' ? -1 : 1;

                    
                    if (message.event === 'dpad_x') {
                        if (message.value !== 0) {
                            const val = message.value * dirMultiplier;
                            
                            if (isBgm) actions.updateMusicVolume(val);
                            else actions.updateMasterVolume(val);
                        }
                        return;
                    }
                }

                if (message.event === 'button_a') {
                    if (item.type === 'file') {
                        actions.changeSoundEffect();
                    } else if (item.type === 'slider') {
                        actions.playSound('select'); 
                    }
                    return;
                }

                if (message.event === 'button_y') {
                    actions.resetSoundSettings();
                    return;
                }

                if (message.event === 'button_b') {
                    actions.goBack();
                    return;
                }

                if (message.event === 'dpad_y') {
                    if (message.value !== 0) actions.moveFocus(message.value);
                    return;
                }
                if (message.event === 'left_stick_y' && Math.abs(message.value) > 0.5) {
                    if (!app.stick_lock) {
                        actions.moveFocus(message.value > 0 ? 1 : -1);
                        app.stick_lock = true;
                        setTimeout(() => app.stick_lock = false, 150);
                    }
                    return;
                }
                
                return;
            }

            switch(message.event) {
                case 'dpad_x':
                case 'dpad_y':
                    const axis = (message.event === 'dpad_x') ? 'x' : 'y';
                    const value = message.value;
                    stopRepeat(axis);
                    if (value !== 0) {
                        const moveAction = getMoveAction(axis, value);
                        moveAction();
                        keyRepeatTimers[axis].delay = setTimeout(() => {
                            keyRepeatTimers[axis].interval = setInterval(() => {
                                moveAction();
                            }, REPEAT_INTERVAL);
                        }, REPEAT_DELAY);
                    }
                    break;

                case 'button_a':

                    if (app.focusedCollection === 'coreSettingsItems') {
                        if (app.focusedIndex === 6) { actions.downloadXenia('win'); return; }
                        if (app.focusedIndex === 7) { actions.downloadXenia('linux'); return; }
                        if (app.focusedIndex === 8) { actions.downloadPatches(); return; }
                    }

                    if (app.focusedList === 'master') { app.focusedList = 'detail'; actions.playSound('select'); }
                    else if (app.focusedList === 'detail') actions.selectDetailItem();
                    else if (app.currentView === 'settings-config' && app.configFocusedPanel === 'categories') { app.configFocusedPanel = 'options'; actions.playSound('focus'); }
                    else if (app.currentView === 'settings-config' && app.configFocusedPanel === 'options') actions.selectConfigOption();
                    else if (app.focusedCollection) actions.selectFocusedItem();
                    break;

                case 'button_b':
                    if (app.focusedList === 'detail') { app.focusedList = 'master'; actions.playSound('back'); }
                    else if (app.currentView === 'settings-config' && app.configFocusedPanel === 'options') { app.configFocusedPanel = 'categories'; actions.playSound('back'); }
                    else if (app.viewStack.length > 0) actions.goBack();
                    break;
                
                case 'button_x': 
                    if (app.currentView === 'settings-colors' && app.colorPresets[app.focusedIndex].id === 'custom') {
                        actions.saveNewCustomPreset();
                    }

                    

                    else if (app.currentView === 'game-library') {
                        const hasPatches = app.focusedGamePatchInfo && 
                                           (app.focusedGamePatchInfo.fileName || 
                                           (app.focusedGamePatchInfo.availableFiles && app.focusedGamePatchInfo.availableFiles.length > 0));

                        if (hasPatches) {
                            actions.playSound('select');
                            actions.openPatchManagerSmart(); 
                        }
                    }

                    else if (app.currentView === 'patches-manager') {
                        actions.saveAllPatches();
                    } 
                    else if (app.currentView === 'settings-config') {
                        actions.saveXeniaConfig();
                    }
                    break;

                case 'button_y':
                    if (app.currentView === 'dashboard') {
                        actions.changeUserAvatar();
                    }
                    else if (app.currentView === 'settings-display') {
                        actions.resetDisplaySettings();
                    }
                    else if (app.currentView === 'settings-colors') {
                        actions.deleteFocusedTheme();
                    }
                    else if (app.currentView === 'game-library') {
                        actions.deleteFocusedGame();
                    }
                    else if (app.currentView === 'settings-core') {
                        if (app.focusedIndex === 6) { 
                            actions.checkXeniaUpdates('win');
                            actions.playSound('select');
                        }
                        else if (app.focusedIndex === 7) { 
                            actions.checkXeniaUpdates('linux');
                            actions.playSound('select');
                        }
                    }
                    break;
            }
        });

        console.log(`[Debug Core.js] 4. Loading first view: 'dashboard'`);
        const result = await window.electronAPI.loadLayout('dashboard');
        app.currentViewHTML = result.html;
        await Alpine.store('actions').loadDashboardData();
        console.log('[Debug Core.js] 6. Initialization complete.');
        
    }

    

    initializeApp();
});
