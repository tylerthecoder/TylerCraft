import * as wSocket from "ws";
import { Server } from "http";
import { ISocketMessage } from "../types/socket";

// TODO: Handle pinging the clients

type ConnectionListener = (ws: wSocket) => void;
type MessageListener = (ws: wSocket, message: ISocketMessage) => void;

export default class SocketServer {
  server: wSocket.Server;

  connectionListeners: ConnectionListener[] = [];

  constructor(server: Server) {
    this.server = new wSocket.Server({
      server
    });
    this.server.on("connection", this.newConnection.bind(this));
  }

  listen(listener: ConnectionListener) {
    this.connectionListeners.push(listener);
  }

  newConnection(ws: wSocket) {
    this.connectionListeners.forEach(func => {
      func(ws);
    });
  }

  listenTo(ws: wSocket, func: MessageListener) {
    ws.on("message", (data: string) => {
      let message: ISocketMessage;
      try {
        message = JSON.parse(data) as ISocketMessage;
      } catch {
        console.log("Error parsing JSON");
      }
      func(ws, message);
    });
  }

  send(ws: wSocket, message: ISocketMessage) {
    ws.send(JSON.stringify(message));
  }

  sendGlobal(message: ISocketMessage, exclude?: wSocket) {
    this.server.clients.forEach(client => {
      if (exclude && client === exclude) return;
      this.send(client as wSocket, message);
    });
  }
}
