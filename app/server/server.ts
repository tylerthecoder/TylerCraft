import * as path from "path";
import express from "express";
import * as db from "./db";
import SocketServer from "./socket";
import { WorldManager } from "./worldManager";

const port = 3000;
const staticPath = "../../public";
export const app = express();

app.use(express.urlencoded({ extended: false }))
app.use(express.json({ limit: "50mb" }));

app.get("/worlds", async (req, res) => {
  const worlds = await worldManager.getAllWorlds();
  res.send(worlds);
});

app.use(express.static(path.join(__dirname, staticPath)));

export const server = app.listen(port, () => console.log(`Server running on port ${port}`));

export const SocketInterface = new SocketServer(server);
let worldManager: WorldManager;

async function main() {
  await db.connect();
  worldManager = new WorldManager();
}

main();
