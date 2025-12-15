
// RHYTHM DODGER - Progressive Difficulty Version
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Background Music
const bgMusic = new Audio('assets/sounds/Geometry Dash - Dry Out.mp3');
bgMusic.loop = true;
bgMusic.volume = 0.5;

// Death Sound
const deathSound = new Audio('assets/sounds/Geometry Dash Death.mp3');
deathSound.loop = false;
deathSound.volume = 0.7;

// Loser Sound
const loserSound = new Audio('assets/sounds/LOSERsound.mp3');
loserSound.loop = true;
loserSound.volume = 0.6;

// Loser Image
const loserImage = new Image();
loserImage.src = 'assets/LOSERimage.jpg';
let loserImageLoaded = false;
loserImage.onload = function() {
    loserImageLoaded = true;
};

// Loser screen shake
let loserShake = { x: 0, y: 0, intensity: 8 };

// Game State
let gameState = 'menu';
let score = 0;
let combo = 0;
let maxCombo = 0;
let gameTime = 0;
let gameDuration = 130000;
let lastTime = 0;
let screenShake = { x: 0, y: 0, intensity: 0 };

// Progressive difficulty multiplier (increases every second)
let difficultyMult = 1;

// Player
const player = {
    x: 0, y: 0, width: 35, height: 35, speed: 7,
    targetX: 0, trail: [], invincible: false,
    // Jump properties
    groundY: 0,
    velocityY: 0,
    isJumping: false,
    jumpPower: -18,
    gravity: 0.8
};

const keys = { left: false, right: false, jump: false };
let obstacles = [];
let warningIndicators = [];
let particles = [];
let backgroundParticles = [];
let flashIntensity = 0;
let pulsePhase = 0;
let buildings = [];
let beatPulse = 0;
let patternIndex = 0;

// Continuous spawning timers
let lastBeamSpawn = 0;
let lastSweeperSpawn = 0;
let lastRainSpawn = 0;
let lastLaserSpawn = 0;

// Mobile detection (must be before init)
var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               ('ontouchstart' in window) ||
               (navigator.maxTouchPoints > 0);

// DOM Elements
const startScreen = document.getElementById('start-screen');
const gameUI = document.getElementById('game-ui');
const gameoverScreen = document.getElementById('gameover-screen');
const victoryScreen = document.getElementById('victory-screen');
const progressFill = document.getElementById('progress-fill');
const timeDisplay = document.getElementById('time-display');
const scoreValue = document.getElementById('score-value');
const comboDisplay = document.getElementById('combo-display');
const comboValue = document.getElementById('combo-value');

function init() {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    
    // Show mobile controls hint if on mobile
    if (isMobile) {
        showMobileControlsHint();
    }
    
    // Click on canvas to retry when game over
    canvas.addEventListener('click', function() {
        if (gameState === 'gameover') {
            startGame();
        }
    });
    
    document.getElementById('start-btn').addEventListener('click', startGame);
    document.getElementById('retry-btn').addEventListener('click', startGame);
    document.getElementById('replay-btn').addEventListener('click', startGame);
    
    initBackground();
    initBackgroundParticles();
    requestAnimationFrame(gameLoop);
}

// Show mobile controls hint on start screen
function showMobileControlsHint() {
    var startInfo = document.querySelector('.start-info');
    if (startInfo) {
        startInfo.innerHTML = '<p class="controls-info">Swipe <span class="key">←</span> to move left</p>' +
                              '<p class="controls-info">Swipe <span class="key">→</span> to move right</p>' +
                              '<p class="controls-info">Swipe <span class="key">↑</span> to jump</p>' +
                              '<p class="controls-info mobile-tip">Tap anywhere to start!</p>';
    }
    // Add mobile class to body for CSS styling
    document.body.classList.add('mobile-device');
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    player.groundY = canvas.height - 100;
    player.y = player.groundY;
    player.x = canvas.width / 2;
    player.targetX = player.x;
    initBackground();
}

function initBackground() {
    buildings = [];
    var count = Math.ceil(canvas.width / 60) + 5;
    for (var i = 0; i < count; i++) {
        buildings.push({
            x: i * 60 - 30,
            width: 40 + Math.random() * 30,
            height: 150 + Math.random() * 300,
            windows: Math.floor(Math.random() * 8) + 3,
            windowRows: Math.floor(Math.random() * 10) + 5,
            hue: 280 + Math.random() * 40
        });
    }
}

function initBackgroundParticles() {
    backgroundParticles = [];
    for (var i = 0; i < 50; i++) {
        backgroundParticles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 3 + 1,
            speedX: (Math.random() - 0.5) * 0.5,
            speedY: -Math.random() * 0.5 - 0.2,
            alpha: Math.random() * 0.5 + 0.2,
            twinkle: Math.random() * Math.PI * 2
        });
    }
}

