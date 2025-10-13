const CELL_SIZE = 32;
const COLUMN_COUNT = 20;
const ROW_COUNT = 15;
const DIFFICULTY_TEXTS = {
  1: "Easy",
  3: "Normal",
  2: "Advanced",
  4: "Hard",
  5: "Veteran",
};

class Game {
  constructor() {
    this.cellSize = CELL_SIZE;
    this.columnCount = COLUMN_COUNT;
    this.rowCount = ROW_COUNT;
    this.interval = null;
    this.running = false;

    this.snake = null;
    this.foods = [];

    this.tick = 0;
    this.consumeSound = new Audio("sound-files/food-collision.mp3");

    this.difficultyInputElement = document.querySelector("#difficulty-range");
    this.scoreDisplayTextElement = document.querySelector("#score");
    this.highscoreDisplayTextElement = document.querySelector("#highscore");
    this.moneyDisplayTextElement = document.querySelector("#money");
    this.canvasElement = document.querySelector("#canvas");
    this.startButtonElement = document.querySelector("#start");
    this.stopButtonElement = document.querySelector("#stop");
    this.difficultyTextElement = document.querySelector("#difficulty-text");
    this.resetProgressElement = document.querySelector("#reset-progress");
    this.upgradeButtonElements = document.querySelectorAll(".PurchaseButton");

    this.score = 0;

    const { highscore, money, upgrades } =
      this.loadGameProgressFromLocalStorage();

    this.setHighscore(highscore);
    this.setMoney(money);
    this.setUpgrades(upgrades);

    const difficultyString = localStorage.getItem("difficulty") || "2";
    this.difficultyInputElement.value = difficultyString;

    this.ctx = this.canvasElement.getContext("2d");

    this.entities = [];
    this.cells = [];

    for (let column = 0; column < COLUMN_COUNT; column++) {
      for (let row = 0; row < ROW_COUNT; row++) {
        this.cells.push({ column, row });
      }
    }

    this.difficultyValue = Number(this.difficultyInputElement?.value);
    this.difficultyTextElement.textContent =
      DIFFICULTY_TEXTS[this.difficultyValue];

    this.difficultyInputElement.addEventListener("input", () => {
      this.difficultyValue = Number(this.difficultyInputElement.value);
      this.difficultyTextElement.textContent =
        DIFFICULTY_TEXTS[this.difficultyValue];

      localStorage.setItem("difficulty", this.difficultyInputElement.value);
    });

    this.upgradeButtonElements.forEach((upgradeButtonElement) => {
      const upgrade = upgradeButtonElement.getAttribute("data-upgrade");
      const upgradeCost = Number(
        upgradeButtonElement.getAttribute("data-upgrade-cost")
      );

      upgradeButtonElement.addEventListener("click", () => {
        if (this.money < upgradeCost) return;

        this.setMoney(this.money - upgradeCost);

        this.upgrades.push(upgrade);

        this.setPurchaseStyle(upgradeButtonElement);

        const gameProgress = {
          highscore: this.highscore,
          money: this.money,
          upgrades: this.upgrades,
        };

        this.saveGameProgressToLocalStorage(gameProgress);
      });

      if (this.upgrades.includes(upgrade)) {
        this.setPurchaseStyle(upgradeButtonElement);
      }
    });

    this.startButtonElement.addEventListener("click", () => {
      this.start();
    });

    this.stopButtonElement.addEventListener("click", () => {
      this.stop();
    });

    this.resetProgressElement.addEventListener("click", () => {
      this.setHighscore(0);
      this.setMoney(0);

      const gameProgress = { highscore: 0, money: this.money, upgrades: [] };

      this.upgradeButtonElements.forEach((upgradeButtonElement) => {
        upgradeButtonElement.removeAttribute("disabled");
        upgradeButtonElement.classList.remove("PurchaseButton--Purchased");
      });

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
    this.difficultyInputElement.disabled = "disabled";

    this.snake = new Snake(this.ctx);
    this.entities.push(this.snake);

    this.foods.push(new Food(this.ctx, this.rollFoodType()));

    /* Run game loop 60 times per second */
    this.interval = setInterval(this.update.bind(this), 1000 / 60);
  }

  stop() {
    console.log("stop");

    if (this.score > this.highscore) {
      this.highscore = this.score;
      this.highscoreDisplayTextElement.textContent = this.highscore;
    }

    const gameProgress = {
      highscore: this.highscore,
      money: this.money,
      upgrades: this.upgrades,
    };

    this.saveGameProgressToLocalStorage(gameProgress);

    this.difficultyInputElement.removeAttribute("disabled");
    this.startButtonElement.removeAttribute("disabled");

    this.startButtonElement.textContent = "New Game";

    clearInterval(this.interval);
  }

  getGambleResult(successPercentage) {
    const randomNumber = Math.random() * 100;
    return randomNumber < successPercentage;
  }

  update() {
    console.log("update");

    /* Things that should happen every X frames. X depends on the difficulty */
    if (this.tick % (60 / this.difficultyValue) === 0) {
      this.snake.move();

      this.foods.forEach((food) => {
        const foodCollision = this.snake.foodCollision(food);
        const moneyValue = food.value;

        if (foodCollision) {
          const foodType = this.rollFoodType();
          food.setType(foodType);

          if (
            this.upgrades.includes("second-food-chance") &&
            this.getGambleResult(10)
          ) {
            this.foods.push(
              new Food(this.ctx, this.rollFoodType(), this.getEmptyCells())
            );
          }

          /*TODO: fix bug where two foods spawn in the same cell. */
          food.move(this.getEmptyCells());
          this.setScore(this.score + this.difficultyValue);
          this.setMoney(this.money + moneyValue);

          this.consumeSound.play();
        }
      });

      if (this.snake.leftArena() || this.snake.selfCollision()) {
        this.stop();
        return;
      }

      this.ctx.clearRect(0, 0, COLUMN_COUNT * CELL_SIZE, ROW_COUNT * CELL_SIZE);

      this.snake.draw();

      this.foods.forEach((food) => {
        food.draw();
      });
    }

    this.tick = this.tick + 1;
  }

  setPurchaseStyle(buttonElement) {
    buttonElement.disabled = "disabled";

    buttonElement.classList.add("PurchaseButton--Purchased");
  }

  setUpgrades(upgrades) {
    this.upgrades = upgrades;
  }

  setMoney(money) {
    this.money = money;
    this.moneyDisplayTextElement.textContent = money;
  }

  setScore(score) {
    this.score = score;
    this.scoreDisplayTextElement.textContent = score;
  }

  setHighscore(highscore) {
    this.highscore = highscore;
    this.highscoreDisplayTextElement.textContent = highscore;
  }

  saveGameProgressToLocalStorage(gameProgress) {
    /* highscore, money, upgrades */
    localStorage.setItem("game-progress", JSON.stringify(gameProgress));
  }

  loadGameProgressFromLocalStorage() {
    const gameProgressString = localStorage.getItem("game-progress");

    if (!gameProgressString) {
      return { highscore: 0, money: 0, upgrades: [] };
    }

    return JSON.parse(gameProgressString);
  }

  rollFoodType() {
    let foodType;

    if (this.upgrades.includes("cherry") && this.getGambleResult(10)) {
      foodType = "cherry";
    } else if (this.upgrades.includes("banana") && this.getGambleResult(50)) {
      foodType = "banana";
    } else if (this.upgrades.includes("melon") && this.getGambleResult(5)) {
      foodType = "melon";
    } else {
      foodType = "apple";
    }

    return foodType;
  }

  getEmptyCells() {
    let emptyCells = [...this.cells];

    emptyCells = emptyCells.filter((cell) => {
      return !this.snake.body.some(
        (segment) => segment.column === cell.column && segment.row === cell.row
      );
    });

    emptyCells = emptyCells.filter((cell) => {
      return this.foods.some((food) => {
        return !(food.column === cell.column && food.row === cell.row);
      });
    });

    return emptyCells;
  }
}
class Food {
  constructor(ctx, type, emptyCells) {
    this.ctx = ctx;
    this.margin = 1;
    this.foodSize = CELL_SIZE - this.margin * 2;
    this.name = "food";
    this.type = type;

    this.column = 10;
    this.row = 5;

    if (emptyCells) {
      this.move(emptyCells);
    }

    this.appleImageElement = document.querySelector("#apple");
    this.bananaImageElement = document.querySelector("#banana");
    this.cherryImageElement = document.querySelector("#cherry");
    this.melonImageElement = document.querySelector("#melon");

    this.setType(type);
  }

  setType(type) {
    this.type = type;

    switch (type) {
      case "apple":
        this.value = 1;
        break;
      case "banana":
        this.value = 2;
        break;
      case "cherry":
        this.value = 5;
        break;
      case "melon":
        this.value = 10;
        break;
    }
  }

  move(emptyCells) {
    const randomIndex = Math.floor(Math.random() * emptyCells.length);
    const newCell = emptyCells[randomIndex];

    this.column = newCell.column;
    this.row = newCell.row;
  }

  draw() {
    let imageToDraw;

    switch (this.type) {
      case "banana":
        imageToDraw = this.bananaImageElement;
        break;
      case "cherry":
        imageToDraw = this.cherryImageElement;
        break;
      case "melon":
        imageToDraw = this.melonImageElement;
        break;
      case "apple":
      default:
        imageToDraw = this.appleImageElement;
        break;
    }

    this.ctx.drawImage(
      imageToDraw,
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
