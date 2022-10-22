uniform sampler2D u_texture;
uniform vec2 u_screenCoord;
uniform float u_refractPower;
varying vec3 v_normal;
varying vec3 v_eye;

#include '../glsl/fresnel.glsl'
#include '../glsl/colorConverter.glsl'

void main() {
  vec2 uv = gl_FragCoord.xy / u_screenCoord.xy;

  float f = fresnel(v_eye, v_normal);
  float refractPower = (1.0 - u_refractPower) * (1.0 - 0.6) + 0.6;
  f = smoothstep(0.1, refractPower, f);

  float r = texture2D(u_texture, uv - v_normal.xy * f * (0.1 + 0.1 * 1.0)).r;
  float g = texture2D(u_texture, uv - v_normal.xy * f * (0.1 + 0.1 * 1.5)).g;
  float b = texture2D(u_texture, uv - v_normal.xy * f * (0.1 + 0.1 * 2.0)).b;
  
  vec3 color = vec3(r, g, b);
  // color = linear2sRgb(color);
  gl_FragColor = vec4(color, 1.0);
  // gl_FragColor = vec4(vec3(f), 1.0);
}