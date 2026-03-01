/* =========================================================
   INTRO (Event + Slots)
========================================================= */
(function () {
  const INTRO_ID = "intro";

  const EVENT_CSV =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQJ0t_-c4IZGg9I-e_0JKAupcDehIGIMpYNLtdxR-c3t7t2eF9I-kBM6uptEz4h_o07T6IcaAF-Qkng/pub?gid=0&single=true&output=csv";

  const SLOT_CSV =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQJ0t_-c4IZGg9I-e_0JKAupcDehIGIMpYNLtdxR-c3t7t2eF9I-kBM6uptEz4h_o07T6IcaAF-Qkng/pub?gid=65714416&single=true&output=csv";

  const COPY = {
    eyebrow: "Live2D Illustrator",
    hello: "안녕하세요. Live2D 일러스트레이터 여먕 입니다!",
    eventTitle: "Event",
    slotTitle: "슬롯",
    contactTitle: "✦ 문의 답변 가능 시간 ✦",
    contact: ["10:30~23:40", "이 외의 시간에도 문의 남겨주시면", "가능한 한 빨리 답해드립니다!"],
  };

  function stripScripts(html) {
    return String(html).replace(
      /<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi,
      ""
    );
  }

  function withBreaks(html) {
    return stripScripts(html).replace(/\r\n|\r|\n/g, "<br>");
  }

  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function parseCSV(text) {
    const rows = [];
    let row = [];
    let cur = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const next = text[i + 1];

      if (ch === '"' && inQuotes && next === '"') {
        cur += '"';
        i++;
        continue;
      }
      if (ch === '"') {
        inQuotes = !inQuotes;
        continue;
      }

      if (!inQuotes && (ch === "," || ch === "\n" || ch === "\r")) {
        row.push(cur);
        cur = "";

        if (ch === "\r" && next === "\n") i++;
        if (ch === "\n" || ch === "\r") {
          if (row.some((c) => String(c).trim() !== "")) rows.push(row);
          row = [];
        }
        continue;
      }

      cur += ch;
    }

    row.push(cur);
    if (row.some((c) => String(c).trim() !== "")) rows.push(row);
    return rows;
  }

  function rowsToObjects(rows) {
    if (!rows || rows.length < 2) return [];
    const header = rows[0].map((h) => String(h).trim());
    const body = rows.slice(1);

    return body.map((r) => {
      const obj = {};
      header.forEach((h, idx) => (obj[h] = r[idx] ?? ""));
      return obj;
    });
  }

  function toNum(v) {
    const n = Number(String(v ?? "").trim());
    return Number.isFinite(n) ? n : 0;
  }

  function normalizeEventRow(o) {
    const pick = (...keys) => {
      for (const k of keys) {
        const v = o[k];
        if (v !== undefined && v !== null && String(v).trim() !== "") return v;
      }
      return "";
    };

    return {
      order: toNum(pick("order", "Order", "ORDER", "\ufefforder")),
      title: String(pick("title", "Title", "제목", "\ufefftitle")).trim(),
      desc: String(pick("desc", "Desc", "내용", "\ufeffdesc")).trim(),
      note: String(pick("note", "Note", "비고", "\ufeffnote")).trim(),
      tag: String(pick("tag", "Tag", "태그", "\ufefftag")).trim(),
    };
  }

  function statusToKeyAndMark(status) {
    const v = String(status ?? "").trim().toLowerCase();

    if (v === "오픈" || v === "open") return { key: "open", mark: "○" };
    if (v === "예약" || v === "reserved") return { key: "reserved", mark: "⯎" };
    if (v === "마감" || v === "closed") return { key: "closed", mark: "✦" };

    if (v === "○") return { key: "open", mark: "○" };
    if (v === "⯎") return { key: "reserved", mark: "⯎" };
    if (v === "✦") return { key: "closed", mark: "✦" };

    return { key: "open", mark: "○" };
  }

  function normalizeSlotRow(o) {
    const year = toNum(o.year ?? o.Year ?? o.YEAR ?? o["\ufeffyear"]);
    const month = toNum(o.month ?? o.Month ?? o.MONTH);
    const week = toNum(o.week ?? o.Week ?? o.WEEK);

    const labelRaw = String(o.label ?? o.Label ?? o.LABEL ?? "").trim();
    const label = labelRaw || (week ? `${week}주차` : "");

    const statusRaw = String(o.status ?? o.Status ?? o.STATUS ?? "").trim();

    return { year, month, week, label, statusRaw };
  }

  function renderIntro(events, slots) {
    const root = document.getElementById(INTRO_ID);
    if (!root) return;

    const eventHTML = (events || [])
      .slice()
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map((e) => {
        const title = e.title || "";
        if (!title.trim()) return "";
        return `
          <article class="introEvent">
            <div class="introEvent__head">
              <h4 class="introEvent__title">${esc(title)}</h4>
              ${e.tag ? `<span class="badge">${esc(e.tag)}</span>` : ``}
            </div>
            ${e.desc ? `<div class="introEvent__desc">${withBreaks(e.desc)}</div>` : ``}
            ${e.note ? `<div class="introEvent__note">${withBreaks(e.note)}</div>` : ``}
          </article>
        `.trim();
      })
      .filter(Boolean)
      .join("");

    // group: year -> month -> items
    const byYear = new Map();
    (slots || []).forEach((s0) => {
      const s = normalizeSlotRow(s0);
      if (!s.year || !s.month || !s.week) return;

      if (!byYear.has(s.year)) byYear.set(s.year, new Map());
      const byMonth = byYear.get(s.year);
      if (!byMonth.has(s.month)) byMonth.set(s.month, []);
      byMonth.get(s.month).push(s);
    });

    const years = Array.from(byYear.keys()).sort((a, b) => a - b);

    const slotHTML = years
      .map((year) => {
        const byMonth = byYear.get(year);
        const months = Array.from(byMonth.keys()).sort((a, b) => a - b);

        const monthsHTML = months
          .map((m) => {
            const items = byMonth
              .get(m)
              .slice()
              .sort((a, b) => a.week - b.week);

            const rows = items
              .map((it) => {
                const st = statusToKeyAndMark(it.statusRaw);
                return `
                  <li class="slotRow" data-status="${st.key}">
                    <span class="slotRow__label">${esc(it.label)}</span>
                    <span class="slot slotRow__mark" data-status="${st.key}">${st.mark}</span>
                  </li>
                `.trim();
              })
              .join("");

            return `
              <section class="slotMonth">
                <h4 class="slotMonth__title">${m}월</h4>
                <ul class="slotList">${rows}</ul>
              </section>
            `.trim();
          })
          .join("");

        return `
          <section class="slotYear">
            <h3 class="slotYear__title">${year}</h3>
            <div class="slotYear__months">${monthsHTML}</div>
          </section>
        `.trim();
      })
      .join("");

    const contactHTML = COPY.contact
      .map((t) => `<div class="introContact__line">${esc(t)}</div>`)
      .join("");

    root.innerHTML = `
      <div class="container">

        <div class="sec__head">
          <p class="sec__eyebrow">${esc(COPY.eyebrow)}</p>
          <h1 class="sec__title">${esc(COPY.hello)}</h1>
        </div>

        <div class="card introCard">

      <section class="introBlock introBlock--event">
        <h3 class="introBlock__title">${esc(COPY.eventTitle)}</h3>
        <div class="introEventList">
          ${eventHTML || `<div class="notice__error">이벤트를 불러오지 못했습니다.</div>`}
        </div>

        <div class="eventGuide">
          ⯌많은 신청 부탁드립니다!⯌
        </div>
      </section>

          <section class="introBlock introBlock--slots">
            <h3 class="introBlock__title">${esc(COPY.slotTitle)}</h3>
            <div class="slot-desc">
              빈 슬롯: ○  찬 슬롯: ✦  예약 슬롯: ⯎
            </div>
            
            <div class="slotBoard">
              ${slotHTML || `<div class="notice__error">슬롯을 불러오지 못했습니다.</div>`}
            </div>

            <div class="slotGuide">
              <p>경우에 따라 작업가능 슬롯이 생겨나기도 합니다!</p>
              <p>예약 확정은 선입금 순 입니다!</p>
            </div>
          </section>

          <section class="introBlock introBlock--contact">
            <h3 class="introBlock__title">${esc(COPY.contactTitle)}</h3>
            <div class="introContact">
              ${contactHTML}
            </div>
          </section>

        </div>
      </div>
    `.trim();
  }

  async function loadIntro() {
    const root = document.getElementById(INTRO_ID);
    if (!root) return;

    root.innerHTML = `
      <div class="container">
        <div class="sec__head">
          <p class="sec__eyebrow">${esc(COPY.eyebrow)}</p>
          <h1 class="sec__title">불러오는 중…</h1>
        </div>
        <div class="card"><div class="notice__loading">불러오는 중…</div></div>
      </div>
    `.trim();

    try {
      const [evRes, slRes] = await Promise.all([
        fetch(EVENT_CSV, { cache: "no-store" }),
        fetch(SLOT_CSV, { cache: "no-store" }),
      ]);

      if (!evRes.ok) throw new Error("Event CSV fetch failed: " + evRes.status);
      if (!slRes.ok) throw new Error("Slot CSV fetch failed: " + slRes.status);

      const [evText, slText] = await Promise.all([evRes.text(), slRes.text()]);
      const evRows = parseCSV(evText);
      const slRows = parseCSV(slText);

      const evObjs = rowsToObjects(evRows).map(normalizeEventRow);
      const slObjs = rowsToObjects(slRows);

      renderIntro(evObjs, slObjs);
    } catch (err) {
      console.warn("[intro] load failed:", err);
      renderIntro([], []);
    }
  }

  document.addEventListener("DOMContentLoaded", loadIntro);
})();


