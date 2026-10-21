import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Matrix4 } from "three";

const CAPACITY = 128;
const ARGS = [undefined, undefined, CAPACITY];

export default function PhysicsDebug({ physics }) {
  const candidates = useRef();
  const contacts = useRef();
  const matrix = useMemo(() => new Matrix4(), []);

  useFrame(() => {
    const update = (mesh, positions) => {
      mesh.count = Math.min(CAPACITY, positions.length);
      for (let i = 0; i < mesh.count; i++) {
        const { x, y, z } = positions[i];
        matrix.makeTranslation(x, y, z);
        mesh.setMatrixAt(i, matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    };
    update(candidates.current, physics.candidates);
    update(contacts.current, physics.contacts.map((contact) => contact.point));
  });

  return (
    <>
      <instancedMesh ref={candidates} args={ARGS} count={0} frustumCulled={false}>
        <boxGeometry args={[1.001, 1.001, 1.001]} />
        <meshBasicMaterial color="#ff0000" transparent opacity={0.2} depthWrite={false} />
      </instancedMesh>
      <instancedMesh ref={contacts} args={ARGS} count={0} frustumCulled={false}>
        <sphereGeometry args={[0.05, 6, 6]} />
        <meshBasicMaterial color="#00ff00" wireframe />
      </instancedMesh>
    </>
  );
}
