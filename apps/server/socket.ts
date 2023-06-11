import WebSocket from "ws";
import { IncomingMessage } from "http";
import URL from "url";
import { ISocketMessage } from "@craft/engine";

type ConnectionListener = (ws: WebSocket) => void;
type MessageListener = (message: ISocketMessage) => void;

export default class SocketServer {
  connectionListeners: ConnectionListener[] = [];

  constructor(
    private server: WebSocket.WebSocketServer
  ) {
    this.server.on("connection", this.newConnection.bind(this));
  }

  listenForConnection(listener: ConnectionListener): void {
    this.connectionListeners.push(listener);
  }

  newConnection(ws: WebSocket, request: IncomingMessage): void {
    const queryParams = URL.parse(request.url!, true).query;

    // only accept socket connections if they were meant for me
    if (queryParams["app"] !== "tylercraft") {
      return;
    }

    console.log("Tylercraft socket connection");

    this.connectionListeners.forEach(func => {
      func(ws);
    });
  }

  listenTo(ws: WebSocket, func: MessageListener): void {
    ws.on("message", (data: string) => {
      const message: ISocketMessage | undefined = (() => {
        try {
          return JSON.parse(data) as ISocketMessage;
        } catch {
          console.log("Error parsing JSON");
        }
      })();

      if (message) {
        func(message);
      }

    });
  }

  send(ws: WebSocket, message: ISocketMessage): void {
    ws.send(JSON.stringify(message));
  }
}
