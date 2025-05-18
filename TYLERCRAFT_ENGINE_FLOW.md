# Understanding Player Action and Game Script Flows in Your Game Engine

## 1. Introduction

Your game engine appears to follow a common pattern where a high-performance core (written in Rust and compiled to WebAssembly, in `@craft/rust-world`) handles the main game logic, physics, and world state. The TypeScript code, particularly in `lib/engine/src/wrappers.ts`, serves as a bridge or wrapper layer. Its primary role is to provide a more convenient and type-safe API for the client-side JavaScript/TypeScript codebase to interact with the Wasm module. This involves sending commands (like player actions) to the Wasm module and retrieving game state from it.

## 2. Player Action Flow

This describes how player actions (e.g., jumping, rotating view) are intended to be processed from initiation in TypeScript to execution in Rust, and how the game state is updated.

### 2.1. Action Creation (TypeScript Side - in `GameWrapper`)

*   **Intention:** Your `GameWrapper` class in `wrappers.ts` has methods like `makeJumpAction(entityId)` and `makeRotateAction(entityId, x, y)`. These are designed to create action objects that can be understood by the Rust game engine.
*   **Current Implementation & Problem:**
    *   `makeJumpAction` tries to return `WorldWasm.PlayerJumpAction.new(entityId)`.
    *   `makeRotateAction` tries to return `WorldWasm.PlayerRotAction.new(entityId, rotDiff)`.
    *   The linter errors indicate that `WorldWasm.PlayerJumpAction` and `WorldWasm.PlayerRotAction` (and their `.new` methods) are not found within the imported `WorldWasm` module. This is a key reason for the current broken state.
*   **Correct Mechanism (Revealed by Rust Code Analysis):**
    *   The Rust codebase (specifically `player_jump_script.rs` and `player_rot_script.rs`) defines structs `JumpAction` and `RotateAction`. Each of these has a Wasm-exposed static method:
        *   `JumpAction::make_wasm(entityId: EntityId) -> EntityActionDto`
        *   `RotateAction::make_wasm(entityId: EntityId, rot_diff: SphericalRotation) -> EntityActionDto`
    *   These `make_wasm` functions are the correct way to create the action DTOs (Data Transfer Objects). The TypeScript code needs to call these (e.g., `WorldWasm.JumpAction.make_wasm(...)` and `WorldWasm.RotateAction.make_wasm(...)`). However, the linter errors suggest that `WorldWasm.JumpAction` and `WorldWasm.RotateAction` themselves are not being found as direct exports of the `WorldWasm` module. This points to an issue with how these Rust structs/methods are exposed or named in the generated Wasm bindings. You would need to consult the `.d.ts` typings file for `@craft/rust-world` to see the exact JavaScript interface.

### 2.2. Action Handling (TypeScript to Rust)

*   **Intention:** Once an action DTO is created, it's passed to `GameWrapper.handleAction(action: WorldWasm.EntityActionDto)`.
*   **Current Implementation & Problem:**
    *   Inside `handleAction`, there's an attempt to `action.clone()`. The linter error `Property 'clone' does not exist on type 'EntityActionDto'` indicates that the `EntityActionDto` type exposed from Wasm does not have a `clone` method.
    *   The method then calls `this.game.handle_action_wasm(newAction)`.
*   **Correct Mechanism:**
    *   The Rust `Game::handle_action_wasm(action: EntityActionDto)` method does exist and expects an `EntityActionDto`. The TypeScript side should pass the action directly without cloning, unless a `clone` method is explicitly exposed from Rust for `EntityActionDto`. The Rust method takes ownership or processes the DTO as is.

### 2.3. Action Processing (Rust/Wasm Side - Internal Engine Logic)

*   **Mechanism:**
    1.  When `Game::handle_action_wasm` in Rust receives an `EntityActionDto`, it stores this action (e.g., in a queue or list called `action_holder`).
    2.  The main game loop in Rust is driven by `Game::update_wasm()` (which is called by `GameWrapper.update()` from TypeScript).
    3.  During this update cycle, the Rust engine iterates through the stored actions.
    4.  For each `EntityActionDto`, the engine uses a system of `EntityActionHandler`s. It identifies the correct handler based on the action's type (e.g., a "Jump-Action" string identifier for `JumpAction`).
    5.  The `handle_dto(&self, entity: &mut Entity, data: &EntityActionDto)` method of the matched Rust handler is then executed. This is where the actual game logic for the action occurs—modifying the components of the target entity (e.g., changing its `Velocity` component for a jump, or its `SphericalRotation` component for a rotation).

### 2.4. State Update & Retrieval (Rust to TypeScript)

*   **Intention:** After the Rust engine processes actions and updates the internal game state, the TypeScript side needs to be able to fetch this new state.
*   **Current Implementation & Problem:**
    *   `GameWrapper.getPlayer(uid: number)`:
        *   Tries to use `this.game.get_player_wasm(uid)` and `this.game.get_player_rot_script_wasm(uid)`.
        *   It expects `get_player_wasm` to return something compatible with a `WorldWasm.Player` type, which the linter says is not exported.
        *   `get_player_rot_script_wasm` is also reported as missing.
        *   The `PlayerWrapper` constructor is called with two arguments (`player`, `rot_script`), but it's defined to take only one in its current form (or needs to be adapted to the actual data from Wasm).
    *   `GameWrapper.getEntities(): PlayerWrapper[]`:
        *   Tries to use `this.game.get_entities_wasm()`.
        *   This method is reported as missing.
