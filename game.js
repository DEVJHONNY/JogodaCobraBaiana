// Adicione este bloco no início do arquivo para debug global
window.debugSnakeGame = function () {
    console.log("=== DEBUG SNAKE GAME ===");
    const canvas = document.getElementById('gameCanvas');
    const menu = document.getElementById('mainMenu');
    const score = document.getElementById('score');
    console.log("Canvas:", canvas, "Display:", canvas && canvas.style.display);
    console.log("Menu:", menu, "Display:", menu && menu.style.display);
    console.log("Score:", score, "Display:", score && score.style.display);
    console.log("window.game:", window.game);
    if (window.game) {
        console.log("gameActive:", window.game.gameActive);
        console.log("snake:", window.game.snake);
        console.log("obstacles:", window.game.obstacles);
        console.log("food:", window.game.food);
        console.log("draw function exists:", typeof window.game.draw === 'function');
        console.log("gameLoop function exists:", typeof window.game.gameLoop === 'function');
    }
    console.log("========================");
};

// DICA DE DEBUG EXTRA: Mostre erros inesperados no console
window.onerror = function (msg, url, line, col, error) {
    console.error("ERRO GLOBAL:", msg, "em", url, "linha", line, "col", error);
    alert("Erro no jogo: " + msg + "\nVeja o console para detalhes.");
};

class SnakeGame {
    constructor() {
        console.log("SnakeGame constructor chamado");
        // Initialize canvas
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = 1400; // Aumenta largura
        this.canvas.height = 800; // Aumenta altura
        this.cellSize = 20;

        // Initialize game state
        this.gameActive = false;
        this.paused = false;
        this.score = 0;
        this.speed = 150;
        this.difficulty = 'easy'; // padrão
        this.awardShown = false; // controle para mostrar premiação só uma vez

        // Initialize arrays
        this.snake = [{ x: 10, y: 10 }];
        this.direction = 'right';
        this.nextDirection = 'right';
        this.obstacles = [];
        this.extraFoods = [];
        this.food = null; // Inicializa depois dos arrays

        // Bot perseguidor
        this.bot = { x: 45, y: 15, lastMove: 'left' }; // Ajusta posição inicial para novo tamanho
        this.botMoveCounter = 0; // contador para controlar velocidade do bot
        this.botMoveInterval = 2; // padrão (fácil)

        // Inicializar arrays adicionais para evitar erro de undefined
        this.particles = [];
        this.movingObstacles = [];
        this.portalPairs = [];

        // Nome do jogador (padrão)
        this.playerName = 'Jogador';

        // Define área segura para spawn da cobra (5x5 canto superior esquerdo)
        this.safeZone = { x: 0, y: 0, w: 5, h: 5 };

        // Elemento para mostrar a meta de pontos
        this.goalBar = null;

        // Bind methods
        this.gameLoop = this.gameLoop.bind(this);
        this.update = this.update.bind(this);
        this.draw = this.draw.bind(this);

        // Ativar controles
        this.setupControls();
        // Inicializa apenas UMA comida no início
        try {
            this.food = this.createFood();
            this.extraFoods = [];
        } catch (e) {
            this.food = { x: 10, y: 10, type: 'normal' };
            this.extraFoods = [];
        }
    }

    init(difficulty = 'easy') {
        console.log("SnakeGame.init chamado", difficulty);
        // Reset game state
        this.snake = [{ x: 2, y: 2 }];
        this.obstacles = [];
        this.direction = 'right';
        this.nextDirection = 'right';
        this.score = 0;
        this.gameActive = true;
        this.paused = false;
        this.food = this.createFood();
        this.gameOverScreen = false;
        this.difficulty = difficulty || 'easy';
        this.extraFoods = [];
        this.bot = { x: 65, y: 20, lastMove: 'left' }; // Ajusta posição inicial para novo tamanho
        this.botMoveCounter = 0;

        // Ajusta velocidade conforme dificuldade
        if (this.difficulty === 'easy') {
            this.speed = 150;
            this.botMoveInterval = 3; // bot mais lento
        } else if (this.difficulty === 'medium') {
            this.speed = 100;
            this.botMoveInterval = 2; // bot intermediário
        } else if (this.difficulty === 'hard') {
            this.speed = 60;
            this.botMoveInterval = 1; // bot rápido
        }

        // Cria obstáculos conforme dificuldade
        this.createObstaclesByDifficulty();

        // Pega nome do input se existir
        const nameInput = document.getElementById('playerName');
        if (nameInput && nameInput.value.trim()) {
            this.playerName = nameInput.value.trim();
        } else {
            const name = prompt('Digite seu nome:', this.playerName);
            if (name) this.playerName = name;
        }

        this.updateScore();
        this.showGoalBar();
        try {
            this.food = this.createFood();
            this.extraFoods = [];
        } catch (e) {
            this.food = { x: 10, y: 10, type: 'normal' };
            this.extraFoods = [];
        }
        // Corrige: mostra o canvas e esconde o menu (garante que sempre aparece ao iniciar)
        const menu = document.getElementById('mainMenu');
        const canvas = document.getElementById('gameCanvas');
        if (menu) menu.style.display = 'none';
        if (canvas) canvas.style.display = 'block';
        // Garante que o canvas está limpo antes de iniciar
        if (this.ctx) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
        // Inicia o loop do jogo imediatamente
        this.gameLoop();
    }

