import { ISocketMessageType, SocketMessage } from "@craft/engine";
import { AppConfig } from "./appConfig";

export type SocketListener = (message: SocketMessage) => void;

export class SocketHandler {
  private socket: WebSocket | null = null;
  private listeners: SocketListener[] = [];

  private get wssUrl() {
    const url = new URL(AppConfig.api.baseUrl);
    const protocol = url.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${url.host}?app=tylercraft`;
  }

  connect(onClose: () => void) {
    console.log("Connecting to socket", this.wssUrl);
    return new Promise<void>((resolve) => {
      this.socket = new WebSocket(this.wssUrl);
      this.socket.onopen = () => {
        console.log("Socket Connected");
        resolve();
        this.startListening();
      };

      this.socket.onclose = () => {
        console.log("Socket Closed");
        onClose();
      };
    });
  }

  addListener(listener: SocketListener) {
    this.listeners.push(listener);
  }

  removeListener(listener: SocketListener) {
    this.listeners = this.listeners.filter((l) => l !== listener);
  }

  send(obj: SocketMessage) {
    if (!this.socket) {
      throw new Error("Socket is not connected");
    }
    this.socket.send(JSON.stringify(obj.getDto()));
  }

  startListening() {
    if (!this.socket) {
      throw new Error("Socket is not connected");
    }
    this.socket.onmessage = (e) => {
      const message = JSON.parse(e.data) as unknown;

      if (
        typeof message !== "object" ||
        !message ||
        !("type" in message) ||
        typeof message.type !== "string" ||
        !("data" in message)
      ) {
        console.log("Invalid message", message);
        return;
      }

      const holder = new SocketMessage(
        message.type as ISocketMessageType,
        message.data as any
      );

      console.log("Message from server", message);
      this.listeners.forEach((l) => l(holder));
    };
  }
}
