(function () {
  var reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  var root = document.documentElement;

  function syncMotion() {
    root.classList.toggle("reduce-motion", reduceQuery.matches);
  }
  syncMotion();
  if (reduceQuery.addEventListener) reduceQuery.addEventListener("change", syncMotion);

  var year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  var header = document.querySelector(".site-header");
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("site-nav");

  function setMenu(open) {
    if (!toggle || !nav) return;
    nav.setAttribute("data-open", open ? "true" : "false");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    toggle.textContent = open ? "Close" : "Menu";
  }

  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      setMenu(nav.getAttribute("data-open") !== "true");
    });
    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () { setMenu(false); });
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") setMenu(false);
    });
  }

  var stage = document.getElementById("stage");
  var run = document.getElementById("snap-run");
  var board = document.getElementById("board");
  var stageWrap = document.querySelector(".board-stage");
  var caption = document.getElementById("scene-caption");
  var beforeFaces = stage ? stage.querySelectorAll(".face.before") : [];
  var afterFaces = stage ? stage.querySelectorAll(".face.after") : [];
  var lastCaption = caption ? caption.textContent : "";
  var lastAfter = null;
  var frame = 0;
  var listening = false;

  function reduced() {
    return reduceQuery.matches || root.classList.contains("reduce-motion");
  }

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  function ease(t) {
    if (t <= 0.16) return 0;
    if (t >= 0.78) return 1;
    var u = (t - 0.16) / 0.62;
    return u * u * (3 - 2 * u);
  }

  function captionFor(p) {
    if (p < 0.08) return "Before. The work is scattered, and the wires are crossed.";
    if (p < 0.92) return "They adopt 1:90 Align. The same work draws into one line.";
    return "After. One Arc, three Waves, this week, and today.";
  }

  function setFaces(showAfter) {
    beforeFaces.forEach(function (el) {
      el.setAttribute("aria-hidden", showAfter ? "true" : "false");
    });
    afterFaces.forEach(function (el) {
      el.setAttribute("aria-hidden", showAfter ? "false" : "true");
    });
  }

  function update() {
    frame = 0;
    if (!stage || !run || reduced()) return;
    var rect = run.getBoundingClientRect();
    var start = window.innerHeight * 0.62;
    var distance = Math.max(rect.height - window.innerHeight * 0.28, 1);
    var raw = (start - rect.top) / distance;
    var p = ease(clamp(raw, 0, 1));
    stage.style.setProperty("--p", p.toFixed(3));

    var nextCaption = captionFor(p);
    if (caption && nextCaption !== lastCaption) {
      lastCaption = nextCaption;
      caption.textContent = nextCaption;
    }

    var showAfter = p >= 0.55;
    if (showAfter !== lastAfter) {
      lastAfter = showAfter;
      setFaces(showAfter);
      stage.classList.toggle("is-after", showAfter);
    }

    if (stageWrap && window.innerWidth < 960 && board) {
      var boardTop = board.getBoundingClientRect().top;
      var runBottom = rect.bottom;
      var pin = boardTop <= 80 && runBottom > 140;
      stageWrap.setAttribute("data-pin", pin ? "true" : "false");
    } else if (stageWrap) {
      stageWrap.removeAttribute("data-pin");
    }
  }

  function startMotion() {
    if (!stage || !run || reduced()) {
      if (stage) stage.style.setProperty("--p", "0");
      if (stageWrap) stageWrap.removeAttribute("data-pin");
      if (caption) {
        caption.textContent = "Before and after, held still. Each row is a scattered piece of work, and the name it takes in 1:90 Align.";
      }
      beforeFaces.forEach(function (el) { el.removeAttribute("aria-hidden"); });
      afterFaces.forEach(function (el) { el.removeAttribute("aria-hidden"); });
      return;
    }
    setFaces(false);
    if (!listening) {
      listening = true;
      window.addEventListener("scroll", function () {
        if (!frame) frame = window.requestAnimationFrame(update);
      }, { passive: true });
      window.addEventListener("resize", update);
    }
    update();
  }

  startMotion();
  if (reduceQuery.addEventListener) {
    reduceQuery.addEventListener("change", startMotion);
  }

  var form = document.getElementById("guide-form");
  var success = document.getElementById("guide-success");
  var errorBox = document.getElementById("guide-error");
  if (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var button = form.querySelector("[type='submit']");
      var honeypot = form.querySelector("[name='_gotcha']");
      if (honeypot && honeypot.value) return;
      if (errorBox) {
        errorBox.classList.remove("show");
        errorBox.textContent = "";
      }
      var original = button ? button.textContent : "";
      if (button) {
        button.disabled = true;
        button.textContent = "Sending…";
      }
      fetch(form.action, {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" }
      }).then(function (response) {
        var type = response.headers.get("content-type") || "";
        if (!response.ok || type.indexOf("application/json") === -1) throw new Error("Request failed");
        form.hidden = true;
        if (success) success.classList.add("show");
      }).catch(function () {
        if (errorBox) {
          errorBox.textContent = "We couldn’t send that. Email contact@190align.com and we’ll send the guide.";
          errorBox.classList.add("show");
        }
        if (button) {
          button.disabled = false;
          button.textContent = original;
        }
      });
    });
  }

  if (header) {
    var onScroll = function () {
      header.style.boxShadow = window.scrollY > 8 ? "0 8px 24px rgba(23,37,84,.08)" : "none";
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }
})();
