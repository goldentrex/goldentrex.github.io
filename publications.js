/* Publications page: chronological <-> grouped-by-type view, BibTeX toggle & copy. */
(function () {
  'use strict';

  var list = document.getElementById('pub-list');
  if (!list) return;

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

  /* ---- BibTeX show / hide + copy ---- */
  list.addEventListener('click', function (e) {
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
})();
