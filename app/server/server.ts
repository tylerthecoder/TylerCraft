import * as path from "path";
import express from "express";
import bodyParser from "body-parser";
import { ISerializedGame } from "../src/game";

const port = 3000;
const staticPath = "../../public";

export const app = express();

app.use(bodyParser.urlencoded({ extended: false }))

app.use(bodyParser.json({
  limit: "50mb"
}));

app.get("/world/:worldId", async (req, res) => {
  const {worldId} = req.params;
  if (!worldId) {
    res.status(400).send("No worldId");
    return;
  }
  const world = await worldManager.getWorld(worldId as string);
  res.send(world);
});

app.get("/worlds", async (req, res) => {
  const worlds = await worldManager.getAllWorlds();
  res.send(worlds);
});

app.post("/world", (req, res) => {
  console.log("Saving the world");
  const data = req.body as ISerializedGame;
  worldManager.saveWorld(data);
  res.send("World saved");
});

app.use(express.static(path.join(__dirname, staticPath)));


export const server = app.listen(port, () => console.log(`Server running on port ${port}`));