function handleKeyDown(e) {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = true;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = true;
    // Jump with Space, W, or Up Arrow
    if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        if (gameState === 'menu') {
            startGame();
        } else if (gameState === 'playing') {
            keys.jump = true;
        } else if (gameState === 'gameover') {
            startGame();
        }
    }
}

function handleKeyUp(e) {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = false;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
    if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') keys.jump = false;
}

// Touch/Swipe controls
var touchStartX = 0;
var touchStartY = 0;
var touchStartTime = 0;
var swipeThreshold = 40; // Minimum distance for a swipe
var swipeTimeThreshold = 400; // Maximum time for a swipe gesture (ms)
var isTouching = false;
var activeTouchId = null;
var swipeMovementTimer = null;
var swipeMovementDuration = 150; // How long movement lasts after a swipe (ms)

function handleTouchStart(e) {
    e.preventDefault();
    
    // Only track the first touch
    if (isTouching) return;
    
    var touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    touchStartTime = Date.now();
    isTouching = true;
    activeTouchId = touch.identifier;
    
    // Handle tap to start/retry
    if (gameState === 'menu') {
        startGame();
    } else if (gameState === 'gameover') {
        startGame();
    }
}

function handleTouchMove(e) {
    if (!isTouching || gameState !== 'playing') return;
    e.preventDefault();
    
    // Find our tracked touch
    var touch = null;
    for (var i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === activeTouchId) {
            touch = e.touches[i];
            break;
        }
    }
    if (!touch) return;
    
    var diffX = touch.clientX - touchStartX;
    var diffY = touch.clientY - touchStartY;
    var timeDiff = Date.now() - touchStartTime;
    
    // Check for swipe up (jump) - prioritize vertical swipes
    if (diffY < -swipeThreshold && Math.abs(diffY) > Math.abs(diffX) && !player.isJumping) {
        keys.jump = true;
        // Reset touch start position for continuous swipe detection
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        touchStartTime = Date.now();
    }
    
    // Check for horizontal swipe (movement)
    if (Math.abs(diffX) > swipeThreshold && Math.abs(diffX) > Math.abs(diffY)) {
        // Clear any existing movement timer
        if (swipeMovementTimer) {
            clearTimeout(swipeMovementTimer);
        }
        
        if (diffX < 0) {
            // Swipe left
            keys.left = true;
            keys.right = false;
        } else {
            // Swipe right
            keys.right = true;
            keys.left = false;
        }
        
        // Reset touch start for continuous swiping
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        touchStartTime = Date.now();
        
        // Set timer to stop movement after swipe duration
        swipeMovementTimer = setTimeout(function() {
            keys.left = false;
            keys.right = false;
        }, swipeMovementDuration);
    }
}

function handleTouchEnd(e) {
    e.preventDefault();
    
    // Check if our tracked touch ended
    var touchEnded = true;
    for (var i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === activeTouchId) {
            touchEnded = false;
            break;
        }
    }
    
    if (touchEnded) {
        // Process final swipe on touch end
        var timeDiff = Date.now() - touchStartTime;
        
        // Only process as swipe if it was quick enough
        if (timeDiff < swipeTimeThreshold && gameState === 'playing') {
            var touch = e.changedTouches[0];
            var diffX = touch.clientX - touchStartX;
            var diffY = touch.clientY - touchStartY;
            
            // Final swipe detection on release
            if (Math.abs(diffY) > swipeThreshold && diffY < 0 && Math.abs(diffY) > Math.abs(diffX)) {
                // Swipe up - jump
                if (!player.isJumping) {
                    keys.jump = true;
                    // Jump key will be reset by the game loop
                }
            } else if (Math.abs(diffX) > swipeThreshold && Math.abs(diffX) > Math.abs(diffY)) {
                // Clear any existing movement timer
                if (swipeMovementTimer) {
                    clearTimeout(swipeMovementTimer);
                }
                
                if (diffX < 0) {
                    // Swipe left
                    keys.left = true;
                    keys.right = false;
                } else {
                    // Swipe right
                    keys.right = true;
                    keys.left = false;
                }
                
                // Stop movement after duration
                swipeMovementTimer = setTimeout(function() {
                    keys.left = false;
                    keys.right = false;
                }, swipeMovementDuration);
            }
        }
        
        // Reset touch tracking
        isTouching = false;
        activeTouchId = null;
        touchStartX = 0;
        touchStartY = 0;
        keys.jump = false;
    }
}

