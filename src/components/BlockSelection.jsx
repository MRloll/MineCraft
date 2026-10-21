import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Matrix4, Vector2, Vector3 } from "three";

export default function BlockSelection({ camera, world, worldRef, player, isPlaying }) {
  const mesh = useRef();
  const raycaster = useThree((state) => state.raycaster);
  const scratch = useMemo(() => ({
    center: new Vector2(), matrix: new Matrix4(), position: new Vector3(), normal: new Vector3(),
  }), []);

  useFrame(() => {
    mesh.current.visible = false;
    player.selectedCoords = null;
    if (!isPlaying || !camera || !worldRef.current) return;

    worldRef.current.updateWorldMatrix(true, true);
    raycaster.setFromCamera(scratch.center, camera);
    const previousFar = raycaster.far;
    raycaster.far = 4;
    const hit = raycaster.intersectObject(worldRef.current, true)
      .find((intersection) => intersection.object.userData.isVoxel && intersection.instanceId !== undefined);
    raycaster.far = previousFar;
    if (!hit) return;

    hit.object.getMatrixAt(hit.instanceId, scratch.matrix);
    scratch.position.setFromMatrixPosition(scratch.matrix).applyMatrix4(hit.object.matrixWorld).round();
    if (player.activeBlockId !== 0) {
      if (!hit.face) return;
      scratch.normal.copy(hit.face.normal).transformDirection(hit.object.matrixWorld).round();
      scratch.position.add(scratch.normal);
      if (world.getBlock(scratch.position.x, scratch.position.y, scratch.position.z)?.id !== 0) return;
    }
    player.selectedCoords = scratch.position;
    mesh.current.position.copy(scratch.position);
    mesh.current.visible = true;
  }, -1);

  return (
    <mesh ref={mesh} visible={false}>
      <boxGeometry args={[1.01, 1.01, 1.01]} />
      <meshBasicMaterial color="#ffffaa" transparent opacity={0.3} depthWrite={false} />
    </mesh>
  );
}
