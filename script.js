// ===== N8N CONFIGURATION =====
const N8N_URL = 'https://tiktiok.xyz/webhook/get-leaderboard';

// ===== НАСТРОЙКИ КОНКУРСА =====
const ADMIN_USER_ID = 6088315974; // Твой Telegram ID
const CONTEST_DURATION_DAYS = 7;

let contestEndDate = localStorage.getItem('contestEndDate');
if (!contestEndDate) {
    const now = new Date();
    now.setDate(now.getDate() + CONTEST_DURATION_DAYS);
    contestEndDate = now.toISOString();
    localStorage.setItem('contestEndDate', contestEndDate);
}
let contestEndTime = new Date(contestEndDate).getTime(); // <-- ЗАМЕНИ const НА let

// SpaceRacing Game - Created by TINELAB
class SpaceRacing {
    constructor() {
        this.tg = window.Telegram.WebApp;
        this.currentScreen = 'start';
        this.score = 0;
        this.coins = 0;
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
        
        this.levelCoins = 0;
        this.activePowerUps = { shield: false, magnet: false, doubleCoins: false };
        this.powerUpTimers = { shield: 0, magnet: 0, doubleCoins: 0 };
        this.powerUps = []; 
        this.lastPowerUpSpawn = 0;
        
        this.touchActive = false;
        this.touchX = 0;
        this.targetShipX = 50;
        this.currentShipX = 50;
        this.gameWidth = 0;
        this.gameHeight = 0;
        this.respawnTimerId = null;
        
        this.ships = {
            1: { name: 'Sky Striker', price: 0, unlocked: true, stars: 2 },
            2: { name: 'Forest Wraith', price: 500, unlocked: false, stars: 3 },
            3: { name: 'Pink Lightning', price: 1000, unlocked: false, stars: 4 },
            4: { name: 'Midas Touch', price: 2000, unlocked: false, stars: 4 },
            5: { name: 'Dark Matter', price: 3500, unlocked: false, stars: 5 }
        };

        this.currentLanguage = null;
        this.translations = {
            en: { start: 'START', selectShip: 'Select Spaceship', score: 'SCORE', gameOver: 'GAME OVER', pause: 'PAUSE', resume: 'RESUME', home: 'HOME', store: 'STORE', next: 'NEXT', settings: 'SETTINGS', levelComplete: 'LEVEL COMPLETE!', youGotReward: 'YOU GOT A REWARD', nextLife: 'Next Life in' },
            ru: { start: 'СТАРТ', selectShip: 'Выбери корабль', score: 'СЧЁТ', gameOver: 'ИГРА ОКОНЧЕНА', pause: 'ПАУЗА', resume: 'ПРОДОЛЖИТЬ', home: 'ГЛАВНАЯ', store: 'МАГАЗИН', next: 'ДАЛЕЕ', settings: 'НАСТРОЙКИ', levelComplete: 'УРОВЕНЬ ПРОЙДЕН!', youGotReward: 'ТЫ ПОЛУЧИЛ НАГРАДУ', nextLife: 'Следующая жизнь через' }
        };

        this.audioContext = null;
        this.audioEnabled = true;
        this.init();
    }

        // Обновляем время окончания конкурса
    updateContestEndTime() {
        contestEndTime = new Date(contestEndDate).getTime();
    }
    
    init() {
        if (this.tg) {
            try {
                this.tg.expand();
                this.tg.ready();
                this.tg.setHeaderColor('#000000');
                this.tg.setBackgroundColor('#000000');
            } catch(e) { console.log('TG not available'); }
        }
        this.setupTouchControls();
        this.setupKeyboard();
        this.loadData();
        this.renderShips();
        this.initAudio();
        this.setupGlobalClickSound();
        this.showAdminPanelButton(); // Показываем кнопку админа
        this.updateContestEndTime();
        console.log('🚀 SpaceRacing by TINELAB initialized');
    }

    selectLanguage(lang) {
        this.currentLanguage = lang;
        this.saveData();
        this.applyTranslations();
        this.showScreen('startScreen');
        if (this.tg && this.tg.HapticFeedback) this.tg.HapticFeedback.selectionChanged();
    }