function startGame() {
    gameState = 'playing';
    score = 0; combo = 0; maxCombo = 0; gameTime = 0; patternIndex = 0;
    obstacles = []; warningIndicators = []; particles = [];
    player.x = canvas.width / 2;
    player.targetX = player.x;
    player.trail = [];
    player.speed = 7;
    player.y = player.groundY;
    player.velocityY = 0;
    player.isJumping = false;
    difficultyMult = 1;
    
    lastBeamSpawn = 0;
    lastSweeperSpawn = 0;
    lastRainSpawn = 0;
    lastLaserSpawn = 0;
    
    gameDuration = 130000;
    
    startScreen.classList.add('hidden');
    gameoverScreen.classList.add('hidden');
    victoryScreen.classList.add('hidden');
    gameUI.classList.remove('hidden');
    
    // Stop death and loser sounds if playing
    deathSound.pause();
    deathSound.currentTime = 0;
    loserSound.pause();
    loserSound.currentTime = 0;
    
    // Start background music
    bgMusic.currentTime = 0;
    bgMusic.play().catch(function(e) {
        console.log('Audio play failed:', e);
    });
}

function gameOver() {
    gameState = 'gameover';
    gameUI.classList.add('hidden');
    // Don't show the normal game over screen - we'll draw the loser image on canvas
    // gameoverScreen.classList.remove('hidden');
    document.getElementById('final-score').textContent = score;
    document.getElementById('final-combo').textContent = maxCombo;
    document.getElementById('final-progress').textContent = Math.floor((gameTime / gameDuration) * 100) + '%';
    triggerScreenShake(20);
    
    // Stop main music and play death sound
    bgMusic.pause();
    
    // Play death sound effect
    deathSound.currentTime = 0;
    deathSound.play().catch(function(e) {
        console.log('Death sound play failed:', e);
    });
    
    // Play loser sound after a short delay
    loserSound.currentTime = 0;
    loserSound.play().catch(function(e) {
        console.log('Loser sound play failed:', e);
    });
}

function victory() {
    gameState = 'victory';
    gameUI.classList.add('hidden');
    victoryScreen.classList.remove('hidden');
    document.getElementById('victory-score').textContent = score;
    document.getElementById('victory-combo').textContent = maxCombo;
    for (var i = 0; i < 100; i++) createParticle(Math.random() * canvas.width, Math.random() * canvas.height, 'celebration');
    
    // Keep music playing on victory too
}

function gameLoop(timestamp) {
    var dt = timestamp - lastTime;
    lastTime = timestamp;
    if (dt > 100) dt = 16;
    update(dt);
    render();
    requestAnimationFrame(gameLoop);
}

function update(dt) {
    pulsePhase += dt * 0.003;
    beatPulse *= 0.9;
    
    if (screenShake.intensity > 0) {
        screenShake.x = (Math.random() - 0.5) * screenShake.intensity;
        screenShake.y = (Math.random() - 0.5) * screenShake.intensity;
        screenShake.intensity *= 0.9;
        if (screenShake.intensity < 0.5) screenShake.intensity = 0;
    }
    
    if (flashIntensity > 0) flashIntensity *= 0.85;
    updateBackgroundParticles(dt);
    
    if (gameState === 'playing') {
        gameTime += dt;
        
        // Progressive difficulty - increases every second
        difficultyMult = 1 + (gameTime / 1000) * 0.08; // 8% harder every second
        
        // Reduce player speed slightly as difficulty increases (makes it harder)
        player.speed = Math.max(5, 7 - (gameTime / 60000) * 1.5);
        
        if (gameTime >= gameDuration) { victory(); return; }
        
        updatePlayer(dt);
        updateObstacles(dt);
        updateWarnings(dt);
        spawnProgressiveObstacles();
        checkCollisions();
        updateUI();
        score += 1;
    }
    updateParticles(dt);
}

function updatePlayer(dt) {
    var moveSpeed = player.speed * (dt / 16);
    if (keys.left) player.targetX -= moveSpeed * 8;
    if (keys.right) player.targetX += moveSpeed * 8;
    player.targetX = Math.max(player.width / 2, Math.min(canvas.width - player.width / 2, player.targetX));
    player.x += (player.targetX - player.x) * 0.2;
    
    // Jump mechanics
    if (keys.jump && !player.isJumping) {
        player.isJumping = true;
        player.velocityY = player.jumpPower;
        // Create jump particles
        for (var i = 0; i < 5; i++) {
            createParticle(player.x + (Math.random() - 0.5) * player.width, player.y + player.height/2, 'jump');
        }
    }
    
    // Apply gravity
    if (player.isJumping) {
        player.velocityY += player.gravity * (dt / 16);
        player.y += player.velocityY * (dt / 16);
        
        // Land on ground
        if (player.y >= player.groundY) {
            player.y = player.groundY;
            player.velocityY = 0;
            player.isJumping = false;
            // Create landing particles
            for (var i = 0; i < 3; i++) {
                createParticle(player.x + (Math.random() - 0.5) * player.width, player.y + player.height/2, 'land');
            }
        }
    }
    
    player.trail.unshift({ x: player.x, y: player.y, alpha: 1 });
    if (player.trail.length > 10) player.trail.pop();
}

