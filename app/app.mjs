// Deine Röhre's page (README.md) in the Archon Grid's design language (kit/README.md): the emblem is home;
// it opens the compact menu (Inbox, Days, Music, Settings); an item grows into its window; the player is a window of
// its own beside it. Behaviour of menu and windows: the UI base (UB, kit/ui_base.js); the iron frames, stars and the
// emblem's idle life: the Archon kit (AG, kit/archon_ui.js). The rules (what may play, how many a day) are in
// lists.mjs; the disk and the app window are behind window.roehre (preload.cjs). The video plays in YouTube's
// embedded player; when it is paused, finished or refused, a cover of our own lies over it, so YouTube's "more videos"
// never shows.
import * as L from './lists.mjs';

// The PC app's bridge (preload.cjs), or, in a browser (the iPhone, the tablet), the web version of it (web-api.mjs).
const api = window.roehre || (await import('./web-api.mjs')).api;
if (!api.desktop) document.body.classList.add('wl-web');
let google = { configured: false, signedIn: false };   // the Google sign-in (Settings), from the main program
let checking = false, playlists = null;               // a look at the channels is running; Tim's playlists once loaded
const $ = (id) => document.getElementById(id);
const home = $('home'), cover = $('cover'), toast = $('toast'), bar = $('bar'), playerWin = $('w-player');

let state = L.emptyState();
let playing = null;            // { id, from: 'music' | dayId, queue: [id] }
let shuffle = false, only = false, mini = false, paused = false;
const unavailable = new Set(); // videos YouTube will not show outside youtube.com (known since this start)

// ---- small helpers ----
function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  fillIn(el, kids, false);
  return el;
}
// Put children into an element: lists are flattened, empty ones (null, false, '') left out.
function fillIn(el, kids, replace = true) {
  const list = [kids].flat(Infinity).filter((k) => k != null && k !== false && k !== '');
  if (replace) el.replaceChildren(...list); else el.append(...list);
}
const fill = (el, ...kids) => fillIn(el, kids);
const btn = (label, onclick, cls = '', more = {}) => h('button', { type: 'button', class: cls || null, onclick, ...more }, label);
let toastTimer = null;
function say(text) {
  toast.textContent = text; toast.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}
let saveTimer = null, shareTimer = null;
function changed() {
  state.updated = new Date().toISOString();
  render();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { saveTimer = null; api.save(state); }, 300);
  clearTimeout(shareTimer);
  shareTimer = setTimeout(() => { shareTimer = null; share(); }, 2000);   // to Drive, a moment after the last change
}

// ---- the same lists on every device: one file in Google Drive (google-api.mjs) ----
// A device that has never shared joins (lists.mjs join); after that the copy changed last wins (lists.mjs newer).
const JOINED = 'roehre:joined';
const joined = () => { try { return localStorage.getItem(JOINED) === '1'; } catch { return false; } };
const setJoined = () => { try { localStorage.setItem(JOINED, '1'); } catch { /* private mode: joins again next time */ } };
let syncing = false, syncProblem = '';
async function share() {
  if (!google.signedIn || !joined()) return;
  const r = await api.google.driveSave(state);
  if (!r.ok) syncNote(r);
  else syncProblem = '';
}
function syncNote(r) {
  if (r.error !== syncProblem) say(r.error);   // each problem said once
  syncProblem = r.error;
  if (r.signedOut) refreshGoogle().then(render);
}
async function pull() {
  if (!google.signedIn || syncing || saveTimer || shareTimer) return;   // a change of ours still on its way: it wins
  syncing = true;
  try {
    const r = await api.google.driveLoad();
    if (!r.ok) { syncNote(r); return; }
    syncProblem = '';
    if (!joined()) {
      if (r.value) { state = L.join(state, r.value); say('Your lists are now the same as on your other devices.'); }
      setJoined();
      api.save(state); render();
      await api.google.driveSave(state);
      return;
    }
    if (L.newer(state, r.value) === 'remote') { state = L.cleanState(r.value); api.save(state); render(); }
    else if (!r.value || r.value.updated !== state.updated) await api.google.driveSave(state);
  } finally { syncing = false; }
}
addEventListener('focus', () => pull());
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') pull(); });
setInterval(() => pull(), 2 * 60 * 1000);
const title = (id) => state.videos[id]?.title || 'Video ' + id;
const dayById = (id) => state.days.find((d) => d.id === id);
// A day's name; the coming Saturday is always "Saturday", like its button (also when that is tomorrow).
const dayLabel = (d) => d.name || (d.date === L.nextSaturday() && d.date !== L.dayKey() ? 'Saturday' : L.dayName(d.date));
const openDay = () => state.days.find((d) => L.dayStatus(d) === 'open');
// "3 h ago", "2 days ago"
function ago(iso, now = new Date()) {
  const min = Math.max(0, Math.round((now - Date.parse(iso)) / 60000));
  if (!Date.parse(iso)) return '';
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  if (min < 1440) return `${Math.round(min / 60)} h ago`;
  const d = Math.round(min / 1440);
  return d === 1 ? 'yesterday' : `${d} days ago`;
}