    spawnExtraFoods(qtd) {
        // Gera comidas extras aleatórias (usado só quando pimenta é comida)
        let tentativas = 0;
        while (this.extraFoods.length < qtd && tentativas < 100) {
            this.extraFoods.push(this.createFood());
            tentativas++;
        }
    }

    createFood(type) {
        if (!this.snake) return { x: 10, y: 10, type: 'normal' };

        let food;
        let tentativas = 0;
        do {
            tentativas++;
            food = {
                x: Math.floor(Math.random() * ((this.canvas.width / this.cellSize) - 2)) + 1,
                y: Math.floor(Math.random() * ((this.canvas.height / this.cellSize) - 2)) + 1,
                type: type ||
                    (() => {
                        const r = Math.random();
                        if (r < 0.18) return 'pimenta'; // 18% pimenta
                        if (r < 0.28) return 'berserker';
                        if (r < 0.48) return 'power';
                        return 'normal';
                    })()
            };
            // Evita sobreposição
            if (tentativas > 50) break;
        } while (this.checkCollision(food) || this.extraFoods.some(f => f.x === food.x && f.y === food.y) || (this.bot && food.x === this.bot.x && food.y === this.bot.y));
        return food;
    }

    setupControls() {
        if (this.controlsSetup) return; // Evita múltiplos listeners
        this.controlsSetup = true;
        document.addEventListener('keydown', (e) => {
            if (!this.gameActive) return;

            switch (e.key.toLowerCase()) {
                case 'arrowup':
                case 'w':
                    if (this.direction !== 'down') this.nextDirection = 'up';
                    break;
                case 'arrowdown':
                case 's':
                    if (this.direction !== 'up') this.nextDirection = 'down';
                    break;
                case 'arrowleft':
                case 'a':
                    if (this.direction !== 'right') this.nextDirection = 'left';
                    break;
                case 'arrowright':
                case 'd':
                    if (this.direction !== 'left') this.nextDirection = 'right';
                    break;
                case 'p':
                    this.togglePause();
                    break;
            }
        });
    }

    togglePause() {
        this.paused = !this.paused;
        if (!this.paused) {
            setTimeout(this.gameLoop, this.speed);
        }
    }

    update() {
        // console.log("update chamado");
        if (!this.gameActive || this.paused) return;

        let head;
        try {
            head = { ...this.snake[0] };
        } catch (e) {
            this.gameOver();
            return;
        }

        // Atualizar posição da cabeça
        switch (this.nextDirection) {
            case 'up': head.y--; break;
            case 'down': head.y++; break;
            case 'left': head.x--; break;
            case 'right': head.x++; break;
        }

        // Atualizar posição do bot perseguidor (controla velocidade)
        this.botMoveCounter = (this.botMoveCounter || 0) + 1;
        if (this.botMoveCounter >= this.botMoveInterval) {
            this.moveBot();
            this.botMoveCounter = 0;
        }

        // Verificar colisão do bot com a cobra
        if (this.snake.some(segment => segment.x === this.bot.x && segment.y === this.bot.y)) {
            this.gameOver();
            return;
        }

        // Verificar colisões com obstáculos e corpo (NÃO com comidas)
        if (
            this.checkCollisionObstaclesAndSelf(head) ||
            head.x < 0 || head.y < 0 ||
            head.x >= this.canvas.width / this.cellSize ||
            head.y >= this.canvas.height / this.cellSize
        ) {
            this.gameOver();
            return;
        }

        // Mover cobra
        this.snake.unshift(head);

        // Verifica colisão com comidas extras
        let ateExtra = false;
        let extraIndex = -1;
        let extraType = null;
        if (this.extraFoods.length > 0) {
            this.extraFoods.forEach((food, idx) => {
                if (head.x === food.x && head.y === food.y) {
                    ateExtra = true;
                    extraIndex = idx;
                    extraType = food.type;
                }
            });
        }

        // Verifica comida principal
        if (head.x === this.food.x && head.y === this.food.y) {
            this.resolveFoodEffect(this.food.type);
            // Após comer, só gera UMA nova comida principal
            this.food = this.createFood();
        } else if (ateExtra) {
            this.resolveFoodEffect(extraType);
            this.extraFoods.splice(extraIndex, 1);
        } else {
            this.snake.pop();
        }

        // Checa premiação
        this.checkAward();

        this.direction = this.nextDirection;
    }

