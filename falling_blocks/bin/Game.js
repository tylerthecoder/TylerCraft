"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Game {
    constructor() {
        this.players = new Map();
    }
    newPlayer(ws) {
        const uid = `${Math.random()}${Math.random()}`;
        const newPlayer = {
            uid,
            ws,
            pos: [0, 0, 0]
        };
        this.players.set(ws, newPlayer);
        return uid;
    }
    removePlayer(ws) {
        this.players.delete(ws);
    }
    getPlayerUid(ws) {
        return this.players.get(ws).uid;
    }
    setPlayerPos(ws, pos) {
        const player = this.players.get(ws);
        player.pos = pos;
    }
    get allPlayers() {
        return Array.from(this.players.values());
    }
}
exports.Game = Game;
//# sourceMappingURL=Game.js.map