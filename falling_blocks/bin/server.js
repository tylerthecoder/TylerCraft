"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");
const Game_1 = require("./Game");
const port = 3000;
const staticPath = "../public/static";
const extToContent = {
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
    const contentType = extname in extToContent ? extToContent[extname] : "text/html";
    fs.readFile(filePath, function (error, content) {
        if (error) {
            if (error.code == "ENOENT") {
                fs.readFile("./404.html", function (error, content) {
                    res.writeHead(200, {
                        "Content-Type": contentType
                    });
                    res.end(content, "utf-8");
                });
            }
            else {
                res.writeHead(500);
                res.end("Sorry, check with the site admin for error: " + error.code + " ..\n");
                res.end();
            }
        }
        else {
            res.writeHead(200, {
                "Content-Type": contentType
            });
            res.end(content, "utf-8");
        }
    });
});
server.listen(port, () => console.log(`Server running on port:${port}`));
const game = new Game_1.Game();
class SocketServer {
    constructor(server) {
        this.server = new WebSocket.Server({
            server
        });
        this.server.on("connection", this.newConnection.bind(this));
    }
    newConnection(ws) {
        console.log("Connection");
        ws.on("message", (message) => this.newMessage(ws, message));
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
    closeConnection(ws) {
        const playerLeaveMessage = {
            type: "player-leave",
            payload: {
                uid: game.getPlayerUid(ws)
            }
        };
        this.sendGlobalMessage(playerLeaveMessage, ws);
        game.removePlayer(ws);
    }
    newMessage(ws, message) {
        try {
            const data = JSON.parse(message);
            this.handleMessage(ws, data);
        }
        catch {
            console.log("Invalid JSON message");
        }
    }
    handleMessage(ws, message) {
        console.log(message);
        if (message.type === "keys") {
            this.sendGlobalMessage(message, ws);
        }
        else if (message.type === "pos") {
            this.sendGlobalMessage(message, ws);
            const payload = message.payload;
            game.setPlayerPos(ws, payload.pos);
        }
    }
    sendMessage(ws, message) {
        ws.send(JSON.stringify(message));
    }
    sendGlobalMessage(message, exclude) {
        this.server.clients.forEach(client => {
            if (exclude && client === exclude)
                return;
            client.send(JSON.stringify(message));
        });
    }
}
const wss = new SocketServer(server);
//# sourceMappingURL=server.js.map