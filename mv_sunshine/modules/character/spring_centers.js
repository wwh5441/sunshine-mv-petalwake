// The installed three-vrm setter stores one inverse cache on each shared centre.
// Clear every old association before setting new ones, otherwise a later joint
// can remove a cache that an earlier joint has just installed on that centre.
export function setSpringCenters(assignments) {
  for(const [joint] of assignments)joint.center=null;
  for(const [joint,center] of assignments)joint.center=center;
}
