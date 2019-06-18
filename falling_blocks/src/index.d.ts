interface ISocketMessage {
  type: string;
  payload: Payload;
}

type Payload = KeyPressMessage | NewPlayerMessage | WelcomeMessage;

interface KeyPressMessage {
  keys: string[];
  uid: string;
}

interface WelcomeMessage {
  uid: string;
  players: string[];
}

interface NewPlayerMessage {
  uid: string;
}
