import * as THREE from 'three';
import { BROOM_RIG } from '../../data/broom_rig.js';
import { broomAxis } from './broom_rig.js';

// Reuse the authored straw head and brass lantern from Petalwake's rider asset.
export function createBroomProp(rider, textures) {
  const config = BROOM_RIG;
  const group = new THREE.Group();
  group.name = 'HeroBroom';
  for (const part of ['straw', 'lantern']) for (const source of rider.meshes) {
    const geometry = source.geometry.clone(), positions = geometry.attributes.position;
    const wind = geometry.attributes._wind, index = geometry.index.array, kept = [];
    const belongs = (i) => part === 'straw' ? positions.getZ(i) > config.straw.minZ : wind.getW(i) > config.lantern.minWeight;
    for (let i = 0; i < index.length; i += 3) {
      if (belongs(index[i]) && belongs(index[i + 1]) && belongs(index[i + 2])) kept.push(index[i], index[i + 1], index[i + 2]);
    }
    geometry.setIndex(kept);
    if (!kept.length) { geometry.dispose(); continue; }
    const mesh = new THREE.Mesh(geometry, source.material);
    mesh.name = `Broom:${part}`;
    mesh.scale.setScalar(config.scale);
    // Leave source coordinates intact for the original wind/pendulum shader.
    mesh.position.fromArray(config[part].mount).addScaledVector(new THREE.Vector3(...config[part].pivot),-config.scale);
    mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false;
    group.add(mesh);
  }
  const handle = new THREE.Mesh(new THREE.TubeGeometry(broomAxis, 48, config.handleRadius, 10, false), new THREE.MeshStandardMaterial({
    map: textures.woodMap, normalMap: textures.woodNormal, color: 0x8c602e, roughness: 0.70,
  }));
  handle.name = 'BroomHandle'; handle.castShadow = true; handle.receiveShadow = true;
  group.add(handle);
  for (const [name, point] of Object.entries({ straw:config.straw.mount, lantern:config.lantern.mount })) {
    const mount=new THREE.Object3D();mount.name=`BroomMount:${name}`;mount.position.fromArray(point);group.add(mount);
  }
  return group;
}
