  precision mediump float;
  
  varying vec2 vTextureCoord;
   varying vec2 vPrevTextureCoord;
  
  uniform sampler2D uSampler;
  uniform sampler2D prevSampler;
  uniform float alpha;
  
  void main(void)
  {
      //vec3 tintColor = vec3(0.012, 0.761, 0.988);
      vec4 color = texture2D(uSampler, vTextureCoord);
      vec4 prevColor = texture2D(prevSampler, vPrevTextureCoord) * alpha;
      //float gray = dot(prevColor.rgb, vec3(0.299, 0.587, 0.114));
      //prevColor = vec4(tintColor*gray, prevColor.a);
      gl_FragColor = prevColor * (1.0 - color.a) + color;
  }