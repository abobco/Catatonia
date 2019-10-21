varying vec2 vTextureCoord;
uniform sampler2D uSampler;
float TriAlpha;
vec2 origin = vec2(0,0);
void main(void) {
    vec4 color = texture2D(uSampler, vTextureCoord);
    TriAlpha = 1.0 - distance(origin, vTextureCoord);
    color.r *= TriAlpha;
    color.g *= TriAlpha;
    color.b *= TriAlpha;
    color.a = TriAlpha;
    gl_FragColor = color;
}