*   **Correct Mechanism (Revealed by Rust Code Analysis):**
    *   The Rust `Game` struct exposes:
        *   `get_player_wasm(player_id: EntityId) -> Result<JsValue, Error>`: This returns a JavaScript value (via `serde_wasm_bindgen`) representing a serialized `WasmPlayer` Rust struct. This `WasmPlayer` struct contains fields like `pos`, `vel` (velocity), `rot` (SphericalRotation), and `moving_direction`.
        *   `get_players_wasm() -> Result<JsValue, Error>`: This returns a JavaScript value representing a serialized list (`Vec<WasmPlayer>`) of all players.
    *   The TypeScript `PlayerWrapper` needs to be constructed using the data from this `WasmPlayer` structure. The concept of a separate `rot_script` is likely obsolete, as rotation is part of `WasmPlayer`.

## 3. Game Script Flow (`onDiff` Callback)

This describes how custom TypeScript game logic is intended to react to changes in the game state managed by the Rust engine.

### 3.1. Defining a Game Script (TypeScript Side)

*   **Mechanism:** You have a `GameScript` interface in `lib/engine/src/game-script.js` (or defined in `wrappers.ts`):
    ```typescript
    export interface GameScript {
      onDiff: (diff: GameDiff) => void;
    }
    ```
    And `GameDiff` is defined as:
    ```typescript
    export type GameDiff = {
      updated_entities: number[];
      updated_chunks: number[];
    };
    ```
*   This allows users to create objects in TypeScript that implement `GameScript`, providing an `onDiff` method to handle notifications about game state changes.

### 3.2. Registering the Script (TypeScript to Rust)

*   **Intention:** `GameWrapper.makeAndAddGameScript(script: GameScript)` is responsible for this.
*   **Current Implementation & Problem:**
    1.  It correctly creates a Wasm-compatible script object using `WorldWasm.WasmGameScript.make(script)`. The Rust `WasmGameScript::make` function exists and is designed to take the JavaScript `script` object and store its `onDiff` function.
    2.  It then attempts to call `this.game.add_game_script_wasm(wasmScript)`.
    3.  **Problem:** The linter error `Property 'add_game_script_wasm' does not exist on type 'Game'` is critical. The Rust code analysis showed that the `add_game_script_wasm` function in `game.rs` was commented out. This means there's currently no way to actually register the created `WasmGameScript` with the Rust game engine.
*   **Correct Mechanism:** The `add_game_script_wasm` function (or an equivalent) needs to be present and functional in the Rust Wasm bindings. This function would take the `WasmGameScript` and store it within the Rust `Game` instance.

### 3.3. Triggering `onDiff` (Rust/Wasm Side - Intended Logic)

*   **Intended Mechanism (based on commented-out Rust code in `game.rs` for `WasmGameScript`):**
    1.  As the Rust game engine runs (likely during or after `Game::update_wasm`), if there are significant state changes (e.g., entities updated, chunks loaded/modified), the engine would identify these.
    2.  It would construct a `GameDiff` object (similar to the TypeScript type) detailing these changes.
    3.  The engine would then iterate through all registered `WasmGameScript` instances.
    4.  For each script, it would invoke the stored JavaScript `onDiff` function (referred to as `on_diff_jsfn` in the Rust snippets), passing the serialized `GameDiff` object as an argument.

### 3.4. Reacting to Diffs (TypeScript Side)

*   **Intention:** When the Rust engine calls the `onDiff` JavaScript function, the corresponding `onDiff` method of the user's `GameScript` object in TypeScript executes. This allows custom client-side game logic to react to these diffs, for example, by updating UI elements, triggering sounds, or modifying client-side representations of game objects.
*   **Current Status:** This entire callback flow is non-functional primarily because scripts cannot be registered due to the missing `add_game_script_wasm` Wasm export.

## 4. Conclusion and Path Forward

The core architecture of your game, with a Rust Wasm backend and TypeScript wrappers, is sound. However, `lib/engine/src/wrappers.ts` is currently out of sync with the actual API exposed by your `@craft/rust-world` Wasm module. This desynchronization is the root cause of most of the linter errors and runtime issues.

To get your engine working as intended:

1.  **Inspect Wasm Bindings:** The most crucial step is to examine the generated JavaScript glue code (`*.js`) and, more importantly, the TypeScript definition file (`*.d.ts`) that `wasm-pack` (or your Wasm build tool) produces for the `@craft/rust-world` package. This will provide the definitive source of truth for what functions, classes, and types are actually exported by the Wasm module and how they are named and structured in JavaScript/TypeScript.
2.  **Align `wrappers.ts`:**
    *   **Action Creation:** Update `makeJumpAction` and `makeRotateAction` to use the correct exported Wasm functions/methods for creating `EntityActionDto`s (as revealed by your `.d.ts` file).
    *   **Action Handling:** Remove the `action.clone()` call in `handleAction` unless your Wasm module explicitly provides a clonable `EntityActionDto` with a `clone` method.
    *   **Player Data:** Modify `PlayerWrapper` and the logic in `getPlayer` and `getEntities` to correctly use `get_player_wasm` and `get_players_wasm`, and to accurately map the data from the Rust `WasmPlayer` struct (or its JS equivalent) to your `PlayerWrapper` instances.
    *   **Game Scripts:** For the `GameScript` `onDiff` system to work, the `add_game_script_wasm` function (or an equivalent) must be correctly implemented in your Rust code (`Game::add_script` seems to exist in Rust but isn't properly exposed to Wasm for adding JS game scripts) and exposed through `#[wasm_bindgen]`.
3.  **Address Minor Issues:** Clean up any remaining linter errors, such as formatting issues.

By systematically comparing the Wasm module's actual API (from its `.d.ts` file) with the code in `wrappers.ts` and making the necessary adjustments, you can resolve the current errors and restore the intended functionality of your game's action and event systems.