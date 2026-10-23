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

// a game's controls for the bottom bar: mouse buttons (or a tap on touch screens) and keys
export function controlsHtml(controls, touch) {
  return controls.map(function (control) {
    var icon = control.type === 'mouse'
      ? (touch ? tapIcon() : mouseIcon(control.button))
      : control.keys.map(function (key) { return '<kbd>' + key + '</kbd>'; }).join('');
    return '<span class="relax-control" title="' + control.label + '">' + icon + '<span>' + control.label + '</span></span>';
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
