import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Link, Route, Switch, useLocation, useParams, Router as WouterRouter } from 'wouter';
import { getFindResearchSourcesMutationKey, getGetResearchServiceStatusQueryKey, useFindResearchSources, useGetResearchServiceStatus } from '@workspace/api-client-react';
import type { ResearchSearchResponse, ResearchSource } from '@workspace/api-client-react';
import { ArrowDownToLine, ArrowLeft, ArrowRight, BookOpen, Check, ChevronDown, CircleHelp, Clock3, ExternalLink, FileText, FlaskConical, History, Info, LibraryBig, LoaderCircle, Menu, Plus, Search, ShieldCheck, Trash2 } from 'lucide-react';

type Settings = { depth: 'Quick' | 'Standard' | 'Deep'; count: 5 | 10 | 15; audience: 'School Student' | 'University Student' | 'General Reader'; style: 'Simple' | 'Academic' | 'Detailed' };
type SavedResearch = { id: string; question: string; settings: Settings; createdAt: string; response: ResearchSearchResponse };
const KEY = 'research-rescue-history-v1';
const DEFAULT_SETTINGS: Settings = { depth: 'Standard', count: 10, audience: 'University Student', style: 'Academic' };
const queryClient = new QueryClient();

function readHistory(): SavedResearch[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') as SavedResearch[]; } catch { return []; }
}
function writeHistory(items: SavedResearch[]) { localStorage.setItem(KEY, JSON.stringify(items)); }
function dateLabel(value: string) { return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value)); }
function shortTitle(question: string) { return question.length > 72 ? `${question.slice(0, 69)}…` : question; }

function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: status, isLoading, isError, refetch } = useGetResearchServiceStatus({ query: { queryKey: getGetResearchServiceStatusQueryKey() } });
  const navItems = [
    { href: '/', label: 'New research', icon: Plus },
    { href: '/history', label: 'Your library', icon: History },
    { href: '/about', label: 'How it works', icon: CircleHelp },
  ];
  return <div className="app-shell grain">
    <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
      <Link href="/" className="brand focus-ring" onClick={() => setMobileOpen(false)}><span className="brand-mark"><FlaskConical size={19} strokeWidth={1.8}/></span><span><b>Research<br/>Rescue</b><small>STUDENT RESEARCH DESK</small></span></Link>
      <div className="side-caption">WORKSPACE</div>
      <nav aria-label="Main navigation">{navItems.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={`nav-link focus-ring ${location === href ? 'nav-active' : ''}`} onClick={() => setMobileOpen(false)}><Icon size={17}/><span>{label}</span>{href === '/' && location === '/' && <span className="nav-current"/>}</Link>)}</nav>
      <div className="side-bottom">
        <div className="service-card">
          <div className="service-head"><span className={`signal ${status?.searchAvailable ? 'signal-on' : 'signal-off'}`}/><span>SEARCH SERVICE</span></div>
          {isLoading ? <div className="service-skeleton"/> : isError ? <><p>Couldn’t check service status.</p><button className="text-button" onClick={() => void refetch()}>Try again</button></> : <><p>{status?.searchAvailable ? `${status.searchProvider} is ready for scholarly search.` : 'Scholarly search is currently unavailable.'}</p><div className="service-ai"><span className={`signal ${status?.aiAvailable ? 'signal-on' : 'signal-off'}`}/><span>AI synthesis {status?.aiAvailable ? 'available' : 'not available'}</span></div></>}
        </div>
        <div className="side-foot">A clearer path from question<br/>to credible sources.</div>
      </div>
    </aside>
    {mobileOpen && <button aria-label="Close navigation" className="mobile-scrim" onClick={() => setMobileOpen(false)}/>}
    <div className="main-column">
      <header className="topbar"><button className="mobile-menu icon-button" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><Menu size={20}/></button><div className="crumb"><span>RESEARCH DESK</span><span className="crumb-dot">/</span><span>{location === '/' ? 'NEW QUESTION' : location.split('/')[1]?.toUpperCase()}</span></div><Link href="/about" className="top-help focus-ring"><Info size={16}/><span>About the process</span></Link></header>
      <main>{children}</main>
    </div>
  </div>;
}

