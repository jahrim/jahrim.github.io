/*
 * Rails tracks: networks of segments (arcs, straights, sampled curves) joined at nodes.
 *
 * Positions are in units from the stage center, and every track fits within ±0.45, so it works
 * on any stage shape. A segment has a length and at(t) → { x, y, heading } for 0 ≤ t ≤ length,
 * the heading pointing towards increasing t. A node lists the segment ends meeting there.
 * At a node a train can only continue onto segments that keep its direction (a switch lets it
 * choose between branches, but it never makes a hairpin turn). A segment end joined to nothing is a
 * dead end, closed by a buffer stop: the train has to drive back out. Two ends joined although they
 * lie apart are a tunnel: the train goes in at one mouth and comes out of the other (to keep going
 * straight, the two ends need the same heading).
 *
 * A step is a segment walked in a direction: { seg, dir }, dir +1 towards increasing t.
 */

var SMOOTH = 0.6; // radians: the largest change of heading allowed through a node

function arcSegment(cx, cy, r, a0, a1) {
  var sign = a1 < a0 ? -1 : 1;
  return {
    length: Math.abs(a1 - a0) * r,
    at: function (t) {
      var a = a0 + sign * t / r;
      return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, heading: a + sign * Math.PI / 2 };
    }
  };
}

function lineSegment(x0, y0, x1, y1) {
  var length = Math.hypot(x1 - x0, y1 - y0);
  var heading = Math.atan2(y1 - y0, x1 - x0);
  return {
    length: length,
    at: function (t) {
      return { x: x0 + (x1 - x0) * t / length, y: y0 + (y1 - y0) * t / length, heading: heading };
    }
  };
}

// a segment turned by a quarter turn around the stage center (clockwise on screen)
function quarterTurn(segment) {
  return {
    length: segment.length,
    at: function (t) {
      var p = segment.at(t);
      return { x: -p.y, y: p.x, heading: p.heading + Math.PI / 2 };
    }
  };
}

// any curve fn(u), 0 ≤ u ≤ 1, re-parametrized by arc length through a table of samples
function curveSegment(fn, samples) {
  var points = [];
  var lengths = [0];
  for (var i = 0; i <= samples; i++) points.push(fn(i / samples));
  for (i = 1; i <= samples; i++) {
    lengths.push(lengths[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y));
  }
  return {
    length: lengths[samples],
    at: function (t) {
      var lo = 0;
      var hi = samples - 1;
      while (lo < hi) {                       // the sample interval containing t
        var mid = (lo + hi + 1) >> 1;
        if (lengths[mid] <= t) lo = mid;
        else hi = mid - 1;
      }
      var a = points[lo];
      var b = points[lo + 1];
      var k = Math.min(1, Math.max(0, (t - lengths[lo]) / ((lengths[lo + 1] - lengths[lo]) || 1)));
      return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, heading: Math.atan2(b.y - a.y, b.x - a.x) };
    }
  };
}

// a segment end, with the heading out of the segment there
function endPoint(segments, end) {
  var segment = segments[end.seg];
  var p = segment.at(end.end === 'end' ? segment.length : 0);
  return { x: p.x, y: p.y, heading: p.heading + (end.end === 'end' ? 0 : Math.PI) };
}

// joints: one list per node of the segment ends meeting there, as [segment index, 'start' | 'end']
// (an end left out is a dead end, a node of its own); start: where the train starts each level,
// at the track's first station (the game adds the others)
function network(name, segments, joints, start) {
  segments.forEach(function (segment) { segment.ends = {}; });
  segments.forEach(function (segment, seg) {
    ['start', 'end'].forEach(function (end) {
      var joined = joints.some(function (ends) {
        return ends.some(function (e) { return e[0] === seg && e[1] === end; });
      });
      if (!joined) joints = joints.concat([[[seg, end]]]);
    });
  });
  var nodes = joints.map(function (ends, node) {
    return ends.map(function (end) {
      segments[end[0]].ends[end[1]] = node;
      return { seg: end[0], end: end[1] };
    });
  });
  // buffer stops: the dead ends; tunnels: two ends joined although they lie apart (each mouth,
  // like each buffer stop, with its position and the heading out of the track)
  var buffers = nodes.filter(function (ends) { return ends.length === 1; }).map(function (ends) {
    return endPoint(segments, ends[0]);
  });
  var tunnels = nodes.filter(function (ends) {
    if (ends.length !== 2) return false;
    var a = endPoint(segments, ends[0]), b = endPoint(segments, ends[1]);
    return Math.hypot(a.x - b.x, a.y - b.y) > 0.01;
  }).map(function (ends) {
    return ends.map(function (end) { return endPoint(segments, end); });
  });
  // settings: what each switch is set to, by the game (all straight on for a new track)
  return {
    name: name, segments: segments, nodes: nodes, buffers: buffers, tunnels: tunnels, start: start,
    settings: {}, stations: [{ seg: start.seg, t: start.t, kind: 'start' }]
  };
}

