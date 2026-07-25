// WebGL Shader pro parallax scrolling s hloubkovým efektem
export const ParallaxShader = {
    fragmentShader: `
        precision mediump float;

        uniform sampler2D uMainSampler;
        uniform float uParallaxFactor;
        uniform float uTime;
        uniform vec2 uOffset;

        varying vec2 outTexCoord;

        void main() {
            // Parallax offset
            vec2 parallaxCoord = outTexCoord + uOffset * uParallaxFactor;

            // Wrap textury pro nekonečné scrollování
            parallaxCoord = fract(parallaxCoord);

            vec4 color = texture2D(uMainSampler, parallaxCoord);

            // Depth fog effect
            float fog = 1.0 - uParallaxFactor * 0.3;
            vec3 fogColor = vec3(0.7, 0.8, 1.0);
            color.rgb = mix(color.rgb, fogColor, fog);

            gl_FragColor = color;
        }
    `
};
