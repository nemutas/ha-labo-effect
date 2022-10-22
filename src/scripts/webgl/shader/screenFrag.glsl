struct Texture {
  sampler2D data;
  vec2 uvScale;
};

uniform Texture u_current;
uniform Texture u_next;
uniform float u_progress;
varying vec2 v_uv;

vec4 getTexture(Texture tex, float scale) {
  vec2 uv = (v_uv - 0.5) * scale * tex.uvScale + 0.5;
  return texture2D(tex.data, uv);
}

void main() {
  vec4 current = getTexture(u_current, 1.0);
  vec4 next = getTexture(u_next, u_progress * (1.0 - 0.8) + 0.8);

  vec4 outGoing = mix(current, next, u_progress);

  gl_FragColor = outGoing;
}