// ---- home and the menu ----
const noEmblem = () => { $('emblem').hidden = true; $('word').hidden = false; };   // no emblem on this PC: the word
$('emblem').addEventListener('error', noEmblem);
if ($('emblem').complete && !$('emblem').naturalWidth) noEmblem();   // it may have failed before this script ran
AG.life($('emblem'));
const SVG = 'http://www.w3.org/2000/svg';
function diamonds() {   // an ember diamond where each path leaves home and where it meets its window (kit/README.md)
  const svg = document.querySelector('.ub-lines');
  if (!svg || !svg.childElementCount) return;
  const hr = home.getBoundingClientRect();
  const at = (x, y) => { const d = document.createElementNS(SVG, 'path'); d.setAttribute('d', `M${x} ${y - 4} L${x + 4} ${y} L${x} ${y + 4} L${x - 4} ${y} Z`); d.setAttribute('class', 'wl-diamond'); svg.appendChild(d); };
  at(hr.right, hr.top + hr.height / 2);
  for (const it of document.querySelectorAll('.ub-item')) { const r = it.getBoundingClientRect(); at(r.left, r.top + r.height / 2); }
}
const menu = UB.menu(home, document.querySelectorAll('.ub-item'), {
  gap: 64,
  onOpen: () => setTimeout(diamonds, 480),   // once the lines are drawn and the items have settled
  onExpand: () => render(),
});
const item = (win) => document.querySelector(`.ub-item[data-window="${win}"]`);
// From one window to another: back into the menu, then the other item grows (the base's own motion both ways).
function goTo(win) { menu.back(); setTimeout(() => menu.expand(item(win)), 330); }

// ---- one video as a card: its picture, title, channel; buttons below ----
const todayDay = () => state.days.find((d) => d.date === L.dayKey());
const saturdayDay = () => state.days.find((d) => d.date === L.nextSaturday());
function card(id, buttons, cls = '') {
  const v = state.videos[id];
  return h('li', { class: `wl-card${cls}` },
    h('button', { type: 'button', class: 'wl-thumb', 'aria-label': 'Show bigger: ' + title(id), onclick: () => preview(id) },
      h('img', { src: L.thumbUrl(id), alt: '', loading: 'lazy', onerror: (e) => e.target.removeAttribute('src') })),
    h('div', { class: 't', title: title(id) }, title(id)),
    h('div', { class: 'c' }, [v?.channel, state.feed.includes(id) ? ago(v?.published) : null, unavailable.has(id) ? 'plays only on youtube.com' : null].filter(Boolean).join(' · ')),
    h('div', { class: 'acts' }, buttons));
}
// One click to plan: Today, Saturday, any other coming day, Music, back to Pick; and Remove.
function planButtons(id, here = L.placeOf(state, id)) {
  const go = (target, label) => {
    const r = L.planFor(state, id, target);
    if (r.error) { say(r.error); return; }
    say(`${title(id).slice(0, 40)}${title(id).length > 40 ? '…' : ''}: ${label}.`);
    hidePreview(); changed();
  };
  const now = new Date(), t = todayDay(), sa = saturdayDay();
  const others = state.days.filter((d) => d !== t && d !== sa && L.dayStatus(d, now) !== 'over');
  return [
    here !== t?.id ? btn('Today', () => go('today', 'today')) : null,
    here !== sa?.id ? btn('Saturday', () => go('saturday', 'Saturday')) : null,
    others.filter((d) => d.id !== here).map((d) => btn(dayLabel(d), () => go(d.id, dayLabel(d)))),
    here !== 'music' ? btn('Music', () => go('music', 'Music')) : null,
    here && here !== 'inbox' && here !== 'feed' ? btn('Back to Pick', () => go('inbox', 'back in Pick'), 'wl-quiet') : null,
    removeBtn(id),
  ];
}
const removeBtn = (id) => btn('Remove', () => { if (playing?.id === id) stopPlaying(); L.removeVideo(state, id); hidePreview(); changed(); }, 'wl-quiet');

