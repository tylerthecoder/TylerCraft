"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const WebSocket = require("ws");
class SocketServer {
    constructor(server) {
        this.connectionListeners = [];
        this.server = new WebSocket.Server({
            server
        });
        this.server.on("connection", this.newConnection.bind(this));
    }
    listen(listener) {
        this.connectionListeners.push(listener);
    }
    newConnection(ws) {
        this.connectionListeners.forEach(func => {
            func(ws);
        });
    }
    listenTo(ws, func) {
        ws.on("message", (data) => {
            try {
                const message = JSON.parse(data);
                func(ws, message);
            }
            catch {
                console.log("Error parsing JSON");
            }
        });
    }
    send(ws, message) {
        ws.send(JSON.stringify(message));
    }
    sendGlobal(message, exclude) {
        this.server.clients.forEach(client => {
            if (exclude && client === exclude)
                return;
            this.send(client, message);
        });
    }
}
exports.default = SocketServer;
//# sourceMappingURL=socket.js.map