function StatusPill({ available, label }: { available?: boolean; label: string }) {
  return <span className={`status-pill ${available ? 'available' : 'unavailable'}`}><span className="tiny-dot"/>{label}</span>;
}

function Home() {
  const [, navigate] = useLocation();
  const [question, setQuestion] = useState('');
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [advanced, setAdvanced] = useState(false);
  const [error, setError] = useState('');
  const status = useGetResearchServiceStatus({ query: { queryKey: getGetResearchServiceStatusQueryKey() } });
  const search = useFindResearchSources({ mutation: { mutationKey: getFindResearchSourcesMutationKey() } });
  const ready = question.trim().length >= 3;
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!ready || search.isPending) return;
    setError('');
    search.mutate({ data: { question: question.trim(), limit: settings.count } }, {
      onSuccess: (response) => {
        const item: SavedResearch = { id: `${Date.now()}`, question: question.trim(), settings, createdAt: new Date().toISOString(), response };
        writeHistory([item, ...readHistory()].slice(0, 60));
        navigate(`/research/${item.id}`);
      },
      onError: () => setError('The scholarly search could not be completed. Check your connection and try again.'),
    });
  }
  return <AppShell><div className="home-page page-enter">
    <div className="eyebrow"><span className="eyebrow-line"/><span>YOUR RESEARCH, WITH RECEIPTS</span></div>
    <section className="hero-grid">
      <div className="hero-copy"><h1 className="serif">A good question<br/>deserves <em>good sources.</em></h1><p className="hero-dek">Start with what you’re curious about. We’ll find scholarly records you can inspect, compare, and cite—without pretending an AI wrote the answer.</p>
        <div className="capability-line"><span className="capability-symbol"><Search size={16}/></span><div><b>Scholarly search is live</b><small>{status.data?.searchAvailable ? `Connected to ${status.data.searchProvider}` : status.isLoading ? 'Checking available providers…' : 'Sources are retrieved from scholarly indexes'}</small></div></div>
      </div>
      <div className="hero-stamp"><div className="stamp-ring"><LibraryBig size={30} strokeWidth={1.2}/><span>01</span></div><p>Ask clearly.<br/>Read critically.</p></div>
    </section>
    <section className="question-panel" aria-labelledby="question-label">
      <div className="panel-topline"><span className="mono">01 / YOUR STARTING POINT</span><span className="panel-note">A question, not a prompt</span></div>
      <form onSubmit={submit}>
        <label id="question-label" htmlFor="research-question">What are you trying to understand?</label>
        <textarea id="research-question" data-testid="input-research-question" className="question-input focus-ring" maxLength={500} minLength={3} value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="For example: How does urban green space affect adolescent mental health?" />
        <div className="question-meta"><span>{question.length}/500 characters</span><button type="button" className="text-button example-button" onClick={() => setQuestion('How does urban green space affect adolescent mental health?')}>Try an example <ArrowRight size={14}/></button></div>
        <button type="button" className="settings-toggle" aria-expanded={advanced} onClick={() => setAdvanced(!advanced)}><span><ChevronDown size={15} className={advanced ? 'chevron-open' : ''}/> Research settings</span><span className="settings-summary">{settings.depth} · {settings.count} sources · {settings.style}</span></button>
        {advanced && <div className="settings-grid">
          <label>Research depth<select value={settings.depth} onChange={(e) => setSettings({ ...settings, depth: e.target.value as Settings['depth'] })}><option>Quick</option><option>Standard</option><option>Deep</option></select></label>
          <label>Source limit<select value={settings.count} onChange={(e) => setSettings({ ...settings, count: Number(e.target.value) as Settings['count'] })}><option value={5}>5 sources</option><option value={10}>10 sources</option><option value={15}>15 sources</option></select></label>
          <label>Written for<select value={settings.audience} onChange={(e) => setSettings({ ...settings, audience: e.target.value as Settings['audience'] })}><option>School Student</option><option>University Student</option><option>General Reader</option></select></label>
          <label>Report style<select value={settings.style} onChange={(e) => setSettings({ ...settings, style: e.target.value as Settings['style'] })}><option>Simple</option><option>Academic</option><option>Detailed</option></select></label>
          <p className="settings-disclaimer"><Info size={14}/> These preferences shape a transparent, non-AI report outline. AI planning and synthesis are not currently available.</p>
        </div>}
        {error && <div className="error-message" role="alert">{error}</div>}
        <div className="submit-row"><p><ShieldCheck size={16}/> Source records are real. Missing metadata stays missing.</p><button className="primary-button focus-ring" data-testid="button-find-sources" type="submit" disabled={!ready || search.isPending}>{search.isPending ? <><LoaderCircle className="spin" size={16}/> Searching indexes</> : <>Find scholarly sources <ArrowRight size={16}/></>}</button></div>
      </form>
    </section>
    <div className="truth-note"><div className="truth-icon"><Info size={17}/></div><div><b>One important distinction</b><p>Scholarly search works. AI research planning and analysis are unavailable while Gemini provisioning is paused. We won’t invent summaries or findings.</p></div><Link href="/about" className="truth-link">See how it works <ArrowRight size={14}/></Link></div>
    <section className="process-strip"><div><span className="step-no">A</span><span>Search genuine scholarly records</span></div><div><span className="step-no">B</span><span>Inspect metadata and abstracts</span></div><div><span className="step-no">C</span><span>Build your own evidence-led report</span></div></section>
  </div></AppShell>;
}

