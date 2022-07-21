import express from "express";
import TylerCraftApp from "./app";
import * as wSocket from "ws";
import { MongoClient } from "mongodb";
import cors from "cors";

export const PORT = process.env.PORT ?? 3000;
export const DB_URL = process.env.DB_URL as string;

if (!DB_URL) {
  throw new Error("DB_URL not defined");
}

export const app = express();

app.use(cors());
app.use(express.urlencoded({ extended: false }))
app.use(express.json({ limit: "50mb" }));

app.use(express.static("dist/public"));

TylerCraftApp.addRoutes(app);

export const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

const wss = new wSocket.Server({ server });

const start = async () => {
  // create the mongo client
  const client = await MongoClient.connect(DB_URL, {
    // useNewUrlParser: true,
    useUnifiedTopology: true,
    // useCreateIndex: true,
    // useFindAndModify: true,
  });

  TylerCraftApp.main(client, wss);
}


start();