/* =========================
   Collab
========================= */
(function () {
  const CSV_URL =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQJ0t_-c4IZGg9I-e_0JKAupcDehIGIMpYNLtdxR-c3t7t2eF9I-kBM6uptEz4h_o07T6IcaAF-Qkng/pub?gid=1924897564&single=true&output=csv";

  const TARGET_ID = "collab";

  function parseCSV(text) {
    const rows = [];
    let row = [];
    let cur = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const next = text[i + 1];

      if (ch === '"' && inQuotes && next === '"') {
        cur += '"';
        i++;
        continue;
      }
      if (ch === '"') {
        inQuotes = !inQuotes;
        continue;
      }

      if (!inQuotes && (ch === "," || ch === "\n" || ch === "\r")) {
        row.push(cur);
        cur = "";

        if (ch === "\r" && next === "\n") i++;
        if (ch === "\n" || ch === "\r") {
          if (row.some((c) => String(c).trim() !== "")) rows.push(row);
          row = [];
        }
        continue;
      }

      cur += ch;
    }

    row.push(cur);
    if (row.some((c) => String(c).trim() !== "")) rows.push(row);
    return rows;
  }

  function rowsToObjects(rows) {
    if (!rows || rows.length < 2) return [];
    const header = rows[0].map((h) => String(h).trim());
    const body = rows.slice(1);

    return body.map((r) => {
      const obj = {};
      header.forEach((h, i) => (obj[h] = r[i] ?? ""));
      return obj;
    });
  }

  function escHtml(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function escAttr(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function stripScripts(html) {
    return String(html).replace(
      /<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi,
      ""
    );
  }

  function withBreaks(html) {
    return stripScripts(html).replace(/\r\n|\r|\n/g, "<br>");
  }

  function extractDriveFileId(url) {
    const s = String(url || "").trim();
    if (!s) return null;

    // /file/d/{id}/view
    const m1 = s.match(/\/file\/d\/([a-zA-Z0-9_-]{10,})/);
    if (m1) return m1[1];

    // /d/{id}
    const m2 = s.match(/\/d\/([a-zA-Z0-9_-]{10,})/);
    if (m2) return m2[1];

    // ?id={id}
    const m3 = s.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
    if (m3) return m3[1];

    // raw id만 들어온 경우
    const m4 = s.match(/^[a-zA-Z0-9_-]{10,}$/);
    if (m4) return s;

    return null;
  }

  function normalizeImageUrl(url) {
    const s = String(url || "").trim();
    if (!s) return "";

    if (s.includes("lh3.googleusercontent.com/d/")) return s;

    if (s.includes("drive.google.com")) {
      const id = extractDriveFileId(s);
      if (id) return `https://lh3.googleusercontent.com/d/${id}`;
    }

    const idOnly = extractDriveFileId(s);
    if (idOnly) return `https://lh3.googleusercontent.com/d/${idOnly}`;

    return s;
  }

  function normalizeRow(o) {
    const name = String(o.name ?? "").trim();
    const desc = String(o.desc ?? "").trim();
    const thumb = normalizeImageUrl(o.thumb);
    const link = String(o.link ?? "").trim();
    return { name, desc, thumb, link };
  }

  function initials(name) {
    const s = String(name || "").trim();
    if (!s) return "—";
    return s.slice(0, 1);
  }

  function renderCollab(items) {
    const root = document.getElementById(TARGET_ID);
    if (!root) return;

    if (!items.length) {
      root.innerHTML = `
        <div class="container">
          <div class="sec__head">
            <p class="sec__eyebrow">Collaboration</p>
            <h2 class="sec__title">협업 작가</h2>
            <p class="sec__desc">카드를 클릭하면 아트머그 링크로 이동합니다.</p>
          </div>
          <div class="card">
            <div class="notice__error">CSV 데이터/공개 설정/헤더(name, desc, thumb, link)를 확인해주세요.</div>
          </div>
        </div>
      `.trim();
      return;
    }

    const cardsHTML = items
      .map((it) => {
        const href = it.link || "#";
        const title = it.name || "작가";
        const img = it.thumb;

        return `
          <a class="tplCard collabCard"
             href="${escAttr(href)}"
             target="_blank"
             rel="noopener noreferrer">
            <div class="tplCard__thumb collabCard__thumb">
              ${
                img
                  ? `<img src="${escAttr(img)}" alt="${escAttr(title)}" loading="lazy">`
                  : `<div class="collabCard__ph" aria-hidden="true">${escHtml(initials(title))}</div>`
              }
            </div>

            <div class="tplCard__meta collabCard__meta">
              <div class="tplCard__name collabCard__name">${escHtml(title)}</div>
              ${
                it.desc
                  ? `<div class="collabCard__desc">${withBreaks(it.desc)}</div>`
                  : ``
              }
            </div>
          </a>
        `.trim();
      })
      .join("");

    root.innerHTML = `
      <div class="container">
        <div class="secHead">
          <p class="secHead__kicker">Collaboration</p>
          <h2 class="secHead__title">협업 작가</h2>
          <p class="secHead__desc">카드를 클릭하면 아트머그 링크로 이동합니다.</p>
        </div>

        <div class="card">
          <div class="tplGrid collabGrid">
            ${cardsHTML}
          </div>
        </div>
      </div>
    `.trim();
  }

  async function loadCollab() {
    const root = document.getElementById(TARGET_ID);
    if (!root) return;

    root.innerHTML = `
      <div class="container">
        <div class="secHead">
          <p class="secHead__kicker">Collaboration</p>
          <h2 class="secHead__title">협업 작가</h2>
          <p class="secHead__desc">불러오는 중…</p>
        </div>
        <div class="card">
          <div class="notice__loading">불러오는 중…</div>
        </div>
      </div>
    `.trim();

    try {
      const res = await fetch(CSV_URL, { cache: "no-store" });
      if (!res.ok) throw new Error("CSV fetch failed: " + res.status);

      const csvText = await res.text();
      const rows = parseCSV(csvText);
      if (!rows || rows.length < 2) throw new Error("CSV empty");

      const objs = rowsToObjects(rows);
      const items = objs
        .map(normalizeRow)
        .filter((it) => it.name && it.link)
        .sort((a, b) => a.name.localeCompare(b.name, "ko"));

      renderCollab(items);
    } catch (err) {
      console.warn("[collab] load failed:", err);
      renderCollab([]);
    }
  }

  document.addEventListener("DOMContentLoaded", loadCollab);
})();


/* =========================
   Sample
========================= */
(function () {
  const TARGET_ID = "sample";
  const CSV_URL =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQJ0t_-c4IZGg9I-e_0JKAupcDehIGIMpYNLtdxR-c3t7t2eF9I-kBM6uptEz4h_o07T6IcaAF-Qkng/pub?gid=1480634792&single=true&output=csv";

  const COPY = {
    kicker: "Samples",
    title: "샘플",
    desc: "카드를 클릭하시면 큰 이미지를 확인할 수 있습니다.",
  };

  const GROUP_NOTES = {
    "표정(기본)": "모든 버츄얼에 기본으로 포함되는 표정입니다.",
  };

  function parseCSV(text) {
    const rows = [];
    let row = [];
    let cur = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const next = text[i + 1];

      if (ch === '"' && inQuotes && next === '"') {
        cur += '"';
        i++;
        continue;
      }
      if (ch === '"') {
        inQuotes = !inQuotes;
        continue;
      }

      if (!inQuotes && (ch === "," || ch === "\n" || ch === "\r")) {
        row.push(cur);
        cur = "";

        if (ch === "\r" && next === "\n") i++;
        if (ch === "\n" || ch === "\r") {
          if (row.some((c) => String(c).trim() !== "")) rows.push(row);
          row = [];
        }
        continue;
      }
      cur += ch;
    }

    row.push(cur);
    if (row.some((c) => String(c).trim() !== "")) rows.push(row);
    return rows;
  }

  function rowsToObjects(rows) {
    if (!rows || rows.length < 2) return [];
    const header = rows[0].map((h) => String(h).trim());
    return rows.slice(1).map((r) => {
      const obj = {};
      header.forEach((h, i) => (obj[h] = r[i] ?? ""));
      return obj;
    });
  }

  function toNum(v) {
    const n = Number(String(v ?? "").trim());
    return Number.isFinite(n) ? n : 0;
  }

  function escHtml(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function escAttr(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function extractDriveFileId(url) {
    const s = String(url || "").trim();
    if (!s) return null;

    const m1 = s.match(/\/file\/d\/([a-zA-Z0-9_-]{10,})/);
    if (m1) return m1[1];

    const m2 = s.match(/\/d\/([a-zA-Z0-9_-]{10,})/);
    if (m2) return m2[1];

    const m3 = s.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
    if (m3) return m3[1];

    const m4 = s.match(/^[a-zA-Z0-9_-]{10,}$/);
    if (m4) return s;

    return null;
  }

  function normalizeImageUrl(url) {
    const s = String(url || "").trim();
    if (!s) return "";
    if (s.includes("lh3.googleusercontent.com/d/")) return s;

    if (s.includes("drive.google.com")) {
      const id = extractDriveFileId(s);
      if (id) return `https://lh3.googleusercontent.com/d/${id}`;
    }

    const idOnly = extractDriveFileId(s);
    if (idOnly) return `https://lh3.googleusercontent.com/d/${idOnly}`;

    return s;
  }

  function normalizeRow(o) {
    const group = String(o.group ?? "").trim();
    const order = toNum(o.order ?? 0);
    const image_url = normalizeImageUrl(o.image_url);
    const title = String(o.title ?? "").trim();
    const desc = String(o.desc ?? "").trim();
    return { group, order, image_url, title, desc };
  }

  function ensureModal() {
    let modal = document.querySelector(".imgModal");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.className = "imgModal";
    modal.setAttribute("aria-hidden", "true");
    modal.innerHTML = `
      <div class="imgModal__backdrop" data-close></div>
      <div class="imgModal__panel" role="dialog" aria-modal="true" aria-label="image modal">
        <button class="imgModal__close" type="button" data-close aria-label="close">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18"></path>
          </svg>
        </button>
        <figure class="imgModal__figure">
          <img data-img alt="">
        </figure>
      </div>
    `.trim();

    document.body.appendChild(modal);

    const close = () => {
      modal.classList.remove("is-open");
      modal.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
      const img = modal.querySelector("[data-img]");
      if (img) img.src = "";
    };

    modal.addEventListener("pointerdown", (e) => {
      const t = e.target;
      if (t && t.closest && t.closest("[data-close]")) close();
    });

    modal.addEventListener("click", (e) => {
      const t = e.target;
      if (t && t.matches && t.matches("[data-close]")) close();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal.classList.contains("is-open")) close();
    });

    modal._close = close;
    return modal;
  }

  function openModal(src, alt) {
    const modal = ensureModal();
    const img = modal.querySelector("[data-img]");
    if (img) {
      img.src = src;
      img.alt = alt || "image";
    }
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function isSliderGroup(group) {
    return (
      group === "프리미엄" ||
      group === "일반" ||
      group === "디자인 샘플" ||
      group === "삼면도"
    );
  }

  function ratioClassForGroup(group) {
    if (group === "디자인 샘플") return "sampleMedia--21";
    if (group === "삼면도") return "sampleMedia--21";
    return "sampleMedia--45";
  }

  function slideWidthForGroup(group) {
    if (group === "디자인 샘플") return "680px";
    if (group === "삼면도") return "680px";
    return "460px";
  }

  function arrowIcon(dir) {
    const d = dir === "prev" ? "M15 18l-6-6 6-6" : "M9 6l6 6-6 6";
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"></path></svg>`;
  }

  function makeGroupHead(groupTitle) {
    const note = GROUP_NOTES[groupTitle] || "";
    return `
      <div class="sampleGroup__head">
        <h3 class="sampleGroup__title">${escHtml(groupTitle)}</h3>
        ${note ? `<p class="sampleGroup__note">${escHtml(note)}</p>` : `<span></span>`}
      </div>
    `.trim();
  }

  function findInitialIndexByOrder(items, orderValue) {
    const idx = items.findIndex((it) => toNum(it.order) === orderValue);
    return idx >= 0 ? idx : 0;
  }

  function makeSlider(groupTitle, items) {
    const ratioClass = ratioClassForGroup(groupTitle);
    const slideW = slideWidthForGroup(groupTitle);
    const initialIndex = findInitialIndexByOrder(items, 1);

    const slidesHTML = items
      .map((it) => {
        const t = it.title || "";
        const d = it.desc || "";
        const img = it.image_url;

        const overlay =
          t || d
            ? `
              <div class="sampleOverlay">
                ${t ? `<h4 class="sampleTitle">${escHtml(t)}</h4>` : ``}
                ${d ? `<div class="sampleDesc">${escHtml(d).replace(/\r\n|\r|\n/g, "<br>")}</div>` : ``}
              </div>
            `.trim()
            : ``;

        return `
          <div class="sampleSlide" data-src="${escAttr(img)}" data-alt="${escAttr(t || groupTitle)}">
            <article class="sampleCard" data-open-modal>
              <div class="sampleMedia ${ratioClass}">
                ${img ? `<img src="${escAttr(img)}" alt="${escAttr(t || groupTitle)}" loading="lazy">` : ``}
                ${overlay}
              </div>
            </article>
          </div>
        `.trim();
      })
      .join("");

    const dotsHTML = items
      .map((_, i) => `<button class="sampleDot" type="button" data-go="${i}" aria-label="go ${i + 1}"></button>`)
      .join("");

    return `
      <section class="sampleGroup" data-kind="slider" data-group="${escAttr(groupTitle)}">
        ${makeGroupHead(groupTitle)}

        <div class="sampleSlider" data-slider data-initial="${initialIndex}" style="--slideW:${slideW}">
          <button class="sampleArrow sampleArrow--prev" type="button" data-prev aria-label="prev">
            ${arrowIcon("prev")}
          </button>

          <div class="sampleSlider__viewport">
            <div class="sampleTrack" data-track>
              ${slidesHTML}
            </div>
          </div>

          <button class="sampleArrow sampleArrow--next" type="button" data-next aria-label="next">
            ${arrowIcon("next")}
          </button>

          <div class="sampleDots" data-dots>
            ${dotsHTML}
          </div>
        </div>
      </section>
    `.trim();
  }

  function makeExprGrid(groupTitle, items) {
    const cardsHTML = items
      .map((it) => {
        const t = it.title || "";
        const img = it.image_url;

        return `
          <article class="exprCard" data-open-modal data-src="${escAttr(img)}" data-alt="${escAttr(t || groupTitle)}">
            <div class="sampleMedia" style="aspect-ratio:1/1;">
              ${img ? `<img src="${escAttr(img)}" alt="${escAttr(t || groupTitle)}" loading="lazy">` : ``}
            </div>
            <div class="exprMeta">
              <h4 class="exprTitle">${escHtml(t || "—")}</h4>
            </div>
          </article>
        `.trim();
      })
      .join("");

    return `
      <section class="sampleGroup" data-kind="grid" data-group="${escAttr(groupTitle)}">
        ${makeGroupHead(groupTitle)}
        <div class="exprGrid">
          ${cardsHTML}
        </div>
      </section>
    `.trim();
  }

  function initSlider(sliderRoot) {
    const track = sliderRoot.querySelector("[data-track]");
    const prevBtn = sliderRoot.querySelector("[data-prev]");
    const nextBtn = sliderRoot.querySelector("[data-next]");
    const dotsWrap = sliderRoot.querySelector("[data-dots]");
    if (!track || !dotsWrap) return;

    const groupName = sliderRoot.closest("[data-group]")?.getAttribute("data-group") || "";
    const isPremium = groupName === "프리미엄";

    const realSlides = Array.from(track.children);
    const realCount = realSlides.length;
    if (!realCount) return;

    const dots = Array.from(dotsWrap.querySelectorAll("[data-go]"));
    const initialReal = Math.max(
      0,
      Math.min(realCount - 1, toNum(sliderRoot.getAttribute("data-initial")))
    );

    const cloneCount = Math.min(2, realCount);

    const markClone = (node) => {
      node.dataset.clone = "1";
      return node;
    };

    const headClones = realSlides.slice(0, cloneCount).map((n) => markClone(n.cloneNode(true)));
    const tailClones = realSlides.slice(-cloneCount).map((n) => markClone(n.cloneNode(true)));

    tailClones.forEach((c) => track.insertBefore(c, track.firstChild));
    headClones.forEach((c) => track.appendChild(c));

    const allSlides = Array.from(track.children);
    const firstRealAbs = cloneCount;
    const lastRealAbs = cloneCount + realCount - 1;

    const setActive = (ri) => {
      dots.forEach((d) => d.classList.remove("is-active"));
      const t = dots[ri];
      if (t) t.classList.add("is-active");
    };

    const updateCenterClass = (realIndex) => {
    const slides = Array.from(track.children);
    slides.forEach((el) => el.classList.remove("is-center"));

    const absIndex = firstRealAbs + realIndex;
    const target = slides[absIndex];
    if (target) target.classList.add("is-center");
  };

    const centerLeftForAbs = (absIdx) => {
      const el = allSlides[absIdx];
      if (!el) return 0;
      const left = el.offsetLeft - (track.clientWidth - el.clientWidth) / 2;
      return Math.max(0, Math.round(left));
    };

    const centerAbsIndex = () => {
      const trackRect = track.getBoundingClientRect();
      const cx = trackRect.left + trackRect.width / 2;

      let bestAbs = firstRealAbs;
      let bestDist = Infinity;

      for (let i = 0; i < allSlides.length; i++) {
        const el = allSlides[i];
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        const scx = rect.left + rect.width / 2;
        const dist = Math.abs(scx - cx);
        if (dist < bestDist) {
          bestDist = dist;
          bestAbs = i;
        }
      }
      return bestAbs;
    };

    const absToReal = (absIdx) => {
      if (absIdx < firstRealAbs) {
        const k = firstRealAbs - absIdx;
        return realCount - k;
      }
      if (absIdx > lastRealAbs) {
        const k = absIdx - lastRealAbs;
        return k - 1;
      }
      return absIdx - firstRealAbs;
    };

    const jumpIfCloneCentered = () => {
      const abs = centerAbsIndex();
      if (abs < firstRealAbs || abs > lastRealAbs) {
        const ri = absToReal(abs);
        track.scrollTo({ left: centerLeftForAbs(firstRealAbs + ri), behavior: "auto" });
        return ri;
      }
      return abs - firstRealAbs;
    };

    const goReal = (ri, smooth) => {
      const r = (ri + realCount) % realCount;

      const prevSnap = track.style.scrollSnapType;
      track.style.scrollSnapType = "none";

      track.scrollTo({
        left: centerLeftForAbs(firstRealAbs + r),
        behavior: smooth ? "smooth" : "auto",
      });

      setActive(r);
      updateCenterClass(r);

      clearTimeout(track._snapTimer);
      track._snapTimer = setTimeout(() => {
        track.style.scrollSnapType = prevSnap || "";
      }, smooth ? 520 : 0);

      return r;
    };

    const stabilizeInitial = () => {
      const tries = isPremium ? 10 : 4;
      const interval = isPremium ? 120 : 80;
      let t = 0;

      const tick = () => {
        const ok = track.clientWidth > 0 && allSlides[firstRealAbs]?.clientWidth > 0;
        if (!ok) {
          requestAnimationFrame(tick);
          return;
        }

        goReal(initialReal, false);

        t++;
        if (t < tries) {
          setTimeout(tick, interval);
          return;
        }

        requestAnimationFrame(() => {
          goReal(initialReal, false);
          sliderRoot.dataset.ready = "1";
          setActive(initialReal);
        });
      };

      tick();
    };

    sliderRoot.dataset.ready = "0";
    stabilizeInitial();

    prevBtn?.addEventListener("click", () => {
      const cur = sliderRoot.dataset.ready === "1" ? jumpIfCloneCentered() : initialReal;
      goReal(cur - 1, true);
    });

    nextBtn?.addEventListener("click", () => {
      const cur = sliderRoot.dataset.ready === "1" ? jumpIfCloneCentered() : initialReal;
      goReal(cur + 1, true);
    });

    dots.forEach((d) => {
      d.addEventListener("click", () => {
        goReal(toNum(d.dataset.go), true);
      });
    });

    let raf = 0;
    track.addEventListener("scroll", () => {
      if (sliderRoot.dataset.ready !== "1") return;

      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (track.style.scrollSnapType === "none") return;
        const ri = jumpIfCloneCentered();
        setActive(ri);
      });
    });

    window.addEventListener(
      "resize",
      () => {
        if (sliderRoot.dataset.ready !== "1") return;
        const ri = jumpIfCloneCentered();
        goReal(ri, false);
      },
      { passive: true }
    );
  }

  function bindModalClicks(root) {
    root.addEventListener("click", (e) => {
      const card = e.target?.closest?.("[data-open-modal]");
      if (!card) return;

      const src =
        card.getAttribute("data-src") ||
        card.closest?.(".sampleSlide")?.getAttribute("data-src") ||
        "";
      const alt =
        card.getAttribute("data-alt") ||
        card.closest?.(".sampleSlide")?.getAttribute("data-alt") ||
        "image";

      if (!src) return;
      openModal(src, alt);
    });
  }

  function renderSample(items) {
    const root = document.getElementById(TARGET_ID);
    if (!root) return;

    const byGroup = new Map();
    (items || []).forEach((it) => {
      const g = String(it.group || "").trim();
      if (!g) return;
      if (!byGroup.has(g)) byGroup.set(g, []);
      byGroup.get(g).push(it);
    });

    const order = ["프리미엄", "일반", "삼면도", "디자인 샘플", "표정(기본)", "표정(추가)"];
    const groups = order.filter((k) => byGroup.has(k)).concat(
      Array.from(byGroup.keys()).filter((k) => !order.includes(k))
    );

    const bodyHTML = groups
      .map((g) => {
        const list = byGroup
          .get(g)
          .slice()
          .sort((a, b) => (a.order || 0) - (b.order || 0));

        if (isSliderGroup(g)) return makeSlider(g, list);
        return makeExprGrid(g, list);
      })
      .join("");

    root.innerHTML = `
      <div class="container sampleWrap">
        <div class="secHead">
          <p class="secHead__kicker">${escHtml(COPY.kicker)}</p>
          <h2 class="secHead__title">${escHtml(COPY.title)}</h2>
          <p class="secHead__desc">${escHtml(COPY.desc)}</p>
        </div>
        ${bodyHTML || `<div class="card"><div class="notice__error">샘플 데이터를 불러오지 못했습니다.</div></div>`}
      </div>
    `.trim();

    root.querySelectorAll("[data-slider]").forEach(initSlider);
    bindModalClicks(root);
  }

  async function loadSample() {
    const root = document.getElementById(TARGET_ID);
    if (!root) return;

    root.innerHTML = `
      <div class="container sampleWrap">
        <div class="secHead">
          <p class="secHead__kicker">${escHtml(COPY.kicker)}</p>
          <h2 class="secHead__title">${escHtml(COPY.title)}</h2>
          <p class="secHead__desc">불러오는 중…</p>
        </div>
        <div class="card"><div class="notice__loading">불러오는 중…</div></div>
      </div>
    `.trim();

    try {
      const res = await fetch(CSV_URL, { cache: "no-store" });
      if (!res.ok) throw new Error("CSV fetch failed: " + res.status);

      const csvText = await res.text();
      const rows = parseCSV(csvText);
      if (!rows || rows.length < 2) throw new Error("CSV empty");

      const objs = rowsToObjects(rows);
      const items = objs.map(normalizeRow).filter((it) => it.group && it.image_url);

      renderSample(items);
    } catch (err) {
      console.warn("[sample] load failed:", err);
      renderSample([]);
    }
  }

  document.addEventListener("DOMContentLoaded", loadSample);
})();




