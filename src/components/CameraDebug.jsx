import { useRef } from "react";
import { useFrame } from "@react-three/fiber";

export default function CameraDebug({ camera }) {
  const helper = useRef();
  useFrame(() => helper.current.update());
  return <cameraHelper ref={helper} args={[camera]} />;
}
