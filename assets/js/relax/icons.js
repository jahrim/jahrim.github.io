/*
 * Icons shared by the engine and the games.
 */

var SVG_NS = 'http://www.w3.org/2000/svg';

// heart icon (24x24 viewBox): shown for the lives and inside the heart bubbles
export var HEART_ICON = 'M12 20.5s-7.5-4.6-9.3-9.2C1.5 8.1 3.5 4.5 7 4.5c2 0 3.5 1.1 5 3 1.5-1.9 3-3 5-3 3.5 0 5.5 3.6 4.3 6.8-1.8 4.6-9.3 9.2-9.3 9.2z';

function mouseIcon(button) {
  var left = button === 'left' || button === 'both';
  var right = button === 'right' || button === 'both';
  return '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6">' +
    '<rect x="6" y="3" width="12" height="18" rx="6"/>' +
    '<path d="M12 3v7M6 10h12"/>' +
    (left ? '<path d="M12 3.2v6.6H6.2V9a5.8 5.8 0 0 1 5.8-5.8z" fill="#F6EB0F" stroke="none"/>' : '') +
    (right ? '<path d="M12 3.2v6.6h5.8V9A5.8 5.8 0 0 0 12 3.2z" fill="#F6EB0F" stroke="none"/>' : '') +
    '</svg>';
}

// a pointing hand tapping (ripple at the fingertip), shown instead of the mouse on touch screens;
// the hand is Lucide's "pointer" icon (ISC license), scaled down to leave room for the ripple
function tapIcon() {
  return '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M6.3 3.6a4.2 4.2 0 0 1 6.2 0" stroke="#F6EB0F"/>' +
    '<circle cx="9.4" cy="5.9" r="1.3" fill="#F6EB0F" stroke="none"/>' +
    '<g transform="translate(3.2 4.3) scale(0.78)" stroke-width="2.05">' +
    '<path d="M22 14a8 8 0 0 1-8 8"/>' +
    '<path d="M18 11v-1a2 2 0 0 0-2-2a2 2 0 0 0-2 2"/>' +
    '<path d="M14 10V9a2 2 0 0 0-2-2a2 2 0 0 0-2 2v1"/>' +
    '<path d="M10 9.5V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v10"/>' +
    '<path d="M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>' +
    '</g>' +
    '</svg>';
}

// the four arrow keys in their keyboard layout, as a single icon (the games accept WASD as well)
function arrowKeysIcon() {
  var key = function (x, y, arrow) {
    return '<rect x="' + x + '" y="' + y + '" width="7" height="7" rx="1.6"/>' +
      '<path d="' + arrow + '" stroke="#F6EB0F"/>';
  };
  return '<svg class="relax-arrows" viewBox="0 0 26 18" width="28" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">' +
    key(9.5, 1, 'M11.4 5.6l1.6-1.6 1.6 1.6') +  // up
    key(1, 10, 'M5.6 11.9l-1.6 1.6 1.6 1.6') +  // left
    key(9.5, 10, 'M11.4 12.4l1.6 1.6 1.6-1.6') + // down
    key(18, 10, 'M20.4 11.9l1.6 1.6-1.6 1.6') + // right
    '</svg>';
}

// gestures on touch screens (24x24, like the tap): a finger (a yellow dot) swiping any of four ways,
// and two fingers held down
function gestureIcon(name) {
  var body;
  if (name === 'two') {
    body = '<path d="M5.2 8.4a4 4 0 0 1 6.6 0M12.2 8.4a4 4 0 0 1 6.6 0" stroke="#F6EB0F"/>' +
      '<circle cx="8.5" cy="13" r="2.6"/><circle cx="15.5" cy="13" r="2.6"/>';
  } else {
    var arrows = '<path d="M12 3v5M9.6 5.4L12 3l2.4 2.4"/>';
    body = [0, 90, 180, 270].map(function (turn) {
      return '<g transform="rotate(' + turn + ' 12 12)">' + arrows + '</g>';
    }).join('') + '<circle cx="12" cy="12" r="2.4" fill="#F6EB0F" stroke="none"/>';
  }
  return '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
    body + '</svg>';
}

// a game's touch control: a hint, an icon and its label (icon: 'hold' or by default a tap, 'two'
// fingers or 'swipe'); the game reads the gestures itself
function touchControlHtml(control) {
  var icon = control.icon === 'two' || control.icon === 'swipe' ? gestureIcon(control.icon) : tapIcon();
  return '<span class="relax-control relax-hint" title="' + (control.title || control.label) + '">' + icon +
    '<span>' + control.label + '</span></span>';
}

// a game's controls for the bottom bar: on touch screens its touch controls, if it has any; else mouse
// buttons (a tap on touch screens), arrow keys and keys
export function controlsHtml(def, touch) {
  if (touch && def.touchControls) return def.touchControls.map(touchControlHtml).join('');
  return def.controls.map(function (control) {
    var icon = control.type === 'mouse'
      ? (touch ? tapIcon() : mouseIcon(control.button))
      : control.type === 'arrows'
        ? arrowKeysIcon()
        : control.keys.map(function (key) { return '<kbd>' + key + '</kbd>'; }).join('');
    var label = control.label ? '<span>' + control.label + '</span>' : '';
    var title = control.title || control.label || '';
    return '<span class="relax-control" title="' + title + '">' + icon + label + '</span>';
  }).join('');
}

export function renderLives(container, lives, max) {
  container.textContent = '';
  for (var i = 0; i < max; i++) {
    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('class', 'relax-heart' + (i < lives ? '' : ' is-lost'));
    svg.setAttribute('aria-hidden', 'true');
    var path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', HEART_ICON);
    svg.appendChild(path);
    container.appendChild(svg);
  }
  container.setAttribute('aria-label', 'Lives: ' + lives + ' of ' + max);
}
