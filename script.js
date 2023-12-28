const buttonPlayPause = document.getElementById('buttonPlayPause');
buttonPlayPause.onclick = () => {
    simulationRunning = !simulationRunning;
}

const buttonRestart = document.getElementById('buttonRestart');
buttonRestart.onclick = () => {
    restart();
}

const airock = document.getElementById('airock');
const aiscissors = document.getElementById('aiscissors');
const aipaper = document.getElementById('aipaper');
const countrock = document.getElementById('countrock');
const countscissors = document.getElementById('countscissors');
const countpaper = document.getElementById('countpaper');

const iso = new Isomer(document.getElementById("art"));

const WHITE = new Isomer.Color(150, 150, 150, 0.4);
const RED = new Isomer.Color(200, 100, 100, 0.6);
const GREEN = new Isomer.Color(100, 200, 100, 0.6);
const BLUE = new Isomer.Color(100, 100, 200, 0.6);

let simulationRunning = true;

const zDistance = ({x, y, size}) => {
    return Math.sqrt((x + size/2)**2 + (y + size/2)**2);
}

const isEnemy = (obj, other) => {
    return (obj.team === 'rock' && other.team === 'scissors') ||
           (obj.team === 'scissors' && other.team === 'paper') ||
           (obj.team === 'paper' && other.team === 'rock');
}

const angleTo = (current, target) => {
    const {x: currentX, y: currentY} = current;
    const {x: targetX, y: targetY} = target;
    const result = (2 * Math.PI + Math.atan2((targetY - currentY), (targetX - currentX))) % (2 * Math.PI);
    return result;
}

const distanceTo = (current, target) => {
    const {x: currentX, y: currentY} = current;
    const {x: targetX, y: targetY} = target;
    return Math.sqrt(((targetY - currentY)**2) + ((targetX - currentX)**2));
}

const nearestOfType = (obj, team) => {
    const filtered = objects.filter(obj => obj.team === team);
    if (filtered.length === 0) {
        return null;
    }
    filtered.sort((a, b) => {distanceTo(obj, a) - distanceTo(obj, b)});
    return filtered[0];
}

const hasWall = (objX, objY) => {
    const walls = objects.filter(obj => obj.type === 'wall');
    for (const wall of walls) {
        const {x, y, size} = wall;
        if (x < objX && objX < x + size && y < objY && objY < y + size) {
            return true;
        }
    }
    return false;
}

function makeGrid(xSize, ySize, zHeight, gridColor) {
    for (x = 0; x < xSize + 1; x++) {
        iso.add(new Isomer.Path([
        new Isomer.Point(x, 0, zHeight),
        new Isomer.Point(x, xSize, zHeight),
        new Isomer.Point(x, 0, zHeight)
        ]), gridColor);
    }
    for (y = 0; y < ySize + 1; y++) {
        iso.add(new Isomer.Path([
        new Isomer.Point(0, y, zHeight),
        new Isomer.Point(ySize, y, zHeight),
        new Isomer.Point(0, y, zHeight)
        ]), gridColor);
    }
}

let _id = 0;
let objects = [];

function clearObjects() {
    objects = [];
}

function addWall(x, y) {
    objects.push({
        type: 'wall',
        x,
        y,
        size: 1,
    })
}

function addRandomPlayer(team) {
    objects.push({
        type: 'player',
        id: _id++,
        team,
        x: Math.random() * 10,
        y: Math.random() * 10,
        angle: Math.random() * Math.PI,
        size: 0.25,
        commands: [],
    });
}

function draw() {
  if (simulationRunning) {
    ai();
    logic();
  }
  
  iso.canvas.clear();
  requestAnimationFrame(draw);
  makeGrid(10, 10, 0, WHITE);

  const orderedObjects = objects.sort((a,b) => zDistance(b) - zDistance(a));

  for (const obj of objects) {
    const {type, x, y, size, angle, team} = obj;

    if (type === 'player') {
        const color = (team === 'rock' ? RED : (team === 'paper' ? GREEN : BLUE)); 
        const position = Isomer.Point(x,y,0);
        const block = Isomer.Shape.Prism(position, size, size, size);
        iso.add(block.rotateZ(Isomer.Point(x+size/2, y+size/2, 0), angle), color);
    }
    else if (type === 'wall') {
        const color = WHITE;
        const position = Isomer.Point(x,y,0);
        const block = Isomer.Shape.Prism(position, size, size, 0.2);
        iso.add(block, color);
    }
  }
}

function logic() {
    const DISTANCE = 0.03;
    const TURN = 0.03;
    let teamChanges = {};
    let players = objects.filter(obj => obj.type === 'player');

    for (let idx=0; idx<players.length; idx+=1) {
        const obj = players[idx];
        if (!obj.commands) {
            continue;
        }

        for (const cmd of obj.commands) {
            if (cmd === 'forward') {
                const dx = Math.cos(obj.angle) * DISTANCE;
                const dy = Math.sin(obj.angle) * DISTANCE;
                if (!hasWall(obj.x + dx, obj.y + dy) && !hasWall(obj.x + dx + obj.size, obj.y + dy) && !hasWall(obj.x + dx, obj.y + dy + obj.size) && !hasWall(obj.x + dx + obj.size, obj.y + dy + obj.size)) {
                    obj.x += dx;
                    obj.y += dy;
                }
            }
            else if (cmd === 'left') {
                obj.angle = (obj.angle + TURN);
            }
            else if (cmd === 'right') {
                obj.angle = (obj.angle - TURN);
            }
            else if (cmd.startsWith('team-')) {
                obj.team = cmd.substr(5);
            }
        }

        for (let jdx=idx+1; jdx<players.length; jdx+=1) {
            const other = players[jdx];
            const distance = distanceTo(obj, other);
            if (obj.team !== other.team && isEnemy(obj, other) && distance < obj.size + other.size) {
                teamChanges[other.id] = obj.team;
            }
        }
        
        if (obj.angle < 0) {
            obj.angle += Math.PI * 2;
        }
        obj.angle %= (Math.PI * 2);
    }

    for (const [key, value] of Object.entries(teamChanges)) {
        const obj = objects.find(obj => obj.id == key);
        obj.team = value;
    }
}

function ai() {
    for (let obj of objects.filter(o => o.type === 'player')) {
        obj.commands = [];
        let body = '';
        if (obj.team === 'rock') {
            body = airock.value;
        } else if (obj.team === 'scissors') {
            body = aiscissors.value;
        } else if (obj.team === 'paper') {
            body = aipaper.value;
        }
        try {
            let fn = eval(body);
            let result = fn(obj);
            obj.commands = result;
        }
        catch {
            console.log('failed ai', obj)
            // pass
        }
    }
}

// ---
function restart() {
    clearObjects();
    addWall(3, 3);
    addWall(5, 5);
    addWall(7, 7);
    for (let i=0; i<countrock.value; i++) {
        addRandomPlayer('rock');
    }
    for (let i=0; i<countscissors.value; i++) {
        addRandomPlayer('scissors');
    }
    for (let i=0; i<countpaper.value; i++) {
        addRandomPlayer('paper');
    }
}

restart();
draw();
