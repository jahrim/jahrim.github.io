/*
 * Engine: runs one game at a time on the panel's stage, and keeps the score, the lives and the
 * start / pause / game over screen, with the game's leaderboard.
 *
 * A game is a definition { id, title, description, controls, lives, leaderboard, create(api) },
 * where leaderboard is the preset top scores: [{ name: 'ABC', score: 1000 }, ...], and an optional
 * hideLives: true hides the hearts in the stage's corner (for a game that shows its lives itself), and an
 * optional maxLives: how many lives can be gained back up to (by default, the starting lives), and an
 * optional touchControls: the bottom bar's controls on touch screens, in place of controls (icons.js),
 * and optional tips: short texts, one of them shown on the start screen (the first one at random, then
 * the next one each time the game is selected again, around the list), each a string or
 * { text, touch, icon } (touch true: on touch screens only, false: with a mouse and keyboard only;
 * icon: a control, like the controls' entries, whose icon goes before the text).
 * create(api) returns an instance with:
 *   reset()                      start a new run
 *   update(dt, time, active)     advance by dt seconds; when active is false only finish animations
 *   render(ctx, width, height)   draw the current state (CSS pixels)
 *   pointerDown(x, y, button, pointerType, id)  optional: mouse/pen/touch input on the stage; id tells
 *                                the pointers apart (a finger each), for:
 *   pointerMove(id, x, y)        optional: a pointer pressed on the stage moved
 *   pointerUp(id)                optional: and was lifted (or the browser took it over)
 *   keyDown(key)                 optional: a key pressed while playing; return true if the game uses it
 *   keyUp(key)                   optional: a key released
 *   blur()                       optional: forget held keys (pause, or the window lost focus)
 * and can call api.addScore(n), api.loseLife(), api.gainLife(), api.score(), api.lives(), api.maxLives()
 * and api.size().
 */
