/* Parallel Progression: option 4a from "Progression Explorations", extended with three
   "actionable progress" layout explorations:
     A · Tripod-led: 4a with a gap strip, rating dots, and a focus queue
     B · Spider-led: radar chart (ratings vs the desired-role bar) as the hero
     C · Plan: the comparison table as an ordered action plan
   Progress = gap to the desired role. Switch layouts with the pill, bottom left. */

(() => {
  const LS_RATINGS = 'parallel-progression-ratings-v1';
  const LS_ONBOARDED = 'parallel-progression-onboarded-v1';
  const LS_DEMO_USER = 'parallel-progression-demo-user-v1';

  // ---------- Auth / Supabase ----------
  // ADMIN MASTER LIST: only these emails see the Admin view and can read every
  // user's data. Add rollout admins here (lowercase), and MIRROR the same list in
  // is_admin() in schema.sql so the database enforces it too (RLS), not just the UI.
  const SUPERADMINS = [
    'shreya@parallelhq.com',        // Design Lead
    'robin@parallelhq.com',         // Design Director / Founder
    'haripriya.vellodi@parallelhq.com', // Project Delivery Manager
    'kriti@parallelhq.com'          // Human Resources
  ];
  const CFG = window.PP_CONFIG || {};
  // ?demo=1 forces local demo mode even when Supabase is configured (for testing).
  const DEMO_FORCED = new URLSearchParams(location.search).has('demo');
  const sb = (!DEMO_FORCED && CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY && window.supabase)
    ? window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY)
    : null;
  let USER = null; // { id, email, name }
  const isAdmin = () => !!USER && SUPERADMINS.includes((USER.email || '').toLowerCase());

  const NAMES = {
    'ux-design-ideation': 'UX Design & Ideation', 'taste-judgement': 'Taste & Judgement',
    'product-sense': 'Product Sense', 'visual-craft': 'Visual Craft', 'systems-thinking': 'Systems Thinking',
    'data-evidence': 'Data & Evidence', 'shipping-delivery': 'Shipping & Delivery',
    'influence': 'Influence', 'ai-native': 'AI Native',
    'talent-dev-develop-the-best': 'Develop the Best', 'designer-growth-development': 'Designer Growth & Development'
  };
  // Tracks come from rubric_data.json → tripod.groups. The CURRENT role picks the
  // track: IC (PD…Principal) vs Lead+ (Design Lead, ADD, DD). Each track has its
  // own three legs and its own head, so the whole rubric reshapes when you switch.
  const IC_FALLBACK = {
    legs: ['ux-design-ideation', 'visual-craft', 'product-sense'],
    head: ['taste-judgement', 'systems-thinking', 'data-evidence', 'shipping-delivery', 'influence']
  };
  function trackKeyFor(role) {
    const g = DATA && DATA.tripod && DATA.tripod.groups;
    if (g) for (const k in g) if ((g[k].roles || []).includes(role)) return k;
    return 'ic';
  }
  function trackCfg() {
    const g = DATA && DATA.tripod && DATA.tripod.groups;
    const k = trackKeyFor(S.cur);
    return (g && g[k]) || IC_FALLBACK;
  }
  const legs = () => trackCfg().legs || IC_FALLBACK.legs;
  const head = () => trackCfg().head || IC_FALLBACK.head;
  const isLeadTrack = () => trackKeyFor(S.cur) === 'lead_plus';

  // AI-Native Foundations quiz (ai-native.html): level/persona names for the
  // Admin AI view. Keep in sync with LNAME/PERSONA in ai-native.html.
  const AI_TRACKS = {
    with: {
      label: 'Designing with AI', soft: '#F3EDFB', ink: '#7C4FD0',
      levels: { 1: 'Dabbler', 2: 'Operator', 3: 'Fluent', 4: 'Orchestrator' },
      personas: { 1: 'The Tourist', 2: 'The Regular', 3: 'The Pilot', 4: 'The Conductor' }
    },
    for: {
      label: 'Designing for AI', soft: '#FAF1E8', ink: '#A9622C',
      levels: { 1: 'Bolt-on', 2: 'Pattern-aware', 3: 'Trust & failure designer', 4: 'Systems & feedback designer' },
      personas: { 1: 'The Magician', 2: 'The Matchmaker', 3: 'The Diplomat', 4: 'The Architect' }
    }
  };

  const RC = { building: '#D9A868', established: '#7C9EDC', leading: '#6FBF8F' };
  const TAG = {
    building: { bg: 'rgba(217,168,104,0.18)', fg: '#9C7335' },
    established: { bg: 'rgba(124,158,220,0.12)', fg: '#7C9EDC' },
    leading: { bg: 'rgba(111,191,143,0.22)', fg: '#3F8A60' }
  };
  const MEAN = {
    building: 'Building: working towards it, not yet consistently at this role’s bar.',
    established: 'Established: meeting expectations for this role.',
    leading: 'Leading: consistently showing next-role behaviours.'
  };
  const RATES = ['building', 'established', 'leading'];
  const RANK = { building: 1, established: 2, leading: 3 };

  const FALLBACK_ROLES = ['Intern', 'Associate Product Designer', 'Product Designer II', 'Senior Product Designer',
    'Staff Product Designer', 'Principal Product Designer', 'Design Lead', 'Associate Design Director', 'Design Director'];
  const CUR_OPTIONS = ['Product Designer II', 'Senior Product Designer', 'Staff Product Designer',
    'Principal Product Designer', 'Design Lead', 'Associate Design Director'];
  const DES_OPTIONS = CUR_OPTIONS.concat(['Design Director']);

  let DATA = null;
  let baseSlug = 'ai-native';

  const S = {
    route: 'boot',                     // boot | landing | app | admin
    view: 'tripod', tview: 'compare',  // 'tripod' slot hosts the spider layout; 'table' the table view
    cur: 'Product Designer II', des: 'Senior Product Designer',
    open: { 'ux-design-ideation': true }, ratings: {}, notes: {},
    focus: 'ux-design-ideation', modal: false, assess: false, step: 0, onboard: false,
    adminData: null, adminError: null, chipOpen: false, adminView: 'progression',
    adminWidth: localStorage.getItem('parallel-progression-admin-width-v1') || 'comfortable'
  };
  const ADMIN_COLW = { compact: 190, comfortable: 240, wide: 340 };

  try { S.ratings = JSON.parse(localStorage.getItem(LS_RATINGS) || '{}'); } catch (e) { S.ratings = {}; }
  try { S.notes = JSON.parse(localStorage.getItem('parallel-progression-notes-v1') || '{}'); } catch (e) { S.notes = {}; }

  const root = document.getElementById('root');
  const esc = s => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const clean = s => (s || '').replace(/\.\s*$/, '');
  const roles = () => (DATA ? DATA.roles : FALLBACK_ROLES);
  const ladder = () => roles().filter(r => r !== 'Intern' && r !== 'Associate Product Designer');
  const bySlug = slug => DATA ? DATA.competencies.find(c => c.slug === slug) : null;
  const cellOf = (slug, role) => { const c = bySlug(slug); return c ? (c.cells[role] || []) : []; };
  const nameOf = slug => NAMES[slug] || (bySlug(slug) ? clean(bySlug(slug).name) : slug);

  // Assessment/ladder order: legs, base, head, as in the design logic.
  // AI Native (the old tripod base) has moved to its own page; the rubric here
  // assesses the three legs + the head. See baseSlug only for legacy data reads.
  const itemSlugs = () => [...legs(), ...head()];
  // Card list order: the rubric's own competency order, filtered to the tripod slugs.
  const cardSlugs = () => {
    const set = new Set(itemSlugs());
    return DATA ? DATA.competencies.map(c => c.slug).filter(s => set.has(s)) : itemSlugs();
  };
  const nRated = () => itemSlugs().filter(s => S.ratings[s]).length;

  // ---------- Gap model (progress = distance to the desired role) ----------

  function modelItems() {
    return itemSlugs().map(slug => {
      const rating = S.ratings[slug] || null;
      return {
        slug, name: nameOf(slug), rating,
        rank: rating ? RANK[rating] : 0,
        isLeg: legs().includes(slug), isBase: slug === baseSlug
      };
    });
  }
  function gapCounts() {
    const m = modelItems();
    const count = r => m.filter(i => i.rating === r).length;
    return { leading: count('leading'), established: count('established'), building: count('building'), unrated: m.filter(i => !i.rating).length };
  }
  // Priority: not-assessed first (you can't see the gap), then Building, then Established.
  // Within a group: legs before base before head: the core three matter most.
  const prio = it => it.rank * 10 + (it.isLeg ? 0 : it.isBase ? 1 : 2);
  const focusQueue = () => modelItems().filter(it => it.rank < 3).sort((a, b) => prio(a) - prio(b));

  // The three-dot rating meter (from Plan view), used across all layouts.
  const meterHTML = slug => {
    const r = S.ratings[slug];
    const rk = r ? RANK[r] : 0;
    return `<span class="plan-meter" title="${esc(r ? MEAN[r] : 'Not assessed yet.')}">${RATES.map(rt =>
      `<i class="plan-meter-dot" style="background:${rk >= RANK[rt] ? RC[r] : '#ECECEC'};"></i>`).join('')}</span>`;
  };

  function setState(patch) {
    Object.assign(S, patch);
    render();
  }

  function saveRatings() {
    try { localStorage.setItem(LS_RATINGS, JSON.stringify(S.ratings)); } catch (e) {}
  }

  function saveNotes() {
    try { localStorage.setItem('parallel-progression-notes-v1', JSON.stringify(S.notes)); } catch (e) {}
  }

  // ---------- Supabase persistence ----------

  function persistRating(slug) {
    if (!sb || !USER) return;
    const rating = S.ratings[slug];
    const q = rating
      ? sb.from('self_evaluations').upsert({
          user_id: USER.id, competency_slug: slug, rating,
          evidence_note: S.notes[slug] || null,
          role_at_eval: S.cur, updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,competency_slug' })
      : sb.from('self_evaluations').delete().match({ user_id: USER.id, competency_slug: slug });
    q.then(({ error }) => { if (error) console.error('[supabase] save rating:', error.message); });
  }

  function persistProfile() {
    if (!sb || !USER) return;
    sb.from('users').update({ role: S.cur, desired_role: S.des }).eq('id', USER.id)
      .then(({ error }) => { if (error) console.error('[supabase] save profile:', error.message); });
  }

  // ---------- Auth flow ----------

  async function handleSignedIn(authUser) {
    const meta = authUser.user_metadata || {};
    USER = {
      id: authUser.id,
      email: authUser.email,
      name: meta.full_name || meta.name || authUser.email,
      avatar: meta.avatar_url || meta.picture || null
    };
    if (sb) {
      try {
        await sb.from('users').upsert(
          { id: USER.id, email: USER.email, full_name: USER.name }, { onConflict: 'id' });
        const { data: prof } = await sb.from('users')
          .select('role,desired_role').eq('id', USER.id).single();
        if (prof && CUR_OPTIONS.includes(prof.role)) S.cur = prof.role;
        if (prof && DES_OPTIONS.includes(prof.desired_role)) S.des = prof.desired_role;
        // Roster is the source of truth for a person's real current role; it
        // wins over any stored value and auto-sets the right track on login.
        const { data: r } = await sb.from('roster')
          .select('role').eq('email', (USER.email || '').toLowerCase()).maybeSingle();
        if (r && CUR_OPTIONS.includes(r.role)) {
          S.cur = r.role;
          // Bump desired from DES_OPTIONS (the org ladder), NOT the raw rubric
          // roles: that list still carries Intern and Associate PD, which the
          // org doesn't use, and an early build wrote one of those into the DB.
          if (DES_OPTIONS.indexOf(S.des) <= DES_OPTIONS.indexOf(S.cur)) {
            S.des = DES_OPTIONS[Math.min(DES_OPTIONS.indexOf(S.cur) + 1, DES_OPTIONS.length - 1)];
          }
          if (!prof || prof.role !== S.cur) sb.from('users').update({ role: S.cur }).eq('id', USER.id).then(() => {});
        }
        // Self-heal stale rows: if the stored desired role isn't on the org
        // ladder (e.g. "Associate Product Designer"), write back the corrected
        // pair so Admin stops showing roles that don't exist here.
        if (prof && prof.desired_role && !DES_OPTIONS.includes(prof.desired_role)) persistProfile();
        const { data: evals } = await sb.from('self_evaluations')
          .select('competency_slug,rating,evidence_note').eq('user_id', USER.id);
        if (evals) {
          S.ratings = {}; S.notes = {};
          evals.forEach(e => {
            S.ratings[e.competency_slug] = e.rating;
            if (e.evidence_note) S.notes[e.competency_slug] = e.evidence_note;
          });
          saveRatings(); saveNotes();
        }
      } catch (e) { console.error('[supabase] load profile:', e); }
    }
    enterApp();
  }

  function enterApp() {
    // Everyone walks the journey (onboarding → tripod), admins included; they
    // reach the team table via the Admin button whenever they want it.
    S.route = 'app';
    // Nudge anyone who hasn't finished: the self-assessment overlay shows on
    // entry whenever the assessment is incomplete, and keeps showing on later
    // logins until it's done (skippers were never coming back on their own).
    // Skip dismisses it for the session. Completed people go straight in and
    // get an "Edit assessment" entry point in the status row instead.
    S.onboard = nRated() < itemSlugs().length;
    render();
  }

  function signIn() {
    if (sb) {
      sb.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: location.origin + location.pathname }
      });
    } else {
      // Demo mode: no Supabase configured; fake a local session.
      USER = { id: 'local-demo', email: 'shreya@parallelhq.com', name: 'Shreya (demo)' };
      try { localStorage.setItem(LS_DEMO_USER, JSON.stringify(USER)); } catch (e) {}
      handleSignedIn({ id: USER.id, email: USER.email, user_metadata: { full_name: USER.name } });
    }
  }

  function signOut() {
    if (sb) { sb.auth.signOut(); }
    try { localStorage.removeItem(LS_DEMO_USER); } catch (e) {}
    USER = null;
    S.route = 'landing';
    render();
  }

  async function initAuth() {
    if (sb) {
      // Surface OAuth errors that come back in the URL instead of silently
      // landing back on the sign-in screen.
      const frag = new URLSearchParams(
        (location.hash.startsWith('#') ? location.hash.slice(1) : '') + '&' + location.search.slice(1));
      const authErr = frag.get('error_description') || frag.get('error');
      if (authErr) {
        S.authError = decodeURIComponent(authErr).replace(/\+/g, ' ');
        console.error('[auth] OAuth returned an error:', S.authError);
        history.replaceState(null, '', location.pathname);
      }
      // Register the listener FIRST so we can't miss the SIGNED_IN event that
      // fires when supabase-js finishes exchanging the code in the URL.
      sb.auth.onAuthStateChange((event, session) => {
        console.info('[auth]', event, session ? session.user.email : 'no session');
        if (session && !USER) handleSignedIn(session.user);
        else if (!session && USER) { USER = null; S.route = 'landing'; render(); }
      });
      const { data } = await sb.auth.getSession();
      if (data && data.session) {
        if (!USER) await handleSignedIn(data.session.user);
      } else if (!USER) {
        S.route = 'landing';
        render();
      }
    } else {
      let demo = null;
      try { demo = JSON.parse(localStorage.getItem(LS_DEMO_USER) || 'null'); } catch (e) {}
      if (demo) { USER = demo; enterApp(); }
      else { S.route = 'landing'; render(); }
    }
  }

  async function openAdmin() {
    if (!isAdmin()) return; // gate: admin master list only (DB also enforces via RLS)
    S.route = 'admin'; S.adminData = null; S.adminError = null;
    render();
    if (!sb) {
      // Demo mode: only the local user's data exists.
      let ai = null;
      try { ai = JSON.parse(localStorage.getItem('parallel-progression-ai-result-v1') || 'null'); } catch (e) {}
      S.adminData = [{
        email: USER.email, full_name: USER.name, role: S.cur, desired_role: S.des,
        self_evaluations: Object.entries(S.ratings).map(([slug, rating]) =>
          ({ competency_slug: slug, rating, evidence_note: S.notes[slug] || null })),
        ai_evaluations: ai ? [ai] : []
      }];
      render();
      return;
    }
    // ai_evaluations ships later than the rest of the schema, so if the table
    // isn't in Supabase yet, retry without it so the Progression view still loads.
    let { data, error } = await sb.from('users')
      .select('email,full_name,role,desired_role,created_at,self_evaluations(competency_slug,rating,evidence_note,updated_at),ai_evaluations(with_level,for_level,updated_at)')
      .order('email');
    if (error) {
      ({ data, error } = await sb.from('users')
        .select('email,full_name,role,desired_role,created_at,self_evaluations(competency_slug,rating,evidence_note,updated_at)')
        .order('email'));
      if (!error) S.adminError = 'AI results table missing: run the ai_evaluations block from schema.sql in Supabase.';
      else S.adminError = error.message;
    }
    S.adminData = data || [];
    render();
  }

  // ---------- SVG builders ----------

  // Large tripod (4a). Halo/leg opacity handled by classes; hover via direct DOM.
  // Default (layout A): per-leg hues, rated legs firm up with a dot at the foot.
  // mono (layout B): all legs share a graphite tone; a rated leg fills with its
  // RATING colour instead: progress is coloured into the leg, no extra dots.
  function tripodSVG(opts) {
    const { mono = false, width = 560, height = 400 } = opts || {};
    const grads = ['g4U', 'g4T', 'g4P'];
    // mono legs are slimmer, closer to the Figma's lighter tripod
    const halos = mono ? [
      '139,0 161,0 106,342 94,342',
      '269,0 291,0 286.5,323 273.5,323',
      '399,0 421,0 466,342 454,342'
    ] : [
      '135,0 165,0 108,342 92,342',
      '265,0 295,0 288.5,323 271.5,323',
      '395,0 425,0 468,342 452,342'
    ];
    const legsPts = mono ? [
      '145,0 155,0 102,342 98,342',
      '275,0 285,0 282,323 278,323',
      '405,0 415,0 462,342 458,342'
    ] : [
      '142,0 158,0 102.5,342 97.5,342',
      '272,0 288,0 282.3,323 277.7,323',
      '402,0 418,0 462.5,342 457.5,342'
    ];
    const hits = [
      ['150', '0', '100', '342'],
      ['280', '0', '280', '323'],
      ['410', '0', '460', '342']
    ];
    const feet = [[100, 346], [280, 325], [460, 346]];
    const legEls = legs().map((slug, i) => {
      const sel = S.focus === slug;
      const rating = S.ratings[slug];
      const fill = mono
        ? (rating ? `url(#gR-${rating})` : 'url(#gInk)')
        : `url(#${grads[i]})`;
      const foot = !mono && rating
        ? `<circle cx="${feet[i][0]}" cy="${feet[i][1]}" r="5" fill="${RC[rating]}" stroke="#FFFFFF" stroke-width="1.5"></circle>`
        : '';
      return `
      <polygon points="${halos[i]}" fill="${fill}" class="tri-halo ${sel ? 'sel' : ''}" data-halo="${i}"></polygon>
      <polygon points="${legsPts[i]}" fill="${fill}" class="tri-leg ${sel ? 'on' : ''} ${rating ? 'rated' : ''}" data-legpoly="${i}"></polygon>
      ${foot}`;
    }).join('');
    const hitEls = legs().map((slug, i) => {
      const [x1, y1, x2, y2] = hits[i];
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="tri-hit" data-action="focus:${slug}" data-leg="${i}"></line>`;
    }).join('');
    const fade = (id, color) =>
      `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity="0.95"/><stop offset="0.75" stop-color="${color}" stop-opacity="0.35"/><stop offset="1" stop-color="${color}" stop-opacity="0.1"/></linearGradient>`;
    return `<svg width="${width}" height="${height}" viewBox="0 0 560 400" class="tri-svg">
      <defs>
        ${fade('g4U', '#9B6FE0')}${fade('g4T', '#5FC2B4')}${fade('g4P', '#F08A5A')}
        ${fade('gInk', '#8A8A8A')}${RATES.map(rt => fade('gR-' + rt, RC[rt])).join('')}
        <radialGradient id="g4B" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#EBEBEB"/><stop offset="1" stop-color="#F8F8F8"/></radialGradient>
        <linearGradient id="g4Side" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E4E4E4"/><stop offset="1" stop-color="#F2F2F2"/></linearGradient>
        <radialGradient id="g4S" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#000000" stop-opacity="0.05"/><stop offset="1" stop-color="#000000" stop-opacity="0"/></radialGradient>
      </defs>
      <ellipse cx="280" cy="374" rx="224" ry="24" fill="url(#g4S)"/>
      <path d="M 68 344 L 68 368 A 212 26 0 0 0 492 368 L 492 344 A 212 26 0 0 1 68 344 Z" fill="url(#g4Side)"/>
      <ellipse cx="280" cy="344" rx="212" ry="26" fill="url(#g4B)"/>
      <ellipse cx="100" cy="346" rx="15" ry="4" fill="#E1E1E1"/>
      <ellipse cx="280" cy="325" rx="12" ry="3.2" fill="#DCDCDC"/>
      <ellipse cx="460" cy="346" rx="15" ry="4" fill="#E1E1E1"/>
      ${legEls}
      ${hitEls}
    </svg>`;
  }

  // Spider web on the head card. The rings are the ROLE LADDER itself (Product
  // Designer → Associate Design Director; Director sits beyond this map), so the
  // web is absolute: your self-assessment plots you against your current role
  // (Established = your ring, Leading = one ring up, Building = just inside),
  // and changing the desired role only moves the dashed bar ring.
  function ladderRings() { return ladder().filter(r => r !== 'Design Director'); }
  const RATE_OFFSET = { building: -0.5, established: 0, leading: 1 };

  // Levels between where you are and the desired-role bar (Progression-style delta).
  function ladderIdx() {
    const RINGS = ladderRings();
    const curIdx = Math.max(RINGS.indexOf(S.cur) + 1, 1);
    const desIdx = RINGS.indexOf(S.des) < 0 ? RINGS.length : RINGS.indexOf(S.des) + 1;
    return { RINGS, NR: RINGS.length, curIdx, desIdx };
  }
  function levelsToBar(it) {
    if (!it.rating) return null;
    const { curIdx, desIdx } = ladderIdx();
    return desIdx - (curIdx + RATE_OFFSET[it.rating]);
  }
  function deltaPhrase(it) {
    const d = levelsToBar(it);
    if (d == null) return 'Not assessed yet. A two-minute read.';
    if (d <= 0) return 'At the bar already.';
    if (d <= 0.5) return 'Half a level to the bar.';
    if (d <= 1) return 'One level to the bar.';
    return `${d % 1 ? d.toFixed(1).replace('.5', '½') : d} levels to the bar.`;
  }

  // Cleaner spider (borrowed from Progression's discrete-level thinking):
  // only the rings that mean something: your role (solid), the desired-role bar
  // (dashed), the ladder's edge (faint); no fill, and dots only where you've
  // rated. Everything else was chart furniture.
  function radarWebSVG() {
    const items = modelItems();
    const { NR, curIdx, desIdx } = ladderIdx();
    const CX = 105, CY = 96, RMAX = 80;
    // Inner base radius so junior roles don't collapse into the centre.
    const rad = lvl => RMAX * (0.22 + 0.78 * lvl / NR);
    const N = items.length;
    const ang = i => (-90 + i * (360 / N)) * Math.PI / 180;
    const pt = (i, r) => [CX + Math.cos(ang(i)) * r, CY + Math.sin(ang(i)) * r];
    const ringPoly = r => items.map((_, i) => pt(i, r).map(v => v.toFixed(1)).join(',')).join(' ');

    // Every role as a faint ring (the ladder), your role a touch stronger,
    // the desired-role bar dashed.
    const ringEls = [];
    for (let k = 1; k <= NR; k++) {
      if (k === desIdx) continue;
      const cur = k === curIdx;
      ringEls.push(`<polygon points="${ringPoly(rad(k))}" fill="none"
        stroke="${cur ? '#D8D8D8' : '#F3F3F3'}" stroke-width="${cur ? 1.2 : 1}"/>`);
    }
    ringEls.push(`<polygon points="${ringPoly(rad(desIdx))}" fill="none" stroke="#161616" stroke-width="1" stroke-dasharray="4 4" opacity="0.5"/>`);

    const spokes = items.map((_, i) => {
      const [x, y] = pt(i, RMAX);
      return `<line x1="${CX}" y1="${CY}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#F7F7F7" stroke-width="1"/>`;
    }).join('');

    const valPts = items.map((it, i) => {
      if (!it.rating) return null;
      const lvl = Math.min(Math.max(curIdx + RATE_OFFSET[it.rating], 0), NR);
      return pt(i, rad(lvl));
    });
    // Soft-filled shape through the rated competencies (per the Figma), with
    // rating-coloured dots. Unrated axes stay empty.
    const rated = valPts.filter(Boolean);
    const shape = rated.length >= 3
      ? `<polygon points="${rated.map(p => p.map(v => v.toFixed(1)).join(',')).join(' ')}"
          fill="rgba(124,158,220,0.12)" stroke="rgba(88,116,176,0.5)" stroke-width="1.2" stroke-linejoin="round"/>`
      : items.map((_, i) => {
          const a = valPts[i], b = valPts[(i + 1) % N];
          if (!a || !b) return '';
          return `<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}" stroke="rgba(22,22,22,0.3)" stroke-width="1.2"/>`;
        }).join('');
    const dots = items.map((it, i) => {
      const p = valPts[i];
      if (!p) return '';
      const [x, y] = p;
      const focused = S.focus === it.slug;
      return `
        <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="${RC[it.rating]}" stroke="#FFFFFF" stroke-width="1.5"/>
        ${focused ? `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7.5" fill="none" stroke="#161616" stroke-width="1"/>` : ''}
        <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="11" fill="rgba(0,0,0,0)" data-action="focus:${esc(it.slug)}" style="cursor:pointer;"/>`;
    }).join('');

    return `<svg width="210" height="200" viewBox="0 0 210 200" class="radar-svg">
      ${spokes}${ringEls.join('')}${shape}${dots}
    </svg>`;
  }

  const chevSVG = (open, w = 14, h = 9) =>
    `<svg width="${w}" height="${h}" viewBox="0 0 14 9" class="card-chev ${open ? 'open' : ''}"><path d="M1 1.5 L7 7.5 L13 1.5" fill="none" stroke="#9A9A9A" stroke-width="1.5"/></svg>`;
  const selChev = (w = 14, h = 9) =>
    `<svg width="${w}" height="${h}" viewBox="0 0 14 9" class="chev"><path d="M1 1.5 L7 7.5 L13 1.5" fill="none" stroke="#9A9A9A" stroke-width="1.5"/></svg>`;

  // ---------- Landing / onboarding / admin ----------

  // Tripod mark (landing hero + onboarding preview). Reads top-to-bottom as the
  // idea in the copy: a head the three legs hold up (every other skill), three
  // core-competency legs, and the AI-native foundation they all stand on.
  // Dimensional, not wireframe: solid legs with a lit edge, a glossy head plate,
  // and a grounded base carrying a faint "network" motif for the AI foundation.
  function markSVG(width, height) {
    return `<svg width="${width}" height="${height}" viewBox="0 0 280 250" style="display:block;">
      <defs>
        <linearGradient id="mkUf" x1="0" y1="0" x2="0.15" y2="1"><stop offset="0" stop-color="#A981E8"/><stop offset="1" stop-color="#7C4FD0"/></linearGradient>
        <linearGradient id="mkTf" x1="0" y1="0" x2="0.15" y2="1"><stop offset="0" stop-color="#6ECEC0"/><stop offset="1" stop-color="#3FA99A"/></linearGradient>
        <linearGradient id="mkPf" x1="0" y1="0" x2="0.15" y2="1"><stop offset="0" stop-color="#F79A6C"/><stop offset="1" stop-color="#E06B3C"/></linearGradient>
        <linearGradient id="mkPlate" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#EEEEF1"/></linearGradient>
        <linearGradient id="mkPlateSide" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#DDDDE2"/><stop offset="1" stop-color="#C7C7CE"/></linearGradient>
        <radialGradient id="mkFoot" cx="0.5" cy="0.35" r="0.7"><stop offset="0" stop-color="#EDEFF4"/><stop offset="1" stop-color="#DCDFE8"/></radialGradient>
        <linearGradient id="mkFootSide" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#CFD3DE"/><stop offset="1" stop-color="#BCC1CF"/></linearGradient>
        <radialGradient id="mkGlow" cx="0.5" cy="0.42" r="0.55"><stop offset="0" stop-color="#F0ECFA" stop-opacity="0.7"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></radialGradient>
        <radialGradient id="mkShadow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#1B1B2A" stop-opacity="0.10"/><stop offset="1" stop-color="#1B1B2A" stop-opacity="0"/></radialGradient>
      </defs>

      <ellipse cx="140" cy="60" rx="120" ry="88" fill="url(#mkGlow)"/>
      <ellipse cx="140" cy="228" rx="120" ry="15" fill="url(#mkShadow)"/>

      <!-- AI-native foundation: grounded base with a faint network motif -->
      <ellipse cx="140" cy="206" rx="104" ry="16" fill="url(#mkFootSide)"/>
      <ellipse cx="140" cy="200" rx="104" ry="16" fill="url(#mkFoot)"/>
      <g stroke="#8E9BC4" stroke-width="1" opacity="0.4">
        <line x1="108" y1="199" x2="140" y2="195"/><line x1="140" y1="195" x2="172" y2="199"/><line x1="108" y1="199" x2="140" y2="203"/><line x1="172" y1="199" x2="140" y2="203"/>
      </g>
      <g fill="#7C89B8" opacity="0.55"><circle cx="108" cy="199" r="2.4"/><circle cx="172" cy="199" r="2.4"/><circle cx="140" cy="195" r="2.4"/><circle cx="140" cy="203" r="2.4"/></g>

      <!-- Legs: the three core competencies (solid, with a lit left edge) -->
      <polygon points="126,64 118,64 55,192 65,192" fill="url(#mkUf)"/>
      <polygon points="118,64 121,64 58,192 55,192" fill="#C4ACF0" opacity="0.85"/>
      <polygon points="136,66 144,66 145,204 135,204" fill="url(#mkTf)"/>
      <polygon points="136,66 139,66 137,204 134,204" fill="#A6E2D9" opacity="0.85"/>
      <polygon points="154,64 162,64 225,192 215,192" fill="url(#mkPf)"/>
      <polygon points="154,64 157,64 218,192 215,192" fill="#F8C3A8" opacity="0.85"/>

      <!-- Feet resting on the foundation -->
      <ellipse cx="60" cy="192" rx="8" ry="3" fill="url(#mkFootSide)"/>
      <ellipse cx="220" cy="192" rx="8" ry="3" fill="url(#mkFootSide)"/>
      <ellipse cx="140" cy="205" rx="8" ry="3" fill="url(#mkFootSide)"/>

      <!-- Head plate: everything the three hold up -->
      <ellipse cx="140" cy="62" rx="74" ry="14" fill="url(#mkPlateSide)"/>
      <ellipse cx="140" cy="56" rx="74" ry="14" fill="url(#mkPlate)"/>
      <ellipse cx="140" cy="52" rx="52" ry="7" fill="#FFFFFF" opacity="0.6"/>
    </svg>`;
  }

  // Illustrative spider (onboarding preview): static sample shape, not data.
  function sampleSpiderSVG(size) {
    const CX = 75, CY = 70, R = 58;
    const N = 9;
    const pts = r => Array.from({ length: N }, (_, i) => {
      const a = (-90 + i * 40) * Math.PI / 180;
      return `${(CX + Math.cos(a) * r).toFixed(1)},${(CY + Math.sin(a) * r).toFixed(1)}`;
    }).join(' ');
    const sample = [0.55, 0.7, 0.62, 0.4, 0.5, 0.66, 0.45, 0.58, 0.5].map((f, i) => {
      const a = (-90 + i * 40) * Math.PI / 180;
      return `${(CX + Math.cos(a) * R * f).toFixed(1)},${(CY + Math.sin(a) * R * f).toFixed(1)}`;
    }).join(' ');
    return `<svg width="${size}" height="${size * 0.93}" viewBox="0 0 150 140" style="display:block;">
      <polygon points="${pts(R * 0.4)}" fill="none" stroke="#F0F0F0" stroke-width="1"/>
      <polygon points="${pts(R * 0.7)}" fill="none" stroke="#EAEAEA" stroke-width="1"/>
      <polygon points="${pts(R)}" fill="none" stroke="#161616" stroke-width="1" stroke-dasharray="3 3" opacity="0.4"/>
      <polygon points="${sample}" fill="rgba(124,158,220,0.14)" stroke="rgba(88,116,176,0.5)" stroke-width="1.2" stroke-linejoin="round"/>
    </svg>`;
  }

  const googleG = `<svg width="18" height="18" viewBox="0 0 18 18" style="display:block;"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/></svg>`;

  // The hero visual: Shreya's Figma "Table → Tripod" motion (node 146:5275),
  // rebuilt at the frame's native scale (a 560×716 stage) and scaled to fit.
  // The rubric TABLE (front) dissolves and the TRIPOD (behind) assembles: legs
  // reuse the app's tripodSVG, the head-card carries the exported spider
  // (Group 7.svg) + competency pills, three rotated leg labels sit on the legs,
  // and the AI-native base line fades in last. All timing/easing/looping lives
  // in the anim-* keyframes in styles.css. Decorative; aria-hidden.
  const ANIM_DIR = 'assets/animation-assets/';
  function animVizHTML() {
    // Table skeleton bars: two per cell (100px + 72px), three columns.
    const cols = [169, 299, 429];
    const bars = [130.5, 250.5, 370.5, 490.5].map(y => cols.map(x =>
      `<i class="anim-bar" style="left:${x}px;top:${y}px;width:100px;"></i><i class="anim-bar" style="left:${x}px;top:${y + 20}px;width:72px;"></i>`).join('')).join('');
    const hlines = [107.5, 212.5, 327.5, 442.5, 552.5].map(y => `<i class="anim-hl" style="top:${y}px;"></i>`).join('');
    const vlines = [157, 287, 417].map(x => `<i class="anim-vl" style="left:${x}px;"></i>`).join('');
    const rows = [['UX Design', 132.5, 'r1', '-20px'], ['Visual Design', 242.5, 'r2', '-60px'],
      ['Shipping', 356.5, 'r3', '-100px'], ['Design Tools', 472.5, 'r4', '-140px']]
      .map(([t, y, c, ty]) => `<div class="anim-row anim-${c}" style="top:${y}px;--ty:${ty};">${t}</div>`).join('');
    // Head-card competency pills (first is the "active" one), each with its dot.
    const pills = [['Visual Craft', '#7C9EDC', true], ['Systems Thinking', '#7C9EDC', false],
      ['Data & Evidence', '#6FBF8F', false], ['Shipping & Delivery', '#6FBF8F', false], ['Influence', '#FC8C67', false]]
      .map(([t, c, on]) => `<div class="anim-pill${on ? ' on' : ''}"><i style="background:${c};"></i>${esc(t)}</div>`).join('');
    // Render the legs with no focused leg (default S.focus would give the UX leg
    // an extra halo/opacity outline, not wanted in the static hero).
    const savedFocus = S.focus;
    S.focus = null;
    const legsSVG = tripodSVG({ width: 448, height: 320 });
    S.focus = savedFocus;
    return `<div class="anim-viz" aria-hidden="true"><div class="anim-stage">
      <div class="anim-legs">${legsSVG}</div>
      <div class="anim-head">
        <img class="anim-spider" src="${ANIM_DIR}Group%207.svg" width="200" height="197" alt="">
        <div class="anim-pills">${pills}</div>
      </div>
      <div class="anim-ll anim-ll-ux"><span>UX Design &amp; Ideation</span></div>
      <div class="anim-ll anim-ll-taste"><span>Taste &amp; Judgement</span></div>
      <div class="anim-ll anim-ll-ps"><span>Product Sense</span></div>
      <div class="anim-ai">◈ AI Native Design Foundations</div>
      <div class="anim-tbl-card"></div>
      <div class="anim-tbl-grid">
        <i class="anim-tbl-header"></i>
        <span class="anim-col" style="left:187px;">PD</span>
        <span class="anim-col" style="left:315px;">SPD</span>
        <span class="anim-col" style="left:475px;">DL</span>
        ${hlines}${vlines}${bars}
      </div>
      ${rows}
    </div></div>`;
  }

  const arrowRightSVG = `<svg class="btn-arrow" width="22" height="22" viewBox="0 0 24 24" style="display:block;"><path d="M4 12 H18 M13 6 L19 12 L13 18" fill="none" stroke="#111" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  function renderLanding() {
    return `<div class="landing landing-anim">
      <div class="landing-topbar"><img class="logo" src="assets/parallel-logo.svg" alt="Parallel"></div>
      <div class="landing-hero-c">
        ${animVizHTML()}
        <h1 class="landing-h1">The new rubrics<br>explained as a <span class="accent">tripod</span></h1>
        <p class="landing-sub">We’ve been talking about taste, product sense, POV, AI a lot recently.<br>The new rubric maps this to measurable growth.</p>
        <button class="btn-google" data-action="signin">${googleG}Continue with Google</button>
        ${sb ? '' : '<div class="landing-demo-note">Supabase isn’t configured yet. Sign-in runs in local demo mode.</div>'}
        ${S.authError ? `<div class="landing-demo-note">Sign-in failed: ${esc(S.authError)}</div>` : ''}
      </div>
    </div>`;
  }

  // Onboarding popup: a modal over the app, so the tripod + rubrics view shows
  // blurred behind it (same .overlay blur as the assessment popup). No dismiss
  // on the backdrop: you either start or skip.
  function onboardModalHTML() {
    const first = (USER && USER.name || '').split(' ')[0];
    const n = nRated(), total = itemSlugs().length, started = n > 0;
    const eyebrow = started ? 'Pick up where you left off' : (first ? 'Welcome, ' + esc(first) : 'Welcome');
    const title = started ? 'Finish your self-assessment' : 'First, a quick self-assessment';
    const copy = started
      ? `You've rated ${n} of ${total}. A couple more minutes and your tripod reflects where you actually stand, saved as you go.`
      : `Before you view your tripod, rate yourself against your current role. It helps us map you to your tripod more accurately: ${total} competencies, about two minutes, saved as you go.`;
    const cta = started ? `Finish self-assessment (${n}/${total})` : 'Start self-assessment';
    return `<div class="overlay">
      <div class="modal onboard-modal" data-stop="1">
        <div class="eyebrow">${eyebrow}</div>
        <h2 class="onboard-modal-title">${title}</h2>
        <p class="onboard-modal-copy">${copy}</p>
        <button class="btn-dark-lg" data-action="onboard-start">${cta}</button>
        <button class="onboard-skip" data-action="onboard-skip">Skip for now</button>
      </div>
    </div>`;
  }

  // Export the admin table as CSV; opens directly in Google Sheets / Excel /
  // Numbers. Mirrors the on-screen table for whichever admin view is active.
  function exportAdminCSV() {
    const rows = S.adminData || [];
    const cell = v => {
      v = v == null ? '' : String(v);
      return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
    };
    const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
    let lines, name;
    if (S.adminView === 'ai') {
      name = 'parallel-ai-foundations';
      lines = [['Designer', 'Email', 'Role', 'With AI level', 'With AI persona', 'For AI level', 'For AI persona', 'Taken on']];
      rows.forEach(u => {
        const r = (u.ai_evaluations || [])[0];
        lines.push([
          u.full_name || '', u.email || '', u.role || '',
          r ? 'Level ' + r.with_level + ' · ' + AI_TRACKS.with.levels[r.with_level] : '',
          r ? AI_TRACKS.with.personas[r.with_level] : '',
          r ? 'Level ' + r.for_level + ' · ' + AI_TRACKS.for.levels[r.for_level] : '',
          r ? AI_TRACKS.for.personas[r.for_level] : '',
          r && r.updated_at ? String(r.updated_at).slice(0, 10) : ''
        ]);
      });
    } else {
      name = 'parallel-progression';
      const slugs = itemSlugs();
      lines = [['Designer', 'Email', 'Current role', 'Aiming for', 'Progress', ...slugs.map(nameOf)]];
      rows.forEach(u => {
        const evals = {};
        (u.self_evaluations || []).forEach(e => { evals[e.competency_slug] = { rating: e.rating, note: e.evidence_note || '' }; });
        const n = slugs.filter(s => evals[s]).length;
        lines.push([
          u.full_name || '', u.email || '', u.role || '', u.desired_role || '', n + '/' + slugs.length,
          ...slugs.map(s => {
            const e = evals[s];
            if (!e) return '';
            return e.note ? cap(e.rating) + ': ' + e.note : cap(e.rating);
          })
        ]);
      });
    }
    const csv = '﻿' + lines.map(r => r.map(cell).join(',')).join('\r\n');
    const date = new Date().toISOString().slice(0, 10);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${name}-${date}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // The Progression view: one column per competency, rating tag + note per cell.
  function adminProgressionTable(rows) {
    const slugs = itemSlugs();
    return `<div class="admin-scroll" data-keepscroll="admin" style="--admin-col:${ADMIN_COLW[S.adminWidth] || 240}px;"><table class="admin-table">
        <thead><tr>
          <th class="admin-sticky">Designer</th><th>Role</th><th>Aiming for</th><th>Progress</th>
          ${slugs.map(s => `<th class="admin-comp">${esc(nameOf(s))}</th>`).join('')}
        </tr></thead>
        <tbody>
          ${rows.map(u => {
            const evals = {};
            (u.self_evaluations || []).forEach(e => {
              evals[e.competency_slug] = { rating: e.rating, note: e.evidence_note || '' };
            });
            const n = slugs.filter(s => evals[s]).length;
            return `<tr>
              <td class="admin-sticky"><div class="admin-name">${esc(u.full_name || '—')}</div><div class="admin-email">${esc(u.email)}</div></td>
              <td>${esc(u.role || '—')}</td>
              <td>${esc(u.desired_role || '—')}</td>
              <td><span class="admin-progress">${n}/${slugs.length}</span></td>
              ${slugs.map(s => {
                const e = evals[s];
                if (!e) return `<td class="admin-cell"><span class="admin-dash">—</span></td>`;
                return `<td class="admin-cell">
                  <span class="tagpill" style="background:${TAG[e.rating].bg};color:${TAG[e.rating].fg};">${e.rating.toUpperCase()}</span>
                  ${e.note ? `<div class="admin-cell-note">${esc(e.note)}</div>` : ''}
                </td>`;
              }).join('')}
            </tr>`;
          }).join('')}
        </tbody>
      </table></div>`;
  }

  // The AI view: latest AI-Native Foundations quiz result per designer.
  function adminAITable(rows) {
    const trackCell = (r, key) => {
      if (!r) return `<td class="admin-cell"><span class="admin-dash">—</span></td>`;
      const t = AI_TRACKS[key], lvl = key === 'with' ? r.with_level : r.for_level;
      return `<td class="admin-cell">
        <span class="tagpill" style="background:${t.soft};color:${t.ink};">L${lvl} · ${esc(t.personas[lvl])}</span>
        <div class="admin-cell-note">${esc(t.levels[lvl])}</div>
      </td>`;
    };
    const taken = rows.filter(u => (u.ai_evaluations || []).length).length;
    return `<div class="admin-scroll" data-keepscroll="admin" style="--admin-col:${ADMIN_COLW[S.adminWidth] || 240}px;"><table class="admin-table">
        <thead><tr>
          <th class="admin-sticky">Designer</th><th>Role</th>
          <th class="admin-comp">${esc(AI_TRACKS.with.label)}</th>
          <th class="admin-comp">${esc(AI_TRACKS.for.label)}</th>
          <th>Taken on</th>
        </tr></thead>
        <tbody>
          ${rows.map(u => {
            const r = (u.ai_evaluations || [])[0] || null;
            return `<tr>
              <td class="admin-sticky"><div class="admin-name">${esc(u.full_name || '—')}</div><div class="admin-email">${esc(u.email)}</div></td>
              <td>${esc(u.role || '—')}</td>
              ${trackCell(r, 'with')}
              ${trackCell(r, 'for')}
              <td>${r && r.updated_at ? esc(String(r.updated_at).slice(0, 10)) : '<span class="admin-dash">—</span>'}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
      <div class="admin-ai-foot">${taken} of ${rows.length} have taken the quiz · <a href="ai-native.html${!sb ? '?demo=1' : ''}">open the field guide →</a></div>
    </div>`;
  }

  function renderAdmin() {
    const rows = S.adminData;
    const ai = S.adminView === 'ai';
    const body = rows === null
      ? `<div class="admin-loading">Loading team data…</div>`
      : rows.length === 0
        ? `<div class="admin-loading">No users yet.</div>`
        : ai ? adminAITable(rows) : adminProgressionTable(rows);
    return `<div class="admin-body">
      <div class="admin-head">
        <div>
          <h1 class="admin-title">${ai ? 'AI-Native Foundations' : 'Team self-assessments'}</h1>
          <div class="admin-sub">${rows ? rows.length + (rows.length === 1 ? ' designer' : ' designers') : ''}${sb ? '' : ' · demo mode (local data only)'}${S.adminError ? ' · ' + esc(S.adminError) : ''}</div>
        </div>
        <div class="admin-head-right">
          <div class="seg-toggle inline">
            <button class="seg-btn ${!ai ? 'on' : ''}" data-action="admin-view:progression">Progression</button>
            <button class="seg-btn ${ai ? 'on' : ''}" data-action="admin-view:ai">AI</button>
          </div>
          ${rows && rows.length ? `<button class="admin-export" data-action="admin-export" title="Download as CSV: opens in Google Sheets, Excel or Numbers">
            <svg width="14" height="14" viewBox="0 0 14 14"><rect x="1.5" y="1.5" width="11" height="11" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.2"/><line x1="1.5" y1="5.5" x2="12.5" y2="5.5" stroke="currentColor" stroke-width="1.2"/><line x1="5.5" y1="5.5" x2="5.5" y2="12.5" stroke="currentColor" stroke-width="1.2"/></svg>
            Export CSV
          </button>` : ''}
          ${ai ? '' : `<div class="admin-width">
            ${['compact', 'comfortable', 'wide'].map(w =>
              `<button class="${S.adminWidth === w ? 'on' : ''}" data-action="admin-width:${w}">${w}</button>`).join('')}
          </div>
          <div class="admin-legend">
            ${RATES.map(rt => `<span class="admin-legend-item"><i style="background:${RC[rt]};"></i>${rt.charAt(0).toUpperCase() + rt.slice(1)}</span>`).join('')}
          </div>`}
        </div>
      </div>
      ${body}
    </div>`;
  }

  // ---------- Shared blocks ----------

  function appbar() {
    const mainLabel = 'Tripod view';
    const inAdmin = S.route === 'admin';
    return `<div class="appbar">
      <img class="logo" src="assets/parallel-logo.svg" alt="Parallel">
      ${inAdmin ? '' : `<div class="seg-toggle">
        <button class="seg-btn ${S.view === 'tripod' ? 'on' : ''}" data-action="view-tripod">${mainLabel}</button>
        <button class="seg-btn ${S.view === 'table' ? 'on' : ''}" data-action="view-table">Table view</button>
      </div>`}
      <div class="appbar-right">
        ${isAdmin() ? `<button class="admin-btn ${inAdmin ? 'on' : ''}" data-action="${inAdmin ? 'admin-close' : 'admin-open'}">${inAdmin ? '← Back to app' : 'Admin'}</button>` : ''}
        ${USER ? userChipHTML() : `<div class="appbar-role"><span class="role-dot"></span>${esc(S.cur)}</div>`}
      </div>
    </div>`;
  }

  // Signed-in chip: avatar + first name; dropdown holds the detail + sign out.
  function userChipHTML() {
    const first = (USER.name || USER.email).split(' ')[0];
    const initial = first.charAt(0).toUpperCase();
    // Google avatar when we have it; initial as fallback (and if the image fails).
    const avatar = size => USER.avatar
      ? `<img class="user-avatar user-avatar-img" style="width:${size}px;height:${size}px;" src="${esc(USER.avatar)}" alt="" referrerpolicy="no-referrer" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'user-avatar',textContent:'${esc(initial)}'}))">`
      : `<span class="user-avatar">${esc(initial)}</span>`;
    return `<div class="user-chip-wrap">
      <button class="user-chip" data-action="chip-toggle">
        ${avatar(22)}${esc(first)}
        <svg width="10" height="7" viewBox="0 0 14 9" class="card-chev ${S.chipOpen ? 'open' : ''}"><path d="M1 1.5 L7 7.5 L13 1.5" fill="none" stroke="#9A9A9A" stroke-width="1.5"/></svg>
      </button>
      ${S.chipOpen ? `<div class="user-menu">
        <div class="user-menu-id">
          <div class="user-menu-idrow">${avatar(36)}<div>
            <div class="user-menu-name">${esc(USER.name || '')}</div>
            <div class="user-menu-email">${esc(USER.email)}</div>
          </div></div>
          <div class="user-menu-role"><span class="role-dot"></span>${esc(S.cur)}</div>
        </div>
        <button class="user-menu-signout" data-action="signout">Sign out</button>
      </div>` : ''}
    </div>`;
  }

  // Card anatomy per the Figma: serif title left, status cluster (chip + meter)
  // right, no CURRENT/DESIRED column labels; the compare bar sets the context.
  // Closed cards keep their one-line current/desired summary; only the expanded
  // bullet detail is hidden until opened.
  function cardHTML(slug) {
    const open = !!S.open[slug];
    const rating = S.ratings[slug];
    const L = cellOf(slug, S.cur), D = cellOf(slug, S.des);
    const tag = rating
      ? `<span class="tagpill" title="${esc(MEAN[rating])}" style="background:${TAG[rating].bg};color:${TAG[rating].fg};">${rating.toUpperCase()}</span>`
      : `<span class="tagpill ghost">NOT ASSESSED</span>`;
    const col = lines => `<div class="cmp-col">
      <div class="col-summary">${esc(lines[0] || 'Not evaluated at this level.')}</div>
      ${open && lines.length > 1
        ? `<ul class="col-bullets">${lines.slice(1).map(ln => `<li>${esc(ln)}</li>`).join('')}</ul>` : ''}
    </div>`;
    return `<div class="card" data-acc="${esc(slug)}">
      <button class="card-head" data-action="toggle:${esc(slug)}">
        <span class="card-title">${esc(nameOf(slug))}</span>
        <span class="card-status" data-action="assess-at:${esc(slug)}" title="${rating ? 'Edit this rating' : 'Rate this competency'}">${tag}${meterHTML(slug)}</span>
        ${chevSVG(open)}
      </button>
      <div class="card-body">
        ${col(L)}
        <span class="card-divider"></span>
        ${col(D)}
      </div>
    </div>`;
  }

  // "Compare [current] → to [desired]": the top-level control, shared by the
  // tripod panel and the table view ('compact' variant).
  function compareBarHTML(cls) {
    const field = (tag, kind) => `<div class="compare-field">
      <span class="compare-tag">${tag}</span>
      <div class="compare-value">
        <select data-role="${kind}">${(kind === 'cur' ? CUR_OPTIONS : DES_OPTIONS)
          .map(r => `<option value="${esc(r)}" ${(kind === 'cur' ? S.cur : S.des) === r ? 'selected' : ''}>${esc(r)}</option>`).join('')}</select>
        ${selChev(12, 8)}
      </div>
    </div>`;
    return `<div class="compare-bar ${cls || ''}">
      ${field('Compare', 'cur')}
      <svg class="compare-arrow" width="16" height="16" viewBox="0 0 16 16"><path d="M2 8 H13 M9.5 3.5 L14 8 L9.5 12.5" fill="none" stroke="#161616" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
      ${field('To', 'des')}
    </div>`;
  }

  // One quiet status row: micro-dots, "n of N at the bar", one suggested action.
  // The progress read, without the old strip's bulk.
  function progressRowHTML() {
    const items = modelItems();
    const atBar = items.filter(it => {
      const d = levelsToBar(it);
      return d != null && d <= 0;
    }).length;
    const rated = items.length - items.filter(it => !it.rating).length;
    const incomplete = rated < items.length;
    const dots = items.map(it =>
      `<i title="${esc(it.name)}${it.rating ? ' · ' + it.rating : ' · not assessed'}"
        style="background:${it.rating ? RC[it.rating] : '#E9E9E9'};"></i>`).join('');

    // One action, ever. Editing a rating lives on the card itself; click a
    // card's chip/dots to reopen the assessment at that competency.
    let text, action;
    if (rated === 0) {
      text = 'Not assessed yet';
      action = `<button class="progress-start" data-action="assess-open">Start self-assessment →</button>`;
    } else if (incomplete) {
      text = `${rated} of ${items.length} rated`;
      action = `<button class="progress-start" data-action="assess-open">Continue where you left off →</button>`;
    } else {
      const next = focusQueue()[0];
      text = `${atBar} of ${items.length} at the bar`;
      const primary = next
        ? `<button class="progress-start" data-action="focus:${esc(next.slug)}">Start with ${esc(next.name)} →</button>`
        : `<span class="progress-done">All at the bar. Bring it to your lead.</span>`;
      // Completed the assessment: keep an always-available way to revise it.
      action = `${primary}<button class="progress-edit" data-action="assess-open">Edit assessment</button>`;
    }
    return `<div class="progress-row">
      <div class="progress-left">
        <span class="micro-dots">${dots}</span>
        <span class="progress-text">${text}</span>
        ${action}
      </div>
    </div>`;
  }

  function panelHTML() {
    // Onboarding owns the first-run moment now, so the panel always shows the
    // slim status row, whose action adapts (start / continue / focus).
    return `<div class="panel" data-keepscroll="panel">
      ${compareBarHTML()}
      ${progressRowHTML()}
      <div class="cards">
        ${cardSlugs().map(s => cardHTML(s)).join('')}
      </div>
    </div>`;
  }

  // ---------- Layout · spider on the tripod's head ----------
  // From the sketch: the head card carries the spider web on its face, the head
  // competencies sit as a slot rail on the card's edge, and the legs (with rating
  // rings) come off the same object.

  function spiderViewHTML() {
    const items = modelItems();
    const focusIt = items.find(i => i.slug === S.focus) || items[0];
    const railBtns = head().map(slug => {
      const rating = S.ratings[slug];
      return `<button class="rail-btn ${S.focus === slug ? 'focused' : ''}" title="${esc(nameOf(slug))}" data-action="focus:${esc(slug)}">
        <span class="rail-dot" style="background:${rating ? RC[rating] : '#D9D9D9'};"></span>${esc(nameOf(slug))}
      </button>`;
    }).join('');
    const legLabels = legs().map((slug, i) =>
      `<button class="leg-label leg-label-${i} ${S.focus === slug ? 'focused' : ''}" data-action="focus:${esc(slug)}" data-leg="${i}">
        <span>${esc(nameOf(slug))}</span>
      </button>`).join('');
    const caption = nRated() === 0
      ? `<span style="color:#9A9A9A;">Rate yourself to draw your spider.</span>`
      : `${esc(focusIt.name)} · <span style="color:${focusIt.rating ? TAG[focusIt.rating].fg : '#9A9A9A'};">${focusIt.rating ? focusIt.rating.charAt(0).toUpperCase() + focusIt.rating.slice(1) : 'Not assessed'}</span>`;
    return `<div class="tri-body">
      <div class="tri-left">
        <div class="tri-stage spider-stage">
          ${tripodSVG({ mono: true, width: 448, height: 320 })}
          <div class="head-card spider-card">
            <div class="spider-card-inner">
              <div class="spider-chart">
                ${radarWebSVG()}
                <div class="radar-caption">${caption}</div>
              </div>
              <div class="spider-rail">${railBtns}</div>
            </div>
          </div>
          ${legLabels}
          <button class="tri-what" data-action="modal-open">What does this tripod mean?</button>
          <a class="tri-foundation" href="ai-native.html${DEMO_FORCED || !sb ? '?demo=1' : ''}">◈ AI-Native Foundations →</a>
        </div>
      </div>
      ${panelHTML()}
    </div>`;
  }

  // ---------- Table view (shared) ----------

  function ladderHTML() {
    const LADDER = ladder();
    const heads = LADDER.map(r => `<div>
      <div class="ladder-role-name" style="color:${(r === S.cur || r === S.des) ? '#161616' : '#9A9A9A'};">${esc(r)}</div>
      <div class="ladder-role-meta">${r === S.cur ? 'You are here' : (r === S.des ? 'Aiming for' : '')}</div>
    </div>`).join('');
    const rows = itemSlugs().map(slug => {
      const open = !!S.open[slug];
      const cells = LADDER.map(r => {
        const L = cellOf(slug, r);
        return `<div class="ladder-cell ${(r === S.cur || r === S.des) ? 'hl' : ''}">
          <div class="ladder-cell-summary">${esc(L[0] || '—')}</div>
          ${open ? L.slice(1).map(ln => `<div class="ladder-cell-line">${esc(ln)}</div>`).join('') : ''}
        </div>`;
      }).join('');
      return `<div class="ladder-row">
        <div class="ladder-row-first">
          <button class="ladder-row-toggle" data-action="toggle:${esc(slug)}">
            <span class="ladder-row-name">${esc(nameOf(slug))}</span>
            ${chevSVG(open, 12, 8)}
          </button>
        </div>
        ${cells}
      </div>`;
    }).join('');
    return `<div class="ladder-scroll" data-keepscroll="ladder"><div class="ladder-inner">
      <div class="ladder-head">
        <div class="ladder-head-first">Competency</div>
        ${heads}
      </div>
      ${rows}
    </div></div>`;
  }

  function tableViewHTML() {
    const cmp = S.tview === 'compare';
    return `<div class="tbl-body">
      <div class="tbl-bar">
        <div class="seg-toggle inline">
          <button class="seg-btn ${!cmp ? 'on' : ''}" data-action="tview-full">Full ladder</button>
          <button class="seg-btn ${cmp ? 'on' : ''}" data-action="tview-compare">Comparison</button>
        </div>
        ${compareBarHTML('compact')}
      </div>
      ${cmp
        ? `<div class="tbl-scroll" data-keepscroll="cmp">${cardSlugs().map(s => cardHTML(s)).join('')}</div>`
        : ladderHTML()}
    </div>`;
  }

  // ---------- Modals ----------

  function assessModalHTML() {
    const slugs = itemSlugs();
    const step = Math.min(Math.max(S.step || 0, 0), slugs.length - 1);
    const slug = slugs[step];
    const L = cellOf(slug, S.cur), D = cellOf(slug, S.des);
    const rating = S.ratings[slug];
    const segs = RATES.map(rt => `
      <button class="seg-pick ${rating === rt ? 'on' : ''}" data-action="rate:${esc(slug)}:${rt}" data-rt="${rt}">
        <span class="seg-dot" style="background:${RC[rt]};"></span>${rt.charAt(0).toUpperCase() + rt.slice(1)}
      </button>`).join('');
    const dots = slugs.map((s, i) => `
      <button class="m-dot ${i === step ? 'cur' : ''}" data-action="step:${i}" style="background:${S.ratings[s] ? RC[S.ratings[s]] : '#E4E4E4'};"></button>`).join('');
    return `<div class="overlay" data-action="assess-close">
      <div class="modal assess-modal" data-stop="1">
        <button class="modal-x" data-action="assess-close">✕</button>
        <div class="m-idx">Self-assessment · ${step + 1} of ${slugs.length}</div>
        <div class="m-name-row"><div class="m-name">${esc(nameOf(slug))}</div></div>
        <div class="m-summary">${esc(L[0] || 'Not evaluated at this level.')}</div>
        ${L.length > 1 ? `<ul class="m-lines">${L.slice(1).map(ln => `<li>${esc(ln)}</li>`).join('')}</ul>` : ''}
        <div class="ratebox">
          <div class="ratebox-label">Where are you now?</div>
          <div class="segs-wrap">
            <div class="segs">${segs}</div>
            <div class="lead-pop" id="rate-pop">
              <div class="rate-pop-c" data-c="building">
                <div class="lead-pop-title" style="color:${TAG.building.fg};">Building</div>
                <div class="lead-pop-summary">Working toward it, not yet consistently at your current role's bar.</div>
              </div>
              <div class="rate-pop-c" data-c="established">
                <div class="lead-pop-title" style="color:${TAG.established.fg};">Established</div>
                <div class="lead-pop-summary">Meeting what your current role asks of you.</div>
              </div>
              <div class="rate-pop-c" data-c="leading">
                <div class="lead-pop-title" style="color:${TAG.leading.fg};">Leading = next-role behaviours · At ${esc(S.des)}</div>
                <div class="lead-pop-summary">${esc(D[0] || 'Not evaluated at this level.')}</div>
                ${D.length > 1 ? `<ul class="lead-pop-lines">${D.slice(1, 4).map(ln => `<li>${esc(ln)}</li>`).join('')}</ul>` : ''}
              </div>
            </div>
          </div>
          <div class="rate-hint">${esc(rating ? MEAN[rating] : 'Relative to your current role. Hover a level to see what it means.')}</div>
        </div>
        <div class="m-note-label">Why this rating? <span class="m-note-opt">(optional, can be a short ans)</span></div>
        <textarea class="m-note" data-note="${esc(slug)}" rows="2"
          placeholder="One example is plenty. e.g. “Led the checkout redesign end-to-end, brief to ship.”">${esc(S.notes[slug] || '')}</textarea>
        <div class="m-foot">
          <button class="m-back" data-action="step-back">← Back</button>
          <div class="m-dots">${dots}</div>
          <button class="m-next" data-action="step-next">${step >= slugs.length - 1 ? 'Done' : 'Next'}</button>
        </div>
      </div>
    </div>`;
  }

  function infoModalHTML() {
    const legNames = legs().map(nameOf).join(', ');
    const trackNote = isLeadTrack()
      ? 'You’re on the Lead+ track: the legs shift to what holds up a lead.'
      : 'You’re on the IC track.';
    return `<div class="overlay" data-action="modal-close">
      <div class="modal info-modal" data-stop="1">
        <button class="modal-x" data-action="modal-close">✕</button>
        <div class="info-title">The tripod, in short</div>
        <div class="info-sub">Every role here stands the same way. What changes is what each part asks of you. ${trackNote}</div>
        <div class="info-rows">
          <div class="info-row">
            <svg width="36" height="32" viewBox="0 0 36 32"><rect x="5" y="4" width="26" height="14" rx="4" fill="none" stroke="#161616" stroke-width="1.2"/><line x1="11" y1="9" x2="19" y2="9" stroke="#CFCFCF" stroke-width="1.2"/><line x1="11" y1="13" x2="23" y2="13" stroke="#CFCFCF" stroke-width="1.2"/></svg>
            <div><div class="info-row-title">The head: the rest you carry.</div><div class="info-row-sub">Every other competency expected at your role.</div></div>
          </div>
          <div class="info-row">
            <svg width="36" height="32" viewBox="0 0 36 32"><line x1="14" y1="4" x2="8" y2="28" stroke="#161616" stroke-width="1.2"/><line x1="18" y1="4" x2="18" y2="28" stroke="#161616" stroke-width="1.2"/><line x1="22" y1="4" x2="28" y2="28" stroke="#161616" stroke-width="1.2"/></svg>
            <div><div class="info-row-title">The legs: the core three.</div><div class="info-row-sub">What holds you up at your level: ${esc(legNames)}.</div></div>
          </div>
        </div>
        <div class="info-foot">You'll rate yourself Building, Established or Leading on each competency, relative to your current role. A map, not a scorecard.</div>
      </div>
    </div>`;
  }

  // ---------- Render + event wiring ----------

  // Spider is the single layout now (A · Tripod-led and C · Plan were archived to
  // archive/layout-explorations.js). Table view remains a separate toggle.
  function mainViewHTML() {
    if (S.view === 'table') return tableViewHTML();
    return spiderViewHTML();
  }

  function render() {
    if (S.route === 'boot') {
      root.innerHTML = `<div class="splash"><img class="logo" src="assets/parallel-logo.svg" alt="Parallel"></div>`;
      return;
    }
    if (S.route === 'landing') { root.innerHTML = renderLanding(); return; }
    if (S.route === 'admin') {
      const prev = root.querySelector('[data-keepscroll="admin"]');
      const keptTop = prev ? prev.scrollTop : 0, keptLeft = prev ? prev.scrollLeft : 0;
      root.innerHTML = `${appbar()}${renderAdmin()}`;
      const next = root.querySelector('[data-keepscroll="admin"]');
      if (next) { next.scrollTop = keptTop; next.scrollLeft = keptLeft; }
      return;
    }
    // Preserve scroll positions of scrollable regions across re-renders.
    const kept = {};
    root.querySelectorAll('[data-keepscroll]').forEach(el => {
      kept[el.dataset.keepscroll] = { top: el.scrollTop, left: el.scrollLeft };
    });
    const modalEl = root.querySelector('.assess-modal');
    const modalScroll = modalEl ? modalEl.scrollTop : 0;

    root.innerHTML = `${appbar()}
      ${mainViewHTML()}
      ${S.assess ? assessModalHTML() : ''}
      ${S.modal ? infoModalHTML() : ''}
      ${S.onboard ? onboardModalHTML() : ''}`;

    root.querySelectorAll('[data-keepscroll]').forEach(el => {
      const k = kept[el.dataset.keepscroll];
      if (k) { el.scrollTop = k.top; el.scrollLeft = k.left; }
    });
    const newModal = root.querySelector('.assess-modal');
    if (newModal) newModal.scrollTop = modalScroll;

    bindHovers();
  }

  // Leg hover (tripod + labels) and "Leading" popover: direct DOM, no re-render.
  function bindHovers() {
    const setLegHover = (i, on) => {
      const halo = root.querySelector(`[data-halo="${i}"]`);
      const poly = root.querySelector(`[data-legpoly="${i}"]`);
      if (halo && !halo.classList.contains('sel')) halo.classList.toggle('hov', on);
      if (poly && !poly.classList.contains('on')) poly.style.opacity = on ? '1' : '';
    };
    root.querySelectorAll('[data-leg]').forEach(el => {
      const i = Number(el.dataset.leg);
      el.addEventListener('mouseenter', () => setLegHover(i, true));
      el.addEventListener('mouseleave', () => setLegHover(i, false));
    });
    // Rating pills teach the scale on hover: the popover swaps to the hovered
    // level's meaning (Leading also previews the next-role behaviours).
    const pop = root.querySelector('#rate-pop');
    if (pop) {
      root.querySelectorAll('.seg-pick[data-rt]').forEach(btn => {
        const rt = btn.dataset.rt;
        btn.addEventListener('mouseenter', () => {
          pop.querySelectorAll('.rate-pop-c').forEach(c => c.classList.toggle('on', c.dataset.c === rt));
          pop.classList.add('show');
        });
        btn.addEventListener('mouseleave', () => pop.classList.remove('show'));
      });
    }
  }

  function focusComp(slug) {
    const open = Object.assign({}, S.open);
    open[slug] = true;
    setState({ open, focus: slug, view: 'tripod' });
    const el = root.querySelector(`[data-acc="${slug}"]`);
    const cont = el && el.closest('[data-keepscroll]');
    if (cont && el) cont.scrollTo({ top: Math.max(el.offsetTop - 16, 0), behavior: 'smooth' });
  }

  function openAssess(atSlug) {
    const slugs = itemSlugs();
    let step;
    if (atSlug) {
      step = Math.max(slugs.indexOf(atSlug), 0);
    } else {
      const first = slugs.findIndex(s => !S.ratings[s]);
      step = first < 0 ? 0 : first;
    }
    setState({ assess: true, step });
  }

  root.addEventListener('click', e => {
    // Close the user-chip menu on any click outside it.
    if (S.chipOpen && !e.target.closest('.user-chip-wrap')) {
      S.chipOpen = false;
      const menu = root.querySelector('.user-menu');
      if (menu) menu.remove();
      const chev = root.querySelector('.user-chip .card-chev');
      if (chev) chev.classList.remove('open');
    }
    const stopEl = e.target.closest('[data-stop]');
    const actEl = e.target.closest('[data-action]');
    if (!actEl) return;
    if (actEl.dataset.action === 'chip-toggle') { setState({ chipOpen: !S.chipOpen }); return; }
    // Clicks inside a modal shouldn't trigger the overlay's close action.
    if (stopEl && actEl.contains(stopEl) && actEl.classList.contains('overlay')) return;
    const a = actEl.dataset.action;

    if (a === 'signin') { signIn(); return; }
    if (a === 'signout') { signOut(); return; }
    if (a === 'admin-open') { openAdmin(); return; }
    if (a === 'admin-close') { setState({ route: 'app' }); return; }
    if (a === 'admin-export') { exportAdminCSV(); return; }
    if (a.startsWith('admin-width:')) {
      const w = a.slice(12);
      try { localStorage.setItem('parallel-progression-admin-width-v1', w); } catch (err) {}
      setState({ adminWidth: w });
      return;
    }
    if (a.startsWith('admin-view:')) { setState({ adminView: a.slice(11) }); return; }
    if (a === 'onboard-start') {
      try { localStorage.setItem(LS_ONBOARDED, '1'); } catch (err) {}
      S.onboard = false;
      openAssess();
      return;
    }
    if (a === 'onboard-skip') {
      try { localStorage.setItem(LS_ONBOARDED, '1'); } catch (err) {}
      setState({ onboard: false });
      return;
    }
    if (a === 'view-tripod') { setState({ view: 'tripod' }); return; }
    if (a === 'view-table') { setState({ view: 'table' }); return; }
    if (a === 'tview-compare') { setState({ tview: 'compare' }); return; }
    if (a === 'tview-full') { setState({ tview: 'full' }); return; }
    if (a === 'modal-open') { setState({ modal: true }); return; }
    if (a === 'modal-close') { setState({ modal: false }); return; }
    if (a === 'assess-open') { openAssess(); return; }
    if (a === 'assess-close') { setState({ assess: false }); return; }
    if (a === 'step-back') { setState({ step: Math.max((S.step || 0) - 1, 0) }); return; }
    if (a === 'step-next') {
      if ((S.step || 0) >= itemSlugs().length - 1) setState({ assess: false });
      else setState({ step: (S.step || 0) + 1 });
      return;
    }
    if (a.startsWith('assess-at:')) { openAssess(a.slice(10)); return; }
    if (a.startsWith('step:')) { setState({ step: Number(a.slice(5)) }); return; }
    if (a.startsWith('focus:')) { focusComp(a.slice(6)); return; }
    if (a.startsWith('toggle:')) {
      const slug = a.slice(7);
      const open = Object.assign({}, S.open);
      open[slug] = !open[slug];
      setState({ open, focus: slug });
      return;
    }
    if (a.startsWith('rate:')) {
      const [, slug, rt] = a.split(':');
      if (S.ratings[slug] === rt) delete S.ratings[slug]; else S.ratings[slug] = rt;
      saveRatings();
      persistRating(slug);
      render();
      return;
    }
  });

  // Evidence notes: update state directly on input (no re-render, keeps focus);
  // sync to Supabase when the field is left.
  root.addEventListener('input', e => {
    const ta = e.target.closest('[data-note]');
    if (!ta) return;
    const v = ta.value.trim();
    if (v) S.notes[ta.dataset.note] = v; else delete S.notes[ta.dataset.note];
    saveNotes();
  });
  root.addEventListener('focusout', e => {
    const ta = e.target.closest && e.target.closest('[data-note]');
    if (ta && S.ratings[ta.dataset.note]) persistRating(ta.dataset.note);
  });

  root.addEventListener('change', e => {
    const sel = e.target.closest('select[data-role]');
    if (!sel) return;
    // All comparisons and bumps run on DES_OPTIONS (the org ladder), never the
    // raw rubric roles: those include Intern and Associate PD, which the org
    // doesn't use and must never be written to the DB.
    if (sel.dataset.role === 'cur') {
      const nc = sel.value;
      const patch = { cur: nc };
      const ci = DES_OPTIONS.indexOf(nc);
      if (DES_OPTIONS.indexOf(S.des) <= ci) patch.des = DES_OPTIONS[Math.min(ci + 1, DES_OPTIONS.length - 1)];
      setState(patch);
      persistProfile();
    } else {
      const nd = sel.value;
      if (DES_OPTIONS.indexOf(nd) <= DES_OPTIONS.indexOf(S.cur)) { render(); return; }
      setState({ des: nd });
      persistProfile();
    }
  });

  // ---------- Boot ----------

  fetch('data/rubric_data.json')
    .then(r => r.json())
    .then(data => {
      DATA = data;
      if (data.tripod && data.tripod.base) baseSlug = data.tripod.base.slug || data.tripod.base;
      render();
    })
    .catch(() => render());

  render();      // splash while auth resolves
  initAuth();
})();
