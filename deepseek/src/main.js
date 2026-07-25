// ============================================
// 🌿 AAA LOUKA - Hlavní herní engine
// Phaser 3 implementace s WebGL shadery
// ============================================

import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { MenuScene } from './scenes/MenuScene';
import { CharacterCreationScene } from './scenes/CharacterCreationScene';
import { GameScene } from './scenes/GameScene';
import { HerbarScene } from './scenes/HerbarScene';
import { MinigameScene } from './scenes/MinigameScene';
import { CutsceneScene } from './scenes/CutsceneScene';
import { UIScene } from './scenes/UIScene';
import { WebGLPipeline } from './shaders/WebGLPipeline';
import { GooglePlayGames } from './services/GooglePlayGames';
import { PWAManager } from './services/PWAManager';

// Konfigurace hry
const config = {
    type: Phaser.WEBGL,
    width: 1920,
    height: 1080,
    parent: 'game-container',
    backgroundColor: '#87CEEB',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        min: {
            width: 320,
            height: 480
        },
        max: {
            width: 3840,
            height: 2160
        }
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    render: {
        pipeline: [WebGLPipeline],
        antialias: true,
        pixelArt: false,
        roundPixels: true
    },
    scene: [
        BootScene,
        PreloadScene,
        MenuScene,
        CharacterCreationScene,
        GameScene,
        HerbarScene,
        MinigameScene,
        CutsceneScene,
        UIScene
    ],
    audio: {
        disableWebAudio: false,
        context: null
    },
    input: {
        activePointers: 3,
        keyboard: true,
        mouse: true,
        touch: true
    }
};

// Inicializace hry
class LoukaAAAGame {
    constructor() {
        this.game = null;
        this.services = {};
        this.init();
    }

    async init() {
        console.log('%c🌿 AAA Louka %cv3.0.0 %c| Nature Games Studio',
            'font-size: 28px; color: #4CAF50; font-weight: bold;',
            'font-size: 16px; color: #FFD700;',
            'color: #8BC34A;');

        // Inicializace služeb
        await this.initServices();

        // Vytvoření hry
        this.game = new Phaser.Game(config);

        // Globální reference
        window.GAME_INSTANCE = this;
        window.PHASER_GAME = this.game;
    }

    async initServices() {
        // PWA Manager
        this.services.pwa = new PWAManager();
        await this.services.pwa.init();

        // Google Play Games (pouze v Android WebView/Chrome)
        if (this.isAndroidPlatform()) {
            this.services.googlePlay = new GooglePlayGames();
            await this.services.googlePlay.init();
        }

        // Firebase (pro cloud save)
        if (typeof firebase !== 'undefined') {
            this.services.firebase = firebase;
            await this.initFirebase();
        }
    }

    isAndroidPlatform() {
        return /Android/i.test(navigator.userAgent) ||
               window.location.hostname.includes('play.google.com');
    }

    async initFirebase() {
        const firebaseConfig = {
            apiKey: process.env.FIREBASE_API_KEY,
            authDomain: "louka-aaa-game.firebaseapp.com",
            projectId: "louka-aaa-game",
            storageBucket: "louka-aaa-game.appspot.com",
            messagingSenderId: "123456789",
            appId: process.env.FIREBASE_APP_ID
        };

        firebase.initializeApp(firebaseConfig);
    }

    getService(name) {
        return this.services[name] || null;
    }
}

// Spuštění hry po načtení stránky
window.addEventListener('load', () => {
    window.loukaGame = new LoukaAAAGame();
});

// Export pro moduly
export { config, LoukaAAAGame };
