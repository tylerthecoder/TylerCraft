varying highp vec2 vTextureCord;

uniform sampler2D uSampler;

uniform highp vec4 uFilter; // = vec4(0,0,0,0);

void main(void) {
  highp vec4 sampleColor = texture2D(uSampler, vTextureCord);

  sampleColor += uFilter;

  gl_FragColor = sampleColor;
}