import { controlsHtml, renderLives, tipHtml } from './icons.js';
import { createLeaderboard, normalizeInitials } from './leaderboard.js';

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

  var current = null;    // { def, instance, board }
  var pending = null;    // a high score waiting for the player's initials
  var tipAt = {};        // by game id: the position of the tip shown last
  var index = 0;
  var status = 'ready';  // ready | playing | paused | over
  var score = 0;
  var lives = 0;
  var time = 0;
  var frameId = 0;
  var lastFrame = 0;
  var width = 0;
  var height = 0;

  function maxLives() {
    return current.def.maxLives || current.def.lives;
  }

  var api = {
    addScore: function (n) {
      score += n;
      ui.scoreEl.textContent = score;
    },
    loseLife: function () {
      if (status !== 'playing') return;
      lives = Math.max(0, lives - 1);
      showLives();
      ui.stage.classList.remove('is-hit');
      void ui.stage.offsetWidth; // restart the hit animation
      ui.stage.classList.add('is-hit');
      if (lives === 0) gameOver();
    },
    gainLife: function () {
      if (status !== 'playing' || lives >= maxLives()) return;
      lives += 1;
      showLives();
    },
    lives: function () {
      return lives;
    },
    score: function () {
      return score;
    },
    maxLives: function () {
      return maxLives();
    },
    size: function () {
      return { width: width, height: height };
    }
  };

  function showLives() {
    renderLives(ui.livesEl, lives, maxLives());
  }

  // a fresh run of the current game: the lives are set before the reset, so a game may build itself
  // from them
  function newRun() {
    score = 0;
    lives = current.def.lives;
    time = 0;
    current.instance.reset();
    ui.scoreEl.textContent = '0';
    showLives();
  }

  function lastInitials() {
    return normalizeInitials(storage.get('relax.initials'));
  }

  function formatScore(value) {
    return value.toLocaleString('en-US');
  }

  // a tip on the start screen, among the game's tips for the input in use: the first one at random,
  // then with next, the one after the last one shown (back to the first after the last)
  function showTip(next) {
    var tips = (current.def.tips || []).filter(function (tip) {
      return typeof tip === 'string' || tip.touch === usingTouch;
    });
    ui.tipEl.hidden = !tips.length;
    ui.overlay.classList.toggle('has-tip', tips.length > 0);
    if (!tips.length) return;
    var id = current.def.id;
    if (!(id in tipAt)) tipAt[id] = Math.floor(Math.random() * tips.length);
    else if (next) tipAt[id] += 1;
    ui.tipEl.innerHTML = tipHtml(tips[tipAt[id] % tips.length], usingTouch);
  }

  // the overlay starts plain: the leaderboard, the initials form and the tip are added by the caller
  function showOverlay(title, text, hint) {
    ui.overlayTitle.textContent = title;
    ui.overlayText.textContent = text;
    ui.overlayHint.textContent = hint;
    ui.board.hidden = true;
    ui.initialsForm.hidden = true;
    ui.tipEl.hidden = true;
    ui.overlay.classList.remove('has-tip');
    clearTimeout(guardTimer);
    ui.overlayHint.disabled = false;
    ui.overlay.hidden = false;
  }

  function showBoard(highlight) {
    ui.board.innerHTML = current.board.html(highlight);
    ui.board.hidden = false;
  }

  // record the high score waiting for initials (also when the player moves on without typing them)
  function savePending(initials) {
    if (pending === null) return null;
    var entry = current.board.add(initials || lastInitials() || 'YOU', pending);
    storage.set('relax.initials', entry.name);
    pending = null;
    return entry;
  }

  function saveInitials(raw) {
    var entry = savePending(normalizeInitials(raw));
    if (!entry) return;
    ui.initialsForm.hidden = true;
    ui.overlayText.textContent = 'You scored ' + formatScore(entry.score) + '. Saved as ' + entry.name + '.';
    showBoard(entry);
  }

  function load(i) {
    if (current) savePending();
    index = (i + games.length) % games.length;
    var def = games[index];
    current = { def: def, instance: def.create(api), board: createLeaderboard(storage, def) };
    status = 'ready';
    newRun();
    ui.titleEl.textContent = def.title;
    ui.controlsEl.innerHTML = controlsHtml(def, usingTouch);
    ui.livesEl.hidden = !!def.hideLives; // a game can show its lives its own way
    showOverlay(def.title, def.description, 'Start');
    showBoard();
    showTip(true);
  }

  function start() {
    savePending();
    newRun();
    status = 'playing';
    ui.overlay.hidden = true;
    ui.canvas.focus({ preventScroll: true });
  }

  function pause() {
    if (status !== 'playing') return;
    blur();
    status = 'paused';
    showOverlay('Paused', 'Score: ' + formatScore(score) + '.', 'Resume');
  }

  function resume() {
    status = 'playing';
    ui.overlay.hidden = true;
    lastFrame = performance.now();
  }

  function gameOver() {
    status = 'over';
    if (current.board.qualifies(score)) {
      // a top score: arcade style, ask for the player's initials
      pending = score;
      showOverlay('New high score!', 'You scored ' + formatScore(score) + '. Your initials:', 'Play again');
      ui.initialsInput.value = lastInitials();
      ui.initialsForm.hidden = false;
    } else {
      // any other score is recorded quietly, so the player's best always shows on the board
      var entry = score > 0 ? current.board.add(lastInitials() || 'YOU', score) : null;
      showOverlay('Game over', 'You scored ' + formatScore(score) + '.', 'Play again');
      showBoard(entry);
    }
    // the game usually ends mid-click or mid-keypress: keep the button inactive for a moment,
    // and only then let the initials field take the keyboard
    ui.overlayHint.disabled = true;
    clearTimeout(guardTimer);
    guardTimer = setTimeout(function () {
      ui.overlayHint.disabled = false;
      if (!ui.initialsForm.hidden) {
        ui.initialsInput.focus({ preventScroll: true });
        ui.initialsInput.select();
      }
    }, OVERLAY_GUARD);
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
    ui.controlsEl.innerHTML = controlsHtml(current.def, usingTouch);
    if (status === 'ready') showTip();
  }

  // input on the stage: returns whether the game used it
  function pointerDown(x, y, button, pointerType, id) {
    if (status !== 'playing' || !current.instance.pointerDown) return false;
    current.instance.pointerDown(x, y, button, pointerType, id);
    return true;
  }

  function pointerMove(id, x, y) {
    if (status === 'playing' && current.instance.pointerMove) current.instance.pointerMove(id, x, y);
  }

  // like key releases, lifted pointers always reach the game
  function pointerUp(id) {
    if (current.instance.pointerUp) current.instance.pointerUp(id);
  }

  function keyDown(key) {
    return status === 'playing' && !!current.instance.keyDown && !!current.instance.keyDown(key);
  }

  // releases always reach the game, so no key stays held across a pause
  function keyUp(key) {
    if (current.instance.keyUp) current.instance.keyUp(key);
  }

  function blur() {
    if (current.instance.blur) current.instance.blur();
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
    pointerMove: pointerMove,
    pointerUp: pointerUp,
    keyDown: keyDown,
    saveInitials: saveInitials,
    keyUp: keyUp,
    blur: blur,
    status: function () { return status; },
    index: function () { return index; },
    gameCount: games.length
  };
}
