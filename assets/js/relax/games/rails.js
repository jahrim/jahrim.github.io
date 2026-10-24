/*
 * Rails: drive a train around a looping track, mine the asteroids drifting in from the edges and
 * repair the broken stations along the line.
 *
 * Switches work like real ones: each keeps its setting (straight on at first) until the player
 * changes it, and its signals show it (green on the branch taken, red on the others). ← → move the
 * next switch ahead in the driving direction one branch to the left / right, as seen from the
 * locomotive: in reverse, like a car's steering, ← still sends the train to its left; driving,
 * reversing and passing switches never change their settings. Dead ends close with buffer stops.
 * A click on a signal sets its switch to that branch. ↑ ↓ accelerate forwards / backwards, Space
 * fires (WASD works too). On touch screens, one hand drives and the other commands: a finger held
 * down drives in the set direction (lifted, the train stops), a second one held down fires; swipes
 * set the direction (up forwards, down backwards) and the next switch (left / right, like ← →).
 * The train is a locomotive at its front (orange, with its cab) pulling wagons; it backs up in
 * reverse. The last command (↑ or ↓) sets the driving direction, where shots go, right away, even
 * while the train is still rolling the other way.
 * The first levels follow the tracks (rails-tracks.js) in order, then each level picks one at random;
 * levels get harder: faster, more frequent asteroids.
 * To clear a level, collect its minerals (destroy GOAL asteroids, fragments count) and repair every
 * broken station on its track (REPAIRS per level, from level STATIONS_FROM), in any order; each repair
 * gives points. The first levels have no stations but the start: only minerals to collect. Past the
 * quota, asteroids are worth next to nothing, so lingering to farm them doesn't pay.
 * Lives are cars: one car per life, the locomotive and the wagons behind it (3 lives: locomotive and
 * two wagons; 1: the locomotive alone), up to maxLives. Losing a life drops the last wagon with its
 * turret, the train closing up around its middle; a regained life adds an empty wagon at the back, and
 * beyond maxLives a heart station gives points.
 * Every car can carry a turret, firing straight ahead; the game starts with one, on the locomotive.
 * That one has a double barrel and fires two shots side by side.
 * From level STATIONS_FROM, each level may also add rare stations beside the track (STATIONS): heart
 * stations give a car; turret stations put a turret on the frontmost empty car (the one lost last),
 * or else upgrade the leftmost lowest-grade turret: each grade lets its shots pierce one more asteroid; explosive stations blow
 * up every asteroid in play. Each station serves once.
 * Stopping at a station fills its progress; moving along it pauses the progress, leaving resets it.
 *
 * Like Bubbles, the world is relative to the stage: lengths are fractions of its shorter side
 * ("units"), measured from its center, so the game rescales with the panel.
 */

var KEYS = {
  ArrowLeft: 'left', a: 'left', A: 'left',
  ArrowRight: 'right', d: 'right', D: 'right',
  ArrowUp: 'up', w: 'up', W: 'up',
  ArrowDown: 'down', s: 'down', S: 'down',
  ' ': 'fire', Spacebar: 'fire'
};

import { TRACKS, arrival, choose, exits, reverse, stepPoint } from './rails-tracks.js';

