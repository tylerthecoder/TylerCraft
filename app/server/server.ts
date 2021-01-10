import express from "express";
import TylerCraftApp from "./app";
import * as wSocket from "ws";
import { MongoClient } from "mongodb";

const port = 3000;
export const app = express();

app.use(express.urlencoded({ extended: false }))
app.use(express.json({ limit: "50mb" }));

TylerCraftApp.addRoutes(app);

export const server = app.listen(port, () => console.log(`Server running on port ${port}`));

const wss = new wSocket.Server({ server });

TylerCraftApp.setupSocketServer(wss);

const start = async () => {
  const URI = process.env.DB_URL as string;
  // create the mongo client
  const client = await MongoClient.connect(URI, {
    // useNewUrlParser: true,
    useUnifiedTopology: true,
    // useCreateIndex: true,
    // useFindAndModify: true,
  });

  TylerCraftApp.main(client);
}


start();

