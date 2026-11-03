/* Publications page: list <-> graph view, chronological <-> grouped-by-type
   sorting, BibTeX toggle & copy. */
(function () {
  'use strict';

  var list = document.getElementById('pub-list');
  if (!list) return;
  var card = list.closest('.card') || document;

  var items = Array.prototype.slice.call(list.querySelectorAll('.pub-item'));
  var byYearDesc = function (a, b) {
    return (b.dataset.year | 0) - (a.dataset.year | 0);
  };

  var GROUPS = [
    { type: 'journal', label: 'Journal articles' },
    { type: 'conference', label: 'Conference papers' },
    { type: 'thesis', label: 'Thesis' }
  ];

  function clear() {
    while (list.firstChild) list.removeChild(list.firstChild);
  }

  function renderChronological() {
    clear();
    items.slice().sort(byYearDesc).forEach(function (el) {
      list.appendChild(el);
    });
  }

  function renderByType() {
    clear();
    GROUPS.forEach(function (g) {
      var group = items.filter(function (el) {
        return el.dataset.type === g.type;
      });
      if (!group.length) return;
      var h = document.createElement('h3');
      h.className = 'pub-group-title';
      h.textContent = g.label;
      list.appendChild(h);
      group.sort(byYearDesc).forEach(function (el) {
        list.appendChild(el);
      });
    });
  }

  var buttons = document.querySelectorAll('[data-sort]');
  function setMode(mode) {
    buttons.forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.sort === mode));
    });
    if (mode === 'type') renderByType();
    else renderChronological();
    try {
      localStorage.setItem('pubSort', mode);
    } catch (e) {}
  }

  buttons.forEach(function (b) {
    b.addEventListener('click', function () {
      setMode(b.dataset.sort);
    });
  });

  var saved = 'chrono';
  try {
    saved = localStorage.getItem('pubSort') || 'chrono';
  } catch (e) {}
  setMode(saved);

  /* ---- List <-> graph view ---- */
  var graphBox = document.getElementById('pub-graph');
  var sortControls = document.querySelector('[data-sort-controls]');
  var viewButtons = document.querySelectorAll('[data-view]');
  var graph = null;

  function setView(view) {
    if (!graphBox) view = 'list';
    viewButtons.forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.view === view));
    });
    var isGraph = view === 'graph';
    list.hidden = isGraph;
    if (sortControls) sortControls.hidden = isGraph;
    if (graphBox) graphBox.hidden = !isGraph;
    if (isGraph) {
      if (!graph) graph = createGraph(graphBox, items);
      graph.layout();
    }
    try {
      localStorage.setItem('pubView', view);
    } catch (e) {}
  }

  viewButtons.forEach(function (b) {
    b.addEventListener('click', function () {
      setView(b.dataset.view);
    });
  });

  /* ---- BibTeX show / hide + copy (list and graph detail panel) ---- */
  card.addEventListener('click', function (e) {
    var toggle = e.target.closest('[data-bibtex-toggle]');
    if (toggle) {
      var box = toggle.closest('.pub-item').querySelector('.pub-bibtex');
      if (box) {
        box.hidden = !box.hidden;
        toggle.setAttribute('aria-expanded', String(!box.hidden));
      }
      return;
    }

    var copy = e.target.closest('[data-bibtex-copy]');
    if (copy) {
      var pre = copy.closest('.pub-bibtex').querySelector('pre');
      var text = pre ? pre.textContent : '';
      var done = function () {
        var original = copy.textContent;
        copy.textContent = 'Copied';
        setTimeout(function () {
          copy.textContent = original;
        }, 1500);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, done);
      } else {
        var ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        try {
          document.execCommand('copy');
        } catch (err) {}
        document.body.removeChild(ta);
        done();
      }
    }
  });

  /* ======================================================================
     Graph view.
     Papers sit on a timeline (by year) and connect to the research topics
     they address; arrows show papers that build on earlier ones.
     Data comes from the articles' data-* attributes:
       data-id, data-short, data-topics, data-builds-on, data-companion.
     ====================================================================== */
  var TOPICS = {
    despeckling: 'Despeckling',
    fusion: 'SAR–optical fusion',
    selfsup: 'Self-supervised learning',
    insar: 'Interferometry (InSAR)',
    complex: 'Complex-valued SAR',
    segmentation: 'Ship segmentation',
    polsar: 'Polarimetry',
    translation: 'Image-to-image translation'
  };
  var TYPE_LABEL = { journal: 'Journal', conference: 'Conference', thesis: 'Thesis' };
  var SVG_NS = 'http://www.w3.org/2000/svg';

  function svgEl(name, attrs, parent) {
    var el = document.createElementNS(SVG_NS, name);
    for (var k in attrs) el.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(el);
    return el;
  }

  function words(s) {
    return (s || '').split(/\s+/).filter(Boolean);
  }

  /* Small deterministic PRNG so the layout is the same on every visit. */
  function rng(seed) {
    return function () {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
  }

  function createGraph(root, articles) {
    var nodes = [];
    var byId = {};
    var edges = [];

    articles.forEach(function (el) {
      var titleEl = el.querySelector('.pub-title');
      var n = {
        id: el.dataset.id,
        kind: 'paper',
        type: el.dataset.type,
        year: el.dataset.year | 0,
        label: el.dataset.short || el.dataset.year,
        title: titleEl ? titleEl.textContent.trim() : '',
        article: el
      };
      if (!n.id) return;
      nodes.push(n);
      byId[n.id] = n;
    });

    Object.keys(TOPICS).forEach(function (key) {
      var n = { id: 't:' + key, kind: 'topic', label: TOPICS[key], papers: [] };
      nodes.push(n);
      byId[n.id] = n;
    });

    nodes.forEach(function (n) {
      if (n.kind !== 'paper') return;
      var d = n.article.dataset;
      words(d.topics).forEach(function (t) {
        var topic = byId['t:' + t];
        if (!topic) return;
        topic.papers.push(n);
        edges.push({ s: n, t: topic, kind: 'topic' });
      });
      words(d.buildsOn).forEach(function (id) {
        if (byId[id]) edges.push({ s: byId[id], t: n, kind: 'builds' });
      });
      words(d.companion).forEach(function (id) {
        if (byId[id]) edges.push({ s: n, t: byId[id], kind: 'companion' });
      });
    });

    nodes = nodes.filter(function (n) {
      return n.kind === 'paper' || n.papers.length;
    });
    nodes.forEach(function (n) {
      n.adj = {};
      n.adj[n.id] = true;
    });
    edges.forEach(function (e) {
      e.s.adj[e.t.id] = true;
      e.t.adj[e.s.id] = true;
    });

    var years = nodes
      .filter(function (n) {
        return n.kind === 'paper';
      })
      .map(function (n) {
        return n.year;
      })
      .filter(function (y, i, a) {
        return a.indexOf(y) === i;
      })
      .sort();

    /* ---- DOM ---- */
    root.innerHTML = '';
    var hint = document.createElement('p');
    hint.className = 'pg-hint';
    hint.textContent = 'Hover to trace connections · click a node for details · drag to rearrange';
    root.appendChild(hint);

    var stage = document.createElement('div');
    stage.className = 'pg-stage';
    root.appendChild(stage);

    var svg = svgEl('svg', {
      class: 'pg',
      role: 'group',
      'aria-label': 'Graph of publications connected by research topic'
    }, stage);
    var defs = svgEl('defs', {}, svg);
    var marker = svgEl('marker', {
      id: 'pg-arrow',
      class: 'pg-arrow',
      viewBox: '0 0 10 10',
      refX: '9',
      refY: '5',
      markerWidth: '7',
      markerHeight: '7',
      orient: 'auto-start-reverse'
    }, defs);
    svgEl('path', { d: 'M0 0L10 5L0 10z' }, marker);

    var gAxis = svgEl('g', { class: 'pg-axis', 'aria-hidden': 'true' }, svg);
    var gEdges = svgEl('g', { 'aria-hidden': 'true' }, svg);
    var gNodes = svgEl('g', {}, svg);

    var tip = document.createElement('div');
    tip.className = 'pg-tip';
    tip.hidden = true;
    stage.appendChild(tip);

    var legend = document.createElement('div');
    legend.className = 'pg-legend';
    legend.setAttribute('aria-hidden', 'true');
    legend.innerHTML =
      '<span><i class="pg-key pg-key--journal"></i>Journal</span>' +
      '<span><i class="pg-key pg-key--conference"></i>Conference</span>' +
      '<span><i class="pg-key pg-key--thesis"></i>Thesis</span>' +
      '<span><i class="pg-key pg-key--topic"></i>Topic</span>' +
      '<span><i class="pg-key pg-key--builds"></i>Builds on</span>' +
      '<span><i class="pg-key pg-key--companion"></i>Companion paper</span>';
    root.appendChild(legend);

    var detail = document.createElement('div');
    detail.className = 'pg-detail';
    detail.setAttribute('aria-live', 'polite');
    root.appendChild(detail);

    edges.forEach(function (e) {
      e.el = svgEl('path', {
        class: 'pg-edge pg-edge--' + e.kind,
        'marker-end': e.kind === 'builds' ? 'url(#pg-arrow)' : ''
      }, gEdges);
    });

    var R = 11; // paper dot radius
    nodes.forEach(function (n) {
      var g = svgEl('g', {
        class: 'pg-node pg-node--' + n.kind + (n.type ? ' pg-node--' + n.type : ''),
        tabindex: '0',
        role: 'button',
        'aria-label':
          n.kind === 'paper'
            ? TYPE_LABEL[n.type] + ', ' + n.year + ': ' + n.title
            : 'Topic: ' + n.label + ', ' + n.papers.length + ' paper' + (n.papers.length > 1 ? 's' : '')
      }, gNodes);
      n.el = g;
      if (n.kind === 'paper') {
        svgEl('circle', { class: 'pg-halo', r: R + 6 }, g);
        svgEl('circle', { class: 'pg-dot', r: R }, g);
        var t = svgEl('text', { class: 'pg-label', y: R + 16, 'text-anchor': 'middle' }, g);
        t.textContent = n.label;
        n.textEl = t;
      } else {
        n.rect = svgEl('rect', { class: 'pg-pill', height: 26, y: -13, rx: 13 }, g);
        var tt = svgEl('text', { class: 'pg-label pg-label--topic', y: 4.5, 'text-anchor': 'middle' }, g);
        tt.textContent = n.label;
        n.textEl = tt;
      }
    });

    /* ---- Sizes (measured once visible) ---- */
    var measured = false;
    function measure() {
      if (measured) return;
      nodes.forEach(function (n) {
        var w = 0;
        try {
          w = n.textEl.getComputedTextLength();
        } catch (e) {}
        if (!w) w = n.label.length * 7;
        if (n.kind === 'paper') {
          n.hw = Math.max(R + 4, w / 2 + 4);
          n.top = R + 4;
          n.bottom = R + 22;
        } else {
          var pw = w + 24;
          n.rect.setAttribute('width', pw);
          n.rect.setAttribute('x', -pw / 2);
          n.hw = pw / 2 + 4;
          n.top = 17;
          n.bottom = 17;
        }
      });
      measured = true;
    }

    /* ---- Layout: small force simulation with a year-anchored axis ---- */
    var W = 0;
    var H = 0;
    var vertical = false;
    var PAD = 28;

    function yearPos(y) {
      var i = years.indexOf(y);
      var start = vertical ? 60 : Math.min(130, W * 0.14);
      var span = vertical ? H - start - 140 : W - 2 * start;
      return years.length > 1 ? start + (i * span) / (years.length - 1) : start + span / 2;
    }

    function tick(alpha) {
      var i, j, a, b, dx, dy, d2, d, f;
      // Repulsion between all nodes.
      for (i = 0; i < nodes.length; i++) {
        for (j = i + 1; j < nodes.length; j++) {
          a = nodes[i];
          b = nodes[j];
          dx = b.x - a.x;
          dy = b.y - a.y;
          d2 = Math.max(dx * dx + dy * dy, 400);
          f = (1300 * alpha) / d2;
          a.vx -= dx * f;
          a.vy -= dy * f;
          b.vx += dx * f;
          b.vy += dy * f;
        }
      }
      // Springs along edges.
      edges.forEach(function (e) {
        var single = e.kind === 'topic' && e.t.papers.length === 1;
        var rest = e.kind === 'topic' ? (single ? 55 : 90) : 120;
        var k = e.kind === 'topic' ? (single ? 0.15 : 0.06) : 0.03;
        dx = e.t.x - e.s.x;
        dy = e.t.y - e.s.y;
        d = Math.sqrt(dx * dx + dy * dy) || 1;
        f = ((d - rest) / d) * k * alpha;
        e.s.vx += dx * f;
        e.s.vy += dy * f;
        e.t.vx -= dx * f;
        e.t.vy -= dy * f;
      });
      // Papers are pulled onto their year; everything drifts to the middle.
      nodes.forEach(function (n) {
        var target;
        if (n.kind === 'paper') target = yearPos(n.year);
        else {
          target = 0;
          n.papers.forEach(function (p) {
            target += yearPos(p.year);
          });
          target /= n.papers.length;
        }
        n.target = target;
        var k = n.kind === 'paper' ? 0.25 : 0.05;
        if (vertical) {
          n.vy += (target - n.y) * k * alpha;
          n.vx += ((W + 36) / 2 - n.x) * 0.04 * alpha;
        } else {
          n.vx += (target - n.x) * k * alpha;
          n.vy += (H / 2 - n.y) * 0.04 * alpha;
        }
      });
      nodes.forEach(function (n) {
        if (n.fx != null) {
          n.x = n.fx;
          n.y = n.fy;
          n.vx = n.vy = 0;
          return;
        }
        n.vx *= 0.6;
        n.vy *= 0.6;
        n.x += n.vx;
        n.y += n.vy;
      });
      // Box collisions so labels never overlap.
      for (var pass = 0; pass < 4; pass++) {
        for (i = 0; i < nodes.length; i++) {
          for (j = i + 1; j < nodes.length; j++) {
            a = nodes[i];
            b = nodes[j];
            var ox = a.hw + b.hw - Math.abs(a.x - b.x);
            if (ox <= 0) continue;
            var oy;
            if (a.y <= b.y) oy = a.bottom + b.top - (b.y - a.y);
            else oy = b.bottom + a.top - (a.y - b.y);
            if (oy <= 0) continue;
            // Papers can't move along the time axis, so push them sideways.
            var alongX = ox < oy;
            if (!vertical && a.kind === 'paper' && b.kind === 'paper' && a.fx == null && b.fx == null) {
              alongX = false;
            }
            var lockA = a.fx != null;
            var lockB = b.fx != null;
            if (lockA && lockB) continue;
            var wa = lockA ? 0 : lockB ? 1 : 0.5;
            var wb = 1 - wa;
            if (alongX) {
              var sx = a.x < b.x ? -1 : 1;
              a.x += sx * ox * wa;
              b.x -= sx * ox * wb;
            } else {
              var sy = a.y < b.y ? -1 : 1;
              a.y += sy * oy * wa;
              b.y -= sy * oy * wb;
            }
          }
        }
        constrain();
      }
    }

    function constrain() {
      nodes.forEach(function (n) {
        // Papers stay close to their year line unless being dragged.
        if (n.kind === 'paper' && n.fx == null) {
          var slack = vertical ? 60 : 40;
          if (vertical) n.y = Math.max(n.target - slack, Math.min(n.target + slack, n.y));
          else n.x = Math.max(n.target - slack, Math.min(n.target + slack, n.x));
        }
        n.x = Math.max((vertical ? 48 : PAD) + n.hw, Math.min(W - (vertical ? 12 : PAD) - n.hw, n.x));
        n.y = Math.max(PAD + n.top, Math.min(H - (vertical ? PAD : 44) - n.bottom, n.y));
      });
    }

    function draw() {
      nodes.forEach(function (n) {
        n.el.setAttribute('transform', 'translate(' + n.x.toFixed(1) + ',' + n.y.toFixed(1) + ')');
      });
      edges.forEach(function (e) {
        var x1 = e.s.x;
        var y1 = e.s.y;
        var x2 = e.t.x;
        var y2 = e.t.y;
        if (e.kind === 'topic') {
          e.el.setAttribute('d', 'M' + x1 + ' ' + y1 + 'L' + x2 + ' ' + y2);
          return;
        }
        // Curved paper-to-paper link, trimmed to stop at the dot's edge.
        var dx = x2 - x1;
        var dy = y2 - y1;
        var d = Math.sqrt(dx * dx + dy * dy) || 1;
        var bend = 0.22 * d;
        var cx = (x1 + x2) / 2 - (dy / d) * bend;
        var cy = (y1 + y2) / 2 + (dx / d) * bend;
        var ex = x2 - cx;
        var ey = y2 - cy;
        var el = Math.sqrt(ex * ex + ey * ey) || 1;
        var gap = R + 3;
        var sx = x1 + ((cx - x1) / (Math.sqrt((cx - x1) * (cx - x1) + (cy - y1) * (cy - y1)) || 1)) * gap;
        var sy = y1 + ((cy - y1) / (Math.sqrt((cx - x1) * (cx - x1) + (cy - y1) * (cy - y1)) || 1)) * gap;
        e.el.setAttribute(
          'd',
          'M' + sx.toFixed(1) + ' ' + sy.toFixed(1) +
            'Q' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ' ' +
            (x2 - (ex / el) * gap).toFixed(1) + ' ' + (y2 - (ey / el) * gap).toFixed(1)
        );
      });
    }

    function drawAxis() {
      gAxis.innerHTML = '';
      years.forEach(function (y) {
        var p = yearPos(y);
        if (vertical) {
          svgEl('line', { x1: 44, x2: W, y1: p, y2: p }, gAxis);
          svgEl('text', { x: 8, y: p + 4 }, gAxis).textContent = y;
        } else {
          svgEl('line', { x1: p, x2: p, y1: 0, y2: H - 30 }, gAxis);
          svgEl('text', { x: p, y: H - 10, 'text-anchor': 'middle' }, gAxis).textContent = y;
        }
      });
    }

    var lastW = 0;
    function layout(force) {
      var w = stage.clientWidth;
      if (!w || (!force && Math.abs(w - lastW) < 24)) return;
      lastW = w;
      measure();
      W = w;
      vertical = W < 560;
      H = vertical ? Math.max(660, years.length * 200) : 470;
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      svg.setAttribute('width', W);
      svg.setAttribute('height', H);
      drawAxis();

      // Try a few deterministic starting points and keep the tidiest result.
      var best = null;
      for (var seed = 1; seed <= 40; seed++) {
        var rand = rng(seed * 7919);
        nodes.forEach(function (n) {
          var a = n.kind === 'paper' ? yearPos(n.year) : yearPos(years[0]) + rand() * (yearPos(years[years.length - 1]) - yearPos(years[0]));
          var c = (vertical ? W : H) / 2 + (rand() - 0.5) * (vertical ? W : H) * 0.7;
          n.x = vertical ? c : a;
          n.y = vertical ? a : c;
          n.vx = n.vy = 0;
          n.fx = n.fy = null;
        });
        for (var k = 0; k < 300; k++) tick(1 - k / 320);
        var sc = score();
        if (!best || sc < best.score) {
          best = {
            score: sc,
            pos: nodes.map(function (n) {
              return [n.x, n.y];
            })
          };
        }
      }
      nodes.forEach(function (n, i) {
        n.x = best.pos[i][0];
        n.y = best.pos[i][1];
      });
      draw();
    }

    function crosses(a, b, c, d) {
      function side(p, q, r) {
        return (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
      }
      return side(a, b, c) * side(a, b, d) < 0 && side(c, d, a) * side(c, d, b) < 0;
    }

    function passesThrough(e, n) {
      for (var t = 0.05; t < 1; t += 0.05) {
        var x = e.s.x + (e.t.x - e.s.x) * t;
        var y = e.s.y + (e.t.y - e.s.y) * t;
        if (Math.abs(x - n.x) < n.hw && y > n.y - n.top && y < n.y + n.bottom) return true;
      }
      return false;
    }

    /* Lower is better: total edge length plus penalties for overlapping nodes,
       crossing edges, and edges running underneath an unrelated node. */
    function score() {
      var total = 0;
      nodes.forEach(function (a, i) {
        for (var j = i + 1; j < nodes.length; j++) {
          var b = nodes[j];
          var top = a.y <= b.y ? a.bottom + b.top - (b.y - a.y) : b.bottom + a.top - (a.y - b.y);
          if (a.hw + b.hw - Math.abs(a.x - b.x) > 2 && top > 2) total += 1500;
        }
      });
      edges.forEach(function (e, i) {
        total += Math.sqrt((e.s.x - e.t.x) * (e.s.x - e.t.x) + (e.s.y - e.t.y) * (e.s.y - e.t.y));
        nodes.forEach(function (n) {
          if (n !== e.s && n !== e.t && passesThrough(e, n)) {
            total += n.kind === 'paper' ? 1500 : 150;
          }
        });
        for (var j = i + 1; j < edges.length; j++) {
          var f = edges[j];
          if (e.s === f.s || e.s === f.t || e.t === f.s || e.t === f.t) continue;
          if (crosses(e.s, e.t, f.s, f.t)) total += 250;
        }
      });
      return total;
    }

    var running = false;
    var heat = 0;
    function reheat() {
      heat = Math.max(heat, 0.35);
      if (running) return;
      running = true;
      requestAnimationFrame(function step() {
        tick(heat);
        draw();
        heat *= 0.95;
        if (heat > 0.01) requestAnimationFrame(step);
        else running = false;
      });
    }

    /* ---- Highlighting, tooltip, selection ---- */
    var hovered = null;
    var selected = null;

    function highlight() {
      var focus = hovered || selected;
      svg.classList.toggle('is-dim', !!focus);
      nodes.forEach(function (n) {
        n.el.classList.toggle('is-hl', !!focus && !!focus.adj[n.id]);
        n.el.classList.toggle('is-selected', n === selected);
      });
      edges.forEach(function (e) {
        e.el.classList.toggle('is-hl', !!focus && (e.s === focus || e.t === focus));
      });
    }

    function showTip(n) {
      if (!n) {
        tip.hidden = true;
        return;
      }
      tip.textContent = n.kind === 'paper'
        ? n.title
        : n.papers.length + ' paper' + (n.papers.length > 1 ? 's' : '') + ' on ' + n.label.toLowerCase();
      tip.hidden = false;
      var tw = tip.offsetWidth;
      var left = Math.max(4, Math.min(W - tw - 4, n.x - tw / 2));
      tip.style.left = left + 'px';
      tip.style.top = n.y - n.top - 8 + 'px';
    }

    function setHover(n) {
      hovered = n;
      highlight();
      showTip(n);
    }

    function chip(n) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'pg-chip pg-chip--' + n.kind + (n.type ? ' pg-chip--' + n.type : '');
      b.textContent = n.kind === 'paper' ? n.label : n.label;
      if (n.kind === 'paper') b.title = n.title;
      b.addEventListener('click', function () {
        select(n, true);
      });
      return b;
    }

    function related(n, kind) {
      var out = [];
      edges.forEach(function (e) {
        if (e.kind !== kind) return;
        if (e.s === n) out.push({ dir: 'out', n: e.t });
        else if (e.t === n) out.push({ dir: 'in', n: e.s });
      });
      return out;
    }

    function row(label, chips) {
      if (!chips.length) return null;
      var r = document.createElement('div');
      r.className = 'pg-detail__row';
      var l = document.createElement('span');
      l.className = 'pub-toolbar__label';
      l.textContent = label;
      r.appendChild(l);
      chips.forEach(function (c) {
        r.appendChild(c);
      });
      return r;
    }

    function renderDetail() {
      detail.innerHTML = '';
      if (!selected) {
        var p = document.createElement('p');
        p.className = 'pg-detail__empty';
        p.textContent = 'Select a paper or a topic in the graph to see its details here.';
        detail.appendChild(p);
        return;
      }
      var n = selected;
      if (n.kind === 'paper') {
        var clone = n.article.cloneNode(true);
        clone.classList.add('pg-detail__item');
        var bib = clone.querySelector('.pub-bibtex');
        if (bib) bib.hidden = true;
        var bt = clone.querySelector('[data-bibtex-toggle]');
        if (bt) bt.setAttribute('aria-expanded', 'false');
        detail.appendChild(clone);

        var topics = related(n, 'topic').map(function (r) {
          return chip(r.n);
        });
        var builds = related(n, 'builds');
        var rows = [
          row('Topics', topics),
          row('Builds on', builds.filter(function (r) { return r.dir === 'in'; }).map(function (r) { return chip(r.n); })),
          row('Extended in', builds.filter(function (r) { return r.dir === 'out'; }).map(function (r) { return chip(r.n); })),
          row('Companion', related(n, 'companion').map(function (r) { return chip(r.n); }))
        ];
        var meta = document.createElement('div');
        meta.className = 'pg-detail__meta';
        rows.forEach(function (r) {
          if (r) meta.appendChild(r);
        });
        detail.appendChild(meta);
      } else {
        var h = document.createElement('h3');
        h.className = 'pg-detail__title';
        h.textContent = n.label;
        detail.appendChild(h);
        var ul = document.createElement('ul');
        ul.className = 'pg-detail__papers';
        n.papers
          .slice()
          .sort(function (a, b) {
            return b.year - a.year;
          })
          .forEach(function (p) {
            var li = document.createElement('li');
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'pg-paper-link';
            b.innerHTML =
              '<i class="pg-key pg-key--' + p.type + '"></i><span></span><em></em>';
            b.querySelector('span').textContent = p.title;
            b.querySelector('em').textContent = p.label;
            b.addEventListener('click', function () {
              select(p, true);
            });
            li.appendChild(b);
            ul.appendChild(li);
          });
        detail.appendChild(ul);
      }
    }

    function select(n, focusNode) {
      selected = n === selected && !focusNode ? null : n;
      highlight();
      renderDetail();
      if (focusNode && n) n.el.focus({ preventScroll: true });
    }

    /* ---- Pointer & keyboard ---- */
    function point(e) {
      var r = svg.getBoundingClientRect();
      return { x: ((e.clientX - r.left) * W) / r.width, y: ((e.clientY - r.top) * H) / r.height };
    }

    var drag = null;
    nodes.forEach(function (n) {
      var g = n.el;
      g.addEventListener('pointerenter', function () {
        if (!drag) setHover(n);
      });
      g.addEventListener('pointerleave', function () {
        if (!drag) setHover(null);
      });
      g.addEventListener('focus', function () {
        setHover(n);
      });
      g.addEventListener('blur', function () {
        setHover(null);
      });
      g.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          select(n);
        }
      });
      g.addEventListener('pointerdown', function (e) {
        if (e.button !== 0) return;
        var p = point(e);
        drag = { n: n, x: p.x, y: p.y, dx: n.x - p.x, dy: n.y - p.y, moved: false };
        g.setPointerCapture(e.pointerId);
        e.preventDefault();
      });
      g.addEventListener('pointermove', function (e) {
        if (!drag || drag.n !== n) return;
        var p = point(e);
        if (!drag.moved && Math.abs(p.x - drag.x) + Math.abs(p.y - drag.y) < 5) return;
        drag.moved = true;
        tip.hidden = true;
        n.fx = p.x + drag.dx;
        n.fy = p.y + drag.dy;
        reheat();
      });
      var end = function () {
        if (!drag || drag.n !== n) return;
        var moved = drag.moved;
        drag = null;
        n.fx = n.fy = null;
        if (moved) reheat();
        else select(n);
      };
      g.addEventListener('pointerup', end);
      g.addEventListener('pointercancel', end);
    });

    svg.addEventListener('click', function (e) {
      if (!e.target.closest('.pg-node')) select(null);
    });
    root.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && selected) select(null);
    });

    if (window.ResizeObserver) {
      new ResizeObserver(function () {
        if (!root.hidden) layout(false);
      }).observe(stage);
    }

    renderDetail();
    return {
      layout: function () {
        layout(false);
      }
    };
  }

  var savedView = 'list';
  try {
    savedView = localStorage.getItem('pubView') || 'list';
  } catch (e) {}
  setView(savedView);
})();
