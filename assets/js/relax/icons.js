/*
 * Icons shared by the engine and the games.
 */

var SVG_NS = 'http://www.w3.org/2000/svg';
var ACCENT = '#F6EB0F'; // the panel's accent (--relax-accent): mouse buttons, key arrows, touches

// heart icon (24x24 viewBox): shown for the lives and inside the heart bubbles
export var HEART_ICON = 'M12 20.5s-7.5-4.6-9.3-9.2C1.5 8.1 3.5 4.5 7 4.5c2 0 3.5 1.1 5 3 1.5-1.9 3-3 5-3 3.5 0 5.5 3.6 4.3 6.8-1.8 4.6-9.3 9.2-9.3 9.2z';

function mouseIcon(button) {
  var left = button === 'left' || button === 'both';
  var right = button === 'right' || button === 'both';
  return '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6">' +
    '<rect x="6" y="3" width="12" height="18" rx="6"/>' +
    '<path d="M12 3v7M6 10h12"/>' +
    (left ? '<path d="M12 3.2v6.6H6.2V9a5.8 5.8 0 0 1 5.8-5.8z" fill="' + ACCENT + '" stroke="none"/>' : '') +
    (right ? '<path d="M12 3.2v6.6h5.8V9A5.8 5.8 0 0 0 12 3.2z" fill="' + ACCENT + '" stroke="none"/>' : '') +
    '</svg>';
}

// the four arrow keys in their keyboard layout, as a single icon (the games accept WASD as well); with
// `lit` ('up', 'left', 'down', 'right'), the other keys are dimmed
function arrowKeysIcon(lit) {
  var key = function (name, x, y, arrow) {
    var dim = lit && lit.indexOf(name) < 0 ? ' opacity="0.3"' : '';
    return '<g' + dim + '><rect x="' + x + '" y="' + y + '" width="7" height="7" rx="1.6"/>' +
      '<path d="' + arrow + '" stroke="' + ACCENT + '"/></g>';
  };
  return '<svg class="relax-arrows" viewBox="0 0 26 18" width="28" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">' +
    key('up', 9.5, 1, 'M11.4 5.6l1.6-1.6 1.6 1.6') +
    key('left', 1, 10, 'M5.6 11.9l-1.6 1.6 1.6 1.6') +
    key('down', 9.5, 10, 'M11.4 12.4l1.6 1.6 1.6-1.6') +
    key('right', 18, 10, 'M20.4 11.9l1.6 1.6-1.6 1.6') +
    '</svg>';
}

// a gesture on a touch screen (24x24): a phone, the area touched lit in dim yellow and the touch as a
// yellow dot: 'tap' anywhere (a round area), on the 'left' or 'right' half, or 'swipe' any way
function phoneIcon(gesture) {
  var dot = function (x, y, r) { return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + ACCENT + '" stroke="none"/>'; };
  var body;
  if (gesture === 'left' || gesture === 'right') {
    var left = gesture === 'left' ? 7 : 12;
    body = '<rect x="' + left + '" y="4" width="5" height="16" fill="' + ACCENT + '" fill-opacity="0.35" stroke="none"/>' +
      dot(left + 2.5, 12, 1.9);
  } else if (gesture === 'swipe') {
    // an arrow pointing up, its tip `reach` above the dot; across the narrow phone they reach less far
    var arrow = function (turn, reach) {
      var tip = 12 - reach;
      return '<path transform="rotate(' + turn + ' 12 12)" d="M12 10.5V' + tip + 'M10.4 ' + (tip + 1.6) + 'L12 ' + tip + ' 13.6 ' + (tip + 1.6) + '"/>';
    };
    body = '<g stroke="' + ACCENT + '" stroke-width="1">' + arrow(0, 6.8) + arrow(90, 4.4) + arrow(180, 6.8) + arrow(270, 4.4) + '</g>' +
      dot(12, 12, 1);
  } else {
    body = '<circle cx="13.6" cy="9.4" r="3.4" fill="' + ACCENT + '" fill-opacity="0.35" stroke="none"/>' + dot(13.6, 9.4, 1.9);
  }
  return '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
    body + '<rect x="6" y="2.5" width="12" height="19" rx="2.5"/></svg>';
}

// a control's icon: mouse buttons (a tap anywhere on touch screens), arrow keys, keys, or a touch
// screen gesture (a hint: phoneIcon, its icon 'tap', 'left', 'right' or 'swipe')
function controlIcon(control, touch) {
  if (control.type === 'hint') return phoneIcon(control.icon);
  if (control.type === 'mouse') return touch ? phoneIcon('tap') : mouseIcon(control.button);
  if (control.type === 'arrows') return arrowKeysIcon(control.lit);
  return control.keys.map(function (key) { return '<kbd>' + key + '</kbd>'; }).join('');
}

// a game's touch control: a hint, a gesture and its label; the game reads the gestures itself
function touchControlHtml(control) {
  return '<span class="relax-control relax-hint" title="' + (control.title || control.label) + '">' + controlIcon(control) +
    '<span>' + control.label + '</span></span>';
}

// a tip for the start screen: "Tip:", its control's icon (an entry like the controls'), if it has
// one, and its text
export function tipHtml(tip, touch) {
  var icon = tip.icon ? controlIcon(tip.icon, touch) : '';
  return '<span>Tip:</span>' + icon + '<span>' + (tip.text || tip) + '</span>';
}

// a game's controls for the bottom bar: on touch screens its touch controls, if it has any; else mouse
// buttons, arrow keys and keys
export function controlsHtml(def, touch) {
  if (touch && def.touchControls) return def.touchControls.map(touchControlHtml).join('');
  return def.controls.map(function (control) {
    var icon = controlIcon(control, touch);
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