// A bigger look at a video without playing it.
const previewEl = $('preview');
function preview(id) {
  const v = state.videos[id];
  if (!v) return;
  fill(previewEl,
    h('img', { src: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, alt: '', onerror: (e) => { e.target.src = L.thumbUrl(id); } }),
    h('div', { class: 'wl-pv-text' },
      h('p', { class: 'wl-h' }, title(id)),
      h('p', { class: 'wl-sub' }, [v.channel, v.published ? ago(v.published) : null].filter(Boolean).join(' · ')),
      h('div', { class: 'acts' }, planButtons(id), btn('Close', hidePreview, 'wl-quiet'))));
  previewEl.hidden = false;
  UB.front(previewEl);
}
function hidePreview() { previewEl.hidden = true; }

// ---- Today: what is planned for today, a big Watch; the coming days below ----
function renderToday() {
  const now = new Date(), t = todayDay();
  const left = t ? t.items.filter((id) => !t.watched.includes(id)) : [];
  const status = t && L.dayStatus(t, now);
  const todayCards = t ? t.items.map((id) => {
    const watched = t.watched.includes(id);
    return card(id, [
      watched ? h('span', { class: 'wl-tag' }, 'Watched') : null,
      status === 'open' ? btn(watched ? 'Again' : 'Play', () => play(id, t.id), watched ? '' : 'wl-go') : null,
      planButtons(id, t.id),
    ], `${watched ? ' done' : ''}${playing?.id === id ? ' playing' : ''}`);
  }) : [];
  const coming = state.days.filter((d) => d !== t && L.dayStatus(d, now) !== 'over');
  fill($('today'),
    !t || !t.items.length
      ? h('div', { class: 'wl-empty' },
          h('p', { style: 'margin:0 0 12px' }, 'Nothing for today yet. Choose a few videos in Pick: one click on "Today" under a video.'),
          btn('Open Pick', () => goTo('w-pick'), 'wl-go'))
      : [
          h('p', { class: 'wl-sub' }, `${L.dayLine(t, now)} · ${t.items.length} of ${state.settings.perDay}`),
          status === 'open' && left.length ? h('div', { class: 'wl-row-of' }, btn(left.length === t.items.length ? 'Watch' : 'Continue', () => play(left[0], t.id), 'wl-go wl-big')) : null,
          status === 'waiting' ? h('p', { class: 'wl-note' }, `Your videos unlock ${L.untilText(L.windowOf(t).opens, now)}.`) : null,
          status === 'open' && !left.length ? h('p', { class: 'wl-note' }, 'Everything for today is watched.') : null,
          h('ul', { class: 'wl-cards' }, todayCards),
        ],
    coming.map((d) => [
      h('div', { class: 'ub-section' }, dayLabel(d)),
      h('p', { class: 'wl-sub' }, `${d.date}, ${L.dayLine(d, now)} · ${d.items.length} of ${state.settings.perDay}`),
      d.items.length ? h('ul', { class: 'wl-cards' }, d.items.map((id) => card(id, planButtons(id, d.id)))) : h('p', { class: 'wl-empty' }, 'Nothing planned yet.'),
    ]),
    h('div', { class: 'wl-another' },
      anotherOpen ? renderAnother() : btn('Plan another day…', () => { anotherOpen = true; renderToday(); }, 'wl-quiet')));
}
// Another day than today and Saturday (made once, so a re-render never loses what is typed).
let anotherOpen = false;
const nd = {
  date: h('input', { type: 'date', value: L.dayKey(), min: L.dayKey() }),
  from: h('input', { type: 'time', value: '' }),
  to: h('input', { type: 'time', value: '' }),
};
function renderAnother() {
  return [
    h('div', { class: 'ub-section' }, 'Another day'),
    h('div', { class: 'wl-form' }, h('label', {}, 'Date', nd.date), h('label', {}, 'From', nd.from), h('label', {}, 'Until', nd.to)),
    h('div', { class: 'wl-row-of' },
      btn('Create', () => {
        const r = L.newDay(state, { date: nd.date.value, from: nd.from.value, to: nd.to.value });
        if (r.error) { say(r.error); return; }
        anotherOpen = false; changed();
        say(`${dayLabel(r.day)} is ready: its button is under every video in Pick.`);
      }, 'wl-go'),
      btn('Cancel', () => { anotherOpen = false; renderToday(); }, 'wl-quiet')),
  ];
}

