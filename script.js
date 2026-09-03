// SpaceRacing Game - Created by TINELAB
class SpaceRacing {
    constructor() {
        this.tg = window.Telegram.WebApp;
        this.currentScreen = 'start';
        this.score = 0;
        this.coins = 1500;
        this.selectedShip = 1;
        this.baseGameSpeed = 3;
        this.gameSpeed = 3;
        this.isPlaying = false;
        this.isPaused = false;
        this.obstacles = [];
        this.gameCoins = [];
        this.animationId = null;
        this.lastTime = 0;
        this.lastObstacleSpawn = 0;
        this.lastCoinSpawn = 0;
        this.distance = 0;
        this.level = 1;
        
        // Управление
        this.touchActive = false;
        this.touchX = 0;
        this.targetShipX = 50;
        this.currentShipX = 50;
        
        // Размеры игрового поля
        this.gameWidth = 0;
        this.gameHeight = 0;
        
        // Таймер респавна (ДОБАВЛЕНО)
        this.respawnTimerId = null;
        
        // Данные о кораблях
        this.ships = {
            1: { name: 'Spaceship #1', price: 0, unlocked: true, stars: 2 },
            2: { name: 'Spaceship #2', price: 500, unlocked: false, stars: 3 },
            3: { name: 'Spaceship #3', price: 1000, unlocked: false, stars: 4 }
        };
        
        this.init();
    }
    
    init() {
        if (this.tg) {
            try {
                this.tg.expand();
                this.tg.ready();
                this.tg.setHeaderColor('#000000');
                this.tg.setBackgroundColor('#000000');
            } catch(e) {
                console.log('TG not available');
            }
        }
        
        this.setupTouchControls();
        this.setupKeyboard();
        this.loadData();
        this.renderShips();
        
        console.log('🚀 SpaceRacing by TINELAB initialized');
    }
    
    setupTouchControls() {
        const gameArea = document.getElementById('gameArea');
        if (!gameArea) return;
        
        const updateSize = () => {
            const rect = gameArea.getBoundingClientRect();
            this.gameWidth = rect.width || gameArea.offsetWidth || 375;
            this.gameHeight = rect.height || gameArea.offsetHeight || 600;
        };
        
        gameArea.addEventListener('touchstart', (e) => {
            if (!this.isPlaying || this.isPaused) return;
            updateSize();
            const touch = e.touches[0];
            const rect = gameArea.getBoundingClientRect();
            this.targetShipX = ((touch.clientX - rect.left) / this.gameWidth) * 100;
            this.targetShipX = Math.max(10, Math.min(90, this.targetShipX));
            this.touchActive = true;
        }, {passive: true});
        
        gameArea.addEventListener('touchmove', (e) => {
            if (!this.isPlaying || this.isPaused) return;
            const touch = e.touches[0];
            const rect = gameArea.getBoundingClientRect();
            this.targetShipX = ((touch.clientX - rect.left) / this.gameWidth) * 100;
            this.targetShipX = Math.max(10, Math.min(90, this.targetShipX));
            this.touchActive = true;
        }, {passive: true});
        
        gameArea.addEventListener('touchend', () => {
            this.touchActive = false;
        }, {passive: true});
        
        gameArea.addEventListener('mousedown', (e) => {
            if (!this.isPlaying || this.isPaused) return;
            updateSize();
            const rect = gameArea.getBoundingClientRect();
            this.targetShipX = ((e.clientX - rect.left) / this.gameWidth) * 100;
            this.targetShipX = Math.max(10, Math.min(90, this.targetShipX));
            this.touchActive = true;
        });
        
        gameArea.addEventListener('mousemove', (e) => {
            if (!this.isPlaying || this.isPaused || !this.touchActive) return;
            const rect = gameArea.getBoundingClientRect();
            this.targetShipX = ((e.clientX - rect.left) / this.gameWidth) * 100;
            this.targetShipX = Math.max(10, Math.min(90, this.targetShipX));
        });
        
        gameArea.addEventListener('mouseup', () => { this.touchActive = false; });
        gameArea.addEventListener('mouseleave', () => { this.touchActive = false; });
    }
    
    updateShipPosition() {
        const playerShip = document.getElementById('playerShip');
        if (!playerShip) return;
        
        this.currentShipX += (this.targetShipX - this.currentShipX) * 0.2;
        this.currentShipX = Math.max(10, Math.min(90, this.currentShipX));
        
        playerShip.style.left = this.currentShipX + '%';
    }
    
