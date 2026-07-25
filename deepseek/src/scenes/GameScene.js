import Phaser from 'phaser';
import { ParallaxShader } from '../shaders/ParallaxShader';
import { ParticleShader } from '../shaders/ParticleShader';

export class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.player = null;
        this.parallaxLayers = [];
        this.particleEmitters = [];
        this.npcs = [];
        this.animals = [];
        this.interactivePlants = [];
    }

    create() {
        console.log('🌿 Herní scéna vytvořena');

        // Vytvoření parallax pozadí
        this.createParallaxBackground();

        // Vytvoření částicových efektů
        this.createParticleSystems();

        // Vytvoření hráče
        this.createPlayer();

        // Vytvoření NPC
        this.createNPCs();

        // Vytvoření zvířat
        this.createAnimals();

        // Vytvoření interaktivních rostlin
        this.createPlants();

        // Nastavení kamery
        this.setupCamera();

        // Nastavení fyziky
        this.setupPhysics();

        // Vstupní ovládání
        this.setupInput();

        // UI overlay
        this.scene.launch('UIScene');

        // Spuštění hudby
        this.playMusic();

        // Počasí
        this.initWeather();
    }

    createParallaxBackground() {
        // Vrstvy parallaxu s WebGL shadery
        const layers = [
            { key: 'sky', depth: 0.1, y: 0 },
            { key: 'clouds', depth: 0.2, y: 0 },
            { key: 'hills-far', depth: 0.3, y: 400 },
            { key: 'hills-near', depth: 0.5, y: 500 },
            { key: 'meadow', depth: 0.7, y: 600 },
            { key: 'forest', depth: 0.9, y: 650 }
        ];

        layers.forEach((layer, index) => {
            const image = this.add.image(0, layer.y, layer.key)
                .setOrigin(0, 0)
                .setScrollFactor(0)
                .setDepth(layer.depth * 10);

            // Aplikace parallax shaderu
            image.setPipeline('WebGLPipeline');

            this.parallaxLayers.push({
                image: image,
                depth: layer.depth,
                originalX: 0
            });
        });
    }

    createParticleSystems() {
        // Systém světlušek
        const fireflies = this.add.particles(0, 0, 'particle-firefly', {
            x: { min: 0, max: 1920 },
            y: { min: 0, max: 600 },
            scale: { start: 0.5, end: 0 },
            alpha: { start: 1, end: 0 },
            speed: { min: 10, max: 30 },
            lifespan: 4000,
            frequency: 500,
            blendMode: 'ADD',
            tint: [0xFFD700, 0xFFA500, 0xFFFF00],
            emitZone: {
                type: 'random',
                source: new Phaser.Geom.Rectangle(0, 0, 1920, 600)
            }
        });

        // Systém pylu
        const pollen = this.add.particles(0, 0, 'particle-pollen', {
            x: { min: 0, max: 1920 },
            y: { min: 400, max: 1080 },
            scale: { start: 0.3, end: 0 },
            alpha: { start: 0.6, end: 0 },
            speed: { min: 5, max: 15 },
            lifespan: 6000,
            frequency: 200,
            blendMode: 'NORMAL',
            tint: [0xFFFFCC, 0xFFF8DC, 0xFAEBD7]
        });

        this.particleEmitters.push(fireflies, pollen);
    }

    createPlayer() {
        // Vytvoření hráče z character creation dat
        const playerData = this.game.registry.get('playerData') || {
            appearance: { gender: 'male', outfit: 'explorer' }
        };

        this.player = this.physics.add.sprite(400, 600, 'player', 'idle_01');
        this.player.setCollideWorldBounds(true);
        this.player.setDepth(50);

        // Animace hráče
        this.createPlayerAnimations();
    }

    createPlayerAnimations() {
        // Idle animace
        this.anims.create({
            key: 'player_idle',
            frames: this.anims.generateFrameNames('player', {
                prefix: 'idle_',
                start: 1,
                end: 4
            }),
            frameRate: 8,
            repeat: -1
        });

        // Chůze
        this.anims.create({
            key: 'player_walk',
            frames: this.anims.generateFrameNames('player', {
                prefix: 'walk_',
                start: 1,
                end: 8
            }),
            frameRate: 12,
            repeat: -1
        });

        // Sběr
        this.anims.create({
            key: 'player_harvest',
            frames: this.anims.generateFrameNames('player', {
                prefix: 'harvest_',
                start: 1,
                end: 6
            }),
            frameRate: 10,
            repeat: 0
        });

        this.player.play('player_idle');
    }

    createNPCs() {
        // Jezevec Jezuřín - moudrý mentor
        const jezurin = this.createNPC(200, 500, 'npcs', 'jezevec_01', {
            name: 'Jezuřín',
            type: 'mentor',
            dialogues: ['dialogue_jezurin_intro', 'dialogue_jezurin_herbs'],
            quests: ['quest_first_steps', 'quest_herb_collection']
        });

        // Liška Bystrouška
        const bystrouska = this.createNPC(800, 450, 'npcs', 'fox_01', {
            name: 'Bystrouška',
            type: 'companion',
            dialogues: ['dialogue_fox_intro'],
            quests: ['quest_forest_secrets']
        });

        this.npcs.push(jezurin, bystrouska);
    }

    createNPC(x, y, atlas, frame, data) {
        const npc = this.physics.add.sprite(x, y, atlas, frame);
        npc.setInteractive();
        npc.npcData = data;

        // Interakce s NPC
        npc.on('pointerdown', () => {
            this.interactWithNPC(npc);
        });

        // Animace
        this.tweens.add({
            targets: npc,
            y: y - 5,
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        return npc;
    }

    createAnimals() {
        // Ptáci
        for (let i = 0; i < 5; i++) {
            const bird = this.add.sprite(
                Phaser.Math.Between(100, 1800),
                Phaser.Math.Between(100, 400),
                'animals',
                'bird_01'
            );

            // Let ptáka
            this.tweens.add({
                targets: bird,
                x: bird.x + Phaser.Math.Between(200, 500),
                y: bird.y + Phaser.Math.Between(-100, 100),
                duration: 3000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });

            this.animals.push(bird);
        }

        // Motýli
        for (let i = 0; i < 8; i++) {
            const butterfly = this.add.sprite(
                Phaser.Math.Between(100, 1800),
                Phaser.Math.Between(300, 700),
                'animals',
                'butterfly_01'
            );

            this.tweens.add({
                targets: butterfly,
                x: butterfly.x + Phaser.Math.Between(-200, 200),
                y: butterfly.y + Phaser.Math.Between(-150, 150),
                duration: 2000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });

            this.animals.push(butterfly);
        }
    }

    createPlants() {
        // Načtení dat rostlin
        const plantsData = this.game.registry.get('plantsData') || [];

        // Vytvoření interaktivních rostlin na louce
        plantsData.slice(0, 20).forEach((plantData, index) => {
            const x = Phaser.Math.Between(100, 1800);
            const y = Phaser.Math.Between(500, 900);

            const plant = this.add.sprite(x, y, 'plants', plantData.sprite || 'herb_01');
            plant.setInteractive();
            plant.plantData = plantData;

            // Animace rostliny
            this.tweens.add({
                targets: plant,
                scaleX: 1.05,
                scaleY: 1.05,
                duration: 2000 + Math.random() * 1000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });

            // Interakce - sběr
            plant.on('pointerdown', () => {
                this.harvestPlant(plant);
            });

            this.interactivePlants.push(plant);
        });
    }

    harvestPlant(plant) {
        // Animace sběru
        this.player.play('player_harvest');

        // Vizuální efekt
        const particles = this.add.particles(plant.x, plant.y, 'particle-petal', {
            speed: { min: 50, max: 100 },
            scale: { start: 0.5, end: 0 },
            lifespan: 1000,
            quantity: 10,
            blendMode: 'ADD',
            tint: [0x90EE90, 0x98FB98, 0x7CFC00]
        });

        // Zvuk
        this.sound.play('sfx-herb-pick');

        // Přidání do inventáře
        const inventoryScene = this.scene.get('UIScene');
        if (inventoryScene) {
            inventoryScene.addToInventory(plant.plantData);
        }

        // Obnovení rostliny po čase
        this.time.delayedCall(30000, () => {
            if (plant && plant.active) {
                plant.setAlpha(1);
                plant.setInteractive();
            }
        });

        // Dočasné skrytí
        plant.setAlpha(0.3);
        plant.disableInteractive();

        // Kontrola achievementů
        this.checkPlantCollectionAchievement();
    }

    interactWithNPC(npc) {
        // Zastavení hráče
        this.player.setVelocity(0, 0);

        // Dialogový systém
        const dialogue = npc.npcData.dialogues[0];
        this.showDialogue(dialogue);

        // Kamera se zaměří na NPC
        this.cameras.main.pan(npc.x, npc.y, 1000, 'Power2');
    }

    showDialogue(dialogueKey) {
        const dialoguesData = this.game.registry.get('dialoguesData');
        const dialogue = dialoguesData[dialogueKey];

        if (!dialogue) return;

        // Emit event pro UI scénu
        this.events.emit('show-dialogue', dialogue);
    }

    setupCamera() {
        // Kamera sleduje hráče
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.cameras.main.setBounds(0, 0, 1920, 1080);

        // Post-processing efekty
        this.cameras.main.setPostPipeline('WebGLPipeline');
    }

    setupPhysics() {
        // Kolize s hranicemi světa
        this.player.setCollideWorldBounds(true);

        // Kolize s NPC
        this.physics.add.overlap(this.player, this.npcs, (player, npc) => {
            // Zobrazení interakční ikony
            this.showInteractionPrompt(npc);
        });
    }

    setupInput() {
        // Klávesnice
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = {
            up: this.input.keyboard.addKey('W'),
            down: this.input.keyboard.addKey('S'),
            left: this.input.keyboard.addKey('A'),
            right: this.input.keyboard.addKey('D')
        };

        // Touch ovládání pro mobil
        this.input.on('pointermove', (pointer) => {
            if (pointer.isDown) {
                this.player.x += pointer.velocity.x * 0.5;
                this.player.y += pointer.velocity.y * 0.5;
            }
        });
    }

    playMusic() {
        // Orchestrální hudba pro průzkum
        if (!this.sound.get('exploration')) {
            this.sound.play('exploration', {
                loop: true,
                volume: 0.4
            });
        }
    }

    initWeather() {
        // Náhodné počasí
        const weathers = ['clear', 'cloudy', 'sunset'];
        const currentWeather = Phaser.Utils.Array.GetRandom(weathers);

        this.applyWeather(currentWeather);

        // Změna počasí každých 5 minut
        this.time.addEvent({
            delay: 300000,
            callback: () => {
                const newWeather = Phaser.Utils.Array.GetRandom(weathers);
                this.applyWeather(newWeather);
            },
            loop: true
        });
    }

    applyWeather(weather) {
        switch (weather) {
            case 'clear':
                this.cameras.main.setPostPipeline('WebGLPipeline', {
                    uColorGrading: [1.1, 1.05, 0.95]
                });
                break;
            case 'cloudy':
                this.cameras.main.setPostPipeline('WebGLPipeline', {
                    uColorGrading: [0.9, 0.95, 1.1]
                });
                break;
            case 'sunset':
                this.cameras.main.setPostPipeline('WebGLPipeline', {
                    uColorGrading: [1.3, 0.9, 0.6]
                });
                break;
        }
    }

    checkPlantCollectionAchievement() {
        // Google Play Games achievement
        const gpg = window.loukaGame?.getService('googlePlay');
        if (gpg && gpg.isSignedIn) {
            gpg.incrementAchievement('collector', 1);

            // Kontrola milníků
            const totalCollected = this.interactivePlants.filter(p => p.alpha < 1).length;

            if (totalCollected >= 10) {
                gpg.unlockAchievement('collector');
            }
            if (totalCollected >= 50) {
                gpg.unlockAchievement('masterHerbalist');
            }
        }
    }

    update(time, delta) {
        if (!this.player) return;

        // Pohyb hráče
        const speed = 200;
        let vx = 0;
        let vy = 0;

        if (this.cursors.left.isDown || this.wasd.left.isDown) vx = -speed;
        if (this.cursors.right.isDown || this.wasd.right.isDown) vx = speed;
        if (this.cursors.up.isDown || this.wasd.up.isDown) vy = -speed;
        if (this.cursors.down.isDown || this.wasd.down.isDown) vy = speed;

        this.player.setVelocity(vx, vy);

        // Animace podle pohybu
        if (vx !== 0 || vy !== 0) {
            this.player.play('player_walk', true);
            // Flip sprite podle směru
            if (vx < 0) this.player.setFlipX(true);
            if (vx > 0) this.player.setFlipX(false);
        } else {
            this.player.play('player_idle', true);
        }

        // Parallax efekt
        this.updateParallax(time);

        // Aktualizace částic
        this.updateParticles(time);

        // Google Play Games - ukládání herního času
        if (time % 60000 < delta) { // Každou minutu
            const gpg = window.loukaGame?.getService('googlePlay');
            if (gpg?.isSignedIn) {
                gpg.submitScore('totalPlayTime', Math.floor(time / 1000));
            }
        }
    }

    updateParallax(time) {
        const cameraX = this.cameras.main.scrollX;

        this.parallaxLayers.forEach(layer => {
            const offset = cameraX * (1 - layer.depth);
            layer.image.setX(offset * 0.1);
        });
    }

    updateParticles(time) {
        // Dynamická úprava částic podle denní doby
        const hour = new Date().getHours();

        this.particleEmitters.forEach(emitter => {
            if (hour >= 20 || hour < 6) {
                // V noci více světlušek
                emitter.setFrequency(200);
            } else {
                // Ve dne více pylu
                emitter.setFrequency(500);
            }
        });
    }
}
