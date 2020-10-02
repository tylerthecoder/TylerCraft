import { ISocketMessage, } from "../types/socket";

export type SocketListener = (message: ISocketMessage) => void;

export class SocketHandler {
  private socket: WebSocket;
  private socketUrl = `ws://${location.hostname}:3000`;
  private listeners: SocketListener[] = [];

  connect() {
    return new Promise(resolve => {
      this.socket = new WebSocket(this.socketUrl);
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
