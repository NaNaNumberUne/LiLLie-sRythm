
// RHYTHM DODGER - Progressive Difficulty Version with Platform Edges and 3D Effects
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
loserImage.onload = function() { loserImageLoaded = true; };

let loserShake = { x: 0, y: 0, intensity: 8 };
let gameState = 'menu';
let deathAnimationState = null;
let score = 0;
let combo = 0;
let maxCombo = 0;
let gameTime = 0;
let gameDuration = 130000;
let lastTime = 0;
let screenShake = { x: 0, y: 0, intensity: 0 };
let difficultyMult = 1;

const platform = { leftEdge: 0, rightEdge: 0, width: 0 };
const JUMP_UNLOCK_TIME = 60000;

const player = {
    x: 0, y: 0, width: 35, height: 35, speed: 7,
    targetX: 0, trail: [], invincible: false,
    groundY: 0, velocityY: 0, isJumping: false, isFalling: false,
    jumpPower: -18, gravity: 0.8
};

const keys = { left: false, right: false, jump: false };
let obstacles = [];
let warningIndicators = [];
let particles = [];
let backgroundParticles = [];
let bulletTrails = [];
let flashIntensity = 0;
let pulsePhase = 0;
let buildings = [];
let beatPulse = 0;
let globalGlow = 0;

// Mouse trail for menu
let mouseTrail = [];
let mouseX = 0;
let mouseY = 0;

let lastBeamSpawn = 0;
let lastSweeperSpawn = 0;
let lastRainSpawn = 0;
let lastLaserSpawn = 0;
let lastFlashLaserSpawn = 0;

var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

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
    
    // Mouse trail tracking
    window.addEventListener('mousemove', handleMouseMove);
    
    if (isMobile) showMobileControlsHint();
    canvas.addEventListener('click', function() { if (gameState === 'gameover') startGame(); });
    document.getElementById('start-btn').addEventListener('click', startGame);
    document.getElementById('retry-btn').addEventListener('click', startGame);
    document.getElementById('replay-btn').addEventListener('click', startGame);
    initBackground();
    initBackgroundParticles();
    requestAnimationFrame(gameLoop);
}

function handleMouseMove(e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
    
    // Only create trail particles on menu or gameover screens
    if (gameState === 'menu' || gameState === 'gameover') {
        // Add multiple square pixels for a flashy trail
        for (var i = 0; i < 6; i++) {
            var colors = ['#ff6b9d', '#00ffff', '#ffd93d', '#ff00aa', '#00ff88', '#ff4757', '#7c4dff', '#00e5ff', '#ff1744', '#76ff03'];
            var color = colors[Math.floor(Math.random() * colors.length)];
            
            // Main square pixel with trail
            mouseTrail.push({
                x: mouseX + (Math.random() - 0.5) * 15,
                y: mouseY + (Math.random() - 0.5) * 15,
                size: 4 + Math.random() * 10,
                color: color,
                life: 1,
                decay: 0.012 + Math.random() * 0.018,
                vx: (Math.random() - 0.5) * 5,
                vy: (Math.random() - 0.5) * 5,
                type: 'pixel',
                flash: Math.random() * Math.PI * 2,
                flashSpeed: 0.25 + Math.random() * 0.35,
                trailHistory: [] // Store previous positions for trail effect
            });
            
            // Smaller trailing pixels that follow
            if (Math.random() < 0.5) {
                mouseTrail.push({
                    x: mouseX + (Math.random() - 0.5) * 25,
                    y: mouseY + (Math.random() - 0.5) * 25,
                    size: 2 + Math.random() * 5,
                    color: color,
                    life: 1,
                    decay: 0.025 + Math.random() * 0.02,
                    vx: (Math.random() - 0.5) * 8,
                    vy: (Math.random() - 0.5) * 8,
                    type: 'trailPixel',
                    flash: Math.random() * Math.PI * 2,
                    flashSpeed: 0.3 + Math.random() * 0.4
                });
            }
        }
        
        // Limit trail length
        if (mouseTrail.length > 250) {
            mouseTrail.splice(0, mouseTrail.length - 250);
        }
    }
}

function updateMouseTrail(dt) {
    for (var i = mouseTrail.length - 1; i >= 0; i--) {
        var p = mouseTrail[i];
        
        // Store trail history for main pixels
        if (p.type === 'pixel' && p.trailHistory) {
            p.trailHistory.unshift({ x: p.x, y: p.y, size: p.size });
            if (p.trailHistory.length > 8) {
                p.trailHistory.pop();
            }
        }
        
        p.x += p.vx * (dt / 16);
        p.y += p.vy * (dt / 16);
        p.life -= p.decay;
        p.size *= 0.98;
        
        // Update flash animation
        if (p.flash !== undefined) {
            p.flash += p.flashSpeed;
        }
        
        // Add slight downward drift for trail pixels
        if (p.type === 'trailPixel') {
            p.vy += 0.05;
            p.vx *= 0.98;
        }
        
        if (p.life <= 0) {
            mouseTrail.splice(i, 1);
        }
    }
}

function drawMouseTrail() {
    for (var i = 0; i < mouseTrail.length; i++) {
        var p = mouseTrail[i];
        var flashMult = p.flash !== undefined ? (0.6 + Math.sin(p.flash) * 0.4) : 1;
        var alpha = p.life * 0.95 * flashMult;
        
        if (p.type === 'pixel') {
            // Draw trail history first (flashy trail behind the pixel)
            if (p.trailHistory && p.trailHistory.length > 0) {
                for (var t = p.trailHistory.length - 1; t >= 0; t--) {
                    var trail = p.trailHistory[t];
                    var trailAlpha = alpha * (1 - t / p.trailHistory.length) * 0.6;
                    var trailSize = trail.size * (1 - t / p.trailHistory.length) * 0.8;
                    
                    ctx.globalAlpha = trailAlpha * flashMult;
                    ctx.shadowColor = p.color;
                    ctx.shadowBlur = 15 + Math.sin(p.flash + t) * 8;
                    ctx.fillStyle = p.color;
                    ctx.fillRect(trail.x - trailSize/2, trail.y - trailSize/2, trailSize, trailSize);
                }
            }
            
            // Main neon square pixel
            ctx.globalAlpha = alpha;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 25 + Math.sin(p.flash) * 15;
            ctx.fillStyle = p.color;
            
            var size = p.size * p.life;
            ctx.fillRect(p.x - size/2, p.y - size/2, size, size);
            
            // Bright white core
            ctx.fillStyle = '#ffffff';
            ctx.globalAlpha = alpha * 0.9;
            var coreSize = size * 0.5;
            ctx.fillRect(p.x - coreSize/2, p.y - coreSize/2, coreSize, coreSize);
            
            // Outer glow border
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 2;
            ctx.globalAlpha = alpha * 0.7 * flashMult;
            ctx.strokeRect(p.x - size/2 - 2, p.y - size/2 - 2, size + 4, size + 4);
            
        } else if (p.type === 'trailPixel') {
            // Smaller trailing square pixels
            ctx.globalAlpha = alpha * 0.8;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 12 + Math.sin(p.flash * 2) * 6;
            ctx.fillStyle = p.color;
            
            var size = p.size * p.life;
            ctx.fillRect(p.x - size/2, p.y - size/2, size, size);
            
            // Small bright core
            ctx.fillStyle = '#ffffff';
            ctx.globalAlpha = alpha * 0.7;
            var coreSize = size * 0.4;
            ctx.fillRect(p.x - coreSize/2, p.y - coreSize/2, coreSize, coreSize);
        }
    }
    
    // Draw flashy connecting lines between nearby pixels
    for (var i = 0; i < mouseTrail.length; i++) {
        var p1 = mouseTrail[i];
        if (p1.type !== 'pixel') continue;
        
        for (var j = i + 1; j < Math.min(i + 8, mouseTrail.length); j++) {
            var p2 = mouseTrail[j];
            if (p2.type !== 'pixel') continue;
            
            var dx = p2.x - p1.x;
            var dy = p2.y - p1.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < 80) {
                var lineAlpha = (1 - dist / 80) * p1.life * p2.life * 0.4;
                var flashLine = Math.sin(pulsePhase * 5 + i + j) * 0.3 + 0.7;
                
                ctx.strokeStyle = p1.color;
                ctx.lineWidth = 2;
                ctx.globalAlpha = lineAlpha * flashLine;
                ctx.shadowColor = p1.color;
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
            }
        }
    }
    
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
}

function showMobileControlsHint() {
    var startInfo = document.querySelector('.start-info');
    if (startInfo) {
        startInfo.innerHTML = '<p class="controls-info">Swipe <span class="key">←</span> / <span class="key">→</span> to move</p>' +
                              '<p class="controls-info">Swipe <span class="key">↑</span> to jump (after 1 min)</p>' +
                              '<p class="controls-info mobile-tip">Tap anywhere to start!</p>';
    }
    document.body.classList.add('mobile-device');
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    player.groundY = canvas.height - 100;
    player.y = player.groundY;
    player.x = canvas.width / 2;
    player.targetX = player.x;
    platform.width = canvas.width * 0.7;
    platform.leftEdge = (canvas.width - platform.width) / 2;
    platform.rightEdge = platform.leftEdge + platform.width;
    initBackground();
}