function SourceCard({ source, index }: { source: ResearchSource; index: number }) {
  return <article className="source-card" data-testid={`card-source-${source.id}`}>
    <div className="source-index">{String(index + 1).padStart(2, '0')}</div>
    <div className="source-main"><div className="source-kicker"><span className={`credibility ${source.credibility}`}>{source.credibility} credibility</span><span>{source.sourceType}</span>{source.publishedDate && <span>{source.publishedDate}</span>}</div>
      <h3><a href={source.url} target="_blank" rel="noreferrer">{source.title}<ExternalLink size={14}/></a></h3>
      <p className="source-org">{source.organization}{source.author ? ` · ${source.author}` : ' · Author not listed'}</p>
      {source.abstract ? <p className="abstract">{source.abstract}</p> : <p className="missing-meta"><Info size={14}/> Abstract not provided in the indexed record.</p>}
      <div className="source-footer">{source.doi ? <span className="mono">DOI {source.doi}</span> : <span className="mono">DOI not listed</span>}<a href={source.url} target="_blank" rel="noreferrer">Open source <ExternalLink size={13}/></a></div>
    </div>
  </article>;
}

function ResearchPage() {
  const params = useParams<{ id: string }>();
  const [item, setItem] = useState<SavedResearch | null>(null);
  const [section, setSection] = useState('sources');
  const [, navigate] = useLocation();
  useEffect(() => { setItem(readHistory().find((entry) => entry.id === params.id) || null); }, [params.id]);
  const nav = [{ id: 'overview', label: 'Overview' }, { id: 'sources', label: 'Sources' }, { id: 'comparison', label: 'Evidence notes' }, { id: 'report', label: 'Report outline' }, { id: 'references', label: 'References' }];
  const exportText = () => {
    if (!item) return;
    const text = `${item.question}\n\nRESEARCH SETTINGS\nDepth: ${item.settings.depth}\nSource limit: ${item.settings.count}\nAudience: ${item.settings.audience}\nReport style: ${item.settings.style}\n\nAI synthesis: unavailable. This document contains a non-AI-generated outline only.\n\nSOURCES\n${item.response.sources.map((s, i) => `${i + 1}. ${s.title}\n${s.organization}${s.author ? ` — ${s.author}` : ''}${s.publishedDate ? ` (${s.publishedDate})` : ''}\n${s.url}\nAbstract: ${s.abstract || 'Not provided in indexed record.'}`).join('\n\n')}`;
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    const a = document.createElement('a'); a.href = url; a.download = 'research-notes.txt'; a.click(); URL.revokeObjectURL(url);
  };
  if (!item) return <AppShell><div className="page-wrap page-enter"><Link href="/history" className="back-link"><ArrowLeft size={15}/> Back to library</Link><div className="empty-state"><BookOpen size={26}/><h1 className="serif">Research not found</h1><p>This workspace may have been removed from this browser’s saved history.</p><Link href="/" className="primary-button">Start new research <ArrowRight size={15}/></Link></div></div></AppShell>;
  const sources = item.response.sources || [];
  return <AppShell><div className="research-page page-enter">
    <Link href="/" className="back-link"><ArrowLeft size={15}/> New research</Link>
    <div className="research-heading"><div><div className="eyebrow"><span className="eyebrow-line"/><span>RESEARCH WORKSPACE · {dateLabel(item.createdAt)}</span></div><h1 className="serif">{item.question}</h1><div className="research-tags"><span>{item.settings.depth} depth</span><span>{item.settings.audience}</span><span>{item.settings.style} report</span><span>{item.settings.count} source limit</span></div></div><button onClick={exportText} className="secondary-button export-button"><ArrowDownToLine size={16}/> Export notes</button></div>
    <div className="ai-boundary"><span className="boundary-icon"><Info size={17}/></span><div><b>AI synthesis unavailable</b><p>Planner and Analyst are not running. This workspace contains real search records plus clearly labeled, non-AI scaffolding—not generated findings.</p></div><StatusPill available={false} label="No AI synthesis"/></div>
    <div className="workflow" aria-label="Research workflow stages">{['Question', 'Scholarly search', 'Evidence review', 'Report'].map((stage, i) => <div key={stage} className={`workflow-step ${i < 2 ? 'step-done' : ''}`}><span className="workflow-marker">{i < 2 ? <Check size={13}/> : `0${i + 1}`}</span><span>{stage}</span></div>)}</div>
    <div className="research-body">
      <aside className="research-nav" aria-label="Research workspace sections">{nav.map((tab) => <button key={tab.id} onClick={() => setSection(tab.id)} className={section === tab.id ? 'research-nav-active' : ''}>{tab.label}{tab.id === 'sources' && <span className="count-badge">{sources.length}</span>}</button>)}</aside>
      <section className="research-content">
        {section === 'overview' && <div className="content-block"><div className="section-top"><div><span className="mono section-label">WORKSPACE SUMMARY</span><h2 className="serif">Your question, in context.</h2></div></div><div className="summary-grid"><div><span>RESEARCH QUESTION</span><p>{item.question}</p></div><div><span>SETTINGS</span><p>{item.settings.depth} · {item.settings.audience}<br/>{item.settings.style} report · {item.settings.count} sources</p></div><div><span>SEARCH RECORD</span><p>{sources.length} records returned<br/>Searched {dateLabel(item.response.searchedAt)}</p></div><div><span>AI STATUS</span><p>AI-generated analysis unavailable.<br/>No findings have been synthesized.</p></div></div></div>}
        {section === 'sources' && <div className="content-block"><div className="section-top"><div><span className="mono section-label">SEARCH RESULTS · {item.response.providers?.join(' / ') || 'SCHOLARLY INDEX'}</span><h2 className="serif">Sources to examine.</h2><p className="section-desc">Records returned for your question. Review each source before relying on it.</p></div><span className="result-count">{sources.length} records</span></div>
          {item.response.warning && <div className="warning-box"><Info size={15}/>{item.response.warning}</div>}
          {sources.length ? <div className="source-list">{sources.map((source, i) => <SourceCard key={source.id} source={source} index={i}/>)}</div> : <div className="empty-inline"><Search size={20}/><b>No records returned</b><span>Try broadening your question or searching with different terms.</span></div>}
        </div>}
        {section === 'comparison' && <div className="content-block"><div className="section-top"><div><span className="mono section-label">YOUR ANALYSIS SPACE</span><h2 className="serif">Compare the evidence.</h2><p className="section-desc">A blank framework for your own reading. Nothing here is AI-generated.</p></div></div><div className="scaffold-label"><Info size={15}/> NON-AI-GENERATED SCAFFOLDING</div><div className="comparison-table"><div className="comparison-head"><span>Look for</span><span>Questions to ask as you read</span></div>{[['Evidence', 'What method and sample support the claim?'], ['Agreement', 'Which sources point in a similar direction?'], ['Differences', 'Where do methods, populations, or conclusions diverge?'], ['Limitations', 'What does each source leave uncertain?']].map(([a,b]) => <div className="comparison-row" key={a}><b>{a}</b><p>{b}</p></div>)}</div><p className="scaffold-foot">This framework does not contain findings. Add your own notes after reviewing the source records.</p></div>}
        {section === 'report' && <div className="content-block"><div className="section-top"><div><span className="mono section-label">REPORT BUILDER</span><h2 className="serif">A structure to make your own.</h2><p className="section-desc">An editable direction for your next steps—not an AI-written report.</p></div></div><div className="settings-recap"><span>Selected format</span><b>{item.settings.style}</b><span>For</span><b>{item.settings.audience}</b><span>Depth</span><b>{item.settings.depth}</b></div><div className="scaffold-label"><Info size={15}/> NON-AI-GENERATED OUTLINE</div><ol className="outline-list"><li><b>Introduction</b><span>Define the question and explain why it matters.</span></li><li><b>What the sources say</b><span>Summarize each source in your own words and cite it.</span></li><li><b>Compare the evidence</b><span>Identify agreements, differences, methods, and limitations.</span></li><li><b>Conclusion</b><span>State what the evidence supports—and what remains unknown.</span></li></ol><div className="report-notice"><ShieldCheck size={16}/><span>No claims or conclusions have been generated. Treat this as a planning scaffold only.</span></div></div>}
        {section === 'references' && <div className="content-block"><div className="section-top"><div><span className="mono section-label">SOURCE RECORDS</span><h2 className="serif">References to verify.</h2><p className="section-desc">Metadata is shown as returned. Missing fields are explicitly marked.</p></div><button className="text-button" onClick={exportText}><ArrowDownToLine size={14}/> Export</button></div><ol className="reference-list">{sources.map((s,i) => <li key={s.id}><span className="ref-num">{i+1}.</span><div><b>{s.author || 'Author not listed'}{s.publishedDate ? ` (${s.publishedDate})` : ' (date not listed)'}.</b> {s.title}. <i>{s.organization}</i>.{s.doi && <span className="mono"> DOI: {s.doi}</span>}<a href={s.url} target="_blank" rel="noreferrer">{s.url} <ExternalLink size={12}/></a></div></li>)}</ol></div>}
      </section>
    </div>
    <footer className="workspace-footer"><span><Clock3 size={14}/> Searched {dateLabel(item.response.searchedAt)}</span><button className="text-button" onClick={exportText}><FileText size={14}/> Download source notes</button></footer>
  </div></AppShell>;
}

