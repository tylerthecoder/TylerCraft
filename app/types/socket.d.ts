import { IDim, IAction } from ".";

interface ISocketMessage {
  type: string;
  payload: Payload;
  uid?: string;
  actionPayload?: IAction[];
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

interface NewEntityMessage {
  uid: string;
  type: string;
  pos: IDim;
  vel: IDim;
}

interface PositionMessage {
  uid: string;
  pos: IDim;
}