    applyTranslations() {
        if (!this.currentLanguage) return;
        const t = this.translations[this.currentLanguage];
        const startBtn = document.querySelector('.btn-start span'); if (startBtn) startBtn.textContent = t.start;
        const selectShipTitle = document.querySelector('.ship-selection h2'); if (selectShipTitle) selectShipTitle.textContent = t.selectShip;
        const scoreLabel = document.querySelector('.score-label'); if (scoreLabel) scoreLabel.textContent = t.score;
        const gameOverTitle = document.querySelector('.game-over h2'); if (gameOverTitle) gameOverTitle.textContent = t.gameOver;
        const pauseTitle = document.querySelector('.pause-content h2'); if (pauseTitle) pauseTitle.textContent = t.pause;
        const resumeBtn = document.querySelector('.btn-resume'); if (resumeBtn) resumeBtn.textContent = t.resume;
        document.querySelectorAll('.btn-home, .btn-home-pause').forEach(btn => { if (btn) btn.textContent = t.home; });
        const storeBtn = document.querySelector('.btn-store'); if (storeBtn) storeBtn.textContent = t.store;
        const settingsBtn = document.querySelector('.btn-settings'); if (settingsBtn) settingsBtn.textContent = t.settings;
    }

    checkLanguage() {
        if (!this.currentLanguage) this.showScreen('languageScreen');
        else { this.applyTranslations(); this.showScreen('startScreen'); }
    }

