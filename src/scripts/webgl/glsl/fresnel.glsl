float fresnel(vec3 eye, vec3 normal) {
  return pow(1.0 + dot(eye, normal), 1.5);
}