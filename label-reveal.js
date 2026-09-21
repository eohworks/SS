/* Label Reveal — sequences the animated label SVG (see .label-reveal in styles.css).
   Grid lines: the direction with many lines staggers one tick apart while the few
   crossing lines sweep once across. Text rows follow two ticks apart, starting with
   the grid; each label's flag is its last piece. Plays when scrolled into view, holds on
   the finished artwork, cuts back to blank and loops while it stays in view. */
(function () {
  var TEXT_START = 0;      // ticks
  var ROW_STAGGER = 2;     // ticks between rows
  var HOLD_TICKS = 40;     // rest on the finished artwork before the loop restarts (40 x 80ms = 3.2s)

  var num = function (el, a) { return parseFloat(el.getAttribute(a) || 0); };
  var delay = function (el, ticks) { el.style.animationDelay = 'calc(var(--tick) * ' + ticks + ')'; };
  // The plate holds three labels, told apart by horizontal position (viewBox units).
  var clusterOf = function (x) { return x < 800 ? 0 : x < 1400 ? 1 : 2; };

  function prepare(svg) {
    /* Grid lines */
    var seen = {};
    var lines = Array.prototype.slice.call(svg.querySelectorAll('line')).filter(function (l) {
      // Draw left-to-right / top-to-bottom; drop exact duplicates.
      if (num(l, 'x1') > num(l, 'x2')) { var t = l.getAttribute('x1'); l.setAttribute('x1', l.getAttribute('x2')); l.setAttribute('x2', t); }
      if (num(l, 'y1') > num(l, 'y2')) { var u = l.getAttribute('y1'); l.setAttribute('y1', l.getAttribute('y2')); l.setAttribute('y2', u); }
      var key = ['x1', 'y1', 'x2', 'y2'].map(function (a) { return l.getAttribute(a); }).join();
      if (seen[key]) { l.remove(); return false; }
      seen[key] = true;
      l.setAttribute('pathLength', 1);
      return true;
    });

    var groups = [[], [], []];
    lines.forEach(function (l) { groups[clusterOf((num(l, 'x1') + num(l, 'x2')) / 2)].push(l); });
    groups.forEach(function (group) {
      var H = group.filter(function (l) { return num(l, 'y1') === num(l, 'y2'); })
        .sort(function (a, b) { return num(a, 'y1') - num(b, 'y1'); });
      var V = group.filter(function (l) { return num(l, 'x1') === num(l, 'x2'); })
        .sort(function (a, b) { return num(a, 'x1') - num(b, 'x1'); });
      var stag = H.length > V.length ? H : V;
      var sweep = H.length > V.length ? V : H;
      stag.forEach(function (l, i) { l.classList.add('stag'); delay(l, i); });
      sweep.forEach(function (l) {
        l.classList.add('sweep');
        l.style.animationDuration = 'calc(var(--tick) * ' + stag.length + ')';
      });
    });

    /* Text rows + flags */
    var layer = svg.querySelector('[data-layer="text"]');
    var box = function (el) { return el.getBBox(); };
    var mid = function (el) { var b = box(el); return b.x + b.width / 2; };
    var isVertical = function (el) { var b = box(el); return b.height > b.width * 2; };
    var pieces = Array.prototype.slice.call(layer.children);

    [0, 1, 2].forEach(function (c) {
      var mine = pieces.filter(function (el) { return clusterOf(mid(el)) === c; });
      var rows = mine.filter(function (el) {
        return el.tagName === 'path' && !el.hasAttribute('data-flag') && !el.hasAttribute('data-ghost');
      });
      // Reading order: rotated rows left-to-right first, then horizontal rows top-to-bottom.
      rows.sort(function (a, b) {
        var av = isVertical(a), bv = isVertical(b);
        if (av !== bv) return av ? -1 : 1;
        return av ? box(a).x - box(b).x : box(a).y - box(b).y;
      });
      rows.forEach(function (el, i) { el.classList.add('lr-row'); delay(el, TEXT_START + i * ROW_STAGGER); });

      // A dimmed echo shows together with the row it repeats.
      mine.filter(function (el) { return el.hasAttribute('data-ghost'); }).forEach(function (g) {
        var G = box(g);
        var twin = rows.filter(function (r) { var R = box(r); return Math.abs(R.x - G.x) < 2 && Math.abs(R.width - G.width) < 2; })[0];
        g.classList.add('lr-row');
        delay(g, TEXT_START + (twin ? rows.indexOf(twin) : 0) * ROW_STAGGER);
      });

      // The flag is the last piece of its label.
      var flagTick = TEXT_START + rows.length * ROW_STAGGER;
      mine.filter(function (el) { return el.hasAttribute('data-flag'); })
        .forEach(function (el) { el.classList.add('lr-row'); delay(el, flagTick); });
    });

    svg.classList.add('is-ready');
  }

  function tickMs() {
    var v = getComputedStyle(document.documentElement).getPropertyValue('--tick');
    return parseFloat(v) || 80;
  }

  // Play once, hold, cut back to blank, repeat — until stopped.
  function loop(svg) {
    var run = 0, timer = null;
    function play() {
      var id = ++run;
      svg.classList.remove('is-playing');
      void svg.getBoundingClientRect();              // restart the CSS animations from the blank state
      svg.classList.add('is-playing');
      var done = svg.getAnimations({ subtree: true }).map(function (a) { return a.finished.catch(function () {}); });
      Promise.all(done).then(function () {
        if (id !== run) return;                      // stopped or restarted meanwhile
        timer = setTimeout(function () { if (id === run) play(); }, HOLD_TICKS * tickMs());
      });
    }
    function stop() {
      run++;
      clearTimeout(timer);
      svg.classList.remove('is-playing');            // back to blank, ready to start again on re-entry
    }
    return { play: play, stop: stop };
  }

  function init() {
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    Array.prototype.forEach.call(document.querySelectorAll('.label-reveal'), function (svg) {
      if (reduced) return;                           // leave the finished artwork as-is
      prepare(svg);
      var cycle = loop(svg);
      if (!('IntersectionObserver' in window)) { cycle.play(); return; }
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) cycle.play(); else cycle.stop(); });
      }, { threshold: 0.4 }).observe(svg);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