// a tall oval: its right side going down, the bottom curve, its left side going up and the top
// curve (segments 0 to 3, each one's end joining the next one's start); sides 2H long, curves of radius R
function oval(R, H) {
  return [
    lineSegment(R, -H, R, H),
    arcSegment(0, H, R, 0, Math.PI),
    lineSegment(-R, H, -R, -H),
    arcSegment(0, -H, R, Math.PI, 2 * Math.PI)
  ];
}

// a sideways shift: from (x0, y0) to (x1, y1), leaving and arriving parallel to the y axis
function shiftSegment(x0, y0, x1, y1) {
  return curveSegment(function (u) {
    return { x: x0 + (x1 - x0) * (1 - Math.cos(Math.PI * u)) / 2, y: y0 + (y1 - y0) * u };
  }, 300);
}

// one track per level, in this order, then again from the start
export var TRACKS = [
  function circle() {
    return network('Circle', [arcSegment(0, 0, 0.3, 0, 2 * Math.PI)], [[[0, 'start'], [0, 'end']]], { seg: 0, t: 0 });
  },

  // a tall oval with a passing loop bulging out of its right side: 2 switches
  function passingLoop() {
    var R = 0.22, H = 0.2, B = 0.1;
    var segments = oval(R, H).concat([
      curveSegment(function (u) {                      // 4 passing loop, beside the right side
        var s = Math.sin(Math.PI * u);
        return { x: R + B * s * s, y: -H + 2 * H * u };
      }, 200)
    ]);
    var joints = [
      [[3, 'end'], [0, 'start'], [4, 'start']],
      [[0, 'end'], [4, 'end'], [1, 'start']],
      [[1, 'end'], [2, 'start']],
      [[2, 'end'], [3, 'start']]
    ];
    return network('Passing loop', segments, joints, { seg: 2, t: 0.2 });
  },

  // one wavy line from a tunnel at the bottom to a tunnel at the top: going in at the top brings the
  // train out at the bottom. No switches
  function wave() {
    var curve = curveSegment(function (u) {
      return { x: 0.22 * Math.sin(2 * Math.PI * u), y: 0.42 - 0.84 * u };
    }, 600);
    return network('Wave', [curve], [[[0, 'end'], [0, 'start']]], { seg: 0, t: curve.length / 2 });
  },

  // a tall 8 whose lobes cross in the middle: a flat crossing, not a switch, so trains go straight on
  function eight() {
    var W = 0.28;
    var H = 0.42;
    var curve = curveSegment(function (u) {
      var a = 2 * Math.PI * u;
      return { x: W * Math.sin(2 * a), y: H * Math.cos(a) };
    }, 720);
    return network('Figure eight', [curve], [[[0, 'start'], [0, 'end']]], { seg: 0, t: 0 });
  },

  // a trefoil knot: one line through three lobes, crossing itself three times (flat crossings)
  function trefoil() {
    var curve = curveSegment(function (u) {
      var t = 2 * Math.PI * u;
      return { x: 0.135 * (Math.sin(t) + 2 * Math.sin(2 * t)), y: 0.135 * (Math.cos(t) - 2 * Math.cos(2 * t)) + 0.06 };
    }, 1440);
    return network('Trefoil', [curve], [[[0, 'start'], [0, 'end']]], { seg: 0, t: 0 });
  },

  // an oval whose right side runs on, up and down, into a tunnel: going round the oval, or straight
  // through the tunnel back to the right side. 2 switches
  function shortcut() {
    var R = 0.2, H = 0.12, T = 0.42;
    var segments = oval(R, H).concat([
      lineSegment(R, -T, R, -H),                     // 4 down out of the top tunnel
      lineSegment(R, H, R, T)                        // 5 down into the bottom tunnel
    ]);
    var joints = [
      [[3, 'end'], [4, 'end'], [0, 'start']],
      [[0, 'end'], [1, 'start'], [5, 'start']],
      [[1, 'end'], [2, 'start']],
      [[2, 'end'], [3, 'start']],
      [[5, 'end'], [4, 'start']]                     // the tunnel
    ];
    return network('Shortcut', segments, joints, { seg: 2, t: 0.12 });
  },

  // a tall oval with a siding off each side, ending at buffer stops: 2 switches
  function sidings() {
    var R = 0.22, H = 0.2, X = 0.36, Y = 0.06;
    var segments = oval(R, H).concat([
      shiftSegment(R, -H, X, Y),                     // 4 right siding, leaving downwards
      lineSegment(X, Y, X, 0.3),                     // 5 ... to its buffer stop
      shiftSegment(-R, H, -X, -Y),                   // 6 left siding, leaving upwards
      lineSegment(-X, -Y, -X, -0.3)                  // 7 ... to its buffer stop
    ]);
    var joints = [
      [[3, 'end'], [0, 'start'], [4, 'start']],
      [[0, 'end'], [1, 'start']],
      [[1, 'end'], [2, 'start'], [6, 'start']],
      [[2, 'end'], [3, 'start']],
      [[4, 'end'], [5, 'start']],
      [[6, 'end'], [7, 'start']]
    ];
    return network('Sidings', segments, joints, { seg: 2, t: 0.2 });
  },

  // a short line with a balloon loop at each end: the train turns back through the loops. 2 switches
  function balloons() {
    var A = 0.58, R = 0.14, STEM = 0.05; // branches' angle off the line, loops' radius, half the line
    var D = R / Math.sin(A);             // from a switch to its loop's center
    var L = D * Math.cos(A);             // the branches' length
    function balloon(sign) {             // sign -1: the top loop, +1: the bottom one
      var y0 = sign * STEM, cy = y0 + sign * D;
      var out = { x: Math.sin(A) * L, y: y0 + sign * Math.cos(A) * L };   // right branch's far end
      var back = { x: -Math.sin(A) * L, y: out.y };                       // left branch's far end
      var aOut = Math.atan2(out.y - cy, out.x);
      var aBack = Math.atan2(back.y - cy, back.x);
      // around the loop from the right branch to the left one, the long way (away from the line)
      return [
        lineSegment(0, y0, out.x, out.y),
        arcSegment(0, cy, R, aOut, sign < 0 ? aBack - 2 * Math.PI : aBack + 2 * Math.PI),
        lineSegment(back.x, back.y, 0, y0)
      ];
    }
    var segments = [lineSegment(0, STEM, 0, -STEM)].concat(balloon(-1), balloon(1));
    var joints = [
      [[0, 'end'], [1, 'start'], [3, 'end']],
      [[1, 'end'], [2, 'start']],
      [[2, 'end'], [3, 'start']],
      [[0, 'start'], [4, 'start'], [6, 'end']],
      [[4, 'end'], [5, 'start']],
      [[5, 'end'], [6, 'start']]
    ];
    return network('Balloons', segments, joints, { seg: 5, t: segments[5].length / 2 }); // on the bottom loop
  },

  // two loops stacked vertically, joined by two straights tangent to their sides: four switches.
  // Built side by side (easier to read), then turned upright: the stage is usually taller than wide,
  // and side by side the loops would come close to its left and right edges.
  function twinLoops() {
    var C = 0.25; // loop centers at x = ±C
    var R = 0.18; // loop radius
    var segments = [
      // (positions before the quarter turn: top becomes right, left becomes top)
      lineSegment(-C, -R, C, -R),                      // 0 top straight
      lineSegment(-C, R, C, R),                        // 1 bottom straight
      arcSegment(-C, 0, R, -Math.PI / 2, Math.PI / 2), // 2 left loop, inner half (top to bottom)
      arcSegment(-C, 0, R, Math.PI / 2, 1.5 * Math.PI), // 3 left loop, outer half (bottom to top)
      arcSegment(C, 0, R, Math.PI / 2, 1.5 * Math.PI), // 4 right loop, inner half (bottom to top)
      arcSegment(C, 0, R, -Math.PI / 2, Math.PI / 2)   // 5 right loop, outer half (top to bottom)
    ];
    var joints = [
      [[2, 'start'], [3, 'end'], [0, 'start']], // left loop, top
      [[2, 'end'], [3, 'start'], [1, 'start']], // left loop, bottom
      [[4, 'end'], [5, 'start'], [0, 'end']],   // right loop, top
      [[4, 'start'], [5, 'end'], [1, 'end']]    // right loop, bottom
    ];
    return network('Twin loops', segments.map(quarterTurn), joints, { seg: 0, t: 0.25 });
  },

  // two lines up the stage, each through its own tunnel, joined by two crossovers in an X: 4 switches
  function twinTunnels() {
    var X = 0.22, T = 0.42, S = 0.2;
    var segments = [
      lineSegment(-X, T, -X, S),                     // 0 left line, bottom
      lineSegment(-X, S, -X, -S),                    // 1 left line, middle
      lineSegment(-X, -S, -X, -T),                   // 2 left line, top
      lineSegment(X, T, X, S),                       // 3 right line, bottom
      lineSegment(X, S, X, -S),                      // 4 right line, middle
      lineSegment(X, -S, X, -T),                     // 5 right line, top
      shiftSegment(-X, S, X, -S),                    // 6 crossover, left to right going up
      shiftSegment(X, S, -X, -S)                     // 7 crossover, right to left going up
    ];
    var joints = [
      [[0, 'end'], [1, 'start'], [6, 'start']],
      [[1, 'end'], [2, 'start'], [7, 'end']],
      [[3, 'end'], [4, 'start'], [7, 'start']],
      [[4, 'end'], [5, 'start'], [6, 'end']],
      [[2, 'end'], [0, 'start']],                    // left tunnel
      [[5, 'end'], [3, 'start']]                     // right tunnel
    ];
    return network('Twin tunnels', segments, joints, { seg: 0, t: 0.1 });
  },

  // a wide oval whose two sides are joined by two crossovers in an X (crossing flat in the middle):
  // 4 switches. Its ends are half ellipses, flatter than circles, so the sides can stand far enough
  // apart for stations along the crossovers.
  function scissors() {
    var W = 0.3, H = 0.3, E = 0.15, S = 0.25; // half the width, half the sides, ends' depth, half the crossovers' height
    function crossover(x0, x1) {
      return curveSegment(function (u) {
        return { x: x0 + (x1 - x0) * (1 - Math.cos(Math.PI * u)) / 2, y: -S + 2 * S * u };
      }, 300);
    }
    function end(a0, a1, cy) {
      return curveSegment(function (u) {
        var a = a0 + (a1 - a0) * u;
        return { x: W * Math.cos(a), y: cy + E * Math.sin(a) };
      }, 300);
    }
    var segments = [
      lineSegment(W, -H, W, -S),                    // 0 right side, top
      lineSegment(W, -S, W, S),                     // 1 right side, middle
      lineSegment(W, S, W, H),                      // 2 right side, bottom
      end(0, Math.PI, H),                           // 3 bottom end
      lineSegment(-W, H, -W, S),                    // 4 left side, bottom
      lineSegment(-W, S, -W, -S),                   // 5 left side, middle
      lineSegment(-W, -S, -W, -H),                  // 6 left side, top
      end(Math.PI, 2 * Math.PI, -H),                // 7 top end
      crossover(W, -W),                             // 8 right top to left bottom
      crossover(-W, W)                              // 9 left top to right bottom
    ];
    var joints = [
      [[7, 'end'], [0, 'start']],
      [[0, 'end'], [1, 'start'], [8, 'start']],
      [[1, 'end'], [2, 'start'], [9, 'end']],
      [[2, 'end'], [3, 'start']],
      [[3, 'end'], [4, 'start']],
      [[4, 'end'], [5, 'start'], [8, 'end']],
      [[5, 'end'], [6, 'start'], [9, 'start']],
      [[6, 'end'], [7, 'start']]
    ];
    return network('Scissors', segments, joints, { seg: 3, t: segments[3].length / 2 });
  },

  // two lines through tunnels, one up the stage and one across it, crossing flat in the middle and
  // linked by two curves: 4 switches
  function crossroads() {
    var T = 0.42, J = 0.22;
    var segments = [
      lineSegment(0, T, 0, J),                       // 0 up the stage, from the bottom tunnel
      lineSegment(0, J, 0, -J),                      // 1 ... through the middle
      lineSegment(0, -J, 0, -T),                     // 2 ... into the top tunnel
      lineSegment(-T, 0, -J, 0),                     // 3 across the stage, from the left tunnel
      lineSegment(-J, 0, J, 0),                      // 4 ... through the middle
      lineSegment(J, 0, T, 0),                       // 5 ... into the right tunnel
      arcSegment(J, J, J, Math.PI, 1.5 * Math.PI),   // 6 link: going up, turn right
      arcSegment(-J, -J, J, 0, Math.PI / 2)          // 7 link: going down, turn right
    ];
    var joints = [
      [[0, 'end'], [1, 'start'], [6, 'start']],
      [[1, 'end'], [2, 'start'], [7, 'start']],
      [[3, 'end'], [4, 'start'], [7, 'end']],
      [[4, 'end'], [5, 'start'], [6, 'end']],
      [[2, 'end'], [0, 'start']],                    // top and bottom tunnels
      [[5, 'end'], [3, 'start']]                     // right and left tunnels
    ];
    return network('Crossroads', segments, joints, { seg: 1, t: 0.08 });
  },

  // two rings, one inside the other, with a crossover between them at the top and at the bottom
  // (in opposite directions): 4 switches
  function rings() {
    var OUT = 0.4, IN = 0.25, W = 0.55; // radii, and half the angle a crossover spans
    var top = -Math.PI / 2, bottom = Math.PI / 2;
    function crossover(a0, a1) {
      return curveSegment(function (u) {
        var a = a0 + (a1 - a0) * u;
        var r = OUT - (OUT - IN) * (1 - Math.cos(Math.PI * u)) / 2;
        return { x: Math.cos(a) * r, y: Math.sin(a) * r };
      }, 300);
    }
    var segments = [
      arcSegment(0, 0, OUT, top - W, bottom + W),             // 0 outer ring, right side
      arcSegment(0, 0, OUT, bottom + W, top - W + 2 * Math.PI), // 1 outer ring, left side
      arcSegment(0, 0, IN, top + W, bottom - W),              // 2 inner ring, right side
      arcSegment(0, 0, IN, bottom - W, top + W + 2 * Math.PI),  // 3 inner ring, left side
      crossover(top - W, top + W),                            // 4 top crossover, clockwise inwards
      crossover(bottom + W, bottom - W)                       // 5 bottom crossover, anticlockwise inwards
    ];
    var joints = [
      [[1, 'end'], [0, 'start'], [4, 'start']],
      [[0, 'end'], [1, 'start'], [5, 'start']],
      [[3, 'end'], [2, 'start'], [4, 'end']],
      [[2, 'end'], [3, 'start'], [5, 'end']]
    ];
    return network('Rings', segments, joints, { seg: 0, t: (Math.PI + 2 * W) * OUT / 2 });
  }
];

