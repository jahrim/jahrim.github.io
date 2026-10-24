/*
 * Relax: mini games in a panel that opens from the sidebar ("Relax" entry).
 *
 *   main.js         this file: finds the page elements, lists the games, starts everything
 *   engine.js       game loop, score, lives, start / pause / game over screen
 *   panel.js        opening and closing (desktop, tablet, phone), events
 *   icons.js        icons shared by the engine and the games
 *   leaderboard.js  each game's top scores (preset entries and the player's own)
 *   games/*.js      one file per game (see engine.js for what a game provides)
 *
 * Hugo bundles these modules into one fingerprinted script (layouts/partials/relax/panel.html).
 */
import { createEngine } from './engine.js';
import { initPanel } from './panel.js';
import bubbles from './games/bubbles.js';
import rails from './games/rails.js';

// the games, in the order of the ‹ › arrows: to add one, create games/<name>.js and list it here
var games = [bubbles, rails];

function main() {
  var panel = document.getElementById('relax-panel');
  // "Relax" entries: one in the sidebar, one in the mobile hamburger menu
  var openButtons = Array.prototype.slice.call(document.querySelectorAll('.relax-open'));
  if (!panel || !openButtons.length) return;

  var ui = {
    panel: panel,
    openButtons: openButtons,
    titleEl: panel.querySelector('.relax-title'),
    prevButton: panel.querySelector('.relax-prev'),
    nextButton: panel.querySelector('.relax-next'),
    restartButton: panel.querySelector('.relax-restart'),
    menuButton: panel.querySelector('.relax-menu'),
    closeButton: panel.querySelector('.relax-close'),
    stage: panel.querySelector('.relax-stage'),
    canvas: panel.querySelector('.relax-canvas'),
    overlay: panel.querySelector('.relax-overlay'),
    overlayTitle: panel.querySelector('.relax-overlay-title'),
    overlayText: panel.querySelector('.relax-overlay-text'),
    overlayHint: panel.querySelector('.relax-overlay-hint'),
    board: panel.querySelector('.relax-board'),
    initialsForm: panel.querySelector('.relax-initials'),
    initialsInput: panel.querySelector('.relax-initials input'),
    controlsEl: panel.querySelector('.relax-controls'),
    scoreEl: panel.querySelector('.relax-score strong'),
    livesEl: panel.querySelector('.relax-lives')
  };

  // touch or mouse? a first guess from the device; the panel then follows the input actually used
  var touch = window.matchMedia('(pointer: coarse)').matches || window.matchMedia('(hover: none)').matches;

  var engine = createEngine(ui, games, { touch: touch });
  initPanel(ui, engine);
  engine.load(0);
}

main();
