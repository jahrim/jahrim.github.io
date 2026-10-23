/*
 * Engine: runs one game at a time on the panel's stage, and keeps the score, the lives and the
 * start / pause / game over screen.
 *
 * A game is a definition { id, title, description, controls, lives, create(api) }.
 * create(api) returns an instance with:
 *   reset()                      start a new run
 *   update(dt, time, active)     advance by dt seconds; when active is false only finish animations
 *   render(ctx, width, height)   draw the current state (CSS pixels)
 *   pointerDown(x, y, button, pointerType)  optional: mouse/pen/touch input on the stage
 *   keyDown(key)                 optional: keyboard input while playing
 * and can call api.addScore(n), api.loseLife(), api.gainLife(), api.score(), api.lives(), api.maxLives()
 * and api.size().
 */
import { controlsHtml, renderLives } from './icons.js';

var OVERLAY_GUARD = 800; // ms the game-over button stays inactive, against clicks meant for bubbles

// localStorage can be unavailable (private mode, blocked storage): never let it break the game
var storage = {
  get: function (key) { try { return window.localStorage.getItem(key); } catch (e) { return null; } },
  set: function (key, value) { try { window.localStorage.setItem(key, value); } catch (e) { /* ignore */ } }
};

export function createEngine(ui, games, options) {
  var ctx = ui.canvas.getContext('2d');
  var usingTouch = options.touch;
  var guardTimer = 0;

  var current = null;    // { def, instance }
  var index = 0;
  var status = 'ready';  // ready | playing | paused | over
  var score = 0;
  var lives = 0;
  var time = 0;
  var frameId = 0;
  var lastFrame = 0;
  var width = 0;
  var height = 0;

  var api = {
    addScore: function (n) {
      score += n;
      ui.scoreEl.textContent = score;
    },
    loseLife: function () {
      if (status !== 'playing') return;
      lives = Math.max(0, lives - 1);
      renderLives(ui.livesEl, lives, current.def.lives);
      ui.stage.classList.remove('is-hit');
      void ui.stage.offsetWidth; // restart the hit animation
      ui.stage.classList.add('is-hit');
      if (lives === 0) gameOver();
    },
    gainLife: function () {
      if (status !== 'playing' || lives >= current.def.lives) return;
      lives += 1;
      renderLives(ui.livesEl, lives, current.def.lives);
    },
    lives: function () {
      return lives;
    },
    score: function () {
      return score;
    },
    maxLives: function () {
      return current.def.lives;
    },
    size: function () {
      return { width: width, height: height };
    }
  };

  function bestScore() {
    return parseInt(storage.get('relax.best.' + current.def.id), 10) || 0;
  }

  function showOverlay(title, text, hint) {
    ui.overlayTitle.textContent = title;
    ui.overlayText.textContent = text;
    ui.overlayHint.textContent = hint;
    clearTimeout(guardTimer);
    ui.overlayHint.disabled = false;
    ui.overlay.hidden = false;
  }

  function load(i) {
    index = (i + games.length) % games.length;
    var def = games[index];
    current = { def: def, instance: def.create(api) };
    current.instance.reset();
    status = 'ready';
    score = 0;
    lives = def.lives;
    time = 0;
    ui.titleEl.textContent = def.title;
    ui.controlsEl.innerHTML = controlsHtml(def.controls, usingTouch);
    ui.scoreEl.textContent = '0';
    renderLives(ui.livesEl, lives, def.lives);
    var best = bestScore();
    showOverlay(def.title, def.description + (best ? ' Best: ' + best + '.' : ''), 'Start');
  }

  function start() {
    current.instance.reset();
    score = 0;
    lives = current.def.lives;
    time = 0;
    ui.scoreEl.textContent = '0';
    renderLives(ui.livesEl, lives, current.def.lives);
    status = 'playing';
    ui.overlay.hidden = true;
    ui.canvas.focus({ preventScroll: true });
  }

  function pause() {
    if (status !== 'playing') return;
    status = 'paused';
    showOverlay('Paused', 'Score: ' + score + '.', 'Resume');
  }

  function resume() {
    status = 'playing';
    ui.overlay.hidden = true;
    lastFrame = performance.now();
  }

  function gameOver() {
    status = 'over';
    var best = bestScore();
    if (score > best) {
      storage.set('relax.best.' + current.def.id, String(score));
      showOverlay('New best!', 'You scored ' + score + '.', 'Play again');
    } else {
      showOverlay('Game over', 'You scored ' + score + '. Best: ' + best + '.', 'Play again');
    }
    // the game usually ends mid-click: keep the button inactive for a moment
    ui.overlayHint.disabled = true;
    clearTimeout(guardTimer);
    guardTimer = setTimeout(function () { ui.overlayHint.disabled = false; }, OVERLAY_GUARD);
  }

  function resize() {
    var rect = ui.stage.getBoundingClientRect();
    // phones go up to 3x: 2x is already sharp, and keeps drawing cheap
    var ratio = Math.min(2, window.devicePixelRatio || 1);
    width = rect.width;
    height = rect.height;
    ui.canvas.width = Math.round(width * ratio);
    ui.canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function frame(now) {
    // cap the step so a slow frame or a background tab does not jump the game forward
    var dt = Math.min(0.05, (now - lastFrame) / 1000);
    lastFrame = now;
    if (status === 'playing') {
      time += dt;
      current.instance.update(dt, time, true);
    } else if (status === 'over') {
      current.instance.update(dt, time, false); // let the last effects fade out
    }
    current.instance.render(ctx, width, height);
    frameId = requestAnimationFrame(frame);
  }

  // the frame loop only runs while the panel is open
  function run() {
    lastFrame = performance.now();
    cancelAnimationFrame(frameId);
    frameId = requestAnimationFrame(frame);
  }

  function halt() {
    cancelAnimationFrame(frameId);
  }

  // show the controls for the input actually in use (some phones misreport their pointer)
  function setTouch(touch) {
    if (touch === usingTouch) return;
    usingTouch = touch;
    ui.controlsEl.innerHTML = controlsHtml(current.def.controls, usingTouch);
  }

  // input on the stage: returns whether the game used it
  function pointerDown(x, y, button, pointerType) {
    if (status !== 'playing' || !current.instance.pointerDown) return false;
    current.instance.pointerDown(x, y, button, pointerType);
    return true;
  }

  function keyDown(key) {
    return status === 'playing' && !!current.instance.keyDown && !!current.instance.keyDown(key);
  }

  return {
    load: load,
    start: start,
    pause: pause,
    resume: resume,
    resize: resize,
    run: run,
    halt: halt,
    setTouch: setTouch,
    pointerDown: pointerDown,
    keyDown: keyDown,
    status: function () { return status; },
    index: function () { return index; },
    gameCount: games.length
  };
}