    initAudio() {
        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) { this.audioContext = new AudioContextClass(); }
        } catch(e) { this.audioEnabled = false; }
    }

    unlockAudio() { if (this.audioContext && this.audioContext.state === 'suspended') this.audioContext.resume(); }

    playClickSound() {
        if (!this.audioEnabled || !this.audioContext) return;
        this.unlockAudio();
        const ctx = this.audioContext, osc = ctx.createOscillator(), gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = 600; osc.type = 'sine';
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.08);
    }

    playCoinSound() {
        if (!this.audioEnabled || !this.audioContext) return;
        this.unlockAudio();
        const ctx = this.audioContext, osc = ctx.createOscillator(), gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1);
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.3);
    }

    playCrashSound() {
        if (!this.audioEnabled || !this.audioContext) return;
        this.unlockAudio();
        const ctx = this.audioContext, osc = ctx.createOscillator(), gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(200, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.3);
        osc.type = 'sawtooth';
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.3);
    }

    toggleSound() {
        this.audioEnabled = !this.audioEnabled;
        this.updateSoundButton();
        this.saveData();
        if (this.tg && this.tg.HapticFeedback) this.tg.HapticFeedback.selectionChanged();
        if (this.audioEnabled) { this.unlockAudio(); this.playClickSound(); }
    }

    updateSoundButton() {
        const btn = document.getElementById('btnSound');
        if (!btn) return;
        if (this.audioEnabled) {
            btn.classList.remove('muted');
            btn.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11 5L6 9H2V15H6L11 19V5Z" fill="currentColor"/><path d="M15.54 8.46C16.4774 9.39764 17.004 10.6692 17.004 11.995C17.004 13.3208 16.4774 14.5924 15.54 15.53" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M19.07 4.93C20.9447 6.80527 21.9979 9.34836 21.9979 12C21.9979 14.6516 20.9447 17.1947 19.07 19.07" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
        } else {
            btn.classList.add('muted');
            btn.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11 5L6 9H2V15H6L11 19V5Z" fill="currentColor"/><line x1="23" y1="9" x2="17" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="17" y1="9" x2="23" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
        }
    }

    setupGlobalClickSound() {
        setTimeout(() => {
            const clickables = document.querySelectorAll('button, .ship-card, .btn-start');
            clickables.forEach(el => {
                el.addEventListener('click', () => this.playClickSound());
                el.addEventListener('touchstart', () => this.playClickSound(), { passive: true });
            });
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
            this.targetShipX = Math.max(10, Math.min(90, ((e.touches[0].clientX - gameArea.getBoundingClientRect().left) / this.gameWidth) * 100));
            this.touchActive = true;
        }, {passive: true});
        gameArea.addEventListener('touchmove', (e) => {
            if (!this.isPlaying || this.isPaused) return;
            this.targetShipX = Math.max(10, Math.min(90, ((e.touches[0].clientX - gameArea.getBoundingClientRect().left) / this.gameWidth) * 100));
        }, {passive: true});
        gameArea.addEventListener('touchend', () => { this.touchActive = false; }, {passive: true});
        gameArea.addEventListener('mousedown', (e) => {
            if (!this.isPlaying || this.isPaused) return;
            updateSize();
            this.targetShipX = Math.max(10, Math.min(90, ((e.clientX - gameArea.getBoundingClientRect().left) / this.gameWidth) * 100));
            this.touchActive = true;
        });
        gameArea.addEventListener('mousemove', (e) => {
            if (!this.isPlaying || this.isPaused || !this.touchActive) return;
            this.targetShipX = Math.max(10, Math.min(90, ((e.clientX - gameArea.getBoundingClientRect().left) / this.gameWidth) * 100));
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
            if (e.key === 'ArrowLeft' || e.key === 'a') { this.targetShipX = Math.max(10, this.targetShipX - 10); this.touchActive = true; } 
            else if (e.key === 'ArrowRight' || e.key === 'd') { this.targetShipX = Math.min(90, this.targetShipX + 10); this.touchActive = true; }
        });
        document.addEventListener('keyup', (e) => {
            if (['ArrowLeft', 'a', 'ArrowRight', 'd'].includes(e.key)) this.touchActive = false;
        });
    }
    
    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            setTimeout(() => targetScreen.classList.add('active'), 50);
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
            if (ship.unlocked && shipId == this.selectedShip) card.classList.add('active', 'selected');
            if (!ship.unlocked) card.classList.add('locked');
            card.innerHTML = `<div class="ship-preview ship-${shipId}"></div><h3>${ship.name}</h3>${!ship.unlocked ? `<div class="lock-overlay"><span class="lock-icon">🔒</span><span class="price">${ship.price} 🪙</span></div>` : ''}`;
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
        this.playClickSound();
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
        setTimeout(() => { notif.classList.remove('show'); setTimeout(() => notif.remove(), 400); }, 2000);
    }
    
    startGame() {
        this.showScreen('gameScreen');
        setTimeout(() => {
            const gameArea = document.getElementById('gameArea');
            if (!gameArea) return;
            const rect = gameArea.getBoundingClientRect();
            this.gameWidth = rect.width || 375;
            this.gameHeight = Math.max(500, rect.height || 600);
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
        this.clearRespawnTimer();
        this.showScreen('startScreen');
        this.stopGame();
    }

    goToMainMenu() {
        this.playClickSound();
        this.showScreen('mainMenu');
        this.switchTab('shop');
    }
    
    updateShipAppearance() {
        const playerShip = document.getElementById('playerShip');
        if (!playerShip) return;
        const shipImages = { 1: './images/ship-1.png', 2: './images/ship-2.png', 3: './images/ship-3.png', 4: './images/ship-4.png', 5: './images/ship-5.png' };
        playerShip.classList.remove('ship-1', 'ship-2', 'ship-3', 'ship-4', 'ship-5', 'ship-6');
        playerShip.classList.add(`ship-${this.selectedShip}`);
        playerShip.style.backgroundImage = `url('${shipImages[this.selectedShip]}')`;
    }
    
    resetGame() {
        this.score = 0;
        this.distance = 0;
        this.level = 1;
        this.levelCoins = 0;
        this.activePowerUps = { shield: false, magnet: false, doubleCoins: false };
        this.powerUpTimers = { shield: 0, magnet: 0, doubleCoins: 0 };
        this.gameSpeed = this.baseGameSpeed + (this.level * 0.5);
        this.obstacles = [];
        this.gameCoins = [];
        this.powerUps = [];
        this.lastObstacleSpawn = Date.now();
        this.lastCoinSpawn = Date.now();
        this.lastPowerUpSpawn = Date.now();
        
        const obs = document.getElementById('obstacles'); if (obs) obs.innerHTML = '';
        const coins = document.getElementById('coins'); if (coins) coins.innerHTML = '';
        const pups = document.getElementById('powerUpsContainer'); if (pups) pups.innerHTML = '';
        
        this.updateShipAppearance();
        this.updateScore();
        this.updatePowerUpUI();
    }
    
    gameLoop(currentTime = 0) {
        if (!this.isPlaying) return;
        const deltaTime = Math.min(currentTime - this.lastTime, 32);
        this.lastTime = currentTime;
        if (!this.isPaused) { this.update(); this.updateShipPosition(); }
        this.animationId = requestAnimationFrame((time) => this.gameLoop(time));
    }
    
    // === БЕСКОНЕЧНЫЙ РЕЖИМ (без уровней) ===
    update() {
        if (!this.isPlaying || this.isPaused) return;
        this.distance += this.gameSpeed * 0.1;
        this.score = Math.floor(this.distance);
        this.updateScore();
        this.gameSpeed = this.baseGameSpeed + (this.level * 0.5) + (this.distance * 0.002);
        this.updatePowerUpTimers();
        
        const now = Date.now();
        if (now - this.lastObstacleSpawn > 1000) { this.spawnObstacle(); this.lastObstacleSpawn = now; }
        if (now - this.lastCoinSpawn > 700) { this.spawnCoin(); this.lastCoinSpawn = now; }
        if (now - this.lastPowerUpSpawn > 8000 + Math.random() * 4000) { this.spawnPowerUp(); this.lastPowerUpSpawn = now; }
        
        this.updateObstacles();
        this.updateCoins();
        this.updatePowerUps();
    }

    spawnObstacle() {
        const obstacle = document.createElement('div');
        const type = Math.floor(Math.random() * 3) + 1;
        obstacle.className = `obstacle asteroid-${type}`;
        const leftPos = Math.random() * 80 + 10;
        obstacle.style.left = leftPos + '%';
        obstacle.style.top = '-70px';
        const container = document.getElementById('obstacles');
        if (container) container.appendChild(obstacle);
        const sizes = { 1: 40, 2: 50, 3: 60 };
        this.obstacles.push({ element: obstacle, x: leftPos, y: -70, width: sizes[type], height: sizes[type] });
    }
    
    spawnCoin() {
        const coin = document.createElement('div');
        coin.className = 'coin';
        const leftPos = Math.random() * 80 + 10;
        coin.style.left = leftPos + '%';
        coin.style.top = '-50px';
        const container = document.getElementById('coins');
        if (container) container.appendChild(coin);
        this.gameCoins.push({ element: coin, x: leftPos, y: -50, width: 34, height: 34, collected: false });
    }
    
    updateObstacles() {
        if (this.gameHeight < 200) return;
        const playerX = this.currentShipX;
        const playerY = 85;
        this.obstacles = this.obstacles.filter(obs => {
            obs.y += this.gameSpeed;
            obs.element.style.top = obs.y + 'px';
            const obsYPercent = (obs.y / this.gameHeight) * 100;
            if (Math.abs(playerX - obs.x) < 8 && Math.abs(playerY - obsYPercent) < 6) {
                if (this.activePowerUps.shield) {
                    this.activePowerUps.shield = false;
                    this.updatePowerUpUI();
                    if (this.tg && this.tg.HapticFeedback) this.tg.HapticFeedback.impactOccurred('medium');
                    if (obs.element && obs.element.parentNode) obs.element.parentNode.removeChild(obs.element);
                    return false;
                } else {
                    this.gameOver();
                    return false;
                }
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
            if (this.activePowerUps.magnet) {
                const dx = playerX - coin.x;
                const dy = playerY - (coin.y / this.gameHeight * 100);
                if (Math.sqrt(dx * dx + dy * dy) < 30) {
                    coin.x += dx * 0.15;
                    coin.y += dy * 0.15 * (this.gameHeight / 100);
                    coin.element.style.left = coin.x + '%';
                }
            }
            coin.y += this.gameSpeed;
            coin.element.style.top = coin.y + 'px';
            const coinYPercent = (coin.y / this.gameHeight) * 100;
            if (Math.abs(playerX - coin.x) < 12 && Math.abs(playerY - coinYPercent) < 8) {
                this.collectCoin(coin);
                return false;
            }
            return coin.y < this.gameHeight + 100;
        });
    }

    collectCoin(coin) {
        coin.collected = true;
        coin.element.classList.add('collected');
        this.playCoinSound();
        const coinValue = this.activePowerUps.doubleCoins ? 2 : 1;
        this.coins += coinValue;
        this.levelCoins += coinValue;
        this.updateCoinDisplay();
        this.updateScore();
        setTimeout(() => { if (coin.element && coin.element.parentNode) coin.element.parentNode.removeChild(coin.element); }, 500);
    }

    spawnPowerUp() {
        const types = ['shield', 'magnet', 'doubleCoins'];
        const type = types[Math.floor(Math.random() * types.length)];
        const el = document.createElement('div');
        el.className = `game-powerup ${type}`;
        el.textContent = { shield: '🛡️', magnet: '🧲', doubleCoins: 'x2' }[type];
        const leftPos = Math.random() * 80 + 10;
        el.style.left = leftPos + '%';
        el.style.top = '-50px';
        const container = document.getElementById('powerUpsContainer');
        if (container) container.appendChild(el);
        this.powerUps.push({ element: el, type: type, x: leftPos, y: -50, width: 40, height: 40, collected: false });
    }

    updatePowerUps() {
        if (this.gameHeight < 200) return;
        const playerX = this.currentShipX;
        const playerY = 85;
        this.powerUps = this.powerUps.filter(p => {
            if (p.collected) return false;
            p.y += this.gameSpeed;
            p.element.style.top = p.y + 'px';
            const pYPercent = (p.y / this.gameHeight) * 100;
            if (Math.abs(playerX - p.x) < 15 && Math.abs(playerY - pYPercent) < 10) {
                this.activatePowerUp(p.type);
                if (p.element.parentNode) p.element.parentNode.removeChild(p.element);
                return false;
            }
            return p.y < this.gameHeight + 100;
        });
    }

    activatePowerUp(type) {
        this.activePowerUps[type] = true;
        if (type === 'magnet') { this.powerUpTimers.magnet = 15; this.showFloatingText('MAGNET!', '#FF00FF'); }
        if (type === 'doubleCoins') { this.powerUpTimers.doubleCoins = 15; this.showFloatingText('x2 COINS!', '#FFD700'); }
        if (type === 'shield') { this.showFloatingText('SHIELD!', '#00BFFF'); }
        this.updatePowerUpUI();
        this.playCoinSound();
    }

    updatePowerUpTimers() {
        const delta = 0.016;
        if (this.activePowerUps.magnet) { this.powerUpTimers.magnet -= delta; if (this.powerUpTimers.magnet <= 0) this.activePowerUps.magnet = false; }
        if (this.activePowerUps.doubleCoins) { this.powerUpTimers.doubleCoins -= delta; if (this.powerUpTimers.doubleCoins <= 0) this.activePowerUps.doubleCoins = false; }
        this.updatePowerUpUI();
    }

    updatePowerUpUI() {
        const container = document.getElementById('powerupIndicators');
        if (!container) return;
        container.innerHTML = '';
        const powerUps = [
            { type: 'shield', icon: '🛡️', active: this.activePowerUps.shield, time: 1, maxTime: 1 },
            { type: 'magnet', icon: '🧲', active: this.activePowerUps.magnet, time: this.powerUpTimers.magnet, maxTime: 15 },
            { type: 'double', icon: 'x2', active: this.activePowerUps.doubleCoins, time: this.powerUpTimers.doubleCoins, maxTime: 15 }
        ];
        powerUps.forEach(p => {
            if (!p.active) return; 
            const indicator = document.createElement('div');
            indicator.className = `p-indicator ${p.type} active`;
            const circumference = 163;
            const offset = circumference - ((p.time / p.maxTime) * circumference);
            indicator.innerHTML = `<svg viewBox="0 0 60 60"><circle class="circle-bg" cx="30" cy="30" r="26"></circle><circle class="circle-progress" cx="30" cy="30" r="26" style="stroke-dashoffset: ${offset}"></circle></svg><span class="p-icon">${p.icon}</span>`;
            container.appendChild(indicator);
        });
    }

    showFloatingText(text, color) {
        const el = document.createElement('div');
        el.textContent = text;
        el.style.cssText = `position: absolute; top: 40%; left: 50%; transform: translate(-50%, -50%); font-family: 'Orbitron', sans-serif; font-size: 2em; font-weight: 900; color: ${color}; text-shadow: 0 0 20px ${color}; pointer-events: none; z-index: 100; animation: floatUp 1.5s ease-out forwards;`;
        if (!document.querySelector('#floatAnim')) {
            const style = document.createElement('style');
            style.id = 'floatAnim';
            style.textContent = `@keyframes floatUp { 0% { opacity: 1; transform: translate(-50%, -50%) scale(0.5); } 50% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); } 100% { opacity: 0; transform: translate(-50%, -80%) scale(1); } }`;
            document.head.appendChild(style);
        }
        const gameArea = document.getElementById('gameArea');
        if (gameArea) gameArea.appendChild(el);
        setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 1500);
    }

    clearRespawnTimer() {
        if (this.respawnTimerId) { clearInterval(this.respawnTimerId); this.respawnTimerId = null; }
    }
    
    // === GAME OVER С ПРОВЕРКОЙ КОНКУРСА ===
    gameOver() {
        this.isPlaying = false;
        this.playCrashSound();
        
        if (this.isContestActive()) {
            this.submitScoreToLeaderboard(this.score);
        } else {
            this.showNotification('🏁 CONTEST ENDED', 'error');
        }
        
        const finalScore = document.getElementById('finalScore');
        const collectedCoins = document.getElementById('collectedCoins');
        if (finalScore) finalScore.textContent = this.score;
        if (collectedCoins) collectedCoins.textContent = Math.max(0, this.coins - 1500);
        
        this.showScreen('gameOver');
        let timeLeft = 5;
        const respawnTimer = document.getElementById('respawnTimer');
        this.respawnTimerId = setInterval(() => {
            timeLeft--;
            if (respawnTimer) respawnTimer.textContent = timeLeft + 's';
            if (timeLeft <= 0) { this.clearRespawnTimer(); this.showStartScreen(); }
        }, 1000);
        this.saveData();
    }
    
    togglePause() {
        if (!this.isPlaying) return;
        this.isPaused = !this.isPaused;
        if (this.isPaused) {
            this.showScreen('pauseScreen');
            if (this.tg && this.tg.HapticFeedback) this.tg.HapticFeedback.impactOccurred('light');
        }
    }
    
    resume() {
        this.isPaused = false;
        this.showScreen('gameScreen');
        this.lastTime = performance.now();
    }
    
    showSettings() { alert('Settings - TINELAB'); }
    
    showShop() {
        this.clearRespawnTimer();
        this.stopGame();
        this.showScreen('mainMenu');
        this.switchTab('shop');
    }
    
    stopGame() {
        this.isPlaying = false;
        this.touchActive = false;
        if (this.animationId) cancelAnimationFrame(this.animationId);
    }
    
    updateScore() {
        const scoreElement = document.getElementById('score');
        if (scoreElement) scoreElement.textContent = this.score;
    }
    
    updateCoinDisplay() {
        const coinCount = document.getElementById('coinCount');
        const gameCoins = document.getElementById('gameCoins');
        if (coinCount) coinCount.textContent = this.coins;
        if (gameCoins) gameCoins.textContent = this.coins;
    }
    
    saveData() {
        const data = { coins: this.coins, selectedShip: this.selectedShip, level: this.level, highScore: this.score, ships: this.ships, audioEnabled: this.audioEnabled, currentLanguage: this.currentLanguage };
        localStorage.setItem('spaceRacingData', JSON.stringify(data));
    }
    
    // === ИСПРАВЛЕННЫЙ LOAD DATA (БАЛАНС НЕ СБРАСЫВАЕТСЯ) ===
    loadData() {
        const data = localStorage.getItem('spaceRacingData');
        if (data) {
            try {
                const parsed = JSON.parse(data);
                this.coins = (parsed.coins !== undefined && parsed.coins !== null) ? parsed.coins : 0; 
                this.selectedShip = parsed.selectedShip || 1;
                this.level = parsed.level || 1;
                this.audioEnabled = parsed.audioEnabled !== undefined ? parsed.audioEnabled : true;
                this.currentLanguage = parsed.currentLanguage || null;
                
                if (parsed.ships) {
                    Object.keys(parsed.ships).forEach(id => {
                        if (this.ships[id]) this.ships[id].unlocked = parsed.ships[id].unlocked;
                    });
                }
                this.updateCoinDisplay();
                this.updateShipAppearance();
                this.updateSoundButton();
                this.checkLanguage();
            } catch(e) { console.error('Error loading data', e); }
        } else {
            this.updateSoundButton();
            this.checkLanguage();
        }
    }

    switchTab(tabName) {
        document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
        const targetTab = document.getElementById(`tab-${tabName}`);
        if (targetTab) targetTab.classList.add('active');
        const targetBtn = document.querySelector(`.nav-btn[data-tab="${tabName}"]`);
        if (targetBtn) targetBtn.classList.add('active');
        
        if (tabName === 'top') this.fetchLeaderboard();
        else if (tabName === 'shop') { this.renderShips(); this.updateCoinDisplay(); }
        else if (tabName === 'profile') this.updateProfileStats();
        
        if (this.tg && this.tg.HapticFeedback) this.tg.HapticFeedback.selectionChanged();
    }

    updateProfileStats() {
        const playerName = this.tg?.initDataUnsafe?.user?.first_name || 'PILOT';
        document.getElementById('profileName').textContent = playerName.toUpperCase();
        document.getElementById('statHighScore').textContent = this.score.toLocaleString();
        document.getElementById('statLevel').textContent = this.level;
        const ownedShips = Object.values(this.ships).filter(s => s.unlocked).length;
        document.getElementById('statShips').textContent = `${ownedShips}/${Object.keys(this.ships).length}`;
        document.getElementById('statCoins').textContent = this.coins.toLocaleString();
    }

    resetProgress() {
        if (confirm('Are you sure you want to reset all progress? This cannot be undone!')) {
            localStorage.removeItem('spaceRacingData');
            location.reload();
        }
    }

    // ===== N8N & LEADERBOARD METHODS =====
    getPayload(finalScore = 0) {
        const user = this.tg?.initDataUnsafe?.user;
        return {
            userId: user?.id || 999999,
            name: user?.first_name || user?.username || 'TestPlayer',
            score: finalScore || this.score || 0,
            shipId: this.selectedShip || 1
        };
    }

    async submitScoreToLeaderboard(finalScore) {
        const payload = this.getPayload(finalScore);
        try {
            const response = await fetch(N8N_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            const text = await response.text();
            if (!text) return;
            const data = JSON.parse(text);
            if (data.success && data.leaderboard) this.renderLeaderboard(data.leaderboard);
        } catch (error) { console.error('❌ Ошибка отправки счета:', error); }
    }

    // === ВОТ ЗДЕСЬ БЫЛА ОШИБКА РАНЬШЕ. ТЕПЕРЬ ОТПРАВЛЯЕМ PAYLOAD, КАК В ТВОЁМ РАБОЧЕМ КОДЕ ===
    async fetchLeaderboard() {
        const listContainer = document.getElementById('leaderboardList');
        listContainer.innerHTML = '<div class="loading-spinner">LOADING...</div>';
        const payload = this.getPayload(); // <-- ОТПРАВЛЯЕМ PAYLOAD С userId!

        try {
            const response = await fetch(N8N_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload) // <-- ИСПОЛЬЗУЕМ payload, а не {}
            });

            const text = await response.text();
            if (!text) { listContainer.innerHTML = '<div class="loading-spinner">NO DATA</div>'; return; }

            let data = JSON.parse(text);
            // На случай, если n8n вернул массив
            if (Array.isArray(data) && data.length > 0) data = data[0];

            if (data && data.success && data.leaderboard && data.leaderboard.length > 0) {
                this.renderLeaderboard(data.leaderboard);
            } else {
                listContainer.innerHTML = '<div class="loading-spinner">NO DATA YET</div>';
            }
        } catch (e) {
            console.error('❌ Ошибка загрузки:', e);
            listContainer.innerHTML = '<div class="loading-spinner">ERROR</div>';
        }
    }

    renderLeaderboard(data) {
        const listContainer = document.getElementById('leaderboardList');
        listContainer.innerHTML = '';
        const shipColors = { 1: '#0096FF', 2: '#00DC64', 3: '#FF00AA', 4: '#FFD700', 5: '#B400FF' };
        const shipNames = { 1: 'Sky Striker', 2: 'Forest Wraith', 3: 'Pink Lightning', 4: 'Midas Touch', 5: 'Dark Matter' };

        const formatNumber = (num) => {
            if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
            if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
            return num.toString();
        };

        data.forEach((player, index) => {
            const row = document.createElement('div');
            row.className = `lb-row rank-${player.rank <= 3 ? player.rank : 'normal'}`;
            const shipColor = shipColors[player.shipId] || '#FFFFFF';
            const shipName = shipNames[player.shipId] || 'Unknown';

            let gapHtml = '';
            if (index > 0 && data[index - 1]) {
                const gap = data[index - 1].score - player.score;
                if (gap > 0) gapHtml = `<span class="lb-gap">↑${formatNumber(gap)}</span>`;
            }

            row.innerHTML = `
                <div class="lb-rank">#${player.rank}</div>
                <div class="lb-info">
                    <div class="lb-ship-icon" style="background: ${shipColor}" title="${shipName}">
                        <img src="./images/ship-${player.shipId}.png" alt="${shipName}" class="lb-ship-img" onerror="this.style.display='none'; this.parentElement.innerHTML='🚀'">
                    </div>
                    <div class="lb-player-data">
                        <div class="lb-name">${player.name}</div>
                        ${gapHtml}
                    </div>
                </div>
                <div class="lb-score">${formatNumber(player.score)}</div>
            `;
            listContainer.appendChild(row);
        });
    }

    // ===== КОНКУРС И АДМИН-ПАНЕЛЬ =====
    isContestActive() { return Date.now() < contestEndTime; }

    showAdminPanelButton() {
        const userId = this.tg?.initDataUnsafe?.user?.id;
        const adminButton = document.getElementById('adminPanelButton');
        if (userId === ADMIN_USER_ID && adminButton) {
            adminButton.style.display = 'flex'; // flex для центрирования иконки и текста
            console.log('🔑 Admin panel visible');
        } else if (adminButton) {
            adminButton.style.display = 'none';
        }
    }

    openAdminPanel() {
        const userId = this.tg?.initDataUnsafe?.user?.id;
        if (userId !== ADMIN_USER_ID) { this.showNotification('🚫 Access Denied', 'error'); return; }
        this.updateAdminPanelInfo();
        document.getElementById('adminModal').classList.add('active');
    }

    closeAdminPanel() { document.getElementById('adminModal').classList.remove('active'); }

    updateAdminPanelInfo() {
        const now = Date.now();
        const remaining = contestEndTime - now;
        const isActive = remaining > 0;
        
        document.getElementById('contestStatusInfo').innerHTML = `
            <div class="status-line"><span class="label">Status:</span><span class="value ${isActive ? 'active' : 'inactive'}">${isActive ? 'ACTIVE' : 'ENDED'}</span></div>
            <div class="status-line"><span class="label">End Date:</span><span class="value">${new Date(contestEndTime).toLocaleString()}</span></div>
            <div class="status-line"><span class="label">Time Remaining:</span><span class="value">${this.formatTimeRemaining(remaining)}</span></div>
        `;
        
        const totalPlayers = document.querySelectorAll('.lb-row').length;
        document.getElementById('adminStats').innerHTML = `
            <div class="stat-row"><span class="stat-label">Total Players:</span><span class="stat-value">${totalPlayers}</span></div>
            <div class="stat-row"><span class="stat-label">Your ID:</span><span class="stat-value">${this.tg?.initDataUnsafe?.user?.id || 'Unknown'}</span></div>
            <div class="stat-row"><span class="stat-label">Contest Duration:</span><span class="stat-value">${CONTEST_DURATION_DAYS} days</span></div>
        `;
    }

    formatTimeRemaining(ms) {
        if (ms <= 0) return 'ENDED';
        const days = Math.floor(ms / (1000 * 60 * 60 * 24));
        const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
        return `${days}d ${hours}h ${minutes}m`;
    }

        extendContest(days) {
        const now = new Date();
        const currentEnd = new Date(contestEndTime);
        const baseDate = now > currentEnd ? now : currentEnd;
        baseDate.setDate(baseDate.getDate() + days);
        contestEndDate = baseDate.toISOString();
        localStorage.setItem('contestEndDate', contestEndDate);
        this.updateContestEndTime(); // <-- ОБНОВЛЯЕМ contestEndTime!
        this.showNotification(`⏱️ Конкурс продлён на +${days} дн.!`, 'success');
        this.updateAdminPanelInfo();
    }

    resetContestTimer() {
        if (!confirm('Сбросить таймер на 7 дней с текущего момента?')) return;
        const now = new Date();
        now.setDate(now.getDate() + CONTEST_DURATION_DAYS);
        contestEndDate = now.toISOString();
        localStorage.setItem('contestEndDate', contestEndDate);
        this.updateContestEndTime(); // <-- ОБНОВЛЯЕМ contestEndTime!
        this.showNotification('🔄 Таймер сброшен на 7 дней', 'success');
        this.updateAdminPanelInfo();
    }

    pauseContest() {
        if (!confirm('Приостановить конкурс? Счета не будут приниматься.')) return;
        const past = new Date();
        past.setDate(past.getDate() - 1);
        contestEndDate = past.toISOString();
        localStorage.setItem('contestEndDate', contestEndDate);
        this.updateContestEndTime(); // <-- ОБНОВЛЯЕМ contestEndTime!
        this.showNotification('⏸️ Конкурс ПРИОСТАНОВЛЕН', 'error');
        this.updateAdminPanelInfo();
    }

    resumeContest() {
        const now = new Date();
        now.setDate(now.getDate() + CONTEST_DURATION_DAYS);
        contestEndDate = now.toISOString();
        localStorage.setItem('contestEndDate', contestEndDate);
        this.updateContestEndTime(); // <-- ОБНОВЛЯЕМ contestEndTime!
        this.showNotification('▶️ Конкурс ВОЗОБНОВЛЁН', 'success');
        this.updateAdminPanelInfo();
    }

    endContest() {
        if (!confirm('ЗАВЕРШИТЬ КОНКУРС СЕЙЧАС? Это нельзя отменить!')) return;
        const now = new Date();
        now.setHours(now.getHours() - 1);
        contestEndDate = now.toISOString();
        localStorage.setItem('contestEndDate', contestEndDate);
        this.updateContestEndTime(); // <-- ОБНОВЛЯЕМ contestEndTime!
        this.showNotification('🏁 КОНКУРС ЗАВЕРШЁН', 'error');
        this.updateAdminPanelInfo();
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
    if (now - lastTouchEnd <= 300) e.preventDefault();
    lastTouchEnd = now;
}, false);