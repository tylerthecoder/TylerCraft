import WebSocket from "ws";
import { IncomingMessage } from "http";
import URL from "url";
import { SocketMessage, SocketMessageDto } from "@craft/engine";

type ConnectionListener = (ws: WebSocket) => void;
type MessageListener = (message: SocketMessage) => void;

export default class SocketServer {
  connectionListeners: ConnectionListener[] = [];

  constructor(private server: WebSocket.WebSocketServer) {
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

    this.connectionListeners.forEach((func) => {
      func(ws);
    });
  }

  listenTo(ws: WebSocket, func: MessageListener): void {
    ws.on("message", (data: string) => {
      const message: SocketMessageDto | undefined = (() => {
        try {
          return JSON.parse(data) as SocketMessageDto;
        } catch {
          console.log("Error parsing JSON");
        }
      })();

      if (!message) {
        return;
      }

      const validMessage = new SocketMessage(message.type, message.data);
      func(validMessage);
    });
  }

  send(ws: WebSocket, message: SocketMessage): void {
    ws.send(JSON.stringify(message.getDto()));
  }
}
