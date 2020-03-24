varying vec2 vTextureCoord;
varying vec2 vSamplerCoord;

uniform sampler2D uSampler;
uniform sampler2D lightSampler;
uniform mat2 rotation;
uniform highp vec4 inputSize;

void main(void){
    vec4 lightColor = texture2D(lightSampler, vSamplerCoord);

    if ( lightColor.r == 0.0 )
        gl_FragColor = mix(texture2D(uSampler, vTextureCoord),vec4(0.0,0.0,0.0, 1.0), 0.5);
    else
        gl_FragColor = texture2D(uSampler, vTextureCoord);

    // smooth shadow blend method
    //   gl_FragColor = mix(texture2D(uSampler, vTextureCoord),vec4(0.0,0.0,0.0, 1.0), 0.5 - lightColor.r);
}