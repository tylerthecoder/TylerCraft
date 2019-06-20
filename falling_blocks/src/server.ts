import * as http from "http";
import * as fs from "fs";
import * as path from "path";
import * as WebSocket from "ws";
import { Game } from "./Game";

const port = 3000;
const staticPath = "../public/static";

const extToContent: { [ex: string]: string } = {
  js: "text/javascript",
  css: "text/css",
  json: "application/json",
  png: "image/png",
  jpg: "image/jpg",
  html: "text/html"
};

const server = http.createServer((req, res) => {
  let filePath = staticPath + req.url;
  if (filePath === `${staticPath}/` || filePath === ".") {
    filePath += "index.html";
  }

  filePath = path.join(__dirname, filePath);

  const extname = path.extname(filePath).substr(1);
  const contentType =
    extname in extToContent ? extToContent[extname] : "text/html";

  fs.readFile(filePath, function(error, content) {
    if (error) {
      if (error.code == "ENOENT") {
        fs.readFile("./404.html", function(error, content) {
          res.writeHead(200, {
            "Content-Type": contentType
          });
          res.end(content, "utf-8");
        });
      } else {
        res.writeHead(500);
        res.end(
          "Sorry, check with the site admin for error: " + error.code + " ..\n"
        );
        res.end();
      }
    } else {
      res.writeHead(200, {
        "Content-Type": contentType
      });
      res.end(content, "utf-8");
    }
  });
});

server.listen(port, () => console.log(`Server running on port:${port}`));

const game = new Game();

class SocketServer {
  server: WebSocket.Server;

  constructor(server: http.Server) {
    this.server = new WebSocket.Server({
      server
    });
    this.server.on("connection", this.newConnection.bind(this));
  }

  newConnection(ws: WebSocket) {
    console.log("Connection");
    ws.on("message", (message: string) => this.newMessage(ws, message));
    ws.on("close", () => this.closeConnection(ws));

    const uid = game.newPlayer(ws);

    const welcomeMessage = {
      type: "welcome",
      payload: {
        uid,
        players: game.allPlayers.filter(p => p.ws !== ws)
      }
    };
    this.sendMessage(ws, welcomeMessage);

    const newPlayerMessage = {
      type: "player-join",
      payload: {
        uid
      }
    };
    this.sendGlobalMessage(newPlayerMessage, ws);
  }

  closeConnection(ws: WebSocket) {
    const playerLeaveMessage = {
      type: "player-leave",
      payload: {
        uid: game.getPlayerUid(ws)
      }
    };
    this.sendGlobalMessage(playerLeaveMessage, ws);
    game.removePlayer(ws);
  }

  newMessage(ws: WebSocket, message: string) {
    try {
      const data = JSON.parse(message);
      this.handleMessage(ws, data);
    } catch {
      console.log("Invalid JSON message");
    }
  }

  handleMessage(ws: WebSocket, message: ISocketMessage) {
    console.log(message);
    if (message.type === "keys") {
      this.sendGlobalMessage(message, ws);
    } else if (message.type === "pos") {
      this.sendGlobalMessage(message, ws);
      const payload = message.payload as PositionMessage;
      game.setPlayerPos(ws, payload.pos);
    }
  }

  sendMessage(ws: WebSocket, message: ISocketMessage) {
    ws.send(JSON.stringify(message));
  }

  sendGlobalMessage(message: ISocketMessage, exclude?: WebSocket) {
    this.server.clients.forEach(client => {
      if (exclude && client === exclude) return;
      client.send(JSON.stringify(message));
    });
  }
}

const wss = new SocketServer(server);