// ---- Pick: everything you might watch, as cards: your own links (Mine) and your channels' new videos ----
let pickFilter = 'all';
const paste = h('input', { type: 'text', placeholder: 'Paste YouTube links here (or press Ctrl+V anywhere)', 'aria-label': 'YouTube links' });
const addPasted = () => { addLinks(paste.value); paste.value = ''; };
paste.addEventListener('keydown', (e) => { if (e.key === 'Enter') addPasted(); });
function renderPick() {
  const list = pickFilter === 'mine' ? state.inbox : pickFilter === 'channels' ? state.feed : [...state.inbox, ...state.feed];
  const seg = (key, label, n) => h('button', { type: 'button', 'aria-pressed': String(pickFilter === key), onclick: () => { pickFilter = key; renderPick(); } }, `${label} ${n}`);
  const checked = state.lastCheck ? `last look ${ago(state.lastCheck)}` : 'not looked yet';
  fill($('pick'),
    h('div', { class: 'wl-paste' }, paste, btn('Add', addPasted, 'wl-go')),
    h('div', { class: 'wl-row-of' },
      h('div', { class: 'ub-seg', role: 'group', 'aria-label': 'Show' },
        seg('all', 'All', state.inbox.length + state.feed.length), seg('mine', 'Mine', state.inbox.length), seg('channels', 'Channels', state.feed.length)),
      pickFilter !== 'mine' && google.signedIn ? [
        h('span', { class: 'wl-sub', style: 'margin:0' }, checking ? 'Looking at your channels…' : `Channels: ${checked}`),
        btn('Look now', () => checkChannels(true), 'wl-quiet', { disabled: checking })] : null),
    pickFilter !== 'mine' && !google.signedIn ? h('p', { class: 'wl-note' }, 'Sign in with Google (Settings) and the new videos of your subscribed channels appear here too, newest first. No recommendations.') : null,
    list.length
      ? h('ul', { class: 'wl-cards' }, list.map((id) => card(id, planButtons(id))))
      : h('p', { class: 'wl-empty' }, pickFilter === 'channels' ? 'Nothing new from your channels.' : 'Copy a video\'s address on YouTube (or "Share, Copy link") and paste it here.'));
}

const CHECK_EVERY = 3 * 3600 * 1000, FIRST_LOOK = 3 * 86400 * 1000, OVERLAP = 3600 * 1000;   // every 3 hours; the first look 3 days back
async function checkChannels(byHand = false) {
  if (!google.signedIn || checking) return;
  checking = true; renderPick();
  const started = new Date();
  // each look reaches an hour behind the last one (a video YouTube lists late is still caught; `seen` drops repeats)
  const r = await api.google.feed(new Date(state.lastCheck ? Date.parse(state.lastCheck) - OVERLAP : started - FIRST_LOOK).toISOString());
  checking = false;
  if (!r.ok) { say(r.error); if (r.signedOut) await refreshGoogle(); renderPick(); return; }
  const added = L.addToFeed(state, r.value, started);
  state.lastCheck = started.toISOString();
  if (added.length || byHand) say(added.length ? `${added.length} new from your channels (Pick).` : 'Nothing new from your channels.');
  changed();
}
async function refreshGoogle() {
  const r = await api.google.status();
  if (r.ok) google = r.value;
  if (!google.signedIn) playlists = null;
}
// Days that are over close by themselves; what was not watched goes back to Pick.
function tidy() {
  const before = state.days.length, back = L.tidyDays(state);
  if (state.days.length === before) return;
  if (back) say(`${back} not watched went back to Pick.`);
  changed();
}

