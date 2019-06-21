"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Players {
    constructor(wss) {
        this.wss = wss;
        this.players = new Map();
        this.wss.listen(this.newPlayer.bind(this));
    }
    get playersArray() {
        return Array.from(this.players.values());
    }
    newPlayer(ws) {
        console.log("New Player!");
        const uid = `${Math.random()}${Math.random()}`;
        const welcomeMessage = {
            type: "welcome",
            payload: {
                uid,
                players: this.playersArray.map(p => p.uid)
            }
        };
        this.wss.send(ws, welcomeMessage);
        const newPlayer = {
            uid,
            ws,
            pos: [0, 0, 0]
        };
        this.players.set(ws, newPlayer);
        this.wss.listenTo(ws, this.onMessage.bind(this));
        const newPlayerMessage = {
            type: "player-join",
            payload: {
                uid
            }
        };
        this.wss.sendGlobal(newPlayerMessage, ws);
        ws.on("close", this.removePlayer.bind(this, ws));
    }
    removePlayer(ws) {
        const playerLeaveMessage = {
            type: "player-leave",
            payload: {
                uid: this.players.get(ws).uid
            }
        };
        this.wss.sendGlobal(playerLeaveMessage, ws);
        this.players.delete(ws);
    }
    onMessage(ws, message) {
        switch (message.type) {
            case "keys":
                this.wss.sendGlobal(message, ws);
                break;
            case "pos":
                this.wss.sendGlobal(message, ws);
                const payload = message.payload;
                this.players.get(ws).pos = payload.pos;
        }
    }
}
exports.default = Players;
//# sourceMappingURL=players.js.map