function updateObstacles(dt) {
    for (var i = obstacles.length - 1; i >= 0; i--) {
        var obs = obstacles[i];
        obs.timer += dt;
        
        if (obs.type === 'beam' || obs.type === 'laser') {
            if (obs.timer < obs.warningTime) {
                obs.alpha = 0.3 + Math.sin(obs.timer * 0.02) * 0.2;
            } else if (obs.timer < obs.warningTime + obs.activeTime) {
                obs.active = true;
                obs.alpha = 1;
                obs.width = obs.maxWidth;
                if (obs.type === 'laser' && obs.timer < obs.warningTime + 100) flashIntensity = 0.3;
            } else {
                obs.alpha -= dt * 0.008;
                if (obs.alpha <= 0) obs.dead = true;
            }
        } else if (obs.type === 'sweeper') {
            if (obs.timer < obs.warningTime) {
                obs.alpha = 0.3;
            } else {
                obs.active = true;
                obs.alpha = 1;
                obs.x += obs.speed * obs.direction * (dt / 16);
                if ((obs.direction > 0 && obs.x > canvas.width + 100) || (obs.direction < 0 && obs.x < -100)) obs.dead = true;
            }
        } else if (obs.type === 'rain') {
            obs.y += obs.speed * (dt / 16);
            obs.active = true;
            if (obs.y > canvas.height + 50) obs.dead = true;
        } else if (obs.type === 'diagonal') {
            obs.timer += dt;
            if (obs.timer > 200) {
                obs.active = true;
                obs.x += obs.vx * (dt / 16);
                obs.y += obs.vy * (dt / 16);
                if (obs.y > canvas.height + 50 || obs.x < -50 || obs.x > canvas.width + 50) obs.dead = true;
            }
        }
        
        if (obs.dead) obstacles.splice(i, 1);
    }
}

function updateWarnings(dt) {
    for (var i = warningIndicators.length - 1; i >= 0; i--) {
        var warn = warningIndicators[i];
        warn.timer += dt;
        warn.alpha = 0.5 + Math.sin(warn.timer * 0.03) * 0.4;
        if (warn.timer >= warn.duration) warningIndicators.splice(i, 1);
    }
}

function addWarning(x, width, duration) {
    warningIndicators.push({ x: x, width: width, duration: duration, timer: 0, alpha: 0.5 });
}

// Progressive obstacle spawning based on time
function spawnProgressiveObstacles() {
    var t = gameTime;
    var dm = difficultyMult;
    
    // Base spawn rates that get faster with difficulty
    var beamInterval = Math.max(400, 1500 - t * 0.008);
    var sweeperInterval = Math.max(800, 3000 - t * 0.015);
    var rainInterval = Math.max(100, 600 - t * 0.004);
    var laserInterval = Math.max(600, 2500 - t * 0.012);
    
    // Spawn beams
    if (t - lastBeamSpawn > beamInterval) {
        lastBeamSpawn = t;
        var numBeams = Math.min(5, 1 + Math.floor(t / 20000));
        for (var i = 0; i < numBeams; i++) {
            var x = Math.random() * canvas.width * 0.8 + canvas.width * 0.1;
            var width = 50 + Math.random() * 40 + (t / 2000);
            var warningTime = Math.max(300, 800 - t * 0.004);
            var activeTime = 300 + Math.random() * 200 + (t / 500);
            spawnBeam(x, width, warningTime, activeTime);
        }
    }
    
    // Spawn sweepers
    if (t - lastSweeperSpawn > sweeperInterval) {
        lastSweeperSpawn = t;
        var fromLeft = Math.random() > 0.5;
        var y = canvas.height - 60 - Math.random() * 80;
        var speed = 12 + (t / 3000) * dm;
        var height = 50 + Math.random() * 30;
        spawnSweeper(fromLeft, y, speed, height);
        
        // Double sweeper after 30 seconds
        if (t > 30000 && Math.random() > 0.5) {
            setTimeout(function() {
                spawnSweeper(!fromLeft, canvas.height - 80 - Math.random() * 60, speed * 1.1, height);
            }, 200);
        }
        
        // Triple sweeper after 60 seconds
        if (t > 60000 && Math.random() > 0.6) {
            setTimeout(function() {
                spawnSweeper(fromLeft, canvas.height - 100, speed * 0.9, height);
            }, 400);
        }
    }
    
    // Spawn rain
    if (t - lastRainSpawn > rainInterval) {
        lastRainSpawn = t;
        var rainCount = Math.min(8, 1 + Math.floor(t / 10000));
        for (var i = 0; i < rainCount; i++) {
            var x = Math.random() * canvas.width;
            var speed = 8 + (t / 5000) * dm + Math.random() * 4;
            spawnRain(x, speed);
        }
    }
    
    // Spawn lasers (start after 15 seconds)
    if (t > 15000 && t - lastLaserSpawn > laserInterval) {
        lastLaserSpawn = t;
        var x = Math.random() * canvas.width * 0.7 + canvas.width * 0.15;
        var width = 35 + (t / 4000);
        var warningTime = Math.max(400, 1000 - t * 0.005);
        spawnLaser(x, width, warningTime, 250);
        
        // Double laser after 45 seconds
        if (t > 45000 && Math.random() > 0.4) {
            var x2 = x > canvas.width / 2 ? x - canvas.width * 0.3 : x + canvas.width * 0.3;
            spawnLaser(x2, width, warningTime + 100, 250);
        }
        
        // Triple laser after 80 seconds
        if (t > 80000 && Math.random() > 0.5) {
            spawnLaser(canvas.width * 0.5, width * 1.2, warningTime, 300);
        }
    }
    
    // Spawn diagonal rain after 25 seconds
    if (t > 25000 && Math.random() < 0.02 * dm) {
        spawnDiagonalRain();
    }
    
    // Chaos mode after 90 seconds - everything spawns faster
    if (t > 90000) {
        if (Math.random() < 0.03) {
            spawnBeam(Math.random() * canvas.width, 60, 250, 400);
        }
        if (Math.random() < 0.02) {
            spawnSweeper(Math.random() > 0.5, canvas.height - 70, 25 + Math.random() * 10, 60);
        }
    }
    
    // Ultimate chaos after 110 seconds
    if (t > 110000) {
        if (Math.random() < 0.05) {
            spawnRain(Math.random() * canvas.width, 15 + Math.random() * 8);
        }
        if (Math.random() < 0.02) {
            spawnLaser(Math.random() * canvas.width * 0.8 + canvas.width * 0.1, 50, 300, 300);
        }
    }
}

