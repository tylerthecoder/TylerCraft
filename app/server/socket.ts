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

  listen(listener: ConnectionListener): void {
    this.connectionListeners.push(listener);
  }

  newConnection(ws: wSocket):void  {
    this.connectionListeners.forEach(func => {
      func(ws);
    });
  }

  listenTo(ws: wSocket, func: MessageListener): void {
    ws.on("message", (data: string) => {
      try {
        const message = JSON.parse(data) as ISocketMessage;
        func(ws, message);
      } catch {
        console.log("Error parsing JSON");
      }
    });
  }

  send(ws: wSocket, message: ISocketMessage): void {
    ws.send(JSON.stringify(message));
  }

  sendGlobal(message: ISocketMessage, exclude?: wSocket): void {
    this.server.clients.forEach(client => {
      if (exclude && client === exclude) return;
      this.send(client as wSocket, message);
    });
  }
}
