/* Tile flip — every .tile-grid swaps between two checkerboard frames together,
   holding each frame for 8 ticks (see --tick in styles.css). Runs only while on
   screen; with reduced motion the first frame just stays. */
(function () {
  var FLIP_TICKS = 8;

  function tickMs() {
    var v = getComputedStyle(document.documentElement).getPropertyValue('--tick');
    return parseFloat(v) || 80;
  }

  function init() {
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;
    Array.prototype.forEach.call(document.querySelectorAll('.tile-grid'), function (grid) {
      var cells = Array.prototype.slice.call(grid.querySelectorAll('.tile-cell'));
      var timer = null;
      function flipAll() {
        cells.forEach(function (c) { c.dataset.state = c.dataset.state === 'blue' ? 'red' : 'blue'; });
      }
      function start() { if (!timer) timer = setInterval(flipAll, FLIP_TICKS * tickMs()); }
      function stop()  { clearInterval(timer); timer = null; }
      if (!('IntersectionObserver' in window)) { start(); return; }
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) start(); else stop(); });
      }, { threshold: 0.2 }).observe(grid);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
