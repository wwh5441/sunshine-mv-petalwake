export const CLEARANCE_UNIFORMS = /* glsl */`
attribute float garmentGuard;
attribute float skirtGuard;
uniform mat4 uGarmentWorld;
uniform mat4 uGarmentInverse;
uniform sampler2D uGarmentSurface;
uniform vec4 uGarmentBounds;
uniform float uGarmentClearance;
uniform float uGarmentEnabled;

uniform mat4 uSkirtWorld;
uniform mat4 uSkirtInverse;
uniform sampler2D uSkirtSurface;
uniform vec4 uSkirtBounds;
uniform float uSkirtClearance;
uniform vec4 uHairArmStart[4];
uniform vec4 uHairArmEnd[4];
`;

export const CLEARANCE_VERTEX = /* glsl */`
if (uGarmentEnabled > 0.5) {
  for(int i=0;i<4;i++){
    vec3 p=(modelMatrix*vec4(transformed,1.)).xyz;
    vec3 a=uHairArmStart[i].xyz,b=uHairArmEnd[i].xyz;
    vec3 ab=b-a;
    float t=clamp(dot(p-a,ab)/max(dot(ab,ab),.000001),.08,1.);
    vec3 delta=p-(a+t*ab);
    float distance=length(delta);
    float push=max(0.,uHairArmStart[i].w-distance);
    if(push>0. && distance>.00001)transformed+=inverse(mat3(modelMatrix))*(delta/distance*push);
  }
  if (abs(garmentGuard) > 0.5) {
    vec4 hairWorld = modelMatrix * vec4(transformed, 1.0);
    vec3 garmentPoint = (uGarmentInverse * hairWorld).xyz;
    vec2 garmentUv = (garmentPoint.xy - uGarmentBounds.xy) / uGarmentBounds.zw;
    if (all(greaterThanEqual(garmentUv, vec2(0.0))) &&
        all(lessThanEqual(garmentUv, vec2(1.0)))) {
      vec3 surface = texture2D(uGarmentSurface, garmentUv).rgb;
      float correction = garmentGuard < 0.0
        ? -max(0.0, garmentPoint.z - surface.r + uGarmentClearance)
        : max(0.0, surface.g + uGarmentClearance - garmentPoint.z);
      vec3 worldShift = mat3(uGarmentWorld) * vec3(0.0, 0.0, correction * surface.b);
      transformed += inverse(mat3(modelMatrix)) * worldShift;
    }
  }
  if (abs(skirtGuard) > 0.5) {
    vec4 hairWorldS = modelMatrix * vec4(transformed, 1.0);
    vec3 skirtPoint = (uSkirtInverse * hairWorldS).xyz;
    vec2 skirtUv = (skirtPoint.xy - uSkirtBounds.xy) / uSkirtBounds.zw;
    if (all(greaterThanEqual(skirtUv, vec2(0.0))) &&
        all(lessThanEqual(skirtUv, vec2(1.0)))) {
      vec3 surfaceS = texture2D(uSkirtSurface, skirtUv).rgb;
      float correctionS = skirtGuard < 0.0
        ? -max(0.0, skirtPoint.z - surfaceS.r + uSkirtClearance)
        : max(0.0, surfaceS.g + uSkirtClearance - skirtPoint.z);
      vec3 worldShiftS = mat3(uSkirtWorld) * vec3(0.0, 0.0, correctionS * surfaceS.b);
      transformed += inverse(mat3(modelMatrix)) * worldShiftS;
    }
  }
  // A torso/skirt projection can approach a sleeve again. Resolve articulated
  // surfaces once more after both body fields, in the same render/depth path.
  for(int i=0;i<4;i++){
    vec3 p=(modelMatrix*vec4(transformed,1.)).xyz;
    vec3 a=uHairArmStart[i].xyz,b=uHairArmEnd[i].xyz,ab=b-a;
    float t=clamp(dot(p-a,ab)/max(dot(ab,ab),.000001),.08,1.);
    vec3 delta=p-(a+t*ab);float distance=length(delta);
    float push=max(0.,uHairArmStart[i].w-distance);
    if(push>0. && distance>.00001)transformed+=inverse(mat3(modelMatrix))*(delta/distance*push);
  }
}
`;

export function patchClearanceMaterial(material, uniforms) {
  const beforeCompile = material.onBeforeCompile.bind(material);
  const cacheKey = material.customProgramCacheKey.bind(material);
  material.onBeforeCompile = (shader, renderer) => {
    beforeCompile(shader, renderer);
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = CLEARANCE_UNIFORMS + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <project_vertex>',
      `${CLEARANCE_VERTEX}\n#include <project_vertex>`
    );
  };
  material.customProgramCacheKey = () => `${cacheKey()}-articulated-hair-surface-v3`;
  material.needsUpdate = true;
}
