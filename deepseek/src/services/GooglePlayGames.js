// ============================================
// Google Play Games Services Integration
// ============================================

export class GooglePlayGames {
    constructor() {
        this.isSignedIn = false;
        this.playerInfo = null;
        this.achievements = new Map();
        this.leaderboards = new Map();
        this.savedGames = null;

        // Konfigurace
        this.config = {
            clientId: 'YOUR_CLIENT_ID.apps.googleusercontent.com',
            achievementIds: {
                firstSteps: 'achievement_first_steps',
                masterHerbalist: 'achievement_master_herbalist',
                animalWhisperer: 'achievement_animal_whisperer',
                nightOwl: 'achievement_night_owl',
                masterBrewer: 'achievement_master_brewer',
                collector: 'achievement_plant_collector',
                explorer: 'achievement_meadow_explorer',
                friendOfNature: 'achievement_friend_of_nature'
            },
            leaderboardIds: {
                plantsDiscovered: 'leaderboard_plants_discovered',
                questsCompleted: 'leaderboard_quests_completed',
                minigameScores: 'leaderboard_minigame_scores',
                totalPlayTime: 'leaderboard_total_play_time'
            }
        };
    }

    async init() {
        console.log('🎮 Inicializace Google Play Games');

        // Kontrola dostupnosti
        if (!this.isAvailable()) {
            console.log('📱 Google Play Games není k dispozici');
            return;
        }

        // Načtení Google Play Games API
        await this.loadGooglePlayGamesScript();

        // Inicializace klienta
        await this.initializeClient();

        // Tiché přihlášení
        await this.silentSignIn();
    }

    isAvailable() {
        // Google Play Games funguje pouze v:
        // 1. Android WebView s Google Play Services
        // 2. Chrome na Androidu
        // 3. Některé Chrome OS zařízení
        const isAndroid = /Android/i.test(navigator.userAgent);
        const hasPlayServices = typeof window.google?.play?.games !== 'undefined';

        return isAndroid && hasPlayServices;
    }

