/* PDMD -- pairwise user study: PDMD against one chosen baseline.
   Shares in percent, copied from the paper's supplement (Tables supp-h3-userstudy
   and supp-wan-userstudy); net = win - loss, as the main tables print it. */
(function () {
  "use strict";

  /* [win, tie, loss] per question */
  var STUDY = {
    h3: {
      note: "387 VideoGen-Eval prompts, 20 annotators. Each pair shows PDMD and one baseline for the same prompt and seed, side by side in random order; the annotator picks the better clip or a tie on each question.",
      dims: ["Overall", "Text alignment", "Visual quality", "Motion quality", "Audio quality"],
      rows: [
        { id: "dmd2", name: "DMD2", dag: 1, v: [[51.7,31.8,16.5],[19.1,70.8,10.1],[39.0,50.6,10.3],[27.6,64.1,8.3],[26.6,69.0,4.4]] },
        { id: "dmd", name: "DMD", dag: 1, v: [[45.2,39.3,15.5],[15.2,73.1,11.6],[34.9,55.3,9.8],[19.9,72.4,7.8],[15.5,79.8,4.7]] },
        { id: "turbo", name: "H3 Turbo LoRA", v: [[51.2,32.3,16.5],[13.4,76.0,10.6],[49.9,38.2,11.9],[26.9,65.6,7.5],[13.7,81.9,4.4]] },
        { id: "rcm", name: "rCM", dag: 1, v: [[60.2,23.3,16.5],[16.3,70.5,13.2],[62.8,25.6,11.6],[39.8,51.9,8.3],[27.9,61.2,10.9]] },
        { id: "anyflow", name: "AnyFlow", dag: 1, v: [[69.5,20.2,10.3],[9.0,80.4,10.6],[72.4,21.7,5.9],[33.9,60.2,5.9],[30.0,65.9,4.1]] },
        { id: "base4", name: "MiniMax-H3-33B", sub: "4 NFE", base: 1, v: [[79.3,11.6,9.0],[26.4,63.8,9.8],[78.3,16.0,5.7],[50.1,44.4,5.4],[49.6,48.3,2.1]] },
        { id: "teacher", name: "MiniMax-H3-33B", sub: "teacher, 50 NFE", base: 1, v: [[14.2,34.6,51.2],[10.6,71.3,18.1],[8.0,48.6,43.4],[8.0,72.1,19.9],[7.5,81.1,11.4]] }
      ]
    },
    wan: {
      note: "95 VBench prompts (every tenth), seed 0, 20 annotators. Same side-by-side protocol, without the overall and audio questions. The undistilled 4-step model is left out: many of its clips are black frames.",
      dims: ["Text alignment", "Visual quality", "Motion quality"],
      rows: [
        { id: "dmd", name: "DMD", dag: 1, v: [[9.3,87.8,2.8],[58.1,37.4,4.5],[37.7,59.8,2.5]] },
        { id: "dmd2", name: "DMD2", dag: 1, v: [[10.1,87.2,2.7],[49.9,39.7,10.4],[35.9,59.0,5.1]] },
        { id: "adv", name: "ADV", v: [[10.7,81.5,7.8],[46.6,41.4,12.0],[33.3,52.7,14.1]] },
        { id: "rcm", name: "rCM", v: [[5.7,86.6,7.8],[46.7,40.4,12.9],[29.6,58.4,11.9]] },
        { id: "anyflow", name: "AnyFlow", v: [[8.7,83.3,8.1],[39.5,45.0,15.5],[39.7,49.5,10.8]] },
        { id: "teacher", name: "Wan2.1-T2V-1.3B", sub: "teacher, 50×2 NFE", base: 1, v: [[8.5,82.5,8.9],[36.7,44.3,19.1],[39.9,44.5,15.6]] }
      ]
    }
  };

  var host = document.getElementById("us");
  if (!host) return;
  var setSw = document.getElementById("usSet");
  var picks = document.getElementById("usPick");
  var bars = document.getElementById("usBars");
  var legendB = document.getElementById("usLegB");
  var note = document.getElementById("usNote");

  var state = { set: "h3", opp: { h3: "dmd", wan: "dmd" } };

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return "&#" + c.charCodeAt(0) + ";"; }); }
  function label(r) { return esc(r.name) + (r.dag ? '<sup class="dag">&#8224;</sup>' : ""); }
  function fmtNet(x) { return (x > 0 ? "+" : x < 0 ? "−" : "") + Math.abs(x).toFixed(1); }

  function renderPicks() {
    var S = STUDY[state.set];
    picks.innerHTML = S.rows.map(function (r) {
      var on = r.id === state.opp[state.set];
      return '<button class="us-opp' + (r.base ? " is-base" : "") + '" role="radio" aria-checked="' + on +
        '" data-id="' + r.id + '">' + label(r) + (r.sub ? " <em>" + esc(r.sub) + "</em>" : "") + "</button>";
    }).join("");
  }

  function renderBars() {
    var S = STUDY[state.set];
    var r = S.rows.filter(function (x) { return x.id === state.opp[state.set]; })[0];
    legendB.innerHTML = label(r) + (r.sub ? " <em>" + esc(r.sub) + "</em>" : "");
    bars.innerHTML = S.dims.map(function (d, i) {
      var v = r.v[i], net = Math.round((v[0] - v[2]) * 10) / 10;
      var seg = ["w", "t", "l"].map(function (k, j) {
        var p = v[j];
        return '<span class="us-seg us-' + k + '" style="flex-basis:' + p + '%" title="' +
          ["PDMD", "Tie", r.name][j] + " " + p.toFixed(1) + '%">' +
          (p >= 6 ? "<i>" + Math.round(p) + "</i>" : "") + "</span>";
      }).join("");
      return '<div class="us-row"><div class="us-dim">' + esc(d) + "</div>" +
        '<div class="us-bar">' + seg + "</div>" +
        '<div class="us-net' + (net > 0 ? " pos" : net < 0 ? " neg" : "") + '">' + fmtNet(net) + "</div></div>";
    }).join("");
    /* grow in from the left on every change */
    bars.classList.remove("go"); void bars.offsetWidth; bars.classList.add("go");
  }

  function render() {
    setSw.querySelectorAll(".sw").forEach(function (b) {
      b.setAttribute("aria-selected", b.dataset.s === state.set ? "true" : "false");
    });
    note.textContent = STUDY[state.set].note;
    renderPicks();
    renderBars();
  }

  setSw.addEventListener("click", function (e) {
    var b = e.target.closest(".sw"); if (!b || b.dataset.s === state.set) return;
    state.set = b.dataset.s; render();
  });
  picks.addEventListener("click", function (e) {
    var b = e.target.closest(".us-opp"); if (!b) return;
    state.opp[state.set] = b.dataset.id; renderPicks(); renderBars();
  });

  render();
})();
