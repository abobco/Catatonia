precision mediump float;

varying vec2 vUvs;

uniform sampler2D uSampler;

uniform float time;

void main() {

    gl_FragColor = texture2D(uSampler, vUvs + sin( (time + (vUvs.x) * 14.) ) * 0.1 );
}