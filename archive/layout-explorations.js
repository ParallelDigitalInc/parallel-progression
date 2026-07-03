/* ============================================================================
   ARCHIVED LAYOUT EXPLORATIONS — NOT loaded by the app.
   ----------------------------------------------------------------------------
   The progression view originally shipped three interchangeable layouts, chosen
   with a bottom-right switcher pill:
     A · Tripod-led  — the tripod is the hero, competencies as head buttons + legs
     B · Spider-led  — a radar chart on the tripod's head card  ← KEPT (the app)
     C · Plan        — the comparison table as an ordered action plan

   As of 2026-07-03 Shreya chose Spider (B) as the single layout. The switcher
   and the A/C code were removed from the frontend and parked here for reference,
   in case we want to resurface other approaches later.

   These functions depend on the app.js IIFE scope (S, modelItems, legs, head,
   nameOf, cellOf, tripodSVG, panelHTML, meterHTML, chevSVG, esc, RC, TAG, MEAN,
   focusQueue, deltaPhrase, CUR_OPTIONS, DES_OPTIONS, selChev, nRated, gapCounts,
   itemSlugs, prio, …) — they are NOT runnable standalone. To re-enable, paste the
   relevant pieces back into app.js and restore the wiring described at the bottom.
   ============================================================================ */

// --- shared-ish helpers these layouts needed ---
const planOrder = () => modelItems().sort((a, b) => prio(a) - prio(b));
const focusLine = it => deltaPhrase(it);

// roleSelect — the paired current/desired dropdowns used by Layout C's role bar.
function roleSelect(kind, bare) {
  const opts = (kind === 'cur' ? CUR_OPTIONS : DES_OPTIONS)
    .map(r => `<option value="${esc(r)}" ${(kind === 'cur' ? S.cur : S.des) === r ? 'selected' : ''}>${esc(r)}</option>`)
    .join('');
  return `<div class="select-wrap ${bare ? 'bare' : ''}">
    <select data-role="${kind}">${opts}</select>${selChev(bare ? 12 : 14, bare ? 8 : 9)}
  </div>`;
}

// gapStripHTML — the progress read: one segment per competency, coloured by rating.
function gapStripHTML() {
  const n = nRated();
  const c = gapCounts();
  const segs = modelItems().map(it =>
    `<i title="${esc(it.name)}${it.rating ? ' · ' + it.rating : ' · not assessed'}"
      style="background:${it.rating ? RC[it.rating] : '#E9E9E9'};"></i>`).join('');
  if (n === 0) {
    return `<div class="gap-strip">
      <div class="gap-strip-top">
        <div>
          <div class="gap-title">Step 1 · Rate yourself against <span class="gap-role">${esc(S.cur)}</span></div>
          <div class="gap-legend">${itemSlugs().length} competencies, about two minutes. Your spider, focus areas and gaps all build from it.</div>
        </div>
        <button class="banner-btn primary" data-action="assess-open">Start Self Assessment</button>
      </div>
      <div class="gap-bar">${segs}</div>
    </div>`;
  }
  const legend = [c.leading && `${c.leading} leading`, c.established && `${c.established} established`,
    c.building && `${c.building} building`, c.unrated && `${c.unrated} not assessed`]
    .filter(Boolean).join(' · ');
  return `<div class="gap-strip">
    <div class="gap-strip-top">
      <div>
        <div class="gap-title">Toward <span class="gap-role">${esc(S.des)}</span></div>
        <div class="gap-legend">${legend}</div>
      </div>
      <button class="banner-btn" data-action="assess-open">Edit Self Assessment<svg width="13" height="13" viewBox="0 0 14 14" style="display:block;"><path d="M9.9 1.6 L12.4 4.1 L5.4 11.1 L2.4 11.6 L2.9 8.6 Z" fill="none" stroke="#161616" stroke-width="1.2" stroke-linejoin="round"/></svg></button>
    </div>
    <div class="gap-bar">${segs}</div>
  </div>`;
}

// focusBlockHTML — "Focus next": top three by gap, straight into the comparison.
// (Was already unused before archiving.)
function focusBlockHTML() {
  if (nRated() === 0) {
    return `<div class="focus-block">
      <div class="focus-label">Focus next</div>
      <div class="focus-empty">Your focus areas appear here once you've rated yourself.</div>
    </div>`;
  }
  const q = focusQueue().slice(0, 3);
  if (!q.length) {
    return `<div class="focus-block">
      <div class="focus-label">Focus next</div>
      <div class="focus-empty">All at Leading. Bring it to your lead.</div>
    </div>`;
  }
  const rows = q.map(it => `<div class="focus-row">
    ${meterHTML(it.slug)}
    <div class="focus-main">
      <div class="focus-name">${esc(it.name)}</div>
      <div class="focus-line">${esc(focusLine(it))}</div>
    </div>
    ${it.rating
      ? `<button class="focus-cta" data-action="focus:${esc(it.slug)}">Compare →</button>`
      : `<button class="focus-cta" data-action="assess-at:${esc(it.slug)}">Rate</button>`}
  </div>`).join('');
  return `<div class="focus-block">
    <div class="focus-label">Focus next</div>
    ${rows}
  </div>`;
}

