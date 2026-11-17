import { STAGE_LAYOUT } from '../data/stage_layout.js';

export function placeStageFurniture(sets) {
  const { teaTable, readingDesk } = STAGE_LAYOUT;
  sets.teaTable.position.fromArray(teaTable.position);
  sets.teaTable.rotation.y = teaTable.yawDeg * Math.PI / 180;
  sets.readingDesk.position.fromArray(readingDesk.position);
  sets.readingDesk.rotation.y = readingDesk.yawDeg * Math.PI / 180;
  sets.readingTable.scale.fromArray(readingDesk.tableScale);
  for (const [name, config] of Object.entries(STAGE_LAYOUT.readingItems)) {
    const item = sets.readingItems[name];
    item.position.fromArray(config.position);
    item.scale.multiplyScalar(config.scale);
  }
  for (const [name, object] of Object.entries(sets.stageObjects)) object.name = `Stage:${name}`;
}
