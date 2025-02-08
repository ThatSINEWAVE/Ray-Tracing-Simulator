const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
let width = canvas.width = window.innerWidth - 300;
let height = canvas.height = window.innerHeight;

let showRays = true;
let rayCount = 100;
let rayDensity = 50;
let maxReflections = 5;
let rayLength = 1500;
let selectedElement = null;
let offsetX = 0, offsetY = 0;

class LightSource {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 15;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'yellow';
        ctx.fill();
    }
}

class ReflectiveObject {
    constructor(x, y, length, angle, type, color, material = 'reflective') {
        this.x = x;
        this.y = y;
        this.length = length;
        this.angle = angle;
        this.type = type;
        this.color = color;
        this.material = material;
        this.width = 5;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        if (this.type === 'mirror') {
            ctx.fillStyle = this.color;
            ctx.fillRect(-this.length/2, -this.width/2, this.length, this.width);
        } else if (this.type === 'circle') {
            ctx.beginPath();
            ctx.arc(0, 0, this.length/2, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
        }

        ctx.restore();
    }

    contains(x, y) {
        if (this.type === 'circle') {
            const dx = x - this.x;
            const dy = y - this.y;
            return dx*dx + dy*dy <= (this.length/2)*(this.length/2);
        }

        const rotatedX = Math.cos(-this.angle)*(x - this.x) - Math.sin(-this.angle)*(y - this.y);
        const rotatedY = Math.sin(-this.angle)*(x - this.x) + Math.cos(-this.angle)*(y - this.y);
        return Math.abs(rotatedX) <= this.length/2 && Math.abs(rotatedY) <= this.width/2;
    }

    getNormalAt(x, y) {
        if (this.type === 'circle') {
            const dx = x - this.x;
            const dy = y - this.y;
            const len = Math.sqrt(dx*dx + dy*dy);
            return { x: dx/len, y: dy/len };
        }

        return {
            x: Math.cos(this.angle + Math.PI/2),
            y: Math.sin(this.angle + Math.PI/2)
        };
    }
}

let lightSources = [new LightSource(width/2, height/2)];
let objects = [
    new ReflectiveObject(width/2 + 200, height/2, 200, Math.PI/4, 'mirror', '#ffffff'),
    new ReflectiveObject(width/2 - 200, height/2, 100, -Math.PI/4, 'circle', '#ff0000')
];

// Event Listeners
canvas.addEventListener('mousedown', startDrag);
canvas.addEventListener('mousemove', drag);
canvas.addEventListener('mouseup', endDrag);
canvas.addEventListener('contextmenu', handleRightClick);
document.getElementById('showRays').addEventListener('change', (e) => showRays = e.target.checked);
document.getElementById('rayCount').addEventListener('input', (e) => rayCount = parseInt(e.target.value));
document.getElementById('rayDensity').addEventListener('input', (e) => rayDensity = parseInt(e.target.value));
document.getElementById('maxReflections').addEventListener('input', (e) => maxReflections = parseInt(e.target.value));
document.getElementById('rayLength').addEventListener('input', (e) => rayLength = parseInt(e.target.value));
document.getElementById('addObject').addEventListener('click', addObject);
document.getElementById('addSource').addEventListener('click', addSource);
document.getElementById('deleteElement').addEventListener('click', deleteSelected);
document.addEventListener('keydown', handleKeyPress);

function addObject() {
    const type = document.getElementById('objectType').value;
    const color = document.getElementById('objectColor').value;
    const material = document.getElementById('objectMaterial').value;
    objects.push(new ReflectiveObject(
        width/2, height/2,
        type === 'circle' ? 50 : 200,
        Math.random() * Math.PI,
        type,
        color,
        material
    ));
}

function addSource() {
    lightSources.push(new LightSource(width/2, height/2));
}

function deleteSelected() {
    if (!selectedElement) return;

    if (selectedElement instanceof LightSource) {
        lightSources = lightSources.filter(src => src !== selectedElement);
    } else {
        objects = objects.filter(obj => obj !== selectedElement);
    }
    selectedElement = null;
}

function handleRightClick(e) {
    e.preventDefault();
    startDrag(e);
    deleteSelected();
}

function handleKeyPress(e) {
    if (e.key === 'Delete') deleteSelected();
}

function startDrag(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    for (let source of lightSources) {
        const dx = x - source.x;
        const dy = y - source.y;
        if (dx*dx + dy*dy <= source.radius*source.radius) {
            selectedElement = source;
            offsetX = x - source.x;
            offsetY = y - source.y;
            return;
        }
    }

    for (let obj of objects) {
        if (obj.contains(x, y)) {
            selectedElement = obj;
            offsetX = x - obj.x;
            offsetY = y - obj.y;
            return;
        }
    }
}

function drag(e) {
    if (!selectedElement) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    selectedElement.x = x - offsetX;
    selectedElement.y = y - offsetY;
}

function endDrag() {
    selectedElement = null;
}

function castRays(source) {
    const angleStep = (Math.PI * 2) * (rayDensity/100) / rayCount;
    for (let i = 0; i < rayCount; i++) {
        const angle = i * angleStep;
        let ray = {
            x: source.x,
            y: source.y,
            dx: Math.cos(angle),
            dy: Math.sin(angle),
            reflections: 0
        };

        let currentLength = 0;

        while (currentLength < rayLength && ray.reflections < maxReflections) {
            const nextX = ray.x + ray.dx * (rayLength - currentLength);
            const nextY = ray.y + ray.dy * (rayLength - currentLength);

            let closestIntersection = null;
            let closestObj = null;

            for (const obj of objects) {
                const intersection = getIntersection(ray, obj);
                if (intersection && intersection.t > 0 && (!closestIntersection || intersection.t < closestIntersection.t)) {
                    closestIntersection = intersection;
                    closestObj = obj;
                }
            }

            if (closestIntersection && closestIntersection.t <= (rayLength - currentLength)) {
                if (showRays) {
                    drawRay(ray.x, ray.y, closestIntersection.x, closestIntersection.y);
                }

                if (closestObj.material === 'reflective') {
                    const normal = closestObj.getNormalAt(closestIntersection.x, closestIntersection.y);
                    const dot = 2 * (ray.dx * normal.x + ray.dy * normal.y);
                    ray.dx = ray.dx - dot * normal.x;
                    ray.dy = ray.dy - dot * normal.y;
                    ray.reflections++;
                } else {
                    break;
                }

                ray.x = closestIntersection.x;
                ray.y = closestIntersection.y;
                currentLength += closestIntersection.t;
            } else {
                if (showRays) {
                    drawRay(ray.x, ray.y, nextX, nextY);
                }
                break;
            }
        }
    }
}

function getIntersection(ray, obj) {
    if (obj.type === 'circle') {
        return circleIntersection(ray, obj);
    } else {
        return lineIntersection(ray, obj);
    }
}

function circleIntersection(ray, circle) {
    const dx = ray.x - circle.x;
    const dy = ray.y - circle.y;
    const a = ray.dx * ray.dx + ray.dy * ray.dy;
    const b = 2 * (ray.dx * dx + ray.dy * dy);
    const c = dx * dx + dy * dy - (circle.length/2) ** 2;
    const discriminant = b * b - 4 * a * c;

    if (discriminant < 0) return null;

    const sqrtDisc = Math.sqrt(discriminant);
    const t1 = (-b - sqrtDisc) / (2 * a);
    const t2 = (-b + sqrtDisc) / (2 * a);

    if (t1 >= 0) return { x: ray.x + ray.dx * t1, y: ray.y + ray.dy * t1, t: t1 };
    if (t2 >= 0) return { x: ray.x + ray.dx * t2, y: ray.y + ray.dy * t2, t: t2 };
    return null;
}

function lineIntersection(ray, mirror) {
    const cos = Math.cos(mirror.angle);
    const sin = Math.sin(mirror.angle);
    const x1 = mirror.x - mirror.length/2 * cos;
    const y1 = mirror.y - mirror.length/2 * sin;
    const x2 = mirror.x + mirror.length/2 * cos;
    const y2 = mirror.y + mirror.length/2 * sin;

    const x3 = ray.x;
    const y3 = ray.y;
    const x4 = ray.x + ray.dx;
    const y4 = ray.y + ray.dy;

    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (denom === 0) return null;

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

    if (t >= 0 && t <= 1 && u >= 0) {
        return {
            x: x1 + t * (x2 - x1),
            y: y1 + t * (y2 - y1),
            t: u
        };
    }
    return null;
}

function drawRay(x1, y1, x2, y2) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.stroke();
}

function animate() {
    ctx.clearRect(0, 0, width, height);

    objects.forEach(obj => obj.draw());
    lightSources.forEach(source => source.draw());

    if (selectedElement) {
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        if (selectedElement instanceof LightSource) {
            ctx.beginPath();
            ctx.arc(selectedElement.x, selectedElement.y, selectedElement.radius + 2, 0, Math.PI * 2);
            ctx.stroke();
        } else {
            ctx.save();
            ctx.translate(selectedElement.x, selectedElement.y);
            ctx.rotate(selectedElement.angle);
            ctx.strokeRect(-selectedElement.length/2 - 2, -selectedElement.width/2 - 2, selectedElement.length + 4, selectedElement.width + 4);
            ctx.restore();
        }
    }

    lightSources.forEach(source => castRays(source));

    requestAnimationFrame(animate);
}

animate();

window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth - 300;
    height = canvas.height = window.innerHeight;
});