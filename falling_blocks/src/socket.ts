import * as WebSocket from "ws";
import { Server } from "http";

// TODO: Handle pinging the clients

type ConnectionListener = (ws: WebSocket) => void;
type MessageListener = (ws: WebSocket, message: ISocketMessage) => void;

export default class SocketServer {
  server: WebSocket.Server;

  connectionListeners: ConnectionListener[] = [];

  constructor(server: Server) {
    this.server = new WebSocket.Server({
      server
    });
    this.server.on("connection", this.newConnection.bind(this));
  }

  listen(listener: ConnectionListener) {
    this.connectionListeners.push(listener);
  }

  newConnection(ws: WebSocket) {
    this.connectionListeners.forEach(func => {
      func(ws);
    });
  }

  listenTo(ws: WebSocket, func: MessageListener) {
    ws.on("message", (data: string) => {
      try {
        const message = JSON.parse(data) as ISocketMessage;
        func(ws, message);
      } catch {
        console.log("Error parsing JSON");
      }
    });
  }

  send(ws: WebSocket, message: ISocketMessage) {
    ws.send(JSON.stringify(message));
  }

  sendGlobal(message: ISocketMessage, exclude?: WebSocket) {
    this.server.clients.forEach(client => {
      if (exclude && client === exclude) return;
      this.send(client, message);
    });
  }
}
