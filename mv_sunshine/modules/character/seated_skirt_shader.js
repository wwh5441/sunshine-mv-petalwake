export const SEATED_UNIFORMS=/*glsl*/`
attribute float seatedDrape;
attribute vec3 seatReference;
attribute vec3 seatReferenceNormal;
uniform mat4 uSeatWorld;
uniform mat4 uSeatInverse;
uniform sampler2D uSeatFrames;
uniform vec3 uSeatPattern;
uniform float uSeated;
vec4 seatFrame(float s,float row){
  float x=(s*(uSeatPattern.z-1.)+.5)/uSeatPattern.z;
  return texture2D(uSeatFrames,vec2(x,(row+.5)/3.));
}
float seatBlend(){return seatedDrape*(1.-smoothstep(uSeatPattern.x-.08,uSeatPattern.x+.02,seatReference.y));}
vec3 seatDestination(float s){
  return seatFrame(s,0.).xyz+seatFrame(s,1.).xyz*seatReference.x-seatFrame(s,2.).xyz*seatReference.z;
}
`;

export const SEATED_POSITION=/*glsl*/`
if(uSeated>.5 && seatedDrape>.001){
  float s=clamp((uSeatPattern.x-seatReference.y)/uSeatPattern.y,0.,1.);
  vec3 destination=seatDestination(s);
  vec3 current=(uSeatInverse*modelMatrix*vec4(transformed,1.)).xyz;
  transformed=(inverse(modelMatrix)*uSeatWorld*vec4(mix(current,destination,seatBlend()),1.)).xyz;
}
`;

export const SEATED_NORMAL=/*glsl*/`
if(uSeated>.5 && seatedDrape>.001){
  float s=clamp((uSeatPattern.x-seatReference.y)/uSeatPattern.y,0.,1.);
  float ds=1./(uSeatPattern.z-1.),lo=max(0.,s-ds),hi=min(1.,s+ds);
  vec3 dx=seatFrame(s,1.).xyz,dz=-seatFrame(s,2.).xyz;
  vec3 dy=(seatDestination(lo)-seatDestination(hi))/((hi-lo)*uSeatPattern.y);
  vec3 desired=normalize(cross(dy,dz)*seatReferenceNormal.x+cross(dz,dx)*seatReferenceNormal.y+cross(dx,dy)*seatReferenceNormal.z);
  vec3 localNormal=transpose(mat3(modelMatrix))*mat3(uSeatWorld)*desired;
  objectNormal=normalize(mix(objectNormal,localNormal,seatBlend()));
}
`;