    moveBot() {
        // Bot sempre tenta se aproximar da cabeça da cobra
        if (!this.bot) return;
        const target = this.snake[0];
        let dx = target.x - this.bot.x;
        let dy = target.y - this.bot.y;
        let next = { x: this.bot.x, y: this.bot.y };

        // Prioriza o eixo maior de distância, mas evita obstáculos e bordas
        let moved = false;
        const tryMove = (nx, ny) => {
            // Não pode colidir com obstáculos, bordas ou corpo da cobra
            if (
                nx < 0 || ny < 0 ||
                nx >= this.canvas.width / this.cellSize ||
                ny >= this.canvas.height / this.cellSize
            ) return false;
            if (this.obstacles.some(obs => obs.x === nx && obs.y === ny)) return false;
            if (this.snake.some(seg => seg.x === nx && seg.y === ny)) return false;
            return true;
        };

        // Movimento preferencial
        if (Math.abs(dx) > Math.abs(dy)) {
            if (dx > 0 && tryMove(this.bot.x + 1, this.bot.y)) {
                next.x++;
                this.bot.lastMove = 'right';
                moved = true;
            } else if (dx < 0 && tryMove(this.bot.x - 1, this.bot.y)) {
                next.x--;
                this.bot.lastMove = 'left';
                moved = true;
            }
        }
        if (!moved) {
            if (dy > 0 && tryMove(this.bot.x, this.bot.y + 1)) {
                next.y++;
                this.bot.lastMove = 'down';
                moved = true;
            } else if (dy < 0 && tryMove(this.bot.x, this.bot.y - 1)) {
                next.y--;
                this.bot.lastMove = 'up';
                moved = true;
            }
        }
        // Se não conseguiu preferencial, tenta o outro eixo
        if (!moved && Math.abs(dx) <= Math.abs(dy)) {
            if (dx > 0 && tryMove(this.bot.x + 1, this.bot.y)) {
                next.x++;
                this.bot.lastMove = 'right';
                moved = true;
            } else if (dx < 0 && tryMove(this.bot.x - 1, this.bot.y)) {
                next.x--;
                this.bot.lastMove = 'left';
                moved = true;
            }
        }
        if (!moved && Math.abs(dx) > Math.abs(dy)) {
            if (dy > 0 && tryMove(this.bot.x, this.bot.y + 1)) {
                next.y++;
                this.bot.lastMove = 'down';
                moved = true;
            } else if (dy < 0 && tryMove(this.bot.x, this.bot.y - 1)) {
                next.y--;
                this.bot.lastMove = 'up';
                moved = true;
            }
        }
        // Se não conseguiu nenhum movimento, mantém posição
        this.bot.x = next.x;
        this.bot.y = next.y;
    }

    resolveFoodEffect(type) {
        switch (type) {
            case 'pimenta':
                this.score += 20;
                // Adiciona 2 comidas extras aleatórias
                this.spawnExtraFoods(2);
                break;
            case 'berserker':
                this.score += 15;
                break;
            case 'power':
                this.score += 10;
                break;
            default:
                this.score += 5;
        }
        this.updateScore();
    }

    // Nova função: só verifica colisão com corpo e obstáculos
    checkCollisionObstaclesAndSelf(pos) {
        const snakeArr = Array.isArray(this.snake) ? this.snake : [];
        const obsArr = Array.isArray(this.obstacles) ? this.obstacles : [];
        return snakeArr.some(segment =>
            segment.x === pos.x && segment.y === pos.y
        ) || obsArr.some(obs =>
            obs.x === pos.x && obs.y === pos.y
        );
    }

    // Mantém a função original para gerar comidas (usada só para não sobrepor comidas)
    checkCollision(pos) {
        // Garante que todos os arrays existem antes de usar .some()
        const snakeArr = Array.isArray(this.snake) ? this.snake : [];
        const obsArr = Array.isArray(this.obstacles) ? this.obstacles : [];
        const extraArr = Array.isArray(this.extraFoods) ? this.extraFoods : [];

        return snakeArr.some(segment =>
            segment.x === pos.x && segment.y === pos.y
        ) || obsArr.some(obs =>
            obs.x === pos.x && obs.y === pos.y
        ) || extraArr.some(f =>
            f.x === pos.x && f.y === pos.y
        ) || (this.food && pos.x === this.food.x && pos.y === this.food.y);
    }

    updateScore() {
        const scoreEl = document.getElementById('score');
        if (scoreEl) scoreEl.textContent = `Pontos: ${this.score}`;
    }

