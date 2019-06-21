"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const players_1 = require("./players");
class Game {
    constructor(wss) {
        this.wss = wss;
        this.players = new players_1.default(wss);
    }
}
exports.Game = Game;
//# sourceMappingURL=Game.js.map