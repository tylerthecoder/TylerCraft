import { SOCKET_SERVER_URL } from "./clientConfig";
import { ISocketMessage, } from "../src/types";

export type SocketListener = (message: ISocketMessage) => void;

export class SocketHandler {
  private socket: WebSocket;
  private listeners: SocketListener[] = [];

  connect() {
    return new Promise<void>(resolve => {
      this.socket = new WebSocket(SOCKET_SERVER_URL);
      this.socket.onopen = () => {
        console.log("Socket Connected");
        resolve();
        this.startListening();
      };
    });
  }

  addListener(listener: SocketListener) {
    this.listeners.push(listener);
  }

  removeListener(listener: SocketListener) {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  send(obj: ISocketMessage) {
    this.socket.send(JSON.stringify(obj));
  }

  startListening() {
    this.socket.onmessage = e => {
      const message = JSON.parse(e.data) as ISocketMessage;
      // console.log("Message from server", message);
      this.listeners.forEach(l => l(message));
    };
  }
}
