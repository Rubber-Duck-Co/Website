// Brass on the floor. Every shot ejects a casing that tumbles, bounces off the
// headlines and the duck, and comes to rest on a pile at the bottom of the screen.
//
// Every surface is a "ledge": a strip of 4px bins that each hold how far the
// surface sits below the ledge's top. When a casing settles it raises the bins
// under it, so piles build up without casings ever colliding with each other.
//
// A casing is either flying (gravity, spin, bounces) or sliding along a ledge
// (gravity pulling it downhill, friction slowing it). It only comes to rest
// somewhere flat enough to hold it, so brass spreads out instead of stacking.

const STORAGE_KEY = "rdc-brass";
const MAX_SAVED = 400;
const MAX_MOVING = 60;
const BIN = 4;
const GRAVITY = 2600;
const BOUNCE = 0.32;
const SETTLE_SPEED = 260;
const FRICTION = 0.16;
const SLOPE_PULL = 0.6;
const STATIC_SLOPE = 0.3;
const REPOSE = 0.35;
const MAX_SLIDE_MS = 4000;
const MAX_NUDGES = 3;
const PILE_CAP = 0.18;
const NICKEL_CHANCE = 0.125;
const SWEEP_MS = 650;

const OUTLINE = "#1F2A44";
const PALETTES = [
  ["#F6D77E", "#D9A43A", "#9A6A1C"],
  ["#F3F5F8", "#C3CAD4", "#7F8998"],
];

const random = (min, max) => min + Math.random() * (max - min);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function casingSize(viewWidth) {
  return viewWidth < 600 ? { length: 18, diameter: 7.5 } : { length: 24, diameter: 10 };
}

// A 9mm case lying on its side: rim on the left, open mouth on the right.
function makeSprite(palette, { length, diameter }, dpr) {
  const pad = 2;
  const width = length + pad * 2;
  const height = diameter + pad * 2;
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(width * dpr);
  canvas.height = Math.ceil(height * dpr);
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  ctx.translate(pad, pad);

  const [light, mid, dark] = palette;
  const shade = ctx.createLinearGradient(0, 0, 0, diameter);
  shade.addColorStop(0, light);
  shade.addColorStop(0.45, mid);
  shade.addColorStop(1, dark);

  const rim = length * 0.11;
  const groove = length * 0.09;
  const inset = diameter * 0.14;
  ctx.lineWidth = 1.25;
  ctx.lineJoin = "round";
  ctx.strokeStyle = OUTLINE;

  ctx.beginPath();
  ctx.roundRect(rim + groove, 0, length - rim - groove, diameter, [0, 1.5, 1.5, 0]);
  ctx.fillStyle = shade;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.rect(rim, inset, groove, diameter - inset * 2);
  ctx.fillStyle = dark;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.roundRect(0, 0, rim, diameter, 1);
  ctx.fillStyle = shade;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(length - 1.8, 1.6);
  ctx.lineTo(length - 1.8, diameter - 1.6);
  ctx.lineWidth = 1;
  ctx.strokeStyle = dark;
  ctx.stroke();

  return { canvas, width, height };
}

function createLedge(left, width, top, anchor, offsetAt) {
  const count = Math.max(1, Math.ceil(width / BIN));
  const base = new Float32Array(count);
  for (let i = 0; i < count; i += 1) {
    base[i] = offsetAt ? offsetAt(left + (i + 0.5) * BIN) : 0;
  }
  return { left, width, top, anchor, base, level: Float32Array.from(base), casings: [] };
}

function binIndex(ledge, x) {
  return Math.floor((x - ledge.left) / BIN);
}

function levelAt(ledge, x) {
  const i = binIndex(ledge, x);
  return i < 0 || i >= ledge.level.length ? Infinity : ledge.level[i];
}

// Positive slope means the surface drops away to the right. Missing neighbours count as flat,
// and the floor's probes stay inside it because it runs wall to wall.
function slopeAt(ledge, x, probe) {
  const lo = ledge.anchor === "screen" ? clamp(x - probe, 0, ledge.width - 1) : x - probe;
  const hi = ledge.anchor === "screen" ? clamp(x + probe, 0, ledge.width - 1) : x + probe;
  const here = levelAt(ledge, x);
  const left = levelAt(ledge, lo);
  const right = levelAt(ledge, hi);
  return ((Number.isFinite(right) ? right : here) - (Number.isFinite(left) ? left : here)) / (hi - lo || 1);
}

