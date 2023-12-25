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

const iso = new Isomer(document.getElementById("art"));

const WHITE = new Isomer.Color(150, 150, 150, 0.4);
const RED = new Isomer.Color(200, 100, 100, 0.6);
const GREEN = new Isomer.Color(100, 200, 100, 0.6);
const BLUE = new Isomer.Color(100, 100, 200, 0.6);

let simulationRunning = true;

const angleTo = (currentX, currentY, targetX, targetY) => {
    return (2 * Math.PI + Math.atan2((targetY - currentY), (targetX - currentX))) % (2 * Math.PI);
}

const distanceTo = (currentX, currentY, targetX, targetY) => {
    return Math.sqrt(((targetY - currentY)**2) + ((targetX - currentX)**2));
}

const nearestOfType = (currentX, currentY, team) => {
    const filtered = objects.filter(obj => obj.team === team);
    if (filtered.length === 0) {
        return null;
    }
    filtered.sort((a, b) => {distanceTo(currentX, currentY, a.x, a.y) - distanceTo(currentX, currentY, b.x, b.y)});
    return filtered[0];
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

function addRandomObject(team) {
    objects.push({
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

  for (const obj of objects) {
    const {x, y, size, angle, team} = obj;
    const color = (team === 'rock' ? RED : (team === 'paper' ? GREEN : BLUE)); 
    const position = Isomer.Point(x,y,0);
    const block = Isomer.Shape.Prism(position, size, size, size);
    iso.add(block.rotateZ(Isomer.Point(x+size/2, y+size/2, 0), angle), color);
  }
}

function logic() {
    const DISTANCE = 0.03;
    const TURN = 0.03;
    let teamChanges = {};

    for (let idx=0; idx<objects.length; idx+=1) {
        const obj = objects[idx];
        if (!obj.commands) {
            continue;
        }

        for (const cmd of obj.commands) {
            if (cmd === 'forward') {
                const dx = Math.cos(obj.angle) * DISTANCE;
                const dy = Math.sin(obj.angle) * DISTANCE;
                obj.x += dx;
                obj.y += dy;
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

        for (let jdx=idx+1; jdx<objects.length; jdx+=1) {
            const other = objects[jdx];
            if (obj.team !== other.team) {
                const distance = distanceTo(obj.x, obj.y, other.x, other.y);
                if (distance < obj.size + other.size) {
                    teamChanges[other.id] = obj.team;
                }
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

function evalInContext(js, context) {
    let x = (() => { return eval(js); }).call(context);
}

function ai() {
    for (const obj of objects) {
        obj.commands = [];
        let body = '';
        if (obj.team === 'rock') {
            body = airock.value;
        } else if (obj.team === 'scissors') {
            body = aiscissors.value;
        } else {
            body = aipaper.value;
        }
        try {
            let fn = eval(body);
            let result = fn(obj);
            obj.commands = result;
        }
        catch {
            // pass
        }
    }
}

// ---
function restart() {
    clearObjects();
    for (let i=0; i<10; i++) {
        addRandomObject('rock');
        addRandomObject('scissors');
        addRandomObject('paper');
    }
}

restart();
draw();
