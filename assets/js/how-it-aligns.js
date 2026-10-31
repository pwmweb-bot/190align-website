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

  var steps = ["arc", "waves", "milestones", "tasks", "up"];
  var holds = { arc: 3400, waves: 3400, milestones: 3400, tasks: 3800, up: 5600 };
  var heroTree = document.getElementById("hero-tree");
  var caption = document.getElementById("hero-caption");
  var tabs = Array.prototype.slice.call(document.querySelectorAll("[role='tab'][data-step]"));
  var pauseBtn = document.getElementById("hero-pause");
  var timer = 0;
  var playing = false;
  var wantPlay = !reduceQuery.matches;
  var userPaused = false;

  function showStep(step) {
    if (heroTree) heroTree.setAttribute("data-step", step);
    tabs.forEach(function (tab) {
      var on = tab.getAttribute("data-step") === step;
      tab.setAttribute("aria-selected", on ? "true" : "false");
      tab.tabIndex = on ? 0 : -1;
      if (on && caption) {
        caption.textContent = tab.getAttribute("data-caption") || "";
        caption.setAttribute("aria-labelledby", tab.id);
      }
    });
  }

  function haltTimer() {
    playing = false;
    window.clearTimeout(timer);
  }

  function stop() {
    wantPlay = false;
    userPaused = true;
    haltTimer();
    if (pauseBtn) {
      pauseBtn.setAttribute("aria-pressed", "true");
      pauseBtn.textContent = "Play";
    }
  }

  function queue(step) {
    window.clearTimeout(timer);
    if (!playing) return;
    timer = window.setTimeout(function () {
      var index = steps.indexOf(step);
      var next = steps[(index + 1) % steps.length];
      showStep(next);
      queue(next);
    }, holds[step] || 3600);
  }

  function play(fromStep) {
    if (reduceQuery.matches) {
      wantPlay = false;
      haltTimer();
      showStep("up");
      if (pauseBtn) pauseBtn.hidden = true;
      return;
    }
    wantPlay = true;
    userPaused = false;
    playing = true;
    if (pauseBtn) {
      pauseBtn.hidden = false;
      pauseBtn.setAttribute("aria-pressed", "false");
      pauseBtn.textContent = "Pause";
    }
    var current = fromStep || (heroTree && heroTree.getAttribute("data-step")) || "arc";
    showStep(current);
    queue(current);
  }

  tabs.forEach(function (tab, index) {
    tab.addEventListener("click", function () {
      userPaused = true;
      stop();
      showStep(tab.getAttribute("data-step"));
    });
    tab.addEventListener("keydown", function (event) {
      var nextIndex = index;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = (index + 1) % tabs.length;
      else if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = (index - 1 + tabs.length) % tabs.length;
      else if (event.key === "Home") nextIndex = 0;
      else if (event.key === "End") nextIndex = tabs.length - 1;
      else return;
      event.preventDefault();
      userPaused = true;
      stop();
      showStep(tabs[nextIndex].getAttribute("data-step"));
      tabs[nextIndex].focus();
    });
  });

  if (pauseBtn) {
    pauseBtn.addEventListener("click", function () {
      if (playing) {
        userPaused = true;
        stop();
      } else {
        var current = (heroTree && heroTree.getAttribute("data-step")) || "arc";
        play(current);
      }
    });
  }

  var heroVisual = document.querySelector(".hero-visual");
  if (heroVisual && "IntersectionObserver" in window) {
    var heroWatch = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && wantPlay && !reduceQuery.matches) {
          if (!playing) play((heroTree && heroTree.getAttribute("data-step")) || "arc");
        } else if (!entry.isIntersecting) {
          haltTimer();
        }
      });
    }, { threshold: 0.2 });
    heroWatch.observe(heroVisual);
  } else if (wantPlay) {
    play("arc");
  }

  if (reduceQuery.matches) {
    showStep("up");
    if (pauseBtn) pauseBtn.hidden = true;
  }

  var storyTree = document.getElementById("story-tree");
  var storySteps = Array.prototype.slice.call(document.querySelectorAll(".story-step"));
  if (storyTree && storySteps.length) {
    var frame = 0;
    function updateStory() {
      frame = 0;
      var marker = window.innerWidth < 880 ? window.innerHeight * 0.72 : window.innerHeight * 0.42;
      var current = storySteps[0];
      storySteps.forEach(function (step) {
        if (step.getBoundingClientRect().top < marker) current = step;
      });
      var stepName = current.getAttribute("data-step");
      if (stepName && storyTree.getAttribute("data-step") !== stepName) {
        storyTree.setAttribute("data-step", stepName);
      }
    }
    window.addEventListener("scroll", function () {
      if (!frame) frame = window.requestAnimationFrame(updateStory);
    }, { passive: true });
    window.addEventListener("resize", updateStory);
    updateStory();
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