function HistoryPage() {
  const [items, setItems] = useState<SavedResearch[]>([]);
  const [query, setQuery] = useState('');
  useEffect(() => setItems(readHistory()), []);
  const filtered = useMemo(() => items.filter((item) => item.question.toLowerCase().includes(query.toLowerCase())), [items, query]);
  const remove = (id: string) => { const next = items.filter((item) => item.id !== id); setItems(next); writeHistory(next); };
  const clear = () => { if (window.confirm('Delete all saved research from this browser?')) { setItems([]); writeHistory([]); } };
  return <AppShell><div className="page-wrap page-enter"><div className="eyebrow"><span className="eyebrow-line"/><span>YOUR PRIVATE LIBRARY</span></div><div className="page-title-row"><div><h1 className="serif">Research history.</h1><p className="page-intro">Saved on this device. Your work stays in this browser.</p></div><Link href="/" className="primary-button"><Plus size={16}/> New question</Link></div>
    {items.length > 0 && <div className="history-tools"><div className="history-search"><Search size={16}/><input aria-label="Search saved research" placeholder="Find a question…" value={query} onChange={(e) => setQuery(e.target.value)}/></div><span>{items.length} saved {items.length === 1 ? 'workspace' : 'workspaces'}</span><button className="text-button danger-text" onClick={clear}><Trash2 size={14}/> Clear history</button></div>}
    {filtered.length ? <div className="history-list">{filtered.map((item) => <article className="history-item" key={item.id}><div className="history-date mono">{dateLabel(item.createdAt)}</div><div className="history-question"><Link href={`/research/${item.id}`}><h2>{shortTitle(item.question)}</h2></Link><p>{item.response.sources.length} scholarly records · {item.settings.depth} · {item.settings.style}</p></div><button aria-label={`Delete ${shortTitle(item.question)}`} className="icon-button delete-button" onClick={() => remove(item.id)}><Trash2 size={16}/></button><Link className="history-open" href={`/research/${item.id}`} aria-label="Open research"><ArrowRight size={17}/></Link></article>)}</div> : <div className="empty-state"><div className="empty-icon"><History size={23}/></div><h2 className="serif">{items.length ? 'No matching questions' : 'Your library is ready.'}</h2><p>{items.length ? 'Try a different search term.' : 'Once you search scholarly sources, your research workspaces will be saved here on this device.'}</p>{items.length ? <button className="secondary-button" onClick={() => setQuery('')}>Clear search</button> : <Link href="/" className="primary-button"><Plus size={16}/> Start a research question</Link>}</div>}
  </div></AppShell>;
}

