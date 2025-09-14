const CELL_SIZE = 16;
const COLUMN_COUNT = 20;
const ROW_COUNT = 15;

class Game {
  constructor() {
    this.cellSize = CELL_SIZE;
    this.columnCount = COLUMN_COUNT;
    this.rowCount = ROW_COUNT;
    this.interval = null;
    this.running = false;
    this.canvas = document.querySelector("#canvas");
    this.ctx = this.canvas.getContext("2d");
    this.entities = [];

    document.querySelector("#start").addEventListener("click", () => {
      this.start();
    });

    document.querySelector("#stop").addEventListener("click", () => {
      this.stop();
    });
  }

  start() {
    if (this.running) {
      return;
    }
    console.log("start");

    this.running = true;

    const snake = new Snake(this.ctx);

    this.entities.push(snake);

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

      if (entity.draw) {
        entity.draw();
      }
    });
  }
}

class Snake {
  constructor(ctx) {
    this.ctx = ctx;
    this.margin = 1;
    this.segmentSize = CELL_SIZE - this.margin * 2;
    this.direction = "right";
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

  move() {
    if (this.direction === "right") {
      const newSegment = {
        column: this.body[0].column + 1,
        row: this.body[0].row,
      };

      this.body.unshift(newSegment);

      this.body.pop();
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