function initBackground() {
    buildings = [];
    var count = Math.ceil(canvas.width / 60) + 5;
    for (var i = 0; i < count; i++) {
        buildings.push({
            x: i * 60 - 30, width: 40 + Math.random() * 30, height: 150 + Math.random() * 300,
            windows: Math.floor(Math.random() * 8) + 3, windowRows: Math.floor(Math.random() * 10) + 5,
            hue: 280 + Math.random() * 40
        });
    }
}

function initBackgroundParticles() {
    backgroundParticles = [];
    for (var i = 0; i < 100; i++) {
        backgroundParticles.push({
            x: Math.random() * canvas.width, y: Math.random() * canvas.height,
            size: Math.random() * 4 + 1, speedX: (Math.random() - 0.5) * 0.8,
            speedY: -Math.random() * 0.8 - 0.3, alpha: Math.random() * 0.6 + 0.3,
            twinkle: Math.random() * Math.PI * 2, hue: Math.random() * 60 + 280
        });
    }
}

function handleKeyDown(e) {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = true;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = true;
    if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        if (gameState === 'menu') startGame();
        else if (gameState === 'playing') keys.jump = true;
        else if (gameState === 'gameover') startGame();
    }
}

function handleKeyUp(e) {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = false;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
    if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') keys.jump = false;
}

var touchStartX = 0, touchStartY = 0, touchStartTime = 0;
var swipeThreshold = 40, swipeTimeThreshold = 400;
var isTouching = false, activeTouchId = null, swipeMovementTimer = null, swipeMovementDuration = 150;

function handleTouchStart(e) {
    e.preventDefault();
    if (isTouching) return;
    var touch = e.touches[0];
    touchStartX = touch.clientX; touchStartY = touch.clientY;
    touchStartTime = Date.now(); isTouching = true; activeTouchId = touch.identifier;
    if (gameState === 'menu') startGame();
    else if (gameState === 'gameover') startGame();
}

function handleTouchMove(e) {
    if (!isTouching || gameState !== 'playing') return;
    e.preventDefault();
    var touch = null;
    for (var i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === activeTouchId) { touch = e.touches[i]; break; }
    }
    if (!touch) return;
    var diffX = touch.clientX - touchStartX, diffY = touch.clientY - touchStartY;
    if (diffY < -swipeThreshold && Math.abs(diffY) > Math.abs(diffX) && !player.isJumping) {
        keys.jump = true;
        touchStartX = touch.clientX; touchStartY = touch.clientY; touchStartTime = Date.now();
    }
    if (Math.abs(diffX) > swipeThreshold && Math.abs(diffX) > Math.abs(diffY)) {
        if (swipeMovementTimer) clearTimeout(swipeMovementTimer);
        keys.left = diffX < 0; keys.right = diffX > 0;
        touchStartX = touch.clientX; touchStartY = touch.clientY; touchStartTime = Date.now();
        swipeMovementTimer = setTimeout(function() { keys.left = false; keys.right = false; }, swipeMovementDuration);
    }
}

function handleTouchEnd(e) {
    e.preventDefault();
    var touchEnded = true;
    for (var i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === activeTouchId) { touchEnded = false; break; }
    }
    if (touchEnded) {
        var timeDiff = Date.now() - touchStartTime;
        if (timeDiff < swipeTimeThreshold && gameState === 'playing') {
            var touch = e.changedTouches[0];
            var diffX = touch.clientX - touchStartX, diffY = touch.clientY - touchStartY;
            if (Math.abs(diffY) > swipeThreshold && diffY < 0 && Math.abs(diffY) > Math.abs(diffX)) {
                if (!player.isJumping) keys.jump = true;
            } else if (Math.abs(diffX) > swipeThreshold && Math.abs(diffX) > Math.abs(diffY)) {
                if (swipeMovementTimer) clearTimeout(swipeMovementTimer);
                keys.left = diffX < 0; keys.right = diffX > 0;
                swipeMovementTimer = setTimeout(function() { keys.left = false; keys.right = false; }, swipeMovementDuration);
            }
        }
        isTouching = false; activeTouchId = null; touchStartX = 0; touchStartY = 0; keys.jump = false;
    }
}

function startGame() {
    gameState = 'playing';
    score = 0; combo = 0; maxCombo = 0; gameTime = 0;
    obstacles = []; warningIndicators = []; particles = []; bulletTrails = [];
    player.x = canvas.width / 2; player.targetX = player.x; player.trail = [];
    player.speed = 7; player.y = player.groundY; player.velocityY = 0;
    player.isJumping = false; player.isFalling = false;
    difficultyMult = 1; globalGlow = 0;
    deathAnimationState = null;
    lastBeamSpawn = 0; lastSweeperSpawn = 0; lastRainSpawn = 0; lastLaserSpawn = 0; lastFlashLaserSpawn = 0;
    startScreen.classList.add('hidden'); gameoverScreen.classList.add('hidden');
    victoryScreen.classList.add('hidden'); gameUI.classList.remove('hidden');
    deathSound.pause(); deathSound.currentTime = 0;
    loserSound.pause(); loserSound.currentTime = 0;
    bgMusic.currentTime = 0;
    bgMusic.play().catch(function(e) { console.log('Audio play failed:', e); });
}

function startDeathAnimation() {
    deathAnimationState = {
        particles: [],
        timer: 0,
        duration: 1500,
        playerX: player.x,
        playerY: player.y
    };
    
    for (var i = 0; i < 80; i++) {
        var angle = (Math.PI * 2 / 80) * i + Math.random() * 0.5;
        var speed = 3 + Math.random() * 12;
        var colors = ['#00ffff', '#ff00ff', '#ffff00', '#ff6b9d', '#00ff88', '#ff4757', '#ffd93d', '#ffffff'];
        deathAnimationState.particles.push({
            x: player.x,
            y: player.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 3 + Math.random() * 8,
            color: colors[Math.floor(Math.random() * colors.length)],
            life: 1,
            decay: 0.008 + Math.random() * 0.015,
            gravity: 0.15 + Math.random() * 0.1,
            flash: Math.random() * Math.PI * 2,
            flashSpeed: 0.1 + Math.random() * 0.2
        });
    }
    
    bgMusic.pause();
    deathSound.currentTime = 0;
    deathSound.play().catch(function(e) { console.log('Death sound failed:', e); });
    
    triggerScreenShake(25);
    flashIntensity = 0.8;
}

function updateDeathAnimation(dt) {
    if (!deathAnimationState) return false;
    
    deathAnimationState.timer += dt;
    
    for (var i = deathAnimationState.particles.length - 1; i >= 0; i--) {
        var p = deathAnimationState.particles[i];
        p.x += p.vx * (dt / 16);
        p.y += p.vy * (dt / 16);
        p.vy += p.gravity;
        p.vx *= 0.98;
        p.life -= p.decay;
        p.flash += p.flashSpeed;
        
        if (p.life <= 0) {
            deathAnimationState.particles.splice(i, 1);
        }
    }
    
    if (deathAnimationState.timer >= deathAnimationState.duration || deathAnimationState.particles.length === 0) {
        deathAnimationState = null;
        return true;
    }
    
    return false;
}

function drawDeathAnimation() {
    if (!deathAnimationState) return;
    
    for (var i = 0; i < deathAnimationState.particles.length; i++) {
        var p = deathAnimationState.particles[i];
        var flashAlpha = 0.5 + Math.sin(p.flash) * 0.5;
        var alpha = p.life * flashAlpha;
        
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 20;
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life * 0.4, 0, Math.PI * 2);
        ctx.fill();
    }
    
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
}

function gameOver() {
    gameState = 'gameover';
    gameUI.classList.add('hidden');
    document.getElementById('final-score').textContent = score;
    document.getElementById('final-combo').textContent = maxCombo;
    document.getElementById('final-progress').textContent = Math.floor((gameTime / gameDuration) * 100) + '%';
    loserSound.currentTime = 0;
    loserSound.play().catch(function(e) { console.log('Loser sound failed:', e); });
}

function victory() {
    gameState = 'victory';
    gameUI.classList.add('hidden');
    victoryScreen.classList.remove('hidden');
    document.getElementById('victory-score').textContent = score;
    document.getElementById('victory-combo').textContent = maxCombo;
    for (var i = 0; i < 100; i++) createParticle(Math.random() * canvas.width, Math.random() * canvas.height, 'celebration');
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
    globalGlow = 0.5 + Math.sin(pulsePhase * 2) * 0.3;
    if (screenShake.intensity > 0) {
        screenShake.x = (Math.random() - 0.5) * screenShake.intensity;
        screenShake.y = (Math.random() - 0.5) * screenShake.intensity;
        screenShake.intensity *= 0.9;
        if (screenShake.intensity < 0.5) screenShake.intensity = 0;
    }
    if (flashIntensity > 0) flashIntensity *= 0.85;
    updateBackgroundParticles(dt);
    updateBulletTrails(dt);
    updateMouseTrail(dt);
    
    if (gameState === 'dying') {
        var animComplete = updateDeathAnimation(dt);
        if (animComplete) {
            gameOver();
        }
    }
    if (gameState === 'playing') {
        gameTime += dt;
        difficultyMult = 1 + (gameTime / 1000) * 0.08;
        player.speed = Math.max(5, 7 - (gameTime / 60000) * 1.5);
        if (gameTime >= gameDuration) { victory(); return; }
        updatePlayer(dt);
        updateObstacles(dt);
        updateWarnings(dt);
        spawnProgressiveObstacles();
        checkCollisions();
        checkPlatformEdges();
        updateUI();
        score += 1;
    }
    updateParticles(dt);
}

