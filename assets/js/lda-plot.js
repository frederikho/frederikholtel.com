// Interactive LDA plot: a dependency-free port of the Observable notebook
// https://observablehq.com/@frederikho/interactive-lda-plot
// (c) Frederik Holtel, CC BY-SA 4.0.
//
// Usage: <div class="lda-plot" id="lda"></div> + this script (defer).
// Two classes (0 = red, 1 = blue) are drawn from normal populations whose
// parameters are set with the sliders. The solid line is the LDA boundary
// estimated from the points on the plot; the dashed line is the Bayes
// boundary computed from the population parameters.
(function () {
  "use strict";

  var root = document.getElementById("lda");
  if (!root) return;

  var NS = "http://www.w3.org/2000/svg";
  var W = 600, H = 600, R = 7;
  var M = 30, INSET = R * 2;
  var X0 = M + INSET, X1 = W - M - INSET; // pixel range for x = 0..20
  var Y0 = H - M - INSET, Y1 = M + INSET; // pixel range for y = 0..20
  var DMAX = 20;
  var COLORS = ["#fb8072", "#80b1d3"]; // red, blue (d3 schemeSet3)
  var VAR_FILL = ["#fb8072", "#d9d9d9"];

  var PARAMS = [
    { key: "xMean", label: "μ<sub>x</sub>", min: 0, max: 20, step: 1 },
    { key: "yMean", label: "μ<sub>y</sub>", min: 0, max: 20, step: 1 },
    { key: "xVar", label: "σ²<sub>x</sub>", min: 0.1, max: 13, step: 0.1 },
    { key: "yVar", label: "σ²<sub>y</sub>", min: 0.1, max: 15, step: 0.1 },
    { key: "n", label: "n", min: 1, max: 100, step: 1 }
  ];
  var DEFAULTS = [
    { xMean: 4, yMean: 10, xVar: 3.4, yVar: 1, n: 15 },
    { xMean: 8, yMean: 12, xVar: 2.5, yVar: 6.3, n: 40 }
  ];

  var sx = function (x) { return X0 + (x / DMAX) * (X1 - X0); };
  var sy = function (y) { return Y0 + (y / DMAX) * (Y1 - Y0); };
  var ix = function (px) { return ((px - X0) / (X1 - X0)) * DMAX; };
  var iy = function (py) { return ((py - Y0) / (Y1 - Y0)) * DMAX; };

  var params = clone(DEFAULTS); // population used for the current sample
  var data = [];
  var nextId = 0;
  var addType = 0;
  var showBayes = true;
  var timers = [];

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function el(name, attrs, parent) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function h(tag, attrs, html) {
    var e = document.createElement(tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (html != null) e.innerHTML = html;
    return e;
  }

  // ---------- statistics ----------
  function randn() { // Box-Muller
    var u = 1 - Math.random(), v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function sample(p) {
    var out = [];
    [0, 1].forEach(function (t) {
      for (var i = 0; i < p[t].n; i++) {
        out.push({
          x: p[t].xMean + Math.sqrt(p[t].xVar) * randn(),
          y: p[t].yMean + Math.sqrt(p[t].yVar) * randn(),
          type: t
        });
      }
    });
    return out;
  }

  function estimates(d) {
    var g = [[], []];
    d.forEach(function (p) { g[p.type].push(p); });
    var mean = function (a, k) { return a.reduce(function (s, p) { return s + p[k]; }, 0) / a.length; };
    var m = g.map(function (a) { return [mean(a, "x"), mean(a, "y")]; });
    var ss = function (a, mu, f) { return a.reduce(function (s, p) { return s + f(p, mu); }, 0); };
    var dx2 = function (p, mu) { return Math.pow(p.x - mu[0], 2); };
    var dy2 = function (p, mu) { return Math.pow(p.y - mu[1], 2); };
    var dxy = function (p, mu) { return (p.x - mu[0]) * (p.y - mu[1]); };
    var df = d.length - 2;
    var sxx = (ss(g[0], m[0], dx2) + ss(g[1], m[1], dx2)) / df;
    var syy = (ss(g[0], m[0], dy2) + ss(g[1], m[1], dy2)) / df;
    var sxy = (ss(g[0], m[0], dxy) + ss(g[1], m[1], dxy)) / df;
    return {
      count: [g[0].length, g[1].length],
      mean: m,
      // class-specific variances (for the "Variances" display)
      vars: g.map(function (a, t) {
        return [ss(a, m[t], dx2) / a.length, ss(a, m[t], dy2) / a.length];
      }),
      cov: [[sxx, sxy], [sxy, syy]]
    };
  }

  // Boundary x2 = b0 + b1 * x1 where the LDA discriminants of both classes are equal.
  function boundary(mu0, mu1, S, p0, p1) {
    var det = S[0][0] * S[1][1] - S[0][1] * S[1][0];
    if (!isFinite(det) || Math.abs(det) < 1e-12 || !(p0 > 0) || !(p1 > 0)) return null;
    var inv = [[S[1][1] / det, -S[0][1] / det], [-S[1][0] / det, S[0][0] / det]];
    var mv = function (v) { return [inv[0][0] * v[0] + inv[0][1] * v[1], inv[1][0] * v[0] + inv[1][1] * v[1]]; };
    var v0 = mv(mu0), v1 = mv(mu1);
    var z0 = -0.5 * (mu0[0] * v0[0] + mu0[1] * v0[1]);
    var z1 = -0.5 * (mu1[0] * v1[0] + mu1[1] * v1[1]);
    var den = v0[1] - v1[1];
    if (Math.abs(den) < 1e-12) return null;
    var b0 = (z1 - z0 + Math.log(p1) - Math.log(p0)) / den;
    var b1 = (v1[0] - v0[0]) / den;
    return isFinite(b0) && isFinite(b1) ? [b0, b1] : null;
  }

  function estimatedBoundary() {
    var e = estimates(data);
    if (e.count[0] < 1 || e.count[1] < 1 || data.length < 3) return null;
    return boundary(e.mean[0], e.mean[1], e.cov, e.count[0] / data.length, e.count[1] / data.length);
  }

  function bayesBoundary() {
    var n = params[0].n + params[1].n;
    var p0 = params[0].n / n, p1 = params[1].n / n;
    var S = [
      [params[0].xVar * p0 + params[1].xVar * p1, 0],
      [0, params[0].yVar * p0 + params[1].yVar * p1]
    ];
    return boundary([params[0].xMean, params[0].yMean], [params[1].xMean, params[1].yMean], S, p0, p1);
  }

  // ---------- DOM ----------
  root.innerHTML = "";

  var top = h("div", { class: "lda-controls" });
  var removeBtn = h("button", { type: "button" }, "Remove all");
  var addGroup = h("fieldset", {}, "<legend>Add data point</legend>");
  ["Red", "Blue"].forEach(function (name, t) {
    var lab = h("label", {});
    var r = h("input", { type: "radio", name: "lda-add", value: String(t) });
    if (t === 0) r.checked = true;
    r.addEventListener("change", function () { addType = t; });
    lab.appendChild(r);
    lab.appendChild(document.createTextNode(" " + name));
    addGroup.appendChild(lab);
  });
  var showGroup = h("fieldset", {}, "<legend>Show estimates</legend>");
  var showMeans = h("input", { type: "checkbox" });
  var showVars = h("input", { type: "checkbox" });
  [["Means", showMeans], ["Variances", showVars]].forEach(function (p) {
    var lab = h("label", {});
    lab.appendChild(p[1]);
    lab.appendChild(document.createTextNode(" " + p[0]));
    showGroup.appendChild(lab);
  });
  top.appendChild(removeBtn);
  top.appendChild(addGroup);
  top.appendChild(showGroup);
  root.appendChild(top);

  var svg = el("svg", {
    viewBox: "0 0 " + W + " " + H,
    role: "img",
    "aria-label": "Interactive scatter plot of red and blue points with the estimated LDA boundary and the Bayes boundary"
  });
  root.appendChild(svg);

  var defs = el("defs", {}, svg);
  var clip = el("clipPath", { id: "lda-clip" }, defs);
  el("rect", { x: M, y: M, width: W - 2 * M, height: H - 2 * M }, clip);

  // grid + axes
  var axes = el("g", { class: "lda-axes" }, svg);
  for (var v = 0; v <= DMAX; v += 2) {
    el("line", { x1: sx(v), x2: sx(v), y1: M, y2: H - M, class: v === 0 ? "axis" : "grid" }, axes);
    el("line", { x1: M, x2: W - M, y1: sy(v), y2: sy(v), class: v === 0 ? "axis" : "grid" }, axes);
    el("text", { x: sx(v), y: H - M + 18, "text-anchor": "middle" }, axes).textContent = v;
    el("text", { x: M - 8, y: sy(v) + 4, "text-anchor": "end" }, axes).textContent = v;
  }

  var varG = el("g", { display: "none", "clip-path": "url(#lda-clip)" }, svg);
  var meanG = el("g", { display: "none", "clip-path": "url(#lda-clip)" }, svg);
  var lines = el("g", { "clip-path": "url(#lda-clip)" }, svg);
  var estLine = el("line", { class: "lda-est" }, lines);
  var bayesLine = el("line", { class: "lda-bayes" }, lines);

  // legend
  var leg = el("g", { class: "lda-legend", transform: "translate(" + (W - 150) + ",40)" }, svg);
  el("line", { x1: 0, x2: 22, y1: 0, y2: 0, class: "lda-est" }, leg);
  el("text", { x: 28, y: 4 }, leg).textContent = "Estimated boundary";
  el("line", { x1: 0, x2: 22, y1: 20, y2: 20, class: "lda-bayes" }, leg);
  el("text", { x: 28, y: 24 }, leg).textContent = "Bayes boundary";

  var hit = el("rect", { x: 0, y: 0, width: W, height: H, fill: "transparent", class: "lda-hit" }, svg);
  var pointsG = el("g", {}, svg);

  // sliders
  var form = h("form", { class: "lda-params" });
  form.appendChild(h("p", { class: "lda-params-title" }, "Population parameters"));
  var grid = h("div", { class: "lda-grid" });
  var inputs = [{}, {}];
  [0, 1].forEach(function (t) {
    grid.appendChild(h("span", { class: "lda-row-label lda-c" + t }, t === 0 ? "Red" : "Blue"));
    PARAMS.forEach(function (p) {
      var cell = h("label", { class: "lda-cell" });
      var name = h("span", { class: "lda-name lda-c" + t }, p.label);
      var out = h("output", {});
      var inp = h("input", { type: "range", min: p.min, max: p.max, step: p.step });
      inp.value = DEFAULTS[t][p.key];
      out.textContent = inp.value;
      inp.addEventListener("input", function () { out.textContent = inp.value; });
      inputs[t][p.key] = { input: inp, out: out };
      cell.appendChild(name);
      cell.appendChild(out);
      cell.appendChild(inp);
      grid.appendChild(cell);
    });
  });
  form.appendChild(grid);
  var btns = h("div", { class: "lda-buttons" });
  var genBtn = h("button", { type: "submit" }, "▶ Generate new samples");
  var resetBtn = h("button", { type: "button" }, "↺ Reset parameters");
  btns.appendChild(genBtn);
  btns.appendChild(resetBtn);
  form.appendChild(btns);
  root.appendChild(form);

  // ---------- rendering ----------
  function setLine(node, b) {
    if (!b) { node.setAttribute("display", "none"); return; }
    node.setAttribute("display", "block");
    node.setAttribute("x1", sx(0));
    node.setAttribute("y1", sy(b[0]));
    node.setAttribute("x2", sx(DMAX));
    node.setAttribute("y2", sy(b[0] + DMAX * b[1]));
  }

  function render() {
    // points
    var existing = {};
    Array.prototype.forEach.call(pointsG.childNodes, function (c) { existing[c.getAttribute("data-id")] = c; });
    data.forEach(function (d) {
      var c = existing[d.id];
      if (!c) {
        c = el("circle", { r: R, fill: COLORS[d.type], class: "lda-pt", "data-id": d.id }, pointsG);
        attachDrag(c, d);
      }
      delete existing[d.id];
      c.setAttribute("cx", sx(d.x));
      c.setAttribute("cy", sy(d.y));
    });
    for (var k in existing) pointsG.removeChild(existing[k]);

    setLine(estLine, estimatedBoundary());
    setLine(bayesLine, showBayes ? bayesBoundary() : null);

    var e = estimates(data);
    // means
    meanG.innerHTML = "";
    varG.innerHTML = "";
    [0, 1].forEach(function (t) {
      if (!e.count[t]) return;
      var mx = e.mean[t][0], my = e.mean[t][1];
      el("line", { x1: sx(mx), x2: sx(mx), y1: sy(0), y2: sy(DMAX), stroke: COLORS[t], class: "lda-mean" }, meanG);
      el("line", { x1: sx(0), x2: sx(DMAX), y1: sy(my), y2: sy(my), stroke: COLORS[t], class: "lda-mean" }, meanG);
      var vx = Math.abs(e.vars[t][0]), vy = Math.abs(e.vars[t][1]);
      el("rect", { x: sx(mx - vx), y: 0, width: sx(2 * vx) - sx(0), height: H, fill: VAR_FILL[t], opacity: 0.29 }, varG);
      el("rect", { x: 0, y: sy(my + vy), width: W, height: sy(0) - sy(2 * vy), fill: VAR_FILL[t], opacity: 0.29 }, varG);
    });
  }

  function toSvg(evt) {
    var pt = svg.createSVGPoint();
    pt.x = evt.clientX; pt.y = evt.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  }

  function attachDrag(c, d) {
    // Browsers ignore CSS touch-action on SVG shapes: stop the page from
    // scrolling when a finger starts on a point, so it can be dragged.
    c.addEventListener("touchstart", function (e) { e.preventDefault(); }, { passive: false });
    c.addEventListener("pointerdown", function (evt) {
      if (evt.button !== 0) return;
      evt.preventDefault();
      evt.stopPropagation();
      // Raise the point first: moving the node in the DOM later would cancel
      // the drag. Listen on window so fast moves don't lose the point.
      pointsG.appendChild(c);
      c.classList.add("dragging");
      var start = toSvg(evt);
      var offX = d.x - ix(start.x), offY = d.y - iy(start.y); // no jump on grab
      var moved = false;
      var pending = null;
      function move(ev) {
        var p = toSvg(ev);
        if (!moved && Math.abs(p.x - start.x) + Math.abs(p.y - start.y) < 3) return;
        moved = true;
        d.x = Math.max(0, Math.min(DMAX, ix(p.x) + offX));
        d.y = Math.max(0, Math.min(DMAX, iy(p.y) + offY));
        c.setAttribute("cx", sx(d.x));
        c.setAttribute("cy", sy(d.y));
        showBayes = false;
        if (!pending) pending = requestAnimationFrame(function () { pending = null; render(); });
      }
      function up() {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", up);
        c.classList.remove("dragging");
        if (!moved) { // a click without moving removes the point
          data = data.filter(function (p) { return p !== d; });
          showBayes = false;
        }
        render();
      }
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", up);
    });
  }

  hit.addEventListener("click", function (evt) {
    var p = toSvg(evt);
    data.push({ x: ix(p.x), y: iy(p.y), type: addType, id: nextId++ });
    showBayes = false;
    render();
  });

  removeBtn.addEventListener("click", function () {
    stopAnimation();
    data = [];
    showBayes = false;
    render();
  });

  showMeans.addEventListener("change", function () { meanG.setAttribute("display", showMeans.checked ? "block" : "none"); });
  showVars.addEventListener("change", function () { varG.setAttribute("display", showVars.checked ? "block" : "none"); });

  function readParams() {
    return [0, 1].map(function (t) {
      var o = {};
      PARAMS.forEach(function (p) { o[p.key] = parseFloat(inputs[t][p.key].input.value); });
      return o;
    });
  }

  function stopAnimation() {
    timers.forEach(clearTimeout);
    timers = [];
  }

  // Points appear one by one over three seconds, as in the original.
  function generate() {
    stopAnimation();
    params = readParams();
    data = [];
    showBayes = true;
    render();
    var s = sample(params);
    // shuffle so both colours appear together
    for (var i = s.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = s[i]; s[i] = s[j]; s[j] = tmp;
    }
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    s.forEach(function (p, k) {
      p.id = nextId++;
      if (reduce) { data.push(p); return; }
      timers.push(setTimeout(function () { data.push(p); render(); }, 3000 * k / s.length));
    });
    if (reduce) render();
  }

  form.addEventListener("submit", function (evt) { evt.preventDefault(); generate(); });
  resetBtn.addEventListener("click", function () {
    [0, 1].forEach(function (t) {
      PARAMS.forEach(function (p) {
        inputs[t][p.key].input.value = DEFAULTS[t][p.key];
        inputs[t][p.key].out.textContent = DEFAULTS[t][p.key];
      });
    });
  });

  // Start the animation when the plot scrolls into view.
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) { io.disconnect(); generate(); }
    }, { threshold: 0.3 });
    io.observe(svg);
  } else {
    generate();
  }
})();
