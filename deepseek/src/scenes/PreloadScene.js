import Phaser from 'phaser';

export class PreloadScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PreloadScene' });
        this.loadingProgress = 0;
    }

    preload() {
        // Vytvoření loading baru
        this.createLoadingUI();

        // === ZÁKLADNÍ ASSETY ===
        this.loadAssets();

        // Loading progress event
        this.load.on('progress', (value) => {
            this.loadingProgress = value;
            this.updateLoadingBar(value);
        });

        this.load.on('complete', () => {
            this.onLoadComplete();
        });
    }

    createLoadingUI() {
        // Pozadí
        this.add.image(960, 540, 'loading-bg')
            .setDisplaySize(1920, 1080);

        // Studio logo
        const logo = this.add.image(960, 350, 'logo')
            .setScale(0.5)
            .setAlpha(0);

        // Animace loga
        this.tweens.add({
            targets: logo,
            alpha: 1,
            scale: 0.6,
            duration: 1500,
            ease: 'Back.easeOut'
        });

        // Loading bar container
        this.loadingBarBg = this.add.image(960, 700, 'loading-bar')
            .setTint(0x333333);

        this.loadingBarFill = this.add.image(560, 700, 'loading-bar')
            .setOrigin(0, 0.5)
            .setDisplaySize(0, 30);

        // Loading text
        this.loadingText = this.add.text(960, 760, 'Připravuji louku... 0%', {
            fontFamily: 'Cinzel, serif',
            fontSize: '24px',
            color: '#FFD700',
            align: 'center'
        }).setOrigin(0.5);

        // Tipy během načítání
        this.tips = [
            'Věděli jste, že heřmánek pomáhá při nachlazení?',
            'Jezevec lesní dokáže vyhrabat noru hlubokou až 5 metrů!',
            'Sýkora koňadra si pamatuje až 1000 úkrytů s potravou.',
            'Na louce můžeme najít až 150 druhů léčivých rostlin.'
        ];

        this.tipText = this.add.text(960, 850, '', {
            fontFamily: 'Lora, serif',
            fontSize: '18px',
            color: '#81C784',
            align: 'center'
        }).setOrigin(0.5);

        // Rotace tipů
        this.time.addEvent({
            delay: 3000,
            callback: () => {
                const tip = Phaser.Utils.Array.GetRandom(this.tips);
                this.tipText.setText(tip);
            },
            loop: true
        });
    }

    loadAssets() {
        const basePath = 'assets/';

        // === SPRITE ATLASY ===
        // Postavy a NPC
        this.load.atlas('player', `${basePath}sprites/player.png`, `${basePath}sprites/player.json`);
        this.load.atlas('animals', `${basePath}sprites/animals.png`, `${basePath}sprites/animals.json`);
        this.load.atlas('npcs', `${basePath}sprites/npcs.png`, `${basePath}sprites/npcs.json`);

        // Rostliny do herbáře
        this.load.atlas('plants', `${basePath}sprites/plants.png`, `${basePath}sprites/plants.json`);

        // UI elementy
        this.load.atlas('ui', `${basePath}ui/ui-elements.png`, `${basePath}ui/ui-elements.json`);

        // === POZADÍ ===
        this.load.image('sky', `${basePath}backgrounds/sky.png`);
        this.load.image('clouds', `${basePath}backgrounds/clouds.png`);
        this.load.image('hills-far', `${basePath}backgrounds/hills-far.png`);
        this.load.image('hills-near', `${basePath}backgrounds/hills-near.png`);
        this.load.image('meadow', `${basePath}backgrounds/meadow.png`);
        this.load.image('forest', `${basePath}backgrounds/forest.png`);

        // === ČÁSTICE ===
        this.load.image('particle-firefly', `${basePath}particles/firefly.png`);
        this.load.image('particle-pollen', `${basePath}particles/pollen.png`);
        this.load.image('particle-petal', `${basePath}particles/petal.png`);
        this.load.image('particle-sparkle', `${basePath}particles/sparkle.png`);
        this.load.image('particle-rain', `${basePath}particles/rain.png`);
        this.load.image('particle-snow', `${basePath}particles/snow.png`);

        // === AUDIO ===
        // Hudba
        this.load.audio('main-theme', `${basePath}audio/music/main-theme.mp3`);
        this.load.audio('exploration', `${basePath}audio/music/exploration.mp3`);
        this.load.audio('discovery', `${basePath}audio/music/discovery.mp3`);
        this.load.audio('night-ambient', `${basePath}audio/music/night-ambient.mp3`);
        this.load.audio('menu-theme', `${basePath}audio/music/menu-theme.mp3`);

        // Zvukové efekty
        this.load.audio('sfx-click', `${basePath}audio/sfx/click.mp3`);
        this.load.audio('sfx-herb-pick', `${basePath}audio/sfx/herb-pick.mp3`);
        this.load.audio('sfx-achievement', `${basePath}audio/sfx/achievement.mp3`);
        this.load.audio('sfx-levelup', `${basePath}audio/sfx/levelup.mp3`);
        this.load.audio('sfx-magic', `${basePath}audio/sfx/magic.mp3`);

        // Zvířecí zvuky
        this.load.audio('bird-song', `${basePath}audio/animals/bird-song.mp3`);
        this.load.audio('fox-bark', `${basePath}audio/animals/fox-bark.mp3`);
        this.load.audio('owl-hoot', `${basePath}audio/animals/owl-hoot.mp3`);

        // === JSON DATA ===
        this.load.json('plants-data', `${basePath}data/plants.json`);
        this.load.json('animals-data', `${basePath}data/animals.json`);
        this.load.json('quests-data', `${basePath}data/quests.json`);
        this.load.json('achievements-data', `${basePath}data/achievements.json`);
        this.load.json('dialogues-data', `${basePath}data/dialogues.json`);

        // === FONTY ===
        this.load.bitmapFont('title-font', `${basePath}fonts/title.png`, `${basePath}fonts/title.xml`);
        this.load.bitmapFont('body-font', `${basePath}fonts/body.png`, `${basePath}fonts/body.xml`);
    }

    updateLoadingBar(progress) {
        const maxWidth = 800;
        this.loadingBarFill.setDisplaySize(maxWidth * progress, 30);

        const percent = Math.round(progress * 100);
        this.loadingText.setText(`Připravuji louku... ${percent}%`);
    }

    onLoadComplete() {
        // Animace dokončení
        this.tweens.add({
            targets: [this.loadingBarBg, this.loadingBarFill, this.loadingText],
            alpha: 0,
            duration: 500,
            onComplete: () => {
                // Uložení dat do globálního manažeru
                this.game.registry.set('plantsData', this.cache.json.get('plants-data'));
                this.game.registry.set('animalsData', this.cache.json.get('animals-data'));
                this.game.registry.set('questsData', this.cache.json.get('quests-data'));

                // Přechod do hlavního menu
                this.scene.start('MenuScene');
            }
        });
    }
}
