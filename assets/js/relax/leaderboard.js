/*
 * Leaderboards: each game's top scores, arcade style (3-letter initials).
 * A game's preset entries (its `leaderboard` field) are mixed with the player's own results,
 * which are saved in this browser.
 */

export var BOARD_SIZE = 5;
var KEPT = 10; // the player's results kept per game (only the best ones can show)

export function normalizeInitials(raw) {
  return String(raw || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, function (ch) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
  });
}

// highest score first; on a tie, the older entry (presets are oldest) stays ahead
function byScore(a, b) {
  return b.score - a.score || a.at - b.at;
}

export function createLeaderboard(storage, game) {
  var key = 'relax.board.' + game.id;

  function mine() {
    var list;
    try { list = JSON.parse(storage.get(key) || 'null'); } catch (e) { list = null; }
    if (!Array.isArray(list)) {
      list = [];
      // carry over the best score saved before leaderboards existed
      var best = parseInt(storage.get('relax.best.' + game.id), 10);
      if (best > 0) list.push({ name: normalizeInitials(storage.get('relax.initials')) || 'YOU', score: best, at: 0 });
    }
    return list.filter(function (entry) {
      return entry && typeof entry.name === 'string' && typeof entry.score === 'number';
    });
  }

  function all() {
    var preset = (game.leaderboard || []).map(function (entry) {
      return { name: entry.name, score: entry.score, at: -1, mine: false };
    });
    var own = mine().map(function (entry) {
      return { name: entry.name, score: entry.score, at: entry.at || 0, mine: true };
    });
    return preset.concat(own).sort(byScore);
  }

  return {
    // would this score enter the top BOARD_SIZE?
    qualifies: function (score) {
      var list = all();
      return score > 0 && (list.length < BOARD_SIZE || score > list[BOARD_SIZE - 1].score);
    },

    add: function (name, score) {
      var entry = { name: normalizeInitials(name) || 'YOU', score: score, at: Date.now() };
      var list = mine();
      list.push(entry);
      list.sort(byScore);
      storage.set(key, JSON.stringify(list.slice(0, KEPT)));
      return entry;
    },

    // the top entries as list items; if none of them is the player's, the player's best takes
    // the last row with its real rank, so the player always sees where they stand
    html: function (highlight) {
      var list = all();
      var rows = list.slice(0, BOARD_SIZE).map(function (entry, i) { return { entry: entry, rank: i + 1 }; });
      if (!rows.some(function (row) { return row.entry.mine; })) {
        for (var i = BOARD_SIZE; i < list.length; i++) {
          if (list[i].mine) {
            rows[BOARD_SIZE - 1] = { entry: list[i], rank: i + 1, outside: true };
            break;
          }
        }
      }
      return rows.map(function (row) {
        var entry = row.entry;
        var classes = 'relax-board-row' + (entry.mine ? ' is-mine' : '') + (row.outside ? ' is-outside' : '') +
          (highlight && entry.mine && entry.at === highlight.at ? ' is-new' : '');
        return '<li class="' + classes + '"><span>' + row.rank + '</span><span>' + escapeHtml(entry.name) +
          '</span><span>' + entry.score.toLocaleString('en-US') + '</span></li>';
      }).join('');
    }
  };
}