// Perched on a hump, like one casing balanced on another: both sides fall away.
function isPerched(ledge, x, reach, drop) {
  const here = levelAt(ledge, x);
  const left = levelAt(ledge, x - reach);
  const right = levelAt(ledge, x + reach);
  return Number.isFinite(left) && Number.isFinite(right) && left - here > drop && right - here > drop;
}

// Every pile is a sandpile: each casing adds a little material, tapering off at its ends...
function deposit(ledge, x, half, diameter) {
  const reach = half + diameter;
  const first = Math.max(0, binIndex(ledge, x - reach));
  const last = Math.min(ledge.level.length - 1, binIndex(ledge, x + reach));
  for (let i = first; i <= last; i += 1) {
    const distance = Math.abs(ledge.left + (i + 0.5) * BIN - x);
    const share = distance <= half ? 1 : 1 - (distance - half) / diameter;
    ledge.level[i] -= diameter * 0.6 * share;
  }
}

// ...then anything steeper than the angle of repose slumps downhill onto its neighbours.
// Only brass moves (never the letters or the duck underneath), and it never falls into
// the gaps between words, so piles spread out instead of growing into towers.
function relax(ledge) {
  const { level, base } = ledge;
  const limit = REPOSE * BIN;
  for (let pass = 0; pass < 400; pass += 1) {
    let moved = false;
    for (let i = 0; i < level.length - 1; i += 1) {
      const difference = level[i + 1] - level[i];
      if (!Number.isFinite(difference) || Math.abs(difference) <= limit + 0.01) {
        continue;
      }
      const higher = difference > 0 ? i : i + 1;
      const lower = higher === i ? i + 1 : i;
      const shift = Math.min(base[higher] - level[higher], (Math.abs(difference) - limit) / 2);
      if (shift > 0.01) {
        level[higher] += shift;
        level[lower] -= shift;
        moved = true;
      }
    }
    if (!moved) {
      break;
    }
  }
}

// Text ledges: one per line, following the top of each glyph, with gaps between words.
const measureContext = document.createElement("canvas").getContext("2d");
const glyphCache = new Map();

function glyphOffset(font, char) {
  const key = `${font}|${char}`;
  if (!glyphCache.has(key)) {
    measureContext.font = font;
    const metrics = measureContext.measureText(char);
    const ascent = metrics.fontBoundingBoxAscent ?? metrics.actualBoundingBoxAscent;
    glyphCache.set(key, metrics.actualBoundingBoxAscent > 0 ? ascent - metrics.actualBoundingBoxAscent : null);
  }
  return glyphCache.get(key);
}

function textLedges(element, scrollY) {
  const style = getComputedStyle(element);
  const font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  const range = document.createRange();
  const lines = new Map();
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);

  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent;
    for (let i = 0; i < text.length; i += 1) {
      const offset = /\s/.test(text[i]) ? null : glyphOffset(font, text[i]);
      if (offset === null) {
        continue;
      }
      range.setStart(node, i);
      range.setEnd(node, i + 1);
      const rect = range.getClientRects()[0];
      if (!rect || rect.width === 0) {
        continue;
      }
      const key = Math.round(rect.top);
      if (!lines.has(key)) {
        lines.set(key, []);
      }
      lines.get(key).push({ left: rect.left, right: rect.right, top: rect.top + offset });
    }
  }

  const ledges = [];
  for (const glyphs of lines.values()) {
    const left = Math.min(...glyphs.map((glyph) => glyph.left));
    const right = Math.max(...glyphs.map((glyph) => glyph.right));
    const top = Math.min(...glyphs.map((glyph) => glyph.top));
    const offsetAt = (x) => {
      const glyph = glyphs.find((candidate) => x >= candidate.left && x < candidate.right);
      return glyph ? glyph.top - top : Infinity;
    };
    ledges.push(createLedge(left, right - left, top + scrollY, "page", offsetAt));
  }
  return ledges;
}

// The duck ledge follows its real outline, worked out once from the SVG shapes.
const duckProfiles = new WeakMap();

