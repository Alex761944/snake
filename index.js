const CELL_SIZE = 32;
const COLUMN_COUNT = 20;
const ROW_COUNT = 15;
const DIFFICULTY_TEXTS = {
  1: "Easy",
  2: "Advanced",
  3: "Normal",
  4: "Hard",
  5: "Veteran",
  6: "Nightmare",
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

    this.saveState = {
      settings: {
        difficulty: 2,
        volume: 0.5,
        isMuted: false,
      },
      progress: {
        highscore: 0,
        money: 0,
        upgrades: [],
      },
    };

    this.tick = 0;

    this.sounds = [
      {
        name: "eat",
        audio: new Audio("sound-files/food-collision.mp3"),
      },
      {
        name: "game-over",
        audio: new Audio("sound-files/game-over.mp3"),
      },
    ];

    this.difficultyInputElement = document.querySelector("#difficulty-range");
    this.volumeInputElement = document.querySelector("#volume-range");
    this.scoreDisplayTextElement = document.querySelector("#score");
    this.highscoreDisplayTextElement = document.querySelector("#highscore");
    this.moneyDisplayTextElement = document.querySelector("#money");
    this.canvasElement = document.querySelector("#canvas");
    this.startButtonElement = document.querySelector("#start");
    this.stopButtonElement = document.querySelector("#stop");
    this.difficultyTextElement = document.querySelector("#difficulty-text");
    this.volumeTextElement = document.querySelector("#volume-text");
    this.resetProgressElement = document.querySelector("#reset-progress");
    this.upgradeButtonElements = document.querySelectorAll(".PurchaseButton");
    this.muteButtonElement = document.querySelector("#mute-toggle");

    const storedMuteState =
      JSON.parse(localStorage.getItem("save-state")).settings.isMuted ===
      "true";
    this.isMuted = storedMuteState;
    this.muteButtonElement.setAttribute("data-is-muted", this.isMuted);

    this.score = 0;
    this.volume = 0.5;

    const { highscore, money, upgrades } =
      this.loadGameProgressFromLocalStorage();

    this.setHighscore(highscore);
    this.setMoney(money);
    this.setUpgrades(upgrades);

    const volumeString =
      JSON.parse(localStorage.getItem("save-state")).settings.volume || "50";
    this.volume = Number(volumeString) * 100;
    this.setVolume();
    this.volumeInputElement.value = volumeString * 100;
    this.volumeTextElement.textContent = volumeString * 100;

    this.volumeInputElement.addEventListener("input", () => {
      this.volume = Number(this.volumeInputElement.value);
      this.setVolume();
      this.volumeTextElement.textContent = this.volumeInputElement.value;

      this.saveState.settings.volume = this.volumeInputElement.value / 100;
      localStorage.setItem("save-state", JSON.stringify(this.saveState));
    });

    const difficultyString =
      JSON.parse(localStorage.getItem("save-state")).settings.difficulty || "2";
    this.difficultyInputElement.value = difficultyString;

    this.difficultyValue = Number(this.difficultyInputElement?.value);
    this.difficultyTextElement.textContent =
      DIFFICULTY_TEXTS[this.difficultyValue];

    this.difficultyInputElement.addEventListener("input", () => {
      this.difficultyValue = Number(this.difficultyInputElement.value);
      this.difficultyTextElement.textContent =
        DIFFICULTY_TEXTS[this.difficultyValue];

      this.saveState.settings.difficulty = this.difficultyInputElement.value;
      localStorage.setItem("save-state", JSON.stringify(this.saveState));
    });

    this.muteButtonElement.addEventListener("click", () => {
      const currentMuteState =
        this.muteButtonElement.getAttribute("data-is-muted") === "true";
      const newMuteState = !currentMuteState;

      this.muteButtonElement.setAttribute(
        "data-is-muted",
        String(newMuteState)
      );
      this.isMuted = newMuteState;

      const saveState = JSON.parse(localStorage.getItem("save-state"));
      saveState.settings = saveState.settings;
      saveState.settings.isMuted = newMuteState;

      localStorage.setItem("save-state", JSON.stringify(saveState));
    });

    this.ctx = this.canvasElement.getContext("2d");

    this.cells = [];

    for (let column = 0; column < COLUMN_COUNT; column++) {
      for (let row = 0; row < ROW_COUNT; row++) {
        this.cells.push({ column, row });
      }
    }

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

        this.saveState.progress.upgrades.push(upgrade);

        if (upgrade === "max-difficulty") {
          this.unlockMaxDifficulty();
        }

        this.saveGameProgressToLocalStorage(gameProgress);
      });

      if (this.upgrades.includes(upgrade)) {
        this.setPurchaseStyle(upgradeButtonElement);

        if (upgrade === "max-difficulty") {
          this.unlockMaxDifficulty();
        }
      } else if (this.money < upgradeCost) {
        this.setDisabledStyle(upgradeButtonElement);
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

      this.saveState.progress.highscore = 0;
      this.saveState.progress.money = 0;
      this.saveState.progress.upgrades = [];

      this.upgradeButtonElements.forEach((upgradeButtonElement) => {
        upgradeButtonElement.removeAttribute("disabled");
        upgradeButtonElement.classList.remove("PurchaseButton--Purchased");
      });

      this.saveGameProgressToLocalStorage(gameProgress);
    });

    window.addEventListener("keydown", ({ key }) => {
      if (
        (key === "ArrowUp" || key === "w") &&
        this.snake.direction !== "up" &&
        this.snake.direction !== "down"
      ) {
        this.snake.desiredDirection = "up";
      } else if (
        (key === "ArrowDown" || key === "s") &&
        this.snake.direction !== "up" &&
        this.snake.direction !== "down"
      ) {
        this.snake.desiredDirection = "down";
      } else if (
        (key === "ArrowLeft" || key === "a") &&
        this.snake.direction !== "left" &&
        this.snake.direction !== "right"
      ) {
        this.snake.desiredDirection = "left";
      } else if (
        (key === "ArrowRight" || key === "d") &&
        this.snake.direction !== "left" &&
        this.snake.direction !== "right"
      ) {
        this.snake.desiredDirection = "right";
      }
    });
  }

  start() {
    /* Reset all entities and score if a game was already running */
    this.setScore(0);

    this.startButtonElement.disabled = "disabled";
    this.difficultyInputElement.disabled = "disabled";

    this.snake = new Snake(this.ctx);

    this.foods = [];

    this.foods.push(new Food(this.ctx, this.rollFoodType()));

    /* Run game loop 60 times per second */
    this.interval = setInterval(this.update.bind(this), 1000 / 60);
  }

  stop() {
    if (this.score > this.highscore) {
      this.highscore = this.score;
      this.highscoreDisplayTextElement.textContent = this.highscore;
    }

    if (this.score > this.saveState.progress.highscore) {
      this.saveState.progress.highscore = this.score;
      this.highscoreDisplayTextElement.textContent =
        this.saveState.progress.highscore;
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
    this.playSound("game-over");
    this.drawGameOver();
  }

  getGambleResult(successPercentage) {
    const randomNumber = Math.random() * 100;
    return randomNumber < successPercentage;
  }

  update() {
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

          if (this.difficultyValue === 6) {
            this.setMoney(this.money + moneyValue * 2);
          } else {
            this.setMoney(this.money + moneyValue);
          }

          this.checkUpgradeAffordability();

          this.playSound("eat");
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

  setDisabledStyle(buttonElement) {
    buttonElement.disabled = "disabled";
  }

  removeDisabledStyle(buttonElement) {
    buttonElement.removeAttribute("disabled");
  }

  checkUpgradeAffordability() {
    this.upgradeButtonElements.forEach((upgradeButtonElement) => {
      const upgrade = upgradeButtonElement.getAttribute("data-upgrade");
      const upgradeCost = Number(
        upgradeButtonElement.getAttribute("data-upgrade-cost")
      );

      if (this.money >= upgradeCost && !this.upgrades.includes(upgrade)) {
        this.removeDisabledStyle(upgradeButtonElement);
      }
    });
  }

  unlockMaxDifficulty() {
    this.difficultyInputElement.max = 6;
    this.difficultyInputElement.value = 6;
    this.difficultyValue = 6;
    this.difficultyTextElement.textContent =
      DIFFICULTY_TEXTS[this.difficultyValue];
  }

  playSound(name) {
    if (this.isMuted) return;

    const sound = this.sounds.find((sound) => sound.name === name);
    if (!sound) return;

    sound.audio.currentTime = 0;
    sound.audio.play();
  }

  setVolume() {
    this.sounds.forEach((sound) => {
      sound.audio.volume = this.volume / 100;
    });
  }

  setUpgrades(upgrades) {
    this.upgrades = upgrades;
  }

  setMoney(money) {
    this.money = money;
    this.saveState.progress.money = money;
    this.moneyDisplayTextElement.textContent = `$${money}`;
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
    localStorage.setItem("save-state", JSON.stringify(this.saveState));
  }

  loadGameProgressFromLocalStorage() {
    const gameProgressString = localStorage.getItem("game-progress");
    const saveStateString = localStorage.getItem("save-state");

    if (!gameProgressString) {
      return { highscore: 0, money: 0, upgrades: [] };
    }

    if (!saveStateString) return;

    this.saveState = JSON.parse(saveStateString);

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

  drawGameOver() {
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    this.ctx.fillRect(0, 0, CELL_SIZE * COLUMN_COUNT, CELL_SIZE * ROW_COUNT);

    this.ctx.font = "bold 36px Arial";
    this.ctx.fillStyle = "white";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillText(
      "GAME OVER",
      (CELL_SIZE * COLUMN_COUNT) / 2,
      (CELL_SIZE * ROW_COUNT) / 2
    );
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
