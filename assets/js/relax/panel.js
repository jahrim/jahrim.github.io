/*
 * Panel: opens and closes the games, and wires the page to the engine.
 * It slides over the sidebar from the left on desktop and tablet, and drops down from the top as a
 * full screen on phones, where the sidebar is the hamburger menu.
 */

import { normalizeInitials } from './leaderboard.js';

export function initPanel(ui, engine) {
  var phone = window.matchMedia('(max-width: 767px)'); // the theme's smartphone layout
  var lastOpener = null;
  var inerted = [];

  function isOpen() {
    return ui.panel.classList.contains('is-open');
  }

  function setExpanded(value) {
    ui.openButtons.forEach(function (button) { button.setAttribute('aria-expanded', String(value)); });
  }

  // what the panel covers can't be used meanwhile: the sidebar on desktop and tablet,
  // the whole page on phones (where the panel is full screen)
  function blockBackground() {
    var covered = phone.matches
      ? Array.prototype.filter.call(document.body.children, function (el) { return el !== ui.panel && el.tagName !== 'SCRIPT'; })
      : [document.querySelector('body > header')].filter(Boolean);
    covered.forEach(function (el) { el.inert = true; });
    inerted = covered;
    document.documentElement.classList.toggle('relax-locked', phone.matches);
  }

  function unblockBackground() {
    inerted.forEach(function (el) { el.inert = false; });
    inerted = [];
    document.documentElement.classList.remove('relax-locked');
  }

  // the theme's hamburger menu toggles on a click of the mobile header
  function closeMobileMenu() {
    var hamburger = document.querySelector('.hamburger');
    var header = document.querySelector('.mobile-header');
    if (hamburger && header && hamburger.classList.contains('cross')) header.click();
  }

  function open(opener) {
    if (isOpen()) return;
    lastOpener = opener || null;
    if (phone.matches) closeMobileMenu(); // the game drops down over the page, not over the menu
    ui.panel.classList.add('is-open');
    ui.panel.setAttribute('aria-hidden', 'false');
    setExpanded(true);
    blockBackground();
    engine.resize();
    engine.run();
    ui.overlay.hidden ? ui.canvas.focus({ preventScroll: true }) : ui.overlayHint.focus({ preventScroll: true });
  }

  function close() {
    if (!isOpen()) return;
    engine.pause();
    ui.panel.classList.remove('is-open');
    ui.panel.setAttribute('aria-hidden', 'true');
    setExpanded(false);
    unblockBackground();
    engine.halt();
    // back to the entry that opened the panel, if it is still visible (the phone menu is closed by now)
    if (lastOpener && lastOpener.offsetParent !== null) lastOpener.focus({ preventScroll: true });
  }

  // the entries are links (to look like the other menu links): open the panel instead of jumping
  ui.openButtons.forEach(function (button) {
    button.addEventListener('click', function (event) { event.preventDefault(); open(button); });
  });
  ui.closeButton.addEventListener('click', close);
  ui.restartButton.addEventListener('click', engine.start);
  // a game's start screen: this game's (leaving the current run, where games can be switched),
  // or the previous or next game's
  function go(offset) {
    engine.load(engine.index() + offset);
    ui.overlayHint.focus();
  }
  ui.menuButton.addEventListener('click', function () { go(0); });
  ui.prevButton.addEventListener('click', function () { go(-1); });
  ui.nextButton.addEventListener('click', function () { go(1); });
  ui.prevButton.disabled = ui.nextButton.disabled = engine.gameCount < 2;

  // only the overlay's button starts or resumes: clicks elsewhere on the overlay are ignored
  ui.overlayHint.addEventListener('click', function () {
    if (engine.status() === 'paused') engine.resume();
    else engine.start();
  });

  // arcade-style initials: letters only, capitals, at most 3; Enter or Save records them
  ui.initialsInput.addEventListener('input', function () {
    var clean = normalizeInitials(ui.initialsInput.value);
    if (clean !== ui.initialsInput.value) ui.initialsInput.value = clean;
  });
  ui.initialsForm.addEventListener('submit', function (event) {
    event.preventDefault();
    engine.saveInitials(ui.initialsInput.value);
    ui.overlayHint.focus({ preventScroll: true });
  });

  // follow the input actually in use for the controls icon (touch or mouse): a press, or a mouse
  // moving (before any click, where the device was guessed wrong)
  document.addEventListener('pointerdown', function (event) {
    if (event.pointerType === '') return;
    engine.setTouch(event.pointerType === 'touch' || event.pointerType === 'pen');
  }, true);
  document.addEventListener('pointermove', function (event) {
    if (event.pointerType === 'mouse') engine.setTouch(false);
  }, true);

  // pointers on the stage, each finger on its own (a game can use several at once): captured, so
  // they are followed until lifted even when they slide off the stage
  ui.canvas.tabIndex = -1;
  ui.canvas.addEventListener('pointerdown', function (event) {
    var rect = ui.canvas.getBoundingClientRect();
    if (engine.pointerDown(event.clientX - rect.left, event.clientY - rect.top, event.button, event.pointerType, event.pointerId)) {
      event.preventDefault();
      ui.canvas.setPointerCapture(event.pointerId);
    }
  });
  ui.canvas.addEventListener('pointermove', function (event) {
    var rect = ui.canvas.getBoundingClientRect();
    engine.pointerMove(event.pointerId, event.clientX - rect.left, event.clientY - rect.top);
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (type) {
    ui.canvas.addEventListener(type, function (event) { engine.pointerUp(event.pointerId); });
  });
  ui.canvas.addEventListener('contextmenu', function (event) { event.preventDefault(); });
  // touch-action: none is not enough for some browsers, which still turn swipes on the stage into
  // their own gestures (refresh, navigation): cancel the touches themselves (pointer events still come)
  ['touchstart', 'touchmove'].forEach(function (type) {
    ui.canvas.addEventListener(type, function (event) { event.preventDefault(); }, { passive: false });
  });

  document.addEventListener('keydown', function (event) {
    if (!isOpen()) return;
    if (event.key === 'Escape') {
      close();
    } else if (engine.keyDown(event.key)) {
      event.preventDefault();
    }
  });

  document.addEventListener('keyup', function (event) {
    if (isOpen()) engine.keyUp(event.key);
  });
  // keys released while the window is in the background never arrive: forget them
  window.addEventListener('blur', function () { engine.blur(); });

  // pause when the page is hidden, and close when switching between the phone and the larger layouts
  document.addEventListener('visibilitychange', function () { if (document.hidden) engine.pause(); });
  phone.addEventListener('change', close);
  // keep the canvas resolution in sync with the stage, whatever changes its size (window, zoom, layout)
  if ('ResizeObserver' in window) {
    new ResizeObserver(engine.resize).observe(ui.stage);
  } else {
    window.addEventListener('resize', engine.resize);
  }
}
