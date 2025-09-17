const CELL_SIZE = 16;
const COLUMN_COUNT = 20;
const ROW_COUNT = 15;

class Game {
  constructor() {
    this.cellSize = CELL_SIZE;
    this.columnCount = COLUMN_COUNT;
    this.rowCount = ROW_COUNT;
    this.interval = null;
    this.food = null;
    this.running = false;
    this.canvas = document.querySelector("#canvas");
    this.ctx = this.canvas.getContext("2d");
    this.entities = [];

    window.addEventListener("keydown", (event) => {
      switch (event.key) {
        case "ArrowUp":
          console.log("hoch");
          break;
        case "ArrowDown":
          console.log("runter");
          break;
        case "ArrowLeft":
          console.log("links");
          break;
        case "ArrowRight":
          console.log("rechts");
          break;
      }
    });

    document.querySelector("#start").addEventListener("click", () => {
      this.start();
    });

    document.querySelector("#stop").addEventListener("click", () => {
      this.stop();
    });

    window.addEventListener("keydown", (e) => {
      if (!this.entities) return;

      const snake = this.entities.find((entity) => entity.name === "snake");
      if (!snake) return;

      if (e.key === "ArrowUp") {
        snake.setDirection("up");
      } else if (e.key === "ArrowDown") {
        snake.setDirection("down");
      } else if (e.key === "ArrowLeft") {
        snake.setDirection("left");
      } else if (e.key === "ArrowRight") {
        snake.setDirection("right");
      }
    });
  }

  start() {
    if (this.running) {
      return;
    }
    console.log("start");

    this.running = true;

    const snake = new Snake(this.ctx);

    const food = new Food(this.ctx);

    this.entities.push(snake);

    this.entities.push(food);

    this.interval = setInterval(this.update.bind(this), 1000);
  }

  stop() {
    console.log("stop");

    clearInterval(this.interval);
  }

  update() {
    console.log("update");

    this.ctx.clearRect(0, 0, COLUMN_COUNT * CELL_SIZE, ROW_COUNT * CELL_SIZE);

    this.entities.forEach((entity) => {
      if (entity.move) {
        entity.move();
      }

      if (entity.checkCollisions) {
        entity.checkCollisions(
          this.entities.filter((entity) => entity.name !== "snake")
        );
      }
    });

    this.entities = this.entities.filter((entity) => entity.consumed !== true);

    this.entities.forEach((entity) => {
      if (entity.draw) {
        entity.draw();
      }
    });
  }
}
class Food {
  constructor(ctx) {
    this.ctx = ctx;
    this.margin = 1;
    this.foodSize = CELL_SIZE - this.margin * 2;
    this.column = 10;
    this.row = 5;
    this.name = "food";
    this.consumed = false;
  }

  draw() {
    this.ctx.fillStyle = "red";

    this.ctx.beginPath();
    this.ctx.arc(
      this.column * CELL_SIZE + CELL_SIZE / 2,
      this.row * CELL_SIZE + CELL_SIZE / 2,
      CELL_SIZE / 2 - this.margin,
      0,
      2 * Math.PI
    );
    this.ctx.fill();
  }
}

class Snake {
  constructor(ctx) {
    this.ctx = ctx;
    this.margin = 1;
    this.segmentSize = CELL_SIZE - this.margin * 2;
    this.direction = "right";
    this.name = "snake";
    this.body = [
      {
        column: 5,
        row: 5,
      },
      {
        column: 4,
        row: 5,
      },
    ];
  }

  setDirection(newDirection) {
    this.direction = newDirection;
  }

  move() {
    const head = this.body[0];
    const newHead = { column: head.column, row: head.row };

    if (this.direction === "right") {
      newHead.column += 1;
    } else if (this.direction === "up") {
      newHead.row -= 1;
    } else if (this.direction === "down") {
      newHead.row += 1;
    } else if (this.direction === "left") {
      newHead.column -= 1;
    }

    this.body.unshift(newHead);
    this.body.pop();
  }

  checkCollisions(entities) {
    const head = this.body[0];

    entities.forEach((entity) => {
      if (entity.column === head.column && entity.row === head.row) {
        entity.consumed = true;
      }
    });
    if (head.column >= COLUMN_COUNT) {
      game.stop();
    }

    if (head.column < 0) {
      game.stop();
    }

    if (head.row >= ROW_COUNT) {
      game.stop();
    }

    if (head.row < 0) {
      game.stop();
    }
  }

  draw() {
    this.ctx.fillStyle = "white";

    this.body.forEach((segment) => {
      this.ctx.fillRect(
        segment.column * CELL_SIZE + this.margin,
        segment.row * CELL_SIZE + this.margin,
        this.segmentSize,
        this.segmentSize
      );
    });
  }
}

const game = new Game();
