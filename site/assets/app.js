(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const grid = $("#grid"), tiles = [...grid.querySelectorAll(".tile")];
  const q = $("#q"), fType = $("#f-type"), fMode = $("#f-mode"), count = $("#count"), empty = $("#empty");
  const modal = $("#modal"), body = $("#modal-body");
  let view = "upcoming", autoPast = false;
  const hint = document.createElement("p");
  hint.className = "count"; hint.hidden = true;
  hint.textContent = "No upcoming events right now, showing past events.";
  count.after(hint);
  const now = () => new Date().toISOString().replace(/\.\d+Z$/, "Z");

  function apply() {
    const t = now(), term = q.value.trim().toLowerCase();
    let shown = 0;
    const list = tiles.filter((el) => {
      const past = el.dataset.end < t;
      el.classList.toggle("is-past", past);
      const ok = (view === "all" || (view === "past") === past) &&
        (!fType.value || el.dataset.type === fType.value) &&
        (!fMode.value || el.dataset.mode === fMode.value) &&
        (!term || term.split(/\s+/).every((w) => el.dataset.search.includes(w)));
      el.hidden = !ok;
      if (ok) shown++;
      return ok;
    });
    list.sort((a, b) => view === "past" ? b.dataset.start.localeCompare(a.dataset.start) : a.dataset.start.localeCompare(b.dataset.start))
      .forEach((el) => grid.appendChild(el));
    count.textContent = `${shown} event${shown === 1 ? "" : "s"} · times in utc`;
    if (tiles.length) {
      empty.hidden = shown > 0;
      empty.replaceChildren();
      const filtered = q.value.trim() || fType.value || fMode.value;
      const hasPast = tiles.some((el) => el.dataset.end < t);
      if (view === "upcoming" && !filtered && hasPast) {
        empty.append("No upcoming events. ");
        const b = document.createElement("button");
        b.type = "button"; b.className = "btn ghost"; b.textContent = "Show past events";
        b.addEventListener("click", () => setView("past"));
        empty.append(b);
      } else empty.textContent = "No events match.";
    }
    hint.hidden = !(autoPast && view === "past");
  }

  function setView(v, { auto = false } = {}) {
    view = v; autoPast = auto;
    document.querySelectorAll(".seg button").forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.view === v)));
    apply();
  }
  document.querySelectorAll(".seg button").forEach((b) => b.addEventListener("click", () => setView(b.dataset.view)));
  [q, fType, fMode].forEach((el) => el.addEventListener("input", apply));

  // modal: opened by clicking a tile, deep-linkable via #<uuid>
  function open(id, push) {
    const tpl = document.getElementById("tpl-" + id);
    if (!tpl) return false;
    body.replaceChildren(tpl.content.cloneNode(true));
    if (!modal.open) modal.showModal();
    modal.scrollTop = 0;
    if (push && location.hash !== "#" + id) history.pushState(null, "", "#" + id);
    return true;
  }
  grid.addEventListener("click", (ev) => {
    const a = ev.target.closest("a.open");
    if (!a || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button) return;
    const id = a.closest(".tile").dataset.id;
    if (open(id, true)) ev.preventDefault();
  });
  const closeModal = () => { if (modal.open) modal.close(); };
  modal.addEventListener("close", () => { if (location.hash) history.pushState(null, "", location.pathname + location.search); });
  $(".close", modal).addEventListener("click", closeModal);
  modal.addEventListener("click", (ev) => { if (ev.target === modal) closeModal(); });
  function route() {
    const id = location.hash.slice(1);
    if (id && open(id, false)) {
      const t = document.getElementById("tile-" + id);
      if (t && t.hidden) setView("all");
    } else closeModal();
  }
  addEventListener("popstate", route);
  addEventListener("hashchange", route);
  // no upcoming events but past ones: start on the past view
  { const t = now();
    if (tiles.length && !tiles.some((el) => el.dataset.end >= t)) setView("past", { auto: true }); else apply(); }
  route();
})();
