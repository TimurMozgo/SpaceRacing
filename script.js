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
        
        // Таймер респавна
        this.respawnTimerId = null;
        
        // Данные о кораблях
        this.ships = {
            1: { name: 'Sky Striker', price: 0, unlocked: true, stars: 2 },
            2: { name: 'Forest Wraith', price: 500, unlocked: false, stars: 3 },
            3: { name: 'Pink Lightning', price: 1000, unlocked: false, stars: 4 },
            4: { name: 'Midas Touch', price: 2000, unlocked: false, stars: 4 },
            5: { name: 'Dark Matter', price: 3500, unlocked: false, stars: 5 },
            6: { name: 'Blood Moon', price: 5000, unlocked: false, stars: 5 }
        };

        // Язык и переводы (НОВОЕ)
        this.currentLanguage = null;
        this.translations = {
            en: {
                start: 'START',
                selectShip: 'Select Spaceship',
                score: 'SCORE',
                gameOver: 'GAME OVER',
                pause: 'PAUSE',
                resume: 'RESUME',
                home: 'HOME',
                store: 'STORE',
                next: 'NEXT',
                settings: 'SETTINGS',
                levelComplete: 'LEVEL COMPLETE!',
                youGotReward: 'YOU GOT A REWARD',
                nextLife: 'Next Life in'
            },
            ru: {
                start: 'СТАРТ',
                selectShip: 'Выбери корабль',
                score: 'СЧЁТ',
                gameOver: 'ИГРА ОКОНЧЕНА',
                pause: 'ПАУЗА',
                resume: 'ПРОДОЛЖИТЬ',
                home: 'ГЛАВНАЯ',
                store: 'МАГАЗИН',
                next: 'ДАЛЕЕ',
                settings: 'НАСТРОЙКИ',
                levelComplete: 'УРОВЕНЬ ПРОЙДЕН!',
                youGotReward: 'ТЫ ПОЛУЧИЛ НАГРАДУ',
                nextLife: 'Следующая жизнь через'
            }
        };

        // Аудио система
        this.audioContext = null;
        this.audioEnabled = true;
        
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

        this.initAudio();
        this.setupGlobalClickSound();
        
        console.log('🚀 SpaceRacing by TINELAB initialized');
    }

    // Выбор языка
    selectLanguage(lang) {
        this.currentLanguage = lang;
        this.saveData();
        this.applyTranslations();
        this.showScreen('startScreen');
        
        if (this.tg && this.tg.HapticFeedback) {
            this.tg.HapticFeedback.selectionChanged();
        }
        
        console.log('🌐 Language selected:', lang);
    }

    // Применение переводов
    applyTranslations() {
        if (!this.currentLanguage) return;
        
        const t = this.translations[this.currentLanguage];
        
        // Обновляем тексты на страницах
        const startBtn = document.querySelector('.btn-start span');
        if (startBtn) startBtn.textContent = t.start;
        
        const selectShipTitle = document.querySelector('.ship-selection h2');
        if (selectShipTitle) selectShipTitle.textContent = t.selectShip;
        
        const scoreLabel = document.querySelector('.score-label');
        if (scoreLabel) scoreLabel.textContent = t.score;
        
        const gameOverTitle = document.querySelector('.game-over h2');
        if (gameOverTitle) gameOverTitle.textContent = t.gameOver;
        
        const pauseTitle = document.querySelector('.pause-content h2');
        if (pauseTitle) pauseTitle.textContent = t.pause;
        
        const resumeBtn = document.querySelector('.btn-resume');
        if (resumeBtn) resumeBtn.textContent = t.resume;
        
        const homeBtns = document.querySelectorAll('.btn-home, .btn-home-pause');
        homeBtns.forEach(btn => { if (btn) btn.textContent = t.home; });
        
        const storeBtn = document.querySelector('.btn-store');
        if (storeBtn) storeBtn.textContent = t.store;
        
        const nextBtn = document.querySelector('.btn-next');
        if (nextBtn) nextBtn.textContent = t.next;
        
        const settingsBtn = document.querySelector('.btn-settings');
        if (settingsBtn) settingsBtn.textContent = t.settings;
        
        const levelCompleteTitle = document.querySelector('.level-complete h2');
        if (levelCompleteTitle) levelCompleteTitle.textContent = t.levelComplete;
        
        const rewardText = document.querySelector('.reward-box span');
        if (rewardText) rewardText.textContent = t.youGotReward;
        
        const nextLifeText = document.querySelector('.next-life span:first-child');
        if (nextLifeText) nextLifeText.textContent = t.nextLife + ' ';
        
        console.log('✅ Translations applied:', this.currentLanguage);
    }

    // Проверка языка при загрузке
    checkLanguage() {
        if (!this.currentLanguage) {
            this.showScreen('languageScreen');
        } else {
            this.applyTranslations();
            this.showScreen('startScreen');
        }
    }

    // Инициализация аудио контекста
    initAudio() {
        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) {
                this.audioContext = new AudioContextClass();
                console.log('🔊 Audio system initialized');
            }
        } catch(e) {
            console.log('Audio not supported');
            this.audioEnabled = false;
        }
    }

    // Разблокировка аудио (браузеры требуют первого клика)
    unlockAudio() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    // Звук клика — короткий щелчок
    playClickSound() {
        if (!this.audioEnabled || !this.audioContext) return;
        this.unlockAudio();
        
        const ctx = this.audioContext;
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        // Настройки звука клика
        oscillator.frequency.value = 600;
        oscillator.type = 'sine';
        
        // Очень короткий звук (0.08 сек)
        gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.08);
    }

    // Звук монеты — приятный "дзынь" (на будущее)
    playCoinSound() {
        if (!this.audioEnabled || !this.audioContext) return;
        this.unlockAudio();
        
        const ctx = this.audioContext;
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.frequency.setValueAtTime(880, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1);
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.3);
    }

    // Звук столкновения — низкий "бум" (на будущее)
    playCrashSound() {
        if (!this.audioEnabled || !this.audioContext) return;
        this.unlockAudio();
        
        const ctx = this.audioContext;
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.frequency.setValueAtTime(200, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.3);
        oscillator.type = 'sawtooth';
        
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.3);
    }

    // Переключение звука
    toggleSound() {
        this.audioEnabled = !this.audioEnabled;
        this.updateSoundButton();
        this.saveData();
        
        if (this.tg && this.tg.HapticFeedback) {
            this.tg.HapticFeedback.selectionChanged();
        }
        
        if (this.audioEnabled) {
            this.unlockAudio();
            this.playClickSound();
        }
    }

    // Обновление иконки кнопки звука
    updateSoundButton() {
        const btn = document.getElementById('btnSound');
        if (!btn) return;
        
        if (this.audioEnabled) {
            btn.classList.remove('muted');
            btn.innerHTML = `
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M11 5L6 9H2V15H6L11 19V5Z" fill="currentColor"/>
                    <path d="M15.54 8.46C16.4774 9.39764 17.004 10.6692 17.004 11.995C17.004 13.3208 16.4774 14.5924 15.54 15.53" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M19.07 4.93C20.9447 6.80527 21.9979 9.34836 21.9979 12C21.9979 14.6516 20.9447 17.1947 19.07 19.07" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            `;
        } else {
            btn.classList.add('muted');
            btn.innerHTML = `
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M11 5L6 9H2V15H6L11 19V5Z" fill="currentColor"/>
                    <line x1="23" y1="9" x2="17" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <line x1="17" y1="9" x2="23" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            `;
        }
    }

    // Глобальный обработчик кликов на все кнопки
    setupGlobalClickSound() {
        // Ждем загрузки DOM
        setTimeout(() => {
            // Все кнопки в игре
            const clickables = document.querySelectorAll('button, .ship-card, .btn-start');
            
            clickables.forEach(el => {
                el.addEventListener('click', () => {
                    this.playClickSound();
                });
                
                // Для тач-устройств
                el.addEventListener('touchstart', () => {
                    this.playClickSound();
                }, { passive: true });
            });
            
            console.log('👆 Click sounds attached to', clickables.length, 'elements');
        }, 500);
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
        startBtn.textContent = 'START RACE';
        startBtn.onclick = () => this.startGame();
        container.appendChild(startBtn);
    }
    
    handleShipClick(shipId) {
        this.playClickSound(); // ← ДОБАВИТЬ

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
            3: './images/ship-3.png',
            4: './images/ship-4.png',  // Зелёный
            5: './images/ship-5.png',  // Фиолетовый
            6: './images/ship-6.png'   // Красный
        };
        
        playerShip.classList.remove('ship-1', 'ship-2', 'ship-3', 'ship-4', 'ship-5', 'ship-6');
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

        this.playCoinSound(); // ← ЗВУК МОНЕТЫ
        
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

        this.playCrashSound(); // ← ЗВУК СТОЛКНОВЕНИЯ
        
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
            ships: this.ships,
            audioEnabled: this.audioEnabled,
            currentLanguage: this.currentLanguage  // ← ДОБАВИТЬ
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
                this.audioEnabled = parsed.audioEnabled !== undefined ? parsed.audioEnabled : true;
                
                // Загружаем язык
                this.currentLanguage = parsed.currentLanguage || null;
                
                if (parsed.ships) {
                    Object.keys(parsed.ships).forEach(id => {
                        if (this.ships[id]) {
                            this.ships[id].unlocked = parsed.ships[id].unlocked;
                        }
                    });
                }
                
                this.updateCoinDisplay();
                this.updateShipAppearance();
                this.updateSoundButton();
                
                // Проверяем язык после загрузки
                this.checkLanguage();
            } catch(e) {
                console.log('Error loading data');
            }
        } else {
            this.updateSoundButton();
            this.checkLanguage();
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