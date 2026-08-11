/* Collapsible terminal navigation.
 *
 * The site is a flat set of .html pages, so the terminal presents a virtual
 * filesystem over it:
 *
 *   /                     root, one directory per page
 *   /methodology          a page; its children are that page's <h2> sections
 *   /methodology/ncu-framework   a section; "opening" it jumps to the anchor
 *
 * The prompt lives in the bar and is always ready for input. The output panel
 * above it opens only when a command actually prints something, so navigating
 * (cd, next, prev, open) never covers the page you are reading.
 *
 * The working directory is derived from location.pathname on every load, so
 * `cd` across pages stays coherent without persisting any state.
 */
(function () {
  "use strict";

  // Reading order. `reading: false` marks pages kept for reference but outside
  // the sequence, so next/prev walk the book the way the old nav buttons did.
  var PAGES = [
    { file: "index.html",            slug: "home",         label: "Home",                      reading: true },
    { file: "journey.html",          slug: "introduction", label: "How we got here",           reading: true },
    { file: "methodology.html",      slug: "methodology",  label: "Core interpretive principles", reading: true },
    { file: "background.html",       slug: "background",   label: "History and literature review", reading: true },
    { file: "architecture.html",     slug: "architecture", label: "How projects connect",      reading: true },
    { file: "database.html",         slug: "kalima-db",    label: "Database",                  reading: true },
    { file: "mcp.html",              slug: "kalima-mcp",   label: "MCP server, tools & DSL",   reading: true },
    { file: "math-framework.html",   slug: "kalima-math",  label: "Mathematical framework",    reading: true },
    { file: "democratizing-ai.html", slug: "kalima-ml",    label: "Democratizing AI",          reading: true },
    { file: "references.html",       slug: "references",   label: "Bibliography",              reading: true },
    { file: "quran-dsl.html",                 slug: "quran-dsl",                 label: "DSL specification",       reading: false },
    { file: "literature-review.html",         slug: "literature-review",         label: "Quranic NLP landscape",   reading: false },
    { file: "quran-computation-history.html", slug: "quran-computation-history", label: "From concordances to NLP", reading: false }
  ];

  var READING = PAGES.filter(function (p) { return p.reading; });
  var ASIDE = PAGES.filter(function (p) { return !p.reading; });

  var byFile = {}, bySlug = {};
  PAGES.forEach(function (p) { byFile[p.file] = p; bySlug[p.slug] = p; });

  function step(page, delta) {
    var i = READING.indexOf(page);
    if (i === -1) return null;
    return READING[i + delta] || null;
  }

  /* ---------- current location ---------- */

  function currentFile() {
    var name = location.pathname.split("/").pop();
    if (!name) name = "index.html";
    return byFile[name] ? name : "index.html";
  }

  var here = byFile[currentFile()];
  // cwd is "/" on the home page, "/<slug>" on any other page.
  var cwd = here.slug === "home" ? "/" : "/" + here.slug;

  /* ---------- sections ---------- */

  function slugify(text) {
    return text
      .replace(/^\s*\d+(\.\d+)*\.?\s*/, "")   // drop leading "3." / "3.1"
      .normalize("NFD")                        // Qarīn -> Qari + combining macron
      .replace(/[̀-ͯ]/g, "")         // ...so it slugs to "qarin", not "qar-n"
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "section";
  }

  function sectionsFrom(doc) {
    var out = [], seen = {};
    Array.prototype.forEach.call(doc.querySelectorAll("h2[id], h3[id]"), function (h) {
      var title = (h.textContent || "").trim();
      if (!title) return;
      var slug = slugify(title);
      if (seen[slug]) { slug = slug + "-" + (++seen[slug]); } else { seen[slug] = 1; }
      out.push({ slug: slug, id: h.id, title: title.replace(/^\s*\d+(\.\d+)*\.?\s*/, "") });
    });
    return out;
  }

  var sectionCache = {};
  sectionCache[here.file] = sectionsFrom(document);

  function getSections(file) {
    if (sectionCache[file]) return Promise.resolve(sectionCache[file]);
    return fetch(file)
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.text();
      })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, "text/html");
        sectionCache[file] = sectionsFrom(doc);
        return sectionCache[file];
      })
      .catch(function () {
        sectionCache[file] = null;   // unreadable (e.g. file:// origin)
        return null;
      });
  }

  /* ---------- path resolution ---------- */

  function normalize(path) {
    var absolute = path.charAt(0) === "/";
    var base = absolute ? [] : cwd.split("/").filter(Boolean);
    path.split("/").forEach(function (part) {
      if (!part || part === ".") return;
      if (part === "..") base.pop();
      else base.push(part);
    });
    return "/" + base.join("/");
  }

  // Returns {kind: "root"|"page"|"section"|"missing", page, sectionSlug, path}
  function resolve(path) {
    var full = normalize(path);
    var parts = full.split("/").filter(Boolean);
    if (parts.length === 0) return { kind: "root", path: "/" };

    var page = bySlug[parts[0]];
    if (!page) return { kind: "missing", path: full };
    if (parts.length === 1) return { kind: "page", page: page, path: full };
    if (parts.length > 2) return { kind: "missing", path: full };
    return { kind: "section", page: page, sectionSlug: parts[1], path: full };
  }

  /* ---------- DOM ---------- */

  var el = {};
  var emitted = 0;      // non-quiet lines printed by the command in flight

  function promptText() {
    return "yassine@syntra:" + cwd + "$";
  }

  function build() {
    var root = document.createElement("div");
    root.className = "term";
    // Output sits above; the prompt sits in the bar and is always live, so a
    // command can be typed without opening anything.
    root.innerHTML =
      '<div class="term-inner">' +
        '<div class="term-body" id="term-body" hidden>' +
          '<div class="term-out" role="log" aria-live="polite"></div>' +
        '</div>' +
        '<div class="term-bar">' +
          '<form class="term-form" autocomplete="off">' +
            '<button class="term-prompt" type="button" aria-controls="term-body"' +
              ' aria-expanded="false" title="Show or hide output"></button>' +
            '<input class="term-input" id="term-input" type="text" spellcheck="false"' +
              ' autocapitalize="off" autocorrect="off" aria-label="terminal input"' +
              ' placeholder="help, ls, cd <name>, next">' +
          '</form>' +
          '<a class="term-next" hidden></a>' +
        '</div>' +
      '</div>';
    document.body.appendChild(root);

    el.root = root;
    el.body = root.querySelector(".term-body");
    el.out = root.querySelector(".term-out");
    el.bar = root.querySelector(".term-bar");
    el.form = root.querySelector(".term-form");
    el.input = root.querySelector(".term-input");
    el.prompt = root.querySelector(".term-prompt");
    el.next = root.querySelector(".term-next");

    var ahead = step(here, 1);
    if (ahead) {
      el.next.href = ahead.file;
      el.next.textContent = ahead.slug + " →";
      el.next.hidden = false;
    }
  }

  function setPrompt() {
    el.prompt.textContent = promptText();
  }

  // `quiet` lines are recorded but never force the panel open -- echoes and
  // navigation notices should not interrupt someone who is just moving around.
  function write(text, cls, quiet) {
    var line = document.createElement("div");
    line.className = "term-line" + (cls ? " " + cls : "");
    line.textContent = text;
    el.out.appendChild(line);
    el.out.scrollTop = el.out.scrollHeight;
    if (!quiet) emitted++;
    return line;
  }

  function writeEcho(cmd) {
    var line = document.createElement("div");
    line.className = "term-line term-echo";
    var p = document.createElement("span");
    p.className = "term-echo-prompt";
    p.textContent = promptText() + " ";
    line.appendChild(p);
    line.appendChild(document.createTextNode(cmd));
    el.out.appendChild(line);
    el.out.scrollTop = el.out.scrollHeight;
  }

  function columns(items, cls) {
    if (!items.length) return;
    var width = items.reduce(function (m, s) { return Math.max(m, s.length); }, 0) + 2;
    var perRow = Math.max(1, Math.floor(72 / width));
    for (var i = 0; i < items.length; i += perRow) {
      var row = items.slice(i, i + perRow).map(function (s) {
        return s + new Array(Math.max(1, width - s.length + 1)).join(" ");
      }).join("");
      write(row.replace(/\s+$/, ""), cls);
    }
  }

  /* ---------- panel ---------- */

  function setPanel(open) {
    el.body.hidden = !open;
    el.root.classList.toggle("term-is-open", open);
    el.prompt.setAttribute("aria-expanded", String(open));
    document.body.classList.toggle("has-open-terminal", open);
    sessionStorage.setItem("term-open", open ? "1" : "0");
    if (open) el.out.scrollTop = el.out.scrollHeight;
  }

  function panelOpen() { return !el.body.hidden; }

  /* ---------- commands ---------- */

  function go(url) {
    // Keep the caret where it was, so chained navigation stays typeable.
    sessionStorage.setItem("term-focus", "1");
    write("opening " + url + " ...", "term-ok", true);
    setTimeout(function () { location.href = url; }, 100);
  }

  function hop(delta, name) {
    if (!here.reading) {
      write(name + ": " + here.slug + " sits outside the reading order", "term-err");
      write("`cd /` for the contents.", "term-dim");
      return;
    }
    var target = step(here, delta);
    if (!target) {
      write(name + ": " + (delta > 0 ? "last chapter" : "first chapter"), "term-dim");
      return;
    }
    go(target.file);
  }

  function listRoot() {
    columns(READING.map(function (p) { return p.slug + "/"; }));
    write("");
    write("also, outside the reading order:", "term-dim");
    columns(ASIDE.map(function (p) { return p.slug + "/"; }));
    write("");
    write("`cd <name>` opens one, `ls <name>` peeks inside, `next` moves on.", "term-dim");
  }

  function listPage(page) {
    return getSections(page.file).then(function (sections) {
      if (sections === null) {
        write("ls: cannot read " + page.file + " from this origin", "term-err");
        write("try `cd " + page.slug + "` to open the page directly.", "term-dim");
        return;
      }
      if (!sections.length) { write("(no sections)", "term-dim"); return; }
      columns(sections.map(function (s) { return s.slug; }));
      write("");
      write(sections.length + " sections in " + page.file, "term-dim");
    });
  }

  var COMMANDS = {
    help: function () {
      [
        "ls [path]      list pages, or the sections of a page",
        "cd <path>      go to a page or section  (cd .. , cd /)",
        "next           the next chapter in reading order",
        "prev           the previous chapter",
        "pwd            print the current path",
        "tree           show the whole site",
        "open <path>    open a page or section  (also: cat)",
        "clear          clear the output and hide it",
        "help           this list"
      ].forEach(function (l) { write("  " + l); });
      write("");
      write("Output only appears when a command prints something; navigating "
            + "leaves the page clear.", "term-dim");
      write("Tab completes. Up/Down walks history. Ctrl+` toggles output, "
            + "Esc hides it.", "term-dim");
    },

    pwd: function () { write(cwd); },

    clear: function () {
      el.out.textContent = "";
      setPanel(false);
    },

    next: function () { return hop(1, "next"); },
    prev: function () { return hop(-1, "prev"); },

    ls: function (args) {
      var target = resolve(args[0] || ".");
      if (target.kind === "root") { listRoot(); return; }
      if (target.kind === "page") { return listPage(target.page); }
      if (target.kind === "section") {
        return getSections(target.page.file).then(function (sections) {
          var hit = (sections || []).filter(function (s) {
            return s.slug === target.sectionSlug;
          })[0];
          if (!hit) { write("ls: no such section: " + target.path, "term-err"); return; }
          write(hit.slug + "  —  " + hit.title);
        });
      }
      write("ls: no such path: " + target.path, "term-err");
    },

    cd: function (args) {
      var arg = args[0];
      if (!arg || arg === "~") arg = "/";

      var target = resolve(arg);

      if (target.kind === "root") {
        if (here.slug === "home") {
          cwd = "/"; setPrompt();
          write("already at /", "term-dim", true);
          return;
        }
        go("index.html");
        return;
      }

      if (target.kind === "page") {
        if (target.page.file === here.file) {
          cwd = target.path; setPrompt();
          write("already in " + target.path, "term-dim", true);
          return;
        }
        go(target.page.file);
        return;
      }

      if (target.kind === "section") {
        return getSections(target.page.file).then(function (sections) {
          if (sections === null) { go(target.page.file); return; }
          var hit = sections.filter(function (s) {
            return s.slug === target.sectionSlug;
          })[0];
          if (!hit) { write("cd: no such section: " + target.path, "term-err"); return; }
          if (target.page.file === here.file) {
            location.hash = hit.id;
            var node = document.getElementById(hit.id);
            if (node) node.scrollIntoView({ behavior: "smooth", block: "start" });
            write("→ " + hit.title, "term-ok", true);
          } else {
            go(target.page.file + "#" + hit.id);
          }
        });
      }

      write("cd: no such path: " + target.path, "term-err");
    },

    tree: function () {
      write("/");
      READING.forEach(function (p) {
        write("├── " + p.slug + "/" +
              new Array(Math.max(2, 26 - p.slug.length)).join(" ") + p.label);
      });
      write("│");
      ASIDE.forEach(function (p, i) {
        var last = i === ASIDE.length - 1;
        write((last ? "└── " : "├── ") + p.slug + "/" +
              new Array(Math.max(2, 26 - p.slug.length)).join(" ") + p.label, "term-dim");
      });
    }
  };

  COMMANDS.cat = COMMANDS.cd;
  COMMANDS.open = COMMANDS.cd;
  COMMANDS.dir = COMMANDS.ls;

  function run(input) {
    var line = input.trim();
    emitted = 0;
    writeEcho(line);
    if (!line) { revealIfPrinted(); return; }

    var parts = line.split(/\s+/);
    var name = parts[0].toLowerCase();
    var fn = COMMANDS[name];

    if (!fn) {
      write(name + ": command not found", "term-err");
      write("type `help` for the list.", "term-dim");
      revealIfPrinted();
      return;
    }

    var result = fn(parts.slice(1));
    if (result && result.then) result.then(revealIfPrinted);
    else revealIfPrinted();
  }

  // Show the output panel only if the command actually printed something.
  function revealIfPrinted() {
    if (emitted > 0 && !panelOpen()) setPanel(true);
    else if (panelOpen()) el.out.scrollTop = el.out.scrollHeight;
  }

  /* ---------- completion ---------- */

  function candidates(fragment) {
    var target = resolve(fragment.replace(/[^/]*$/, "") || ".");
    var stem = fragment.split("/").pop();

    var names;
    if (target.kind === "root") {
      names = PAGES.map(function (p) { return p.slug; });
    } else if (target.kind === "page") {
      var cached = sectionCache[target.page.file];
      if (!cached) { getSections(target.page.file); return []; }
      names = cached.map(function (s) { return s.slug; });
    } else {
      return [];
    }
    return names.filter(function (n) { return n.indexOf(stem) === 0; });
  }

  function complete() {
    var value = el.input.value;
    var parts = value.split(/\s+/);
    if (parts.length < 2) return;

    var fragment = parts[parts.length - 1];
    var hits = candidates(fragment);
    if (!hits.length) return;

    var prefix = hits[0];
    hits.forEach(function (h) {
      while (h.indexOf(prefix) !== 0) prefix = prefix.slice(0, -1);
    });

    if (prefix) {
      parts[parts.length - 1] = fragment.replace(/[^/]*$/, "") + prefix;
      el.input.value = parts.join(" ") + (hits.length === 1 ? "/" : "");
    }
    if (hits.length > 1) {
      emitted = 0;
      writeEcho(value);
      columns(hits);
      revealIfPrinted();
    }
  }

  /* ---------- init ---------- */

  function init() {
    build();
    setPrompt();

    write("`ls` to look around, `cd <name>` to move, `next` to read on.", "term-dim", true);
    write("`help` for the rest.", "term-dim", true);
    write("", null, true);

    var recalled = sessionStorage.getItem("term-history");
    var cmdHistory = recalled ? JSON.parse(recalled) : [];
    var cursor = cmdHistory.length;

    // Clicking the prompt shows or hides past output; the bar always types.
    el.prompt.addEventListener("click", function () {
      setPanel(!panelOpen());
      el.input.focus();
    });
    el.bar.addEventListener("mousedown", function (e) {
      if (e.target === el.bar || e.target === el.form) {
        e.preventDefault();
        el.input.focus();
      }
    });

    el.form.addEventListener("submit", function (e) {
      e.preventDefault();
      var value = el.input.value;
      el.input.value = "";
      if (value.trim()) {
        cmdHistory.push(value.trim());
        sessionStorage.setItem("term-history", JSON.stringify(cmdHistory.slice(-50)));
      }
      cursor = cmdHistory.length;
      run(value);
    });

    el.input.addEventListener("keydown", function (e) {
      if (e.key === "Tab") { e.preventDefault(); complete(); return; }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (cursor > 0) { cursor--; el.input.value = cmdHistory[cursor] || ""; }
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (cursor < cmdHistory.length) { cursor++; el.input.value = cmdHistory[cursor] || ""; }
        return;
      }
      if (e.key === "Escape") {
        if (panelOpen()) setPanel(false);
        else el.input.blur();
        return;
      }
      if (e.key === "l" && e.ctrlKey) { e.preventDefault(); COMMANDS.clear(); }
    });

    document.addEventListener("keydown", function (e) {
      if (e.ctrlKey && (e.key === "`" || e.key === "~")) {
        e.preventDefault();
        setPanel(!panelOpen());
        el.input.focus();
      }
    });

    if (sessionStorage.getItem("term-open") === "1") setPanel(true);

    // Land with the caret ready when we got here via a command.
    if (sessionStorage.getItem("term-focus") === "1") {
      sessionStorage.removeItem("term-focus");
      el.input.focus({ preventScroll: true });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