function spawnBeam(x, width, warningTime, activeTime) {
    width = width || 80; warningTime = warningTime || 600; activeTime = activeTime || 400;
    obstacles.push({
        type: 'beam', x: x, y: 0, width: 10, maxWidth: width, height: canvas.height,
        timer: 0, warningTime: warningTime, activeTime: activeTime,
        alpha: 0.3, active: false, color: '#ffd93d', glowColor: '#ff9a3c'
    });
    addWarning(x, width, warningTime);
}

function spawnLaser(x, width, warningTime, activeTime) {
    width = width || 40; warningTime = warningTime || 800; activeTime = activeTime || 250;
    obstacles.push({
        type: 'laser', x: x, y: 0, width: 5, maxWidth: width, height: canvas.height,
        timer: 0, warningTime: warningTime, activeTime: activeTime,
        alpha: 0.2, active: false, color: '#ff4757', glowColor: '#ff6b81'
    });
    addWarning(x, width, warningTime);
}

function spawnSweeper(fromLeft, y, speed, height) {
    y = y || canvas.height - 80; speed = speed || 15; height = height || 60;
    obstacles.push({
        type: 'sweeper', x: fromLeft ? -100 : canvas.width + 100, y: y,
        width: 150, height: height, direction: fromLeft ? 1 : -1,
        speed: speed, timer: 0, warningTime: 300,
        alpha: 0.3, active: false, color: '#ff6b9d', glowColor: '#c44569'
    });
}

function spawnRain(x, speed) {
    speed = speed || 10;
    obstacles.push({
        type: 'rain', x: x, y: -50, width: 18, height: 35,
        speed: speed, timer: 0, alpha: 1, active: true,
        color: '#ffd93d', glowColor: '#ff9a3c'
    });
}

function spawnDiagonalRain() {
    var fromLeft = Math.random() > 0.5;
    var x = fromLeft ? -20 : canvas.width + 20;
    var vx = fromLeft ? 6 + Math.random() * 4 : -6 - Math.random() * 4;
    obstacles.push({
        type: 'diagonal', x: x, y: -30, width: 20, height: 40,
        vx: vx, vy: 8 + Math.random() * 4, timer: 0, alpha: 1, active: false,
        color: '#ff9a3c', glowColor: '#ffd93d'
    });
}

function checkCollisions() {
    if (player.invincible) return;
    var pl = player.x - player.width/2, pr = player.x + player.width/2;
    var pt = player.y - player.height/2, pb = player.y + player.height/2;
    
    for (var i = 0; i < obstacles.length; i++) {
        var obs = obstacles[i];
        if (!obs.active) continue;
        var collision = false;
        
        if (obs.type === 'beam' || obs.type === 'laser') {
            collision = pl < obs.x + obs.width/2 && pr > obs.x - obs.width/2 && pt < canvas.height && pb > 0;
        } else if (obs.type === 'sweeper') {
            collision = pl < obs.x + obs.width/2 && pr > obs.x - obs.width/2 && pt < obs.y + obs.height/2 && pb > obs.y - obs.height/2;
        } else if (obs.type === 'rain' || obs.type === 'diagonal') {
            collision = pl < obs.x + obs.width/2 && pr > obs.x - obs.width/2 && pt < obs.y + obs.height/2 && pb > obs.y - obs.height/2;
        }
        
        if (collision) { handleCollision(); return; }
    }
    combo++;
    if (combo > maxCombo) maxCombo = combo;
}