// ---- Music ----
// Tim's YouTube playlists (and liked videos) into Music, once signed in.
const listPick = h('select', { 'aria-label': 'Your YouTube playlists' });
async function loadPlaylists() {
  const r = await api.google.playlists();
  if (!r.ok) { say(r.error); if (r.signedOut) { await refreshGoogle(); render(); } return; }
  playlists = r.value;
  fill(listPick, playlists.map((p) => h('option', { value: p.id }, p.count == null ? p.title : `${p.title} (${p.count})`)));
  renderMusic();
}
async function importPlaylist() {
  const p = playlists?.find((x) => x.id === listPick.value);
  if (!p) return;
  say(`Fetching "${p.title}"…`);
  const r = await api.google.playlist(p.id);
  if (!r.ok) { say(r.error); return; }
  const n = L.importToMusic(state, r.value);
  say(`"${p.title}": ${n} in Music.`);
  changed();
}
function renderMusic() {
  fill($('music'),
    h('p', { class: 'wl-sub' }, 'Plays any time, one after another, in a loop. "Mini" keeps a small player in the corner of the screen.'),
    google.signedIn ? h('div', { class: 'wl-row-of' },
      playlists ? [listPick, btn('Import into Music', importPlaylist)] : btn('Import from YouTube…', loadPlaylists)) : null,
    state.music.length ? h('div', { class: 'wl-row-of' },
      btn('Play all', () => play(L.musicOrder(state.music, shuffle)[0], 'music'), 'wl-go'),
      btn(shuffle ? 'Shuffle on' : 'Shuffle off', () => { shuffle = !shuffle; render(); }, '', { 'aria-pressed': String(shuffle) })) : null,
    state.music.length
      ? h('ul', { class: 'wl-cards' }, state.music.map((id) => card(id, [btn('Play', () => play(id, 'music')), planButtons(id, 'music')], playing?.id === id ? ' playing' : '')))
      : h('p', { class: 'wl-empty' }, 'No music yet. In Pick, one click on "Music" under a video.'));
}

// ---- Settings ----
// The window of Today or Saturday: kept for the days laid out from now on, and given to the planned one too.
function timeInput(k, end) {
  return h('input', { type: 'time', value: state.settings.times[k][end], 'aria-label': `${k} ${end}`, onchange: (e) => {
    state.settings.times[k][end] = e.target.value;
    const day = k === 'today' ? todayDay() : saturdayDay();
    if (day) day[end] = e.target.value;
    changed();
  } });
}
function renderSettings() {
  fill($('settings'), h('div', { class: 'wl-set' },
    h('label', {}, 'Videos per day',
      h('input', { type: 'number', min: '1', max: '20', value: String(state.settings.perDay),
        onchange: (e) => { state.settings = L.cleanState({ ...state, settings: { ...state.settings, perDay: e.target.value } }).settings; changed(); } })),
    h('div', { class: 'ub-section' }, 'When videos play'),
    ['today', 'saturday'].map((k) => h('label', {}, k === 'today' ? 'Today' : 'Saturday',
      h('span', { class: 'wl-times' },
        timeInput(k, 'from'), h('span', { class: 'ag-dim' }, 'until'), timeInput(k, 'to')))),
    h('p', { class: 'wl-note' }, 'Empty means the whole day. A day already planned changes with it.'),
    h('div', { class: 'ub-section' }, 'Window'),
    !api.desktop ? null : h('label', {}, 'Window stays in front of other programs',
      btn(state.settings.onTop ? 'On' : 'Off', () => { state.settings.onTop = !state.settings.onTop; api.onTop(state.settings.onTop); changed(); }, '', { 'aria-pressed': String(state.settings.onTop) })),
    h('label', {}, 'Window places and sizes', btn('Reset', () => { UB.reset(); say('Every window is back in its first place.'); })),
    h('div', { class: 'ub-section' }, 'Google account'),
    h('p', { class: 'wl-note' }, google.signedIn
      ? 'Signed in. Reads your subscriptions (Channels) and playlists (Music), changes nothing on YouTube, and keeps your lists in one hidden file in your Google Drive, so every device shows the same.'
      : google.configured ? 'Ready. Sign in to see your channels and playlists, and to have the same lists on every device.'
        : api.desktop ? 'First the client file from your Google Cloud project (README, "Mit Google anmelden"), then sign in.'
          : 'First the client ID of the web client from your Google Cloud project (README, "Auf dem Handy").'),
    h('div', { class: 'wl-row-of' },
      btn(api.desktop ? (google.configured ? 'Choose another client file' : 'Choose client file') : (google.configured ? 'Change client ID' : 'Enter client ID'), async () => {
        const r = await api.google.chooseClient();
        if (!r.ok) { say(r.error); return; }
        if (r.value) { say(api.desktop ? 'Client file taken.' : 'Client ID taken.'); await refreshGoogle(); render(); }
      }, google.configured ? 'wl-quiet' : 'wl-go'),
      google.configured && !google.signedIn ? btn('Sign in with Google', async () => {
        say('Your browser opens Google\'s sign-in page…');
        const r = await api.google.signIn();
        if (!r.ok) { say(r.error); return; }
        await refreshGoogle(); render();
        say('Signed in.');
        await pull();
        checkChannels();
      }, 'wl-go') : null,
      google.signedIn ? btn('Sign out', async () => { await api.google.signOut(); await refreshGoogle(); render(); say('Signed out.'); }) : null)));
}