function duckProfile(svg) {
  if (duckProfiles.has(svg)) {
    return duckProfiles.get(svg);
  }
  const box = svg.viewBox.baseVal;
  const shapes = [...svg.querySelectorAll("[data-hull]")];
  const rootToScreen = svg.getScreenCTM();
  const columns = [];
  try {
    const toLocal = shapes.map((shape) => shape.getScreenCTM().inverse().multiply(rootToScreen));
    for (let u = box.x; u <= box.x + box.width; u += 2) {
      let top = Infinity;
      for (let v = box.y; v <= box.y + box.height && top === Infinity; v += 1.5) {
        for (let s = 0; s < shapes.length; s += 1) {
          const point = new DOMPoint(u, v).matrixTransform(toLocal[s]);
          if (shapes[s].isPointInFill(point) || shapes[s].isPointInStroke(point)) {
            top = v;
            break;
          }
        }
      }
      columns.push(top);
    }
  } catch {
    // Older engines without isPointInFill get a flat ledge along the top of the duck.
    columns.length = 0;
  }
  const profile = { box, columns };
  duckProfiles.set(svg, profile);
  return profile;
}

function duckLedges(svg, scrollY) {
  const rect = svg.getBoundingClientRect();
  if (rect.width === 0) {
    return [];
  }
  const { box, columns } = duckProfile(svg);
  const scale = rect.width / box.width;
  const offsetAt = (x) => {
    if (columns.length === 0) {
      return 0;
    }
    const column = columns[clamp(Math.round((x - rect.left) / scale / 2), 0, columns.length - 1)];
    return (column - box.y) * scale;
  };
  return [createLedge(rect.left, rect.width, rect.top + scrollY, "page", offsetAt)];
}

function loadSaved() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    const count = Number.isInteger(data?.count) && data.count >= 0 ? data.count : 0;
    const pile = Array.isArray(data?.pile)
      ? data.pile.filter((item) => Number.isFinite(item?.x) && Number.isFinite(item?.a) && (item.k === 0 || item.k === 1))
      : [];
    return { count, pile: pile.slice(-MAX_SAVED) };
  } catch {
    return { count: 0, pile: [] };
  }
}

