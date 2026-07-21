// WebGL Shader pro organické částicové efekty
export const ParticleShader = {
    fragmentShader: `
        precision mediump float;

        uniform sampler2D uMainSampler;
        uniform float uTime;
        uniform vec2 uWind;
        uniform float uParticleType; // 0: firefly, 1: pollen, 2: petal, 3: sparkle

        varying vec2 outTexCoord;
        varying float vAlpha;
        varying float vSize;

        float random(vec2 st) {
            return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
        }

        void main() {
            vec4 color = texture2D(uMainSampler, outTexCoord);

            // Různé efekty podle typu částice
            if (uParticleType < 0.5) {
                // Firefly - pulzující světluška
                float pulse = sin(uTime * 3.0 + outTexCoord.x * 10.0) * 0.5 + 0.5;
                color.rgb = mix(vec3(1.0, 0.9, 0.2), vec3(1.0, 1.0, 0.6), pulse);
                color.a = vAlpha * pulse;
            } else if (uParticleType < 1.5) {
                // Pollen - průsvitný pyl
                color.rgb = vec3(1.0, 0.95, 0.7);
                color.a = vAlpha * 0.7;
            } else if (uParticleType < 2.5) {
                // Petal - okvětní lístek
                vec3 petalColor = mix(vec3(1.0, 0.6, 0.8), vec3(1.0, 0.8, 0.9), random(outTexCoord));
                color.rgb = petalColor;
                color.a = vAlpha;
            } else {
                // Sparkle - jiskra
                float sparkle = pow(sin(uTime * 10.0 + outTexCoord.x * 20.0) * 0.5 + 0.5, 4.0);
                color.rgb = vec3(1.0, 0.9, 0.3) * sparkle;
                color.a = vAlpha * sparkle;
            }

            // Wind ovlivňuje pozici
            vec2 windOffset = uWind * outTexCoord.y * 0.1;
            outTexCoord += windOffset;

            gl_FragColor = color;
        }
    `,

    vertexShader: `
        attribute float aAlpha;
        attribute float aSize;

        varying float vAlpha;
        varying float vSize;

        void main() {
            vAlpha = aAlpha;
            vSize = aSize;

            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = aSize * (300.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
        }
    `
};