    draw() {
        console.log("Método draw chamado");
        if (!this.ctx || !this.gameActive) return;

        // Fundo gradiente no canvas
        const grad = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
        grad.addColorStop(0, "#1a0f3c");
        grad.addColorStop(0.5, "#4b1f6e");
        grad.addColorStop(1, "#ff4d4d");
        this.ctx.fillStyle = grad;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Sombra e borda do canvas
        this.ctx.save();
        this.ctx.shadowColor = "#ff4d4d";
        this.ctx.shadowBlur = 18;
        this.ctx.strokeStyle = "#fff";
        this.ctx.lineWidth = 5;
        this.ctx.strokeRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.restore();

        // Cobra com efeito de brilho e degradê
        if (Array.isArray(this.snake)) {
            this.snake.forEach((segment, index) => {
                const grad = this.ctx.createRadialGradient(
                    segment.x * this.cellSize + this.cellSize / 2,
                    segment.y * this.cellSize + this.cellSize / 2,
                    2,
                    segment.x * this.cellSize + this.cellSize / 2,
                    segment.y * this.cellSize + this.cellSize / 2,
                    this.cellSize / 1.2
                );
                if (index === 0) {
                    grad.addColorStop(0, "#fff");
                    grad.addColorStop(0.5, "#ff4d4d");
                    grad.addColorStop(1, "#a6348f");
                } else {
                    grad.addColorStop(0, "#ff8400");
                    grad.addColorStop(1, "#7c2a88");
                }
                this.ctx.save();
                this.ctx.shadowColor = "#fff";
                this.ctx.shadowBlur = index === 0 ? 18 : 6;
                this.ctx.fillStyle = grad;
                this.ctx.beginPath();
                this.ctx.arc(
                    segment.x * this.cellSize + this.cellSize / 2,
                    segment.y * this.cellSize + this.cellSize / 2,
                    this.cellSize / 2 - 1,
                    0, 2 * Math.PI
                );
                this.ctx.fill();
                this.ctx.restore();
            });
        }

        // Obstáculos como blocos quadrados escuros, sem brilho, bem diferentes da comida
        if (Array.isArray(this.obstacles)) {
            this.obstacles.forEach(obs => {
                this.ctx.save();
                this.ctx.shadowBlur = 0;
                this.ctx.fillStyle = "#444"; // cinza escuro
                this.ctx.strokeStyle = "#222";
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.rect(
                    obs.x * this.cellSize + 2,
                    obs.y * this.cellSize + 2,
                    this.cellSize - 4,
                    this.cellSize - 4
                );
                this.ctx.fill();
                this.ctx.stroke();
                this.ctx.restore();
            });
        }

        // Comidas com formas e efeitos diferentes
        if (this.food) {
            this.drawFoodItem(this.food);
        }
        if (this.extraFoods.length > 0) {
            this.extraFoods.forEach(food => {
                this.drawFoodItem(food);
            });
        }

        // Bot perseguidor com efeito neon
        if (this.bot) {
            this.ctx.save();
            const grad = this.ctx.createRadialGradient(
                this.bot.x * this.cellSize + this.cellSize / 2,
                this.bot.y * this.cellSize + this.cellSize / 2,
                2,
                this.bot.x * this.cellSize + this.cellSize / 2,
                this.bot.y * this.cellSize + this.cellSize / 2,
                this.cellSize / 1.2
            );
            grad.addColorStop(0, "#fff");
            grad.addColorStop(0.5, "#00e6ff");
            grad.addColorStop(1, "#1a0f3c");
            this.ctx.shadowColor = "#00e6ff";
            this.ctx.shadowBlur = 18;
            this.ctx.fillStyle = grad;
            this.ctx.beginPath();
            this.ctx.arc(
                this.bot.x * this.cellSize + this.cellSize / 2,
                this.bot.y * this.cellSize + this.cellSize / 2,
                this.cellSize / 2 - 1,
                0, 2 * Math.PI
            );
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
            this.ctx.fillStyle = 'white';
            this.ctx.font = 'bold 14px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('DENDE', this.bot.x * this.cellSize + this.cellSize / 2, this.bot.y * this.cellSize - 4);
            this.ctx.restore();
        }

        // ...existing code for pause/game over/legend...
        if (this.paused) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = 'white';
            this.ctx.font = '48px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('PAUSADO', this.canvas.width / 2, this.canvas.height / 2);
            this.ctx.font = '24px Arial';
            this.ctx.fillText('Pressione P para continuar', this.canvas.width / 2, this.canvas.height / 2 + 40);
        }

        if (this.gameOverScreen) {
            // Re-desenhar tela de game over para manter visível
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            this.ctx.fillStyle = '#ff4d4d';
            this.ctx.font = 'bold 64px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Fim de Jogo!', this.canvas.width / 2, this.canvas.height / 2 - 50);

