const CURSOR_SIZE = 36; 
const cursorEl = document.getElementById('cursor-img');
cursorEl.style.width  = CURSOR_SIZE + 'px';
cursorEl.style.height = CURSOR_SIZE + 'px';

let hasMouse = false;
document.addEventListener('mousemove', e => {
if (!hasMouse) { hasMouse = true; cursorEl.style.display = 'block'; }
cursorEl.style.left = e.clientX + 'px';
cursorEl.style.top  = e.clientY + 'px';
}, { passive: true });

const PAW_EMOJI = '🐾';

let lastPaw = 0;

function spawnPaw(x, y) {
const el = document.createElement('div');
el.className = 'paw';
el.setAttribute('aria-hidden', 'true');
el.textContent = PAW_EMOJI;
const rot = (Math.random() - 0.5) * 40;
el.style.transform = `translate(-50%, -50%) rotate(${rot}deg)`;
el.style.animation = 'none';
el.style.opacity = '0.85';
setTimeout(() => { el.style.transition = 'opacity 1s ease'; el.style.opacity = '0'; }, 200);
el.style.left = x + 'px';
el.style.top  = y + 'px';
el.style.fontSize = (15 + Math.random() * 8) + 'px';
document.body.appendChild(el);
setTimeout(() => el.remove(), 1500);
}

document.addEventListener('mousemove', e => {
const now = Date.now();
if (now - lastPaw > 60) { lastPaw = now; spawnPaw(e.clientX, e.clientY); }
}, { passive: true });

// Touch: paw bursts on tap
document.addEventListener('touchstart', e => {
for (const t of e.touches) {
    spawnPaw(t.clientX, t.clientY);
    spawnPaw(t.clientX + 12, t.clientY + 10);
    spawnPaw(t.clientX - 10, t.clientY + 16);
}
}, { passive: true });

// ================================================================
// TYPEWRITER VERB ROTATION (backspace then retype, no cursor shown)
// ================================================================
const VERBS = [
'understand', 'educate', 'delight',
'empower', 'connect', 'speak to'
];
const verbEl = document.getElementById('rotating-verb');
let verbIdx = 0;
const BACKSPACE_DELAY = 60;   // ms per character deleted
const TYPE_DELAY      = 80;   // ms per character typed
const PAUSE_AFTER     = 2400; // ms to hold the completed word

function deleteText(cb) {
const current = verbEl.textContent;
if (current.length === 0) { cb(); return; }
verbEl.textContent = current.slice(0, -1);
setTimeout(() => deleteText(cb), BACKSPACE_DELAY);
}

function typeText(word, cb) {
let i = 0;
function step() {
    if (i >= word.length) { cb(); return; }
    verbEl.textContent += word[i++];
    setTimeout(step, TYPE_DELAY);
}
step();
}

function cycleVerb() {
verbIdx = (verbIdx + 1) % VERBS.length;
deleteText(() => {
    typeText(VERBS[verbIdx], () => {
    setTimeout(cycleVerb, PAUSE_AFTER);
    });
});
}

setTimeout(cycleVerb, PAUSE_AFTER);

// ================================================================
// SCROLL REVEAL
// ================================================================
const revealObserver = new IntersectionObserver(entries => {
entries.forEach(e => {
    if (e.isIntersecting) {
    e.target.classList.add('visible');
    revealObserver.unobserve(e.target);
    }
});
}, { threshold: 0.1 });

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
