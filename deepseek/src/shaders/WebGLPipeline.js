import Phaser from 'phaser';

// Vlastní WebGL pipeline pro AAA vizuální efekty
export class WebGLPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
    constructor(game) {
        super({
            game: game,
            name: 'WebGLPipeline',
            fragShader: `
                precision mediump float;

                uniform sampler2D uMainSampler;
                uniform float uTime;
                uniform vec2 uResolution;
                uniform float uBloomIntensity;
                uniform float uVignetteStrength;
                uniform vec3 uColorGrading;

                varying vec2 outTexCoord;

                // Noise funkce pro organické efekty
                float random(vec2 st) {
                    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
                }

                // Smooth noise
                float noise(vec2 st) {
                    vec2 i = floor(st);
                    vec2 f = fract(st);

                    float a = random(i);
                    float b = random(i + vec2(1.0, 0.0));
                    float c = random(i + vec2(0.0, 1.0));
                    float d = random(i + vec2(1.0, 1.0));

                    vec2 u = f * f * (3.0 - 2.0 * f);

                    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
                }

                void main() {
                    vec4 color = texture2D(uMainSampler, outTexCoord);

                    // === BLOOM EFEKT ===
                    float brightness = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
                    vec3 bloomColor = color.rgb * smoothstep(0.5, 0.8, brightness) * uBloomIntensity;
                    color.rgb += bloomColor * 0.3;

                    // === VIGNETTE EFEKT ===
                    vec2 center = outTexCoord - 0.5;
                    float dist = length(center);
                    float vignette = 1.0 - dist * uVignetteStrength;
                    vignette = smoothstep(0.0, 1.0, vignette);
                    color.rgb *= vignette;

                    // === COLOR GRADING ===
                    color.r = color.r * uColorGrading.r;
                    color.g = color.g * uColorGrading.g;
                    color.b = color.b * uColorGrading.b;

                    // === FILM GRAIN (jemné) ===
                    float grain = random(outTexCoord + uTime * 0.001) * 0.03;
                    color.rgb += grain;

                    // === GOLDEN HOUR WARMTH (časově závislé) ===
                    float warmth = sin(uTime * 0.0001) * 0.5 + 0.5;
                    vec3 warmFilter = vec3(1.0, 0.9, 0.7);
                    color.rgb = mix(color.rgb, color.rgb * warmFilter, warmth * 0.2);

                    gl_FragColor = color;
                }
            `
        });

        this._time = 0;
        this._resolution = [1920, 1080];
    }

    onPreRender() {
        this._time += this.game.loop.delta;

        this.set1f('uTime', this._time);
        this.set2f('uResolution', this._resolution[0], this._resolution[1]);
        this.set1f('uBloomIntensity', 1.2);
        this.set1f('uVignetteStrength', 0.4);
        this.set3f('uColorGrading', 1.1, 1.05, 0.95);
    }
}
