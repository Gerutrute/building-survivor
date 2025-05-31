const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const width = canvas.width;
const height = canvas.height;

// 플레이어
const player = {
    x: width / 2,
    y: height / 2,
    r: 16,
    speed: 3,
    hp: 3.0,
    lastShot: 0,
    shotDelay: 350, // ms
};

// 입력
const keys = {};
document.addEventListener('keydown', e => keys[e.key] = true);
document.addEventListener('keyup', e => keys[e.key] = false);

// 투사체
let projectiles = [];

// 적
let enemies = [];
let enemyTypes = [
    { color: '#e74c3c', speed: 1.2, hp: 1 }, // 기본
    { color: '#f1c40f', speed: 0.8, hp: 2 }, // 탱커
    { color: '#8e44ad', speed: 1.6, hp: 0.7 }, // 빠름
];

// 게임 상태
let score = 0;
let time = 0;
let lastEnemySpawn = 0;
let enemySpawnInterval = 1200;
let gameOver = false;
let startTime = null;

function resetGame() {
    player.x = width / 2;
    player.y = height / 2;
    player.hp = 3.0;
    projectiles = [];
    enemies = [];
    score = 0;
    time = 0;
    lastEnemySpawn = 0;
    enemySpawnInterval = 1200;
    gameOver = false;
    startTime = null;
    document.getElementById('restartBtn').style.display = 'none';
    loop(performance.now());
}

document.getElementById('restartBtn').onclick = resetGame;

function shootProjectile(targetX, targetY) {
    const angle = Math.atan2(targetY - player.y, targetX - player.x);
    projectiles.push({
        x: player.x,
        y: player.y,
        dx: Math.cos(angle) * 6,
        dy: Math.sin(angle) * 6,
        r: 6,
    });
}

canvas.addEventListener('click', e => {
    if (gameOver) return;
    const rect = canvas.getBoundingClientRect();
    shootProjectile(e.clientX - rect.left, e.clientY - rect.top);
});

function spawnEnemy() {
    // 난이도 증가: 시간에 따라 종류, 체력, 속도 증가
    const elapsed = Math.floor(time / 10);
    let typeIdx = 0;
    if (elapsed > 40) typeIdx = 2;
    else if (elapsed > 20) typeIdx = 1;
    const type = enemyTypes[typeIdx];
    // 랜덤 가장자리
    let edge = Math.floor(Math.random() * 4);
    let ex, ey;
    if (edge === 0) { ex = 0; ey = Math.random() * height; }
    else if (edge === 1) { ex = width; ey = Math.random() * height; }
    else if (edge === 2) { ex = Math.random() * width; ey = 0; }
    else { ex = Math.random() * width; ey = height; }
    enemies.push({
        x: ex,
        y: ey,
        r: 16,
        color: type.color,
        speed: type.speed + Math.random() * 0.3 + time * 0.002,
        hp: type.hp + time * 0.03,
        maxHp: type.hp + time * 0.03,
    });
}

function update(dt) {
    // 플레이어 이동
    let dx = 0, dy = 0;
    if (keys['w'] || keys['ArrowUp']) dy -= 1;
    if (keys['s'] || keys['ArrowDown']) dy += 1;
    if (keys['a'] || keys['ArrowLeft']) dx -= 1;
    if (keys['d'] || keys['ArrowRight']) dx += 1;
    if (dx !== 0 || dy !== 0) {
        const len = Math.sqrt(dx * dx + dy * dy);
        player.x += (dx / len) * player.speed;
        player.y += (dy / len) * player.speed;
        player.x = Math.max(player.r, Math.min(width - player.r, player.x));
        player.y = Math.max(player.r, Math.min(height - player.r, player.y));
    }
    // 투사체 이동
    projectiles.forEach(p => {
        p.x += p.dx;
        p.y += p.dy;
    });
    // 투사체 화면 밖 제거
    projectiles = projectiles.filter(p => p.x > -10 && p.x < width + 10 && p.y > -10 && p.y < height + 10);
    // 적 이동
    enemies.forEach(e => {
        const angle = Math.atan2(player.y - e.y, player.x - e.x);
        e.x += Math.cos(angle) * e.speed;
        e.y += Math.sin(angle) * e.speed;
    });
    // 적과 투사체 충돌
    enemies.forEach(e => {
        projectiles.forEach(p => {
            if (Math.hypot(e.x - p.x, e.y - p.y) < e.r + p.r) {
                e.hp -= 1;
                p.hit = true;
            }
        });
    });
    projectiles = projectiles.filter(p => !p.hit);
    // 적 제거(죽음)
    for (let i = enemies.length - 1; i >= 0; i--) {
        if (enemies[i].hp <= 0) {
            score += 1;
            enemies.splice(i, 1);
        }
    }
    // 적과 플레이어 충돌
    enemies.forEach(e => {
        if (Math.hypot(e.x - player.x, e.y - player.y) < e.r + player.r) {
            player.hp -= 0.5;
            e.hp = -999;
        }
    });
    // 시간, 난이도 증가
    time += dt / 1000;
    if (time - lastEnemySpawn > enemySpawnInterval / 1000) {
        for (let i = 0; i < 1 + Math.floor(time / 15); i++) spawnEnemy();
        lastEnemySpawn = time;
        if (enemySpawnInterval > 400) enemySpawnInterval -= 10;
    }
    // 게임 오버
    if (player.hp <= 0 && !gameOver) {
        gameOver = true;
        document.getElementById('restartBtn').style.display = 'inline-block';
    }
}

function draw() {
    ctx.clearRect(0, 0, width, height);
    // 플레이어
    ctx.save();
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2);
    ctx.fillStyle = '#3498db';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#fff';
    ctx.stroke();
    ctx.restore();
    // 투사체
    projectiles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
    });
    // 적
    enemies.forEach(e => {
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
        ctx.fillStyle = e.color;
        ctx.fill();
        // HP bar
        ctx.fillStyle = '#000';
        ctx.fillRect(e.x - 16, e.y - 22, 32, 5);
        ctx.fillStyle = '#2ecc40';
        ctx.fillRect(e.x - 16, e.y - 22, 32 * (e.hp / e.maxHp), 5);
    });
    // 게임오버
    if (gameOver) {
        ctx.save();
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, width, height);
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = '#fff';
        ctx.font = '40px Arial';
        ctx.fillText('Game Over', width/2 - 110, height/2);
        ctx.font = '24px Arial';
        ctx.fillText('Score: ' + score, width/2 - 50, height/2 + 40);
        ctx.restore();
    }
}

function loop(now) {
    if (!startTime) startTime = now;
    let dt = now - startTime;
    startTime = now;
    if (!gameOver) update(dt);
    draw();
    document.getElementById('time').textContent = 'Time: ' + time.toFixed(1);
    document.getElementById('hp').textContent = 'HP: ' + player.hp.toFixed(1);
    document.getElementById('score').textContent = 'Score: ' + score;
    if (!gameOver) requestAnimationFrame(loop);
}

resetGame();