function render() {
  renderToday(); renderPick(); renderMusic(); renderSettings(); renderBar();
}

// ---- adding videos ----
async function addLinks(text) {
  const ids = L.videoIds(text);
  if (!ids.length) { if (String(text).trim()) say('No YouTube link found in that.'); return; }
  const added = L.addToInbox(state, ids);
  if (!added.length) { say(ids.length === 1 ? 'That video is already in a list.' : 'Those videos are already in your lists.'); return; }
  say(added.length === 1 ? 'Added to Pick.' : `${added.length} videos added to Pick.`);
  changed();
  fetchInfo(added);
}
async function fetchInfo(ids) {
  if (!ids.length) return;
  const info = await api.info(ids);
  for (const [id, i] of Object.entries(info)) {
    if (!state.videos[id]) continue;
    if (i.ok === false) unavailable.add(id);
    if (i.ok) Object.assign(state.videos[id], { title: i.title, channel: i.channel });
  }
  changed();
}
document.addEventListener('paste', (e) => {
  if (e.target.closest && e.target.closest('input, textarea')) return;
  addLinks(e.clipboardData?.getData('text') || '');
});

// ---- the player window ----
let yt = null, ytReady = null, playerMade = false;
function loadYouTube() {
  if (ytReady) return ytReady;
  ytReady = new Promise((resolve) => {
    window.onYouTubeIframeAPIReady = resolve;
    document.head.append(h('script', { src: 'https://www.youtube.com/iframe_api' }));
  }).then(() => new Promise((resolve) => {
    yt = new YT.Player('player', {
      host: 'https://www.youtube-nocookie.com',
      playerVars: { autoplay: 1, rel: 0, iv_load_policy: 3, playsinline: 1, origin: location.origin },
      events: { onReady: () => resolve(yt), onStateChange: (e) => stateChange(e.data), onError: (e) => playError(e.data) },
    });
  }));
  return ytReady;
}
function showPlayer() {
  playerWin.hidden = false;
  if (!playerMade) { UB.window(playerWin, { onClose: () => { stopPlaying(); render(); } }); playerMade = true; }
  UB.front(playerWin);
}

