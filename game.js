
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
const JUMP_UNLOCK_TIME = 60000; // Stage 2 starts at 1 minute

// Stage system
let currentStage = 1;
let stageTransitionActive = false;
let stageTransitionTimer = 0;
const STAGE_TRANSITION_DURATION = 3000; // 3 second transition effect
let stage2DifficultyBoost = 2.5; // Multiplier for stage 2 difficulty

// Base player dimensions - will be scaled for mobile
var basePlayerSize = 35;
var basePlayerSpeed = 7;

const player = {
    x: 0, y: 0, width: basePlayerSize, height: basePlayerSize, speed: basePlayerSpeed,
    targetX: 0, trail: [], invincible: false,
    groundY: 0, velocityY: 0, isJumping: false, isFalling: false,
    jumpPower: -18, gravity: 0.8
};

// Scale factor for mobile devices
var mobileScaleFactor = 1;

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

// Track input mode to prevent conflicts between touch and keyboard
var inputMode = 'none'; // 'keyboard', 'touch', or 'none'

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
    
    // Use multiple resize event listeners for better mobile support
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('orientationchange', handleOrientationChange);
    
    // Visual viewport API for better mobile resize handling
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', handleVisualViewportResize);
    }
    
    // PC Controls - only add if not primarily a mobile device
    if (!isMobile) {
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
    }
    
    // Mobile Controls - always add touch listeners but they check inputMode
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    
    // Prevent default touch behaviors that can cause issues
    document.addEventListener('touchmove', function(e) {
        if (gameState === 'playing' || gameState === 'dying') {
            e.preventDefault();
        }
    }, { passive: false });
    
    // Mouse trail tracking - only for non-mobile
    if (!isMobile) {
        window.addEventListener('mousemove', handleMouseMove);
    }
    
    if (isMobile) showMobileControlsHint();
    
    // Click handler for retry - only for non-mobile
    if (!isMobile) {
        canvas.addEventListener('click', function() { if (gameState === 'gameover') startGame(); });
    }
    
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
            
            var trailSize = p.size * p.life;
            ctx.fillRect(p.x - trailSize/2, p.y - trailSize/2, trailSize, trailSize);
            
            // Small bright core
            ctx.fillStyle = '#ffffff';
            ctx.globalAlpha = alpha * 0.7;
            var trailCoreSize = trailSize * 0.4;
            ctx.fillRect(p.x - trailCoreSize/2, p.y - trailCoreSize/2, trailCoreSize, trailCoreSize);
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
        startInfo.innerHTML = '<p class="controls-info">Tap <span class="key">LEFT</span> side to go left</p>' +
                              '<p class="controls-info">Tap <span class="key">RIGHT</span> side to go right</p>' +
                              '<p class="controls-info">Swipe <span class="key">↑</span> to jump (after 1 min)</p>' +
                              '<p class="controls-info mobile-tip">Tap anywhere to start!</p>';
    }
    document.body.classList.add('mobile-device');
}

function resizeCanvas() {
    // Get the actual viewport dimensions accounting for mobile browser chrome
    var viewportWidth = window.innerWidth;
    var viewportHeight = window.innerHeight;
    
    // Use visualViewport API if available for more accurate mobile dimensions
    if (window.visualViewport) {
        viewportWidth = window.visualViewport.width;
        viewportHeight = window.visualViewport.height;
    }
    
    // Ensure minimum dimensions
    viewportWidth = Math.max(viewportWidth, 320);
    viewportHeight = Math.max(viewportHeight, 200);
    
    // Set canvas dimensions
    canvas.width = viewportWidth;
    canvas.height = viewportHeight;
    
    // Calculate mobile scale factor based on screen size
    // Use a smaller reference for mobile to make everything more compact
    var referenceWidth = isMobile ? 600 : 800;
    var referenceHeight = isMobile ? 400 : 600;
    
    // Calculate scale based on both width and height for better mobile fit
    var widthScale = viewportWidth / referenceWidth;
    var heightScale = viewportHeight / referenceHeight;
    mobileScaleFactor = Math.max(0.5, Math.min(1.0, Math.min(widthScale, heightScale)));
    
    // Scale player size for mobile - make it smaller on phones
    if (isMobile) {
        // Smaller player on mobile for better visibility and gameplay
        var mobilePlayerScale = Math.max(0.6, Math.min(0.85, viewportHeight / 700));
        player.width = Math.max(20, basePlayerSize * mobilePlayerScale);
        player.height = Math.max(20, basePlayerSize * mobilePlayerScale);
    } else {
        player.width = basePlayerSize;
        player.height = basePlayerSize;
    }
    
    // Adjust ground position based on screen height
    // On mobile, position the player higher up on screen (more visible area above)
    // This creates a better "camera" position where player is in lower-middle area
    var groundOffsetPercent;
    if (isMobile) {
        // Mobile: player at about 75-80% down the screen (more room above)
        if (viewportHeight < 500) {
            // Very small screens (landscape or small phones)
            groundOffsetPercent = 0.22;
        } else if (viewportHeight < 700) {
            // Medium mobile screens
            groundOffsetPercent = 0.20;
        } else {
            // Larger mobile screens
            groundOffsetPercent = 0.18;
        }
    } else {
        // Desktop: player at about 85-88% down the screen
        groundOffsetPercent = 0.12;
    }
    
    var groundOffset = viewportHeight * groundOffsetPercent;
    player.groundY = viewportHeight - groundOffset;
    
    // Only reset player position if not in the middle of a game
    if (gameState !== 'playing' && gameState !== 'dying') {
        player.y = player.groundY;
        player.x = viewportWidth / 2;
        player.targetX = player.x;
    } else {
        // During gameplay, just adjust groundY and keep relative position
        if (!player.isJumping && !player.isFalling) {
            player.y = player.groundY;
        }
        // Clamp player position to new screen bounds
        player.x = Math.max(player.width / 2, Math.min(viewportWidth - player.width / 2, player.x));
        player.targetX = Math.max(player.width / 2, Math.min(viewportWidth - player.width / 2, player.targetX));
    }
    
    // Adjust platform width based on screen size
    // Wider platform on smaller screens for better playability
    var platformWidthPercent;
    if (isMobile) {
        if (viewportWidth < 400) {
            platformWidthPercent = 0.92;
        } else if (viewportWidth < 600) {
            platformWidthPercent = 0.88;
        } else {
            platformWidthPercent = 0.85;
        }
    } else {
        platformWidthPercent = 0.7;
    }
    platform.width = viewportWidth * platformWidthPercent;
    platform.leftEdge = (viewportWidth - platform.width) / 2;
    platform.rightEdge = platform.leftEdge + platform.width;
    
    initBackground();
}

// Handle orientation changes on mobile
function handleOrientationChange() {
    // Small delay to let the browser finish orientation change
    setTimeout(function() {
        resizeCanvas();
    }, 100);
}

// Handle visual viewport resize (for mobile keyboard, etc.)
function handleVisualViewportResize() {
    resizeCanvas();
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
    // Set input mode to keyboard when keyboard is used
    if (inputMode !== 'keyboard') {
        inputMode = 'keyboard';
        // Reset any touch-based key states
        keys.left = false;
        keys.right = false;
        keys.jump = false;
    }
    
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = true;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = true;
    if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        if (gameState === 'menu') startGame();
        else if (gameState === 'playing') keys.jump = true;
        else if (gameState === 'gameover') startGame();
    }
}

function handleKeyUp(e) {
    // Only process if we're in keyboard mode
    if (inputMode !== 'keyboard') return;
    
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = false;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
    if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') keys.jump = false;
}

var touchStartX = 0, touchStartY = 0, touchStartTime = 0;
var swipeThreshold = 50, swipeTimeThreshold = 400;
var isTouching = false, activeTouchId = null, movementTimer = null, movementDuration = 120;

