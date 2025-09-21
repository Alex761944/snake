const CELL_SIZE = 16;
const COLUMN_COUNT = 20;
const ROW_COUNT = 15;
const GAME_SPEEDS = {
  1: 30,
  2: 60,
  3: 90,
  4: 120,
};

class Game {
  constructor() {
    this.cellSize = CELL_SIZE;
    this.columnCount = COLUMN_COUNT;
    this.rowCount = ROW_COUNT;
    this.interval = null;
    this.running = false;

    this.snake = null;
    this.food = null;

    this.tick = 0;

    this.difficultyInput = document.querySelector("#difficulty-range");

    this.canvas = document.querySelector("#canvas");
    this.ctx = this.canvas.getContext("2d");
    this.entities = [];
    this.cells = [];

    for (let column = 0; column < COLUMN_COUNT; column++) {
      for (let row = 0; row < ROW_COUNT; row++) {
        this.cells.push({ column, row });
      }
    }

    document.querySelector("#start").addEventListener("click", () => {
      this.start();
    });

    document.querySelector("#stop").addEventListener("click", () => {
      this.stop();
    });

    window.addEventListener("keydown", ({ key }) => {
      if (!this.entities) return;

      const snake = this.entities.find((entity) => entity.name === "snake");
      if (!snake) return;

      if (
        key === "ArrowUp" &&
        snake.direction !== "up" &&
        snake.direction !== "down"
      ) {
        snake.desiredDirection = "up";
      } else if (
        key === "ArrowDown" &&
        snake.direction !== "up" &&
        snake.direction !== "down"
      ) {
        snake.desiredDirection = "down";
      } else if (
        key === "ArrowLeft" &&
        snake.direction !== "left" &&
        snake.direction !== "right"
      ) {
        snake.desiredDirection = "left";
      } else if (
        key === "ArrowRight" &&
        snake.direction !== "left" &&
        snake.direction !== "right"
      ) {
        snake.desiredDirection = "right";
      }
    });
  }

  start() {
    if (this.running) {
      return;
    }
    console.log("start");

    this.difficultyValue = Number(this.difficultyInput.value);

    this.gameSpeed = GAME_SPEEDS[this.difficultyValue];

    console.log(this.gameSpeed);

    this.running = true;

    this.snake = new Snake(this.ctx);

    this.food = new Food(this.ctx);

    this.entities.push(this.snake);

    this.entities.push(this.food);

    /* Run game loop 60 times per second */
    this.interval = setInterval(this.update.bind(this), 1000 / this.gameSpeed);
  }

  stop() {
    console.log("stop");

    clearInterval(this.interval);
  }

  update() {
    console.log("update");

    /* Things that should only happen every 60 frames */
    if (this.tick % 60 === 0) {
      this.snake.move();

      const foodCollision = this.snake.foodCollision(this.food);

      if (foodCollision) {
        this.food.move(this.getEmptyCells());
      }

      if (this.snake.leftArena() || this.snake.selfCollision()) {
        this.stop();
        return;
      }

      this.ctx.clearRect(0, 0, COLUMN_COUNT * CELL_SIZE, ROW_COUNT * CELL_SIZE);

      this.entities.forEach((entity) => {
        if (entity.draw) {
          entity.draw();
        }
      });
    }

    this.tick = this.tick + 1;
  }

  getEmptyCells() {
    let emptyCells = [...this.cells];

    emptyCells = emptyCells.filter((cell) => {
      return !this.snake.body.some(
        (segment) => segment.column === cell.column && segment.row === cell.row
      );
    });

    emptyCells = emptyCells.filter((cell) => {
      return !(this.food.column === cell.column && this.food.row === cell.row);
    });

    return emptyCells;
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
  }

  move(emptyCells) {
    const randomIndex = Math.floor(Math.random() * emptyCells.length);
    const newCell = emptyCells[randomIndex];

    this.column = newCell.column;
    this.row = newCell.row;
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
    this.desiredDirection = null;
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

    /* Check legality of move */
    if (
      this.desiredDirection === "up" &&
      this.direction !== "up" &&
      this.direction !== "down"
    ) {
      this.direction = "up";
    } else if (
      this.desiredDirection === "down" &&
      this.direction !== "up" &&
      this.direction !== "down"
    ) {
      this.direction = "down";
    } else if (
      this.desiredDirection === "left" &&
      this.direction !== "left" &&
      this.direction !== "right"
    ) {
      this.direction = "left";
    } else if (
      this.desiredDirection === "right" &&
      this.direction !== "left" &&
      this.direction !== "right"
    ) {
      this.direction = "right";
    }

    /* Move in direction */
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

    if (this.grow) {
      this.grow = false;
    } else {
      this.body.pop();
    }
  }

  leftArena() {
    const head = this.body[0];

    return (
      head.column < 0 ||
      head.column >= COLUMN_COUNT ||
      head.row < 0 ||
      head.row >= ROW_COUNT
    );
  }

  selfCollision() {
    const [head, ...body] = this.body;
    return body.some(
      (bodyCell) => bodyCell.column === head.column && bodyCell.row === head.row
    );
  }

  foodCollision(food) {
    const head = this.body[0];

    if (food.column === head.column && food.row === head.row) {
      this.grow = true;

      return true;
    }

    return false;
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