function queueFor(from, startId) {
  if (from === 'music') return L.musicOrder(state.music, shuffle, startId);
  const day = dayById(from);
  return day ? day.items.slice(day.items.indexOf(startId)) : [];
}
async function play(id, from) {
  if (!L.canPlay(state, id)) { say('This video is locked right now.'); return; }
  playing = { id, from, queue: queueFor(from, id) };
  paused = false; hideCover();
  showPlayer();
  if (!mini && !only) watch(true);   // watching: the video fills the window
  render();
  const p = await loadYouTube();
  p.loadVideoById(id);
}
function stopPlaying() {
  if (yt) yt.stopVideo();
  playing = null; paused = false; hideCover();
  setOnly(false); setMini(false);
  playerWin.hidden = true;
}
// The next video: music loops; a day moves on to the next one not yet watched, while its time is still open.
function nextId(step = 1) {
  if (!playing) return null;
  const q = playing.queue, i = q.indexOf(playing.id);
  if (playing.from === 'music') return q.length ? q[(i + step + q.length) % q.length] : null;
  const day = dayById(playing.from);
  if (!day || L.dayStatus(day) !== 'open') return null;
  if (step < 0) return q[i - 1] || null;
  return q.slice(i + 1).find((id) => !day.watched.includes(id) && day.items.includes(id)) || null;
}
function skip(step) {
  const id = nextId(step);
  if (id) play(id, playing.from);
  else if (step > 0) finished();
}
function stateChange(s) {
  if (!playing) return;
  if (s === YT.PlayerState.PLAYING) { paused = false; hideCover(); }
  else if (s === YT.PlayerState.PAUSED) { paused = true; showCover(h('p', { class: 'big' }, 'Paused'), h('p', { class: 'ag-dim' }, 'Click or press Space to continue.')); }
  else if (s === YT.PlayerState.ENDED) {
    if (playing.from !== 'music') { L.markWatched(state, playing.from, playing.id); changed(); }
    skip(1);
  }
  renderBar();
}
function finished() {
  const day = playing && dayById(playing.from);
  const over = day && L.dayStatus(day) !== 'open';
  showCover(
    h('p', { class: 'big' }, over ? `${dayLabel(day)}'s time is over.` : `That was everything on ${day ? dayLabel(day) : 'the list'}.`),
    h('div', { class: 'wl-row-of' }, btn('Close the player', (e) => { e.stopPropagation(); stopPlaying(); render(); }, 'wl-go')));
  paused = false;
}
function playError(code) {
  if (!playing) return;
  const id = playing.id;
  const refused = code === 101 || code === 150 || code === 153;
  if (refused) unavailable.add(id);
  showCover(
    h('p', { class: 'big' }, refused ? 'This video plays only on youtube.com.' : code === 100 ? 'This video is gone (removed or private).' : 'This video could not be played.'),
    refused ? h('p', { class: 'ag-dim' }, 'Its uploader does not allow other players. YouTube in the browser shows recommendations again.') : null,
    h('div', { class: 'wl-row-of' },
      refused ? btn('Open on YouTube', (e) => { e.stopPropagation(); api.youtube(id); }) : null,
      nextId(1) ? btn('Next video', (e) => { e.stopPropagation(); skip(1); }, 'wl-go') : null,
      btn('Close the player', (e) => { e.stopPropagation(); stopPlaying(); render(); })));
}
function showCover(...kids) { fill(cover, h('div', {}, kids)); cover.hidden = false; }
function hideCover() { cover.hidden = true; }
cover.addEventListener('click', () => { if (paused && yt) yt.playVideo(); });
function toggle() {
  if (!yt || !playing) return;
  if (yt.getPlayerState() === YT.PlayerState.PLAYING) yt.pauseVideo(); else yt.playVideo();
}

function setOnly(on) { only = on; document.body.classList.toggle('wl-only', on || mini); api.watching(on || mini); renderBar(); }
// Watching: the video fills the whole window (any size; F11 for the whole screen), the menu waits behind it, the bar
// shows only when the mouse touches the top edge. Escape: pause, out of full screen, the menu and the windows again.
let barTimer = null;
function watch(on) {
  setOnly(on);
  hidePreview();
  if (on) { peekBar(2500); say('Esc: the menu · F11: full screen · Space: pause'); }
}
function leaveWatching() {
  if (mini) setMini(false);
  if (yt && playing && yt.getPlayerState?.() === YT.PlayerState.PLAYING) yt.pauseVideo();
  setOnly(false);
  if (!menu.isOpen) menu.open();
}
function peekBar(ms = 1800) {
  bar.classList.add('show');
  clearTimeout(barTimer);
  barTimer = setTimeout(() => { if (!bar.matches(':hover, :focus-within')) bar.classList.remove('show'); }, ms);
}
$('reveal').addEventListener('pointerenter', () => peekBar());
bar.addEventListener('pointerleave', () => peekBar(600));
// A click into YouTube's player gives it the keyboard; it is handed back right away, so Escape, Space and the arrows
// stay ours (on the PC, Escape and F11 are caught before the page anyway).
addEventListener('blur', () => setTimeout(() => {
  const a = document.activeElement;
  if (playing && document.hasFocus() && a?.tagName === 'IFRAME') a.blur();
}, 0));
function setMini(on) {
  if (mini === on) return;
  mini = on; api.mini(on); api.watching(on || only);
  document.body.classList.toggle('wl-mini', on);
  document.body.classList.toggle('wl-only', on || only);
  renderBar();
}