// Track if we're currently holding a side for continuous movement
var holdingLeft = false, holdingRight = false;

function clearMovementTimer() {
    if (movementTimer) {
        clearTimeout(movementTimer);
        movementTimer = null;
    }
}

function handleTouchStart(e) {
    e.preventDefault();
    
    // Set input mode to touch
    if (inputMode !== 'touch') {
        inputMode = 'touch';
        // Reset any keyboard-based key states
        keys.left = false;
        keys.right = false;
        keys.jump = false;
        clearMovementTimer();
    }
    
    var touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    touchStartTime = Date.now();
    
    // Handle menu/gameover states - tap anywhere to start
    if (gameState === 'menu') {
        startGame();
        return;
    }
    if (gameState === 'gameover') {
        startGame();
        return;
    }
    
    // During gameplay - tap left/right side to move
    if (gameState === 'playing') {
        var screenMiddle = canvas.width / 2;
        
        // Clear any existing movement
        clearMovementTimer();
        
        if (touch.clientX < screenMiddle) {
            // Tapped on left side - move left
            keys.left = true;
            keys.right = false;
            holdingLeft = true;
            holdingRight = false;
        } else {
            // Tapped on right side - move right
            keys.right = true;
            keys.left = false;
            holdingRight = true;
            holdingLeft = false;
        }
    }
    
    isTouching = true;
    activeTouchId = touch.identifier;
}

function handleTouchMove(e) {
    if (!isTouching || gameState !== 'playing') return;
    if (inputMode !== 'touch') return;
    
    e.preventDefault();
    var touch = null;
    for (var i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === activeTouchId) {
            touch = e.touches[i];
            break;
        }
    }
    if (!touch) return;
    
    var diffY = touch.clientY - touchStartY;
    
    // Handle jump (swipe up) - only after 1 minute mark
    if (diffY < -swipeThreshold && !player.isJumping) {
        keys.jump = true;
        // Reset the touch start position so we don't trigger multiple jumps
        touchStartY = touch.clientY;
        // Reset jump after a short delay to allow the jump to register
        setTimeout(function() { keys.jump = false; }, 100);
    }
    
    // Update movement based on current touch position (allows sliding finger to change direction)
    var screenMiddle = canvas.width / 2;
    if (touch.clientX < screenMiddle) {
        keys.left = true;
        keys.right = false;
        holdingLeft = true;
        holdingRight = false;
    } else {
        keys.right = true;
        keys.left = false;
        holdingRight = true;
        holdingLeft = false;
    }
}

function handleTouchEnd(e) {
    e.preventDefault();
    
    if (inputMode !== 'touch') return;
    
    var touchEnded = true;
    for (var i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === activeTouchId) {
            touchEnded = false;
            break;
        }
    }
    
    if (touchEnded) {
        // Check for swipe up for jump before ending
        if (gameState === 'playing') {
            var touch = e.changedTouches[0];
            var diffY = touch.clientY - touchStartY;
            var timeDiff = Date.now() - touchStartTime;
            
            // Quick swipe up for jump
            if (timeDiff < swipeTimeThreshold && diffY < -swipeThreshold && !player.isJumping) {
                keys.jump = true;
                setTimeout(function() { keys.jump = false; }, 100);
            }
        }
        
        // Stop movement when finger is lifted
        keys.left = false;
        keys.right = false;
        holdingLeft = false;
        holdingRight = false;
        
        // Reset touch state
        isTouching = false;
        activeTouchId = null;
        touchStartX = 0;
        touchStartY = 0;
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
    
    // Reset stage system
    currentStage = 1;
    stageTransitionActive = false;
    stageTransitionTimer = 0;
    
    // Reset all key states
    keys.left = false;
    keys.right = false;
    keys.jump = false;
    clearMovementTimer();
    
    // Hide all screens and show game UI
    startScreen.classList.add('hidden');
    gameoverScreen.classList.add('hidden');
    victoryScreen.classList.add('hidden');
    gameUI.classList.remove('hidden');
    
    // Stop any playing sounds and start background music
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
    
    // Reset all key states to prevent stuck keys
    keys.left = false;
    keys.right = false;
    keys.jump = false;
    clearMovementTimer();
    
    // Update the HTML game over screen stats (even though we draw our own)
    document.getElementById('final-score').textContent = score;
    document.getElementById('final-combo').textContent = maxCombo;
    document.getElementById('final-progress').textContent = Math.floor((gameTime / gameDuration) * 100) + '%';
    
    // Note: We don't show gameoverScreen HTML element because we draw custom game over on canvas
    // gameoverScreen.classList.remove('hidden'); // Uncomment to use HTML version instead
    
    loserSound.currentTime = 0;
    loserSound.play().catch(function(e) { console.log('Loser sound failed:', e); });
}

