/* PDMD -- lazy video, the wipe, the film grid, lightbox, reveal */
(function () {
  "use strict";
  document.documentElement.classList.add("js");

  var LIVE = [], MAX_LIVE = 12;
  function stageOf(v) { return v.closest(".cell,.frame,.wipe,.hero,.shot"); }

  function mark(v, on) {
    var s = stageOf(v);
    if (s) s.classList.toggle("playing", on);
  }
  function start(v) {
    if (!v.src && v.dataset.src) v.src = v.dataset.src;
    var p = v.play();
    /* only hide the poster once frames are actually arriving -- if the browser
       refuses (decoder budget, autoplay policy) the poster has to stay up */
    if (p && p.then) p.then(function () { mark(v, true); }, function () { mark(v, false); });
    else mark(v, true);
    var i = LIVE.indexOf(v); if (i > -1) LIVE.splice(i, 1);
    LIVE.push(v);
    while (LIVE.length > MAX_LIVE) { var old = LIVE.shift(); if (old !== v && !old.dataset.keep) release(old); }
  }
  function stop(v) { try { v.pause(); } catch (e) {} }
  function release(v) {
    stop(v);
    var s = stageOf(v); if (s) s.classList.remove("playing");
    if (v.src) { v.removeAttribute("src"); try { v.load(); } catch (e) {} }
  }

  var vio = ("IntersectionObserver" in window) ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) start(e.target); else stop(e.target); });
  }, { threshold: 0.2, rootMargin: "500px 0px" }) : null;

  function video(src, keep) {
    var v = document.createElement("video");
    v.muted = true; v.loop = true; v.playsInline = true; v.preload = "none";
    v.setAttribute("muted", ""); v.setAttribute("playsinline", ""); v.setAttribute("loop", "");
    v.dataset.src = src;
    if (keep) v.dataset.keep = "1";
    v.addEventListener("playing", function () { mark(v, true); });
    v.addEventListener("error", function () { mark(v, false); });
    v.addEventListener("stalled", function () { mark(v, false); });
    return v;
  }
  function observe(v) { if (vio) vio.observe(v); else start(v); }

  /* ---------- reveal ---------- */
  function arm() {
    if (!("IntersectionObserver" in window)) return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.04, rootMargin: "0px 0px -5% 0px" });
    document.querySelectorAll(".reveal:not(.in)").forEach(function (el) {
      if (el.getBoundingClientRect().top < window.innerHeight * 0.96) { el.classList.add("in"); return; }
      el.classList.add("armed"); io.observe(el);
    });
  }

  /* ---------- lightbox ---------- */
  var lb = null;
  function onKey(e) { if (e.key === "Escape") close(); }
  function close() { if (!lb) return; document.removeEventListener("keydown", onKey); lb.remove(); lb = null; }
  function openLightbox(it) {
    close();
    lb = document.createElement("div");
    lb.className = "lb"; lb.setAttribute("role", "dialog"); lb.setAttribute("aria-modal", "true");
    var box = document.createElement("div"); box.className = "lb-in";
    var v = document.createElement("video");
    v.src = it.src; v.controls = true; v.loop = true; v.playsInline = true;
    v.muted = false; v.setAttribute("playsinline", "");
    var pp = v.play();
    if (pp && pp.catch) {
      pp.catch(function () {          /* sound-on autoplay refused: start muted */
        v.muted = true;
        var q = v.play(); if (q && q.catch) q.catch(function () {});
      });
    }
    var m = document.createElement("div"); m.className = "lb-meta";
    var h = document.createElement("h3"); h.textContent = it.title || ""; m.appendChild(h);
    if (it.sub) { var s = document.createElement("div"); s.textContent = it.sub; m.appendChild(s); }
    if (it.prompt) { var p = document.createElement("p"); p.textContent = it.prompt; m.appendChild(p); }
    box.appendChild(v); box.appendChild(m);
    var b = document.createElement("button");
    b.className = "lb-close"; b.type = "button"; b.textContent = "Close";
    b.addEventListener("click", close);
    lb.appendChild(box); lb.appendChild(b);
    lb.addEventListener("click", function (e) { if (e.target === lb) close(); });
    document.body.appendChild(lb);
    document.addEventListener("keydown", onKey);
    b.focus();
  }

  /* ---------- film-grid cell ----------
     Nothing autoplays here. The poster is the resting state; the clip loads and
     plays on hover and is released on the way out, so a page of forty cells never
     asks the browser for forty decoders at once. */
  /* Hover is not a user gesture, so Chrome refuses unmuted play() until the
     document has had one real interaction (sticky activation). Track that, and
     when it arrives, unmute whatever is under the cursor right then -- otherwise
     the first hovered cell would stay silent until you left and came back. */
  var ARMED = false, HOT = null, AUDIBLE = null;
  (function () {
    try { ARMED = !!(navigator.userActivation && navigator.userActivation.hasBeenActive); } catch (e) {}
    function arm() {
      if (ARMED) return;
      ARMED = true;
      document.documentElement.classList.remove("needs-gesture");
      document.documentElement.classList.add("sound-on");
      if (HOT) { HOT.muted = false; HOT.removeAttribute("muted");
                 var p = HOT.play(); if (p && p.catch) p.catch(function () {}); }
    }
    /* An explicit control, because the implicit rule is invisible: Chrome will
       not start unmuted video until the page has had a real interaction, and a
       reader who only ever hovers never gives it one. Clicking this button is
       that interaction, and it says out loud whether sound is on. */
    /* One audible element across the whole page, whoever asks.

       Sound is attempted every time, not gated behind a switch. Chrome will not
       let a script unmute a playing video before the document has had a real
       interaction -- it pauses the element instead -- so the attempt is made
       optimistically and undone if the browser rejects it: if the clip pauses
       within a few frames of being unmuted, it is re-muted and resumed, and a
       one-line hint appears until the first click arms things for good. */
    function soloAudio(v) {
      if (AUDIBLE && AUDIBLE !== v) {
        try { AUDIBLE.muted = true; AUDIBLE.setAttribute("muted", ""); } catch (e) {}
      }
      AUDIBLE = v || null;
      if (!v) return;
      try {
        v.volume = 1;
        v.muted = false;
        v.removeAttribute("muted");
      } catch (e) { return; }
      if (ARMED) return;                 /* already allowed; nothing to check */

      var undo = function () {
        v.removeEventListener("pause", undo);
        try {
          v.muted = true; v.setAttribute("muted", "");
          var p = v.play(); if (p && p.catch) p.catch(function () {});
        } catch (e) {}
        document.documentElement.classList.add("needs-gesture");
      };
      v.addEventListener("pause", undo);
      setTimeout(function () {
        v.removeEventListener("pause", undo);
        if (!v.paused && !v.muted) {      /* the browser allowed it after all */
          ARMED = true;
          document.documentElement.classList.remove("needs-gesture");
        }
      }, 180);
    }
    window.PDMDSolo = soloAudio;
    window.PDMDSound = {
      on: function () { return ARMED; },
      enable: arm,
      mute: function () {
        ARMED = false;
        document.documentElement.classList.remove("sound-on");
        document.documentElement.classList.add("needs-gesture");
        if (HOT) { HOT.muted = true; HOT.setAttribute("muted", ""); }
      }
    };
    ["pointerdown", "mousedown", "keydown", "touchstart", "touchend", "click"].forEach(function (t) {
      document.addEventListener(t, arm, true);
    });
    if (!ARMED) document.documentElement.classList.add("needs-gesture");
  })();

  /* Method names carry a dagger meaning "our re-run". It reads as a footnote
     marker only when it is set as one, so every place that prints a name uses
     this instead of textContent. Names come from our own data, but the escape
     keeps this safe if that ever stops being true. */
  function dagHTML(s) {
    return String(s)
      .replace(/[&<>"]/g, function (ch) {
        return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[ch];
      })
      .replace(/\u2020/g, '<sup class="dag">\u2020</sup>');
  }

  function hoverPlay(host, src, onState) {
    var v = null, live = false;
    function enter() {
      live = true;
      if (!v) {
        v = video(src);
        v.loop = true;
        v.addEventListener("playing", function () { if (live) onState(true); });
        v.addEventListener("error", function () { onState(false); });
        host.insertBefore(v, host.firstChild);
      }
      /* every time, not just at creation: a refused attempt leaves muted true */
      /* Exactly one clip is ever audible: whichever the pointer is on. Leaving
         a cell pauses it, which would silence it anyway, but muting the last
         audible one here makes that a guarantee rather than a side effect of
         how fast the pointer moved. */
      if (AUDIBLE && AUDIBLE !== v) {
        try { AUDIBLE.muted = true; AUDIBLE.setAttribute("muted", ""); } catch (e) {}
      }
      v.volume = 1;
      v.muted = !ARMED;
      if (ARMED) { v.removeAttribute("muted"); AUDIBLE = v; } else v.setAttribute("muted", "");
      HOT = v;
      if (!v.src) v.src = v.dataset.src;
      var p = v.play();
      if (p && p.catch) {
        p.catch(function (err) {
          /* Only the autoplay policy justifies giving up the sound. The usual
             rejection here is AbortError -- play() interrupted by the load that
             the src assignment just started -- and muting for that silenced
             clips the browser would happily have played aloud. */
          if (err && err.name && err.name !== "NotAllowedError") {
            var again = v.play();
            if (again && again.catch) again.catch(function () { onState(false); });
            return;
          }
          v.muted = true; v.setAttribute("muted", "");
          var q = v.play(); if (q && q.catch) q.catch(function () { onState(false); });
        });
      }
    }
    function leave() {
      live = false;
      onState(false);
      if (v === HOT) HOT = null;
      if (v === AUDIBLE) AUDIBLE = null;
      if (v) {
        try { v.muted = true; v.setAttribute("muted", ""); v.pause(); v.currentTime = 0; } catch (e) {}
      }
    }
    host.addEventListener("pointerenter", enter);
    host.addEventListener("pointerleave", leave);
    host.addEventListener("focus", enter);
    host.addEventListener("blur", leave);
    return { enter: enter, leave: leave };
  }

  function cell(it, _wide, sub) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "cell";
    b.style.aspectRatio = "16 / 9";
    b.setAttribute("aria-label", "Play " + it.title);
    var ph = document.createElement("img");
    ph.className = "ph"; ph.src = it.poster; ph.alt = ""; ph.loading = "lazy"; ph.decoding = "async";
    var veil = document.createElement("div"); veil.className = "veil";
    var cap = document.createElement("div"); cap.className = "cap";
    cap.innerHTML = "<span></span><em></em>";
    cap.querySelector("span").textContent = it.title;
    cap.querySelector("em").textContent = it.kind;
    b.appendChild(ph); b.appendChild(veil); b.appendChild(cap);
    hoverPlay(b, it.src, function (on) { b.classList.toggle("playing", on); });
    b.addEventListener("click", function () {
      openLightbox({ title: it.title, sub: sub || "MiniMax-H3-33B distilled with PDMD, 4 NFE -- " + it.kind,
                     prompt: it.prompt, src: it.src });
    });
    return b;
  }

  /* ---------- the wipe ---------- */
  function wipe(it) {
    var root = document.createElement("div");
    root.className = "wipe";
    root.style.aspectRatio = it.w + " / " + it.h;
    var a = video(it.left.src, true), b = video(it.right.src, true);
    b.className = "side-b";
    var ph = document.createElement("img");
    ph.className = "ph"; ph.src = it.poster; ph.alt = ""; ph.loading = "lazy";
    var bar = document.createElement("div"); bar.className = "bar";
    var ll = document.createElement("div"); ll.className = "lbl l";
    ll.innerHTML = "<b></b><span></span>";
    ll.querySelector("b").textContent = it.left.name;
    ll.querySelector("span").textContent = it.left.note;
    var lr = document.createElement("div"); lr.className = "lbl r";
    lr.innerHTML = "<b></b><span></span>";
    lr.querySelector("b").textContent = it.right.name;
    lr.querySelector("span").textContent = it.right.note;
    root.appendChild(a); root.appendChild(b); root.appendChild(ph);
    root.appendChild(bar); root.appendChild(ll); root.appendChild(lr);

    var pos = 0.5, dragging = false;
    function set(x) {
      pos = Math.max(0.02, Math.min(0.98, x));
      b.style.clipPath = "inset(0 0 0 " + (pos * 100).toFixed(2) + "%)";
      bar.style.left = (pos * 100).toFixed(2) + "%";
    }
    function fromEvent(e) {
      var r = root.getBoundingClientRect();
      var cx = (e.touches && e.touches[0] ? e.touches[0].clientX : e.clientX);
      set((cx - r.left) / r.width);
    }
    root.addEventListener("pointerdown", function (e) { dragging = true; root.setPointerCapture(e.pointerId); fromEvent(e); });
    root.addEventListener("pointermove", function (e) { if (dragging) fromEvent(e); });
    root.addEventListener("pointerup", function () { dragging = false; });
    root.addEventListener("pointercancel", function () { dragging = false; });
    set(0.5);

    /* keep the two clips on the same frame */
    function sync() { if (Math.abs(a.currentTime - b.currentTime) > 0.08) { try { b.currentTime = a.currentTime; } catch (e) {} } }
    a.addEventListener("timeupdate", sync);

    observe(a); observe(b);
    return root;
  }

  window.PDMDUI = { video: video, observe: observe, arm: arm, openLightbox: openLightbox,
                    cell: cell, hoverPlay: hoverPlay, dagHTML: dagHTML,
                    isArmed: function () { return ARMED; },
                    soloAudio: function (v) { return window.PDMDSolo(v); } };
})();
