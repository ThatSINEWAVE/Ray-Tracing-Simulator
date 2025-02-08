const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
let width = canvas.width = window.innerWidth - 300;
let height = canvas.height = window.innerHeight;

// Configuration
let showRays = true;
let rayCount = 50;
let rayDensity = 50;
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
    constructor(x, y, length, angle, type, color) {
        this.x = x;
        this.y = y;
        this.length = length;
        this.angle = angle;
        this.type = type;
        this.color = color;
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

        // For mirrors (line segment)
        const rotatedX = Math.cos(-this.angle)*(x - this.x) - Math.sin(-this.angle)*(y - this.y);
        const rotatedY = Math.sin(-this.angle)*(x - this.x) + Math.cos(-this.angle)*(y - this.y);
        return Math.abs(rotatedX) <= this.length/2 && Math.abs(rotatedY) <= this.width/2;
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
document.getElementById('showRays').addEventListener('change', (e) => showRays = e.target.checked);
document.getElementById('rayCount').addEventListener('input', (e) => rayCount = e.target.value);
document.getElementById('rayDensity').addEventListener('input', (e) => rayDensity = e.target.value);
document.getElementById('addObject').addEventListener('click', addObject);
document.getElementById('addSource').addEventListener('click', addSource);

function addObject() {
    const type = document.getElementById('objectType').value;
    const color = document.getElementById('objectColor').value;
    objects.push(new ReflectiveObject(
        width/2, height/2,
        type === 'circle' ? 50 : 200,
        Math.random() * Math.PI,
        type,
        color
    ));
}

function addSource() {
    lightSources.push(new LightSource(width/2, height/2));
}

function startDrag(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check light sources first
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

    // Check objects
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
            dy: Math.sin(angle)
        };

        for (let step = 0; step < 100; step++) {
            const nextX = ray.x + ray.dx;
            const nextY = ray.y + ray.dy;

            let closestIntersection = null;
            let closestObj = null;

            for (const obj of objects) {
                if (obj.type === 'mirror') {
                    const intersection = lineIntersection(ray, obj);
                    if (intersection && (!closestIntersection || intersection.t < closestIntersection.t)) {
                        closestIntersection = intersection;
                        closestObj = obj;
                    }
                }
            }

            if (closestIntersection) {
                if (showRays) {
                    drawRay(ray.x, ray.y, closestIntersection.x, closestIntersection.y);
                }

                // Reflect the ray
                const normal = getNormal(closestObj, closestIntersection);
                const dot = 2 * (ray.dx * normal.x + ray.dy * normal.y);
                ray.dx = ray.dx - dot * normal.x;
                ray.dy = ray.dy - dot * normal.y;
                ray.x = closestIntersection.x;
                ray.y = closestIntersection.y;
            } else {
                if (showRays) {
                    drawRay(ray.x, ray.y, nextX, nextY);
                }
                break;
            }
        }
    }
}

function drawRay(x1, y1, x2, y2) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.stroke();
}

function lineIntersection(ray, mirror) {
    // Implementation of line segment intersection detection
    // Returns intersection point if exists
    // (This is a simplified version, actual implementation would need proper math)
}

function getNormal(mirror, intersection) {
    // Returns the normal vector at the intersection point
    // (Implementation depends on object type)
}

function animate() {
    ctx.clearRect(0, 0, width, height);

    // Draw objects
    objects.forEach(obj => obj.draw());

    // Draw light sources
    lightSources.forEach(source => source.draw());

    // Cast rays from all sources
    lightSources.forEach(source => castRays(source));

    requestAnimationFrame(animate);
}

animate();

// Window resize handling
window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth - 300;
    height = canvas.height = window.innerHeight;
});