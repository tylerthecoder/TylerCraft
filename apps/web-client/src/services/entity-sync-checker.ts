import { Game } from "@craft/rust-world";
import { SerializedEntities } from "@craft/engine";

function getPositionFromComponents(
  components: [string, string][]
): { x: number; y: number; z: number } | null {
  const posComponent = components.find(([name]) =>
    name.includes("FineWorldPos")
  );
  if (!posComponent) return null;
  return JSON.parse(posComponent[1]);
}

/**
 * Entity sync checker for comparing client and server entity states.
 * Useful for debugging multiplayer synchronization issues.
 */
export class EntitySyncChecker {
  private syncCheckInterval: number | null = null;

  constructor(
    private game: Game,
    private gameId: string,
    private serverUrl: string
  ) {}

  start(intervalMs = 1000) {
    if (this.syncCheckInterval) {
      this.stop();
    }

    console.log(
      `[Sync] Starting entity sync check every ${intervalMs}ms for game ${this.gameId}`
    );

    this.syncCheckInterval = window.setInterval(async () => {
      await this.checkSync();
    }, intervalMs);
  }

  stop() {
    if (this.syncCheckInterval) {
      clearInterval(this.syncCheckInterval);
      this.syncCheckInterval = null;
      console.log("[Sync] Stopped entity sync check");
    }
  }

  private async checkSync() {
    try {
      const response = await fetch(
        `${this.serverUrl}/game/${this.gameId}/entities`
      );
      if (!response.ok) {
        console.error(
          "[Sync] Failed to fetch server entities:",
          response.statusText
        );
        return;
      }

      const data = (await response.json()) as SerializedEntities;
      const serverEntities = data.entities;

      for (const serverEntity of serverEntities) {
        const localEntity = this.game.getEntityById(serverEntity.id);
        if (!localEntity) {
          console.log(`[Sync] Entity ${serverEntity.id} missing locally`);
          continue;
        }

        const serverPos = getPositionFromComponents(serverEntity.components);
        if (!serverPos) {
          console.log(`[Sync] Entity ${serverEntity.id} missing position`);
          continue;
        }

        // Get local position from the wasm Entity object
        const localPlayer = this.game.getEntityAsPlayer(serverEntity.id);
        if (!localPlayer) {
          console.log(`[Sync] Entity ${serverEntity.id} missing local player`);
          continue;
        }

        const localPos = localPlayer.pos;
        if (!localPos) {
          console.log(
            `[Sync] Entity ${serverEntity.id} missing local position`
          );
          continue;
        }

        const posDiff = Math.sqrt(
          Math.pow(localPos.x - serverPos.x, 2) +
            Math.pow(localPos.y - serverPos.y, 2) +
            Math.pow(localPos.z - serverPos.z, 2)
        );
        console.log("posDiff", posDiff, "for entity", serverEntity.id);

        if (posDiff > 0.01) {
          // Threshold for "different"
          console.log(
            `[Sync] Entity ${serverEntity.id} position diff: ${posDiff.toFixed(
              3
            )}`
          );
          console.log(
            `  Local:  (${localPos.x.toFixed(2)}, ${localPos.y.toFixed(
              2
            )}, ${localPos.z.toFixed(2)})`
          );
          console.log(
            `  Server: (${serverPos.x.toFixed(2)}, ${serverPos.y.toFixed(
              2
            )}, ${serverPos.z.toFixed(2)})`
          );
        }
      }

      // Apply server-authoritative entity state
      this.game.replaceEntities(data);
    } catch (err) {
      console.error("[Sync] Failed to fetch server entities:", err);
    }
  }
}
