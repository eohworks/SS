/* Tile flip — each .tile-grid switches between its two checkerboard frames by
   building the new frame cell by cell, top-left to bottom-right, one tick
   apart (see --tick in styles.css). It holds each finished frame, switches
   SWITCH_COUNT times, then repeats. Runs only while on screen; with reduced
   motion the first frame just stays. Re-entering view always starts a clean
   cycle from the original frame, even if a build was interrupted mid-way. */
(function () {
  var BUILD_STAGGER = 1;   // ticks between each cell's flip during a build
  var HOLD_TICKS = 8;      // ticks to hold a finished frame before the next build
  var SWITCH_COUNT = 4;    // switches between the two checkerboards per cycle

  function tickMs() {
    var v = getComputedStyle(document.documentElement).getPropertyValue('--tick');
    return parseFloat(v) || 80;
  }

  // The starting checkerboard, by row + column parity — same rule the markup uses.
  function startState(i) { return (Math.floor(i / 3) + (i % 3)) % 2 === 0 ? 'blue' : 'red'; }

  function init() {
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;
    Array.prototype.forEach.call(document.querySelectorAll('.tile-grid'), function (grid) {
      var cells = Array.prototype.slice.call(grid.querySelectorAll('.tile-cell')); // DOM order is already top-left to bottom-right
      var timers = [];
      var running = false;

      function clearTimers() { timers.forEach(clearTimeout); timers = []; }

      function buildToOpposite(then) {
        var t = tickMs();
        cells.forEach(function (cell, i) {
          timers.push(setTimeout(function () {
            cell.dataset.state = cell.dataset.state === 'blue' ? 'red' : 'blue';
          }, i * BUILD_STAGGER * t));
        });
        var buildEnd = (cells.length - 1) * BUILD_STAGGER * t;
        timers.push(setTimeout(then, buildEnd + HOLD_TICKS * t));
      }

      function cycle(switchIndex) {
        if (switchIndex >= SWITCH_COUNT) { cycle(0); return; }   // loop back to a fresh cycle
        buildToOpposite(function () { cycle(switchIndex + 1); });
      }

      function start() {
        if (running) return;
        running = true;
        clearTimers();
        cells.forEach(function (cell, i) { cell.dataset.state = startState(i); }); // snap to a known frame
        cycle(0);
      }
      function stop() {
        running = false;
        clearTimers();
      }

      if (!('IntersectionObserver' in window)) { start(); return; }
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) start(); else stop(); });
      }, { threshold: 0.2 }).observe(grid);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