export function reverse(step) {
  return { seg: step.seg, dir: -step.dir };
}

// the point at distance d along a step, with the heading of the walk
export function stepPoint(track, step, d) {
  var segment = track.segments[step.seg];
  var p = segment.at(step.dir > 0 ? d : segment.length - d);
  return { x: p.x, y: p.y, heading: p.heading + (step.dir > 0 ? 0 : Math.PI) };
}

// where a step ends: its node, the end it arrives through, and the heading on arrival
export function arrival(track, step) {
  var segment = track.segments[step.seg];
  var end = step.dir > 0 ? 'end' : 'start';
  var p = stepPoint(track, step, segment.length);
  return { node: segment.ends[end], seg: step.seg, end: end, x: p.x, y: p.y, heading: p.heading };
}

function turn(a, b) {
  return Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
}

// the steps a train can take after an arrival, each with how far it bends to the left (positive)
// or to the right (negative) of the arrival heading
export function exits(track, arr) {
  return track.nodes[arr.node].filter(function (end) {
    return !(end.seg === arr.seg && end.end === arr.end);
  }).map(function (end) {
    var step = { seg: end.seg, dir: end.end === 'start' ? 1 : -1 };
    var first = stepPoint(track, step, 0); // where the arrival goes on (across a tunnel, at its other mouth)
    var ahead = stepPoint(track, step, Math.min(0.08, track.segments[end.seg].length));
    // left of a heading h, with y pointing down, is (sin h, -cos h)
    var side = (ahead.x - first.x) * Math.sin(arr.heading) - (ahead.y - first.y) * Math.cos(arr.heading);
    return { step: step, heading: first.heading, side: side };
  }).filter(function (option) {
    return turn(option.heading, arr.heading) < SMOOTH;
  });
}

// steer -1 takes the leftmost branch, +1 the rightmost, 0 the straightest
export function choose(options, steer) {
  return options.reduce(function (best, option) {
    var better = steer < 0 ? option.side > best.side
      : steer > 0 ? option.side < best.side
        : Math.abs(option.side) < Math.abs(best.side);
    return better ? option : best;
  });
}
