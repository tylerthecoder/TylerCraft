import * as wSocket from "ws";
import { ISocketMessage } from "../src/types";

type ConnectionListener = (ws: wSocket) => void;
type MessageListener = (message: ISocketMessage) => void;

export default class SocketServer {
  connectionListeners: ConnectionListener[] = [];

  constructor(
    private server: wSocket.Server
  ) {
    this.server.on("connection", this.newConnection.bind(this));
  }

  listenForConnection(listener: ConnectionListener): void {
    this.connectionListeners.push(listener);
  }

  newConnection(ws: wSocket): void {
    this.connectionListeners.forEach(func => {
      func(ws);
    });
  }

  listenTo(ws: wSocket, func: MessageListener): void {
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

  send(ws: wSocket, message: ISocketMessage): void {
    ws.send(JSON.stringify(message));
  }
}
