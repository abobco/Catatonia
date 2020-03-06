varying vec2 vTextureCoord;
uniform sampler2D uSampler;
uniform sampler2D Palette;

void main()
{
    vec4 color = texture2D(uSampler, vTextureCoord);
    if (color.a == 0.0) discard;
    float red = (color.r*255.0);
    float green = (color.g*255.0);
    float blue = (color.b*255.0);
    float diag = ceil(blue / 2.0);
    float divideby = 512.0;
    float sum = 0.5;
    vec2 coord = vec2((((red + diag) + sum) / divideby), ((((green + diag)) + sum) / divideby));
   // vec2 coord = vec2(color.r , color.g );
    vec4 indexedColor = texture2D(Palette, coord);
    gl_FragColor = indexedColor;
}