/* =========================
   Type
========================= */
(function () {
  const TARGET_ID = "type";

  const TYPE_CSV =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQJ0t_-c4IZGg9I-e_0JKAupcDehIGIMpYNLtdxR-c3t7t2eF9I-kBM6uptEz4h_o07T6IcaAF-Qkng/pub?gid=1028702331&single=true&output=csv";

  const SAMPLE_CSV =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQJ0t_-c4IZGg9I-e_0JKAupcDehIGIMpYNLtdxR-c3t7t2eF9I-kBM6uptEz4h_o07T6IcaAF-Qkng/pub?gid=1847465668&single=true&output=csv";

  const COPY = {
    kicker: "Type Guide",
    title: "타입 안내",
    desc: "일반 / 프리미엄 타입을 한 눈에 비교할 수 있습니다.",
    sampleTitle: "파츠분리 샘플",
  };

  function parseCSV(text) {
    const rows = [];
    let row = [];
    let cur = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const next = text[i + 1];

      if (ch === '"' && inQuotes && next === '"') {
        cur += '"';
        i++;
        continue;
      }
      if (ch === '"') {
        inQuotes = !inQuotes;
        continue;
      }

      if (!inQuotes && (ch === "," || ch === "\n" || ch === "\r")) {
        row.push(cur);
        cur = "";

        if (ch === "\r" && next === "\n") i++;
        if (ch === "\n" || ch === "\r") {
          if (row.some((c) => String(c).trim() !== "")) rows.push(row);
          row = [];
        }
        continue;
      }

      cur += ch;
    }

    row.push(cur);
    if (row.some((c) => String(c).trim() !== "")) rows.push(row);
    return rows;
  }

  function rowsToObjects(rows) {
    if (!rows || rows.length < 2) return [];
    const header = rows[0].map((h) => String(h).trim());
    const body = rows.slice(1);

    return body.map((r) => {
      const obj = {};
      header.forEach((h, i) => (obj[h] = r[i] ?? ""));
      return obj;
    });
  }

  function escHtml(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function stripScripts(html) {
    return String(html).replace(
      /<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi,
      ""
    );
  }

  function withBreaks(html) {
    return stripScripts(html).replace(/\r\n|\r|\n/g, "<br>");
  }

  function extractDriveFileId(url) {
    const s = String(url || "").trim();
    if (!s) return null;

    const m1 = s.match(/\/file\/d\/([a-zA-Z0-9_-]{10,})/);
    if (m1) return m1[1];

    const m2 = s.match(/\/d\/([a-zA-Z0-9_-]{10,})/);
    if (m2) return m2[1];

    const m3 = s.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
    if (m3) return m3[1];

    const m4 = s.match(/^[a-zA-Z0-9_-]{10,}$/);
    if (m4) return s;

    return null;
  }

  function normalizeImageUrl(url) {
    const s = String(url || "").trim();
    if (!s) return "";
    if (s.includes("lh3.googleusercontent.com/d/")) return s;

    if (s.includes("drive.google.com")) {
      const id = extractDriveFileId(s);
      if (id) return `https://lh3.googleusercontent.com/d/${id}`;
    }

    const idOnly = extractDriveFileId(s);
    if (idOnly) return `https://lh3.googleusercontent.com/d/${idOnly}`;

    return s;
  }

  function parseTypeMatrix(rows) {
    if (!rows || rows.length < 2) return { cols: [], map: {} };

    const head = rows[0].map((x) => String(x ?? "").trim());
    const colNames = head.slice(1).filter(Boolean);

    const map = {};
    colNames.forEach((c) => (map[c] = {}));

    for (let r = 1; r < rows.length; r++) {
      const key = String(rows[r][0] ?? "").trim();
      if (!key) continue;

      for (let ci = 1; ci < head.length; ci++) {
        const col = String(head[ci] ?? "").trim();
        if (!col) continue;

        const val = String(rows[r][ci] ?? "").trim();
        map[col][key] = key === "img_url" ? normalizeImageUrl(val) : val;
      }
    }

    return { cols: colNames, map };
  }

  function renderType(typeData, samples) {
    const root = document.getElementById(TARGET_ID);
    if (!root) return;

    const cols = typeData.cols || [];
    const m = typeData.map || {};

    const tableHead = `
      <thead>
        <tr>
          ${cols.map((c) => `<th>${escHtml(c)}</th>`).join("")}
        </tr>
      </thead>
    `.trim();

    const imgRow = `
      <tr>
        ${cols
          .map((c) => {
            const img = m?.[c]?.img_url || "";
            return `
              <td class="typeTable__imgCell">
                ${img ? `<img class="typeTable__img" src="${img}" alt="${escHtml(c)}" loading="lazy">` : ``}
              </td>
            `.trim();
          })
          .join("")}
      </tr>
    `.trim();

    const rowOrder = ["desc", "parts", "depict", "discount"];
    const tableBody = `
      <tbody>
        ${imgRow}
        ${rowOrder
          .map((k) => {
            const tds = cols
              .map((c) => {
                const v = m?.[c]?.[k] ?? "";
                return `<td>${v ? withBreaks(escHtml(v)) : ""}</td>`;
              })
              .join("");
            return `<tr>${tds}</tr>`;
          })
          .join("")}
      </tbody>
    `.trim();

    const sampleList = (samples || [])
      .filter((it) => String(it.group || "").trim() === "파츠분리")
      .slice()
      .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0))
      .slice(0, 2);

    const sampleHTML = sampleList
      .map((it) => {
        const img = normalizeImageUrl(it.image_url);
        const title = String(it.title ?? "").trim();
        const desc = String(it.desc ?? "").trim();
        return `
          <article class="typeSample">
            ${img ? `<img class="typeSample__img" src="${img}" alt="${escHtml(title)}" loading="lazy">` : ``}
            <div class="typeSample__cap">
              <h4 class="typeSample__name">${escHtml(title)}</h4>
              ${desc ? `<p class="typeSample__desc">${withBreaks(escHtml(desc))}</p>` : ``}
            </div>
          </article>
        `.trim();
      })
      .join("");

    root.innerHTML = `
      <div class="container typeWrap">
        <div class="secHead">
          <p class="secHead__kicker">${escHtml(COPY.kicker)}</p>
          <h2 class="secHead__title">${escHtml(COPY.title)}</h2>
          <p class="secHead__desc">${escHtml(COPY.desc)}</p>
        </div>

        <div class="card typeCard">
          <table class="typeTable">
            ${tableHead}
            ${tableBody}
          </table>

          <div class="typeDivider"></div>

          <div class="typeSampleHead">
            <h3 class="typeSampleTitle">${escHtml(COPY.sampleTitle)}</h3>
            <p class="typeSampleNote">${escHtml(COPY.sampleNote)}</p>
          </div>

          <div class="typeSampleGrid">
            ${sampleHTML || ""}
          </div>
        </div>
      </div>
    `.trim();
  }

  async function loadType() {
    const root = document.getElementById(TARGET_ID);
    if (!root) return;

    root.innerHTML = `
      <div class="container typeWrap">
        <div class="secHead">
          <p class="secHead__kicker">${escHtml(COPY.kicker)}</p>
          <h2 class="secHead__title">${escHtml(COPY.title)}</h2>
          <p class="secHead__desc">불러오는 중…</p>
        </div>
        <div class="card typeCard">
          <div class="notice__loading">불러오는 중…</div>
        </div>
      </div>
    `.trim();

    try {
      const [a, b] = await Promise.all([
        fetch(TYPE_CSV, { cache: "no-store" }),
        fetch(SAMPLE_CSV, { cache: "no-store" }),
      ]);

      if (!a.ok) throw new Error("Type CSV fetch failed: " + a.status);
      if (!b.ok) throw new Error("Sample CSV fetch failed: " + b.status);

      const [tText, sText] = await Promise.all([a.text(), b.text()]);

      const typeRows = parseCSV(tText);
      const typeData = parseTypeMatrix(typeRows);

      const sampleRows = parseCSV(sText);
      const sampleObjs = rowsToObjects(sampleRows);

      renderType(typeData, sampleObjs);
    } catch (err) {
      console.warn("[type] load failed:", err);
      renderType({ cols: [], map: {} }, []);
    }
  }

  document.addEventListener("DOMContentLoaded", loadType);
})();




