import { ISocketMessage, } from "../src/types";

export type SocketListener = (message: ISocketMessage) => void;

export class SocketHandler {
  private socket: WebSocket;
  private listeners: SocketListener[] = [];

  private get wssUrl() {
    const url = new URL(location.href);
    const protocol = url.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${url.host}?app=tylercraft`;
  }

  connect() {
    return new Promise<void>(resolve => {
      this.socket = new WebSocket(this.wssUrl);
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