function renderBar() {
  if (!playing) { fill(bar); return; }
  const isMusic = playing.from === 'music';
  const from = isMusic ? 'Music' : dayLabel(dayById(playing.from) || { date: L.dayKey() });
  fill(bar,
    h('h2', { class: 'ag-title' }, 'Player'),
    h('div', { class: 'now', title: title(playing.id) }, title(playing.id), h('small', {}, from)),
    isMusic || nextId(-1) ? btn('Previous', () => skip(-1), isMusic ? null : 'wide') : null,
    btn(paused ? 'Play' : 'Pause', toggle),
    nextId(1) ? btn('Next', () => skip(1)) : null,
    isMusic ? btn(shuffle ? 'Shuffle on' : 'Shuffle off', () => { shuffle = !shuffle; playing.queue = L.musicOrder(state.music, shuffle, playing.id); render(); }, 'wide notmini', { 'aria-pressed': String(shuffle) }) : null,
    mini ? null : only ? btn('Menu (Esc)', leaveWatching) : btn('Full window', () => watch(true)),
    api.desktop ? btn(mini ? 'Bigger' : 'Mini', () => setMini(!mini)) : null);
}

// The time windows move on by themselves: "opens in ..." lines, a day that closes. Not while a field is being typed in.
setInterval(() => {
  tidy();
  const typing = document.activeElement?.matches?.('input, select');
  if (!typing) { renderToday(); renderPick(); }
  renderBar();
}, 30000);

// Escape closes the bigger look first, then leaves watching (pause, the menu again); otherwise it is the menu's.
addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' || !(mini || only || !previewEl.hidden)) return;
  e.stopImmediatePropagation();
  if (!previewEl.hidden) hidePreview(); else leaveWatching();
}, true);
// While a video is on: Space pauses, the arrows jump 5 seconds, F full screen (F11 too).
document.addEventListener('keydown', (e) => {
  if (!playing || (e.target.closest && e.target.closest('input, textarea, select, button'))) return;
  if (e.key === ' ') { e.preventDefault(); toggle(); }
  else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && yt?.getCurrentTime) { e.preventDefault(); yt.seekTo(Math.max(0, yt.getCurrentTime() + (e.key === 'ArrowLeft' ? -5 : 5)), true); }
  else if (e.key === 'f' || e.key === 'F') { e.preventDefault(); if (!only) watch(true); api.fullscreen(); }
  else if (e.key === 'F11' && !api.desktop) { e.preventDefault(); api.fullscreen(); }
});
api.onKey((action) => {
  if (action === 'toggle') toggle(); else if (action === 'next') skip(1); else if (action === 'previous') skip(-1);
  else if (action === 'escape') leaveWatching();
});

// ---- start: the lists, the menu open ----
state = L.cleanState(await api.load());   // also an older file without the newer parts
await refreshGoogle();
tidy();
render();
menu.open();
setTimeout(() => menu.expand(item('w-today')), 420);   // the app opens on Today
const today = openDay();
if (today && today.items.length > today.watched.length) say(`${dayLabel(today)} is open: ${today.items.length - today.watched.length} to watch.`);
fetchInfo(Object.keys(state.videos).filter((id) => !state.videos[id].title));
await pull();   // the lists from the other devices first
// The channels: now if the last look is older than 3 hours, then every 3 hours (while the app is open).
if (google.signedIn && !(Date.now() - Date.parse(state.lastCheck) < CHECK_EVERY)) checkChannels();
setInterval(() => checkChannels(), CHECK_EVERY);
