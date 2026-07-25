import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        // Minimální assety pro loading screen
        this.load.image('logo', 'assets/ui/studio-logo.png');
        this.load.image('loading-bar', 'assets/ui/loading-bar.png');
        this.load.image('loading-bg', 'assets/ui/loading-background.png');

        // Shader soubory
        this.load.glsl('bloom', 'assets/shaders/bloom.glsl');
        this.load.glsl('parallax', 'assets/shaders/parallax.glsl');
        this.load.glsl('particles', 'assets/shaders/particles.glsl');
    }

    create() {
        // Nastavení globálních parametrů
        this.game.scale.refresh();

        // Inicializace WebGL pipeline
        this.initWebGLPipeline();

        // Přechod na načítání assetů
        this.scene.start('PreloadScene');
    }

    initWebGLPipeline() {
        const renderer = this.game.renderer;

        if (renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer) {
            console.log('✅ WebGL renderer aktivní');

            // Vlastní pipeline pro post-processing
            renderer.pipelines.addPostPipeline('BloomFX', {
                fragmentShader: this.cache.shader.get('bloom').fragmentSrc,
                uniforms: {
                    uIntensity: { value: 1.5 },
                    uThreshold: { value: 0.3 }
                }
            });
        }
    }
}
