import { IDim } from "../src";

interface ISocketMessage {
  type: string;
  payload: Payload;
}

type Payload = KeyPressMessage | NewPlayerMessage | WelcomeMessage;

interface KeyPressMessage {
  keys: string[];
  rot: IDim;
  uid: string;
}

interface WelcomeMessage {
  uid: string;
  players: string[];
}

interface NewPlayerMessage {
  uid: string;
}

interface PositionMessage {
  uid: string;
  pos: IDim;
}
