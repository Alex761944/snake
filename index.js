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

    this.snake = null;
    this.foods = [];

    this.score = 0;
    this.tick = 0;

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
    this.modalTriggerElements = document.querySelectorAll(
      "[data-modal-trigger]"
    );
    this.modalCloseButtonElements = document.querySelectorAll(
      ".Modal [data-action='close']"
    );

    this.loadGameProgressFromLocalStorage();

    this.updateHighscoreText();
    this.updateMoneyText();

    this.muteButtonElement.setAttribute(
      "data-is-muted",
      this.saveState.settings.isMuted
    );

    this.setVolume();

    this.volumeInputElement.value = this.saveState.settings.volume * 100;
    this.volumeTextElement.textContent = this.saveState.settings.volume * 100;

    this.difficultyInputElement.value = this.saveState.settings.difficulty;
    this.difficultyTextElement.textContent =
      DIFFICULTY_TEXTS[this.saveState.settings.difficulty];

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

      if (this.saveState.progress.upgrades.includes(upgrade)) {
        this.setPurchaseStyle(upgradeButtonElement);

        if (upgrade === "max-difficulty") {
          this.unlockMaxDifficulty();
        }
      } else if (this.saveState.progress.money < upgradeCost) {
        this.setDisabledStyle(upgradeButtonElement);
      }
    });

    /* Move all event listeners in this method */
    this.setEventListeners();
  }

  setEventListeners() {
    // Starts the game.
    this.startButtonElement.addEventListener("click", () => {
      this.start();
    });

    // Stops the game.
    this.stopButtonElement.addEventListener("click", () => {
      this.stop();
    });

    // Handles clicks on modal triggers. Opens the connected modal.
    this.modalTriggerElements.forEach((modalTriggerElement) => {
      modalTriggerElement.addEventListener("click", () => {
        const modalName =
          modalTriggerElement.getAttribute("data-modal-trigger");
        const connectedModalElement = document.querySelector(
          `[data-modal="${modalName}"]`
        );

        if (!connectedModalElement) return;

        connectedModalElement.showModal();
      });
    });

    // Handles click on all close buttons. Closes the closest modal.
    this.modalCloseButtonElements.forEach((modalCloseButtonElement) => {
      modalCloseButtonElement.addEventListener("click", () => {
        const connectedModalElement = modalCloseButtonElement.closest(".Modal");

        if (!connectedModalElement) return;

        connectedModalElement.close();
      });
    });

    // Handles input event for the volume range.
    this.volumeInputElement.addEventListener("input", () => {
      this.saveState.settings.volume = this.volumeInputElement.value / 100;
      this.volumeTextElement.textContent = this.volumeInputElement.value;

      this.setVolume();
      this.saveGameProgressToLocalStorage();
    });

    // Handles input event for the difficulty range.
    this.difficultyInputElement.addEventListener("input", () => {
      this.saveState.settings.difficulty = Number(
        this.difficultyInputElement.value
      );
      this.difficultyTextElement.textContent =
        DIFFICULTY_TEXTS[this.saveState.settings.difficulty];

      this.saveGameProgressToLocalStorage();
    });

    // Handles the mute toggle.
    this.muteButtonElement.addEventListener("click", () => {
      this.saveState.settings.isMuted = !this.saveState.settings.isMuted;
      this.muteButtonElement.setAttribute(
        "data-is-muted",
        this.saveState.settings.isMuted
      );

      this.saveGameProgressToLocalStorage();
    });

    // Handles keyboard input for snake control.
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

    // Handles the upgrade costs and purchases.
    this.upgradeButtonElements.forEach((upgradeButtonElement) => {
      const upgrade = upgradeButtonElement.getAttribute("data-upgrade");
      const upgradeCost =
        upgradeButtonElement.getAttribute("data-upgrade-cost");

      upgradeButtonElement.addEventListener("click", () => {
        if (this.saveState.progress.money < upgradeCost) return;

        this.updateMoneyText(this.saveState.progress.money - upgradeCost);
        this.setPurchaseStyle(upgradeButtonElement);

        this.saveState.progress.upgrades.push(upgrade);

        if (upgrade === "max-difficulty") {
          this.unlockMaxDifficulty();
        }

        this.saveGameProgressToLocalStorage();
      });
    });

    // Resets all player progress, clears upgrades, and saves the new game state.
    this.resetProgressElement.addEventListener("click", () => {
      this.updateHighscoreText(0);
      this.updateMoneyText(0);

      this.saveState.progress.highscore = 0;
      this.saveState.progress.money = 0;
      this.saveState.progress.upgrades = [];

      this.upgradeButtonElements.forEach((upgradeButtonElement) => {
        upgradeButtonElement.removeAttribute("disabled");
        upgradeButtonElement.classList.remove("PurchaseButton--Purchased");
      });

      this.saveGameProgressToLocalStorage();
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
    console.log(this.score, this.saveState.progress.highscore);
    if (this.score > this.saveState.progress.highscore) {
      this.saveState.progress.highscore = this.score;
      this.highscoreDisplayTextElement.textContent =
        this.saveState.progress.highscore;
    }

    this.saveGameProgressToLocalStorage();

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
    if (this.tick % (60 / this.saveState.settings.difficulty) === 0) {
      this.snake.move();

      this.foods.forEach((food) => {
        const foodCollision = this.snake.foodCollision(food);
        const moneyValue = food.value;

        if (foodCollision) {
          const foodType = this.rollFoodType();
          food.setType(foodType);

          if (
            this.saveState.progress.upgrades.includes("second-food-chance") &&
            this.getGambleResult(10)
          ) {
            this.foods.push(
              new Food(this.ctx, this.rollFoodType(), this.getEmptyCells())
            );
          }

          food.move(this.getEmptyCells());
          this.setScore(this.score + this.saveState.settings.difficulty);

          if (this.saveState.settings.difficulty === 6) {
            this.saveState.progress.money =
              this.saveState.progress.money + moneyValue * 2;
            this.updateMoneyText();
          } else {
            this.saveState.progress.money =
              this.saveState.progress.money + moneyValue;
            this.updateMoneyText();
          }

          this.checkUpgradeAffordability();

          this.playSound("eat");
        }
      });

      const hitWall = this.snake.leftArena();
      const hitSelf = this.snake.selfCollision();

      if (
        hitWall &&
        this.saveState.progress.upgrades.includes("portal-walls")
      ) {
        this.snake.portalWall();
      } else if (hitWall || hitSelf) {
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

  /**
   * Disables the button element and sets the purchased style.
   *
   * @param {HTMLButtonElement} buttonElement
   */
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

      if (
        this.saveState.progress.money >= upgradeCost &&
        !this.saveState.progress.upgrades.includes(upgrade)
      ) {
        this.removeDisabledStyle(upgradeButtonElement);
      }
    });
  }

  unlockMaxDifficulty() {
    this.difficultyInputElement.max = 6;
    this.difficultyInputElement.value = 6;
    this.saveState.settings.difficulty = 6;
    this.difficultyTextElement.textContent =
      DIFFICULTY_TEXTS[this.saveState.settings.difficulty];
  }

  playSound(name) {
    if (this.saveState.settings.isMuted) return;

    const sound = this.sounds.find((sound) => sound.name === name);
    if (!sound) return;

    sound.audio.currentTime = 0;
    sound.audio.play();
  }

  setVolume() {
    this.sounds.forEach((sound) => {
      sound.audio.volume = this.saveState.settings.volume;
    });
  }

  updateMoneyText() {
    this.moneyDisplayTextElement.textContent = `$${this.saveState.progress.money}`;
  }

  setScore(score) {
    this.score = score;
    this.scoreDisplayTextElement.textContent = score;
  }

  updateHighscoreText() {
    this.highscoreDisplayTextElement.textContent =
      this.saveState.progress.highscore;
  }

  saveGameProgressToLocalStorage() {
    localStorage.setItem("save-state", JSON.stringify(this.saveState));
  }

  loadGameProgressFromLocalStorage() {
    const saveStateString = localStorage.getItem("save-state");

    if (!saveStateString) return;

    this.saveState = JSON.parse(saveStateString);
    this.rollFoodType();
  }

  /**
   * Returns a random food type depending on the roll chance and unlock conditions.
   *
   * @returns {'apple'|'banana'|'cherry'|'melon'} Food type
   */
  rollFoodType() {
    let foodType;

    if (
      this.saveState.progress.upgrades.includes("cherry") &&
      this.getGambleResult(10)
    ) {
      foodType = "cherry";
    } else if (
      this.saveState.progress.upgrades.includes("banana") &&
      this.getGambleResult(50)
    ) {
      foodType = "banana";
    } else if (
      this.saveState.progress.upgrades.includes("melon") &&
      this.getGambleResult(5)
    ) {
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

  portalWall() {
    const head = this.body[0];

    if (head.column < 0) {
      head.column = COLUMN_COUNT - 1;
    } else if (head.column >= COLUMN_COUNT) {
      head.column = 0;
    }

    if (head.row < 0) {
      head.row = ROW_COUNT - 1;
    } else if (head.row >= ROW_COUNT) {
      head.row = 0;
    }
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
