import { useEffect } from "react";
import GUI from "lil-gui";
import { useThree } from "@react-three/fiber";
import { resources } from "../game/blocks.js";

export default function DebugPanel({ world, player, debugOptions, onDebugChange, onStatusChange }) {
  const scene = useThree((state) => state.scene);

  useEffect(() => {
    const gui = new GUI({ title: "World settings" });
    gui.close();
    const regenerate = () => world.generate();
    const range = (folder, object, key, min, max, step, label) => {
      const controller = folder.add(object, key, min, max, step).name(label);
      controller.onFinishChange(regenerate);
      return controller;
    };

    const sceneFolder = gui.addFolder("Scene");
    const near = sceneFolder.add(scene.fog, "near", 1, 199, 1).name("Fog near");
    const far = sceneFolder.add(scene.fog, "far", 2, 200, 1).name("Fog far");
    near.onChange(() => {
      scene.fog.far = Math.max(scene.fog.far, scene.fog.near + 1);
      far.updateDisplay();
    });
    far.onChange(() => {
      scene.fog.near = Math.min(scene.fog.near, scene.fog.far - 1);
      near.updateDisplay();
    });

    const playerFolder = gui.addFolder("Player");
    playerFolder.add(player, "maxSpeed", 1, 20).name("Speed");
    const updateDebug = () => onDebugChange({ ...debugOptions });
    playerFolder.add(debugOptions, "camera").name("Camera helper").onChange(updateDebug);
    playerFolder.add(debugOptions, "physics").name("Collision helpers").onChange(updateDebug);

    const terrain = gui.addFolder("Terrain");
    terrain.add(world, "asyncLoading").name("Async loading");
    terrain.add(world, "drawDistance", 0, 5, 1).name("Draw distance")
      .onFinishChange(() => world.update(player.position));
    range(terrain, world.params, "seed", 0, 100, 1, "Seed");
    range(terrain, world.params.terrain, "scale", 10, 100, 1, "Scale");
    range(terrain, world.params.terrain, "magnitude", 0, 1, 0.01, "Magnitude");
    range(terrain, world.params.terrain, "offset", 0, 1, 0.01, "Offset");
    range(terrain, world.params.terrain, "waterOffset", 0, 10, 1, "Water level");

    const resourceFolder = terrain.addFolder("Resources");
    for (const resource of resources) {
      const settings = world.params.resources[resource.name];
      const folder = resourceFolder.addFolder(resource.label);
      range(folder, settings, "scarcity", 0, 1, 0.01, "Scarcity");
      for (const axis of ["x", "y", "z"]) range(folder, settings.scale, axis, 1, 100, 1, axis + " scale");
    }

    const trees = terrain.addFolder("Trees");
    range(trees, world.params.trees, "frequency", 0, 0.1, 0.001, "Frequency");
    range(trees, world.params.trees.trunk, "minHeight", 0, 10, 1, "Min trunk height");
    range(trees, world.params.trees.trunk, "maxHeight", 0, 10, 1, "Max trunk height");
    range(trees, world.params.trees.canopy, "minRadius", 0, 10, 1, "Min canopy radius");
    range(trees, world.params.trees.canopy, "maxRadius", 0, 10, 1, "Max canopy radius");
    range(trees, world.params.trees.canopy, "density", 0, 1, 0.01, "Canopy density");
    const clouds = terrain.addFolder("Clouds");
    range(clouds, world.params.clouds, "scale", 1, 100, 1, "Scale");
    range(clouds, world.params.clouds, "density", 0, 1, 0.01, "Density");

    const actions = {
      save: () => onStatusChange(world.save()),
      load: () => onStatusChange(world.load()),
      resetEdits: () => world.generate(true),
    };
    gui.add(actions, "save").name("Save game");
    gui.add(actions, "load").name("Load game");
    gui.add(actions, "resetEdits").name("Reset block edits");

    const unsubscribe = world.subscribe(() => {
      gui.controllersRecursive().forEach((controller) => controller.updateDisplay());
    });
    return () => {
      unsubscribe();
      gui.destroy();
    };
  }, [debugOptions, onDebugChange, onStatusChange, player, scene, world]);

  return null;
}
