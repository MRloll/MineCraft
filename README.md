# Minecraft with React Three Fiber

## Run

- `npm install`
- `npm run dev` starts Vite.
- `npm run build` creates the production build.
- `npm test` runs the game logic regression tests.

Click Play or press Enter to lock the mouse. WASD moves, Space jumps, Escape pauses,
and F10 opens the orbit view. Select blocks with 1–8 or the hotbar; 0 selects the
pickaxe. Click to mine or place. F2 saves and F4 loads.

## Structure

- `src/App.jsx` owns HUD state and the R3F Canvas.
- `src/components/GameScene.jsx` composes cameras, controls, lighting, and the world.
- `src/components/world/` renders chunks with declarative instanced meshes, materials,
  geometry, and water. Texture loading uses Drei's cached `useTexture`.
- `src/components/PlayerController.jsx` advances physics and synchronizes the R3F
  player camera. `BlockSelection` uses the R3F raycaster, and `PlayerTool` renders
  the cached GLTF through Drei's `Clone`.
- `src/hooks/` contains keyboard input and status message lifecycles.
- `src/game/` contains voxel data, procedural generation, persistence, movement,
  and collision math. These modules do not create scene objects or use the DOM.

World and chunk stores use `useSyncExternalStore`. Moving between chunks changes
the world snapshot; editing a block invalidates its chunk and any affected seam
neighbors. Only those chunk components rebuild their instance matrices.

R3F owns object creation and disposal. Three.js remains the underlying math and
buffer API: vectors, matrices, noise, and `setMatrixAt` are still needed for
efficient voxel instancing. There is no separate renderer or animation loop.

Saved games use one localStorage entry. Older `mincraft_params` and
`mincraft_data` saves are still readable. Scene and player settings do not
regenerate terrain or clear block edits; the debug panel has an explicit reset action.