// station kinds: the icon shown in the square beside each station, drawn upright in a box from
// -0.5 to 0.5 (more kinds can be added here)
var STATION_ICONS = {
  // the train's starting point: a flag
  start: function (c) {
    c.strokeStyle = '#B9C2CB';
    c.lineWidth = 0.08;
    c.beginPath();
    c.moveTo(-0.22, 0.32);
    c.lineTo(-0.22, -0.32);
    c.stroke();
    c.fillStyle = '#F6EB0F';
    c.beginPath();
    c.moveTo(-0.2, -0.32);
    c.lineTo(0.3, -0.16);
    c.lineTo(-0.2, 0);
    c.closePath();
    c.fill();
  },
  // a stop for a new turret, or a turret upgrade: a turret seen from above
  turret: function (c) {
    c.fillStyle = '#F6EB0F';
    c.fillRect(-0.06, -0.42, 0.12, 0.3); // barrel
    c.beginPath();
    c.arc(0, 0.08, 0.26, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#0B2230';
    c.beginPath();
    c.arc(0, 0.08, 0.1, 0, Math.PI * 2);
    c.fill();
  },
  // a broken station waiting for repairs: a wrench
  repair: function (c) {
    c.save();
    c.rotate(Math.PI / 4);
    c.fillStyle = '#FF9F43';
    c.fillRect(-0.06, -0.2, 0.12, 0.5);  // handle
    c.beginPath();
    c.arc(0, -0.24, 0.16, 0, Math.PI * 2); // head
    c.fill();
    c.fillStyle = '#0B2230';
    c.fillRect(-0.06, -0.42, 0.12, 0.18); // its jaw
    c.restore();
  },
  // a repaired station: a check mark
  repaired: function (c) {
    c.strokeStyle = '#59CD90';
    c.lineWidth = 0.12;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.beginPath();
    c.moveTo(-0.26, 0.02);
    c.lineTo(-0.08, 0.2);
    c.lineTo(0.28, -0.18);
    c.stroke();
  },
  // a stop that clears the arena: a bomb with a lit fuse
  explosive: function (c) {
    c.fillStyle = '#8494A4';
    c.beginPath();
    c.arc(-0.06, 0.08, 0.27, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#B9C2CB';
    c.beginPath();
    c.arc(-0.14, 0, 0.07, 0, Math.PI * 2); // shine
    c.fill();
    c.fillStyle = '#5D6E7E';
    c.fillRect(0.06, -0.22, 0.12, 0.1); // fuse cap
    c.strokeStyle = '#B9C2CB';
    c.lineWidth = 0.05;
    c.beginPath();
    c.moveTo(0.12, -0.22);
    c.quadraticCurveTo(0.16, -0.36, 0.28, -0.34);
    c.stroke();
    c.fillStyle = '#FF9F43';
    c.beginPath();
    c.arc(0.3, -0.34, 0.09, 0, Math.PI * 2); // spark
    c.fill();
    c.fillStyle = '#F6EB0F';
    c.beginPath();
    c.arc(0.3, -0.34, 0.045, 0, Math.PI * 2);
    c.fill();
  },
  // a stop for a new life (or points at full lives): a heart
  heart: function (c) {
    c.fillStyle = '#FD3519';
    c.beginPath();
    c.moveTo(0, 0.34);
    c.bezierCurveTo(-0.56, 0.02, -0.42, -0.46, 0, -0.17);
    c.bezierCurveTo(0.42, -0.46, 0.56, 0.02, 0, 0.34);
    c.closePath();
    c.fill();
  }
};

// the level's goals in the corner, drawn like the station icons: minerals (an asteroid, as the ones
// in play) and repairs (the broken stations' wrench)
var GOAL_ICONS = {
  minerals: function (c) {
    var shape = [1, 0.82, 0.95, 0.78, 1, 0.88, 0.8, 0.97, 0.85, 0.92];
    c.beginPath();
    shape.forEach(function (k, n) {
      var angle = (n / shape.length) * Math.PI * 2;
      var x = Math.cos(angle) * 0.4 * k;
      var y = Math.sin(angle) * 0.4 * k;
      if (n) c.lineTo(x, y);
      else c.moveTo(x, y);
    });
    c.closePath();
    c.fillStyle = 'rgba(132,148,164,0.25)';
    c.fill();
    c.lineWidth = 0.09;
    c.strokeStyle = '#B9C2CB';
    c.stroke();
  },
  repairs: STATION_ICONS.repair
};

var LOCOMOTIVE_COLOR = '#FF8C42';
var WAGON_COLOR = '#3FA7D6';

export default {
  id: 'rails',
  title: 'Rails',
  description: 'Mine the asteroids, repair the stations, keep the train in one piece! Click a signal to set its switch.',
  touchDescription: 'Mine the asteroids, repair the stations, keep the train in one piece! Hold a finger down to drive and a second one to fire. Swipe up or down to drive forwards or backwards, left or right to set the next switch.',
  controls: [
    { type: 'arrows', label: 'Drive', title: 'Drive: arrow keys or WASD' },
    { type: 'keys', keys: ['Space'], label: 'Fire' }
  ],
  // on touch screens, gestures on the stage (see the pointer handlers)
  touchControls: [
    { type: 'hint', icon: 'hold', label: 'Drive', title: 'Hold a finger down to drive' },
    { type: 'hint', icon: 'two', label: 'Fire', title: 'Hold a second finger down to fire' },
    { type: 'hint', icon: 'swipe', label: 'Directions', title: 'Swipe up or down to drive forwards or backwards, left or right to set the next switch' }
  ],
  lives: 3,
  maxLives: 4,     // the longest train: locomotive and three wagons
  hideLives: true, // the train shows the lives: one car each
  // preset leaderboard: about 7,000 points clear five levels, so the top one, JAH's best, is a long ride
  leaderboard: [
    { name: 'JAH', score: 20000 },
    { name: 'CHU', score: 12000 },
    { name: 'ZAP', score: 7000 },
    { name: 'BAM', score: 3500 },
    { name: 'OOF', score: 1500 }
  ],
  create: function (api) {
    // Train
    var ACCEL = 0.5;          // units/s² while ↑ or ↓ is held
    var BRAKE = 1.2;          // units/s² when pushing against the current motion (and on touch, when let go)
    var FRICTION = 0.25;      // units/s² slowing the train down when nothing is held
    var MAX_SPEED = 0.8;      // units/s
    var CAR_LENGTH = 0.06;
    var CAR_WIDTH = 0.032;
    var CAR_GAP = 0.072;      // arc length between the centers of two cars
    var HIT_RADIUS = 0.026;   // of each car, against asteroids
    var INVULNERABLE = 2;     // seconds of protection after a hit
    // Bullets
    var BULLET_SPEED = 1.3;   // units/s, on top of the train's own speed
    var BULLET_LIFE = 1.4;    // seconds
    var FIRE_COOLDOWN = 0.28; // seconds between shots while Space is held
    var DOUBLE_BARREL = 0.0065; // units from the aim to each of the front turret's two barrels
    // Asteroids
    var SIZES = [0.072, 0.047, 0.028]; // radius by generation: big, medium, small
    var POINTS = [20, 50, 100];        // points for destroying each size ...
    var OVER_QUOTA = 0.02;             // ... and this share of them (at least 1) once the level's quota is met
    var SPLIT = 2;                     // fragments when a big or medium asteroid is shot
    // Levels: destroy GOAL asteroids (fragments count) to move on; each level is faster and busier
    var GOAL = 8;             // asteroids to destroy in level 1 ...
    var GOAL_STEP = 4;        // ... and this many more in each following level
    var LEVEL_BONUS = 100;    // points × level for completing it
    var SPEED_START = 0.12;   // units/s of the asteroids in level 1
    var SPEED_STEP = 0.05;    // +5% per level
    var SPAWN_START = 2.6;    // seconds between asteroids in level 1
    var SPAWN_FACTOR = 0.93;  // ×0.93 per level ...
    var SPAWN_MIN = 0.9;      // ... down to this
    var BANNER = 2;           // seconds the level banner shows before the asteroids come
    // Stations: standing by one for its dwell (in seconds) gives its service. None appear before
    // level STATIONS_FROM; from then on each level has REPAIRS
    // broken stations to repair, placed first; then each rare kind may appear, by its chance.
    var STATIONS = {
      repair: { dwell: 2.5 },                // repaired: REPAIR_POINTS, and one less to clear the level
      heart: { chance: 0.5, dwell: 2 },      // a life back (HEART_STATION_POINTS when none is missing)
      turret: { chance: 0.25, dwell: 2 },    // a new turret, or an upgrade
      explosive: { chance: 0.2, dwell: 2 }   // every asteroid in play blows up, for its points
    };
    var FIXED_TRACKS = 2;            // the first levels take the first tracks, in order; then at random
    var STATIONS_FROM = 3;           // the first levels have the start station only: minerals are the goal
    var REPAIRS = [1, 1, 2, 2, 3];   // broken stations from level STATIONS_FROM on, then the last for the rest
    var REPAIR_POINTS = 150;
    var HEART_STATION_POINTS = 250;
    var BLAST = 0.5;                 // seconds of the explosive station's shock wave
    var STATION_SPACING = 0.3;       // units between stations (and from the start station)
    var MIN_SPACING = 0.16;          // ... or at least this, on a crowded track
    var SIGNAL_OUT = 0.055;          // units from a branch to its signal's lamp
    var SIGNAL_SPACING = 0.065;      // ... and between two lamps, so they stay apart
    var SIGNAL_REACH = 0.035;        // how close to a lamp a click sets its switch
    var SWIPE = 0.06;                // units a finger moves for a swipe ...
    var SWIPE_TIME = 0.35;           // ... within these seconds of touching down (later, it's a drifting hold)
    var FIRE_HOLD = 0.1;             // seconds a second finger is held before firing (not a swipe starting)
    var WAY_BEFORE = 0.04;           // units of the way ahead lit before the next switch ...
    var WAY_PAST = 0.2;              // ... and past it (its setting), fading out at both ends
    var WAY_ALPHA = 0.18;            // how bright it is lit, at the switch
    var WAY_STEP = 0.01;             // units between the way's points
    // a station: a platform with a building, and a square sign just past the platform's end, on one
    // side of the track (in the track's frame at the station: along it, and across it)
    var STATION = { gap: 0.028, length: 0.075, depth: 0.02, building: 0.036, buildingDepth: 0.011, sign: 0.034, signGap: 0.006 };
    var STATION_RECTS = [               // its footprint, across measured towards its side
      { a0: -STATION.length / 2, a1: STATION.length / 2, c0: STATION.gap, c1: STATION.gap + STATION.depth },
      { a0: STATION.length / 2 + STATION.signGap, a1: STATION.length / 2 + STATION.signGap + STATION.sign,
        c0: STATION.gap, c1: STATION.gap + STATION.sign }
    ];
    var RAIL_ROOM = 0.027;           // from a station's footprint to any track's center line: clear of the sleepers
    var LAMP_ROOM = 0.03;            // ... and to a signal's lamp, with room to spare
    var TUNNEL_ROOM = 0.15;          // from a station's point to a tunnel mouth
    var TUNNEL = { depth: 0.075, width: 0.05, wall: 0.009 }; // a tunnel mouth: hides the cars going through
    var GRADE_COLORS = ['#FCFCFD', '#F6EB0F', '#FF9F43', '#FD3519']; // by grade (piercing), then the last
    var STOPPED = 0.02;             // units/s: slower than this, the train counts as standing
    var ALONGSIDE = 0.05;           // a car this close to a station's point is alongside its platform
    // Route: the steps of track under the train, plus this much ahead and behind it
    var MARGIN = 0.03;
    var BUFFER_GAP = 0.012;   // between a buffer stop and the car stopped against it
    var LOOKAHEAD = 5;        // how far ahead to look for the next switch (longer than any track)

    // route: the steps under the train, from its back to its front; head: distance of the front car
    // from the route's back end
    // trackIndex: the level's track in TRACKS; deck: the tracks still to come up at random
    var track, trackIndex, deck, route, head, v, facing, keys, cooldown, invulnerable;
    var bullets, rocks, debris, texts, waves, level, destroyed, spawnTimer, banner, bannerText;
    var clock; // seconds played, for timing the touches
    // touches: the fingers down on the stage, by pointer id: { x, y, at, swiped }; touchDriving: the
    // player drives by touch (the train stops when let go, instead of coasting)
    var touches, touchDriving;
    var levelDone; // the level's goal is reached: the next level starts once this frame's hits are counted
    // turrets: one slot per car (per life), front to back, holding { grade } or null;
    // rockIds number asteroids for piercing shots
    var turrets, rockIds;

    // one car per life, at least the locomotive the game ends with
    function carCount() {
      return Math.max(1, turrets ? turrets.length : api.lives());
    }

    function stepLength(step) {
      return track.segments[step.seg].length;
    }

    function routeLength() {
      return route.reduce(function (total, step) { return total + stepLength(step); }, 0);
    }

    // the point at distance d from the route's back end, heading towards its front
    function pointAt(d) {
      for (var i = 0; i < route.length; i++) {
        var length = stepLength(route[i]);
        if (d <= length || i === route.length - 1) return stepPoint(track, route[i], Math.max(0, Math.min(length, d)));
        d -= length;
      }
    }

    // a switch is an arrival (a step reaching a node) with more than one way on; its setting is
    // the step it sends trains onto, kept on the track until the player changes it
    function switchKey(arr) {
      return arr.seg + ':' + arr.end;
    }

    function setting(arr, options) {
      var chosen = track.settings[switchKey(arr)];
      for (var i = 0; chosen && i < options.length; i++) {
        if (options[i].step.seg === chosen.seg && options[i].step.dir === chosen.dir) return options[i];
      }
      return choose(options, 0); // straight on, until set
    }

    // where a train goes from an arrival: the only way on, or the switch's setting
    function wayOn(arr) {
      var options = exits(track, arr);
      if (!options.length) return null;
      return options.length > 1 ? setting(arr, options) : options[0];
    }

    function extendFront() {
      var way = wayOn(arrival(track, route[route.length - 1]));
      if (!way) return false;
      route.push(way.step);
      return true;
    }

    // the back end grows when the train rolls backwards, through switches met in that direction
    function extendBack() {
      var way = wayOn(arrival(track, reverse(route[0])));
      if (!way) return false;
      route.unshift(reverse(way.step));
      head += stepLength(way.step);
      return true;
    }

    // keep the route just long enough for the train, growing it where it moves and trimming behind
    function ensureRoute() {
      var ahead = CAR_LENGTH / 2 + MARGIN;
      var behind = CAR_GAP * (carCount() - 1) + CAR_LENGTH / 2 + MARGIN;
      for (var guard = 0; guard < 20 && routeLength() - head < ahead; guard++) {
        if (!extendFront()) break;
      }
      for (guard = 0; guard < 20 && head < behind; guard++) {
        if (!extendBack()) break;
      }
      while (route.length > 1 && head - behind > stepLength(route[0])) {
        head -= stepLength(route[0]);
        route.shift();
      }
      while (route.length > 1 && routeLength() - stepLength(route[route.length - 1]) > head + ahead) route.pop();
      buffers();
    }

    // a dead end stops the train with its end car against the buffer stop, whichever way it drives
    function buffers() {
      var front = routeLength() - CAR_LENGTH / 2 - BUFFER_GAP;
      if (head > front && !wayOn(arrival(track, route[route.length - 1]))) {
        head = front;
        v = Math.min(v, 0);
      }
      var back = CAR_GAP * (carCount() - 1) + CAR_LENGTH / 2 + BUFFER_GAP;
      if (head < back && !wayOn(arrival(track, reverse(route[0])))) {
        head = back;
        v = Math.max(v, 0);
      }
    }

    // the spurs: from each dead end back to the first switch, the segments in between (a list per
    // spur). Broken stations go there first.
    function spurs() {
      var list = [];
      track.nodes.forEach(function (ends) {
        if (ends.length !== 1) return;
        var segs = [];
        var end = ends[0];
        while (segs.indexOf(end.seg) < 0) {
          segs.push(end.seg);
          var other = track.segments[end.seg].ends[end.end === 'start' ? 'end' : 'start'];
          var joint = track.nodes[other];
          if (joint.length !== 2) break; // a switch (or the other end of a lone line)
          end = joint[0].seg === end.seg && joint[0].end !== end.end ? joint[1] : joint[0];
        }
        list.push(segs);
      });
      return list;
    }

    // each level starts with the train standing at the station, centered on its platform
    function placeTrain() {
      route = [{ seg: track.start.seg, dir: 1 }];
      head = track.start.t + CAR_GAP * (carCount() - 1) / 2;
      ensureRoute();
    }

    // every switch of the track
    function switches() {
      if (!track.switches) {
        track.switches = [];
        track.segments.forEach(function (segment, seg) {
          [1, -1].forEach(function (dir) {
            var arr = arrival(track, { seg: seg, dir: dir });
            var options = exits(track, arr);
            if (options.length > 1) track.switches.push({ arr: arr, options: options });
          });
        });
        placeSignals(track.switches);
      }
      return track.switches;
    }

    // every point of the track, a little apart: for keeping signals and stations clear of the rails
    function trackSamples() {
      if (!track.samples) {
        track.samples = [];
        track.segments.forEach(function (segment) {
          for (var t = 0; t <= segment.length; t += 0.01) {
            track.samples.push(segment.at(t));
          }
        });
      }
      return track.samples;
    }

    // a signal for each branch of each switch, a little past the switch, beside its branch: on the
    // side of the fork it belongs to (the leftmost branch's on its left, the others' on their right),
    // unless the other side, or a little further along, leaves more room from the rails and from the
    // signals already placed. Sets each option's foot (where the post stands) and lamp.
    function placeSignals(list) {
      var samples = trackSamples();
      var lamps = [];
      list.forEach(function (sw) {
        var leftmost = Math.max.apply(null, sw.options.map(function (option) { return option.side; }));
        sw.options.forEach(function (option) {
          var best = null;
          [1, -1].forEach(function (side) {
            [0.07, 0.1, 0.13].forEach(function (along) {
              var at = stepPoint(track, option.step, Math.min(along, stepLength(option.step)));
              // left of a heading h, with y pointing down, is (sin h, -cos h)
              var sx = Math.sin(at.heading) * side;
              var sy = -Math.cos(at.heading) * side;
              var lamp = { x: at.x + sx * SIGNAL_OUT, y: at.y + sy * SIGNAL_OUT };
              var room = Math.min(
                samples.reduce(function (min, q) { return Math.min(min, Math.hypot(q.x - lamp.x, q.y - lamp.y)); }, 1) / SIGNAL_OUT,
                lamps.reduce(function (min, other) { return Math.min(min, Math.hypot(other.x - lamp.x, other.y - lamp.y)); }, 1) / SIGNAL_SPACING,
                1
              );
              // the expected side and the nearest spot win ties
              var score = room + ((side > 0) === (option.side === leftmost) ? 0.02 : 0) - along * 0.05;
              if (!best || score > best.score) {
                best = { score: score, lamp: lamp, foot: { x: at.x + sx * 0.02, y: at.y + sy * 0.02 } };
              }
            });
          });
          option.lamp = best.lamp;
          option.foot = best.foot;
          lamps.push(best.lamp);
        });
      });
    }

    // the next switch in the driving direction: the one ← → set
    function upcoming() {
      var step = facing > 0 ? route[route.length - 1] : reverse(route[0]);
      var travelled = facing > 0 ? routeLength() - head : head - CAR_GAP * (carCount() - 1);
      for (var n = 0; n < 8 && travelled < LOOKAHEAD; n++) {
        var arr = arrival(track, step);
        var options = exits(track, arr);
        if (!options.length) return null;
        if (options.length > 1) return { arr: arr, options: options };
        step = options[0].step;
        travelled += stepLength(step);
      }
      return null;
    }

    // the way ahead in the driving direction, so a switch's setting shows where it leads: points from
    // the leading car through the next switch (by its setting) to WAY_PAST beyond it, and where the
    // switch is among them (the part around it, from WAY_BEFORE, is lit). Null with no switch ahead.
    function wayAhead() {
      var next = upcoming();
      if (!next) return null;
      var points = [];
      var d;
      if (facing > 0) {
        for (d = head; d < routeLength(); d += WAY_STEP) points.push(pointAt(d));
      } else {
        for (d = head - CAR_GAP * (carCount() - 1); d > 0; d -= WAY_STEP) points.push(pointAt(d));
      }
      var step = facing > 0 ? route[route.length - 1] : reverse(route[0]);
      var at = -1; // where the switch is among the points, once reached
      for (var n = 0; n < 12; n++) {
        var arr = arrival(track, step);
        var way = wayOn(arr);
        if (!way) break;
        if (at < 0 && switchKey(arr) === switchKey(next.arr)) at = points.length;
        step = way.step;
        var length = at < 0 ? stepLength(step) : Math.min(stepLength(step), WAY_PAST - (points.length - at) * WAY_STEP);
        for (d = 0; d <= length; d += WAY_STEP) points.push(stepPoint(track, step, d));
        if (at >= 0 && (points.length - at) * WAY_STEP >= WAY_PAST) break;
      }
      return at < 0 ? null : { points: points, at: at, next: next };
    }

    // ← → (or a swipe) move the next switch ahead one branch to the left / right, until changed again;
    // the sides are the locomotive's, so in reverse they are swapped from the driving direction's
    function turnSwitch(action) {
      var next = upcoming();
      if (!next) return;
      var order = next.options.slice().sort(function (a, b) { return b.side - a.side; }); // left first
      var now = order.indexOf(setting(next.arr, next.options));
      var shift = (action === 'left' ? -1 : 1) * facing;
      var to = Math.max(0, Math.min(order.length - 1, now + shift));
      track.settings[switchKey(next.arr)] = order[to].step;
    }

    function goal() {
      return GOAL + GOAL_STEP * (level - 1);
    }

    // the broken stations of this level, and how many are repaired
    function repairs() {
      var broken = track.stations.filter(function (s) { return s.kind === 'repair'; });
      return { done: broken.filter(function (s) { return s.used; }).length, total: broken.length };
    }

    // the level is cleared with its minerals collected and its stations repaired, whichever comes last
    function checkLevel() {
      var r = repairs();
      if (destroyed >= goal() && r.done === r.total) levelDone = true;
    }

    // the level's goals: asteroids (minerals), then broken stations if the track has any
    function goals() {
      var r = repairs();
      var list = [{ icon: GOAL_ICONS.minerals, count: Math.min(destroyed, goal()), total: goal() }];
      if (r.total) list.push({ icon: GOAL_ICONS.repairs, count: r.done, total: r.total });
      return list;
    }

    // a goal's icon, and its text just after it on a baseline (in the current font and color)
    function drawGoal(c, icon, text, x, baseline, size) {
      c.save();
      c.translate(x + size / 2, baseline - size * 0.3);
      c.scale(size, size);
      icon(c);
      c.restore();
      c.fillText(text, x + size * 1.35, baseline);
    }

    function rockSpeed() {
      return SPEED_START * (1 + SPEED_STEP * (level - 1));
    }

    function spawnInterval() {
      return Math.max(SPAWN_MIN, SPAWN_START * Math.pow(SPAWN_FACTOR, level - 1));
    }

    // a station at a random spot of the track (or of some of its segments) where it fits (see
    // spotFits), away from the other stations. On a crowded track the stations may stand closer
    // together (down to MIN_SPACING). False if it found no room.
    function addStation(kind, within) {
      var segs = within || track.segments.map(function (segment, seg) { return seg; });
      var total = segs.reduce(function (sum, seg) { return sum + track.segments[seg].length; }, 0);
      var others = track.stations.map(function (s) { return stepPoint(track, { seg: s.seg, dir: 1 }, s.t); });
      for (var attempt = 0; attempt < 200; attempt++) {
        var spacing = STATION_SPACING - (STATION_SPACING - MIN_SPACING) * Math.min(1, attempt / 150);
        var d = Math.random() * total;
        var n = 0;
        while (d > track.segments[segs[n]].length) d -= track.segments[segs[n++]].length;
        var seg = segs[n];
        var side = stationSide(seg, d);
        if (!side) continue;
        var p = track.segments[seg].at(d);
        var crowded = others.some(function (o) { return Math.hypot(p.x - o.x, p.y - o.y) < spacing; });
        if (crowded) continue;
        track.stations.push({ seg: seg, t: d, side: side, kind: kind, dwell: 0, used: false });
        return true;
      }
      return false;
    }

    // the side of the track facing away from the arena's center at a point: -1 left, +1 right
    function outwards(at) {
      return at.x * Math.sin(at.heading) - at.y * Math.cos(at.heading) > 0 ? -1 : 1;
    }

    // how far a point is from a station's footprint (at a point of the track, on a side)
    function footprintDistance(at, side, q) {
      var dx = q.x - at.x;
      var dy = q.y - at.y;
      var along = dx * Math.cos(at.heading) + dy * Math.sin(at.heading);
      // right of a heading h, with y pointing down, is (-sin h, cos h)
      var across = (-dx * Math.sin(at.heading) + dy * Math.cos(at.heading)) * side;
      return Math.min.apply(null, STATION_RECTS.map(function (r) {
        return Math.hypot(Math.max(r.a0 - along, 0, along - r.a1), Math.max(r.c0 - across, 0, across - r.c1));
      }));
    }

    // whether a station fits at distance d along a segment on a side, whatever the other stations:
    // its platform and sign clear of every track (its own included, where it curves), of the signals
    // and of the tunnel mouths
    function spotFits(seg, d, side) {
      var at = track.segments[seg].at(d);
      var nearTunnel = track.tunnels.some(function (mouths) {
        return mouths.some(function (mouth) { return Math.hypot(mouth.x - at.x, mouth.y - at.y) < TUNNEL_ROOM; });
      });
      if (nearTunnel) return false;
      var railsClear = trackSamples().every(function (q) { return footprintDistance(at, side, q) >= RAIL_ROOM; });
      return railsClear && switches().every(function (sw) {
        return sw.options.every(function (option) { return footprintDistance(at, side, option.lamp) >= LAMP_ROOM; });
      });
    }

    // the side a station stands on at a spot: facing away from the arena's center if it fits there,
    // else the other side if that fits (0: neither)
    function stationSide(seg, d) {
      var preferred = outwards(track.segments[seg].at(d));
      return spotFits(seg, d, preferred) ? preferred : spotFits(seg, d, -preferred) ? -preferred : 0;
    }

    // a text floating up from a point of the arena, fading out
    function say(x, y, text, color, life) {
      texts.push({ x: x, y: y, text: text, color: color, age: 0, life: life || 1.2 });
    }

    function gradeColor(grade) {
      return GRADE_COLORS[Math.min(grade, GRADE_COLORS.length - 1)];
    }

    // ages short-lived things (moving those with a speed) and drops the finished ones
    function tick(list, dt) {
      for (var i = list.length - 1; i >= 0; i--) {
        var e = list[i];
        e.age += dt;
        if (e.vx !== undefined) {
          e.x += e.vx * dt;
          e.y += e.vy * dt;
        }
        if (e.age >= e.life) list.splice(i, 1);
      }
    }

    // how long to stand by each kind of station for its service (0: no service, like the start)
    function dwellFor(kind) {
      return STATIONS[kind] ? STATIONS[kind].dwell : 0;
    }

    // standing by an unused station long enough gives its reward
    function serveStations(dt) {
      var train = cars();
      track.stations.forEach(function (station) {
        if (!dwellFor(station.kind) || station.used) return;
        var at = stepPoint(track, { seg: station.seg, dir: 1 }, station.t);
        var alongside = train.some(function (car) { return Math.hypot(car.x - at.x, car.y - at.y) < ALONGSIDE; });
        // standing still fills the progress, moving along the platform pauses it, leaving resets it
        if (!alongside) station.dwell = 0;
        else if (Math.abs(v) < STOPPED) station.dwell += dt;
        if (station.dwell < dwellFor(station.kind)) return;
        station.used = true;
        if (station.kind === 'turret') {
          say(at.x, at.y, arm(), '#F6EB0F');
        } else if (station.kind === 'explosive') {
          say(at.x, at.y, detonate(at.x, at.y), '#FF9F43', 1.4);
        } else if (station.kind === 'repair') {
          api.addScore(REPAIR_POINTS);
          say(at.x, at.y, 'Repaired! +' + REPAIR_POINTS, '#59CD90', 1.4);
          checkLevel();
        } else if (api.lives() < api.maxLives()) {
          api.gainLife();
          say(at.x, at.y, '+1 ♥', '#FF7EB6');
        } else {
          api.addScore(HEART_STATION_POINTS);
          say(at.x, at.y, '+' + HEART_STATION_POINTS, '#F6EB0F');
        }
      });
    }

    // the track for level n: the first FIXED_TRACKS in order, then at random, every track once before
    // any comes up again, and never the same track twice in a row
    function nextTrack(n) {
      if (n <= FIXED_TRACKS) return n - 1;
      if (!deck.length) {
        deck = TRACKS.map(function (make, i) { return i; });
        for (var i = deck.length - 1; i > 0; i--) { // shuffled (Fisher-Yates)
          var j = Math.floor(Math.random() * (i + 1));
          var swap = deck[i]; deck[i] = deck[j]; deck[j] = swap;
        }
        var last = deck.length - 1; // the deck is drawn from its end
        if (deck[last] === trackIndex) deck[last] = deck[0], deck[0] = trackIndex;
      }
      return deck.pop();
    }

    function startLevel(n, subtitle) {
      level = n;
      destroyed = 0;
      trackIndex = nextTrack(n);
      track = TRACKS[trackIndex]();
      placeTrain(); // a new track: the train starts at its starting point, keeping its speed
      track.stations.forEach(function (station) {
        station.side = stationSide(station.seg, station.t) || outwards(track.segments[station.seg].at(station.t));
      });
      if (n >= STATIONS_FROM) {
        var broken = REPAIRS[Math.min(n - STATIONS_FROM, REPAIRS.length - 1)];
        // dead ends first, one each in random order, so driving into them is worth it
        var sidings = spurs().sort(function () { return Math.random() - 0.5; });
        for (var k = 0; k < broken; k++) {
          if (!(k < sidings.length && addStation('repair', sidings[k]))) addStation('repair');
        }
        Object.keys(STATIONS).forEach(function (kind) {
          if (STATIONS[kind].chance && Math.random() < STATIONS[kind].chance) addStation(kind);
        });
      }
      banner = BANNER;
      bannerText = subtitle || track.name;
      spawnTimer = BANNER;
    }

    // the stage in units, from its center
    function bounds() {
      var size = api.size();
      var unit = Math.min(size.width, size.height) || 1;
      return { unit: unit, halfW: size.width / (2 * unit), halfH: size.height / (2 * unit) };
    }

    // centers of the cars, front to back, following the route (and so every switch taken)
    function cars() {
      var list = [];
      for (var i = 0; i < carCount(); i++) list.push(pointAt(head - CAR_GAP * i));
      return list;
    }

    // the cars follow the lives: a lost life drops the last wagon with its turret; a regained one adds
    // an empty wagon at the back. The train shortens or grows by half a car at each end, around its
    // middle.
    function syncTurrets() {
      var lives = Math.max(1, api.lives());
      while (turrets.length > lives) {
        var where = cars()[turrets.length - 1];
        var lost = turrets.pop();
        head -= CAR_GAP / 2;
        explode(where.x, where.y, 0.03, '#FD3519');
        if (lost) say(where.x, where.y, 'Turret lost', '#FD3519', 1.4);
      }
      while (turrets.length < lives) {
        turrets.push(null);
        head += CAR_GAP / 2;
      }
      ensureRoute();
    }

    // a turret station: a turret on the frontmost empty car (lost lives take the last wagon first),
    // else the leftmost lowest-grade turret gets one more grade (its shots pierce one more asteroid)
    function arm() {
      syncTurrets();
      var empty = turrets.indexOf(null);
      if (empty >= 0) {
        turrets[empty] = { grade: 0 };
        return 'New turret!';
      }
      // every turret from the front of the train to its back: the first one with the lowest grade
      var all = mounted().map(function (gun) { return gun.turret; });
      var lowest = all.reduce(function (best, turret) { return turret.grade < best.grade ? turret : best; });
      lowest.grade += 1;
      return 'Turret upgraded!';
    }

    // what an asteroid is worth: its points, or next to nothing once the level's quota is met
    function worth(rock) {
      return destroyed < goal() ? POINTS[rock.gen] : Math.max(1, Math.round(POINTS[rock.gen] * OVER_QUOTA));
    }

    // an explosive station: a shock wave, and every asteroid in play bursts for its points (without
    // fragments), counting towards the level's goal
    function detonate(x, y) {
      waves.push({ x: x, y: y, age: 0, life: BLAST });
      var total = 0;
      rocks.forEach(function (rock) {
        explode(rock.x, rock.y, rock.r, '#FF9F43');
        total += worth(rock);
        destroyed += 1;
      });
      rocks = [];
      if (total) api.addScore(total);
      checkLevel();
      return total ? 'Boom! +' + total : 'Boom!';
    }

    function makeRock(x, y, vx, vy, generation, parent) {
      var shape = [];
      var corners = 9 + Math.floor(Math.random() * 4);
      for (var i = 0; i < corners; i++) shape.push(0.75 + Math.random() * 0.35);
      return {
        id: ++rockIds, parent: parent || 0,
        x: x, y: y, vx: vx, vy: vy, gen: generation, r: SIZES[generation], shape: shape,
        angle: Math.random() * Math.PI * 2, spin: (Math.random() * 2 - 1) * 1.2, age: 0
      };
    }

    // a big asteroid from a random edge, aimed at the middle of the arena where the track runs
    function spawnRock() {
      var b = bounds();
      var r = SIZES[0];
      var side = Math.floor(Math.random() * 4);
      var x, y;
      if (side < 2) {
        x = (Math.random() * 2 - 1) * b.halfW;
        y = (side ? 1 : -1) * (b.halfH + r);
      } else {
        x = (side === 3 ? 1 : -1) * (b.halfW + r);
        y = (Math.random() * 2 - 1) * b.halfH;
      }
      var tx = (Math.random() * 2 - 1) * 0.25;
      var ty = (Math.random() * 2 - 1) * 0.25;
      var distance = Math.hypot(tx - x, ty - y) || 1;
      var speed = rockSpeed() * (0.8 + Math.random() * 0.4);
      rocks.push(makeRock(x, y, (tx - x) / distance * speed, (ty - y) / distance * speed, 0));
    }

    function explode(x, y, r, color, count) {
      for (var i = 0; i < (count || 10); i++) {
        var angle = Math.random() * Math.PI * 2;
        var speed = (0.15 + Math.random() * 0.25) * (r / SIZES[0] + 0.5);
        debris.push({ x: x, y: y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, color: color, age: 0, life: 0.6 });
      }
    }

    // shot down: its minerals, points, fragments, and maybe the next level; rammed: none of these
    function destroyRock(index, shot) {
      var rock = rocks[index];
      rocks.splice(index, 1);
      explode(rock.x, rock.y, rock.r, shot ? '#B9C2CB' : '#FD3519');
      if (!shot) return;
      explode(rock.x, rock.y, rock.r, 'rgba(185,194,203,0.5)', 3); // its minerals: a few faint grey sparks
      var points = worth(rock);
      api.addScore(points);
      say(rock.x, rock.y, '+' + points, '#F6EB0F', 0.8);
      if (rock.gen + 1 < SIZES.length) {
        var heading = Math.atan2(rock.vy, rock.vx);
        var speed = Math.hypot(rock.vx, rock.vy) * 1.3;
        for (var k = 0; k < SPLIT; k++) {
          var angle = heading + (k % 2 ? 1 : -1) * (0.4 + Math.random() * 0.5);
          rocks.push(makeRock(rock.x, rock.y, Math.cos(angle) * speed, Math.sin(angle) * speed, rock.gen + 1, rock.id));
        }
      }
      destroyed += 1;
      checkLevel();
    }

    // the goal reached: a clean arena for the next track (the asteroids still around burst without
    // points, shots vanish). Called after the hits are counted, never while bullets or rocks are walked
    function nextLevel() {
      levelDone = false;
      var bonus = LEVEL_BONUS * level;
      api.addScore(bonus);
      rocks.forEach(function (left) { explode(left.x, left.y, left.r, '#B9C2CB'); });
      rocks = [];
      bullets = [];
      startLevel(level + 1, 'Level bonus +' + bonus);
    }

    // the turrets in play, from the front of the train to its back, each with its car
    function mounted() {
      var train = cars();
      var list = [];
      turrets.forEach(function (turret, car) { if (turret) list.push({ turret: turret, car: train[car] }); });
      return list;
    }

    // a turret's barrels, as offsets across its aim: the locomotive's has two
    function barrels(turret) {
      return turret === turrets[0] ? [-DOUBLE_BARREL, DOUBLE_BARREL] : [0];
    }

    // every turret fires straight ahead of its car, in the driving direction, one shot per barrel; its
    // grade is how many asteroids the shot goes through before stopping
    function fire() {
      mounted().forEach(function (gun) {
        var direction = gun.car.heading + (facing < 0 ? Math.PI : 0);
        barrels(gun.turret).forEach(function (offset) {
          // across the aim: right of a heading h, with y pointing down, is (-sin h, cos h)
          var x = gun.car.x + Math.cos(direction) * CAR_LENGTH / 2 - Math.sin(direction) * offset;
          var y = gun.car.y + Math.sin(direction) * CAR_LENGTH / 2 + Math.cos(direction) * offset;
          bullets.push({
            x: x,
            y: y,
            vx: Math.cos(direction) * BULLET_SPEED + Math.cos(gun.car.heading) * v,
            vy: Math.sin(direction) * BULLET_SPEED + Math.sin(gun.car.heading) * v,
            pierce: gun.turret.grade, grade: gun.turret.grade, hits: [], age: 0, life: BULLET_LIFE
          });
        });
      });
    }

    function outside(x, y, margin, b) {
      return Math.abs(x) > b.halfW + margin || Math.abs(y) > b.halfH + margin;
    }

    return {
      reset: function () {
        v = 0;
        facing = 1;
        keys = {};
        cooldown = 0;
        invulnerable = 0;
        levelDone = false;
        // one car per life, with a single turret on the locomotive
        turrets = [];
        for (var car = 0; car < api.lives(); car++) turrets.push(car === 0 ? { grade: 0 } : null);
        rockIds = 0;
        bullets = [];
        rocks = [];
        debris = [];
        texts = [];
        waves = [];
        clock = 0;
        touches = {};
        touchDriving = false;
        deck = [];
        startLevel(1);
      },

      update: function (dt, time, active) {
        clock = time;
        var b = bounds();
        var i, j;
        if (active) {
          banner = Math.max(0, banner - dt);

          // driving: ↑ ↓ accelerate along the track, harder when braking; coasting slows down. On
          // touch, a finger held down drives in the set direction, and with none the train brakes
          var held = Object.keys(touches).filter(function (id) { return !touches[id].swiped; });
          var push = (keys.up ? 1 : 0) - (keys.down ? 1 : 0) || (held.length ? facing : 0);
          if (push) {
            v += push * (push * v < 0 ? BRAKE : ACCEL) * dt;
          } else if (v) {
            var slow = (touchDriving ? BRAKE : FRICTION) * dt;
            v = Math.abs(v) <= slow ? 0 : v - Math.sign(v) * slow;
          }
          v = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, v));
          // the driving direction follows the command, not the motion: ↓ while rolling forward
          // already turns the shots backwards, and brakes the train
          if (push) facing = push;
          head += v * dt;
          ensureRoute();

          cooldown -= dt;
          var fingers = held.filter(function (id) { return clock - touches[id].at >= FIRE_HOLD; });
          if ((keys.fire || fingers.length >= 2) && cooldown <= 0) {
            fire();
            cooldown = FIRE_COOLDOWN;
          }

          spawnTimer -= dt;
          if (spawnTimer <= 0) {
            spawnRock();
            spawnTimer = spawnInterval();
          }
          invulnerable = Math.max(0, invulnerable - dt);

          tick(bullets, dt);
          bullets = bullets.filter(function (bullet) { return !outside(bullet.x, bullet.y, 0.05, b); });
          for (i = rocks.length - 1; i >= 0; i--) {
            var rock = rocks[i];
            rock.age += dt;
            rock.x += rock.vx * dt;
            rock.y += rock.vy * dt;
            rock.angle += rock.spin * dt;
            // gone once it has crossed the arena and left it
            if (rock.age > 3 && outside(rock.x, rock.y, rock.r + 0.1, b)) rocks.splice(i, 1);
          }

          // bullets against asteroids: a piercing bullet goes on, but never hits an asteroid it already
          // hit, nor the fragments that asteroid split into
          for (i = bullets.length - 1; i >= 0; i--) {
            var shot = bullets[i];
            if (!shot) continue;
            for (j = rocks.length - 1; j >= 0; j--) {
              var target = rocks[j];
              if (!target) continue;
              if (shot.hits.indexOf(target.id) >= 0 || shot.hits.indexOf(target.parent) >= 0) continue;
              if (Math.hypot(shot.x - target.x, shot.y - target.y) < target.r) {
                shot.hits.push(target.id);
                destroyRock(j, true);
                if (shot.pierce > 0) {
                  shot.pierce -= 1;
                } else {
                  bullets.splice(i, 1);
                  break;
                }
              }
            }
          }

          syncTurrets();
          serveStations(dt);

          if (levelDone) nextLevel();

          // asteroids against the train
          if (invulnerable <= 0) {
            var hit = -1;
            cars().some(function (car) {
              hit = rocks.findIndex(function (rock) { return Math.hypot(car.x - rock.x, car.y - rock.y) < rock.r * 0.9 + HIT_RADIUS; });
              return hit >= 0;
            });
            if (hit >= 0) {
              destroyRock(hit, false);
              invulnerable = INVULNERABLE;
              api.loseLife();
            }
          }
        }

        tick(debris, dt);
        tick(texts, dt);
        tick(waves, dt);
      },

      keyDown: function (key) {
        var action = KEYS[key];
        if (!action) return false;
        keys[action] = true;
        if (action === 'up' || action === 'down') touchDriving = false;
        if (action === 'left' || action === 'right') turnSwitch(action);
        return true;
      },

      // a finger on a touch screen (see the touch fields); a click on a signal sets its switch to that
      // branch
      pointerDown: function (x, y, button, pointerType, id) {
        if (pointerType !== 'mouse') {
          touches[id] = { x: x, y: y, at: clock, swiped: false };
          touchDriving = true;
          return;
        }
        var b = bounds();
        var size = api.size();
        var px = (x - size.width / 2) / b.unit;
        var py = (y - size.height / 2) / b.unit;
        var best = null;
        switches().forEach(function (sw) {
          sw.options.forEach(function (option) {
            var d = Math.hypot(option.lamp.x - px, option.lamp.y - py);
            if (d < SIGNAL_REACH && (!best || d < best.d)) {
              best = { d: d, sw: sw, option: option };
            }
          });
        });
        if (best) track.settings[switchKey(best.sw.arr)] = best.option.step;
      },

      // a finger moving quickly enough is a swipe: up / down set the driving direction, left / right
      // the next switch, like ← →. A swiping finger neither drives nor fires.
      pointerMove: function (id, x, y) {
        var touch = touches[id];
        if (!touch || touch.swiped || clock - touch.at > SWIPE_TIME) return;
        var dx = x - touch.x;
        var dy = y - touch.y;
        if (Math.hypot(dx, dy) < SWIPE * bounds().unit) return;
        touch.swiped = true;
        if (Math.abs(dy) > Math.abs(dx)) facing = dy < 0 ? 1 : -1;
        else turnSwitch(dx < 0 ? 'left' : 'right');
      },

      pointerUp: function (id) {
        delete touches[id];
      },

      keyUp: function (key) {
        var action = KEYS[key];
        if (action) keys[action] = false;
      },

      blur: function () {
        keys = {};
        touches = {};
      },

      render: function (c, width, height) {
        var unit = Math.min(width, height);
        var cx = width / 2;
        var cy = height / 2;
        function X(x) { return cx + x * unit; }
        function Y(y) { return cy + y * unit; }
        // a filled circle, in pixels
        function disc(x, y, r, color) {
          c.fillStyle = color;
          c.beginPath();
          c.arc(x, y, r, 0, Math.PI * 2);
          c.fill();
        }
        // the locomotive's outline, in its own frame (its front to the right, size w × h): rounded at
        // the back, its nose narrowing to a blunt point from the cab on; with cab, the cab alone
        function locomotivePath(w, h, cab) {
          var r = h * 0.3;
          var start = w * 0.15;                    // where the cab and the nose begin
          var bend = start + (w / 2 - start) * 0.7; // where the nose's sides curve in
          var tip = h * 0.12;                      // half the width of the blunt point
          c.beginPath();
          c.moveTo(start, -h / 2);
          c.quadraticCurveTo(bend, -h / 2, w / 2, -tip);
          c.lineTo(w / 2, tip);
          c.quadraticCurveTo(bend, h / 2, start, h / 2);
          if (!cab) {
            c.lineTo(-w / 2 + r, h / 2);
            c.arc(-w / 2 + r, h / 2 - r, r, Math.PI / 2, Math.PI);
            c.arc(-w / 2 + r, -h / 2 + r, r, Math.PI, Math.PI * 1.5);
          }
          c.closePath();
        }
        function font(weight, size) {
          return weight + ' ' + Math.round(unit * size) + 'px Montserrat, "Helvetica Neue", sans-serif';
        }
        c.clearRect(0, 0, width, height);

        // track: sleepers, then the two rails, segment by segment
        c.lineCap = 'round';
        c.strokeStyle = '#3D4752';
        c.lineWidth = unit * 0.008;
        track.segments.forEach(function (segment) {
          for (var t = 0.0175; t < segment.length; t += 0.035) {
            var p = segment.at(t);
            var nx = -Math.sin(p.heading) * 0.024;
            var ny = Math.cos(p.heading) * 0.024;
            c.beginPath();
            c.moveTo(X(p.x - nx), Y(p.y - ny));
            c.lineTo(X(p.x + nx), Y(p.y + ny));
            c.stroke();
          }
        });
        // the way ahead around the next switch, lit under the rails: brightest at the switch, fading
        // out before and past it (wayAhead), in short pieces of 2 points
        var way = wayAhead();
        if (way) {
          c.lineCap = 'butt'; // the pieces meet without overlapping (overlaps would be brighter)
          c.lineJoin = 'round';
          c.lineWidth = unit * 0.04;
          var from = Math.max(0, way.at - Math.round(WAY_BEFORE / WAY_STEP));
          for (var first = from; first < way.points.length - 1; first += 2) {
            var last = Math.min(first + 2, way.points.length - 1);
            var p0 = way.points[first];
            var p1 = way.points[last];
            if (Math.hypot(p1.x - p0.x, p1.y - p0.y) > 0.03) continue; // across a tunnel: the way jumps
            var along = ((first + last) / 2 - way.at) * WAY_STEP; // from the switch, negative before it
            var light = 1 - Math.max(0, along < 0 ? -along / WAY_BEFORE : along / WAY_PAST);
            c.strokeStyle = 'rgba(89,205,144,' + (WAY_ALPHA * Math.min(1, light * 1.6)).toFixed(3) + ')';
            c.beginPath();
            c.moveTo(X(p0.x), Y(p0.y));
            for (var k = first + 1; k <= last; k++) c.lineTo(X(way.points[k].x), Y(way.points[k].y));
            c.stroke();
          }
          c.lineCap = 'round';
        }

        c.strokeStyle = '#8494A4';
        c.lineWidth = unit * 0.004;
        track.segments.forEach(function (segment) {
          var samples = Math.max(12, Math.ceil(segment.length / 0.01));
          [-0.014, 0.014].forEach(function (offset) {
            c.beginPath();
            for (var k = 0; k <= samples; k++) {
              var q = segment.at(segment.length * k / samples);
              var px = X(q.x - Math.sin(q.heading) * offset);
              var py = Y(q.y + Math.cos(q.heading) * offset);
              if (k) c.lineTo(px, py);
              else c.moveTo(px, py);
            }
            c.stroke();
          });
        });

        // buffer stops at the dead ends: a red beam across the rails, just past their end
        track.buffers.forEach(function (end) {
          c.save();
          c.translate(X(end.x), Y(end.y));
          c.rotate(end.heading);
          c.scale(unit, unit);
          c.fillStyle = '#3D4752';                   // its frame
          c.fillRect(0, -0.026, 0.012, 0.052);
          c.fillStyle = '#FD3519';                   // the beam, with a white stripe
          c.fillRect(0.002, -0.022, 0.008, 0.044);
          c.fillStyle = '#FCFCFD';
          c.fillRect(0.002, -0.004, 0.008, 0.008);
          c.restore();
        });

        // stations beside the track: a platform with a building, and a square sign at its end whose
        // icon tells the kind of station (kept upright, so it reads the same on every track)
        track.stations.forEach(function (station) {
          var at = stepPoint(track, { seg: station.seg, dir: 1 }, station.t);
          var side = station.side; // -1 left, +1 right
          var near = STATION.gap;                    // platform edge next to the track
          var far = STATION.gap + STATION.depth;     // its outer edge
          c.save();
          c.translate(X(at.x), Y(at.y));
          c.rotate(at.heading);
          c.scale(unit, unit);
          c.fillStyle = '#3D4752';                   // platform
          c.fillRect(-STATION.length / 2, side > 0 ? near : -far, STATION.length, STATION.depth);
          c.fillStyle = 'rgba(246,235,15,0.75)';     // safety line along the edge by the track
          c.fillRect(-STATION.length / 2, side > 0 ? near : -near - 0.003, STATION.length, 0.003);
          var broken = station.kind === 'repair' && !station.used;
          c.fillStyle = broken ? '#4A5562' : '#8494A4'; // station building, on the outer half
          var buildingTop = side > 0 ? far - STATION.buildingDepth - 0.002 : -far + 0.002;
          c.fillRect(-STATION.building / 2, buildingTop, STATION.building, STATION.buildingDepth);
          c.fillStyle = '#5D6E7E';                   // its roof ridge
          c.fillRect(-STATION.building / 2, buildingTop + STATION.buildingDepth / 2 - 0.001, STATION.building, 0.002);
          if (broken) {                              // a broken one: a hole in the roof
            c.fillStyle = '#FF9F43';
            c.beginPath();
            c.moveTo(-0.006, buildingTop);
            c.lineTo(0.004, buildingTop + STATION.buildingDepth * 0.45);
            c.lineTo(-0.002, buildingTop + STATION.buildingDepth * 0.6);
            c.lineTo(0.008, buildingTop + STATION.buildingDepth);
            c.lineTo(0.014, buildingTop + STATION.buildingDepth);
            c.lineTo(0.006, buildingTop + STATION.buildingDepth * 0.55);
            c.lineTo(0.012, buildingTop + STATION.buildingDepth * 0.4);
            c.lineTo(0.004, buildingTop);
            c.closePath();
            c.fill();
          }
          c.restore();

          // the sign: just past the platform's end, lined up with its edge by the track
          var along = STATION.length / 2 + STATION.signGap + STATION.sign / 2;
          var across = side * (near + STATION.sign / 2);
          var sx = at.x + Math.cos(at.heading) * along - Math.sin(at.heading) * across;
          var sy = at.y + Math.sin(at.heading) * along + Math.cos(at.heading) * across;
          var size = STATION.sign * unit;
          c.fillStyle = '#0B2230';
          c.strokeStyle = '#8494A4';
          c.lineWidth = unit * 0.003;
          c.beginPath();
          if (c.roundRect) c.roundRect(X(sx) - size / 2, Y(sy) - size / 2, size, size, size * 0.18);
          else c.rect(X(sx) - size / 2, Y(sy) - size / 2, size, size);
          c.fill();
          c.stroke();
          var icon = STATION_ICONS[station.kind === 'repair' && station.used ? 'repaired' : station.kind];
          if (icon) {
            c.save();
            // a used station has nothing left to give (a repaired one shows its check mark in full)
            c.globalAlpha = station.used && station.kind !== 'repair' ? 0.3 : 1;
            c.translate(X(sx), Y(sy));
            c.scale(size * 0.8, size * 0.8);
            icon(c);
            c.restore();
          }
          if (station.dwell > 0 && !station.used) {
            var progress = Math.min(1, station.dwell / dwellFor(station.kind));
            c.fillStyle = 'rgba(255,255,255,0.15)';
            c.fillRect(X(sx) - size / 2, Y(sy) + size / 2 + unit * 0.004, size, unit * 0.005);
            c.fillStyle = '#59CD90';
            c.fillRect(X(sx) - size / 2, Y(sy) + size / 2 + unit * 0.004, size * progress, unit * 0.005);
          }
        });

        // signals at every switch, beside each branch: green on the branch the switch is set to, red on
        // the others. They only change when the player sets a switch. Each signal stands on the outside
        // of its branch where there is room (see placeSignals), so none overlap. Only the next switch's
        // signals, the ones ← → set, are bright: the other switches' are dimmed.
        var nextKey = way && switchKey(way.next.arr);
        switches().forEach(function (sw) {
          c.globalAlpha = switchKey(sw.arr) === nextKey ? 1 : 0.3;
          var pick = setting(sw.arr, sw.options);
          sw.options.forEach(function (option) {
            var foot = option.foot;
            var lamp = option.lamp;
            var go = option.step.seg === pick.step.seg && option.step.dir === pick.step.dir;
            c.strokeStyle = '#5D6E7E';                                          // post
            c.lineWidth = unit * 0.004;
            c.beginPath();
            c.moveTo(X(foot.x), Y(foot.y));
            c.lineTo(X(lamp.x), Y(lamp.y));
            c.stroke();
            disc(X(lamp.x), Y(lamp.y), unit * 0.0105, '#0B2230');                                     // housing
            disc(X(lamp.x), Y(lamp.y), unit * 0.008, go ? '#59CD90' : '#FD3519');                     // lamp
          });
        });
        c.globalAlpha = 1;

        // asteroids
        rocks.forEach(function (rock) {
          c.beginPath();
          rock.shape.forEach(function (k, n) {
            var angle = rock.angle + (n / rock.shape.length) * Math.PI * 2;
            var px = X(rock.x + Math.cos(angle) * rock.r * k);
            var py = Y(rock.y + Math.sin(angle) * rock.r * k);
            if (n) c.lineTo(px, py);
            else c.moveTo(px, py);
          });
          c.closePath();
          c.fillStyle = 'rgba(132,148,164,0.25)';
          c.fill();
          c.lineWidth = unit * 0.005;
          c.strokeStyle = '#B9C2CB';
          c.stroke();
        });

        // bullets, colored by the grade of the turret that fired them
        bullets.forEach(function (bullet) { disc(X(bullet.x), Y(bullet.y), unit * 0.0055, gradeColor(bullet.grade)); });

        // train: blinks while invulnerable after a hit
        c.globalAlpha = invulnerable > 0 && Math.floor(invulnerable * 10) % 2 ? 0.35 : 1;
        cars().forEach(function (car, n) {
          c.save();
          c.translate(X(car.x), Y(car.y));
          c.rotate(car.heading);
          var w = CAR_LENGTH * unit;
          var h = CAR_WIDTH * unit;
          if (n === 0) {
            // the locomotive, pointed at the front of the train, and its darker cab
            c.fillStyle = LOCOMOTIVE_COLOR;
            locomotivePath(w, h);
            c.fill();
            c.fillStyle = 'rgba(17,47,65,0.45)';
            locomotivePath(w, h, true);
            c.fill();
          } else {
            c.fillStyle = WAGON_COLOR;
            c.beginPath();
            if (c.roundRect) c.roundRect(-w / 2, -h / 2, w, h, h * 0.3);
            else c.rect(-w / 2, -h / 2, w, h);
            c.fill();
          }
          c.restore();
        });
        // turrets on their cars, barrels along the direction they fire, colored by grade; the
        // locomotive's has a double barrel (it fires two shots)
        mounted().forEach(function (gun) {
          var direction = gun.car.heading + (facing < 0 ? Math.PI : 0); // straight ahead of the car
          c.save();
          c.translate(X(gun.car.x), Y(gun.car.y));
          c.rotate(direction);
          c.fillStyle = '#000000';                   // black barrels
          barrels(gun.turret).forEach(function (offset) {
            c.fillRect(0, unit * (offset - 0.003), unit * 0.02, unit * 0.006);
          });
          disc(0, 0, unit * 0.012, '#0B2230');              // housing
          disc(0, 0, unit * 0.008, gradeColor(gun.turret.grade)); // the grade
          c.restore();
        });
        c.globalAlpha = 1;

        // tunnel mouths, over the train: a car going through is hidden instead of jumping across
        track.tunnels.forEach(function (mouths) {
          mouths.forEach(function (mouth) {
            c.save();
            c.translate(X(mouth.x), Y(mouth.y));
            c.rotate(mouth.heading);
            c.scale(unit, unit);
            c.fillStyle = '#5D6E7E';                 // walls and roof
            c.fillRect(-0.004, -TUNNEL.width / 2 - TUNNEL.wall, TUNNEL.depth, TUNNEL.width + 2 * TUNNEL.wall);
            c.fillStyle = '#06141C';                 // the dark inside
            c.fillRect(-0.004, -TUNNEL.width / 2, TUNNEL.depth - TUNNEL.wall, TUNNEL.width);
            c.fillStyle = '#8494A4';                 // the arch's face, at the entrance
            c.fillRect(-0.006, -TUNNEL.width / 2 - TUNNEL.wall, 0.005, TUNNEL.width + 2 * TUNNEL.wall);
            c.restore();
          });
        });

        // an explosive station's shock wave: a ring sweeping across the whole arena
        waves.forEach(function (wave) {
          var progress = wave.age / wave.life;
          c.globalAlpha = 1 - progress;
          c.strokeStyle = '#FF9F43';
          c.lineWidth = unit * 0.02 * (1 - progress) + 1;
          c.beginPath();
          c.arc(X(wave.x), Y(wave.y), unit * 1.2 * progress, 0, Math.PI * 2);
          c.stroke();
        });
        c.globalAlpha = 1;

        debris.forEach(function (d) {
          c.globalAlpha = 1 - d.age / d.life;
          disc(X(d.x), Y(d.y), unit * 0.006, d.color);
        });
        c.textAlign = 'center';
        c.font = font(600, 0.04);
        texts.forEach(function (text) {
          var progress = text.age / text.life;
          c.globalAlpha = 1 - progress;
          c.fillStyle = text.color;
          c.fillText(text.text, X(text.x), Y(text.y) - unit * (0.03 + progress * 0.05));
        });
        c.globalAlpha = 1;

        // level and goals in the corner (each goal turning green once done), and a banner when a level starts
        c.textAlign = 'left';
        c.font = font(600, 0.04);
        c.fillStyle = 'rgba(252,252,253,0.75)';
        c.fillText('Level ' + level, unit * 0.04, unit * 0.07);
        c.font = font(600, 0.034);
        goals().forEach(function (item, n) {
          c.fillStyle = item.count >= item.total ? '#59CD90' : 'rgba(252,252,253,0.75)';
          drawGoal(c, item.icon, item.count + '/' + item.total, unit * 0.04, unit * (0.125 + n * 0.05), unit * 0.04);
        });
        if (banner > 0) {
          c.globalAlpha = Math.min(1, banner / 0.4);
          c.textAlign = 'center';
          c.fillStyle = '#F6EB0F';
          c.font = font(700, 0.09);
          c.fillText('Level ' + level, cx, cy - unit * 0.01);
          c.fillStyle = 'rgba(252,252,253,0.85)';
          c.font = font(500, 0.04);
          c.fillText(bannerText, cx, cy + unit * 0.06);
          // the level's goals, side by side: how many asteroids, how many stations
          c.font = font(600, 0.036);
          c.textAlign = 'left';
          var size = unit * 0.042;
          var items = goals();
          var widths = items.map(function (item) { return size * 1.35 + c.measureText(String(item.total)).width; });
          var x = cx - (widths.reduce(function (sum, w) { return sum + w; }, 0) + size * (items.length - 1)) / 2;
          items.forEach(function (item, n) {
            drawGoal(c, item.icon, String(item.total), x, cy + unit * 0.112, size);
            x += widths[n] + size;
          });
          c.globalAlpha = 1;
        }
      }
    };
  }
};