    setupKeyboard() {
        document.addEventListener('keydown', (e) => {
            if (!this.isPlaying) return;
            if (e.key === 'ArrowLeft' || e.key === 'a') {
                this.targetShipX = Math.max(10, this.targetShipX - 10);
                this.touchActive = true;
            } else if (e.key === 'ArrowRight' || e.key === 'd') {
                this.targetShipX = Math.min(90, this.targetShipX + 10);
                this.touchActive = true;
            }
        });
        
        document.addEventListener('keyup', (e) => {
            if (['ArrowLeft', 'a', 'ArrowRight', 'd'].includes(e.key)) {
                this.touchActive = false;
            }
        });
    }
    
    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            setTimeout(() => {
                targetScreen.classList.add('active');
            }, 50);
            this.currentScreen = screenId;
        }
    }
    
    showShipSelection() {
        this.showScreen('shipSelection');
        this.updateCoinDisplay();
        this.renderShips();
    }
    
    renderShips() {
        const container = document.getElementById('shipsContainer');
        if (!container) return;
        
        container.innerHTML = '';
        
        Object.keys(this.ships).forEach(shipId => {
            const ship = this.ships[shipId];
            const card = document.createElement('div');
            card.className = `ship-card ship-card-${shipId}`;
            card.dataset.ship = shipId;
            
            if (ship.unlocked && shipId == this.selectedShip) {
                card.classList.add('active', 'selected');
            }
            if (!ship.unlocked) {
                card.classList.add('locked');
            }
            
            card.innerHTML = `
                <div class="ship-preview ship-${shipId}"></div>
                <h3>${ship.name}</h3>
                ${!ship.unlocked ? `
                    <div class="lock-overlay">
                        <span class="lock-icon">🔒</span>
                        <span class="price">${ship.price} </span>
                    </div>
                ` : ''}
            `;
            
            card.addEventListener('click', () => this.handleShipClick(parseInt(shipId)));
            container.appendChild(card);
        });
        
        const startBtn = document.createElement('button');
        startBtn.className = 'start-game-btn';
        startBtn.textContent = 'START RACE 🚀';
        startBtn.onclick = () => this.startGame();
        container.appendChild(startBtn);
    }
    
    handleShipClick(shipId) {
        const ship = this.ships[shipId];
        
        if (ship.unlocked) {
            this.selectedShip = shipId;
            this.renderShips();
            this.updateShipAppearance();
            this.saveData();
        } else {
            this.tryPurchaseShip(shipId);
        }
    }
    
    tryPurchaseShip(shipId) {
        const ship = this.ships[shipId];
        
        if (this.coins >= ship.price) {
            this.coins -= ship.price;
            ship.unlocked = true;
            this.selectedShip = shipId;
            
            this.updateCoinDisplay();
            this.renderShips();
            this.updateShipAppearance();
            this.saveData();
            
            this.showNotification(`🎉 ${ship.name} UNLOCKED!`, 'success');
        } else {
            this.showNotification(`❌ Need ${ship.price - this.coins} more coins!`, 'error');
        }
    }
    
    showNotification(text, type = 'success') {
        const old = document.querySelector('.purchase-notification');
        if (old) old.remove();
        
        const notif = document.createElement('div');
        notif.className = `purchase-notification ${type === 'error' ? 'error' : ''}`;
        notif.textContent = text;
        document.body.appendChild(notif);
        
        setTimeout(() => notif.classList.add('show'), 10);
        setTimeout(() => {
            notif.classList.remove('show');
            setTimeout(() => notif.remove(), 400);
        }, 2000);
    }
    
    startGame() {
        console.log('🎮 Starting game...');
        this.showScreen('gameScreen');
        
        // Увеличиваем задержку до 600мс и делаем двойную проверку
        setTimeout(() => {
            const gameArea = document.getElementById('gameArea');
            if (!gameArea) {
                console.error('❌ GameArea NOT FOUND!');
                return;
            }
            
            const rect = gameArea.getBoundingClientRect();
            this.gameWidth = rect.width || 375;
            this.gameHeight = rect.height || 600;
            
            // ПРИНУДИТЕЛЬНО ставим минимальную высоту 500px
            if (this.gameHeight < 500) {
                console.warn('⚠️ gameHeight too small:', this.gameHeight, '- forcing 500px');
                this.gameHeight = 500;
            }
            
            console.log('✅ Game area:', this.gameWidth, 'x', this.gameHeight);
            
            this.resetGame();
            this.isPlaying = true;
            this.isPaused = false;
            this.lastTime = performance.now();
            
            this.currentShipX = 50;
            this.targetShipX = 50;
            this.touchActive = false;
            
            this.gameLoop();
        }, 600);
    }
    
    showStartScreen() {
        this.clearRespawnTimer(); // Очищаем таймер
        this.showScreen('startScreen');
        this.stopGame();
    }


    
    updateShipAppearance() {
        const playerShip = document.getElementById('playerShip');
        if (!playerShip) return;
        
        const shipImages = {
            1: './images/ship-1.png',
            2: './images/ship-2.png',
            3: './images/ship-3.png'
        };
        
        playerShip.classList.remove('ship-1', 'ship-2', 'ship-3');
        playerShip.classList.add(`ship-${this.selectedShip}`);
        playerShip.style.backgroundImage = `url('${shipImages[this.selectedShip]}')`;
    }
    
    resetGame() {
        this.score = 0;
        this.distance = 0;
        this.gameSpeed = this.baseGameSpeed + (this.level * 0.5);
        this.obstacles = [];
        this.gameCoins = [];
        this.lastObstacleSpawn = Date.now();
        this.lastCoinSpawn = Date.now();
        
        const obstaclesContainer = document.getElementById('obstacles');
        const coinsContainer = document.getElementById('coins');
        
        if (obstaclesContainer) obstaclesContainer.innerHTML = '';
        if (coinsContainer) coinsContainer.innerHTML = '';
        
        const playerShip = document.getElementById('playerShip');
        if (playerShip) {
            playerShip.style.left = '50%';
            playerShip.classList.remove('ship-1', 'ship-2', 'ship-3');
            playerShip.classList.add(`ship-${this.selectedShip}`);
        }
        
        this.updateScore();
    }
    
    gameLoop(currentTime = 0) {
        if (!this.isPlaying) return;
        
        const deltaTime = Math.min(currentTime - this.lastTime, 32);
        this.lastTime = currentTime;
        
        if (!this.isPaused) {
            this.update();
            this.updateShipPosition();
        }
        
        this.animationId = requestAnimationFrame((time) => this.gameLoop(time));
    }
    
    update() {
        this.distance += this.gameSpeed * 0.1;
        this.score = Math.floor(this.distance);
        this.updateScore();
        
        // Плавное увеличение скорости
        this.gameSpeed = this.baseGameSpeed + (this.level * 0.5) + (this.distance * 0.002);
        
        const progress = (this.distance % 1000) / 1000 * 100;
        const progressFill = document.getElementById('progressFill');
        if (progressFill) {
            progressFill.style.width = progress + '%';
        }
        
        // ЖЕСТКИЙ СПАВН ЧЕРЕЗ DATE.NOW()
        const now = Date.now();
        
        // Препятствия каждые 1000мс (1 секунда)
        if (now - this.lastObstacleSpawn > 1000) {
            this.spawnObstacle();
            this.lastObstacleSpawn = now;
        }
        
        // Монеты каждые 700мс
        if (now - this.lastCoinSpawn > 700) {
            this.spawnCoin();
            this.lastCoinSpawn = now;
        }
        
        this.updateObstacles();
        this.updateCoins();
        
        if (this.distance > this.level * 1000) {
            this.levelComplete();
        }
    }
    
    spawnObstacle() {
        const obstacle = document.createElement('div');
        const asteroidType = Math.floor(Math.random() * 3) + 1;
        obstacle.className = `obstacle asteroid-${asteroidType}`;
        
        const leftPos = Math.random() * 80 + 10;
        obstacle.style.left = leftPos + '%';
        obstacle.style.top = '-70px';
        
        const obstaclesContainer = document.getElementById('obstacles');
        if (obstaclesContainer) {
            obstaclesContainer.appendChild(obstacle);
        }
        
        const sizes = { 1: 40, 2: 50, 3: 60 };
        
        this.obstacles.push({
            element: obstacle,
            x: leftPos,
            y: -70,
            width: sizes[asteroidType],
            height: sizes[asteroidType]
        });
    }
    
    spawnCoin() {
        const coin = document.createElement('div');
        coin.className = 'coin';
        
        const leftPos = Math.random() * 80 + 10;
        coin.style.left = leftPos + '%';
        coin.style.top = '-50px';
        
        const coinsContainer = document.getElementById('coins');
        if (coinsContainer) {
            coinsContainer.appendChild(coin);
        }
        
        this.gameCoins.push({
            element: coin,
            x: leftPos,
            y: -50,
            width: 34,
            height: 34,
            collected: false
        });
    }
    
    updateObstacles() {
        if (this.gameHeight < 200) return;
        
        const playerX = this.currentShipX;
        const playerY = 85;
        
        this.obstacles = this.obstacles.filter(obs => {
            obs.y += this.gameSpeed;
            obs.element.style.top = obs.y + 'px';
            
            const obsYPercent = (obs.y / this.gameHeight) * 100;
            
            if (
                Math.abs(playerX - obs.x) < 12 &&
                Math.abs(playerY - obsYPercent) < 8
            ) {
                this.gameOver();
                return false;
            }
            
            return obs.y < this.gameHeight + 100;
        });
    }
    
    updateCoins() {
        if (this.gameHeight < 200) return;
        
        const playerX = this.currentShipX;
        const playerY = 85;
        
        this.gameCoins = this.gameCoins.filter(coin => {
            if (coin.collected) return false;
            
            coin.y += this.gameSpeed;
            coin.element.style.top = coin.y + 'px';
            
            const coinYPercent = (coin.y / this.gameHeight) * 100;
            
            if (
                Math.abs(playerX - coin.x) < 12 &&
                Math.abs(playerY - coinYPercent) < 8
            ) {
                this.collectCoin(coin);
                return false;
            }
            
            return coin.y < this.gameHeight + 100;
        });
    }
    
    collectCoin(coin) {
        coin.collected = true;
        coin.element.classList.add('collected');
        
        this.coins++;
        this.score += 50;
        this.updateCoinDisplay();
        this.updateScore();
        
        setTimeout(() => {
            if (coin.element && coin.element.parentNode) {
                coin.element.parentNode.removeChild(coin.element);
            }
        }, 500);
    }

    clearRespawnTimer() {
        if (this.respawnTimerId) {
            clearInterval(this.respawnTimerId);
            this.respawnTimerId = null;
        }
    }
    
    gameOver() {
        this.isPlaying = false;
        
        const finalScore = document.getElementById('finalScore');
        const collectedCoins = document.getElementById('collectedCoins');
        
        if (finalScore) finalScore.textContent = this.score;
        if (collectedCoins) collectedCoins.textContent = Math.max(0, this.coins - 1500);
        
        this.showScreen('gameOver');
        
        let timeLeft = 5;
        const respawnTimer = document.getElementById('respawnTimer');
        
        // Сохраняем ID таймера в this.respawnTimerId
        this.respawnTimerId = setInterval(() => {
            timeLeft--;
            if (respawnTimer) {
                respawnTimer.textContent = timeLeft + 's';
            }
            
            if (timeLeft <= 0) {
                this.clearRespawnTimer(); // Очищаем таймер
                this.showStartScreen();
            }
        }, 1000);
        
        this.saveData();
    }
    
    levelComplete() {
        this.isPlaying = false;
        this.level++;
        
        this.coins += 300;
        this.updateCoinDisplay();
        
        this.showScreen('levelComplete');
        this.saveData();
    }
    
    nextLevel() {
        this.startGame();
    }
    
    togglePause() {
        if (!this.isPlaying) return; // Не паузим если игра не идет
        
        this.isPaused = !this.isPaused;
        
        if (this.isPaused) {
            this.showScreen('pauseScreen');
            
            // Вибрация при паузе (для телефона)
            if (this.tg && this.tg.HapticFeedback) {
                this.tg.HapticFeedback.impactOccurred('light');
            }
        }
    }
    
    resume() {
        this.isPaused = false;
        this.showScreen('gameScreen');
        this.lastTime = performance.now();
    }
    
    showSettings() {
        alert('Settings - TINELAB');
    }
    
    showShop() {
        this.clearRespawnTimer(); // Очищаем таймер
        this.showScreen('shipSelection');
        this.renderShips();
    }
    
    stopGame() {
        this.isPlaying = false;
        this.touchActive = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
    }
    
    updateScore() {
        const scoreElement = document.getElementById('score');
        if (scoreElement) {
            scoreElement.textContent = this.score;
        }
    }
    
    updateCoinDisplay() {
        const coinCount = document.getElementById('coinCount');
        const gameCoins = document.getElementById('gameCoins');
        
        if (coinCount) coinCount.textContent = this.coins;
        if (gameCoins) gameCoins.textContent = this.coins;
    }
    
    saveData() {
        const data = {
            coins: this.coins,
            selectedShip: this.selectedShip,
            level: this.level,
            highScore: this.score,
            ships: this.ships
        };
        localStorage.setItem('spaceRacingData', JSON.stringify(data));
    }
    
    loadData() {
        const data = localStorage.getItem('spaceRacingData');
        if (data) {
            try {
                const parsed = JSON.parse(data);
                this.coins = parsed.coins || 1500;
                this.selectedShip = parsed.selectedShip || 1;
                this.level = parsed.level || 1;
                
                if (parsed.ships) {
                    Object.keys(parsed.ships).forEach(id => {
                        if (this.ships[id]) {
                            this.ships[id].unlocked = parsed.ships[id].unlocked;
                        }
                    });
                }
                
                this.updateCoinDisplay();
                this.updateShipAppearance();
            } catch(e) {}
        }
    }
}

// Initialize game
let game;
document.addEventListener('DOMContentLoaded', () => {
    game = new SpaceRacing();
    console.log('✅ Game initialized');
});

// Prevent zoom on double tap
let lastTouchEnd = 0;
document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
        e.preventDefault();
    }
    lastTouchEnd = now;
}, false);