function victory() {
    gameState = 'victory';
    gameUI.classList.add('hidden');
    
    // Reset all key states
    keys.left = false;
    keys.right = false;
    keys.jump = false;
    clearMovementTimer();
    
    victoryScreen.classList.remove('hidden');
    document.getElementById('victory-score').textContent = score;
    document.getElementById('victory-combo').textContent = maxCombo;
    
    // Stop background music for victory
    bgMusic.pause();
    
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
        
        // Check for stage transition
        if (currentStage === 1 && gameTime >= JUMP_UNLOCK_TIME) {
            triggerStageTransition();
        }
        
        // Update stage transition effect
        if (stageTransitionActive) {
            stageTransitionTimer += dt;
            if (stageTransitionTimer >= STAGE_TRANSITION_DURATION) {
                stageTransitionActive = false;
            }
        }
        
        // Calculate difficulty based on stage
        if (currentStage === 1) {
            difficultyMult = 1 + (gameTime / 1000) * 0.06; // Slower ramp in stage 1
            player.speed = Math.max(6, 7 - (gameTime / 60000) * 0.5);
        } else {
            // Stage 2: Much higher difficulty
            var stage2Time = gameTime - JUMP_UNLOCK_TIME;
            difficultyMult = stage2DifficultyBoost + (stage2Time / 1000) * 0.15; // Faster ramp in stage 2
            player.speed = Math.max(4, 7 - (stage2Time / 30000) * 2); // Player slows down more in stage 2
        }
        
        if (gameTime >= gameDuration) { victory(); return; }
        updatePlayer(dt);
        updateObstacles(dt);
        updateWarnings(dt);
        spawnProgressiveObstacles();
        checkCollisions();
        checkPlatformEdges();
        updateUI();
        score += currentStage === 2 ? 2 : 1; // Double score in stage 2
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

function triggerStageTransition() {
    currentStage = 2;
    stageTransitionActive = true;
    stageTransitionTimer = 0;
    
    // Epic transition effects
    triggerScreenShake(30);
    flashIntensity = 1.0;
    beatPulse = 1.0;
    
    // Create explosion of particles
    for (var i = 0; i < 100; i++) {
        createParticle(canvas.width / 2 + (Math.random() - 0.5) * canvas.width,
                       canvas.height / 2 + (Math.random() - 0.5) * canvas.height, 'celebration');
    }
    
    // Clear existing obstacles for a brief moment of relief
    obstacles = [];
    warningIndicators = [];
}

function spawnProgressiveObstacles() {
    var t = gameTime, dm = difficultyMult;
    
    // Don't spawn during stage transition grace period
    if (stageTransitionActive && stageTransitionTimer < 1500) {
        return;
    }
    
    // STAGE 1: Moderate difficulty, no sweepers
    if (currentStage === 1) {
        var beamInterval = Math.max(600, 1800 - t * 0.006);
        var rainInterval = Math.max(100, 500 - t * 0.003);
        var laserInterval = Math.max(600, 2200 - t * 0.008);
        
        // Beams - fewer and slower in stage 1
        if (t - lastBeamSpawn > beamInterval) {
            lastBeamSpawn = t;
            var numBeams = Math.min(3, 1 + Math.floor(t / 25000));
            for (var i = 0; i < numBeams; i++) {
                var x = platform.leftEdge + Math.random() * platform.width;
                spawnBeam(x, 50 + Math.random() * 40, Math.max(400, 800 - t * 0.003), 300 + Math.random() * 200);
            }
        }
        
        // Rain - moderate in stage 1
        if (t - lastRainSpawn > rainInterval) {
            lastRainSpawn = t;
            var rainCount = Math.min(6, 1 + Math.floor(t / 12000));
            for (var i = 0; i < rainCount; i++) {
                var x = platform.leftEdge + Math.random() * platform.width;
                var speed = 7 + (t / 6000) * dm + Math.random() * 4;
                if (Math.random() < 0.15 + (t / 300000)) spawnBigRain(x, speed * 0.7);
                else spawnRain(x, speed);
            }
        }
        
        // Lasers - start later and less frequent in stage 1
        if (t > 15000 && t - lastLaserSpawn > laserInterval) {
            lastLaserSpawn = t;
            var x = platform.leftEdge + Math.random() * platform.width;
            spawnLaser(x, 35 + (t / 4000), Math.max(500, 1000 - t * 0.004), 250);
        }
        
        // Flash lasers - rare in stage 1
        if (t > 40000 && t - lastFlashLaserSpawn > 4000) {
            lastFlashLaserSpawn = t;
            spawnFlashLaser(platform.leftEdge + Math.random() * platform.width, 40, Math.max(700, 1400 - t * 0.005), 180);
        }
        
        // Diagonal rain - very rare in stage 1
        if (t > 30000 && Math.random() < 0.01 * dm) spawnDiagonalRain();
    }
    
    // STAGE 2: Intense difficulty with jumping required
    else {
        var stage2Time = t - JUMP_UNLOCK_TIME;
        var beamInterval = Math.max(250, 800 - stage2Time * 0.012);
        var rainInterval = Math.max(40, 200 - stage2Time * 0.004);
        var laserInterval = Math.max(300, 1000 - stage2Time * 0.015);
        var flashLaserInterval = Math.max(400, 1500 - stage2Time * 0.012);
        var sweeperInterval = Math.max(400, 1800 - stage2Time * 0.025);
        
        // Beams - many more and faster
        if (t - lastBeamSpawn > beamInterval) {
            lastBeamSpawn = t;
            var numBeams = Math.min(7, 2 + Math.floor(stage2Time / 10000));
            for (var i = 0; i < numBeams; i++) {
                var x = platform.leftEdge + Math.random() * platform.width;
                spawnBeam(x, 70 + Math.random() * 60 + (stage2Time / 1000), Math.max(180, 500 - stage2Time * 0.006), 400 + Math.random() * 300 + (stage2Time / 300));
            }
        }
        
        // Sweepers - the signature stage 2 obstacle requiring jumps
        if (t - lastSweeperSpawn > sweeperInterval) {
            lastSweeperSpawn = t;
            var fromLeft = Math.random() > 0.5;
            var speed = 16 + (stage2Time / 1500) * dm;
            spawnSweeper(fromLeft, player.groundY - 30 - Math.random() * 60, speed, 60 + Math.random() * 40);
            
            // Double sweepers after 15 seconds in stage 2
            if (stage2Time > 15000 && Math.random() > 0.3) {
                setTimeout(function() {
                    spawnSweeper(!fromLeft, player.groundY - 50 - Math.random() * 50, speed * 1.15, 55);
                }, 150);
            }
            
            // Triple sweepers after 40 seconds in stage 2
            if (stage2Time > 40000 && Math.random() > 0.4) {
                setTimeout(function() {
                    spawnSweeper(fromLeft, player.groundY - 70, speed * 0.95, 65);
                }, 350);
            }
        }
        
        // Rain - intense barrage
        if (t - lastRainSpawn > rainInterval) {
            lastRainSpawn = t;
            var rainCount = Math.min(15, 4 + Math.floor(stage2Time / 5000));
            for (var i = 0; i < rainCount; i++) {
                var x = platform.leftEdge + Math.random() * platform.width;
                var speed = 11 + (stage2Time / 2500) * dm + Math.random() * 6;
                if (Math.random() < 0.35 + (stage2Time / 100000)) spawnBigRain(x, speed * 0.85);
                else spawnRain(x, speed);
            }
        }
        
        // Lasers - frequent and wide
        if (t - lastLaserSpawn > laserInterval) {
            lastLaserSpawn = t;
            var x = platform.leftEdge + Math.random() * platform.width;
            spawnLaser(x, 50 + (stage2Time / 2000), Math.max(250, 600 - stage2Time * 0.007), 320);
            
            // Double lasers
            if (stage2Time > 20000 && Math.random() > 0.3) {
                var x2 = x > canvas.width / 2 ? x - platform.width * 0.35 : x + platform.width * 0.35;
                spawnLaser(Math.max(platform.leftEdge, Math.min(platform.rightEdge, x2)), 50 + (stage2Time / 2000), Math.max(250, 600 - stage2Time * 0.007) + 80, 320);
            }
            
            // Triple lasers in late stage 2
            if (stage2Time > 50000 && Math.random() > 0.5) {
                spawnLaser(canvas.width * 0.5, 60 + (stage2Time / 1500), Math.max(200, 500 - stage2Time * 0.008), 350);
            }
        }
        
        // Flash lasers - frequent and dangerous
        if (t - lastFlashLaserSpawn > flashLaserInterval) {
            lastFlashLaserSpawn = t;
            spawnFlashLaser(platform.leftEdge + Math.random() * platform.width, 55 + (stage2Time / 3000), Math.max(350, 800 - stage2Time * 0.008), 220);
            
            // Double flash lasers
            if (stage2Time > 30000 && Math.random() > 0.4) {
                setTimeout(function() {
                    spawnFlashLaser(platform.leftEdge + Math.random() * platform.width, 55, 400, 200);
                }, 200);
            }
        }
        
        // Diagonal rain - frequent in stage 2
        if (Math.random() < 0.04 * dm) spawnDiagonalRain();
        
        // Chaos mode in final stretch (last 20 seconds)
        if (t > 110000) {
            if (Math.random() < 0.08) spawnBeam(platform.leftEdge + Math.random() * platform.width, 80, 150, 500);
            if (Math.random() < 0.06) spawnFlashLaser(platform.leftEdge + Math.random() * platform.width, 65, 300, 280);
            if (Math.random() < 0.08) spawnBigRain(platform.leftEdge + Math.random() * platform.width, 18 + Math.random() * 10);
            if (Math.random() < 0.05) spawnLaser(platform.leftEdge + Math.random() * platform.width, 60, 220, 350);
        }
    }
}

function spawnBeam(x, width, warningTime, activeTime) {
    // Scale beam width for mobile
    var beamWidth = width || 80;
    if (isMobile) {
        beamWidth = Math.max(50, beamWidth * mobileScaleFactor * 0.85);
    }
    obstacles.push({ type: 'beam', x: x, y: 0, width: 10, maxWidth: beamWidth, height: canvas.height,
        timer: 0, warningTime: warningTime || 600, activeTime: activeTime || 400,
        alpha: 0.3, active: false, color: '#ffd93d', glowColor: '#ff9a3c' });
    addWarning(x, beamWidth, warningTime || 600);
}

function spawnLaser(x, width, warningTime, activeTime) {
    // Scale laser width for mobile
    var laserWidth = width || 40;
    if (isMobile) {
        laserWidth = Math.max(30, laserWidth * mobileScaleFactor * 0.85);
    }
    obstacles.push({ type: 'laser', x: x, y: 0, width: 5, maxWidth: laserWidth, height: canvas.height,
        timer: 0, warningTime: warningTime || 800, activeTime: activeTime || 250,
        alpha: 0.2, active: false, color: '#ff4757', glowColor: '#ff6b81' });
    addWarning(x, laserWidth, warningTime || 800);
}

function spawnFlashLaser(x, width, warningTime, activeTime) {
    // Scale flash laser width for mobile
    var flashWidth = width || 55;
    if (isMobile) {
        flashWidth = Math.max(40, flashWidth * mobileScaleFactor * 0.85);
    }
    obstacles.push({ type: 'flashLaser', x: x, y: 0, width: 5, maxWidth: flashWidth, height: canvas.height,
        timer: 0, warningTime: warningTime || 1000, activeTime: activeTime || 200,
        alpha: 0.2, active: false, color: '#00ffff', glowColor: '#00ff88' });
    addWarning(x, flashWidth, warningTime || 1000);
}

function spawnSweeper(fromLeft, y, speed, height) {
    // Use player.groundY for consistent sweeper positioning
    // Scale sweeper size for mobile
    var defaultY = player.groundY - (isMobile ? 20 : 30);
    var sweeperWidth = isMobile ? Math.max(100, 120 * mobileScaleFactor) : 150;
    var sweeperHeight = isMobile ? Math.max(40, (height || 60) * mobileScaleFactor) : (height || 60);
    
    obstacles.push({ type: 'sweeper', x: fromLeft ? -100 : canvas.width + 100, y: y || defaultY,
        width: sweeperWidth, height: sweeperHeight, direction: fromLeft ? 1 : -1,
        speed: speed || 15, timer: 0, warningTime: 300,
        alpha: 0.3, active: false, color: '#ff6b9d', glowColor: '#c44569' });
}

function spawnRain(x, speed) {
    // Scale rain size for mobile - smaller on phones
    var rainWidth, rainHeight;
    if (isMobile) {
        rainWidth = Math.max(14, 22 * mobileScaleFactor);
        rainHeight = Math.max(24, 40 * mobileScaleFactor);
    } else {
        rainWidth = 28;
        rainHeight = 50;
    }
    
    obstacles.push({ type: 'rain', x: x, y: -50, width: rainWidth, height: rainHeight,
        speed: speed || 10, timer: 0, alpha: 1, active: true,
        color: '#ffd93d', glowColor: '#ff9a3c', trailColor: '#ffaa00' });
}

function spawnBigRain(x, speed) {
    // Scale big rain size for mobile - smaller on phones
    var rainWidth, rainHeight;
    if (isMobile) {
        rainWidth = Math.max(22, 35 * mobileScaleFactor);
        rainHeight = Math.max(36, 60 * mobileScaleFactor);
    } else {
        rainWidth = 45;
        rainHeight = 75;
    }
    
    obstacles.push({ type: 'bigRain', x: x, y: -80, width: rainWidth, height: rainHeight,
        speed: speed || 8, timer: 0, alpha: 1, active: true,
        color: '#ff6b9d', glowColor: '#ff00aa', trailColor: '#ff44cc' });
}

function spawnDiagonalRain() {
    var fromLeft = Math.random() > 0.5;
    // Scale diagonal rain size for mobile - smaller on phones
    var diagWidth, diagHeight;
    if (isMobile) {
        diagWidth = Math.max(18, 28 * mobileScaleFactor);
        diagHeight = Math.max(30, 48 * mobileScaleFactor);
    } else {
        diagWidth = 35;
        diagHeight = 60;
    }
    obstacles.push({ type: 'diagonal', x: fromLeft ? platform.leftEdge - 20 : platform.rightEdge + 20, y: -30,
        width: diagWidth, height: diagHeight, vx: fromLeft ? 7 + Math.random() * 5 : -7 - Math.random() * 5,
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
    
    // Change progress bar color based on stage
    if (currentStage === 2) {
        progressFill.style.background = 'linear-gradient(90deg, #ff4757, #ff6b9d, #ff00aa)';
    } else {
        progressFill.style.background = 'linear-gradient(90deg, #00ffff, #ff6b9d, #ffd93d)';
    }
    
    var sec = Math.floor(gameTime/1000), total = Math.floor(gameDuration/1000);
    var stageText = currentStage === 2 ? ' [STAGE 2]' : ' [STAGE 1]';
    timeDisplay.textContent = Math.floor(sec/60)+':'+(sec%60<10?'0':'')+(sec%60)+' / '+Math.floor(total/60)+':'+(total%60<10?'0':'')+(total%60) + stageText;
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
    
    // Draw stage transition overlay
    if (stageTransitionActive) {
        drawStageTransition();
    }
    if (flashIntensity > 0.01) {
        ctx.fillStyle = 'rgba(255,255,255,'+flashIntensity+')';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    drawVignette();
    ctx.restore();
}

function drawMenuScreen() {
    // UNIQUE TITLE SCREEN - Deep space cosmic theme (different from game's city theme)
    
    // Deep space gradient background - blues and purples
    var gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height)
    );
    var hue1 = 220 + Math.sin(pulsePhase * 0.3) * 15;
    var hue2 = 260 + Math.sin(pulsePhase * 0.5) * 20;
    var hue3 = 200 + Math.sin(pulsePhase * 0.4) * 10;
    gradient.addColorStop(0, 'hsl('+hue2+',80%,15%)');
    gradient.addColorStop(0.3, 'hsl('+hue1+',70%,8%)');
    gradient.addColorStop(0.6, 'hsl('+hue3+',60%,5%)');
    gradient.addColorStop(1, 'hsl(240,50%,2%)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Distant nebula clouds
    for (var n = 0; n < 5; n++) {
        var nebulaX = canvas.width * (0.2 + n * 0.15) + Math.sin(pulsePhase * 0.2 + n) * 50;
        var nebulaY = canvas.height * (0.3 + (n % 3) * 0.2) + Math.cos(pulsePhase * 0.15 + n) * 30;
        var nebulaSize = 150 + n * 50 + Math.sin(pulsePhase * 0.5 + n) * 30;
        var nebulaColors = ['rgba(138, 43, 226, ', 'rgba(75, 0, 130, ', 'rgba(0, 191, 255, ', 'rgba(255, 20, 147, ', 'rgba(0, 255, 255, '];
        
        var nebulaGrad = ctx.createRadialGradient(nebulaX, nebulaY, 0, nebulaX, nebulaY, nebulaSize);
        nebulaGrad.addColorStop(0, nebulaColors[n % nebulaColors.length] + '0.15)');
        nebulaGrad.addColorStop(0.5, nebulaColors[n % nebulaColors.length] + '0.05)');
        nebulaGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = nebulaGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    // Twinkling stars - many small ones
    for (var i = 0; i < 150; i++) {
        var starX = (canvas.width * ((i * 0.0137) % 1));
        var starY = (canvas.height * ((i * 0.0193) % 1));
        var twinkle = Math.sin(pulsePhase * 4 + i * 1.7);
        var starSize = 0.5 + (i % 3) * 0.5 + twinkle * 0.5;
        var starAlpha = 0.3 + twinkle * 0.4;
        
        if (starAlpha > 0 && starSize > 0) {
            ctx.fillStyle = 'rgba(255, 255, 255, ' + starAlpha + ')';
            ctx.beginPath();
            ctx.arc(starX, starY, starSize, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    // Larger glowing stars
    var starColors = ['#ffffff', '#00ffff', '#ff6b9d', '#ffd93d', '#00ff88', '#ff00aa', '#7c4dff'];
    for (var i = 0; i < 30; i++) {
        var starX = (canvas.width * ((i * 0.0371) % 1));
        var starY = (canvas.height * ((i * 0.0529) % 1));
        var twinkle = Math.sin(pulsePhase * 3 + i * 2.3);
        var starSize = 2 + (i % 4) + twinkle * 1.5;
        var starAlpha = 0.5 + twinkle * 0.3;
        var colorIndex = i % starColors.length;
        
        if (starAlpha > 0.2) {
            ctx.shadowColor = starColors[colorIndex];
            ctx.shadowBlur = 15 + twinkle * 10;
            ctx.fillStyle = starColors[colorIndex];
            ctx.globalAlpha = starAlpha;
            ctx.beginPath();
            ctx.arc(starX, starY, starSize, 0, Math.PI * 2);
            ctx.fill();
            
            // Star cross effect for brightest stars
            if (twinkle > 0.5 && starSize > 3) {
                ctx.strokeStyle = starColors[colorIndex];
                ctx.lineWidth = 1;
                ctx.globalAlpha = starAlpha * 0.5;
                var crossSize = starSize * 3;
                ctx.beginPath();
                ctx.moveTo(starX - crossSize, starY);
                ctx.lineTo(starX + crossSize, starY);
                ctx.moveTo(starX, starY - crossSize);
                ctx.lineTo(starX, starY + crossSize);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
        }
    }
    ctx.shadowBlur = 0;
    
    // Spiral galaxy in background
    ctx.save();
    ctx.translate(canvas.width * 0.75, canvas.height * 0.25);
    ctx.rotate(pulsePhase * 0.1);
    for (var arm = 0; arm < 3; arm++) {
        var armAngle = (Math.PI * 2 / 3) * arm;
        for (var p = 0; p < 50; p++) {
            var spiralAngle = armAngle + p * 0.15;
            var spiralDist = 10 + p * 2.5;
            var px = Math.cos(spiralAngle) * spiralDist;
            var py = Math.sin(spiralAngle) * spiralDist * 0.4;
            var pSize = Math.max(0.5, 2 - p * 0.03);
            var pAlpha = Math.max(0, 0.4 - p * 0.006);
            
            ctx.fillStyle = 'rgba(200, 180, 255, ' + pAlpha + ')';
            ctx.beginPath();
            ctx.arc(px, py, pSize, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.restore();
    
    // Floating cosmic dust particles
    for (var i = 0; i < 60; i++) {
        var dustX = (canvas.width * ((i * 0.0234 + pulsePhase * 0.01) % 1));
        var dustY = (canvas.height * ((i * 0.0345 + pulsePhase * 0.005) % 1));
        var dustSize = 1 + Math.sin(pulsePhase * 2 + i) * 0.5;
        var dustAlpha = 0.2 + Math.sin(pulsePhase * 3 + i * 1.5) * 0.15;
        var dustColors = ['#ff6b9d', '#00ffff', '#ffd93d', '#00ff88'];
        
        ctx.fillStyle = dustColors[i % dustColors.length];
        ctx.globalAlpha = dustAlpha;
        ctx.beginPath();
        ctx.arc(dustX, dustY, dustSize, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
    
    // Geometric constellation lines
    ctx.strokeStyle = 'rgba(100, 200, 255, 0.1)';
    ctx.lineWidth = 1;
    for (var c = 0; c < 8; c++) {
        var cx1 = canvas.width * ((c * 0.137) % 1);
        var cy1 = canvas.height * ((c * 0.193) % 1);
        var cx2 = canvas.width * (((c + 3) * 0.137) % 1);
        var cy2 = canvas.height * (((c + 2) * 0.193) % 1);
        
        ctx.beginPath();
        ctx.moveTo(cx1, cy1);
        ctx.lineTo(cx2, cy2);
        ctx.stroke();
    }
    
    // ENHANCED: Multiple animated laser beams with different colors and patterns
    var laserColors = [
        { color: 'rgba(255, 107, 157, ', glow: '#ff6b9d' },  // Pink
        { color: 'rgba(0, 255, 255, ', glow: '#00ffff' },    // Cyan
        { color: 'rgba(255, 217, 61, ', glow: '#ffd93d' },   // Yellow
        { color: 'rgba(255, 0, 170, ', glow: '#ff00aa' },    // Magenta
        { color: 'rgba(0, 255, 136, ', glow: '#00ff88' },    // Green
        { color: 'rgba(255, 71, 87, ', glow: '#ff4757' },    // Red
        { color: 'rgba(124, 77, 255, ', glow: '#7c4dff' },   // Purple
        { color: 'rgba(0, 229, 255, ', glow: '#00e5ff' },    // Electric Blue
        { color: 'rgba(255, 23, 68, ', glow: '#ff1744' },    // Bright Red
        { color: 'rgba(118, 255, 3, ', glow: '#76ff03' }     // Lime
    ];
    
    // Vertical laser beams - many more with varied timing
    for (var i = 0; i < 18; i++) {
        var beamX = (canvas.width / 19) * (i + 1);
        var colorIndex = i % laserColors.length;
        var beamAlpha = 0.1 + Math.sin(pulsePhase * 3 + i * 0.7) * 0.08;
        var beamWidth = 20 + Math.sin(pulsePhase * 4 + i * 0.5) * 15;
        var beamFlash = Math.sin(pulsePhase * 6 + i * 1.2);
        
        ctx.shadowColor = laserColors[colorIndex].glow;
        ctx.shadowBlur = 40 + beamFlash * 20;
        ctx.fillStyle = laserColors[colorIndex].color + beamAlpha + ')';
        ctx.fillRect(beamX - beamWidth/2, 0, beamWidth, canvas.height);
        
        if (beamFlash > 0.5) {
            ctx.fillStyle = laserColors[colorIndex].color + (beamAlpha * 2) + ')';
            ctx.fillRect(beamX - beamWidth/4, 0, beamWidth/2, canvas.height);
            ctx.fillStyle = 'rgba(255, 255, 255, ' + (beamAlpha * beamFlash) + ')';
            ctx.fillRect(beamX - beamWidth/8, 0, beamWidth/4, canvas.height);
        }
    }
    ctx.shadowBlur = 0;
    
    // Horizontal sweeping laser beams - more of them
    for (var i = 0; i < 10; i++) {
        var sweepY = canvas.height * 0.1 + (canvas.height * 0.8 / 10) * i;
        var sweepOffset = Math.sin(pulsePhase * 2 + i * 1.3) * canvas.width * 0.35;
        var sweepWidth = canvas.width * 0.5 + Math.sin(pulsePhase * 3 + i) * 150;
        var sweepX = canvas.width / 2 + sweepOffset - sweepWidth / 2;
        var colorIndex = (i + 3) % laserColors.length;
        var sweepAlpha = 0.08 + Math.sin(pulsePhase * 4 + i * 2) * 0.05;
        var sweepHeight = 10 + Math.sin(pulsePhase * 5 + i) * 6;
        
        ctx.shadowColor = laserColors[colorIndex].glow;
        ctx.shadowBlur = 30;
        ctx.fillStyle = laserColors[colorIndex].color + sweepAlpha + ')';
        ctx.fillRect(sweepX, sweepY - sweepHeight/2, sweepWidth, sweepHeight);
        
        ctx.fillStyle = 'rgba(255, 255, 255, ' + (sweepAlpha * 0.9) + ')';
        ctx.fillRect(sweepX, sweepY - 1.5, sweepWidth, 3);
    }
    ctx.shadowBlur = 0;
    
    // Diagonal crossing laser beams - more dramatic
    for (var i = 0; i < 14; i++) {
        var diagPhase = pulsePhase * 1.5 + i * 0.7;
        var startX = (Math.sin(diagPhase) * 0.5 + 0.5) * canvas.width;
        var colorIndex = (i + 1) % laserColors.length;
        var diagAlpha = 0.06 + Math.sin(pulsePhase * 5 + i * 1.3) * 0.05;
        var diagWidth = 12 + Math.sin(pulsePhase * 4 + i) * 8;
        
        ctx.save();
        ctx.translate(startX, 0);
        ctx.rotate(Math.PI / 4 + Math.sin(diagPhase * 0.5) * 0.25);
        
        ctx.shadowColor = laserColors[colorIndex].glow;
        ctx.shadowBlur = 25;
        ctx.fillStyle = laserColors[colorIndex].color + diagAlpha + ')';
        ctx.fillRect(-diagWidth/2, -canvas.height, diagWidth, canvas.height * 3);
        
        ctx.fillStyle = 'rgba(255, 255, 255, ' + (diagAlpha * 0.5) + ')';
        ctx.fillRect(-diagWidth/6, -canvas.height, diagWidth/3, canvas.height * 3);
        
        ctx.restore();
    }
    ctx.shadowBlur = 0;
    
    // Reverse diagonal beams
    for (var i = 0; i < 10; i++) {
        var diagPhase = pulsePhase * 1.3 + i * 0.8 + Math.PI;
        var startX = (Math.cos(diagPhase) * 0.5 + 0.5) * canvas.width;
        var colorIndex = (i + 5) % laserColors.length;
        var diagAlpha = 0.05 + Math.sin(pulsePhase * 4 + i * 1.5) * 0.04;
        
        ctx.save();
        ctx.translate(startX, canvas.height);
        ctx.rotate(-Math.PI / 4 + Math.sin(diagPhase * 0.4) * 0.2);
        
        ctx.shadowColor = laserColors[colorIndex].glow;
        ctx.shadowBlur = 22;
        ctx.fillStyle = laserColors[colorIndex].color + diagAlpha + ')';
        ctx.fillRect(-10, -canvas.height * 2, 20, canvas.height * 3);
        
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
    
    // Large floating neon orbs - many more scattered across screen
    for (var i = 0; i < 45; i++) {
        var orbPhaseX = pulsePhase * (0.4 + (i % 5) * 0.12) + i * 1.5;
        var orbPhaseY = pulsePhase * (0.5 + (i % 4) * 0.1) + i * 1.8;
        var baseX = (i * 0.0618 * canvas.width) % canvas.width;
        var baseY = (i * 0.0314 * canvas.height) % canvas.height;
        var orbX = baseX + Math.sin(orbPhaseX) * 70;
        var orbY = baseY + Math.cos(orbPhaseY) * 50;
        var orbSize = 8 + Math.sin(pulsePhase * 2.5 + i) * 5 + (i % 6) * 3;
        var colorIndex = i % laserColors.length;
        var orbPulse = 0.5 + Math.sin(pulsePhase * 3.5 + i * 0.7) * 0.4;
        
        // Outer glow ring
        ctx.strokeStyle = laserColors[colorIndex].glow;
        ctx.lineWidth = 2;
        ctx.shadowColor = laserColors[colorIndex].glow;
        ctx.shadowBlur = 40 + Math.sin(pulsePhase * 4 + i) * 20;
        ctx.globalAlpha = orbPulse * 0.4;
        ctx.beginPath();
        ctx.arc(orbX, orbY, orbSize * 1.6, 0, Math.PI * 2);
        ctx.stroke();
        
        // Main orb body
        ctx.fillStyle = laserColors[colorIndex].glow;
        ctx.globalAlpha = orbPulse * 0.7;
        ctx.beginPath();
        ctx.arc(orbX, orbY, orbSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner bright core
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = orbPulse * 0.9;
        ctx.beginPath();
        ctx.arc(orbX, orbY, orbSize * 0.45, 0, Math.PI * 2);
        ctx.fill();
        
        // Highlight spot
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = orbPulse * 0.5;
        ctx.beginPath();
        ctx.arc(orbX - orbSize * 0.25, orbY - orbSize * 0.25, orbSize * 0.18, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.globalAlpha = 1;
    }
    ctx.shadowBlur = 0;
    
    // Small twinkling orbs - many more
    for (var i = 0; i < 80; i++) {
        var twinklePhase = pulsePhase * 6 + i * 2.1;
        var twinkleX = (canvas.width * ((i * 0.0417) % 1)) + Math.sin(pulsePhase * 0.9 + i) * 25;
        var twinkleY = (canvas.height * ((i * 0.0523) % 1)) + Math.cos(pulsePhase * 0.7 + i) * 20;
        var twinkleSize = Math.max(0.5, 2 + Math.sin(twinklePhase) * 2.5);
        var twinkleAlpha = 0.3 + Math.sin(twinklePhase) * 0.5;
        var colorIndex = i % laserColors.length;
        
        if (twinkleAlpha > 0 && twinkleSize > 0) {
            ctx.shadowColor = laserColors[colorIndex].glow;
            ctx.shadowBlur = 12;
            ctx.fillStyle = laserColors[colorIndex].glow;
            ctx.globalAlpha = twinkleAlpha;
            ctx.beginPath();
            ctx.arc(twinkleX, twinkleY, twinkleSize, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
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
    
    // Spark bursts from random points
    for (var burst = 0; burst < 10; burst++) {
        var burstPhase = (pulsePhase * 0.6 + burst * 0.7) % 3;
        if (burstPhase < 1.5) {
            var burstX = canvas.width * (0.1 + (burst * 0.123) % 0.8);
            var burstY = canvas.height * (0.1 + (burst * 0.157) % 0.8);
            var colorIndex = burst % laserColors.length;
            
            for (var spark = 0; spark < 12; spark++) {
                var sparkAngle = (Math.PI * 2 / 12) * spark + burstPhase * 2;
                var sparkDist = burstPhase * 60;
                var sparkX = burstX + Math.cos(sparkAngle) * sparkDist;
                var sparkY = burstY + Math.sin(sparkAngle) * sparkDist;
                var sparkSize = 3 * (1.5 - burstPhase);
                var sparkAlpha = (1.5 - burstPhase) * 0.6;
                
                ctx.shadowColor = laserColors[colorIndex].glow;
                ctx.shadowBlur = 15;
                ctx.fillStyle = laserColors[colorIndex].glow;
                ctx.globalAlpha = sparkAlpha;
                ctx.fillRect(sparkX - sparkSize/2, sparkY - sparkSize/2, sparkSize, sparkSize);
            }
            ctx.globalAlpha = 1;
        }
    }
    ctx.shadowBlur = 0;
    
    // Sparkle effects - more intense and spread out
    for (var i = 0; i < 70; i++) {
        var sparkleX = Math.sin(pulsePhase * 0.6 + i * 0.4) * canvas.width * 0.48 + canvas.width / 2;
        var sparkleY = Math.cos(pulsePhase * 0.4 + i * 0.6) * canvas.height * 0.45 + canvas.height / 2;
        var sparkleSize = Math.max(0.5, 2 + Math.sin(pulsePhase * 6 + i * 2.5) * 3);
        var sparkleAlpha = 0.4 + Math.sin(pulsePhase * 5 + i * 1.5) * 0.4;
        var colorIndex = i % laserColors.length;
        
        if (sparkleAlpha > 0.2 && sparkleSize > 0) {
            ctx.fillStyle = i % 3 === 0 ? laserColors[colorIndex].glow : 'rgba(255, 255, 255, ' + sparkleAlpha + ')';
            ctx.shadowColor = i % 3 === 0 ? laserColors[colorIndex].glow : '#ffffff';
            ctx.shadowBlur = 10;
            ctx.globalAlpha = sparkleAlpha;
            ctx.beginPath();
            ctx.arc(sparkleX, sparkleY, sparkleSize, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    }
    ctx.shadowBlur = 0;
    
    // Flying spark trails
    for (var i = 0; i < 15; i++) {
        var trailPhase = (pulsePhase * 1.2 + i * 0.5) % 2;
        var startX = (i * 0.0667 * canvas.width) % canvas.width;
        var startY = canvas.height * 0.1;
        var endX = startX + (Math.sin(i * 1.5) * 0.3 + 0.1) * canvas.width;
        var endY = canvas.height * 0.9;
        var currentX = startX + (endX - startX) * trailPhase / 2;
        var currentY = startY + (endY - startY) * trailPhase / 2;
        var colorIndex = i % laserColors.length;
        var trailAlpha = trailPhase < 1 ? (1 - trailPhase) * 0.7 : 0;
        
        if (trailAlpha > 0) {
            // Trail
            ctx.strokeStyle = laserColors[colorIndex].glow;
            ctx.lineWidth = 2;
            ctx.shadowColor = laserColors[colorIndex].glow;
            ctx.shadowBlur = 15;
            ctx.globalAlpha = trailAlpha * 0.5;
            ctx.beginPath();
            ctx.moveTo(currentX - 30, currentY - 30);
            ctx.lineTo(currentX, currentY);
            ctx.stroke();
            
            // Head
            ctx.fillStyle = '#ffffff';
            ctx.globalAlpha = trailAlpha;
            ctx.beginPath();
            ctx.arc(currentX, currentY, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
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
    var lineLength = Math.min(200, canvas.width * 0.25);
    for (var i = 0; i < 12; i++) {
        var angle = (Math.PI * 2 / 12) * i + pulsePhase * 0.1;
        var length = lineLength + Math.sin(pulsePhase * 2 + i) * (lineLength * 0.25);
        ctx.beginPath();
        ctx.moveTo(canvas.width/2, canvas.height/2 - 50);
        ctx.lineTo(canvas.width/2 + Math.cos(angle) * length, canvas.height/2 - 50 + Math.sin(angle) * length);
        ctx.stroke();
    }
    
    // Floating skull/danger symbols - fewer on mobile
    var symbolCount = isMobile ? 4 : 6;
    for (var i = 0; i < symbolCount; i++) {
        var symbolX = canvas.width * 0.15 + (canvas.width * 0.7) * (i / (symbolCount - 1));
        var symbolY = canvas.height * 0.12 + Math.sin(pulsePhase * 2 + i * 1.5) * 20;
        var symbolAlpha = 0.3 + Math.sin(pulsePhase * 3 + i) * 0.2;
        
        var symbolSize = isMobile ? Math.max(18, 30 * mobileScaleFactor) : 30;
        ctx.font = 'bold ' + symbolSize + 'px Orbitron, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255, 71, 87, ' + symbolAlpha + ')';
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 15;
        ctx.fillText('✕', symbolX, symbolY);
    }
    ctx.shadowBlur = 0;
    
    // Calculate layout based on screen size
    var isLandscape = canvas.width > canvas.height;
    var isSmallScreen = canvas.height < 500;
    
    // Draw the loser image with enhanced effects
    if (loserImageLoaded) {
        var maxSize;
        var imageYOffset;
        
        if (isSmallScreen || isLandscape) {
            maxSize = Math.min(canvas.width * 0.25, canvas.height * 0.35);
            imageYOffset = canvas.height * 0.05;
        } else {
            maxSize = Math.min(canvas.width * 0.4, canvas.height * 0.3);
            imageYOffset = canvas.height * 0.08;
        }
        
        var imgRatio = loserImage.width / loserImage.height;
        var drawWidth = imgRatio > 1 ? maxSize : maxSize * imgRatio;
        var drawHeight = imgRatio > 1 ? maxSize / imgRatio : maxSize;
        var drawX = (canvas.width - drawWidth) / 2;
        var drawY = imageYOffset;
        
        // Glowing border effect
        ctx.shadowColor = '#ff4757';
        ctx.shadowBlur = 40 + Math.sin(pulsePhase * 4) * 15;
        ctx.strokeStyle = '#ff4757';
        ctx.lineWidth = isMobile ? 2 : 4;
        ctx.strokeRect(drawX - 5, drawY - 5, drawWidth + 10, drawHeight + 10);
        
        ctx.drawImage(loserImage, drawX, drawY, drawWidth, drawHeight);
        ctx.shadowBlur = 0;
        
        // Position text below image
        var textY = drawY + drawHeight + (isSmallScreen ? 30 : 50);
        
        // "GAME OVER" text with glitch effect
        var fontSize = isSmallScreen ? Math.max(24, canvas.width * 0.06) : Math.max(32, canvas.width * 0.05);
        ctx.font = 'bold ' + fontSize + 'px Orbitron, sans-serif';
        ctx.textAlign = 'center';
        var glitchOffset = Math.sin(pulsePhase * 20) > 0.9 ? (Math.random() - 0.5) * 10 : 0;
        
        // Red shadow
        ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
        ctx.fillText('GAME OVER', canvas.width/2 + 3 + glitchOffset, textY);
        
        // Cyan shadow
        ctx.fillStyle = 'rgba(0, 255, 255, 0.5)';
        ctx.fillText('GAME OVER', canvas.width/2 - 3 - glitchOffset, textY);
        
        // Main text
        ctx.shadowColor = '#ff4757';
        ctx.shadowBlur = 20;
        ctx.fillStyle = '#ff4757';
        ctx.fillText('GAME OVER', canvas.width/2, textY);
        ctx.shadowBlur = 0;
        
        // Flashing warning triangles
        var warningAlpha = 0.5 + Math.sin(pulsePhase * 6) * 0.3;
        ctx.fillStyle = 'rgba(255, 200, 0, ' + warningAlpha + ')';
        var warningSize = isSmallScreen ? Math.max(20, fontSize * 0.8) : 40;
        ctx.font = 'bold ' + warningSize + 'px sans-serif';
        ctx.fillText('⚠', canvas.width * 0.1, textY);
        ctx.fillText('⚠', canvas.width * 0.9, textY);
    } else {
        // Fallback if image not loaded
        var fontSize = isSmallScreen ? Math.max(24, canvas.width * 0.06) : 48;
        ctx.font = 'bold ' + fontSize + 'px Orbitron, sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#ff4757';
        ctx.shadowBlur = 20;
        ctx.fillStyle = '#ff4757';
        ctx.fillText('GAME OVER', canvas.width/2, canvas.height/2);
        ctx.shadowBlur = 0;
    }
    
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
    var isSmallScreen = canvas.height < 500;
    var bottomBarHeight = isSmallScreen ? 100 : 150;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, canvas.height - bottomBarHeight, canvas.width, bottomBarHeight);
    
    // Stats text
    var statsFontSize = isSmallScreen ? Math.max(14, canvas.width * 0.035) : Math.max(18, canvas.width * 0.025);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold ' + statsFontSize + 'px Orbitron, sans-serif';
    ctx.textAlign = 'center';
    
    var statsY = canvas.height - bottomBarHeight + (isSmallScreen ? 35 : 50);
    var statsText = 'Score: ' + score + '  |  Combo: ' + maxCombo + '  |  ' + Math.floor((gameTime / gameDuration) * 100) + '%';
    ctx.fillText(statsText, canvas.width/2, statsY);
    
    // Retry text
    var retryFontSize = isSmallScreen ? Math.max(18, canvas.width * 0.045) : Math.max(24, canvas.width * 0.03);
    ctx.fillStyle = '#ff6b9d';
    ctx.font = 'bold ' + retryFontSize + 'px Orbitron, sans-serif';
    var retryY = canvas.height - (isSmallScreen ? 25 : 40);
    ctx.fillText(isMobile ? 'Tap anywhere to retry' : 'Click or press SPACE to retry', canvas.width/2, retryY);
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
    
    // Calculate abyss area based on player ground position for consistent camera
    var abyssTop = player.groundY - 40;
    var abyssHeight = canvas.height - abyssTop;
    var abyssGrad = ctx.createLinearGradient(0, abyssTop, 0, canvas.height);
    abyssGrad.addColorStop(0, 'rgba(0,0,0,0)');
    abyssGrad.addColorStop(0.3, 'rgba(10,0,20,0.5)');
    abyssGrad.addColorStop(0.7, 'rgba(15,0,25,0.8)');
    abyssGrad.addColorStop(1, 'rgba(5,0,10,1)');
    ctx.fillStyle = abyssGrad;
    ctx.fillRect(0, abyssTop, platform.leftEdge, abyssHeight);
    ctx.fillRect(platform.rightEdge, abyssTop, canvas.width - platform.rightEdge, abyssHeight);
    
    ctx.shadowColor = '#4a0080'; ctx.shadowBlur = 30;
    ctx.strokeStyle = 'rgba(100, 0, 150, 0.5)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(platform.leftEdge, abyssTop); ctx.lineTo(platform.leftEdge, canvas.height); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(platform.rightEdge, abyssTop); ctx.lineTo(platform.rightEdge, canvas.height); ctx.stroke();
    ctx.shadowBlur = 0;
    
    draw3DPlatform();
}

function draw3DPlatform() {
    // Calculate platform top based on player ground position for consistency
    var groundOffset = canvas.height - player.groundY;
    var platformTop = player.groundY -10; // Platform surface slightly above groundY
    var platformDepth = Math.max(15, Math.min(30, groundOffset * 0.3));
    
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
    
    var platformHeight = canvas.height - platformTop;
    var groundGrad = ctx.createLinearGradient(0, platformTop - 10, 0, platformTop + 30);
    groundGrad.addColorStop(0, '#5d4f8d'); groundGrad.addColorStop(0.3, '#4d3f7d');
    groundGrad.addColorStop(0.7, '#3d2f5d'); groundGrad.addColorStop(1, '#2a1a4e');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(platform.leftEdge, platformTop, platform.width, platformHeight);
    
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
    var dangerZoneWidth = Math.max(20, Math.min(40, platform.width * 0.05));
    var dangerGrad = ctx.createLinearGradient(platform.leftEdge - dangerZoneWidth, 0, platform.leftEdge, 0);
    dangerGrad.addColorStop(0, 'rgba(255, 0, 0, ' + (dangerAlpha * 0.5) + ')');
    dangerGrad.addColorStop(1, 'rgba(255, 0, 0, ' + dangerAlpha + ')');
    ctx.fillStyle = dangerGrad;
    ctx.fillRect(platform.leftEdge - dangerZoneWidth, platformTop, dangerZoneWidth, platformHeight);
    
    var dangerGrad2 = ctx.createLinearGradient(platform.rightEdge, 0, platform.rightEdge + dangerZoneWidth, 0);
    dangerGrad2.addColorStop(0, 'rgba(255, 0, 0, ' + dangerAlpha + ')');
    dangerGrad2.addColorStop(1, 'rgba(255, 0, 0, ' + (dangerAlpha * 0.5) + ')');
    ctx.fillStyle = dangerGrad2;
    ctx.fillRect(platform.rightEdge, platformTop, dangerZoneWidth, platformHeight);
}

function drawBuilding(b) {
    // Use player groundY for consistent building positioning
    var baseY = player.groundY + 10;
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

function drawStageTransition() {
    var progress = stageTransitionTimer / STAGE_TRANSITION_DURATION;
    
    // Dramatic flash effect at the start
    if (progress < 0.3) {
        var flashAlpha = (0.3 - progress) / 0.3;
        ctx.fillStyle = 'rgba(255, 0, 170, ' + (flashAlpha * 0.6) + ')';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = 'rgba(255, 255, 255, ' + (flashAlpha * 0.8) + ')';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    // Stage 2 announcement text
    if (progress > 0.1 && progress < 0.9) {
        var textAlpha = progress < 0.5 ? (progress - 0.1) / 0.4 : (0.9 - progress) / 0.4;
        var scale = 1 + Math.sin(progress * Math.PI * 4) * 0.1;
        var shake = Math.sin(progress * Math.PI * 20) * (1 - progress) * 10;
        
        ctx.save();
        ctx.translate(canvas.width / 2 + shake, canvas.height / 2);
        ctx.scale(scale, scale);
        
        // Glowing background for text
        ctx.shadowColor = '#ff00aa';
        ctx.shadowBlur = 50 + Math.sin(progress * Math.PI * 8) * 20;
        
        // Main text
        var fontSize = isMobile ? Math.max(36, canvas.width * 0.08) : 72;
        ctx.font = 'bold ' + fontSize + 'px Orbitron, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Text shadow layers
        ctx.fillStyle = 'rgba(255, 0, 0, ' + (textAlpha * 0.5) + ')';
        ctx.fillText('STAGE 2', 4, 4);
        
        ctx.fillStyle = 'rgba(0, 255, 255, ' + (textAlpha * 0.5) + ')';
        ctx.fillText('STAGE 2', -4, -4);
        
        // Main text
        ctx.fillStyle = 'rgba(255, 255, 255, ' + textAlpha + ')';
        ctx.fillText('STAGE 2', 0, 0);
        
        // Subtitle
        var subFontSize = isMobile ? Math.max(18, canvas.width * 0.04) : 28;
        ctx.font = 'bold ' + subFontSize + 'px Orbitron, sans-serif';
        ctx.fillStyle = 'rgba(255, 107, 157, ' + textAlpha + ')';
        ctx.shadowColor = '#ff6b9d';
        ctx.shadowBlur = 20;
        ctx.fillText('JUMP TO SURVIVE!', 0, fontSize * 0.7);
        
        ctx.restore();
        ctx.shadowBlur = 0;
    }
    
    // Pulsing border effect
    var borderAlpha = 0.3 + Math.sin(progress * Math.PI * 6) * 0.2;
    var borderWidth = 10 + Math.sin(progress * Math.PI * 4) * 5;
    
    ctx.strokeStyle = 'rgba(255, 0, 170, ' + borderAlpha + ')';
    ctx.lineWidth = borderWidth;
    ctx.shadowColor = '#ff00aa';
    ctx.shadowBlur = 30;
    ctx.strokeRect(borderWidth/2, borderWidth/2, canvas.width - borderWidth, canvas.height - borderWidth);
    ctx.shadowBlur = 0;
    
    // Corner flashes
    var cornerSize = 100 + Math.sin(progress * Math.PI * 8) * 30;
    var cornerAlpha = 0.4 * (1 - progress);
    
    ctx.fillStyle = 'rgba(255, 0, 170, ' + cornerAlpha + ')';
    // Top-left
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(cornerSize, 0);
    ctx.lineTo(0, cornerSize);
    ctx.closePath();
    ctx.fill();
    // Top-right
    ctx.beginPath();
    ctx.moveTo(canvas.width, 0);
    ctx.lineTo(canvas.width - cornerSize, 0);
    ctx.lineTo(canvas.width, cornerSize);
    ctx.closePath();
    ctx.fill();
    // Bottom-left
    ctx.beginPath();
    ctx.moveTo(0, canvas.height);
    ctx.lineTo(cornerSize, canvas.height);
    ctx.lineTo(0, canvas.height - cornerSize);
    ctx.closePath();
    ctx.fill();
    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(canvas.width, canvas.height);
    ctx.lineTo(canvas.width - cornerSize, canvas.height);
    ctx.lineTo(canvas.width, canvas.height - cornerSize);
    ctx.closePath();
    ctx.fill();
}

init();