function updatePlayer(dt) {
    if (player.isFalling) {
        player.velocityY += player.gravity * 1.5 * (dt / 16);
        player.y += player.velocityY * (dt / 16);
        if (Math.random() < 0.3) createParticle(player.x + (Math.random() - 0.5) * player.width, player.y, 'fall');
        if (player.y > canvas.height + 100) handleCollision();
        return;
    }
    var moveSpeed = player.speed * (dt / 16);
    if (keys.left) player.targetX -= moveSpeed * 8;
    if (keys.right) player.targetX += moveSpeed * 8;
    player.targetX = Math.max(player.width / 2, Math.min(canvas.width - player.width / 2, player.targetX));
    player.x += (player.targetX - player.x) * 0.2;
    var canJump = gameTime >= JUMP_UNLOCK_TIME;
    if (keys.jump && !player.isJumping && canJump) {
        player.isJumping = true;
        player.velocityY = player.jumpPower;
        for (var i = 0; i < 10; i++) createParticle(player.x + (Math.random() - 0.5) * player.width, player.y + player.height/2, 'jump');
        flashIntensity = 0.15;
    }
    if (player.isJumping) {
        player.velocityY += player.gravity * (dt / 16);
        player.y += player.velocityY * (dt / 16);
        if (player.y >= player.groundY) {
            if (player.x >= platform.leftEdge && player.x <= platform.rightEdge) {
                player.y = player.groundY; player.velocityY = 0; player.isJumping = false;
                for (var i = 0; i < 8; i++) createParticle(player.x + (Math.random() - 0.5) * player.width, player.y + player.height/2, 'land');
                triggerScreenShake(3);
            }
        }
    }
    player.trail.unshift({ x: player.x, y: player.y, alpha: 1 });
    if (player.trail.length > 15) player.trail.pop();
}

function checkPlatformEdges() {
    if (player.isFalling) return;
    if (!player.isJumping && player.y >= player.groundY - 5) {
        if (player.x < platform.leftEdge || player.x > platform.rightEdge) {
            player.isFalling = true; player.velocityY = 2;
            for (var i = 0; i < 15; i++) createParticle(player.x, player.y, 'fall');
            triggerScreenShake(10);
        }
    }
}

function updateBulletTrails(dt) {
    for (var i = bulletTrails.length - 1; i >= 0; i--) {
        var trail = bulletTrails[i];
        trail.alpha -= dt * 0.004; trail.size *= 0.97;
        if (trail.alpha <= 0) bulletTrails.splice(i, 1);
    }
}

