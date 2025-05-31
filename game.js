document.addEventListener('DOMContentLoaded', function() {
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
    isInvincible: false,
    invincibleTimer: 0,
    blink: false,
};

// 입력
const keys = {};
document.addEventListener('keydown', e => keys[e.key] = true);
document.addEventListener('keyup', e => keys[e.key] = false);

// 투사체
let projectiles = [];
let projectileCount = 1; // 한 번에 쏘는 탄환 수

// 적
let enemies = [];
let enemyTypes = [
    { color: '#e74c3c', speed: 1.2, hp: 1 }, // 기본
    { color: '#f1c40f', speed: 0.8, hp: 2 }, // 탱커
    { color: '#8e44ad', speed: 1.6, hp: 0.7 }, // 빠름
];

// 아이템
let items = [];
const ITEM_RADIUS = 12;

// 장애물
let obstacles = [];
const OBSTACLE_RADIUS = 24;
const OBSTACLE_TYPES = [
    { color: '#8d5524' }, // 바위(갈색)
    { color: '#228B22' }, // 나무(초록)
];
let lastObstacleSpawn = 0;
const obstacleSpawnInterval = 6000; // ms

// 게임 상태
let score = 0;
let time = 0;
let lastEnemySpawn = 0;
let enemySpawnInterval = 1200;
let gameOver = false;
let startTime = null;
let lastAutoShot = 0;
let autoShotInterval = 2000; // ms (최소 200)

function resetGame() {
    player.x = width / 2;
    player.y = height / 2;
    player.hp = 3.0;
    player.isInvincible = false;
    player.invincibleTimer = 0;
    projectileCount = 1;
    autoShotInterval = 2000;
    projectiles = [];
    enemies = [];
    items = [];
    obstacles = [];
    score = 0;
    time = 0;
    lastEnemySpawn = 0;
    enemySpawnInterval = 1200;
    gameOver = false;
    startTime = null;
    lastAutoShot = 0;
    lastObstacleSpawn = 0;
    document.getElementById('restartBtn').style.display = 'none';
    loop(performance.now());
}

document.getElementById('restartBtn').onclick = resetGame;

function shootProjectile(targetX, targetY, count = 1) {
    const angle = Math.atan2(targetY - player.y, targetX - player.x);
    const spread = Math.PI / 12; // 15도
    let startAngle = angle - (spread * (count - 1) / 2);
    for (let i = 0; i < count; i++) {
        let a = startAngle + spread * i;
        projectiles.push({
            x: player.x,
            y: player.y,
            dx: Math.cos(a) * 6,
            dy: Math.sin(a) * 6,
            r: 6,
        });
    }
}

canvas.addEventListener('click', e => {
    if (gameOver) return;
    const rect = canvas.getBoundingClientRect();
    shootProjectile(e.clientX - rect.left, e.clientY - rect.top, projectileCount);
});

function autoShoot(now) {
    if (now - lastAutoShot >= autoShotInterval && enemies.length > 0) {
        // 가장 가까운 적 찾기
        let minDist = Infinity;
        let target = null;
        for (let e of enemies) {
            let dist = Math.hypot(e.x - player.x, e.y - player.y);
            if (dist < minDist) {
                minDist = dist;
                target = e;
            }
        }
        if (target) {
            shootProjectile(target.x, target.y, projectileCount);
            lastAutoShot = now;
        }
    }
}

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

function spawnObstacle() {
    // 맵 바깥에서 랜덤 위치로 스폰
    let edge = Math.floor(Math.random() * 4);
    let ox, oy;
    if (edge === 0) { ox = 0; oy = Math.random() * height; }
    else if (edge === 1) { ox = width; oy = Math.random() * height; }
    else if (edge === 2) { ox = Math.random() * width; oy = 0; }
    else { ox = Math.random() * width; oy = height; }
    let type = OBSTACLE_TYPES[Math.floor(Math.random() * OBSTACLE_TYPES.length)];
    obstacles.push({ x: ox, y: oy, r: OBSTACLE_RADIUS, color: type.color });
}

function update(dt, now) {
    // 플레이어 이동
    let dx = 0, dy = 0;
    if (keys['w'] || keys['ArrowUp']) dy -= 1;
    if (keys['s'] || keys['ArrowDown']) dy += 1;
    if (keys['a'] || keys['ArrowLeft']) dx -= 1;
    if (keys['d'] || keys['ArrowRight']) dx += 1;
    let nextX = player.x, nextY = player.y;
    if (dx !== 0 || dy !== 0) {
        const len = Math.sqrt(dx * dx + dy * dy);
        nextX += (dx / len) * player.speed;
        nextY += (dy / len) * player.speed;
        // 장애물 충돌 체크
        let collides = obstacles.some(o => Math.hypot(o.x - nextX, o.y - nextY) < o.r + player.r);
        if (!collides) {
            player.x = Math.max(player.r, Math.min(width - player.r, nextX));
            player.y = Math.max(player.r, Math.min(height - player.r, nextY));
        }
    }
    // 무적 타이머
    if (player.isInvincible) {
        player.invincibleTimer -= dt;
        player.blink = Math.floor(player.invincibleTimer / 100) % 2 === 0;
        if (player.invincibleTimer <= 0) {
            player.isInvincible = false;
            player.blink = false;
        }
    }
    // 자동 공격
    autoShoot(now);
    // 투사체 이동
    projectiles.forEach(p => {
        p.x += p.dx;
        p.y += p.dy;
    });
    // 투사체 화면 밖 제거
    projectiles = projectiles.filter(p => p.x > -10 && p.x < width + 10 && p.y > -10 && p.y < height + 10);
    // 적 이동 및 장애물 충돌
    enemies.forEach(e => {
        const angle = Math.atan2(player.y - e.y, player.x - e.x);
        let nx = e.x + Math.cos(angle) * e.speed;
        let ny = e.y + Math.sin(angle) * e.speed;
        let collides = obstacles.some(o => Math.hypot(o.x - nx, o.y - ny) < o.r + e.r);
        if (!collides) {
            e.x = nx;
            e.y = ny;
        }
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
    // 적 제거(죽음) 및 아이템 드랍
    for (let i = enemies.length - 1; i >= 0; i--) {
        if (enemies[i].hp <= 0) {
            score += 1;
            // 30% 확률로 아이템 드랍
            if (Math.random() < 0.3) {
                let ix = enemies[i].x + (Math.random() - 0.5) * 20;
                let iy = enemies[i].y + (Math.random() - 0.5) * 20;
                items.push({ x: ix, y: iy, r: ITEM_RADIUS, color: '#f9d423', timer: 6000 });
            }
            enemies.splice(i, 1);
        }
    }
    // 아이템 획득 처리
    for (let i = items.length - 1; i >= 0; i--) {
        items[i].timer -= dt;
        if (Math.hypot(player.x - items[i].x, player.y - items[i].y) < player.r + items[i].r) {
            // 50% 확률로 발사속도 0.3초 단축(최소 0.2초), 50% 확률로 탄환 수 +1
            if (Math.random() < 0.5 && autoShotInterval > 200) {
                autoShotInterval = Math.max(200, autoShotInterval - 300);
            } else {
                projectileCount++;
            }
            items.splice(i, 1);
        } else if (items[i].timer <= 0) {
            items.splice(i, 1);
        }
    }
    // 적과 플레이어 충돌
    enemies.forEach(e => {
        if (!player.isInvincible && Math.hypot(e.x - player.x, e.y - player.y) < e.r + player.r) {
            player.hp -= 0.5;
            player.isInvincible = true;
            player.invincibleTimer = 3000; // 3초
        }
    });
    // 장애물 스폰
    lastObstacleSpawn += dt;
    if (lastObstacleSpawn > obstacleSpawnInterval) {
        spawnObstacle();
        lastObstacleSpawn = 0;
    }
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

function drawGrassBackground() {
    // 초원 배경
    ctx.fillStyle = '#a8e063';
    ctx.fillRect(0, 0, width, height);
    // 랜덤 잔디/꽃
    for (let i = 0; i < 80; i++) {
        let gx = Math.random() * width;
        let gy = Math.random() * height;
        ctx.fillStyle = Math.random() < 0.8 ? '#7bc043' : '#fdf498';
        ctx.beginPath();
        ctx.arc(gx, gy, Math.random() * 2 + 1, 0, Math.PI * 2);
        ctx.fill();
    }
}

function draw() {
    drawGrassBackground();
    // 장애물
    obstacles.forEach(o => {
        ctx.beginPath();
        ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
        ctx.fillStyle = o.color;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#333';
        ctx.stroke();
    });
    // 아이템
    items.forEach(it => {
        ctx.beginPath();
        ctx.arc(it.x, it.y, it.r, 0, Math.PI * 2);
        ctx.fillStyle = it.color;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#fff';
        ctx.stroke();
    });
    // 플레이어
    ctx.save();
    if (!player.blink) {
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2);
        ctx.fillStyle = '#3498db';
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#fff';
        ctx.stroke();
    }
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
    if (!gameOver) update(dt, now);
    draw();
    document.getElementById('time').textContent = 'Time: ' + time.toFixed(1);
    document.getElementById('hp').textContent = 'HP: ' + player.hp.toFixed(1);
    document.getElementById('score').textContent = 'Score: ' + score;
    if (!gameOver) requestAnimationFrame(loop);
}

resetGame();
});