/* =========================
   Notice
========================= */
(function () {
  const TARGET_ID = "notice";

  const COPYRIGHT_CSV =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQJ0t_-c4IZGg9I-e_0JKAupcDehIGIMpYNLtdxR-c3t7t2eF9I-kBM6uptEz4h_o07T6IcaAF-Qkng/pub?gid=876883445&single=true&output=csv";

  const NOTICE_CSV =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQJ0t_-c4IZGg9I-e_0JKAupcDehIGIMpYNLtdxR-c3t7t2eF9I-kBM6uptEz4h_o07T6IcaAF-Qkng/pub?gid=996091792&single=true&output=csv";

  const COPY = {
    kicker: "Notice",
    title: "작업 전 안내",
    desc: "공지사항을 읽지 않아 생기는 피해엔 책임지지 않습니다! 문의 전 꼭 읽어주세요!",
    tableTitle: "저작권",
    listTitle: "안내",
    processTitle: "작업 프로세스",
  };

  const PROCESS_STEPS = [
    "문의 및 견적",
    "디자인 시안(컨펌)",
    "러프&디테일(컨펌)",
    "일러스트 진행(중간과정 공유)",
    "완성(최종컨펌)",
    "파츠분리 후 전달",
  ];

  function stripScripts(html) {
    return String(html).replace(
      /<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi,
      ""
    );
  }

  function withBreaks(html) {
    return stripScripts(html).replace(/\r\n|\r|\n/g, "<br>");
  }

  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function parseCSV(text) {
    const rows = [];
    let row = [];
    let cur = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const next = text[i + 1];

      if (ch === '"' && inQuotes && next === '"') {
        cur += '"';
        i++;
        continue;
      }
      if (ch === '"') {
        inQuotes = !inQuotes;
        continue;
      }

      if (!inQuotes && (ch === "," || ch === "\n" || ch === "\r")) {
        row.push(cur);
        cur = "";

        if (ch === "\r" && next === "\n") i++;
        if (ch === "\n" || ch === "\r") {
          if (row.some((c) => String(c).trim() !== "")) rows.push(row);
          row = [];
        }
        continue;
      }

      cur += ch;
    }

    row.push(cur);
    if (row.some((c) => String(c).trim() !== "")) rows.push(row);
    return rows;
  }

  function rowsToObjects(rows) {
    if (!rows || rows.length < 2) return [];
    const header = rows[0].map((h) => String(h).trim());
    return rows.slice(1).map((r) => {
      const obj = {};
      header.forEach((h, i) => (obj[h] = r[i] ?? ""));
      return obj;
    });
  }

  function toNum(v) {
    const n = Number(String(v ?? "").trim());
    return Number.isFinite(n) ? n : 0;
  }

  function normalizeNoticeRow(o) {
    const group = String(o.group ?? "").trim();
    const order = toNum(o.order ?? 0);
    const desc = String(o.desc ?? "").trim();
    return { group, order, desc };
  }

  function cellToChip(v) {
    const s = String(v ?? "").trim();
    const u = s.toUpperCase();
    if (u === "O") return `<span class="noticeChip noticeChip--o">O</span>`;
    if (u === "X") return `<span class="noticeChip noticeChip--x">X</span>`;
    if (!s) return "";
    return esc(s);
  }

  function renderCopyrightTable(rows) {
    if (!rows || rows.length < 2) {
      return `<div class="notice__error">저작권 표를 불러오지 못했습니다.</div>`;
    }

    const head = rows[0].map((x) => String(x ?? "").trim()).filter((x) => x !== "");
    const body = rows
      .slice(1)
      .filter((r) => r.some((c) => String(c ?? "").trim() !== ""));

    const thead = `
      <thead>
        <tr>
          ${head.map((h) => `<th>${esc(h)}</th>`).join("")}
        </tr>
      </thead>
    `.trim();

    const tbody = `
      <tbody>
        ${body
          .map((r) => {
            const cells = head.map((_, i) => String(r[i] ?? "").trim());
            const first = cells[0] || "";
            const rest = cells.slice(1);

            const tds = rest
              .map((c, idx) => {
                if (idx === 0) {
                  const fee = c ? `<span class="noticeFee">${esc(c)}</span>` : "";
                  return `<td>${fee}</td>`;
                }
                return `<td>${cellToChip(c)}</td>`;
              })
              .join("");

            return `<tr><th>${esc(first)}</th>${tds}</tr>`;
          })
          .join("")}
      </tbody>
    `.trim();

    return `
      <div class="noticeTableWrap">
        <table class="noticeTable">
          ${thead}
          ${tbody}
        </table>
      </div>
    `.trim();
  }

  function renderGroupedNotices(items) {
    if (!items || !items.length) {
      return `<div class="notice__error">공지사항을 불러오지 못했습니다.</div>`;
    }

    const byGroup = new Map();
    items.forEach((it) => {
      const g = it.group || "기타";
      if (!byGroup.has(g)) byGroup.set(g, []);
      byGroup.get(g).push(it);
    });

    const groups = Array.from(byGroup.keys());

    return `
      <div class="noticeGroups">
        ${groups
          .map((g) => {
            const list = byGroup
              .get(g)
              .slice()
              .sort((a, b) => (a.order || 0) - (b.order || 0));

            const lis = list
              .map((it) => {
                const d = it.desc || "";
                return `
                  <li class="noticeItem">
                    <div class="noticeItem__desc">${d ? withBreaks(esc(d)) : ""}</div>
                  </li>
                `.trim();
              })
              .join("");

            return `
              <section class="noticeGroup">
                <div class="noticeGroup__head">
                  <h3 class="noticeGroup__title">${esc(g)}</h3>
                  <p class="noticeGroup__meta">${list.length}개</p>
                </div>
                <ul class="noticeList">${lis}</ul>
              </section>
            `.trim();
          })
          .join("")}
      </div>
    `.trim();
  }

  function renderProcess() {
    return `
      <div class="processWrap">
        <div class="noticeProcess">
          <div class="noticeProcess__head">
            <h3 class="noticeProcess__title">${esc(COPY.processTitle)}</h3>
            <p class="noticeProcess__sub">${esc(COPY.processSub)}</p>
          </div>
      
        <ol class="noticeSteps">
          ${PROCESS_STEPS.map(
            (t, i) => `
              <li class="noticeStep">
                <span class="noticeStep__no">${i + 1}</span>
                <span class="noticeStep__label">${esc(t)}</span>
              </li>
            `.trim()
          ).join("")}
        </ol>
      </div>
      </div>
    `.trim();
  }

  function renderNotice(copyrightRows, noticeItems) {
    const root = document.getElementById(TARGET_ID);
    if (!root) return;

    const tableHTML = renderCopyrightTable(copyrightRows);
    const listHTML = renderGroupedNotices(noticeItems);
    const processHTML = renderProcess();

    root.innerHTML = `
      <div class="container noticeWrap">
        <div class="secHead">
          <p class="secHead__kicker">${esc(COPY.kicker)}</p>
          <h2 class="secHead__title">${esc(COPY.title)}</h2>
          <p class="secHead__desc">${esc(COPY.desc)}</p>
        </div>

        <div class="card noticeCard">
          <div class="noticeGrid">
            <div class="noticePanel__body">
              ${tableHTML}
            </div>
              <div class="copyrightGuide">
                ⯌기업세 저작권 제외, 기업적 사용은 불가합니다. 
                만약 개인세에서 기업세로 전환 시, 초과된 저작권 비용을 추가로 지불해야 합니다.
              </div>
            <section class="noticePanel">
              <div class="noticePanel__head">
                <h3 class="noticePanel__title">${esc(COPY.listTitle)}</h3>
                <p class="noticePanel__sub"></p>
              </div>
              <div class="noticePanel__body">
                ${listHTML}
                ${processHTML}
              </div>
            </section>

          </div>
        </div>
      </div>
    `.trim();
  }

  async function loadNotice() {
    const root = document.getElementById(TARGET_ID);
    if (!root) return;

    root.innerHTML = `
      <div class="container noticeWrap">
        <div class="secHead">
          <p class="secHead__kicker">${esc(COPY.kicker)}</p>
          <h2 class="secHead__title">${esc(COPY.title)}</h2>
          <p class="secHead__desc">불러오는 중…</p>
        </div>
        <div class="card noticeCard">
          <div class="notice__loading">불러오는 중…</div>
        </div>
      </div>
    `.trim();

    try {
      const [a, b] = await Promise.all([
        fetch(COPYRIGHT_CSV, { cache: "no-store" }),
        fetch(NOTICE_CSV, { cache: "no-store" }),
      ]);

      if (!a.ok) throw new Error("Copyright CSV fetch failed: " + a.status);
      if (!b.ok) throw new Error("Notice CSV fetch failed: " + b.status);

      const [t1, t2] = await Promise.all([a.text(), b.text()]);

      const tableRows = parseCSV(t1);
      const noticeRows = parseCSV(t2);
      const noticeItems = rowsToObjects(noticeRows).map(normalizeNoticeRow);

      renderNotice(tableRows, noticeItems);
    } catch (err) {
      console.warn("[notice] load failed:", err);
      renderNotice([], []);
    }
  }

  document.addEventListener("DOMContentLoaded", loadNotice);
})();

  (() => {
    const $ = (s, r = document) => r.querySelector(s);

    const form = $("#commissionForm");
    const btnCopy = $("#btnCopyForm");
    const btnReset = $("#btnResetForm");
    const toast = $("#formToast");

    const getValue = (name) => {
      const el = form.querySelector(`[name="${name}"]`);
      if (!el) return "";
      if (el.type === "radio") {
        const checked = form.querySelector(`[name="${name}"]:checked`);
        return checked ? checked.value.trim() : "";
      }
      return (el.value || "").trim();
    };

    const showToast = (msg) => {
      toast.textContent = msg;
      toast.classList.add("is-on");
      clearTimeout(showToast._t);
      showToast._t = setTimeout(() => toast.classList.remove("is-on"), 1400);
    };

    const buildText = () => {
      const nickname = getValue("nickname");
      const platform = getValue("platform");
      const sns = getValue("sns");
      const debut = getValue("debut");
      const options = getValue("options");
      const portfolio = getValue("portfolio");
      const copyright = getValue("copyright");
      const collab = getValue("collab");
      const concept = getValue("concept");
      const requests = getValue("requests");

      const line = (n, v) => `${n} ${v || ""}`.trimEnd();
      const block = (n, v) => `${n}\n${v || ""}`.trimEnd();

      return [
        "신청 양식",
        "⯌ 예약 확정 시 필수로 작성 바랍니다.",
        "",
        line("1. 활동 닉네임(KR/EN)", nickname),
        line("2. 방송 플랫폼", platform),
        line("3. SNS", sns),
        line("4. 데뷔 예정일", debut),
        line("5. 추가옵션", options),
        line("6. 포트폴리오 공개 여부", portfolio),
        line("7. 저작권 구매", copyright),
        line("8. 협업", collab),
        "",
        block("9. 캐릭터컨셉 자료 (이미지 필수)", concept),
        "",
        block("10. 기타 요구사항", requests)
      ].join("\n");
    };

    const copyToClipboard = async (text) => {
      try {
        await navigator.clipboard.writeText(text);
        showToast("복사 완료!");
      } catch (e) {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        try {
          document.execCommand("copy");
          showToast("복사 완료!");
        } catch (e2) {
          showToast("복사 실패… 브라우저 권한 확인");
        }
        document.body.removeChild(ta);
      }
    };

    btnCopy.addEventListener("click", () => {
      const text = buildText();
      copyToClipboard(text);
    });

    btnReset.addEventListener("click", () => {
      form.reset();
      showToast("초기화 완료!");
    });

  })();
