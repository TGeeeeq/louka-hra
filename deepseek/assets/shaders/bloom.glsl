// Bloom post-processing shader
#version 300 es
precision mediump float;

uniform sampler2D uMainSampler;
uniform float uIntensity;
uniform float uThreshold;

in vec2 outTexCoord;
out vec4 fragColor;

void main() {
    vec4 color = texture(uMainSampler, outTexCoord);

    // Extrakce jasných částí
    float brightness = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
    vec3 brightColor = color.rgb * step(uThreshold, brightness);

    // Bloom blur (zjednodušený)
    vec3 bloom = vec3(0.0);
    float total = 0.0;

    for (float x = -4.0; x <= 4.0; x++) {
        for (float y = -4.0; y <= 4.0; y++) {
            vec2 offset = vec2(x, y) / 512.0;
            float weight = 1.0 / (1.0 + length(offset) * 10.0);
            bloom += texture(uMainSampler, outTexCoord + offset).rgb * weight;
            total += weight;
        }
    }

    bloom /= total;

    // Kombinace originálu s bloomem
    color.rgb = color.rgb + bloom * uIntensity;

    // Tonemapping
    color.rgb = color.rgb / (color.rgb + vec3(1.0));

    // Gamma korekce
    color.rgb = pow(color.rgb, vec3(1.0 / 2.2));

    fragColor = color;
}
