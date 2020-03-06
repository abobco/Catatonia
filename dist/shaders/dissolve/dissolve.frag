varying vec2 vFilterCoord;
varying vec2 vTextureCoord;

uniform sampler2D uSampler;
uniform sampler2D mapSampler;

uniform float DissolveVal;

uniform highp vec4 inputSize;
uniform vec4 inputClamp;

void main(void)
{
  vec4 map =  texture2D(mapSampler, vFilterCoord);

  gl_FragColor = texture2D(uSampler,vTextureCoord);
  gl_FragColor.a *= floor(DissolveVal + min(0.99, map.r));
  gl_FragColor.r *= gl_FragColor.a;
  gl_FragColor.g *= gl_FragColor.a;
  gl_FragColor.b *= gl_FragColor.a;
}