export function createBrass({ sound, onCount }) {
  const canvas = document.createElement("canvas");
  canvas.className = "brass-canvas";
  canvas.setAttribute("aria-hidden", "true");
  document.body.append(canvas);
  const ctx = canvas.getContext("2d");
  const bake = document.createElement("canvas");
  const bakeCtx = bake.getContext("2d");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const saved = loadSaved();
  let count = saved.count;
  let pile = saved.pile;
  let width = 0;
  let height = 0;
  let dpr = 1;
  let size = casingSize(window.innerWidth);
  let sprites = [];
  let floor = null;
  let solids = [];
  let moving = [];
  let sweepStart = 0;
  let frame = 0;
  let lastTime = 0;
  let saveTimer = 0;

  function save() {
    clearTimeout(saveTimer);
    saveTimer = 0;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ count, pile }));
    } catch {
      // Storage is unavailable, so the pile just won't survive a reload.
    }
  }

  function saveSoon() {
    if (!saveTimer) {
      saveTimer = setTimeout(save, 300);
    }
  }

  function updatePileHeight() {
    let highest = 0;
    for (const level of floor.level) {
      highest = Math.min(highest, level);
    }
    document.documentElement.style.setProperty("--pile-height", `${Math.ceil(-highest)}px`);
  }

  function drawCasing(target, x, y, angle, kind) {
    const sprite = sprites[kind];
    target.save();
    target.translate(x, y);
    target.rotate(angle);
    target.drawImage(sprite.canvas, -sprite.width / 2, -sprite.height / 2, sprite.width, sprite.height);
    target.restore();
  }

  // Without animation, work out where a sliding casing would end up: walk downhill
  // until the surface is flat enough to hold it, and roll off anything it's perched on.
  function rollDownhill(ledge, x, half) {
    const probe = size.length * 0.35;
    const lo = ledge === floor ? half : ledge.left;
    const hi = ledge === floor ? width - half : ledge.left + ledge.width;
    let direction = Math.random() < 0.5 ? -1 : 1;
    let spot = x;
    for (let i = 0; i < 400; i += 1) {
      const slope = slopeAt(ledge, spot, probe);
      if (Math.abs(slope) > STATIC_SLOPE) {
        direction = Math.sign(slope);
      } else if (!isPerched(ledge, spot, half + size.diameter, size.diameter * 0.35)) {
        break;
      }
      const next = clamp(spot + direction * BIN, lo, hi);
      if (next === spot || !Number.isFinite(levelAt(ledge, next))) {
        break;
      }
      spot = next;
    }
    return spot;
  }

  // Put a casing onto the floor pile: used for settling, reloading and reduced motion.
  function placeOnFloor(x, angle, kind, remember) {
    const half = size.length * 0.42;
    const cap = -height * PILE_CAP;
    let spot = rollDownhill(floor, clamp(x, half, width - half), half);
    // When this part of the pile is full, look for the nearest lower spot.
    for (let step = 1; levelAt(floor, spot) < cap && step < width / BIN; step += 1) {
      const candidate = spot + (step % 2 ? 1 : -1) * Math.ceil(step / 2) * BIN * 3;
      if (candidate > half && candidate < width - half && levelAt(floor, candidate) >= cap) {
        spot = candidate;
      }
    }
    // Draw the casing lying on the surface it landed on, then add it to the pile
    // and let the pile slump to its angle of repose.
    const tilt = clamp(Math.atan(slopeAt(floor, spot, half)), -0.4, 0.4);
    const flat = (Math.cos(angle) >= 0 ? 0 : Math.PI) + tilt * 0.8;
    drawCasing(bakeCtx, spot, height + levelAt(floor, spot) - size.diameter / 2, flat, kind);
    deposit(floor, spot, half, size.diameter);
    relax(floor);
    if (remember) {
      pile.push({ x: Math.round((spot / width) * 1000) / 1000, a: Math.round(flat * 100) / 100, k: kind });
      if (pile.length > MAX_SAVED) {
        pile = pile.slice(-MAX_SAVED);
      }
      updatePileHeight();
      saveSoon();
    }
  }

  function rebuildFloor() {
    floor = createLedge(0, width, height, "screen");
    bakeCtx.setTransform(1, 0, 0, 1, 0, 0);
    bakeCtx.clearRect(0, 0, bake.width, bake.height);
    bakeCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (const item of pile) {
      placeOnFloor(item.x * width, item.a, item.k, false);
    }
    updatePileHeight();
  }

  // Casings resting on a headline drop off when the layout changes under them.
  function rebuildSolids() {
    const scrollY = window.scrollY;
    // Anything still sliding was on the old surfaces, so let it fall onto the new ones.
    for (const casing of moving) {
      if (casing.ledge) {
        fallOff(casing, casing.y);
      }
    }
    for (const ledge of solids) {
      for (const casing of ledge.casings) {
        launch(casing.x, ledge.top - scrollY + casing.y, random(-40, 40), 0, casing.a, random(-6, 6), casing.k);
      }
    }
    solids = [];
    for (const element of document.querySelectorAll("[data-solid]")) {
      solids.push(...(element.dataset.solid === "duck" ? duckLedges(element, scrollY) : textLedges(element, scrollY)));
    }
    wake();
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    size = casingSize(width);
    canvas.width = bake.width = Math.round(width * dpr);
    canvas.height = bake.height = Math.round(height * dpr);
    sprites = PALETTES.map((palette) => makeSprite(palette, size, dpr));
    rebuildFloor();
    rebuildSolids();
    draw();
  }

  function halfHeight(angle) {
    return Math.abs(Math.sin(angle)) * size.length * 0.5 + Math.abs(Math.cos(angle)) * size.diameter * 0.5;
  }

  function launch(x, y, vx, vy, angle, spin, kind) {
    if (moving.length >= MAX_MOVING) {
      const oldest = moving.shift();
      placeOnFloor(oldest.x, oldest.a, oldest.k, true);
    }
    moving.push({ x, y, vx, vy, a: angle, spin, k: kind, ledge: null, bottom: y + halfHeight(angle) });
  }

  const flatten = (angle) => (Math.cos(angle) >= 0 ? 0 : Math.PI);
  const ledgeTop = (ledge, scrollY) => (ledge.anchor === "page" ? ledge.top - scrollY : ledge.top);

  function settleOnLedge(casing, ledge) {
    const half = size.length * 0.42;
    const tilt = clamp(Math.atan(slopeAt(ledge, casing.x, half)), -0.4, 0.4);
    ledge.casings.push({ x: casing.x, y: levelAt(ledge, casing.x) - size.diameter / 2, a: flatten(casing.a) + tilt * 0.8, k: casing.k });
    deposit(ledge, casing.x, half, size.diameter);
    relax(ledge);
  }

  function settle(casing) {
    sound.tink(0.2);
    if (casing.ledge === floor) {
      placeOnFloor(casing.x, casing.a, casing.k, true);
    } else {
      settleOnLedge(casing, casing.ledge);
    }
  }

  // Hitting a surface: bounce if it's coming down hard, otherwise start sliding along it.
  function land(casing, ledge, surface) {
    casing.y = surface - halfHeight(casing.a);
    if (casing.vy > SETTLE_SPEED) {
      sound.tink(casing.vy / 1600);
      casing.vy *= -BOUNCE;
      casing.vx *= 0.6;
      casing.spin = casing.spin * -0.45 + random(-6, 6);
      return;
    }
    sound.tink(0.15);
    casing.ledge = ledge;
    casing.vx *= 0.5;
    casing.vy = 0;
    casing.spin = 0;
    casing.nudges = 0;
    casing.slideStart = performance.now();
  }

  function fallOff(casing, y) {
    casing.ledge = null;
    casing.y = y;
    casing.vy = 0;
    casing.spin = Math.sign(casing.vx || 1) * random(4, 10);
    casing.bottom = casing.y + halfHeight(casing.a);
  }

  // Sliding: gravity pulls downhill, friction slows it, and it stops only where the surface
  // can hold it. It drops off edges and gaps between words, and rolls off anything it's perched on.
  // Returns true once the casing has come to rest.
  function slide(casing, dt, scrollY) {
    const ledge = casing.ledge;
    const half = size.length * 0.42;
    const here = levelAt(ledge, casing.x);
    const slope = slopeAt(ledge, casing.x, size.length * 0.35);

    casing.vx += GRAVITY * SLOPE_PULL * (slope / Math.hypot(1, slope)) * dt;
    const friction = FRICTION * GRAVITY * dt;
    casing.vx = Math.abs(casing.vx) <= friction ? 0 : casing.vx - Math.sign(casing.vx) * friction;

    if (casing.vx === 0) {
      const timedOut = performance.now() - casing.slideStart > MAX_SLIDE_MS;
      // Headlines and the duck hold one layer of brass. A casing that stops on top of
      // another gets pushed along until it finds room or drops off the end of the word.
      const bin = binIndex(ledge, casing.x);
      if (ledge !== floor && ledge.base[bin] - ledge.level[bin] > size.diameter * 0.3) {
        if (timedOut) {
          casing.skip = ledge;
          fallOff(casing, ledgeTop(ledge, scrollY) + here - size.diameter / 2);
          return false;
        }
        casing.vx = (casing.lastPush || (Math.random() < 0.5 ? -1 : 1)) * random(90, 150);
        casing.lastPush = Math.sign(casing.vx);
        return false;
      }
      if (!timedOut && casing.nudges < MAX_NUDGES && isPerched(ledge, casing.x, half + size.diameter, size.diameter * 0.35)) {
        casing.nudges += 1;
        casing.vx = (Math.random() < 0.5 ? -1 : 1) * random(60, 110);
      } else if (timedOut || Math.abs(slope) <= STATIC_SLOPE) {
        return true;
      }
    }

    let next = casing.x + casing.vx * dt;
    if (ledge === floor && (next < half || next > width - half)) {
      next = clamp(next, half, width - half);
      casing.vx *= -0.4;
    }
    const nextLevel = levelAt(ledge, next);
    const top = ledgeTop(ledge, scrollY);
    if (!Number.isFinite(nextLevel) || nextLevel - here > size.diameter * 0.6) {
      casing.x = next;
      fallOff(casing, top + here - size.diameter / 2);
      return false;
    }
    if (here - nextLevel > size.diameter * 0.5) {
      // Ran into something taller, like the side of a bigger letter: knock back.
      casing.vx *= -0.3;
      return false;
    }
    casing.x = next;
    casing.y = top + nextLevel - size.diameter / 2;
    casing.a = flatten(casing.a) + clamp(Math.atan(slope), -0.45, 0.45) * 0.7;
    return false;
  }

  function step(dt) {
    const scrollY = window.scrollY;
    const ledges = [floor, ...solids];
    moving = moving.filter((casing) => {
      if (casing.ledge) {
        if (slide(casing, dt, scrollY)) {
          settle(casing);
          return false;
        }
        return true;
      }

      casing.vy += GRAVITY * dt;
      casing.x += casing.vx * dt;
      casing.y += casing.vy * dt;
      casing.a += casing.spin * dt;

      if (casing.x < 4 || casing.x > width - 4) {
        casing.x = clamp(casing.x, 4, width - 4);
        casing.vx *= -0.5;
      }

      const bottom = casing.y + halfHeight(casing.a);
      if (casing.vy > 0) {
        let hit = null;
        let surface = Infinity;
        for (const ledge of ledges) {
          if (ledge === casing.skip) {
            continue;
          }
          const y = ledgeTop(ledge, scrollY) + levelAt(ledge, casing.x);
          if (y < surface && casing.bottom <= y + 1 && bottom >= y) {
            hit = ledge;
            surface = y;
          }
        }
        if (hit) {
          land(casing, hit, surface);
        }
      }
      casing.bottom = casing.y + halfHeight(casing.a);
      return casing.y < height + 200;
    });
  }

  function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (sweepStart) {
      const progress = Math.min(1, (performance.now() - sweepStart) / SWEEP_MS);
      ctx.translate(-width * 1.1 * progress * progress, 0);
    }
    ctx.drawImage(bake, 0, 0, width, height);
    const scrollY = window.scrollY;
    for (const ledge of solids) {
      const top = ledge.top - scrollY;
      if (ledge.casings.length === 0 || top < -50 || top > height + 50) {
        continue;
      }
      for (const casing of ledge.casings) {
        drawCasing(ctx, casing.x, top + casing.y, casing.a, casing.k);
      }
    }
    for (const casing of moving) {
      drawCasing(ctx, casing.x, casing.y, casing.a, casing.k);
    }
  }

  function clearAll() {
    sweepStart = 0;
    moving = [];
    pile = [];
    count = 0;
    for (const ledge of solids) {
      ledge.level.set(ledge.base);
      ledge.casings = [];
    }
    rebuildFloor();
    save();
    onCount(count, false);
  }

  function tick(now) {
    const dt = Math.min(0.033, (now - lastTime) / 1000);
    lastTime = now;
    if (sweepStart && now - sweepStart >= SWEEP_MS) {
      clearAll();
    } else {
      step(dt);
    }
    draw();
    frame = moving.length > 0 || sweepStart ? requestAnimationFrame(tick) : 0;
  }

  function wake() {
    if (!frame && (moving.length > 0 || sweepStart)) {
      lastTime = performance.now();
      frame = requestAnimationFrame(tick);
    }
  }

  function requestDraw() {
    if (!frame) {
      frame = requestAnimationFrame(() => {
        frame = 0;
        draw();
        wake();
      });
    }
  }

  function fire(x, y) {
    if (sweepStart) {
      return;
    }
    count += 1;
    onCount(count, true);
    const kind = Math.random() < NICKEL_CHANCE ? 1 : 0;
    if (reducedMotion.matches) {
      placeOnFloor(x + random(-20, 20), Math.random() < 0.5 ? 0 : Math.PI, kind, true);
      sound.tink(0.3);
      requestDraw();
      return;
    }
    // Ejected up and to the right, like a pistol's ejection port. Now and then one goes left.
    const direction = Math.random() < 0.88 ? 1 : -1;
    launch(x, y, direction * random(120, 380), -random(560, 860), random(0, Math.PI * 2), direction * random(16, 32), kind);
    saveSoon();
    wake();
  }

  function sweep() {
    if (sweepStart || count === 0) {
      return;
    }
    if (reducedMotion.matches) {
      clearAll();
      draw();
      return;
    }
    sweepStart = performance.now();
    wake();
  }

  let resizeTimer = 0;
  function resizeSoon() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 150);
  }

  // Reflows inside <main> (a font swapping in, say) move the headlines but not the floor.
  // Watching <main> rather than <body> keeps the pile's own footer padding from triggering it.
  let reflowTimer = 0;
  let mainSize = "";
  function reflowSoon(entries) {
    const box = entries[0].contentRect;
    const next = `${Math.round(box.width)}x${Math.round(box.height)}`;
    if (next === mainSize) {
      return;
    }
    mainSize = next;
    clearTimeout(reflowTimer);
    reflowTimer = setTimeout(() => {
      rebuildSolids();
      requestDraw();
    }, 150);
  }

  window.addEventListener("resize", resizeSoon);
  window.addEventListener("scroll", requestDraw, { passive: true });
  window.addEventListener("pagehide", save);
  const main = document.querySelector("main");
  if (main && "ResizeObserver" in window) {
    new ResizeObserver(reflowSoon).observe(main);
  }
  document.fonts?.ready.then(() => {
    rebuildSolids();
    requestDraw();
  });
  resize();

  return {
    fire,
    sweep,
    get count() {
      return count;
    },
  };
}
