/* Seven dimensions on VideoGen-Eval (MiniMax-H3-33B), four-step models only.
   Each spoke carries its own range -- the lowest and highest value any row in
   the table reaches on that dimension -- because Total near 83 and CE near 4
   on one shared scale would make the polygon a picture of the units.

   Colour does one job here: PDMD against the field. The three baselines share a
   single neutral hue and are told apart by lightness and dash pattern, which
   survives every form of colour blindness; four competing hues did not. */
(function () {
  "use strict";

  /* three visual axes then four audio ones, named so the two families read
     apart on the chart the way they do in the grouped table */
  var AXES = [
    {k: 'Visual \u00b7 Total',    lo: 79.48, hi: 83.17, d: 2},
    {k: 'Visual \u00b7 Quality',  lo: 79.54, hi: 83.25, d: 2},
    {k: 'Visual \u00b7 Dynamic',  lo: 44.44, hi: 71.83, d: 2},
    {k: 'Audio \u00b7 PQ',        lo: 6.056, hi: 6.567, d: 3},
    {k: 'Audio \u00b7 CE',        lo: 3.167, hi: 4.188, d: 3},
    {k: 'Audio \u00b7 CU',        lo: 5.446, hi: 6.213, d: 3},
    {k: 'Audio \u00b7 IS',        lo: 3.35,  hi: 5.15,  d: 2}
  ];
  /*                      Total  Quality Dynamic  PQ     CE     CU     IS   */
  var SERIES = [
    {name: 'PDMD',      note: '4 NFE, ours', v0: '--s1', w: 2.6, dash: '', dots: true,
     v: [83.17, 83.25, 71.83, 6.530, 4.062, 6.180, 4.98]},
    {name: 'DMD\u2020', note: '4 NFE', v0: '--s2', w: 1.6, dash: '7 4',
     v: [82.76, 82.68, 61.76, 6.381, 3.801, 5.931, 4.79]},
    {name: 'AnyFlow\u2020', note: '4 NFE', v0: '--s3', w: 1.6, dash: '3 4',
     v: [81.97, 81.82, 64.60, 6.092, 3.544, 5.591, 4.35]},
    {name: 'rCM\u2020', note: '4 NFE', v0: '--s4', w: 1.6, dash: '1 5',
     v: [81.18, 80.98, 58.40, 6.063, 3.711, 5.446, 3.69]}
  ];

  var CX = 280, CY = 232, R = 158, INNER = 0.14;
  var NS = 'http://www.w3.org/2000/svg';
  function el(n, a) {
    var e = document.createElementNS(NS, n);
    for (var k in a) e.setAttribute(k, a[k]);
    return e;
  }
  function pt(i, t) {
    var ang = -Math.PI / 2 + (i / AXES.length) * Math.PI * 2;
    var rr = R * (INNER + (1 - INNER) * t);
    return [CX + Math.cos(ang) * rr, CY + Math.sin(ang) * rr];
  }
  function norm(i, v) {
    var a = AXES[i];
    return Math.max(0, Math.min(1, (v - a.lo) / (a.hi - a.lo)));
  }

  window.PDMDRadar = function (svg, legendHost) {
    if (!svg) return;
    var cs = getComputedStyle(svg.parentElement || svg);
    SERIES.forEach(function (s) {
      s.color = (cs.getPropertyValue(s.v0) || '#FF6A2C').trim();
    });
    var ring = (cs.getPropertyValue('--ringc') || 'rgba(255,255,255,.12)').trim();
    [0.25, 0.5, 0.75, 1].forEach(function (t) {
      svg.appendChild(el('polygon', {
        points: AXES.map(function (_, i) { return pt(i, t).join(','); }).join(' '),
        fill: 'none', stroke: ring}));
    });
    AXES.forEach(function (a, i) {
      var p0 = pt(i, 0), p1 = pt(i, 1);
      svg.appendChild(el('line', {x1: p0[0], y1: p0[1], x2: p1[0], y2: p1[1], stroke: ring}));
      var lp = pt(i, 1.17);
      var anchor = Math.abs(lp[0] - CX) < 6 ? 'middle' : (lp[0] > CX ? 'start' : 'end');
      var t1 = el('text', {x: lp[0], y: lp[1], class: 'axis', 'text-anchor': anchor});
      t1.textContent = a.k;
      svg.appendChild(t1);
      var t2 = el('text', {x: lp[0], y: lp[1] + 14, class: 'rng', 'text-anchor': anchor});
      t2.textContent = a.lo.toFixed(a.d) + ' \u2013 ' + a.hi.toFixed(a.d);
      svg.appendChild(t2);
    });
    SERIES.slice().reverse().forEach(function (s) {
      var pts = s.v.map(function (v, i) { return pt(i, norm(i, v)); });
      svg.appendChild(el('polygon', {
        points: pts.map(function (p) { return p.join(','); }).join(' '),
        fill: s.color, 'fill-opacity': s.dots ? 0.17 : 0.045,
        stroke: s.color, 'stroke-width': s.w, 'stroke-dasharray': s.dash,
        'stroke-linejoin': 'round'
      }));
      if (s.dots) {
        pts.forEach(function (p) {
          svg.appendChild(el('circle', {cx: p[0], cy: p[1], r: 3.6, fill: s.color,
            stroke: (cs.getPropertyValue('--dotring') || '#050505').trim(), 'stroke-width': 1.5}));
        });
      }
    });
    if (legendHost) {
      SERIES.forEach(function (s) {
        var d = document.createElement('div');
        var i = document.createElement('i');
        i.style.background = s.dash
          ? 'repeating-linear-gradient(90deg,' + s.color + ' 0 4px,transparent 4px 8px)'
          : s.color;
        var t = document.createElement('span');
        t.innerHTML = '<b></b><span class="note"></span>';
        t.querySelector('b').innerHTML = (window.PDMDUI && window.PDMDUI.dagHTML)
          ? window.PDMDUI.dagHTML(s.name) : s.name;
        t.querySelector('.note').textContent = s.note;
        d.appendChild(i); d.appendChild(t);
        legendHost.appendChild(d);
      });
    }
  };
})();
