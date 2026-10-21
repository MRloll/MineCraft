import { memo, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useThree } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, PointerLockControls } from "@react-three/drei";
import { Player } from "../game/player.js";
import { Physics } from "../game/physics.js";
import { World } from "../game/world.js";
import { PLAYER_SPAWN } from "../game/settings.js";
import BlockSelection from "./BlockSelection";
import CameraDebug from "./CameraDebug";
import DebugPanel from "./DebugPanel";
import PhysicsDebug from "./PhysicsDebug";
import PlayerController from "./PlayerController";
import PlayerTool from "./PlayerTool";
import SceneLighting from "./SceneLighting";
import VoxelWorld from "./world/VoxelWorld";

const ORBIT_TARGET = [16, 16, 16];

function GameScene({
  activeBlockId, mode, onModeChange, onActiveBlockChange, onPositionChange, onStatusChange,
}) {
  const get = useThree((state) => state.get);
  const canvas = useThree((state) => state.gl.domElement);
  // Capture the orbit camera once. Reading state.camera on every render would
  // accidentally capture the player camera after pointer lock changes it.
  const [orbitCamera] = useState(() => get().camera);
  const [playerCamera, setPlayerCamera] = useState(null);
  const [debug, setDebug] = useState({ camera: false, physics: false });
  const debugOptions = useMemo(() => ({ camera: false, physics: false }), []);
  const world = useMemo(() => new World(), []);
  const player = useMemo(() => new Player(), []);
  const physics = useMemo(() => new Physics(), []);
  const worldRef = useRef();
  const pointerControls = useRef();
  const debugRequested = useRef(false);
  const isPlaying = mode === "playing";

  useLayoutEffect(() => {
    player.activeBlockId = activeBlockId;
  }, [activeBlockId, player]);

  useEffect(() => {
    world.generate();
    return () => world.clear();
  }, [world]);

  const handleLock = useCallback(() => {
    debugRequested.current = false;
    onModeChange("playing");
  }, [onModeChange]);

  const handleUnlock = useCallback(() => {
    onModeChange(debugRequested.current ? "debug" : "paused");
    debugRequested.current = false;
  }, [onModeChange]);

  const handleDebugRequest = useCallback(() => {
    if (pointerControls.current?.isLocked) {
      debugRequested.current = true;
      pointerControls.current.unlock();
    } else {
      onModeChange("debug");
    }
  }, [onModeChange]);

  return (
    <>
      <color attach="background" args={["#80a0e0"]} />
      <fog attach="fog" args={["#80a0e0", 50, 100]} />
      <SceneLighting player={player} />

      <Suspense fallback={null}>
        <VoxelWorld world={world} rootRef={worldRef} />
      </Suspense>

      <PerspectiveCamera
        ref={setPlayerCamera}
        makeDefault={isPlaying}
        position={PLAYER_SPAWN}
        fov={75}
        near={0.1}
        far={100}
      >
        <Suspense fallback={null}>
          <PlayerTool player={player} visible={isPlaying && activeBlockId === 0} />
        </Suspense>
      </PerspectiveCamera>

      <OrbitControls
        camera={orbitCamera}
        target={ORBIT_TARGET}
        enabled={!isPlaying}
        enableDamping={false}
        makeDefault
      />
      {playerCamera && (
        <PointerLockControls
          ref={pointerControls}
          camera={playerCamera}
          domElement={canvas}
          selector=".game canvas, .start-game"
          onLock={handleLock}
          onUnlock={handleUnlock}
        />
      )}

      <PlayerController
        camera={playerCamera}
        controlsRef={pointerControls}
        mode={mode}
        player={player}
        world={world}
        physics={physics}
        onSelectBlock={onActiveBlockChange}
        onStatusChange={onStatusChange}
        onPositionChange={onPositionChange}
        onDebugRequest={handleDebugRequest}
      />
      <BlockSelection
        camera={playerCamera}
        world={world}
        worldRef={worldRef}
        player={player}
        isPlaying={isPlaying}
      />
      {debug.camera && playerCamera && <CameraDebug camera={playerCamera} />}
      {debug.physics && <PhysicsDebug physics={physics} />}
      <DebugPanel
        world={world}
        player={player}
        debugOptions={debugOptions}
        onDebugChange={setDebug}
        onStatusChange={onStatusChange}
      />
    </>
  );
}

export default memo(GameScene);