function handleCollision() {
    combo = 0;
    triggerScreenShake(15);
    flashIntensity = 0.5;
    for (var i = 0; i < 30; i++) createParticle(player.x, player.y, 'death');
    gameOver();
}

function createParticle(x, y, type) {
    var p = { x: x, y: y, life: 1, decay: 0.02, vx: 0, vy: 0, size: 5, color: '#ff6b9d', gravity: 0 };
    if (type === 'death') {
        p.vx = (Math.random()-0.5)*15; p.vy = (Math.random()-0.5)*15;
        p.size = Math.random()*10+5; p.decay = 0.03;
    } else if (type === 'celebration') {
        p.vx = (Math.random()-0.5)*10; p.vy = -Math.random()*10-5;
        p.size = Math.random()*8+4; p.color = Math.random()>0.5?'#ffd93d':'#ff6b9d';
        p.decay = 0.01; p.gravity = 0.2;
    } else if (type === 'jump') {
        p.vx = (Math.random()-0.5)*4; p.vy = Math.random()*3+2;
        p.size = Math.random()*6+3; p.color = '#00ffff';
        p.decay = 0.05; p.gravity = 0;
    } else if (type === 'land') {
        p.vx = (Math.random()-0.5)*6; p.vy = -Math.random()*2;
        p.size = Math.random()*4+2; p.color = '#00ffff';
        p.decay = 0.06; p.gravity = 0.1;
    }
    particles.push(p);
}

function updateParticles(dt) {
    for (var i = particles.length-1; i >= 0; i--) {
        var p = particles[i];
        p.x += p.vx*(dt/16); p.y += p.vy*(dt/16);
        if (p.gravity) p.vy += p.gravity;
        p.life -= p.decay;
        if (p.life <= 0) particles.splice(i, 1);
    }
}

function updateBackgroundParticles(dt) {
    for (var i = 0; i < backgroundParticles.length; i++) {
        var p = backgroundParticles[i];
        p.x += p.speedX*(dt/16); p.y += p.speedY*(dt/16);
        p.twinkle += dt*0.005;
        if (p.y < -10) { p.y = canvas.height+10; p.x = Math.random()*canvas.width; }
    }
}

function triggerScreenShake(intensity) { screenShake.intensity = intensity; }

function updateUI() {
    var progress = (gameTime/gameDuration)*100;
    progressFill.style.width = progress+'%';
    var sec = Math.floor(gameTime/1000), total = Math.floor(gameDuration/1000);
    timeDisplay.textContent = Math.floor(sec/60)+':'+(sec%60<10?'0':'')+(sec%60)+' / '+Math.floor(total/60)+':'+(total%60<10?'0':'')+(total%60);
    scoreValue.textContent = score;
    if (combo >= 50) { comboDisplay.classList.remove('hidden'); comboValue.textContent = combo; }
    else { comboDisplay.classList.add('hidden'); }
}

function render() {
    // Special render for game over - show loser image with shake
    if (gameState === 'gameover') {
        // Update loser shake (continuous shake)
        loserShake.x = (Math.random() - 0.5) * loserShake.intensity;
        loserShake.y = (Math.random() - 0.5) * loserShake.intensity;
        
        ctx.save();
        ctx.translate(loserShake.x, loserShake.y);
        
        // Draw dark background
        ctx.fillStyle = '#1a0a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw loser image smaller and centered
        if (loserImageLoaded) {
            // Calculate scaling to fit image at 40% of canvas size
            var maxSize = Math.min(canvas.width, canvas.height) * 0.4;
            var imgRatio = loserImage.width / loserImage.height;
            var drawWidth, drawHeight, drawX, drawY;
            
            if (imgRatio > 1) {
                // Image is wider than tall
                drawWidth = maxSize;
                drawHeight = maxSize / imgRatio;
            } else {
                // Image is taller than wide
                drawHeight = maxSize;
                drawWidth = maxSize * imgRatio;
            }
            
            drawX = (canvas.width - drawWidth) / 2;
            drawY = (canvas.height - drawHeight) / 2 - 50; // Offset up a bit for stats
            
            // Add glow effect around image
            ctx.shadowColor = '#ff4757';
            ctx.shadowBlur = 30;
            ctx.drawImage(loserImage, drawX, drawY, drawWidth, drawHeight);
            ctx.shadowBlur = 0;
        } else {
            // Fallback if image not loaded
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 72px Orbitron, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('LOSER!', canvas.width/2, canvas.height/2);
        }
        
        // Draw retry button overlay
        drawLoserRetryButton();
        
        ctx.restore();
        return;
    }
    
    ctx.save();
    ctx.translate(screenShake.x, screenShake.y);
    ctx.fillStyle = '#1a0a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    drawBackground();
    drawBackgroundParticles();
    drawWarnings();
    drawObstacles();
    if (gameState === 'playing') drawPlayer();
    drawParticles();
    
    if (flashIntensity > 0.01) {
        ctx.fillStyle = 'rgba(255,255,255,'+flashIntensity+')';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    drawVignette();
    ctx.restore();
}

function drawLoserRetryButton() {
    // Semi-transparent overlay at bottom for stats and retry
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, canvas.height - 150, canvas.width, 150);
    
    // Stats
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Orbitron, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Score: ' + score + '  |  Best Combo: ' + maxCombo + '  |  Progress: ' + Math.floor((gameTime / gameDuration) * 100) + '%', canvas.width/2, canvas.height - 100);
    
    // Retry text
    ctx.fillStyle = '#ff6b9d';
    ctx.font = 'bold 32px Orbitron, sans-serif';
    if (isMobile) {
        ctx.fillText('Tap anywhere to retry', canvas.width/2, canvas.height - 50);
    } else {
        ctx.fillText('Click anywhere or press SPACE to retry', canvas.width/2, canvas.height - 50);
    }
}

