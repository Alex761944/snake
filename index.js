const CELL_SIZE = 16;
const COLUMN_COUNT = 20;
const ROW_COUNT = 15;
const DIFFICULTY_TEXTS = {
  1: "Easy",
  3: "Normal",
  2: "Advanced",
  4: "Hard",
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
    this.scoreDisplay = document.querySelector("#score");
    this.highscoreDisplay = document.querySelector("#highscore");
    this.moneyDisplay = document.querySelector("#money");
    this.canvas = document.querySelector("#canvas");
    this.startButtonElement = document.querySelector("#start");
    this.stopButtonElement = document.querySelector("#stop");
    this.difficultyText = document.querySelector("#difficulty-text");
    this.resetHighscoreElement = document.querySelector("#reset-highscore");

    this.score = 0;

    const { highscore, money } = this.loadGameProgressFromLocalStorage();

    this.setHighscore(highscore);
    this.setMoney(money);

    this.ctx = this.canvas.getContext("2d");

    this.entities = [];
    this.cells = [];

    for (let column = 0; column < COLUMN_COUNT; column++) {
      for (let row = 0; row < ROW_COUNT; row++) {
        this.cells.push({ column, row });
      }
    }

    this.difficultyValue = Number(this.difficultyInput?.value);
    this.difficultyText.textContent = DIFFICULTY_TEXTS[this.difficultyValue];

    this.difficultyInput.addEventListener("input", () => {
      this.difficultyValue = Number(this.difficultyInput.value);
      this.difficultyText.textContent = DIFFICULTY_TEXTS[this.difficultyValue];
    });

    this.startButtonElement.addEventListener("click", () => {
      this.start();
    });

    this.stopButtonElement.addEventListener("click", () => {
      this.stop();
    });

    this.resetHighscoreElement.addEventListener("click", () => {
      this.setHighscore(0);

      const gameProgress = { highscore: 0, money: this.money };

      this.saveGameProgressToLocalStorage(gameProgress);
    });

    window.addEventListener("keydown", ({ key }) => {
      if (!this.entities) return;

      const snake = this.entities.find((entity) => entity.name === "snake");
      if (!snake) return;

      if (
        (key === "ArrowUp" || key === "w") &&
        snake.direction !== "up" &&
        snake.direction !== "down"
      ) {
        snake.desiredDirection = "up";
      } else if (
        (key === "ArrowDown" || key === "s") &&
        snake.direction !== "up" &&
        snake.direction !== "down"
      ) {
        snake.desiredDirection = "down";
      } else if (
        (key === "ArrowLeft" || key === "a") &&
        snake.direction !== "left" &&
        snake.direction !== "right"
      ) {
        snake.desiredDirection = "left";
      } else if (
        (key === "ArrowRight" || key === "d") &&
        snake.direction !== "left" &&
        snake.direction !== "right"
      ) {
        snake.desiredDirection = "right";
      }
    });
  }

  start() {
    console.log("start");

    /* Reset all entities and score if a game was already running */
    this.setScore(0);
    this.entities = [];

    this.startButtonElement.disabled = "disabled";
    this.difficultyInput.disabled = "disabled";

    this.snake = new Snake(this.ctx);
    this.entities.push(this.snake);

    this.food = new Food(this.ctx);
    this.entities.push(this.food);

    /* Run game loop 60 times per second */
    this.interval = setInterval(this.update.bind(this), 1000 / 60);
  }

  stop() {
    console.log("stop");

    if (this.score > this.highscore) {
      this.highscore = this.score;
      this.highscoreDisplay.textContent = this.highscore;

      const gameProgress = { highscore: this.highscore, money: this.money };

      this.saveGameProgressToLocalStorage(gameProgress);
    }

    this.difficultyInput.removeAttribute("disabled");
    this.startButtonElement.removeAttribute("disabled");

    this.startButtonElement.textContent = "New Game";

    clearInterval(this.interval);
  }

  update() {
    console.log("update");

    /* Things that should happen every X frames. X depends on the difficulty */
    if (this.tick % (60 / this.difficultyValue) === 0) {
      this.snake.move();

      const foodCollision = this.snake.foodCollision(this.food);

      if (foodCollision) {
        this.food.move(this.getEmptyCells());
        this.setScore(this.score + this.difficultyValue);
        this.setMoney(this.money + this.food.value);
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

  setMoney(money) {
    this.money = money;
    this.moneyDisplay.textContent = money;
  }

  setScore(score) {
    this.score = score;
    this.scoreDisplay.textContent = score;
  }

  setHighscore(highscore) {
    this.highscore = highscore;
    this.highscoreDisplay.textContent = highscore;
  }

  saveGameProgressToLocalStorage(gameProgress) {
    /* highscore, money */
    localStorage.setItem("game-progress", JSON.stringify(gameProgress));
  }

  loadGameProgressFromLocalStorage() {
    const gameProgressString = localStorage.getItem("game-progress");

    if (!gameProgressString) {
      return { highscore: 0, money: 0 };
    }

    return JSON.parse(gameProgressString);
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
    this.value = 1;

    this.appleImageElement = document.querySelector("#apple");
  }

  move(emptyCells) {
    const randomIndex = Math.floor(Math.random() * emptyCells.length);
    const newCell = emptyCells[randomIndex];

    this.column = newCell.column;
    this.row = newCell.row;
  }

  draw() {
    this.ctx.drawImage(
      this.appleImageElement,
      this.column * CELL_SIZE,
      this.row * CELL_SIZE,
      CELL_SIZE,
      CELL_SIZE
    );
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
        connectionTop: false,
        connectionRight: false,
        connectionBottom: false,
        connectionLeft: true,
      },
      {
        column: 4,
        row: 5,
        connectionTop: false,
        connectionRight: true,
        connectionBottom: false,
        connectionLeft: false,
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
      newHead.connectionLeft = true;
      this.body[0].connectionRight = true;
    } else if (this.direction === "up") {
      newHead.row -= 1;
      newHead.connectionBottom = true;
      this.body[0].connectionTop = true;
    } else if (this.direction === "down") {
      newHead.row += 1;
      newHead.connectionTop = true;
      this.body[0].connectionBottom = true;
    } else if (this.direction === "left") {
      newHead.column -= 1;
      newHead.connectionRight = true;
      this.body[0].connectionLeft = true;
    }

    this.body.unshift(newHead);

    if (this.grow) {
      this.grow = false;
    } else {
      this.body.pop();
    }

    /* Remove irrelevant connection on the last segment */
    const lastSegment = this.body[this.body.length - 1];
    const secondLastSegment = this.body[this.body.length - 2];

    lastSegment.connectionTop =
      lastSegment.row > secondLastSegment.row &&
      lastSegment.column === secondLastSegment.column;

    lastSegment.connectionRight =
      lastSegment.row === secondLastSegment.row &&
      lastSegment.column < secondLastSegment.column;

    lastSegment.connectionBottom =
      lastSegment.row < secondLastSegment.row &&
      lastSegment.column === secondLastSegment.column;

    lastSegment.connectionLeft =
      lastSegment.row === secondLastSegment.row &&
      lastSegment.column > secondLastSegment.column;

    console.log(lastSegment);
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
    this.body.forEach((segment, index) => {
      if (index === 0) {
        this.ctx.fillStyle = "#F7B538";
      } else {
        this.ctx.fillStyle = "#DB7C26";
      }

      this.ctx.fillRect(
        segment.column * CELL_SIZE + this.margin,
        segment.row * CELL_SIZE + this.margin,
        this.segmentSize,
        this.segmentSize
      );

      if (segment.connectionTop) {
        this.ctx.fillStyle = "white";
        this.ctx.fillRect(
          segment.column * CELL_SIZE + this.margin + this.margin,
          segment.row * CELL_SIZE,
          this.segmentSize - this.margin - this.margin,
          this.margin
        );
      }

      if (segment.connectionRight) {
        this.ctx.fillStyle = "white";
        this.ctx.fillRect(
          segment.column * CELL_SIZE + this.margin + this.segmentSize,
          segment.row * CELL_SIZE + this.margin + this.margin,
          this.margin,
          this.segmentSize - this.margin - this.margin
        );
      }

      if (segment.connectionBottom) {
        this.ctx.fillStyle = "white";
        this.ctx.fillRect(
          segment.column * CELL_SIZE + this.margin + this.margin,
          segment.row * CELL_SIZE + this.margin + this.segmentSize,
          this.segmentSize - this.margin - this.margin,
          this.margin
        );
      }

      if (segment.connectionLeft) {
        this.ctx.fillStyle = "white";
        this.ctx.fillRect(
          segment.column * CELL_SIZE,
          segment.row * CELL_SIZE + this.margin + this.margin,
          this.margin,
          this.segmentSize - this.margin - this.margin
        );
      }
    });
  }
}

const game = new Game();
