export class Game {

    constructor({
        playerId,
        send,
        onUpdate,
        onFinish
    }) {

        this.playerId = playerId;

        this.send = send;

        this.onUpdate = onUpdate;

        this.onFinish = onFinish;


        this.secret = null;

        this.myReady = false;
        this.opponentReady = false;

        this.gameStarted = false;
        this.gameOver = false;

        this.currentTurn = "player1";

        this.history = [];

        this.lastResult = null;
    }


    setSecretNumber(value) {

        value = String(value).trim();

        if (!/^\d{3}$/.test(value)) {
            throw new Error(
                "Secret number must contain exactly 3 digits."
            );
        }

        this.secret = value;

        this.myReady = true;

        /*
         * IMPORTANT:
         *
         * We DO NOT send the secret number.
         *
         * We only tell the opponent that we are ready.
         */

        this.send({
            type: "player-ready"
        });

        this.tryStart();

        this.update();
    }


    makeGuess(value) {

        value = String(value).trim();

        if (!/^\d{3}$/.test(value)) {
            throw new Error(
                "Guess must contain exactly 3 digits."
            );
        }


        if (!this.gameStarted) {
            throw new Error("The game has not started yet.");
        }


        if (this.gameOver) {
            throw new Error("The game is already over.");
        }


        if (this.currentTurn !== this.playerId) {
            throw new Error("It is not your turn.");
        }


        this.send({
            type: "guess",
            value
        });
    }


    receive(message) {

        if (!message || !message.type) {
            return;
        }


        switch (message.type) {

            case "player-ready":

                this.opponentReady = true;

                this.tryStart();

                this.update();

                break;


            case "game-start":

                this.gameStarted = true;

                this.currentTurn = message.firstTurn;

                this.update();

                break;


            case "guess":

                this.handleOpponentGuess(
                    message.value
                );

                break;


            case "guess-result":

                this.handleGuessResult(message);

                break;


            case "turn-change":

                this.currentTurn = message.player;

                this.update();

                break;


            case "game-over":

                this.gameOver = true;

                this.gameStarted = false;

                this.onFinish({
                    won: message.winner === this.playerId,
                    guess: message.guess
                });

                break;
        }
    }


    tryStart() {

        if (
            this.myReady &&
            this.opponentReady &&
            !this.gameStarted
        ) {

            /*
             * Player 1 is responsible for starting
             * the game.
             */

            if (this.playerId === "player1") {

                this.gameStarted = true;

                this.currentTurn = "player1";


                this.send({
                    type: "game-start",
                    firstTurn: "player1"
                });


                this.update();
            }
        }
    }


    handleOpponentGuess(guess) {

        if (!this.secret) {
            return;
        }


        /*
         * Count matching digits regardless
         * of their positions.
         *
         * Example:
         *
         * secret = 909
         * guess  = 070
         *
         * Result = 1
         *
         * Because only one "0" exists in
         * the guess that matches the secret.
         */

        const correctNumbers =
            Game.countCorrectNumbers(
                this.secret,
                guess
            );


        const exactOrder =
            this.secret === guess;


        this.send({
            type: "guess-result",

            guess,

            correctNumbers,

            exactOrder
        });
    }


    handleGuessResult(message) {

        this.lastResult = {
            guess: message.guess,
            correctNumbers: message.correctNumbers,
            exactOrder: message.exactOrder
        };


        this.history.push({
            guess: message.guess,
            correctNumbers: message.correctNumbers,
            exactOrder: message.exactOrder
        });


        /*
         * WIN
         */

        if (
            message.correctNumbers === 3 &&
            message.exactOrder === true
        ) {

            this.gameOver = true;

            this.gameStarted = false;


            this.send({
                type: "game-over",

                winner: this.playerId,

                guess: message.guess,

                reason: "exact"
            });


            this.onFinish({
                won: true,

                guess: message.guess
            });


            return;
        }


        /*
         * Continue game
         */

        this.currentTurn =
            this.playerId === "player1"
                ? "player2"
                : "player1";


        this.send({
            type: "turn-change",

            player: this.currentTurn
        });


        this.update();
    }


    static countCorrectNumbers(secret, guess) {

        const secretCounts = {};
        const guessCounts = {};


        for (const digit of secret) {

            secretCounts[digit] =
                (secretCounts[digit] || 0) + 1;
        }


        for (const digit of guess) {

            guessCounts[digit] =
                (guessCounts[digit] || 0) + 1;
        }


        let correct = 0;


        for (const digit in guessCounts) {

            if (secretCounts[digit]) {

                correct += Math.min(
                    secretCounts[digit],
                    guessCounts[digit]
                );
            }
        }


        return correct;
    }


    update() {

        if (this.onUpdate) {

            this.onUpdate({
                myReady: this.myReady,

                opponentReady: this.opponentReady,

                gameStarted: this.gameStarted,

                gameOver: this.gameOver,

                currentTurn: this.currentTurn,

                history: this.history,

                lastResult: this.lastResult
            });
        }
    }


    reset() {

        this.secret = null;

        this.myReady = false;

        this.opponentReady = false;

        this.gameStarted = false;

        this.gameOver = false;

        this.currentTurn = "player1";

        this.history = [];

        this.lastResult = null;
    }
}