function AboutPage() {
  const { data: status, isLoading, isError, refetch } = useGetResearchServiceStatus({ query: { queryKey: getGetResearchServiceStatusQueryKey() } });
  return <AppShell><div className="about-page page-enter"><div className="eyebrow"><span className="eyebrow-line"/><span>TRANSPARENCY FIRST</span></div><h1 className="serif">Research should show<br/><em>its working.</em></h1><p className="about-lede">Research Rescue helps you move from a question to real scholarly records and a workspace for your own evidence review. It does not replace reading, judgement, or citation checking.</p>
    <div className="about-status"><div><span className="mono section-label">LIVE PROVIDER STATUS</span><h2>What’s available right now</h2></div>{isLoading ? <div className="service-skeleton wide"/> : isError ? <div className="status-error" role="alert">Status could not be loaded. <button className="text-button" onClick={() => void refetch()}>Retry</button></div> : <div className="status-grid"><div><StatusPill available={status?.searchAvailable} label={status?.searchAvailable ? 'Scholarly search available' : 'Scholarly search unavailable'}/><p>Search retrieves source records from {status?.searchProvider || 'the configured scholarly index'}.</p></div><div><StatusPill available={status?.aiAvailable} label={status?.aiAvailable ? 'AI provider available' : 'AI synthesis unavailable'}/><p>{status?.aiAvailable ? `${status.aiProvider} is available.` : 'Gemini provisioning is currently unavailable. Planner and Analyst AI are not running.'}</p></div></div>}</div>
    <section className="about-process"><span className="mono section-label">THE RESEARCH PATH</span><h2 className="serif">A working search. An honest boundary.</h2><div className="process-rows"><div><span className="process-num">01</span><div><h3>Start with a focused question</h3><p>Your question is sent to the scholarly search service along with the requested number of records.</p></div><Search size={18}/></div><div><span className="process-num">02</span><div><h3>Inspect returned records</h3><p>Search results are genuine indexed records. Author, date, DOI, or abstract may be absent; we label those gaps instead of filling them in.</p></div><LibraryBig size={18}/></div><div><span className="process-num">03</span><div><h3>Compare and write for yourself</h3><p>Evidence prompts and the report outline are non-AI-generated scaffolding. They are starting points, not analysis or findings.</p></div><FileText size={18}/></div></div></section>
    <section className="limits-box"><div className="limits-icon"><ShieldCheck size={19}/></div><div><span className="mono section-label">CURRENT LIMITS</span><h2>What we won’t claim</h2><p>Gemini provisioning is paused. Planner and Analyst features are not running, so this product does not synthesize findings, generate source summaries, assess evidence, or write reports. Search provider results and metadata are displayed as returned. Always open and verify sources before citing them.</p></div></section>
    <div className="about-bottom"><span>Built for careful readers, not answer machines.</span><Link href="/" className="primary-button">Start with a question <ArrowRight size={15}/></Link></div>
  </div></AppShell>;
}

function Router() {
  return <RouteBoundary><Switch>
    <Route path="/" component={Home}/>
    <Route path="/history" component={HistoryPage}/>
    <Route path="/about" component={AboutPage}/>
    <Route path="/research/:id" component={ResearchPage}/>
    <Route component={NotFound}/>
  </Switch></RouteBoundary>;
}
function RouteBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}
function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router/></WouterRouter><Toaster/></TooltipProvider></QueryClientProvider>;
}
export default App;