            this.ctx.fillStyle = 'white';
            this.ctx.font = '36px Arial';
            this.ctx.fillText(`Pontuação: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 + 20);

            this.ctx.font = '24px Arial';
            this.ctx.fillText('Pressione ENTER para voltar ao menu', this.canvas.width / 2, this.canvas.height / 2 + 80);
        }

        this.drawLegend();
    }

    drawFoodItem(food) {
        // Comidas com formas e efeitos diferentes
        this.ctx.save();
        let color = 'lime', letter = '', shape = 'circle', label = '';
        switch (food.type) {
            case 'power':
                color = '#ffe066'; letter = 'V'; shape = 'star'; label = 'Vatapá'; break; // amarelo vatapá
            case 'berserker':
                color = '#3c8c3c'; letter = 'C'; shape = 'diamond'; label = 'Caruru'; break; // verde caruru
            case 'pimenta':
                color = 'red'; letter = 'P'; shape = 'pepper'; label = 'Pimenta'; break;
            default:
                color = 'lime'; letter = ''; shape = 'circle'; label = 'Salada';
        }
        const x = food.x * this.cellSize + this.cellSize / 2;
        const y = food.y * this.cellSize + this.cellSize / 2;
        if (shape === 'circle') {
            const grad = this.ctx.createRadialGradient(x, y, 2, x, y, this.cellSize / 2);
            grad.addColorStop(0, "#fff");
            grad.addColorStop(0.7, color);
            grad.addColorStop(1, "#222");
            this.ctx.fillStyle = grad;
            this.ctx.beginPath();
            this.ctx.arc(x, y, this.cellSize / 2 - 2, 0, 2 * Math.PI);
            this.ctx.fill();
        } else if (shape === 'star') {
            // Desenha uma estrela (Vatapá)
            this.ctx.fillStyle = color;
            this.ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                this.ctx.lineTo(
                    x + Math.cos((18 + i * 72) * Math.PI / 180) * (this.cellSize / 2 - 2),
                    y - Math.sin((18 + i * 72) * Math.PI / 180) * (this.cellSize / 2 - 2)
                );
                this.ctx.lineTo(
                    x + Math.cos((54 + i * 72) * Math.PI / 180) * (this.cellSize / 4),
                    y - Math.sin((54 + i * 72) * Math.PI / 180) * (this.cellSize / 4)
                );
            }
            this.ctx.closePath();
            this.ctx.shadowColor = "#fff";
            this.ctx.shadowBlur = 10;
            this.ctx.fill();
        } else if (shape === 'diamond') {
            // Desenha um losango (Caruru)
            this.ctx.fillStyle = color;
            this.ctx.beginPath();
            this.ctx.moveTo(x, y - this.cellSize / 2 + 2);
            this.ctx.lineTo(x + this.cellSize / 2 - 2, y);
            this.ctx.lineTo(x, y + this.cellSize / 2 - 2);
            this.ctx.lineTo(x - this.cellSize / 2 + 2, y);
            this.ctx.closePath();
            this.ctx.shadowColor = "#fff";
            this.ctx.shadowBlur = 8;
            this.ctx.fill();
        } else if (shape === 'pepper') {
            // Desenha uma pimenta estilizada
            this.ctx.beginPath();
            this.ctx.ellipse(x, y, this.cellSize / 3, this.cellSize / 2.2, -0.3, 0, 2 * Math.PI);
            this.ctx.fillStyle = color;
            this.ctx.shadowColor = "#fff";
            this.ctx.shadowBlur = 8;
            this.ctx.fill();
            // Cabinho verde
            this.ctx.beginPath();
            this.ctx.moveTo(x, y - this.cellSize / 2.2);
            this.ctx.lineTo(x + 2, y - this.cellSize / 2.7);
            this.ctx.lineWidth = 3;
            this.ctx.strokeStyle = "#3f0";
            this.ctx.stroke();
        }
        // Letra sobre a comida
        if (letter) {
            this.ctx.shadowBlur = 0;
            this.ctx.fillStyle = 'white';
            this.ctx.font = 'bold 14px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(letter, x, y + 4);
        }
        this.ctx.restore();
    }

    drawLegend() {
        // Legenda fixa no rodapé central do container, fora do canvas
        let legendDiv = document.getElementById('legend-bottom');
        if (!legendDiv) {
            legendDiv = document.createElement('div');
            legendDiv.id = 'legend-bottom';
            legendDiv.className = 'legend-bottom';
            document.getElementById('gameContainer').appendChild(legendDiv);
        }
        // Só mostra a legenda se o canvas estiver visível
        const canvas = document.getElementById('gameCanvas');
        if (canvas && canvas.style.display !== 'none') {
            legendDiv.style.display = 'flex';
        } else {
            legendDiv.style.display = 'none';
        }
        legendDiv.innerHTML = `
            <div style="display:flex;align-items:center;margin-bottom:16px;">
                <span style="display:inline-block;width:38px;height:38px;background:lime;border-radius:8px;margin-right:18px;border:3px solid #fff;"></span>
                <span style="color:#fff;font-size:24px;font-weight:bold;">Salada</span>
                <span style="color:#aaa;font-size:18px;margin-left:14px;">(+5 pontos)</span>
            </div>
            <div style="display:flex;align-items:center;margin-bottom:16px;">
                <span style="display:inline-flex;justify-content:center;align-items:center;width:38px;height:38px;background:#ffe066;border-radius:8px;margin-right:18px;border:3px solid #fff;font-weight:bold;color:#fff;font-size:22px;">V</span>
                <span style="color:#fff;font-size:24px;font-weight:bold;">Vatapá</span>
                <span style="color:#aaa;font-size:18px;margin-left:14px;">(+10 pontos)</span>
            </div>
            <div style="display:flex;align-items:center;margin-bottom:16px;">
                <span style="display:inline-flex;justify-content:center;align-items:center;width:38px;height:38px;background:#3c8c3c;border-radius:8px;margin-right:18px;border:3px solid #fff;font-weight:bold;color:#fff;font-size:22px;">C</span>
                <span style="color:#fff;font-size:24px;font-weight:bold;">Caruru</span>
                <span style="color:#aaa;font-size:18px;margin-left:14px;">(+15 pontos)</span>
            </div>
            <div style="display:flex;align-items:center;margin-bottom:16px;">
                <span style="display:inline-flex;justify-content:center;align-items:center;width:38px;height:38px;background:red;border-radius:8px;margin-right:18px;border:3px solid #fff;font-weight:bold;color:#fff;font-size:22px;">P</span>
                <span style="color:#fff;font-size:24px;font-weight:bold;">Pimenta</span>
                <span style="color:#aaa;font-size:18px;margin-left:14px;">(+20 pontos, mais comida)</span>
            </div>
            <div style="display:flex;align-items:center;">
                <span style="display:inline-flex;justify-content:center;align-items:center;width:38px;height:38px;background:#00e6ff;border-radius:8px;margin-right:18px;border:3px solid #fff;font-weight:bold;color:#222;font-size:16px;">DENDE</span>
                <span style="color:#fff;font-size:24px;font-weight:bold;">DENDE</span>
                <span style="color:#aaa;font-size:18px;margin-left:14px;">(encostou, fim de jogo)</span>
            </div>
        `;
    }

    createObstaclesByDifficulty() {
        // Obstáculos em padrões orgânicos e "ilhas"
        this.obstacles = [];
        const addIsland = (cx, cy, r, n) => {
            for (let i = 0; i < n; i++) {
                const angle = (2 * Math.PI / n) * i + Math.random() * 0.5;
                const rx = Math.round(cx + Math.cos(angle) * r + (Math.random() - 0.5) * 2);
                const ry = Math.round(cy + Math.sin(angle) * r + (Math.random() - 0.5) * 2);
                // Não coloca obstáculo na área segura
                if (!this.isInSafeZone(rx, ry)) {
                    this.obstacles.push({ x: rx, y: ry });
                }
            }
        };
        const maxX = Math.floor(this.canvas.width / this.cellSize);
        const maxY = Math.floor(this.canvas.height / this.cellSize);

        // Função para gerar obstáculos aleatórios fora da área segura
        const randomObstacle = () => {
            let x, y, tries = 0;
            do {
                x = Math.floor(Math.random() * maxX);
                y = Math.floor(Math.random() * maxY);
                tries++;
            } while (this.isInSafeZone(x, y) && tries < 20);
            return { x, y };
        };

        if (this.difficulty === 'easy') {
            addIsland(18, 10, 4, 10);
            addIsland(50, 30, 6, 14);
            for (let i = 0; i < 14; i++) {
                let obs = randomObstacle();
                if (!this.isInSafeZone(obs.x, obs.y)) this.obstacles.push(obs);
            }
        } else if (this.difficulty === 'medium') {
            addIsland(15, 8, 6, 14);
            addIsland(60, 35, 8, 18);
            addIsland(35, 20, 5, 12);
            for (let i = 0; i < 22; i++) {
                let obs = randomObstacle();
                if (!this.isInSafeZone(obs.x, obs.y)) this.obstacles.push(obs);
            }
        } else if (this.difficulty === 'hard') {
            addIsland(10, 7, 7, 18);
            addIsland(65, 38, 9, 22);
            addIsland(35, 15, 6, 14);
            addIsland(45, 28, 7, 16);
            for (let i = 0; i < 32; i++) {
                let obs = randomObstacle();
                if (!this.isInSafeZone(obs.x, obs.y)) this.obstacles.push(obs);
            }
        }
    }

    isInSafeZone(x, y) {
        // Retorna true se (x, y) está na área segura de spawn da cobra
        return (
            x >= this.safeZone.x &&
            x < this.safeZone.x + this.safeZone.w &&
            y >= this.safeZone.y &&
            y < this.safeZone.y + this.safeZone.h
        );
    }

    checkAward() {
        if (this.awardShown) return;
        let limite = 0;
        let msg = '';
        if (this.difficulty === 'easy') {
            limite = 100;
            msg = 'Parabéns! Você atingiu 100 pontos no modo Tranquilo! 🏅';
        } else if (this.difficulty === 'medium') {
            limite = 80;
            msg = 'Parabéns! Você atingiu 80 pontos no modo Esquentando! 🏅';
        } else if (this.difficulty === 'hard') {
            limite = 30;
            msg = 'Parabéns! Você atingiu 30 pontos no modo Apimentado! 🏅';
        }
        if (this.score >= limite && limite > 0) {
            this.awardShown = true;
            this.showAward(msg);
            // Finaliza o jogo ao atingir a pontuação de premiação
            setTimeout(() => {
                // Mostra tela de vitória personalizada
                this.showVictoryScreen(msg);
            }, 2500);
        }
    }

    showVictoryScreen(msg) {
        this.gameActive = false;
        this.gameOverScreen = true;
        // Fundo escuro
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.92)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Título de vitória
        this.ctx.fillStyle = '#ffeb3b';
        this.ctx.font = 'bold 64px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('VOCÊ VENCEU!', this.canvas.width / 2, this.canvas.height / 2 - 80);

        // Mensagem de premiação
        this.ctx.fillStyle = 'white';
        this.ctx.font = '32px Arial';
        this.ctx.fillText(msg, this.canvas.width / 2, this.canvas.height / 2 - 20);

        // Pontuação final
        this.ctx.font = '28px Arial';
        this.ctx.fillText(`Pontuação final: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 + 40);

