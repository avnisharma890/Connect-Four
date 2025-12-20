const Game = require(`./game/Game`);
console.log(require("fs").readdirSync(__dirname));

const game = new Game("player", "bot");

console.log(game.makeMove("X", 0)); // ok
console.log(game.makeMove("O", 0)); // ok
console.log(game.makeMove("X", 1));
console.log(game.makeMove("O", 1));
console.log(game.makeMove("X", 2));
console.log(game.makeMove("O", 2));
console.log(game.makeMove("X", 3)); // X should win here