function drawBackground() {
    var gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    var hue1 = 280 + Math.sin(pulsePhase) * 10;
    var hue2 = 320 + Math.sin(pulsePhase + 1) * 10;
    gradient.addColorStop(0, 'hsl('+hue1+',40%,8%)');
    gradient.addColorStop(0.5, 'hsl('+hue2+',50%,12%)');
    gradient.addColorStop(1, 'hsl('+hue1+',60%,5%)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if (beatPulse > 0.1) {
        ctx.fillStyle = 'rgba(255,107,157,'+(beatPulse*0.1)+')';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    for (var i = 0; i < buildings.length; i++) drawBuilding(buildings[i]);
    
    var groundGrad = ctx.createLinearGradient(0, canvas.height-80, 0, canvas.height);
    groundGrad.addColorStop(0, '#2d1f3d');
    groundGrad.addColorStop(1, '#1a0a2e');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, canvas.height-80, canvas.width, 80);
    
    ctx.shadowColor = '#ff6b9d';
    ctx.shadowBlur = 20;
    ctx.strokeStyle = '#ff6b9d';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height-80);
    ctx.lineTo(canvas.width, canvas.height-80);
    ctx.stroke();
    ctx.shadowBlur = 0;
}

function drawBuilding(b) {
    var baseY = canvas.height - 80;
    var grad = ctx.createLinearGradient(b.x, baseY-b.height, b.x, baseY);
    grad.addColorStop(0, 'hsla('+b.hue+',50%,20%,0.8)');
    grad.addColorStop(1, 'hsla('+b.hue+',60%,10%,0.9)');
    ctx.fillStyle = grad;
    ctx.fillRect(b.x, baseY-b.height, b.width, b.height);
    
    var ww = (b.width-10)/b.windows, wh = (b.height-20)/b.windowRows;
    for (var row = 0; row < b.windowRows; row++) {
        for (var col = 0; col < b.windows; col++) {
            var wx = b.x + 5 + col*ww + 2, wy = baseY - b.height + 10 + row*wh + 2;
            var lit = Math.sin(pulsePhase + row + col + b.x*0.01) > 0.3;
            ctx.fillStyle = lit ? 'hsla(45,100%,70%,'+(0.3+Math.sin(pulsePhase*2+row+col)*0.2)+')' : 'rgba(0,0,0,0.5)';
            if (lit) { ctx.shadowColor = '#ffd93d'; ctx.shadowBlur = 5; }
            ctx.fillRect(wx, wy, ww-4, wh-4);
            ctx.shadowBlur = 0;
        }
    }
}

function drawBackgroundParticles() {
    for (var i = 0; i < backgroundParticles.length; i++) {
        var p = backgroundParticles[i];
        ctx.fillStyle = 'rgba(255,255,255,'+(p.alpha*(0.5+Math.sin(p.twinkle)*0.5))+')';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
        ctx.fill();
    }
}