function updateObstacles(dt) {
    for (var i = obstacles.length - 1; i >= 0; i--) {
        var obs = obstacles[i];
        obs.timer += dt;
        if (obs.type === 'beam' || obs.type === 'laser' || obs.type === 'flashLaser') {
            if (obs.timer < obs.warningTime) {
                obs.alpha = 0.3 + Math.sin(obs.timer * 0.02) * 0.2;
            } else if (obs.timer < obs.warningTime + obs.activeTime) {
                obs.active = true; obs.alpha = 1; obs.width = obs.maxWidth;
                if ((obs.type === 'laser' || obs.type === 'flashLaser') && obs.timer < obs.warningTime + 100) {
                    flashIntensity = obs.type === 'flashLaser' ? 0.5 : 0.3;
                    if (obs.type === 'flashLaser') triggerScreenShake(5);
                }
            } else {
                obs.alpha -= dt * 0.008;
                if (obs.alpha <= 0) obs.dead = true;
            }
        } else if (obs.type === 'sweeper') {
            if (obs.timer < obs.warningTime) { obs.alpha = 0.3; }
            else {
                obs.active = true; obs.alpha = 1;
                obs.x += obs.speed * obs.direction * (dt / 16);
                if ((obs.direction > 0 && obs.x > canvas.width + 100) || (obs.direction < 0 && obs.x < -100)) obs.dead = true;
            }
        } else if (obs.type === 'rain' || obs.type === 'bigRain') {
            obs.y += obs.speed * (dt / 16); obs.active = true;
            if (Math.random() < 0.6) {
                bulletTrails.push({ x: obs.x, y: obs.y - obs.height/2,
                    size: obs.width * (obs.type === 'bigRain' ? 1.2 : 0.8),
                    alpha: 0.7, color: obs.trailColor || obs.glowColor });
            }
            if (obs.y > canvas.height + 50) obs.dead = true;
        } else if (obs.type === 'diagonal') {
            obs.timer += dt;
            if (obs.timer > 200) {
                obs.active = true;
                obs.x += obs.vx * (dt / 16); obs.y += obs.vy * (dt / 16);
                bulletTrails.push({ x: obs.x, y: obs.y, size: obs.width * 0.7, alpha: 0.6, color: obs.glowColor });
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

function spawnProgressiveObstacles() {
    var t = gameTime, dm = difficultyMult;
    var beamInterval = Math.max(400, 1500 - t * 0.008);
    var rainInterval = Math.max(60, 400 - t * 0.003);
    var laserInterval = Math.max(400, 1800 - t * 0.01);
    var flashLaserInterval = Math.max(600, 2500 - t * 0.008);
    
    if (t - lastBeamSpawn > beamInterval) {
        lastBeamSpawn = t;
        var numBeams = Math.min(5, 1 + Math.floor(t / 20000));
        for (var i = 0; i < numBeams; i++) {
            var x = platform.leftEdge + Math.random() * platform.width;
            spawnBeam(x, 60 + Math.random() * 50 + (t / 1500), Math.max(250, 700 - t * 0.004), 350 + Math.random() * 250 + (t / 400));
        }
    }
    
    if (t >= JUMP_UNLOCK_TIME) {
        var sweeperInterval = Math.max(600, 2500 - (t - JUMP_UNLOCK_TIME) * 0.02);
        if (t - lastSweeperSpawn > sweeperInterval) {
            lastSweeperSpawn = t;
            var fromLeft = Math.random() > 0.5;
            var speed = 14 + ((t - JUMP_UNLOCK_TIME) / 2000) * dm;
            spawnSweeper(fromLeft, canvas.height - 60 - Math.random() * 80, speed, 55 + Math.random() * 35);
            if (t > 75000 && Math.random() > 0.4) setTimeout(function() { spawnSweeper(!fromLeft, canvas.height - 80 - Math.random() * 60, speed * 1.1, 55); }, 200);
            if (t > 100000 && Math.random() > 0.5) setTimeout(function() { spawnSweeper(fromLeft, canvas.height - 100, speed * 0.9, 60); }, 400);
        }
    }
    
    if (t - lastRainSpawn > rainInterval) {
        lastRainSpawn = t;
        var rainCount = Math.min(10, 2 + Math.floor(t / 8000));
        for (var i = 0; i < rainCount; i++) {
            var x = platform.leftEdge + Math.random() * platform.width;
            var speed = 9 + (t / 4000) * dm + Math.random() * 5;
            if (Math.random() < 0.3 + (t / 200000)) spawnBigRain(x, speed * 0.8);
            else spawnRain(x, speed);
        }
    }
    
    if (t > 10000 && t - lastLaserSpawn > laserInterval) {
        lastLaserSpawn = t;
        var x = platform.leftEdge + Math.random() * platform.width;
        spawnLaser(x, 40 + (t / 3000), Math.max(350, 900 - t * 0.005), 280);
        if (t > 35000 && Math.random() > 0.35) {
            var x2 = x > canvas.width / 2 ? x - platform.width * 0.3 : x + platform.width * 0.3;
            spawnLaser(Math.max(platform.leftEdge, Math.min(platform.rightEdge, x2)), 40 + (t / 3000), Math.max(350, 900 - t * 0.005) + 100, 280);
        }
        if (t > 70000 && Math.random() > 0.4) spawnLaser(canvas.width * 0.5, (40 + (t / 3000)) * 1.3, Math.max(350, 900 - t * 0.005), 320);
    }
    
    if (t > 20000 && t - lastFlashLaserSpawn > flashLaserInterval) {
        lastFlashLaserSpawn = t;
        spawnFlashLaser(platform.leftEdge + Math.random() * platform.width, 50 + (t / 5000), Math.max(500, 1200 - t * 0.006), 200);
    }
    
    if (t > 20000 && Math.random() < 0.025 * dm) spawnDiagonalRain();
    
    if (t > 90000) {
        if (Math.random() < 0.04) spawnBeam(platform.leftEdge + Math.random() * platform.width, 70, 200, 450);
        if (Math.random() < 0.03) spawnFlashLaser(platform.leftEdge + Math.random() * platform.width, 60, 400, 250);
    }
    if (t > 110000) {
        if (Math.random() < 0.06) spawnBigRain(platform.leftEdge + Math.random() * platform.width, 16 + Math.random() * 8);
        if (Math.random() < 0.03) spawnLaser(platform.leftEdge + Math.random() * platform.width, 55, 280, 320);
    }
}

function spawnBeam(x, width, warningTime, activeTime) {
    obstacles.push({ type: 'beam', x: x, y: 0, width: 10, maxWidth: width || 80, height: canvas.height,
        timer: 0, warningTime: warningTime || 600, activeTime: activeTime || 400,
        alpha: 0.3, active: false, color: '#ffd93d', glowColor: '#ff9a3c' });
    addWarning(x, width || 80, warningTime || 600);
}

function spawnLaser(x, width, warningTime, activeTime) {
    obstacles.push({ type: 'laser', x: x, y: 0, width: 5, maxWidth: width || 40, height: canvas.height,
        timer: 0, warningTime: warningTime || 800, activeTime: activeTime || 250,
        alpha: 0.2, active: false, color: '#ff4757', glowColor: '#ff6b81' });
    addWarning(x, width || 40, warningTime || 800);
}

function spawnFlashLaser(x, width, warningTime, activeTime) {
    obstacles.push({ type: 'flashLaser', x: x, y: 0, width: 5, maxWidth: width || 55, height: canvas.height,
        timer: 0, warningTime: warningTime || 1000, activeTime: activeTime || 200,
        alpha: 0.2, active: false, color: '#00ffff', glowColor: '#00ff88' });
    addWarning(x, width || 55, warningTime || 1000);
}

function spawnSweeper(fromLeft, y, speed, height) {
    obstacles.push({ type: 'sweeper', x: fromLeft ? -100 : canvas.width + 100, y: y || canvas.height - 80,
        width: 150, height: height || 60, direction: fromLeft ? 1 : -1,
        speed: speed || 15, timer: 0, warningTime: 300,
        alpha: 0.3, active: false, color: '#ff6b9d', glowColor: '#c44569' });
}

function spawnRain(x, speed) {
    obstacles.push({ type: 'rain', x: x, y: -50, width: 28, height: 50,
        speed: speed || 10, timer: 0, alpha: 1, active: true,
        color: '#ffd93d', glowColor: '#ff9a3c', trailColor: '#ffaa00' });
}

function spawnBigRain(x, speed) {
    obstacles.push({ type: 'bigRain', x: x, y: -80, width: 45, height: 75,
        speed: speed || 8, timer: 0, alpha: 1, active: true,
        color: '#ff6b9d', glowColor: '#ff00aa', trailColor: '#ff44cc' });
}

function spawnDiagonalRain() {
    var fromLeft = Math.random() > 0.5;
    obstacles.push({ type: 'diagonal', x: fromLeft ? platform.leftEdge - 20 : platform.rightEdge + 20, y: -30,
        width: 35, height: 60, vx: fromLeft ? 7 + Math.random() * 5 : -7 - Math.random() * 5,
        vy: 9 + Math.random() * 5, timer: 0, alpha: 1, active: false,
        color: '#ff9a3c', glowColor: '#ffd93d', trailColor: '#ffcc00' });
}

function checkCollisions() {
    if (player.invincible || player.isFalling) return;
    var pl = player.x - player.width/2, pr = player.x + player.width/2;
    var pt = player.y - player.height/2, pb = player.y + player.height/2;
    for (var i = 0; i < obstacles.length; i++) {
        var obs = obstacles[i];
        if (!obs.active) continue;
        var collision = false;
        if (obs.type === 'beam' || obs.type === 'laser' || obs.type === 'flashLaser') {
            collision = pl < obs.x + obs.width/2 && pr > obs.x - obs.width/2 && pt < canvas.height && pb > 0;
        } else if (obs.type === 'sweeper') {
            collision = pl < obs.x + obs.width/2 && pr > obs.x - obs.width/2 && pt < obs.y + obs.height/2 && pb > obs.y - obs.height/2;
        } else if (obs.type === 'rain' || obs.type === 'bigRain' || obs.type === 'diagonal') {
            collision = pl < obs.x + obs.width/2 && pr > obs.x - obs.width/2 && pt < obs.y + obs.height/2 && pb > obs.y - obs.height/2;
        }
        if (collision) { handleCollision(); return; }
    }
    combo++;
    if (combo > maxCombo) maxCombo = combo;
}

function handleCollision() {
    combo = 0;
    gameState = 'dying';
    startDeathAnimation();
}

function createParticle(x, y, type) {
    var p = { x: x, y: y, life: 1, decay: 0.02, vx: 0, vy: 0, size: 5, color: '#ff6b9d', gravity: 0 };
    if (type === 'death') {
        p.vx = (Math.random()-0.5)*18; p.vy = (Math.random()-0.5)*18;
        p.size = Math.random()*12+6; p.decay = 0.025;
        p.color = Math.random() > 0.5 ? '#ff6b9d' : '#00ffff';
    } else if (type === 'celebration') {
        p.vx = (Math.random()-0.5)*12; p.vy = -Math.random()*12-6;
        p.size = Math.random()*10+5;
        p.color = ['#ffd93d','#ff6b9d','#00ffff','#ff00aa'][Math.floor(Math.random()*4)];
        p.decay = 0.008; p.gravity = 0.2;
    } else if (type === 'jump') {
        p.vx = (Math.random()-0.5)*6; p.vy = Math.random()*4+3;
        p.size = Math.random()*8+4; p.color = '#00ffff'; p.decay = 0.04;
    } else if (type === 'land') {
        p.vx = (Math.random()-0.5)*8; p.vy = -Math.random()*3;
        p.size = Math.random()*6+3; p.color = '#00ffff'; p.decay = 0.05; p.gravity = 0.1;
    } else if (type === 'fall') {
        p.vx = (Math.random()-0.5)*10; p.vy = (Math.random()-0.5)*5;
        p.size = Math.random()*8+4; p.color = '#ff4757'; p.decay = 0.03; p.gravity = 0.3;
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
    if (gameState === 'gameover') {
        loserShake.x = (Math.random() - 0.5) * loserShake.intensity;
        loserShake.y = (Math.random() - 0.5) * loserShake.intensity;
        ctx.save(); ctx.translate(loserShake.x, loserShake.y);
        drawGameOverScreen();
        ctx.restore();
        return;
    }
    if (gameState === 'menu') {
        drawMenuScreen();
        return;
    }
    ctx.save(); ctx.translate(screenShake.x, screenShake.y);
    ctx.fillStyle = '#1a0a1a'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawBackground(); drawBackgroundParticles(); drawBulletTrails();
    drawWarnings(); drawObstacles();
    if (gameState === 'playing') drawPlayer();
    if (gameState === 'dying') drawDeathAnimation();
    drawParticles();
    if (flashIntensity > 0.01) {
        ctx.fillStyle = 'rgba(255,255,255,'+flashIntensity+')';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    drawVignette();
    ctx.restore();
}

function drawMenuScreen() {
    // Animated background
    var gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    var hue1 = 280 + Math.sin(pulsePhase * 0.5) * 20;
    var hue2 = 320 + Math.sin(pulsePhase * 0.7) * 20;
    gradient.addColorStop(0, 'hsl('+hue1+',60%,8%)');
    gradient.addColorStop(0.5, 'hsl('+hue2+',70%,12%)');
    gradient.addColorStop(1, 'hsl('+hue1+',50%,5%)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw animated buildings in background
    for (var i = 0; i < buildings.length; i++) drawBuilding(buildings[i]);
    
    // Floating particles
    drawBackgroundParticles();
    
    // ENHANCED: Multiple animated laser beams with different colors and patterns
    var laserColors = [
        { color: 'rgba(255, 107, 157, ', glow: '#ff6b9d' },  // Pink
        { color: 'rgba(0, 255, 255, ', glow: '#00ffff' },    // Cyan
        { color: 'rgba(255, 217, 61, ', glow: '#ffd93d' },   // Yellow
        { color: 'rgba(255, 0, 170, ', glow: '#ff00aa' },    // Magenta
        { color: 'rgba(0, 255, 136, ', glow: '#00ff88' },    // Green
        { color: 'rgba(255, 71, 87, ', glow: '#ff4757' },    // Red
        { color: 'rgba(124, 77, 255, ', glow: '#7c4dff' }    // Purple
    ];
    
    // Vertical laser beams - more of them with varied timing
    for (var i = 0; i < 12; i++) {
        var beamX = (canvas.width / 13) * (i + 1);
        var colorIndex = i % laserColors.length;
        var beamAlpha = 0.08 + Math.sin(pulsePhase * 3 + i * 0.8) * 0.06;
        var beamWidth = 15 + Math.sin(pulsePhase * 4 + i * 0.6) * 12;
        var flashIntensity = Math.sin(pulsePhase * 6 + i * 1.2);
        
        // Outer glow
        ctx.shadowColor = laserColors[colorIndex].glow;
        ctx.shadowBlur = 30 + flashIntensity * 15;
        ctx.fillStyle = laserColors[colorIndex].color + beamAlpha + ')';
        ctx.fillRect(beamX - beamWidth/2, 0, beamWidth, canvas.height);
        
        // Bright core when flashing
        if (flashIntensity > 0.7) {
            ctx.fillStyle = laserColors[colorIndex].color + (beamAlpha * 2) + ')';
            ctx.fillRect(beamX - beamWidth/4, 0, beamWidth/2, canvas.height);
        }
    }
    ctx.shadowBlur = 0;
    
    // Horizontal sweeping laser beams
    for (var i = 0; i < 6; i++) {
        var sweepY = canvas.height * 0.15 + (canvas.height * 0.7 / 6) * i;
        var sweepOffset = Math.sin(pulsePhase * 2 + i * 1.5) * canvas.width * 0.3;
        var sweepWidth = canvas.width * 0.4 + Math.sin(pulsePhase * 3 + i) * 100;
        var sweepX = canvas.width / 2 + sweepOffset - sweepWidth / 2;
        var colorIndex = (i + 3) % laserColors.length;
        var sweepAlpha = 0.06 + Math.sin(pulsePhase * 4 + i * 2) * 0.04;
        var sweepHeight = 8 + Math.sin(pulsePhase * 5 + i) * 5;
        
        ctx.shadowColor = laserColors[colorIndex].glow;
        ctx.shadowBlur = 25;
        ctx.fillStyle = laserColors[colorIndex].color + sweepAlpha + ')';
        ctx.fillRect(sweepX, sweepY - sweepHeight/2, sweepWidth, sweepHeight);
        
        // Core line
        ctx.fillStyle = 'rgba(255, 255, 255, ' + (sweepAlpha * 0.8) + ')';
        ctx.fillRect(sweepX, sweepY - 1, sweepWidth, 2);
    }
    ctx.shadowBlur = 0;
    
    // Diagonal crossing laser beams
    for (var i = 0; i < 8; i++) {
        var diagPhase = pulsePhase * 1.5 + i * 0.9;
        var startX = (Math.sin(diagPhase) * 0.5 + 0.5) * canvas.width;
        var colorIndex = (i + 1) % laserColors.length;
        var diagAlpha = 0.05 + Math.sin(pulsePhase * 5 + i * 1.3) * 0.04;
        
        ctx.save();
        ctx.translate(startX, 0);
        ctx.rotate(Math.PI / 4 + Math.sin(diagPhase * 0.5) * 0.2);
        
        ctx.shadowColor = laserColors[colorIndex].glow;
        ctx.shadowBlur = 20;
        ctx.fillStyle = laserColors[colorIndex].color + diagAlpha + ')';
        ctx.fillRect(-8, -canvas.height, 16, canvas.height * 3);
        
        ctx.restore();
    }
    ctx.shadowBlur = 0;
    
    // Pulsing energy waves from center
    for (var i = 0; i < 5; i++) {
        var waveRadius = ((pulsePhase * 100 + i * 150) % 600);
        var waveAlpha = Math.max(0, 0.3 - waveRadius / 600);
        var colorIndex = i % laserColors.length;
        
        ctx.strokeStyle = laserColors[colorIndex].color + waveAlpha + ')';
        ctx.lineWidth = 3 + Math.sin(pulsePhase * 3 + i) * 2;
        ctx.shadowColor = laserColors[colorIndex].glow;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2, waveRadius, 0, Math.PI * 2);
        ctx.stroke();
    }
    ctx.shadowBlur = 0;
    
    // Glowing orbs floating around - more of them
    for (var i = 0; i < 15; i++) {
        var orbX = canvas.width * 0.05 + (canvas.width * 0.9) * (i / 15) + Math.sin(pulsePhase * 1.2 + i * 2) * 60;
        var orbY = canvas.height * 0.2 + Math.sin(pulsePhase * 1.8 + i * 1.3) * (canvas.height * 0.3);
        var orbSize = 10 + Math.sin(pulsePhase * 2.5 + i) * 8;
        var colorIndex = i % laserColors.length;
        
        ctx.shadowColor = laserColors[colorIndex].glow;
        ctx.shadowBlur = 35 + Math.sin(pulsePhase * 4 + i) * 15;
        ctx.fillStyle = laserColors[colorIndex].glow;
        ctx.globalAlpha = 0.5 + Math.sin(pulsePhase * 3.5 + i) * 0.35;
        ctx.beginPath();
        ctx.arc(orbX, orbY, orbSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner bright core
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.7 + Math.sin(pulsePhase * 5 + i) * 0.3;
        ctx.beginPath();
        ctx.arc(orbX, orbY, orbSize * 0.4, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.globalAlpha = 1;
    }
    ctx.shadowBlur = 0;
    
    // Pulsing rings - more dramatic
    for (var i = 0; i < 5; i++) {
        var ringRadius = 80 + i * 60 + Math.sin(pulsePhase * 2.5 + i * 0.5) * 25;
        var ringAlpha = 0.2 - i * 0.03;
        var colorIndex = i % laserColors.length;
        
        ctx.strokeStyle = laserColors[colorIndex].color + ringAlpha + ')';
        ctx.lineWidth = 4 - i * 0.5;
        ctx.shadowColor = laserColors[colorIndex].glow;
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2 - 30, ringRadius, 0, Math.PI * 2);
        ctx.stroke();
    }
    ctx.shadowBlur = 0;
    
    // Electric arc effects
    for (var i = 0; i < 6; i++) {
        if (Math.sin(pulsePhase * 8 + i * 2.5) > 0.6) {
            var arcStartX = Math.random() * canvas.width;
            var arcStartY = Math.random() * canvas.height * 0.3;
            var arcEndX = arcStartX + (Math.random() - 0.5) * 200;
            var arcEndY = arcStartY + Math.random() * 150;
            var colorIndex = Math.floor(Math.random() * laserColors.length);
            
            ctx.strokeStyle = laserColors[colorIndex].glow;
            ctx.lineWidth = 2;
            ctx.shadowColor = laserColors[colorIndex].glow;
            ctx.shadowBlur = 15;
            ctx.globalAlpha = 0.6;
            
            ctx.beginPath();
            ctx.moveTo(arcStartX, arcStartY);
            // Jagged lightning path
            var segments = 5;
            for (var j = 1; j <= segments; j++) {
                var t = j / segments;
                var midX = arcStartX + (arcEndX - arcStartX) * t + (Math.random() - 0.5) * 40;
                var midY = arcStartY + (arcEndY - arcStartY) * t + (Math.random() - 0.5) * 30;
                ctx.lineTo(midX, midY);
            }
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
    }
    ctx.shadowBlur = 0;
    
    // Sparkle effects - more intense
    for (var i = 0; i < 40; i++) {
        var sparkleX = Math.sin(pulsePhase * 0.6 + i * 0.5) * canvas.width * 0.45 + canvas.width / 2;
        var sparkleY = Math.cos(pulsePhase * 0.4 + i * 0.7) * canvas.height * 0.4 + canvas.height / 2;
        var sparkleSize = 2 + Math.sin(pulsePhase * 6 + i * 2.5) * 3;
        var sparkleAlpha = 0.4 + Math.sin(pulsePhase * 5 + i * 1.5) * 0.4;
        
        ctx.fillStyle = 'rgba(255, 255, 255, ' + sparkleAlpha + ')';
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(sparkleX, sparkleY, sparkleSize, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.shadowBlur = 0;
    
    // Shooting star / meteor effects
    for (var i = 0; i < 4; i++) {
        var meteorPhase = (pulsePhase * 0.8 + i * 1.5) % 4;
        if (meteorPhase < 1) {
            var meteorX = canvas.width * (0.2 + i * 0.2) + meteorPhase * canvas.width * 0.3;
            var meteorY = meteorPhase * canvas.height * 0.4;
            var colorIndex = i % laserColors.length;
            var meteorAlpha = 1 - meteorPhase;
            
            ctx.save();
            ctx.translate(meteorX, meteorY);
            ctx.rotate(Math.PI / 4);
            
            // Trail
            var trailGrad = ctx.createLinearGradient(-80, 0, 20, 0);
            trailGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
            trailGrad.addColorStop(0.7, laserColors[colorIndex].color + (meteorAlpha * 0.5) + ')');
            trailGrad.addColorStop(1, laserColors[colorIndex].color + meteorAlpha + ')');
            
            ctx.fillStyle = trailGrad;
            ctx.shadowColor = laserColors[colorIndex].glow;
            ctx.shadowBlur = 20;
            ctx.fillRect(-80, -4, 100, 8);
            
            // Head
            ctx.fillStyle = '#ffffff';
            ctx.globalAlpha = meteorAlpha;
            ctx.beginPath();
            ctx.arc(15, 0, 6, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.restore();
            ctx.globalAlpha = 1;
        }
    }
    ctx.shadowBlur = 0;
    
    // Hexagonal grid pattern overlay
    ctx.strokeStyle = 'rgba(255, 107, 157, 0.03)';
    ctx.lineWidth = 1;
    var hexSize = 60;
    for (var row = -1; row < canvas.height / hexSize + 1; row++) {
        for (var col = -1; col < canvas.width / hexSize + 1; col++) {
            var hx = col * hexSize * 1.5;
            var hy = row * hexSize * 1.732 + (col % 2) * hexSize * 0.866;
            drawHexagon(hx, hy, hexSize * 0.5);
        }
    }
    
    // Draw mouse trail
    drawMouseTrail();
    
    // Flash overlay effect
    var flashAlpha = Math.max(0, Math.sin(pulsePhase * 8) * 0.03);
    if (flashAlpha > 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, ' + flashAlpha + ')';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    drawVignette();
}

function drawHexagon(x, y, size) {
    ctx.beginPath();
    for (var i = 0; i < 6; i++) {
        var angle = (Math.PI / 3) * i - Math.PI / 6;
        var hx = x + size * Math.cos(angle);
        var hy = y + size * Math.sin(angle);
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
    }
    ctx.closePath();
    ctx.stroke();
}

function drawGameOverScreen() {
    // Animated dark background with red tint
    var gradient = ctx.createRadialGradient(canvas.width/2, canvas.height/2, 0, canvas.width/2, canvas.height/2, canvas.height);
    var pulseRed = 0.15 + Math.sin(pulsePhase * 3) * 0.05;
    gradient.addColorStop(0, 'rgba(80, 20, 30, 1)');
    gradient.addColorStop(0.5, 'rgba(40, 10, 20, 1)');
    gradient.addColorStop(1, 'rgba(15, 5, 10, 1)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Red pulsing overlay
    ctx.fillStyle = 'rgba(255, 0, 0, ' + (0.05 + Math.sin(pulsePhase * 4) * 0.03) + ')';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Falling debris particles
    for (var i = 0; i < 30; i++) {
        var debrisX = (pulsePhase * 50 + i * 137) % canvas.width;
        var debrisY = (pulsePhase * 80 + i * 89) % canvas.height;
        var debrisSize = 3 + (i % 5);
        var debrisAlpha = 0.3 + Math.sin(pulsePhase + i) * 0.2;
        var colors = ['#ff4757', '#ff6b9d', '#ff0000', '#ff3366'];
        
        ctx.fillStyle = colors[i % colors.length];
        ctx.globalAlpha = debrisAlpha;
        ctx.fillRect(debrisX, debrisY, debrisSize, debrisSize * 2);
    }
    ctx.globalAlpha = 1;
    
    // Glitchy horizontal lines
    for (var i = 0; i < 10; i++) {
        if (Math.sin(pulsePhase * 10 + i * 3) > 0.7) {
            var lineY = Math.random() * canvas.height;
            var lineHeight = 2 + Math.random() * 4;
            ctx.fillStyle = 'rgba(255, 71, 87, 0.3)';
            ctx.fillRect(0, lineY, canvas.width, lineHeight);
        }
    }
    
    // Broken/shattered effect lines radiating from center
    ctx.strokeStyle = 'rgba(255, 71, 87, 0.2)';
    ctx.lineWidth = 1;
    for (var i = 0; i < 12; i++) {
        var angle = (Math.PI * 2 / 12) * i + pulsePhase * 0.1;
        var length = 200 + Math.sin(pulsePhase * 2 + i) * 50;
        ctx.beginPath();
        ctx.moveTo(canvas.width/2, canvas.height/2 - 50);
        ctx.lineTo(canvas.width/2 + Math.cos(angle) * length, canvas.height/2 - 50 + Math.sin(angle) * length);
        ctx.stroke();
    }
    
    // Floating skull/danger symbols
    for (var i = 0; i < 6; i++) {
        var symbolX = canvas.width * 0.15 + (canvas.width * 0.7) * (i / 5);
        var symbolY = canvas.height * 0.15 + Math.sin(pulsePhase * 2 + i * 1.5) * 30;
        var symbolAlpha = 0.3 + Math.sin(pulsePhase * 3 + i) * 0.2;
        
        ctx.font = 'bold 30px Orbitron, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255, 71, 87, ' + symbolAlpha + ')';
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 15;
        ctx.fillText('✕', symbolX, symbolY);
    }
    ctx.shadowBlur = 0;
    
    // Draw the loser image with enhanced effects
    if (loserImageLoaded) {
        var maxSize = Math.min(canvas.width, canvas.height) * 0.35;
        var imgRatio = loserImage.width / loserImage.height;
        var drawWidth = imgRatio > 1 ? maxSize : maxSize * imgRatio;
        var drawHeight = imgRatio > 1 ? maxSize / imgRatio : maxSize;
        var drawX = (canvas.width - drawWidth) / 2;
        var drawY = (canvas.height - drawHeight) / 2 - 80;
        
        // Glowing border effect
        ctx.shadowColor = '#ff4757';
        ctx.shadowBlur = 40 + Math.sin(pulsePhase * 4) * 15;
        ctx.strokeStyle = '#ff4757';
        ctx.lineWidth = 4;
        ctx.strokeRect(drawX - 5, drawY - 5, drawWidth + 10, drawHeight + 10);
        
        ctx.drawImage(loserImage, drawX, drawY, drawWidth, drawHeight);
        ctx.shadowBlur = 0;
    }
    
    // "GAME OVER" text with glitch effect
    ctx.font = 'bold 48px Orbitron, sans-serif';
    ctx.textAlign = 'center';
    var glitchOffset = Math.sin(pulsePhase * 20) > 0.9 ? (Math.random() - 0.5) * 10 : 0;
    
    // Red shadow
    ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
    ctx.fillText('GAME OVER', canvas.width/2 + 3 + glitchOffset, canvas.height/2 + 60);
    
    // Cyan shadow
    ctx.fillStyle = 'rgba(0, 255, 255, 0.5)';
    ctx.fillText('GAME OVER', canvas.width/2 - 3 - glitchOffset, canvas.height/2 + 60);
    
    // Main text
    ctx.shadowColor = '#ff4757';
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#ff4757';
    ctx.fillText('GAME OVER', canvas.width/2, canvas.height/2 + 60);
    ctx.shadowBlur = 0;
    
    // Flashing warning triangles
    var warningAlpha = 0.5 + Math.sin(pulsePhase * 6) * 0.3;
    ctx.fillStyle = 'rgba(255, 200, 0, ' + warningAlpha + ')';
    ctx.font = 'bold 40px sans-serif';
    ctx.fillText('⚠', canvas.width * 0.15, canvas.height/2 + 60);
    ctx.fillText('⚠', canvas.width * 0.85, canvas.height/2 + 60);
    
    drawLoserRetryButton();
    
    // Draw mouse trail on game over screen too
    drawMouseTrail();
    
    // Vignette
    var vignetteGrad = ctx.createRadialGradient(canvas.width/2, canvas.height/2, canvas.height*0.2, canvas.width/2, canvas.height/2, canvas.height);
    vignetteGrad.addColorStop(0, 'rgba(0,0,0,0)');
    vignetteGrad.addColorStop(1, 'rgba(0,0,0,0.7)');
    ctx.fillStyle = vignetteGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawLoserRetryButton() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, canvas.height - 150, canvas.width, 150);
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 24px Orbitron, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('Score: ' + score + '  |  Best Combo: ' + maxCombo + '  |  Progress: ' + Math.floor((gameTime / gameDuration) * 100) + '%', canvas.width/2, canvas.height - 100);
    ctx.fillStyle = '#ff6b9d'; ctx.font = 'bold 32px Orbitron, sans-serif';
    ctx.fillText(isMobile ? 'Tap anywhere to retry' : 'Click or press SPACE to retry', canvas.width/2, canvas.height - 50);
}

function drawBackground() {
    var gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    var hue1 = 280 + Math.sin(pulsePhase) * 15, hue2 = 320 + Math.sin(pulsePhase + 1) * 15;
    gradient.addColorStop(0, 'hsl('+hue1+',50%,5%)');
    gradient.addColorStop(0.3, 'hsl('+hue2+',60%,10%)');
    gradient.addColorStop(0.6, 'hsl('+hue1+',55%,12%)');
    gradient.addColorStop(1, 'hsl('+hue1+',70%,4%)');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    for (var layer = 0; layer < 3; layer++) {
        var fogAlpha = 0.03 + layer * 0.02;
        var fogY = canvas.height * (0.3 + layer * 0.2);
        var fogGrad = ctx.createLinearGradient(0, fogY - 100, 0, fogY + 100);
        fogGrad.addColorStop(0, 'rgba(100, 50, 150, 0)');
        fogGrad.addColorStop(0.5, 'rgba(100, 50, 150, ' + fogAlpha + ')');
        fogGrad.addColorStop(1, 'rgba(100, 50, 150, 0)');
        ctx.fillStyle = fogGrad;
        ctx.fillRect(0, fogY - 100, canvas.width, 200);
    }
    
    if (beatPulse > 0.1) { ctx.fillStyle = 'rgba(255,107,157,'+(beatPulse*0.15)+')'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    for (var i = 0; i < buildings.length; i++) drawBuilding(buildings[i]);
    
    var abyssGrad = ctx.createLinearGradient(0, canvas.height-120, 0, canvas.height);
    abyssGrad.addColorStop(0, 'rgba(0,0,0,0)');
    abyssGrad.addColorStop(0.3, 'rgba(10,0,20,0.5)');
    abyssGrad.addColorStop(0.7, 'rgba(15,0,25,0.8)');
    abyssGrad.addColorStop(1, 'rgba(5,0,10,1)');
    ctx.fillStyle = abyssGrad;
    ctx.fillRect(0, canvas.height-120, platform.leftEdge, 120);
    ctx.fillRect(platform.rightEdge, canvas.height-120, canvas.width - platform.rightEdge, 120);
    
    ctx.shadowColor = '#4a0080'; ctx.shadowBlur = 30;
    ctx.strokeStyle = 'rgba(100, 0, 150, 0.5)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(platform.leftEdge, canvas.height - 120); ctx.lineTo(platform.leftEdge, canvas.height); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(platform.rightEdge, canvas.height - 120); ctx.lineTo(platform.rightEdge, canvas.height); ctx.stroke();
    ctx.shadowBlur = 0;
    
    draw3DPlatform();
}

function draw3DPlatform() {
    var platformTop = canvas.height - 80;
    var platformDepth = 25;
    
    var sideGradLeft = ctx.createLinearGradient(platform.leftEdge, platformTop, platform.leftEdge, canvas.height);
    sideGradLeft.addColorStop(0, '#2a1a4e'); sideGradLeft.addColorStop(0.5, '#1a0a2e'); sideGradLeft.addColorStop(1, '#0a0015');
    ctx.fillStyle = sideGradLeft;
    ctx.beginPath();
    ctx.moveTo(platform.leftEdge, platformTop);
    ctx.lineTo(platform.leftEdge - platformDepth, platformTop + platformDepth);
    ctx.lineTo(platform.leftEdge - platformDepth, canvas.height);
    ctx.lineTo(platform.leftEdge, canvas.height);
    ctx.closePath(); ctx.fill();
    
    var sideGradRight = ctx.createLinearGradient(platform.rightEdge, platformTop, platform.rightEdge + platformDepth, canvas.height);
    sideGradRight.addColorStop(0, '#2a1a4e'); sideGradRight.addColorStop(0.5, '#1a0a2e'); sideGradRight.addColorStop(1, '#0a0015');
    ctx.fillStyle = sideGradRight;
    ctx.beginPath();
    ctx.moveTo(platform.rightEdge, platformTop);
    ctx.lineTo(platform.rightEdge + platformDepth, platformTop + platformDepth);
    ctx.lineTo(platform.rightEdge + platformDepth, canvas.height);
    ctx.lineTo(platform.rightEdge, canvas.height);
    ctx.closePath(); ctx.fill();
    
    var frontGrad = ctx.createLinearGradient(0, canvas.height - platformDepth, 0, canvas.height);
    frontGrad.addColorStop(0, '#3d2f5d'); frontGrad.addColorStop(0.5, '#2a1a4e'); frontGrad.addColorStop(1, '#1a0a2e');
    ctx.fillStyle = frontGrad;
    ctx.beginPath();
    ctx.moveTo(platform.leftEdge - platformDepth, platformTop + platformDepth);
    ctx.lineTo(platform.rightEdge + platformDepth, platformTop + platformDepth);
    ctx.lineTo(platform.rightEdge + platformDepth, canvas.height);
    ctx.lineTo(platform.leftEdge - platformDepth, canvas.height);
    ctx.closePath(); ctx.fill();
    
    var groundGrad = ctx.createLinearGradient(0, platformTop - 10, 0, platformTop + 30);
    groundGrad.addColorStop(0, '#5d4f8d'); groundGrad.addColorStop(0.3, '#4d3f7d');
    groundGrad.addColorStop(0.7, '#3d2f5d'); groundGrad.addColorStop(1, '#2a1a4e');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(platform.leftEdge, platformTop, platform.width, 80);
    
    ctx.strokeStyle = 'rgba(255, 107, 157, 0.15)'; ctx.lineWidth = 1;
    var gridSpacing = 40;
    for (var gx = platform.leftEdge; gx <= platform.rightEdge; gx += gridSpacing) {
        ctx.beginPath(); ctx.moveTo(gx, platformTop); ctx.lineTo(gx, canvas.height); ctx.stroke();
    }
    for (var gy = platformTop; gy <= canvas.height; gy += gridSpacing) {
        ctx.beginPath(); ctx.moveTo(platform.leftEdge, gy); ctx.lineTo(platform.rightEdge, gy); ctx.stroke();
    }
    
    var highlightGrad = ctx.createLinearGradient(platform.leftEdge, platformTop - 5, platform.rightEdge, platformTop - 5);
    highlightGrad.addColorStop(0, 'rgba(255, 107, 157, 0.3)');
    highlightGrad.addColorStop(0.5, 'rgba(255, 200, 255, 0.8)');
    highlightGrad.addColorStop(1, 'rgba(255, 107, 157, 0.3)');
    ctx.fillStyle = highlightGrad;
    ctx.fillRect(platform.leftEdge, platformTop - 3, platform.width, 6);
    
    ctx.shadowColor = '#ff00aa'; ctx.shadowBlur = 25 + Math.sin(pulsePhase * 3) * 10;
    ctx.strokeStyle = '#ff6b9d'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(platform.leftEdge, platformTop); ctx.lineTo(platform.rightEdge, platformTop); ctx.stroke();
    
    ctx.strokeStyle = '#ff4757'; ctx.lineWidth = 3; ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 20;
    ctx.beginPath(); ctx.moveTo(platform.leftEdge, platformTop); ctx.lineTo(platform.leftEdge, canvas.height); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(platform.rightEdge, platformTop); ctx.lineTo(platform.rightEdge, canvas.height); ctx.stroke();
    ctx.shadowBlur = 0;
    
    var dangerAlpha = 0.3 + Math.sin(pulsePhase * 4) * 0.2;
    var dangerGrad = ctx.createLinearGradient(platform.leftEdge - 30, 0, platform.leftEdge, 0);
    dangerGrad.addColorStop(0, 'rgba(255, 0, 0, ' + (dangerAlpha * 0.5) + ')');
    dangerGrad.addColorStop(1, 'rgba(255, 0, 0, ' + dangerAlpha + ')');
    ctx.fillStyle = dangerGrad;
    ctx.fillRect(platform.leftEdge - 30, platformTop, 30, 80);
    
    var dangerGrad2 = ctx.createLinearGradient(platform.rightEdge, 0, platform.rightEdge + 30, 0);
    dangerGrad2.addColorStop(0, 'rgba(255, 0, 0, ' + dangerAlpha + ')');
    dangerGrad2.addColorStop(1, 'rgba(255, 0, 0, ' + (dangerAlpha * 0.5) + ')');
    ctx.fillStyle = dangerGrad2;
    ctx.fillRect(platform.rightEdge, platformTop, 30, 80);
}

function drawBuilding(b) {
    var baseY = canvas.height - 80;
    var grad = ctx.createLinearGradient(b.x, baseY-b.height, b.x, baseY);
    grad.addColorStop(0, 'hsla('+b.hue+',60%,25%,0.9)'); grad.addColorStop(1, 'hsla('+b.hue+',70%,12%,0.95)');
    ctx.fillStyle = grad; ctx.fillRect(b.x, baseY-b.height, b.width, b.height);
    var ww = (b.width-10)/b.windows, wh = (b.height-20)/b.windowRows;
    for (var row = 0; row < b.windowRows; row++) {
        for (var col = 0; col < b.windows; col++) {
            var wx = b.x + 5 + col*ww + 2, wy = baseY - b.height + 10 + row*wh + 2;
            var lit = Math.sin(pulsePhase + row + col + b.x*0.01) > 0.2;
            ctx.fillStyle = lit ? 'hsla(45,100%,75%,'+(0.4+Math.sin(pulsePhase*2+row+col)*0.3)+')' : 'rgba(0,0,0,0.5)';
            if (lit) { ctx.shadowColor = '#ffd93d'; ctx.shadowBlur = 8; }
            ctx.fillRect(wx, wy, ww-4, wh-4); ctx.shadowBlur = 0;
        }
    }
}

function drawBackgroundParticles() {
    for (var i = 0; i < backgroundParticles.length; i++) {
        var p = backgroundParticles[i];
        var alpha = p.alpha*(0.5+Math.sin(p.twinkle)*0.5);
        ctx.fillStyle = 'hsla('+p.hue+',80%,70%,'+alpha+')';
        ctx.shadowColor = 'hsl('+p.hue+',100%,60%)'; ctx.shadowBlur = 5;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
    }
    ctx.shadowBlur = 0;
}

function drawBulletTrails() {
    for (var i = 0; i < bulletTrails.length; i++) {
        var trail = bulletTrails[i];
        var flashMult = 0.7 + Math.sin(pulsePhase * 8 + i * 0.5) * 0.3;
        ctx.globalAlpha = trail.alpha * flashMult;
        ctx.fillStyle = trail.color;
        ctx.shadowColor = trail.color;
        ctx.shadowBlur = 20 + Math.sin(pulsePhase * 6 + i) * 8;
        
        // Draw square trail
        var size = trail.size;
        ctx.fillRect(trail.x - size/2, trail.y - size/2, size, size);
        
        // Bright core
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = trail.alpha * flashMult * 0.6;
        var coreSize = size * 0.4;
        ctx.fillRect(trail.x - coreSize/2, trail.y - coreSize/2, coreSize, coreSize);
    }
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
}

function drawWarnings() {
    for (var i = 0; i < warningIndicators.length; i++) {
        var w = warningIndicators[i];
        var grad = ctx.createLinearGradient(0, 0, 0, 80);
        grad.addColorStop(0, 'rgba(255,71,87,'+w.alpha+')'); grad.addColorStop(1, 'rgba(255,71,87,0)');
        ctx.fillStyle = grad; ctx.fillRect(w.x - w.width/2, 0, w.width, 80);
        ctx.fillStyle = 'rgba(255,71,87,'+w.alpha+')';
        ctx.font = 'bold 32px Orbitron,sans-serif'; ctx.textAlign = 'center';
        ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 10;
        ctx.fillText('!', w.x, 50); ctx.shadowBlur = 0;
    }
}

function drawObstacles() {
    for (var i = 0; i < obstacles.length; i++) {
        var obs = obstacles[i];
        ctx.globalAlpha = obs.alpha;
        if (obs.type === 'beam') {
            ctx.shadowColor = obs.glowColor; ctx.shadowBlur = 50;
            var outerGrad = ctx.createLinearGradient(obs.x-obs.width/2, 0, obs.x+obs.width/2, 0);
            outerGrad.addColorStop(0, 'rgba(255,217,61,0)'); outerGrad.addColorStop(0.1, 'rgba(255,180,50,0.3)');
            outerGrad.addColorStop(0.3, obs.color); outerGrad.addColorStop(0.5, '#fff');
            outerGrad.addColorStop(0.7, obs.color); outerGrad.addColorStop(0.9, 'rgba(255,180,50,0.3)');
            outerGrad.addColorStop(1, 'rgba(255,217,61,0)');
            ctx.fillStyle = outerGrad; ctx.fillRect(obs.x-obs.width/2, 0, obs.width, canvas.height);
            var coreGrad = ctx.createLinearGradient(obs.x-obs.width/6, 0, obs.x+obs.width/6, 0);
            coreGrad.addColorStop(0, 'rgba(255,255,200,0.7)'); coreGrad.addColorStop(0.5, 'rgba(255,255,255,1)');
            coreGrad.addColorStop(1, 'rgba(255,255,200,0.7)');
            ctx.fillStyle = coreGrad; ctx.fillRect(obs.x-obs.width/6, 0, obs.width/3, canvas.height);
        } else if (obs.type === 'laser') {
            ctx.shadowColor = obs.glowColor; ctx.shadowBlur = 60;
            var grad = ctx.createLinearGradient(obs.x-obs.width/2, 0, obs.x+obs.width/2, 0);
            grad.addColorStop(0, 'rgba(255,71,87,0)'); grad.addColorStop(0.15, 'rgba(255,100,100,0.4)');
            grad.addColorStop(0.3, obs.color); grad.addColorStop(0.5, '#fff');
            grad.addColorStop(0.7, obs.color); grad.addColorStop(0.85, 'rgba(255,100,100,0.4)');
            grad.addColorStop(1, 'rgba(255,71,87,0)');
            ctx.fillStyle = grad; ctx.fillRect(obs.x-obs.width/2, 0, obs.width, canvas.height);
            ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.fillRect(obs.x-obs.width/8, 0, obs.width/4, canvas.height);
        } else if (obs.type === 'flashLaser') {
            ctx.shadowColor = obs.glowColor; ctx.shadowBlur = 70;
            var grad = ctx.createLinearGradient(obs.x-obs.width/2, 0, obs.x+obs.width/2, 0);
            grad.addColorStop(0, 'rgba(0,255,255,0)'); grad.addColorStop(0.1, 'rgba(0,255,200,0.3)');
            grad.addColorStop(0.25, obs.color); grad.addColorStop(0.5, '#fff');
            grad.addColorStop(0.75, obs.color); grad.addColorStop(0.9, 'rgba(0,255,200,0.3)');
            grad.addColorStop(1, 'rgba(0,255,255,0)');
            ctx.fillStyle = grad; ctx.fillRect(obs.x-obs.width/2, 0, obs.width, canvas.height);
            ctx.fillStyle = 'rgba(255,255,255,1)'; ctx.fillRect(obs.x-obs.width/10, 0, obs.width/5, canvas.height);
        } else if (obs.type === 'sweeper') {
            ctx.shadowColor = obs.glowColor; ctx.shadowBlur = 40;
            var grad = ctx.createLinearGradient(obs.x-obs.width/2, obs.y, obs.x+obs.width/2, obs.y);
            grad.addColorStop(0, 'rgba(255,107,157,0)'); grad.addColorStop(0.1, 'rgba(255,150,180,0.4)');
            grad.addColorStop(0.25, obs.color); grad.addColorStop(0.5, '#fff');
            grad.addColorStop(0.75, obs.color); grad.addColorStop(0.9, 'rgba(255,150,180,0.4)');
            grad.addColorStop(1, 'rgba(255,107,157,0)');
            ctx.fillStyle = grad; ctx.fillRect(obs.x-obs.width/2, obs.y-obs.height/2, obs.width, obs.height);
        } else if (obs.type === 'rain' || obs.type === 'bigRain') {
            var glowSize = obs.type === 'bigRain' ? 40 : 25;
            var flashMult = 0.7 + Math.sin(pulsePhase * 10 + obs.x * 0.1) * 0.3;
            
            ctx.shadowColor = obs.glowColor;
            ctx.shadowBlur = glowSize + Math.sin(pulsePhase * 8 + obs.y * 0.05) * 10;
            
            // Main square body
            ctx.fillStyle = obs.color;
            var w = obs.width;
            var h = obs.height;
            ctx.fillRect(obs.x - w/2, obs.y - h/2, w, h);
            
            // Bright white core
            ctx.fillStyle = '#ffffff';
            ctx.globalAlpha = obs.alpha * 0.9;
            var coreW = w * 0.5;
            var coreH = h * 0.5;
            ctx.fillRect(obs.x - coreW/2, obs.y - coreH/2, coreW, coreH);
            
            // Glowing border
            ctx.strokeStyle = obs.glowColor;
            ctx.lineWidth = 3;
            ctx.globalAlpha = obs.alpha * flashMult;
            ctx.strokeRect(obs.x - w/2 - 2, obs.y - h/2 - 2, w + 4, h + 4);
            
            // Extra flash effect
            if (flashMult > 0.85) {
                ctx.fillStyle = obs.glowColor;
                ctx.globalAlpha = (flashMult - 0.85) * 2;
                ctx.fillRect(obs.x - w/2 - 4, obs.y - h/2 - 4, w + 8, h + 8);
            }
            
            ctx.globalAlpha = obs.alpha;
        } else if (obs.type === 'diagonal') {
            var flashMult = 0.6 + Math.sin(pulsePhase * 12 + obs.x * 0.15 + obs.y * 0.1) * 0.4;
            
            ctx.shadowColor = obs.glowColor;
            ctx.shadowBlur = 30 + Math.sin(pulsePhase * 6) * 12;
            
            // Main square body
            ctx.fillStyle = obs.color;
            var w = obs.width;
            var h = obs.height;
            ctx.fillRect(obs.x - w/2, obs.y - h/2, w, h);
            
            // Bright white core
            ctx.fillStyle = '#ffffff';
            ctx.globalAlpha = obs.alpha * 0.85;
            var coreW = w * 0.45;
            var coreH = h * 0.45;
            ctx.fillRect(obs.x - coreW/2, obs.y - coreH/2, coreW, coreH);
            
            // Glowing border with flash
            ctx.strokeStyle = obs.glowColor;
            ctx.lineWidth = 2 + flashMult * 2;
            ctx.globalAlpha = obs.alpha * flashMult;
            ctx.strokeRect(obs.x - w/2 - 3, obs.y - h/2 - 3, w + 6, h + 6);
            
            ctx.globalAlpha = obs.alpha;
        }
        ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    }
}

function drawPlayer() {
    for (var i = player.trail.length-1; i >= 0; i--) {
        var pt = player.trail[i];
        var size = player.width * (1 - i/player.trail.length) * 0.85;
        var trailAlpha = (1 - i/player.trail.length) * 0.4;
        ctx.fillStyle = 'rgba(0,255,255,'+trailAlpha+')';
        ctx.shadowColor = '#00ffff'; ctx.shadowBlur = 10;
        ctx.fillRect(pt.x-size/2, pt.y-size/2, size, size);
    }
    ctx.shadowBlur = 0;
    ctx.shadowColor = '#00ffff'; ctx.shadowBlur = 30 + Math.sin(pulsePhase * 3) * 10;
    var grad = ctx.createLinearGradient(player.x-player.width/2, player.y-player.height/2, player.x+player.width/2, player.y+player.height/2);
    grad.addColorStop(0, '#00ffff'); grad.addColorStop(0.5, '#ffffff'); grad.addColorStop(1, '#00ffff');
    ctx.fillStyle = grad; ctx.fillRect(player.x-player.width/2, player.y-player.height/2, player.width, player.height);
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillRect(player.x-player.width/4, player.y-player.height/4, player.width/2, player.height/2);
    ctx.strokeStyle = '#00ffff'; ctx.lineWidth = 3;
    ctx.strokeRect(player.x-player.width/2, player.y-player.height/2, player.width, player.height);
    ctx.shadowBlur = 0;
}

function drawParticles() {
    for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        ctx.globalAlpha = p.life; ctx.fillStyle = p.color;
        ctx.shadowColor = p.color; ctx.shadowBlur = 15;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size*p.life, 0, Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
}

function drawVignette() {
    var grad = ctx.createRadialGradient(canvas.width/2, canvas.height/2, canvas.height*0.3, canvas.width/2, canvas.height/2, canvas.height);
    grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, canvas.width, canvas.height);
}

init();