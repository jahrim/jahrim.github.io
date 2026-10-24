/*
 * Bubbles: pop the bubbles before they grow too large and burst.
 *
 * Kinds: regular bubbles, black ones (popping costs a life) and ×2 (doubles all points for a while);
 * later in the game, jagged bubbles (burst faster, worth more). Regular and jagged bubbles can carry
 * modifiers that stack: hearts (restore a life, or worth more at full lives), shields (two clicks,
 * worth more) and floating (move, worth more).
 * The settings at the top of create() tune all of it.
 */
import { HEART_ICON } from '../icons.js';

var BUBBLE_COLORS = ['#F6EB0F', '#FD3519', '#3FA7D6', '#59CD90', '#FAC05E', '#C77DFF', '#FF7EB6'];

export default {
  id: 'bubbles',
  title: 'Bubbles',
  description: 'Pop the bubbles! Aim for 10k.',
  controls: [{ type: 'mouse', button: 'left', label: 'Pop' }],
  lives: 3,
  // preset leaderboard: the top score is the author's personal best
  leaderboard: [
    { name: 'JAH', score: 50000 },
    { name: 'POP', score: 20000 },
    { name: 'FIZ', score: 8000 },
    { name: 'BUB', score: 2500 },
    { name: 'ZZZ', score: 600 }
  ],
  create: function (api) {
    // Everything is stored relative to the stage, so the game rescales with it:
    // positions are fractions of the stage width/height, lengths are fractions of its shorter side.
    // Spawn interval shrinks from START towards MIN as the score grows:
    // the spawn rate grows asymptotically to 1 / MIN, faster for players who score faster.
    var SPAWN_START = 1.3;  // seconds between bubbles at the start
    var SPAWN_MIN = 0.35;   // limit approached over time
    var SPAWN_SCALE = 45;   // points for the gap to shrink by ~63%
    var LIFETIME = 3.2;     // seconds from appearing to bursting
    var START_RADIUS = 0.01;
    var MAX_RADIUS = 0.13;  // average size at bursting
    var HIT_SLOP = 0.012;   // extra margin around a bubble that still counts as a hit
    var HIT_SLOP_TOUCH = 0.035; // fingers are less precise than a mouse
    var GRAVITY = 0.6;      // pull on the burst droplets
    var BLACK_CHANCE = 0.15; // share of black bubbles: popping one costs a life, ignoring it is safe
    var BLACK_AFTER = 4;    // seconds before the first black bubble can appear
    var COMBO_WINDOW = 0.9; // seconds to pop the next bubble and keep the combo going
    var COMBO_COLORS = ['#F6EB0F', '#FAC05E', '#FF9F43', '#FF7EB6', '#C77DFF'];
    var HEART_CHANCE = 0.02;  // share of regular and jagged bubbles carrying a heart, once unlocked
    var DOUBLE_CHANCE = 0.02; // share of ×2 bubbles: popping one doubles all points for a while
    var DOUBLE_DURATION = 10; // seconds the ×2 buff lasts; catching another restarts it (no stacking)
    var POWERUP_LIFETIME = 1.8; // ×2 bubbles vanish faster than bubbles, without any penalty
    var POWERUP_SIZE = 0.8;   // relative to a bubble
    var POWERUP_AFTER = 20;   // score needed before hearts and ×2 can appear
    var JAGGED_CHANCE = 0.1;  // share of jagged bubbles once unlocked: they burst fast, but are worth more
    var JAGGED_AFTER = 1000;  // score needed before jagged bubbles can appear
    var JAGGED_LIFETIME = LIFETIME / 1.5; // jagged bubbles burst 1.5× faster than regular ones
    var JAGGED_SIZE = 0.85;   // relative to a bubble
    var JAGGED_POINTS = 5;    // multiplier on the combo points of a pop
    var SHIELD_CHANCE = 0.15; // share of regular and jagged bubbles with a shield, once unlocked
    var SHIELD_AFTER = 100;   // score needed before shields can appear
    var SHIELD_POINTS = 3;    // multiplier on the points of a shielded bubble (stacks with jagged)
    var SHIELD_SCALE = 1.18;  // shield radius relative to the bubble
    var FLOAT_CHANCE = 0.1;   // share of regular and jagged bubbles that float, once unlocked
    var FLOAT_AFTER = 2000;   // score needed before floating bubbles can appear
    var FLOAT_POINTS = 10;    // multiplier on the points of a floating bubble (stacks with shield and jagged)
    var FLOAT_LEG = 2;        // seconds to glide from one end of the path to the other
    var FLOAT_MIN_TRIP = 0.35; // minimum path length, relative to the stage's shorter side
    var HEART_POINTS = 5;     // multiplier on the points of a heart popped at full lives (otherwise it heals)

    var items, effects, nextSpawn, combo, comboTimer, boostTimer;

    function spawnInterval(score) {
      return SPAWN_MIN + (SPAWN_START - SPAWN_MIN) * Math.exp(-score / SPAWN_SCALE);
    }

    // stage metrics: its size, and px per unit length
    function metrics() {
      var size = api.size();
      return { width: size.width, height: size.height, unit: Math.min(size.width, size.height) };
    }

    function spawn(time) {
      var m = metrics();
      if (!m.unit) return;
      var kind = 'bubble';
      // power-ups are held back until the player has scored a bit
      var roll = api.score() >= POWERUP_AFTER ? Math.random() : 1;
      if (roll < DOUBLE_CHANCE) kind = 'double';
      else if (api.score() >= JAGGED_AFTER && Math.random() < JAGGED_CHANCE) kind = 'jagged';
      else if (time >= BLACK_AFTER && Math.random() < BLACK_CHANCE) kind = 'black';
      var powerUp = kind === 'double';
      var size = powerUp ? POWERUP_SIZE : kind === 'jagged' ? JAGGED_SIZE : 1;
      var shield = (kind === 'bubble' || kind === 'jagged') && api.score() >= SHIELD_AFTER && Math.random() < SHIELD_CHANCE;
      var floating = (kind === 'bubble' || kind === 'jagged') && api.score() >= FLOAT_AFTER && Math.random() < FLOAT_CHANCE;
      var heart = (kind === 'bubble' || kind === 'jagged') && api.score() >= POWERUP_AFTER && Math.random() < HEART_CHANCE;
      var maxRadius = MAX_RADIUS * (0.85 + Math.random() * 0.3) * size;
      var extent = maxRadius * (shield ? SHIELD_SCALE : 1); // how far the bubble reaches, shield included
      var marginX = Math.min(0.5, (extent * m.unit + 6) / m.width);
      var marginY = Math.min(0.5, (extent * m.unit + 6) / m.height);
      // prefer a free spot, but accept an overlap after a few attempts
      var x, y;
      for (var attempt = 0; attempt < 10; attempt++) {
        x = marginX + Math.random() * (1 - 2 * marginX);
        y = marginY + Math.random() * (1 - 2 * marginY);
        var free = items.every(function (b) {
          var p = place(b, m);
          return Math.hypot(p.x - x * m.width, p.y - y * m.height) > (b.maxRadius + maxRadius) * m.unit;
        });
        if (free) break;
      }
      // a floating bubble glides back and forth between (x, y) and a second, distant point
      var x2 = x;
      var y2 = y;
      if (floating) {
        for (var leg = 0; leg < 20; leg++) {
          x2 = marginX + Math.random() * (1 - 2 * marginX);
          y2 = marginY + Math.random() * (1 - 2 * marginY);
          if (Math.hypot((x2 - x) * m.width, (y2 - y) * m.height) >= FLOAT_MIN_TRIP * m.unit) break;
        }
      }
      items.push({
        x: x, y: y, age: 0, maxRadius: maxRadius, kind: kind,
        floating: floating, x2: x2, y2: y2,
        heart: heart,     // heals when a life is missing, worth HEART_POINTS times more otherwise
        shield: shield,   // still protected: the next click only breaks the shield
        shielded: shield, // was shielded: worth SHIELD_POINTS times more when popped
        lifetime: powerUp ? POWERUP_LIFETIME : kind === 'jagged' ? JAGGED_LIFETIME : LIFETIME,
        color: kind === 'black' ? '#3D4752' : kind === 'double' ? '#FFE8A3'
          : kind === 'jagged' ? '#00D1FF'
          : BUBBLE_COLORS[Math.floor(Math.random() * BUBBLE_COLORS.length)],
        wobble: Math.random() * Math.PI * 2
      });
    }

    function comboColor(n) {
      return COMBO_COLORS[Math.min(n, COMBO_COLORS.length) - 1];
    }

    function radius(b) {
      return START_RADIUS + (b.maxRadius - START_RADIUS) * Math.min(1, b.age / b.lifetime);
    }

    // On-screen center of a bubble in px. Positions scale with the stage, but sizes follow its
    // shorter side, so after a resize a bubble could stick out: keep it fully inside the stage
    // at its maximum size (wobble included), whatever the current width and height.
    function place(b, m) {
      // floating bubbles ease back and forth along their path, one leg every FLOAT_LEG seconds
      var s = b.floating ? 0.5 - 0.5 * Math.cos(Math.PI * b.age / FLOAT_LEG) : 0;
      return placeAt(b, b.x + (b.x2 - b.x) * s, b.y + (b.y2 - b.y) * s, m);
    }

    function placeAt(b, fx, fy, m) {
      var reach = b.maxRadius * (b.shielded ? SHIELD_SCALE : 1.05) * m.unit + 2;
      function inside(value, size) {
        return size <= 2 * reach ? size / 2 : Math.min(size - reach, Math.max(reach, value));
      }
      return { x: inside(fx * m.width, m.width), y: inside(fy * m.height, m.height) };
    }

    // how a bubble ends: 'pop' (clicked, points), 'burst' (grew too large, costs a life),
    // 'trap' (black one clicked, costs a life), 'fizzle' (black one expired, harmless),
    // 'boost' (×2 clicked, starts the buff) or 'fade' (×2 expired, harmless)
    var BURST = { ring: '#FD3519', ringLife: 0.5, drops: 10, speed: 0.55, dropLife: 0.6 };
    var ENDINGS = {
      pop:    { ring: '#FCFCFD', ringLife: 0.3, drops: 6,  speed: 0.3,  dropLife: 0.35 },
      burst:  BURST,
      trap:   BURST,
      fizzle: { ring: '#8494A4', ringLife: 0.4, drops: 0,  speed: 0,    dropLife: 0 },
      boost:  { ring: '#F6EB0F', ringLife: 0.45, drops: 8, speed: 0.35, dropLife: 0.45 },
      fade:   { ring: null,      ringLife: 0.35, drops: 0, speed: 0,    dropLife: 0 },
      shatter: { ring: '#C9D6E3', ringLife: 0.35, drops: 10, speed: 0.45, dropLife: 0.4, scale: SHIELD_SCALE, dropColor: '#C9D6E3' }
    };

    function end(b, how, points) {
      var m = metrics();
      var p = place(b, m);
      var style = ENDINGS[how];
      var r = radius(b) * (style.scale || 1);
      // effects start from where the bubble was actually drawn
      var x = p.x / m.width;
      var y = p.y / m.height;
      var ring = style.ring || hexToRgba(b.color, 0.5);
      effects.push({ kind: 'ring', x: x, y: y, r: r, color: ring, age: 0, life: style.ringLife });
      for (var i = 0; i < style.drops; i++) {
        effects.push({
          kind: 'drop', x: x, y: y, r: r,
          angle: (i / style.drops) * Math.PI * 2 + Math.random() * 0.5,
          speed: style.speed * (0.6 + Math.random() * 0.6),
          color: style.dropColor || b.color, age: 0, life: style.dropLife
        });
      }
      if (how === 'pop') effects.push({
        kind: 'text', x: x, y: y, text: '+' + points, combo: combo, age: 0, life: 0.7,
        color: b.heart && !b.healed ? '#FF7EB6' : b.floating ? '#C77DFF' : b.kind === 'jagged' ? '#00D1FF' : b.shielded ? '#C9D6E3' : null,
        big: b.kind === 'jagged' || b.shielded || b.floating || (b.heart && !b.healed)
      });
      // a heart popped while a life was missing: the life floats up above the points
      if (how === 'pop' && b.healed) say(x, y - 0.06, '+1 ♥', '#FF7EB6');
      if (how === 'trap') say(x, y, '−1 ♥', '#FD3519');
      if (how === 'boost') say(x, y, '×2!', '#F6EB0F');
    }

    function say(x, y, text, color) {
      effects.push({ kind: 'text', x: x, y: y, text: text, color: color, age: 0, life: 0.9 });
    }

    // all points go through here, so the ×2 buff applies to everything
    function award(points) {
      var gained = points * (boostTimer > 0 ? 2 : 1);
      api.addScore(gained);
      return gained;
    }

    function breakCombo() {
      combo = 0;
      comboTimer = 0;
    }

    // the lives heart icon inside a bubble carrying a heart, beating faster as the bubble is about to burst;
    // a white outline keeps it readable on every bubble color
    var heartIcon = typeof Path2D === 'function' ? new Path2D(HEART_ICON) : null;

    // the pulse of a bubble's icon, faster as the bubble is about to burst
    function beat(b, urgency) {
      return 1 + Math.max(0, Math.sin(b.age * (8 + urgency * 14) + b.wobble)) * 0.08;
    }

    function drawHeartIcon(c, b, x, y, r, urgency) {
      if (!heartIcon) return;
      var scale = r * 1.15 / 24 * beat(b, urgency); // the icon spans most of the bubble
      c.save();
      c.translate(x, y);
      c.scale(scale, scale);
      c.translate(-12, -12.5);          // center of the icon in its viewBox
      c.fillStyle = '#FD3519';
      c.fill(heartIcon);
      c.lineWidth = 1.4;
      c.strokeStyle = 'rgba(255,255,255,0.9)';
      c.stroke(heartIcon);
      c.restore();
    }

    // faint dotted guide between the two ends of a floating bubble's path
    function drawFloatPath(c, b, m) {
      var a = placeAt(b, b.x, b.y, m);
      var z = placeAt(b, b.x2, b.y2, m);
      c.save();
      c.setLineDash([m.unit * 0.008, m.unit * 0.014]);
      c.lineWidth = m.unit * 0.004;
      c.strokeStyle = hexToRgba(b.color, 0.35);
      c.beginPath();
      c.moveTo(a.x, a.y);
      c.lineTo(z.x, z.y);
      c.stroke();
      c.restore();
      c.fillStyle = hexToRgba(b.color, 0.45);
      [a, z].forEach(function (end) {
        c.beginPath();
        c.arc(end.x, end.y, m.unit * 0.008, 0, Math.PI * 2);
        c.fill();
      });
    }

    // silver shield around a bubble, with highlights circling around it
    function drawShield(c, b, x, y, r, unit) {
      var sr = r * SHIELD_SCALE;
      c.beginPath();
      c.arc(x, y, sr, 0, Math.PI * 2);
      c.fillStyle = 'rgba(201,214,227,0.12)';
      c.fill();
      c.lineWidth = unit * 0.012;
      c.strokeStyle = 'rgba(201,214,227,0.9)';
      c.stroke();
      var spin = b.wobble + b.age * 1.2;
      c.lineWidth = unit * 0.006;
      c.strokeStyle = 'rgba(255,255,255,0.9)';
      for (var i = 0; i < 3; i++) {
        var start = spin + (i / 3) * Math.PI * 2;
        c.beginPath();
        c.arc(x, y, sr, start, start + 0.5);
        c.stroke();
      }
    }

    // star-like outline of a jagged bubble, slowly spinning; the spikes reach the bubble radius r
    function jaggedPath(c, b, x, y, r) {
      var spikes = 14;
      c.save();
      c.translate(x, y);
      c.rotate(b.wobble + b.age * 1.5);
      for (var i = 0; i < spikes * 2; i++) {
        var angle = (i / (spikes * 2)) * Math.PI * 2;
        var reach = i % 2 ? r * 0.74 : r;
        if (i) c.lineTo(Math.cos(angle) * reach, Math.sin(angle) * reach);
        else c.moveTo(reach, 0);
      }
      c.closePath();
      c.restore(); // the path keeps its shape; fill and stroke use unscaled line widths
    }

    // "×2" inside a ×2 bubble, pulsing like the heart icon
    function drawDoubleIcon(c, b, x, y, r, urgency) {
      c.font = font(700, r * 0.9 * beat(b, urgency));
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillStyle = '#112F41';
      c.fillText('×2', x, y + r * 0.05);
      c.textBaseline = 'alphabetic';
    }

    function font(weight, px) {
      return weight + ' ' + Math.round(px) + 'px Montserrat, "Helvetica Neue", sans-serif';
    }

    function hexToRgba(hex, alpha) {
      var n = parseInt(hex.slice(1), 16);
      return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + alpha + ')';
    }

    return {
      reset: function () {
        items = [];
        effects = [];
        nextSpawn = 0.4;
        boostTimer = 0;
        breakCombo();
      },

      update: function (dt, time, active) {
        if (active) {
          nextSpawn -= dt;
          if (nextSpawn <= 0) {
            spawn(time);
            nextSpawn = spawnInterval(api.score());
          }
          if (combo) {
            comboTimer -= dt;
            if (comboTimer <= 0) breakCombo();
          }
          if (boostTimer > 0) boostTimer = Math.max(0, boostTimer - dt);
          for (var i = items.length - 1; i >= 0; i--) {
            var b = items[i];
            b.age += dt;
            if (b.age >= b.lifetime) {
              items.splice(i, 1);
              if (b.kind === 'black') {
                end(b, 'fizzle');
              } else if (b.kind === 'double') {
                end(b, 'fade');
              } else {
                end(b, 'burst');
                breakCombo();
                api.loseLife();
              }
            }
          }
        }
        for (var j = effects.length - 1; j >= 0; j--) {
          effects[j].age += dt;
          if (effects[j].age >= effects[j].life) effects.splice(j, 1);
        }
      },

      pointerDown: function (px, py, button, pointerType) {
        var slop = pointerType === 'touch' ? HIT_SLOP_TOUCH : HIT_SLOP;
        var m = metrics();
        // newest bubbles are drawn on top, so test them first
        for (var i = items.length - 1; i >= 0; i--) {
          var b = items[i];
          var p = place(b, m);
          var hitRadius = radius(b) * (b.shield ? SHIELD_SCALE : 1) + slop;
          if (Math.hypot(p.x - px, p.y - py) <= hitRadius * m.unit) {
            if (b.shield) {
              // the first click only breaks the shield: no points, but the combo stays alive
              b.shield = false;
              if (combo) comboTimer = COMBO_WINDOW;
              end(b, 'shatter');
              return;
            }
            items.splice(i, 1);
            if (b.kind === 'black') {
              end(b, 'trap');
              breakCombo();
              api.loseLife();
            } else if (b.kind === 'double') {
              // neutral for combos too; a second ×2 restarts the buff instead of stacking it
              boostTimer = DOUBLE_DURATION;
              end(b, 'boost');
            } else {
              // each pop within the combo window is worth one more point: +1, +2, +3, ...
              // and the bubble's kind and modifiers multiply that
              combo += 1;
              comboTimer = COMBO_WINDOW;
              // a heart restores a missing life; at full lives it multiplies the points instead
              b.healed = b.heart && api.lives() < api.maxLives();
              var multiplier = (b.kind === 'jagged' ? JAGGED_POINTS : 1) * (b.shielded ? SHIELD_POINTS : 1)
                * (b.floating ? FLOAT_POINTS : 1) * (b.heart && !b.healed ? HEART_POINTS : 1);
              end(b, 'pop', award(combo * multiplier));
              if (b.healed) api.gainLife();
            }
            return;
          }
        }
      },

      render: function (c, width, height) {
        var unit = Math.min(width, height);
        var m = { width: width, height: height, unit: unit };
        c.clearRect(0, 0, width, height);

        items.forEach(function (b) {
          var p = place(b, m);
          var x = p.x;
          var y = p.y;
          var r = radius(b) * unit;
          var danger = b.age / b.lifetime;
          // a slight wobble makes bubbles feel alive; it speeds up as they near bursting
          var wobble = 1 + Math.sin(b.age * (6 + danger * 18) + b.wobble) * 0.03 * (0.4 + danger);

          if (b.floating) drawFloatPath(c, b, m);

          var body = c.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
          if (b.kind === 'black') {
            body.addColorStop(0, 'rgba(90,96,104,0.95)');
            body.addColorStop(0.5, 'rgba(18,20,24,0.97)');
            body.addColorStop(1, 'rgba(0,0,0,1)');
          } else {
            body.addColorStop(0, 'rgba(255,255,255,0.55)');
            body.addColorStop(0.4, hexToRgba(b.color, 0.45));
            body.addColorStop(1, hexToRgba(b.color, 0.85));
          }
          c.beginPath();
          if (b.kind === 'jagged') jaggedPath(c, b, x, y, r * wobble);
          else c.ellipse(x, y, r * wobble, r / wobble, 0, 0, Math.PI * 2);
          c.fillStyle = body;
          c.fill();

          if (b.kind === 'black') {
            // black bubbles never burst, so they get a steady dark-red rim instead of the warning
            c.lineWidth = unit * 0.005;
            c.strokeStyle = 'rgba(253,53,25,0.55)';
          } else if (b.kind === 'double') {
            // power-ups vanish harmlessly, so no warning either
            c.lineWidth = unit * 0.004;
            c.strokeStyle = b.color;
          } else {
            // the outline turns into a warning as the bubble approaches its maximum size
            c.lineWidth = unit * (0.004 + Math.max(0, danger - 0.7) * 0.02);
            c.strokeStyle = danger > 0.7 && Math.sin(b.age * 22) > 0 ? '#FD3519' : b.color;
          }
          c.stroke();

          if (b.shield) drawShield(c, b, x, y, r, unit);
          if (b.heart) drawHeartIcon(c, b, x, y, r, danger);
          if (b.kind === 'double') drawDoubleIcon(c, b, x, y, r, danger);

          c.beginPath();
          c.ellipse(x - r * 0.35, y - r * 0.4, r * 0.22, r * 0.12, -0.6, 0, Math.PI * 2);
          c.fillStyle = b.kind === 'black' ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.75)';
          c.fill();
        });

        effects.forEach(function (e) {
          var t = e.age / e.life;
          var x = e.x * width;
          var y = e.y * height;
          c.globalAlpha = 1 - t;
          if (e.kind === 'ring') {
            c.beginPath();
            c.arc(x, y, e.r * unit * (1 + t * 0.8), 0, Math.PI * 2);
            c.lineWidth = unit * 0.005;
            c.strokeStyle = e.color;
            c.stroke();
          } else if (e.kind === 'drop') {
            // droplets fly out from the bubble's edge and fall under gravity
            var distance = e.r + e.speed * e.age;
            c.beginPath();
            c.arc(
              x + Math.cos(e.angle) * distance * unit,
              y + (Math.sin(e.angle) * distance + 0.5 * GRAVITY * e.age * e.age) * unit,
              unit * (0.008 * (1 - t) + 0.003), 0, Math.PI * 2);
            c.fillStyle = e.color;
            c.fill();
          } else if (e.kind === 'text') {
            // bigger combos float up bigger and warmer
            var scale = (e.combo ? Math.min(1.8, 1 + (e.combo - 1) * 0.12) : 1) * (e.big ? 1.3 : 1);
            c.font = font(600, unit * 0.045 * scale);
            c.textAlign = 'center';
            c.fillStyle = e.color || comboColor(e.combo);
            c.fillText(e.text, x, y - unit * (0.03 + t * 0.06));
          }
          c.globalAlpha = 1;
        });

        // ×2 buff badge: the ring drains as the buff runs out, and blinks in its last 2 seconds
        if (boostTimer > 0) {
          var cx = unit * 0.09;
          var cy = unit * 0.09;
          var rr = unit * 0.055;
          c.globalAlpha = boostTimer < 2 ? 0.55 + 0.45 * Math.abs(Math.cos(boostTimer * 8)) : 1;
          c.beginPath();
          c.arc(cx, cy, rr, 0, Math.PI * 2);
          c.fillStyle = 'rgba(246,235,15,0.15)';
          c.fill();
          c.beginPath();
          c.arc(cx, cy, rr, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * boostTimer / DOUBLE_DURATION);
          c.lineWidth = unit * 0.008;
          c.strokeStyle = '#F6EB0F';
          c.stroke();
          c.font = font(700, unit * 0.045);
          c.textAlign = 'center';
          c.textBaseline = 'middle';
          c.fillStyle = '#F6EB0F';
          c.fillText('×2', cx, cy);
          c.textBaseline = 'alphabetic';
          c.globalAlpha = 1;
        }

        // combo meter: the bar shows how long is left to keep the combo going
        if (combo >= 2) {
          var color = comboColor(combo);
          var barWidth = unit * 0.3;
          var top = unit * 0.06;
          c.font = font(600, unit * 0.05);
          c.textAlign = 'center';
          c.fillStyle = color;
          c.fillText('Combo ×' + combo, width / 2, top + unit * 0.04);
          c.fillStyle = 'rgba(255,255,255,0.15)';
          c.fillRect(width / 2 - barWidth / 2, top + unit * 0.06, barWidth, unit * 0.008);
          c.fillStyle = color;
          c.fillRect(width / 2 - barWidth / 2, top + unit * 0.06, barWidth * Math.max(0, comboTimer / COMBO_WINDOW), unit * 0.008);
        }
      }
    };
  }
};