// ---------- Layout A · tripod-led ----------
function tripodViewHTML() {
  const H = head();
  const headBtns = H.map((slug, i) => {
    // last item spans full width only when the head count is odd (no lonely gap)
    const full = (i === H.length - 1 && H.length % 2 === 1) ? ' full' : '';
    const focused = S.focus === slug ? ' focused' : '';
    return `<button class="head-btn${full}${focused}" data-action="focus:${esc(slug)}">${esc(nameOf(slug))}</button>`;
  }).join('');
  const legLabels = legs().map((slug, i) =>
    `<button class="leg-label leg-label-${i} ${S.focus === slug ? 'focused' : ''}" data-action="focus:${esc(slug)}" data-leg="${i}">
      <span>${esc(nameOf(slug))}</span>
    </button>`).join('');
  return `<div class="tri-body">
    <div class="tri-left">
      <div class="tri-stage">
        ${tripodSVG()}
        <div class="head-card"><div class="head-grid">${headBtns}</div></div>
        ${legLabels}
        <button class="tri-what" data-action="modal-open">What does this tripod mean?</button>
      </div>
    </div>
    ${panelHTML()}
  </div>`;
}

// ---------- Layout C · the plan ----------
function planRowHTML(it, idx) {
  const open = !!S.open[it.slug];
  const L = cellOf(it.slug, S.cur), D = cellOf(it.slug, S.des);
  const focusIdx = idx < 3 && it.rank < 3 ? `<span class="plan-num">${idx + 1}</span>` : '<span class="plan-num ghost"></span>';
  const tag = it.rating
    ? `<span class="tagpill" title="${esc(MEAN[it.rating])}" style="background:${TAG[it.rating].bg};color:${TAG[it.rating].fg};">${it.rating.toUpperCase()}</span>`
    : `<span class="tagpill ghost">NOT ASSESSED</span>`;
  const col = (label, lines) => `<div>
    <div class="col-label">${label}</div>
    <div class="col-summary">${esc(lines[0] || 'Not evaluated at this level.')}</div>
    ${open ? lines.slice(1).map(ln => `<div class="col-line">${esc(ln)}</div>`).join('') : ''}
  </div>`;
  return `<div class="card plan-card" data-acc="${esc(it.slug)}">
    <div class="plan-head">
      <button class="plan-toggle" data-action="toggle:${esc(it.slug)}">
        ${focusIdx}
        <span class="card-title">${esc(it.name)}</span>
        ${tag}
        ${meterHTML(it.slug)}
        ${chevSVG(open)}
      </button>
      <button class="plan-rate" data-action="assess-at:${esc(it.slug)}">${it.rating ? 'Edit' : 'Rate'}</button>
    </div>
    <div class="card-body">
      ${col('Current', L)}
      ${col('Desired', D)}
    </div>
  </div>`;
}

function planViewHTML() {
  const items = planOrder();
  return `<div class="plan-body" data-keepscroll="plan">
    <div class="plan-inner">
      ${gapStripHTML()}
      <div class="rolebar plan-rolebar">
        <div class="rolecell"><div class="rolecell-label">Current</div>${roleSelect('cur', false)}</div>
        <div class="rolecell"><div class="rolecell-label">Desired</div>${roleSelect('des', false)}</div>
      </div>
      <div class="plan-hint">Ordered by where the gap is biggest — the core three first. Open a row to compare current against desired.</div>
      ${items.map(planRowHTML).join('')}
    </div>
  </div>`;
}

// ---------- The layout switcher (bottom-right pill) ----------
function switcherHTML() {
  const btn = (k, label) =>
    `<button class="${S.layout === k ? 'on' : ''}" data-action="layout:${k}">${label}</button>`;
  return `<div class="layout-switch">
    <span>Layouts</span>
    ${btn('a', 'A · Tripod')}
    ${btn('b', 'B · Spider')}
    ${btn('c', 'C · Plan')}
  </div>`;
}

/* ----------------------------------------------------------------------------
   WIRING TO RESTORE (in app.js):
   - State: `S.layout` ('a'|'b'|'c', default) + `LS_LAYOUT` persistence:
       const savedLayout = localStorage.getItem(LS_LAYOUT);
       if (savedLayout === 'a' || savedLayout === 'b' || savedLayout === 'c') S.layout = savedLayout;
   - mainViewHTML():
       if (S.view === 'table') return tableViewHTML();
       if (S.layout === 'b') return spiderViewHTML();
       if (S.layout === 'c') return planViewHTML();
       return tripodViewHTML();
   - render(): append `${switcherHTML()}` to the app innerHTML.
   - appbar(): const mainLabel = S.layout === 'c' ? 'Plan view' : 'Tripod view';
   - click handler:
       if (a.startsWith('layout:')) {
         const layout = a.slice(7);
         try { localStorage.setItem(LS_LAYOUT, layout); } catch (err) {}
         setState({ layout, view: 'tripod' });
         return;
       }
   - CSS for A/C (.tri-*, .head-*, .plan-*, .gap-*, .focus-*, .layout-switch, .rolebar)
     still lives in styles.css.
   ---------------------------------------------------------------------------- */