        // Instrução para voltar ao menu
        this.ctx.font = '22px Arial';
        this.ctx.fillText('Pressione ENTER para voltar ao menu', this.canvas.width / 2, this.canvas.height / 2 + 90);

        // Removido ranking
        // Adiciona listener para ENTER
        const returnHandler = (e) => {
            if (e.key === 'Enter' && this.gameOverScreen) {
                this.gameOverScreen = false;
                const menu = document.getElementById('mainMenu');
                if (menu) menu.style.display = 'block';
                document.removeEventListener('keydown', returnHandler);
            }
        };
        document.addEventListener('keydown', returnHandler);
        // Esconde barra de meta ao vencer
        const bar = document.getElementById('goalBar');
        if (bar) bar.style.display = 'none';
    }

    showAward(msg) {
        // Mostra premiação no canvas
        if (!this.ctx) return;
        this.ctx.save();
        this.ctx.globalAlpha = 0.92;
        this.ctx.fillStyle = '#222';
        this.ctx.fillRect(100, this.canvas.height / 2 - 80, this.canvas.width - 200, 120);
        this.ctx.globalAlpha = 1;
        this.ctx.strokeStyle = '#ff8400';
        this.ctx.lineWidth = 4;
        this.ctx.strokeRect(100, this.canvas.height / 2 - 80, this.canvas.width - 200, 120);
        this.ctx.fillStyle = '#ffeb3b';
        this.ctx.font = 'bold 36px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('🏆 PREMIAÇÃO 🏆', this.canvas.width / 2, this.canvas.height / 2 - 20);
        this.ctx.fillStyle = 'white';
        this.ctx.font = '24px Arial';
        this.ctx.fillText(msg, this.canvas.width / 2, this.canvas.height / 2 + 25);
        this.ctx.restore();
        // Some após 2.5 segundos
        setTimeout(() => { this.awardShown = false; }, 2500);
    }

    showGoalBar() {
        // Cria ou atualiza a barra de meta de pontos
        let goal = 0, txt = '';
        if (this.difficulty === 'easy') {
            goal = 100;
            txt = 'Meta: Faça 100 pontos para vencer!';
        } else if (this.difficulty === 'medium') {
            goal = 80;
            txt = 'Meta: Faça 80 pontos para vencer!';
        } else if (this.difficulty === 'hard') {
            goal = 30;
            txt = 'Meta: Faça 30 pontos para vencer!';
        }
        let bar = document.getElementById('goalBar');
        if (!bar) {
            bar = document.createElement('div');
            bar.id = 'goalBar';
            bar.className = 'goal-bar-fixed';
            document.body.appendChild(bar);
        }
        bar.textContent = txt;
        bar.style.display = 'block';
    }

    gameLoop() {
        // Adicione log para saber se o loop está rodando
        // (não deixe log aqui em produção, só para debug)
        // console.log("gameLoop rodando, gameActive:", this.gameActive, "paused:", this.paused);
        if (!this.gameActive) return;

        if (!this.paused) {
            this.update();
            this.draw();
        }

        if (this.gameActive && !this.paused) {
            setTimeout(this.gameLoop, this.speed);
        }
    }

    gameOver() {
        this.gameActive = false;
        this.gameOverScreen = true;
        // Removido ranking

        // Mostra tela de game over no canvas e só volta ao menu se o jogador apertar ENTER
        const menu = document.getElementById('mainMenu');
        const canvas = document.getElementById('gameCanvas');
        if (canvas) canvas.style.display = 'block';
        if (menu) menu.style.display = 'none';

        // Esconde barra de meta ao perder
        const bar = document.getElementById('goalBar');
        if (bar) bar.style.display = 'none';

        // Esconde controles mobile ao voltar pro menu (quando realmente voltar)
        const showMenu = () => {
            if (canvas) canvas.style.display = 'none';
            if (menu) menu.style.display = 'flex';
            if (typeof window.showMobileControls === 'function') {
                window.showMobileControls(false);
            }
            // Esconde a legenda ao voltar para o menu
            const legend = document.getElementById('legend-bottom');
            if (legend) legend.style.display = 'none';
            document.removeEventListener('keydown', handler);
        };

        // Handler para ENTER
        const handler = (e) => {
            if (e.key === 'Enter' && this.gameOverScreen) {
                this.gameOverScreen = false;
                showMenu();
            }
        };
        document.addEventListener('keydown', handler);

        // Desenha tela de game over no canvas
        if (this.ctx) {
            this.ctx.save();
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            this.ctx.fillStyle = '#ff4d4d';
            this.ctx.font = 'bold 64px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Fim de Jogo!', this.canvas.width / 2, this.canvas.height / 2 - 50);

            this.ctx.fillStyle = 'white';
            this.ctx.font = '36px Arial';
            this.ctx.fillText(`Pontuação: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 + 20);

            this.ctx.font = '24px Arial';
            this.ctx.fillText('Pressione ENTER para voltar ao menu', this.canvas.width / 2, this.canvas.height / 2 + 80);
            this.ctx.restore();
        }
    }

    updateRankingDisplay() {
        // Função vazia, ranking removido
    }
}

// Global game instance
let game = null;

// Initialize game
window.addEventListener('load', () => {
    game = new SnakeGame();
});

// Global start game function
window.startGame = () => {
    console.log("startGame chamado");
    window.debugSnakeGame();
    const nameInput = document.getElementById('playerName');
    const playerName = nameInput ? nameInput.value.trim() : '';
    const selectedLevel = window.selectedLevel;

    if (!playerName) {
        alert('Digite seu nome antes de iniciar!');
        if (nameInput) nameInput.focus();
        return;
    }
    if (!selectedLevel) {
        alert('Escolha um nível antes de iniciar!');
        return;
    }

    if (!game) {
        game = new SnakeGame();
        console.log("Nova instância SnakeGame criada");
    }
    // Esconde menu e mostra canvas
    const menu = document.getElementById('mainMenu');
    if (menu) menu.style.display = 'none';
    const canvas = document.getElementById('gameCanvas');
    if (canvas) canvas.style.display = 'block';
    // Passa o nome e o nível para o jogo
    game.playerName = playerName;
    game.init(selectedLevel);
    // Debug após init
    setTimeout(window.debugSnakeGame, 200);
};

// TESTE DE INICIALIZAÇÃO E CANVAS
window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        alert('Canvas não encontrado!');
        console.error('Canvas não encontrado!');
    } else {
        console.log('Canvas encontrado:', canvas);
        try {
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                alert('Contexto 2D do canvas não foi obtido!');
                console.error('Contexto 2D do canvas não foi obtido!');
            } else {
                ctx.fillStyle = 'lime';
                ctx.fillRect(10, 10, 100, 40);
                ctx.font = '20px Arial';
                ctx.fillStyle = 'black';
                ctx.fillText('TESTE CANVAS', 15, 35);
                console.log('Canvas testado com sucesso!');
            }
        } catch (e) {
            alert('Erro ao testar o canvas: ' + e.message);
            console.error('Erro ao testar o canvas:', e);
        }
    }
});

// TESTE DE INSTÂNCIA DO JOGO
window.addEventListener('load', () => {
    console.log('window.onload chamado');
    try {
        game = new SnakeGame();
        console.log('SnakeGame instanciado:', game);
        if (typeof game.draw === 'function') {
            console.log('Método draw existe');
        } else {
            console.error('Método draw NÃO existe');
        }
        if (typeof game.gameLoop === 'function') {
            console.log('Método gameLoop existe');
        } else {
            console.error('Método gameLoop NÃO existe');
        }
    } catch (e) {
        alert('Erro ao instanciar SnakeGame: ' + e.message);
        console.error('Erro ao instanciar SnakeGame:', e);
    }
});