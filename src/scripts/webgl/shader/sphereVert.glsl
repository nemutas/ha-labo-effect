uniform float u_time;
varying vec3 v_normal;
varying vec3 v_eye;

#include '../glsl/noise.glsl'

vec3 displace(vec3 v) {
  vec3 result = v;
  float n = cnoise31(result * 1.0 + u_time * 0.3);
  result += normal * n * 0.05;
  return result;
}

#include '../glsl/recalcNormal.glsl'

void main() {
  vec3 pos = displace(position);
  vec3 correctedNormal = recalcNormal(pos);

  v_normal = normalize(normalMatrix * correctedNormal);
  v_eye = normalize(modelViewMatrix * vec4( pos, 1.0 )).xyz;
  
  gl_Position = projectionMatrix * modelViewMatrix * vec4( pos, 1.0 );
}