    async loadGooglePlayGamesScript() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://apis.google.com/js/platform.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    async initializeClient() {
        try {
            await new Promise((resolve) => {
                window.gapi.load('auth2', () => {
                    window.gapi.auth2.init({
                        client_id: this.config.clientId,
                        scope: 'profile email https://www.googleapis.com/auth/games'
                    }).then(resolve);
                });
            });
            console.log('✅ Google Play Games klient inicializován');
        } catch (error) {
            console.error('❌ Inicializace selhala:', error);
        }
    }

    async silentSignIn() {
        try {
            const auth2 = window.gapi.auth2.getAuthInstance();
            const user = await auth2.signIn({ prompt: 'none' });

            if (user) {
                await this.onSignIn(user);
            }
        } catch (error) {
            console.log('🔒 Tiché přihlášení selhalo - uživatel se musí přihlásit ručně');
        }
    }

    async signIn() {
        try {
            const auth2 = window.gapi.auth2.getAuthInstance();
            const user = await auth2.signIn();
            await this.onSignIn(user);

            this.showSignedInUI();
        } catch (error) {
            console.error('❌ Přihlášení selhalo:', error);
            this.showSignInError();
        }
    }

    async onSignIn(user) {
        this.isSignedIn = true;

        const profile = user.getBasicProfile();
        this.playerInfo = {
            id: user.getId(),
            name: profile.getName(),
            email: profile.getEmail(),
            avatarUrl: profile.getImageUrl(),
            token: user.getAuthResponse().id_token
        };

        console.log('👤 Přihlášen:', this.playerInfo.name);

        // Načtení achievementů a leaderboardů
        await this.loadPlayerData();

        // Event pro aplikaci
        window.dispatchEvent(new CustomEvent('gpg-signin', {
            detail: this.playerInfo
        }));
    }

    async signOut() {
        const auth2 = window.gapi.auth2.getAuthInstance();
        await auth2.signOut();

        this.isSignedIn = false;
        this.playerInfo = null;

        window.dispatchEvent(new CustomEvent('gpg-signout'));
    }

    async loadPlayerData() {
        // Načtení achievementů
        await this.loadAchievements();

        // Načtení saved games
        await this.loadSavedGames();
    }

    // === ACHIEVEMENTY ===
    async unlockAchievement(achievementKey) {
        if (!this.isSignedIn) {
            console.log('⚠️ Nelze odemknout achievement - uživatel není přihlášen');
            this.queueAchievement(achievementKey);
            return;
        }

        const achievementId = this.config.achievementIds[achievementKey];
        if (!achievementId) {
            console.error('❌ Neznámý achievement:', achievementKey);
            return;
        }

        try {
            // Google Play Games API call
            await this.callGamesAPI('achievements.unlock', {
                achievementId: achievementId
            });

            console.log('🏆 Achievement odemčen:', achievementKey);

            // Lokální UI notifikace
            this.showAchievementPopup(achievementKey);

            // Analytics
            this.trackEvent('achievement_unlocked', {
                achievement: achievementKey
            });
        } catch (error) {
            console.error('❌ Odemčení achievementu selhalo:', error);
            this.queueAchievement(achievementKey);
        }
    }

    async incrementAchievement(achievementKey, steps = 1) {
        if (!this.isSignedIn) return;

        const achievementId = this.config.achievementIds[achievementKey];
        if (!achievementId) return;

        try {
            await this.callGamesAPI('achievements.increment', {
                achievementId: achievementId,
                stepsToIncrement: steps
            });
        } catch (error) {
            console.error('❌ Inkrementace achievementu selhala:', error);
        }
    }

    async revealAchievement(achievementKey) {
        if (!this.isSignedIn) return;

        const achievementId = this.config.achievementIds[achievementKey];
        if (!achievementId) return;

        try {
            await this.callGamesAPI('achievements.reveal', {
                achievementId: achievementId
            });
        } catch (error) {
            console.error('❌ Odhalení achievementu selhalo:', error);
        }
    }

    async loadAchievements() {
        try {
            const response = await this.callGamesAPI('achievements.list', {});

            response.items.forEach(achievement => {
                this.achievements.set(achievement.id, achievement);
            });

            console.log('📊 Načteno achievementů:', this.achievements.size);
        } catch (error) {
            console.error('❌ Načtení achievementů selhalo:', error);
        }
    }

    showAchievementsUI() {
        if (!this.isSignedIn) {
            this.signIn();
            return;
        }

        // Otevření nativního UI achievementů
        this.callGamesAPI('achievements.show', {});
    }

    // === LEADERBOARDY ===
    async submitScore(leaderboardKey, score) {
        if (!this.isSignedIn) return;

        const leaderboardId = this.config.leaderboardIds[leaderboardKey];
        if (!leaderboardId) return;

        try {
            await this.callGamesAPI('leaderboards.submit', {
                leaderboardId: leaderboardId,
                score: score
            });

            console.log('📈 Score odesláno:', leaderboardKey, score);
        } catch (error) {
            console.error('❌ Odeslání score selhalo:', error);
            this.queueScore(leaderboardKey, score);
        }
    }

    showLeaderboardUI(leaderboardKey = null) {
        if (!this.isSignedIn) {
            this.signIn();
            return;
        }

        const params = {};
        if (leaderboardKey) {
            params.leaderboardId = this.config.leaderboardIds[leaderboardKey];
        }

        this.callGamesAPI('leaderboards.show', params);
    }

    showAllLeaderboardsUI() {
        this.callGamesAPI('leaderboards.showAll', {});
    }

    // === SAVED GAMES (Cloud Save) ===
    async saveGame(slotName, data) {
        if (!this.isSignedIn) return;

        try {
            const snapshot = await this.callGamesAPI('snapshots.open', {
                fileName: slotName
            });

            await this.callGamesAPI('snapshots.save', {
                snapshot: snapshot,
                data: JSON.stringify(data),
                description: `Uloženo ${new Date().toLocaleString('cs')}`
            });

            console.log('☁️ Hra uložena do cloudu:', slotName);
        } catch (error) {
            console.error('❌ Uložení selhalo:', error);
        }
    }

    async loadGame(slotName) {
        if (!this.isSignedIn) return null;

        try {
            const snapshot = await this.callGamesAPI('snapshots.open', {
                fileName: slotName
            });

            const data = JSON.parse(snapshot.data);
            console.log('☁️ Hra načtena z cloudu:', slotName);
            return data;
        } catch (error) {
            console.error('❌ Načtení selhalo:', error);
            return null;
        }
    }

    async listSavedGames() {
        if (!this.isSignedIn) return [];

        try {
            const response = await this.callGamesAPI('snapshots.list', {});
            return response.items || [];
        } catch (error) {
            console.error('❌ Seznam uložených her selhal:', error);
            return [];
        }
    }

    // === QUESTS ===
    async acceptQuest(questId) {
        if (!this.isSignedIn) return;

        try {
            await this.callGamesAPI('quests.accept', {
                questId: questId
            });
        } catch (error) {
            console.error('❌ Přijetí questu selhalo:', error);
        }
    }

    async completeQuest(questId) {
        if (!this.isSignedIn) return;

        try {
            await this.callGamesAPI('quests.claim', {
                questId: questId
            });
        } catch (error) {
            console.error('❌ Dokončení questu selhalo:', error);
        }
    }

    // === EVENTS ===
    async submitEvent(eventId, value) {
        if (!this.isSignedIn) return;

        try {
            await this.callGamesAPI('events.record', {
                eventId: eventId,
                value: value
            });
        } catch (error) {
            console.error('❌ Odeslání eventu selhalo:', error);
        }
    }

    // === POMOCNÉ FUNKCE ===
    async callGamesAPI(method, params) {
        return new Promise((resolve, reject) => {
            window.gapi.client.request({
                path: `https://games.googleapis.com/games/v1/${method}`,
                method: params.data ? 'POST' : 'GET',
                params: params,
                body: params.data
            }).then(
                (response) => resolve(response.result),
                (error) => reject(error)
            );
        });
    }

    queueAchievement(achievementKey) {
        // Uložení achievementu pro pozdější synchronizaci
        const queue = JSON.parse(localStorage.getItem('gpg_achievement_queue') || '[]');
        queue.push(achievementKey);
        localStorage.setItem('gpg_achievement_queue', JSON.stringify(queue));
    }

    queueScore(leaderboardKey, score) {
        // Uložení score pro pozdější synchronizaci
        const queue = JSON.parse(localStorage.getItem('gpg_score_queue') || '[]');
        queue.push({ leaderboard: leaderboardKey, score: score, timestamp: Date.now() });
        localStorage.setItem('gpg_score_queue', JSON.stringify(queue));
    }

    async syncQueuedData() {
        if (!this.isSignedIn) return;

        // Synchronizace achievementů
        const achievementQueue = JSON.parse(localStorage.getItem('gpg_achievement_queue') || '[]');
        for (const achievement of achievementQueue) {
            await this.unlockAchievement(achievement);
        }
        localStorage.removeItem('gpg_achievement_queue');

        // Synchronizace scores
        const scoreQueue = JSON.parse(localStorage.getItem('gpg_score_queue') || '[]');
        for (const item of scoreQueue) {
            await this.submitScore(item.leaderboard, item.score);
        }
        localStorage.removeItem('gpg_score_queue');
    }

    showAchievementPopup(achievementKey) {
        // Vlastní animované UI pro achievement
        const popup = document.createElement('div');
        popup.className = 'gpg-achievement-popup';
        popup.innerHTML = `
            <div class="achievement-icon">🏆</div>
            <div class="achievement-text">
                <div class="achievement-title">Achievement odemčen!</div>
                <div class="achievement-name">${this.getAchievementName(achievementKey)}</div>
            </div>
        `;

        document.body.appendChild(popup);

        // Animace
        requestAnimationFrame(() => {
            popup.classList.add('show');
        });

        // Automatické skrytí
        setTimeout(() => {
            popup.classList.remove('show');
            setTimeout(() => popup.remove(), 500);
        }, 4000);
    }

    getAchievementName(key) {
        const names = {
            firstSteps: 'První kroky na louce',
            masterHerbalist: 'Mistr bylinkář',
            animalWhisperer: 'Zaříkávač zvířat',
            nightOwl: 'Noční průzkumník',
            masterBrewer: 'Mistr lektvarů',
            collector: 'Sběratel rostlin',
            explorer: 'Objevitel louky',
            friendOfNature: 'Přítel přírody'
        };
        return names[key] || key;
    }

    showSignedInUI() {
        // Zobrazení UI pro přihlášeného uživatele
        const userUI = document.createElement('div');
        userUI.className = 'gpg-user-info';
        userUI.innerHTML = `
            <img src="${this.playerInfo.avatarUrl}" alt="Avatar" class="gpg-avatar">
            <span class="gpg-username">${this.playerInfo.name}</span>
            <button class="gpg-signout-btn" onclick="window.loukaGame.getService('googlePlay').signOut()">
                Odhlásit
            </button>
        `;

        const container = document.getElementById('gpg-container');
        if (container) {
            container.innerHTML = '';
            container.appendChild(userUI);
        }
    }

    showSignInError() {
        alert('Přihlášení se nezdařilo. Zkontrolujte své připojení a Google Play Games.');
    }

    trackEvent(eventName, data) {
        if (window.gtag) {
            window.gtag('event', eventName, data);
        }
    }

    // Veřejné API pro ostatní části hry
    getPlayerLevel() {
        // Získání levelu hráče z Play Games
        return this.playerInfo?.level || 1;
    }

    getPlayerXP() {
        return this.playerInfo?.xp || 0;
    }

    isPlayerSignedIn() {
        return this.isSignedIn;
    }

    getPlayerInfo() {
        return this.playerInfo;
    }
}
