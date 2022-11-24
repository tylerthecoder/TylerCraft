import express from "express";
import TylerCraftApp from "./app.js";
import { WebSocketServer } from "ws";
import {MongoClient} from "mongodb";
import cors from "cors";
import path from "path";


export const PORT = process.env.PORT ?? 3000;
export const DB_URL = process.env.DB_URL;

if (!DB_URL) {
  throw new Error("DB_URL not defined");
}

export const app = express();

app.use(cors());
app.use(express.urlencoded({ extended: false }))
app.use(express.json({ limit: "50mb" }));


// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// Serve the web client
const webClientPath = path.resolve(__dirname, "../../web/client/dist");
console.log("Serving web client. ath", webClientPath)
app.use(express.static(webClientPath));

TylerCraftApp.addRoutes(app);

export const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

console.log(WebSocketServer);

const wss = new WebSocketServer({ server });

const start = async () => {
  console.log("Tyler DB URI", DB_URL);
  // create the mongo client
  const client = await MongoClient.connect(DB_URL, {
    auth: {
      username: "admin",
      password: "admin",
    },
    // useNewUrlParser: true,
    // useUnifiedTopology: true,
    // useCreateIndex: true,
    // useFindAndModify: true,
  });

  TylerCraftApp.main(client, wss);
}


start();

