  precision mediump float;
  
  varying vec2 vTextureCoord;
  varying vec2 vPrevTextureCoord;
  
  uniform sampler2D uSampler;
  uniform sampler2D prevSampler;
  uniform float alpha;
  
  void main(void)
  {
      vec4 color = texture2D(uSampler, vTextureCoord);
      vec4 prevColor = texture2D(prevSampler, vPrevTextureCoord) * alpha;
      gl_FragColor = prevColor * (1.0 - color.a) + color;
  }