import { IDim } from ".";

export interface ISocketMessage {
  type: string;
  payload: Payload;
}

export type Payload = KeyPressMessage | NewPlayerMessage | WelcomeMessage;

export interface KeyPressMessage {
  keys: string[];
  rot: IDim;
  uid: string;
}

export interface WelcomeMessage {
  uid: string;
  players: string[];
}

export interface NewPlayerMessage {
  uid: string;
}

export interface PositionMessage {
  uid: string;
  pos: number[];
}

export class SocketHandler {
  static socket: WebSocket;
  static connected: boolean;

  static connections: SocketHandler[] = [];

  constructor(
    public catcher?: (message: ISocketMessage) => void,
    public filter?: (message: ISocketMessage) => boolean
  ) {
    if (!SocketHandler.socket) {
      SocketHandler.connect();
    }
    SocketHandler.connections.push(this);
  }

  static startListening() {
    SocketHandler.socket.onmessage = e => {
      const data = e.data;
      const obj = JSON.parse(data) as ISocketMessage;
      SocketHandler.connections.forEach(listener => {
        if (listener.catcher) {
          listener.catcher(obj);
        }
      });
    };
  }

  static connect() {
    SocketHandler.socket = new WebSocket("ws://localhost:3000");
    SocketHandler.socket.onopen = () => {
      console.log("Socket Connected");
      SocketHandler.connected = true;
      SocketHandler.startListening();
    };
  }

  static joinRoom(roomName: string) {}

  static send(obj: Object) {
    SocketHandler.socket.send(JSON.stringify(obj));
  }
}
