import { useEffect, useRef, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { ArrowDownToLine, ArrowLeft, ArrowRight, BookOpen, Check, CheckCircle2, ChevronRight, Database, FileArchive, GraduationCap, HelpCircle, Image, LayoutGrid, LockKeyhole, MapPin, Search, ShieldCheck, Sparkles, Target, Trash2, TrendingUp, Upload, Users, WifiOff, X, BriefcaseBusiness } from 'lucide-react';
import type { Deck, Mode, Person, Progress } from './model';
import { emptyProgress, modes } from './model';
import { deleteLocal, loadLocal, replaceDeck, saveProgress } from './db';
import { advance, answerQuestion, makeSession } from './quiz';

type Page = 'practice' | 'directory' | 'progress' | 'data' | 'help';
const nav = [
  { id: 'practice', label: 'Practice', Icon: LayoutGrid }, { id: 'directory', label: 'People directory', Icon: Users },
  { id: 'progress', label: 'My progress', Icon: TrendingUp }, { id: 'data', label: 'Study data', Icon: Database },
] as const;
function Portrait({ person, label, className = '' }: { person: Person; label?: string; className?: string }) {
  const [url, setUrl] = useState('');
  useEffect(() => { const value = URL.createObjectURL(person.photo); setUrl(value); return () => URL.revokeObjectURL(value); }, [person.photo]);
  return url ? <img className={className} src={url} alt={label ?? `Portrait of ${person.name}`} /> : null;
}
const iconFor = (mode: Mode) => mode === 'photo-name' ? Image : mode === 'name-photo' ? Users : mode === 'position' ? BriefcaseBusiness : BookOpen;
const message = (error: unknown) => error instanceof Error ? error.message : 'Something went wrong. Please try again.';

export default function App() {
  const [page, setPage] = useState<Page>('practice');
  const [deck, setDeck] = useState<Deck>();
  const [progress, setProgress] = useState<Progress>(emptyProgress);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All categories');
  const [person, setPerson] = useState<Person>();
  const [staged, setStaged] = useState<Deck>();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [offlineReady, setOfflineReady] = useState(false);
  const [studying, setStudying] = useState(false);
  const [persistent, setPersistent] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const workerRegistration = useRef<ServiceWorkerRegistration | undefined>(undefined);
  const reloadStarted = useRef(false);
  function reloadApp() { if (!reloadStarted.current) { reloadStarted.current = true; window.location.reload(); } }
  const { needRefresh: [needRefresh] } = useRegisterSW({ onNeedReload: reloadApp, onRegisteredSW: (_url, registration) => { workerRegistration.current = registration; }, onRegisterError: e => setError(`Offline setup failed: ${message(e)}`), onOfflineReady: () => setOfflineReady(true) });

  useEffect(() => {
    loadLocal().then(value => { setDeck(value.deck); setProgress(value.progress); }).catch(e => setError(`Local storage could not be opened: ${message(e)}. Enable browser storage and reopen the app.`)).finally(() => setLoading(false));
    if ('serviceWorker' in navigator) navigator.serviceWorker.ready.then(() => setOfflineReady(true));
    navigator.storage?.persisted?.().then(setPersistent).catch(() => {});
    const checkForUpdate = () => { if (navigator.onLine) void workerRegistration.current?.update().catch(() => {}); };
    const change = () => { setOnline(navigator.onLine); checkForUpdate(); };
    window.addEventListener('focus', checkForUpdate);
    window.addEventListener('online', change); window.addEventListener('offline', change);
    return () => { window.removeEventListener('focus', checkForUpdate); window.removeEventListener('online', change); window.removeEventListener('offline', change); };
  }, []);

  async function perform(action: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(''); setNotice('');
    try { await action(); } catch (e) { setError(message(e)); }
    finally { lock.current = false; setBusy(false); }
  }
  async function commit(next: Progress) { await saveProgress(next); setProgress(next); }
  async function applyUpdate() {
    const registration = workerRegistration.current || await navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL);
    const waiting = registration?.waiting;
    // Another open app window may already have activated the waiting version.
    if (!waiting) { reloadApp(); return; }
    await new Promise<void>((resolve, reject) => {
      const cleanup = () => { clearTimeout(timeout); navigator.serviceWorker.removeEventListener('controllerchange', changed); };
      const changed = () => { cleanup(); reloadApp(); resolve(); };
      const timeout = window.setTimeout(() => { cleanup(); reject(new Error('The update could not activate. Close and reopen the app while online, then try again.')); }, 15_000);
      navigator.serviceWorker.addEventListener('controllerchange', changed);
      // Address the actual waiting worker, including updates Workbox classifies
      // as external because they appeared soon after the first installation.
      waiting.postMessage({ type: 'SKIP_WAITING' });
    });
  }
  function start(mode: Mode) { if (deck) void perform(async () => { await commit({ ...progress, session: makeSession(deck, mode) }); setStudying(true); }); }
  function go(next: Page) { setPage(next); setStudying(false); setPerson(undefined); setError(''); setNotice(''); }
  const attempts = progress.attempts.length;
  const correct = progress.attempts.filter(a => a.correct).length;
  const accuracy = attempts ? Math.round(correct / attempts * 100) : 0;
  const session = progress.session;
  const active = session && !session.finished;
  const filtered = deck?.people.filter(p => (category === 'All categories' || p.category === category) && [p.name, p.position, p.organization, p.city, p.county].join(' ').toLowerCase().includes(query.toLowerCase())) || [];

  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="#" onClick={e => { e.preventDefault(); go('practice'); }}><span className="brand-mark"><BookOpen size={23} /></span><span>District<span className="brand-sub">STUDY DECK</span></span></a>
      <div className="workspace-label">YOUR WORKSPACE</div>
      <nav aria-label="Main navigation">{nav.map(({ id, label, Icon }) => <button key={id} aria-label={label} className={`nav-item ${page === id ? 'active' : ''}`} onClick={() => go(id)}><Icon size={19} />{label}{id === 'directory' && deck && <span className="nav-count">{deck.people.length}</span>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="local-note"><ShieldCheck size={20}/><strong>Just you. Just this device.</strong><p>Your study data stays local,<br/>even when you’re online.</p></div><button className={`nav-item ${page === 'help' ? 'active' : ''}`} onClick={() => go('help')}><HelpCircle size={19}/>Help & installation</button><div className="version">DISTRICT STUDY DECK <span>v0.1</span></div></div>
    </aside>
    <div className="main-shell">
      <header className="topbar"><button className="mobile-help" aria-label="Help and installation" onClick={() => go('help')}><HelpCircle size={17}/></button><span className="breadcrumb">My workspace <ChevronRight size={14}/><strong>{page === 'practice' ? 'Practice' : page === 'directory' ? 'People directory' : page === 'progress' ? 'My progress' : page === 'data' ? 'Study data' : 'Help & installation'}</strong></span><span className={`status ${offlineReady ? 'ready' : ''}`}><span className="status-dot"/>{offlineReady ? online ? 'Ready for offline' : 'Offline · ready' : import.meta.env.DEV ? 'Development mode' : 'Preparing offline…'}</span></header>
      <main id="main">
        {error && <div className="alert error" role="alert">{error}<button aria-label="Dismiss error" onClick={() => setError('')}><X size={18}/></button></div>}
        {notice && <div className="alert" role="status">{notice}</div>}
        {needRefresh && <div className="alert">An app update is ready. Your study data will be kept.<button className="text-button" disabled={busy} onClick={() => void perform(async () => { await applyUpdate(); })}>Update app</button></div>}
        {loading ? <div className="empty-panel">Opening your study deck…</div> : <>
        {page === 'practice' && (!studying || !session) && <>
          <div className="page-heading"><div><div className="eyebrow">A LITTLE PRACTICE. A LASTING IMPRESSION.</div><h1>Know your district.</h1><p>Learn the people, roles, and places that connect your community.</p></div><span className="pill"><Sparkles size={14}/>Fictional test edition</span></div>
          <section className="hero"><div><span className="hero-eyebrow">YOUR NEXT STUDY SESSION</span><h2>Familiar faces.<br/>Stronger connections.</h2><p>A few minutes today makes the next<br className="desktop-br"/> introduction feel a little more familiar.</p><button className="button light" onClick={() => deck ? active ? setStudying(true) : start('photo-name') : go('data')}>{deck ? active ? 'Resume practice' : 'Start practicing' : 'Import your study pack'}<ArrowRight size={17}/></button><span className="hero-footnote"><LockKeyhole size={13}/>Private by design. Available offline.</span></div><div className="deck-illustration" aria-hidden="true"><div className="illus-card back"/><div className="illus-card mid"/><div className="illus-card front"><div className="illus-avatar"><Users size={55} strokeWidth={1}/></div><div className="illus-line"/><div className="illus-line short"/><span className="illus-badge"><Check size={16}/>One connection at a time</span></div><span className="float-star">✧</span></div></section>
          <div className="stats-row"><div><span className="stat-icon"><Users size={21}/></span><span><strong>{deck?.people.length || 0}</strong><small>People in your deck</small></span></div><div><span className="stat-icon"><BookOpen size={21}/></span><span><strong>{deck?.questions.length || 0}</strong><small>Workbook questions</small></span></div><div><span className="stat-icon"><Target size={21}/></span><span><strong>{attempts ? `${accuracy}%` : '—'}</strong><small>Overall accuracy</small></span></div></div>
          <div className="section-heading"><div><h2>Choose how you practice</h2><p>Four ways to build your district knowledge.</p></div><span className="muted">4 study modes</span></div>
          <div className="mode-grid">{modes.map((mode, index) => { const Icon = iconFor(mode.id); return <button className="mode-card" disabled={!deck || busy || (mode.id === 'custom' && !deck.questions.length)} key={mode.id} onClick={() => start(mode.id)}><span className={`mode-icon color-${index}`}><Icon size={24}/></span><span className="mode-number">0{index + 1}</span><h3>{mode.title}</h3><p>{mode.subtitle}</p><span className="mode-footer">{mode.id === 'custom' ? `${deck?.questions.length || 0} questions` : `${deck?.people.length || 0} people`}<ArrowRight size={18}/></span></button>; })}</div>
          {!deck && <div className="import-hint"><FileArchive size={22}/><div><strong>Your deck starts with your data.</strong><p>Import the provided ZIP to load four fictional people and their portraits.</p></div><button className="text-button" onClick={() => go('data')}>Import study pack <ArrowRight size={16}/></button></div>}
          <div className="bottom-note"><ShieldCheck size={15}/>Your photographs, study data, and progress are saved only on this device.</div>
        </>}
        {page === 'practice' && studying && session && deck && <>
          <button className="back-link" onClick={() => setStudying(false)}><ArrowLeft size={17}/>Back to practice</button>
          {session.finished ? <section className="result-panel"><span className="result-icon"><GraduationCap size={44}/></span><div className="eyebrow">SESSION COMPLETE</div><h1>A little more familiar.</h1><p>You answered {session.questions.filter((q, i) => session.answers[i] === q.correct).length} of {session.questions.length} correctly.</p><button className="button" onClick={() => start(session.mode)}>Practice again<ArrowRight size={17}/></button><button className="text-button" onClick={() => go('progress')}>See my progress</button></section> : (() => {
            const q = session.questions[session.index]; const selected = session.answers[session.index]; const answered = selected !== undefined;
            return <section className="quiz-panel"><div className="quiz-top"><span className="eyebrow">{modes.find(m => m.id === session.mode)?.title}</span><span>Question {session.index + 1} of {session.questions.length}</span></div><div className="quiz-track"><div style={{ width: `${session.index / session.questions.length * 100}%` }}/></div><h1>{q.prompt}</h1>{q.photoId && <Portrait person={deck.people.find(p => p.id === q.photoId)!} label="Portrait to identify" className="quiz-portrait"/>}<div className={`choices ${q.imageChoices ? 'image-choices' : ''}`} aria-label="Answer choices">{q.choices.map((choice, index) => <button key={choice.id} className={`choice ${answered && choice.id === q.correct ? 'correct' : ''} ${answered && selected === choice.id && selected !== q.correct ? 'incorrect' : ''}`} disabled={answered || busy} aria-label={q.imageChoices ? `Portrait option ${index + 1}` : undefined} onClick={() => void perform(async () => { await commit(answerQuestion(progress, choice.id)); })}>{q.imageChoices && choice.personId ? <Portrait person={deck.people.find(p => p.id === choice.personId)!} label={`Portrait option ${index + 1}`} /> : <span className="choice-letter">{String.fromCharCode(65 + index)}</span>}<span>{q.imageChoices ? answered ? choice.label : `Option ${index + 1}` : choice.label}</span>{answered && choice.id === q.correct && <CheckCircle2 size={19}/>}</button>)}</div>{answered && <div className="feedback" role="status"><strong>{selected === q.correct ? 'That’s right.' : `Correct answer: ${q.choices.find(c => c.id === q.correct)?.label}`}</strong><p>{q.explanation}</p><button className="button" disabled={busy} onClick={() => void perform(async () => { await commit(advance(progress)); })}>{session.index === session.questions.length - 1 ? 'Finish session' : 'Next question'}<ArrowRight size={17}/></button></div>}<p className="save-note"><ShieldCheck size={14}/>Answers save automatically on this device.</p></section>;
          })()}
        </>}
        {page === 'directory' && <>
          <div className="page-heading"><div><div className="eyebrow">THE PEOPLE BEHIND THE ROLES</div><h1>People directory</h1><p>Get to know the faces in your study deck.</p></div><span className="pill">{deck?.people.length || 0} fictional people</span></div>
          {!deck ? <Empty onImport={() => go('data')}/> : <><div className="directory-tools"><label className="search-box"><Search size={19}/><input aria-label="Search people" placeholder="Search names, roles, organizations, or places…" value={query} onChange={e => setQuery(e.target.value)}/></label><select aria-label="Filter by category" value={category} onChange={e => setCategory(e.target.value)}><option>All categories</option>{[...new Set(deck.people.map(p => p.category))].map(c => <option key={c}>{c}</option>)}</select></div><div className="directory-count">{filtered.length} {filtered.length === 1 ? 'person' : 'people'} found</div><div className="people-grid">{filtered.map(p => <button className="person-card" key={p.id} onClick={() => setPerson(p)}><Portrait person={p}/><div className="person-body"><span className="person-category">{p.category}</span><h2>{p.name}</h2><strong>{p.position}</strong><p>{p.organization}</p><span className="location"><MapPin size={14}/>{p.city} · {p.county}</span><span className="person-details">View profile<ArrowRight size={16}/></span></div></button>)}</div>{!filtered.length && <div className="empty-panel"><Search size={30}/><h2>No matching people</h2><p>Try another name, role, or place.</p><button className="text-button" onClick={() => { setQuery(''); setCategory('All categories'); }}>Clear filters</button></div>}</>}
        </>}
        {page === 'progress' && <><div className="page-heading"><div><div className="eyebrow">ONE CONNECTION AT A TIME</div><h1>My progress</h1><p>Every answer is another step toward knowing your district.</p></div></div><div className="stats-row"><div><span className="stat-icon"><CheckCircle2/></span><span><strong>{attempts}</strong><small>Questions answered</small></span></div><div><span className="stat-icon"><Target/></span><span><strong>{attempts ? `${accuracy}%` : '—'}</strong><small>Overall accuracy</small></span></div><div><span className="stat-icon"><GraduationCap/></span><span><strong>{new Set(progress.attempts.map(a => a.sessionId)).size}</strong><small>Sessions started</small></span></div></div><section className="panel"><h2>Practice by mode</h2>{modes.map(mode => { const history = progress.attempts.filter(a => a.mode === mode.id); return <div className="progress-row" key={mode.id}><span>{mode.title}<small>{history.length} answers recorded</small></span><strong>{history.length ? `${Math.round(history.filter(a => a.correct).length / history.length * 100)}%` : 'No practice yet'}</strong></div>; })}{active && <button className="button" onClick={() => { go('practice'); setStudying(true); }}>Resume saved session<ArrowRight size={17}/></button>}</section></>}
        {page === 'data' && <><div className="page-heading"><div><div className="eyebrow">YOUR FILES. YOUR DEVICE.</div><h1>Study data</h1><p>Bring your workbook and photographs together in one private deck.</p></div></div><section className="upload-panel"><span className="upload-icon"><Upload size={29}/></span><h2>{busy ? 'Preparing your study pack…' : 'Import your study pack'}</h2><p>Choose a ZIP containing the Excel workbook and a <code>photos/</code> folder.<br/>Version 0.1 uses four fictional people. Maximum ZIP size: 20 MB.</p><input ref={fileInput} className="file-input" type="file" accept=".zip,application/zip,application/x-zip-compressed" aria-label="Choose study pack ZIP" disabled={busy} onChange={event => { const file = event.target.files?.[0]; if (!file) return; setStaged(undefined); void perform(async () => { if (file.size > 20 * 1024 * 1024) throw new Error('Choose a ZIP smaller than 20 MB.'); const { importArchive } = await import('./importer'); setStaged(await importArchive(new Uint8Array(await file.arrayBuffer()), file.name)); }); event.target.value = ''; }}/><button className="button" disabled={busy} onClick={() => fileInput.current?.click()}><FileArchive size={17}/>Choose ZIP file</button><span className="save-note"><LockKeyhole size={14}/>Files are processed here and never uploaded.</span></section>
          {staged && <section className="panel import-review" aria-label="Import preview"><div className="eyebrow">READY TO IMPORT</div><h2>{staged.filename}</h2><p>{staged.people.length} fictional people · {staged.people.length} portraits · {staged.questions.length} custom questions</p><div className="mini-portraits">{staged.people.map(p => <div key={p.id}><Portrait person={p}/><span>{p.name}</span></div>)}</div><p>{deck ? 'Importing replaces the current deck and resets its quiz history and saved session.' : 'Save this deck to begin. It will be available offline on this device.'}</p><div className="actions"><button className="button" disabled={busy} onClick={() => void perform(async () => { await replaceDeck(staged); setDeck(staged); setProgress(emptyProgress()); setStaged(undefined); setQuery(''); setCategory('All categories'); setNotice('Study pack imported. Your deck is saved on this device.'); })}><Check size={17}/>{deck ? 'Replace deck & reset progress' : 'Import and save deck'}</button><button className="secondary" disabled={busy} onClick={() => setStaged(undefined)}>Cancel</button></div></section>}
          {deck && <section className="panel"><div className="section-heading"><h2>Saved on this device</h2><span className="pill"><CheckCircle2 size={14}/>Imported</span></div><div className="data-facts"><div><small>Study pack</small><strong>{deck.filename}</strong></div><div><small>Imported</small><strong>{new Date(deck.importedAt).toLocaleString()}</strong></div><div><small>Contents</small><strong>{deck.people.length} people, {deck.questions.length} questions</strong></div></div><p className="muted">The original workbook, supporting records, ZIP, photographs, and quiz progress are stored in IndexedDB.</p><div className="actions"><button className="secondary" onClick={() => { const url = URL.createObjectURL(deck.archive); const a = document.createElement('a'); a.href = url; a.download = deck.filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }}><ArrowDownToLine size={16}/>Save original study ZIP</button><button className="danger-link" onClick={() => setConfirmDelete(true)}><Trash2 size={16}/>Remove local data</button></div>{confirmDelete && <div className="delete-confirm"><p>Delete this deck, all photographs, and all quiz progress from this device?</p><div className="actions"><button className="danger" disabled={busy} onClick={() => void perform(async () => { await deleteLocal(); setDeck(undefined); setProgress(emptyProgress()); setConfirmDelete(false); setStaged(undefined); setNotice('All local study data has been removed.'); })}>Delete local data</button><button className="secondary" onClick={() => setConfirmDelete(false)}>Keep my data</button></div></div>}</section>}
          <section className="panel storage-note"><ShieldCheck size={24}/><div><h2>Keep your deck close</h2><p>Browser storage belongs to this browser and device. Keep the original ZIP as a backup. Clearing site data, removing the app, or storage pressure can erase your deck. The original ZIP does not include quiz progress.</p><button className="text-button" disabled={busy || persistent} onClick={() => void perform(async () => { const granted = await navigator.storage?.persist?.(); setPersistent(!!granted); setNotice(granted ? 'Persistent storage was granted by this browser.' : 'This browser did not grant persistent storage. Keep your original ZIP as a backup.'); })}>{persistent ? 'Persistent storage granted' : 'Request persistent storage'}</button></div></section>
        </>}
        {page === 'help' && <><div className="page-heading"><div><div className="eyebrow">TAKE YOUR DECK WITH YOU</div><h1>Help & installation</h1><p>A study companion for your laptop and your pocket.</p></div></div><section className="panel help-panel"><h2>Install on iPhone</h2><ol><li>Open the app’s HTTPS address in Safari while online.</li><li>Tap Share, then Add to Home Screen. Enable Open as Web App if offered, then tap Add.</li><li>Open Study Deck from the Home Screen. Import the study ZIP here, even if you already imported it in Safari.</li><li>Wait for “Ready for offline”, then try reopening the app in Airplane Mode.</li></ol><h2>Install on Windows</h2><p>Open the HTTPS app address (or localhost for local testing) in Edge or Chrome. Use the address-bar install icon, or the browser menu’s Apps / Install option. Import the ZIP and wait for “Ready for offline”.</p><h2>How offline works</h2><p>The service worker saves the application files. IndexedDB saves your workbook, photos, records, and progress. Once setup is complete, searching, importing a ZIP already on your device, and every quiz work without a connection.</p><h2>About this test</h2><p>All study records are fictional. Only Active workbook rows are studied. Custom questions need one correct answer and three distinct distractors. Person answers use Person_IDs in Excel and display as names in the quiz.</p><p>Starting a new mode replaces the saved unfinished session. Recorded answers remain in your progress. Data does not transfer between devices or browser profiles.</p><p>For local development and GitHub Pages setup, see the README supplied with this app.</p></section></>}
        </>}
      </main><footer><span>District Study Deck</span><span>Built for a more familiar district.</span></footer>
    </div>
    {person && <Profile person={person} onClose={() => setPerson(undefined)}/>}
  </div>;
}
function Empty({ onImport }: { onImport: () => void }) { return <section className="empty-panel"><Users size={35}/><h2>Your people will appear here</h2><p>Import the fictional study pack to get started.</p><button className="button" onClick={onImport}>Import study pack<ArrowRight size={17}/></button></section>; }
function Profile({ person, onClose }: { person: Person; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const current = dialog.current; current?.showModal(); return () => current?.close(); }, []);
  return <dialog ref={dialog} className="profile-modal" aria-label={`${person.name} profile`} onCancel={onClose} onClick={event => {
    if (event.target !== dialog.current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
  }}><button autoFocus className="close-modal" aria-label="Close profile" onClick={onClose}><X/></button><Portrait person={person}/><div className="person-body"><span className="eyebrow">FICTIONAL TEST PERSON</span><h1>{person.name}</h1><h2>{person.position}</h2><p>{person.organization}</p><p className="location"><MapPin size={16}/>{person.city} · {person.county}</p><p>{person.notes}</p></div></dialog>;
}