function drawWarnings() {
    for (var i = 0; i < warningIndicators.length; i++) {
        var w = warningIndicators[i];
        var grad = ctx.createLinearGradient(0, 0, 0, 60);
        grad.addColorStop(0, 'rgba(255,71,87,'+w.alpha+')');
        grad.addColorStop(1, 'rgba(255,71,87,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(w.x - w.width/2, 0, w.width, 60);
        ctx.fillStyle = 'rgba(255,71,87,'+w.alpha+')';
        ctx.font = 'bold 28px Orbitron,sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('!', w.x, 42);
    }
}

function drawObstacles() {
    for (var i = 0; i < obstacles.length; i++) {
        var obs = obstacles[i];
        ctx.globalAlpha = obs.alpha;
        
        if (obs.type === 'beam') {
            ctx.shadowColor = obs.glowColor; ctx.shadowBlur = 30;
            var grad = ctx.createLinearGradient(obs.x-obs.width/2, 0, obs.x+obs.width/2, 0);
            grad.addColorStop(0, 'rgba(255,217,61,0)');
            grad.addColorStop(0.3, obs.color);
            grad.addColorStop(0.5, '#fff');
            grad.addColorStop(0.7, obs.color);
            grad.addColorStop(1, 'rgba(255,217,61,0)');
            ctx.fillStyle = grad;
            ctx.fillRect(obs.x-obs.width/2, 0, obs.width, canvas.height);
            ctx.fillStyle = 'rgba(255,255,255,0.8)';
            ctx.fillRect(obs.x-obs.width/6, 0, obs.width/3, canvas.height);
        } else if (obs.type === 'laser') {
            ctx.shadowColor = obs.glowColor; ctx.shadowBlur = 40;
            var grad = ctx.createLinearGradient(obs.x-obs.width/2, 0, obs.x+obs.width/2, 0);
            grad.addColorStop(0, 'rgba(255,71,87,0)');
            grad.addColorStop(0.3, obs.color);
            grad.addColorStop(0.5, '#fff');
            grad.addColorStop(0.7, obs.color);
            grad.addColorStop(1, 'rgba(255,71,87,0)');
            ctx.fillStyle = grad;
            ctx.fillRect(obs.x-obs.width/2, 0, obs.width, canvas.height);
            ctx.fillStyle = 'rgba(255,255,255,0.9)';
            ctx.fillRect(obs.x-obs.width/8, 0, obs.width/4, canvas.height);
        } else if (obs.type === 'sweeper') {
            ctx.shadowColor = obs.glowColor; ctx.shadowBlur = 25;
            var grad = ctx.createLinearGradient(obs.x-obs.width/2, obs.y, obs.x+obs.width/2, obs.y);
            grad.addColorStop(0, 'rgba(255,107,157,0)');
            grad.addColorStop(0.2, obs.color);
            grad.addColorStop(0.5, '#fff');
            grad.addColorStop(0.8, obs.color);
            grad.addColorStop(1, 'rgba(255,107,157,0)');
            ctx.fillStyle = grad;
            ctx.fillRect(obs.x-obs.width/2, obs.y-obs.height/2, obs.width, obs.height);
        } else if (obs.type === 'rain' || obs.type === 'diagonal') {
            ctx.shadowColor = obs.glowColor; ctx.shadowBlur = 10;
            var grad = ctx.createLinearGradient(obs.x, obs.y-obs.height/2, obs.x, obs.y+obs.height/2);
            grad.addColorStop(0, 'rgba(255,217,61,0.3)');
            grad.addColorStop(0.5, obs.color);
            grad.addColorStop(1, '#fff');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.ellipse(obs.x, obs.y, obs.width/2, obs.height/2, 0, 0, Math.PI*2);
            ctx.fill();
        }
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
    }
}

function drawPlayer() {
    for (var i = player.trail.length-1; i >= 0; i--) {
        var pt = player.trail[i];
        var size = player.width * (1 - i/player.trail.length) * 0.8;
        ctx.fillStyle = 'rgba(0,255,255,'+(pt.alpha*0.3)+')';
        ctx.fillRect(pt.x-size/2, pt.y-size/2, size, size);
    }
    
    ctx.shadowColor = '#00ffff'; ctx.shadowBlur = 20;
    var grad = ctx.createLinearGradient(player.x-player.width/2, player.y-player.height/2, player.x+player.width/2, player.y+player.height/2);
    grad.addColorStop(0, '#00ffff');
    grad.addColorStop(0.5, '#ffffff');
    grad.addColorStop(1, '#00ffff');
    ctx.fillStyle = grad;
    ctx.fillRect(player.x-player.width/2, player.y-player.height/2, player.width, player.height);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillRect(player.x-player.width/4, player.y-player.height/4, player.width/2, player.height/2);
    ctx.strokeStyle = '#00ffff'; ctx.lineWidth = 3;
    ctx.strokeRect(player.x-player.width/2, player.y-player.height/2, player.width, player.height);
    ctx.shadowBlur = 0;
}

function drawParticles() {
    for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color; ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size*p.life, 0, Math.PI*2);
        ctx.fill();
    }
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
}

function drawVignette() {
    var grad = ctx.createRadialGradient(canvas.width/2, canvas.height/2, canvas.height*0.3, canvas.width/2, canvas.height/2, canvas.height);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// Start the game
init();