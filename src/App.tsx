import { useEffect, useRef, useState, type FormEvent } from 'react'
import './App.css'

type Speaker = 'agent' | 'lead'

type TranscriptEntry = {
  speaker: Speaker
  text: string
  time: string
}

type SpeechResultEvent = {
  results: ArrayLike<ArrayLike<{ transcript: string }>>
}

type SpeechRecognitionLike = {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: SpeechResultEvent) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
  start: () => void
  stop: () => void
}

type SpeechWindow = Window & {
  SpeechRecognition?: new () => SpeechRecognitionLike
  webkitSpeechRecognition?: new () => SpeechRecognitionLike
}

const knowledge = [
  {
    title: 'Growth plan overview',
    category: 'Product guide',
    text: 'Growth plans include shared inboxes, automated follow-ups, and pipeline reporting for teams of up to 25 seats.',
  },
  {
    title: 'Pricing & onboarding',
    category: 'Pricing',
    text: 'Growth starts at $89 per seat each month. Guided onboarding is included, with a typical launch in 10 business days.',
  },
  {
    title: 'Security & integrations',
    category: 'Security brief',
    text: 'The platform supports role-based access, encrypted data at rest, and native integrations with HubSpot and Salesforce.',
  },
]

const starterTranscript: TranscriptEntry[] = [
  { speaker: 'agent', text: 'Hi Olivia, thanks for taking the time. What prompted you to explore a new sales platform?', time: '10:42:08' },
  { speaker: 'lead', text: 'We have a team of 12 and follow-ups are getting lost between tools. We need something in place before January.', time: '10:42:19' },
  { speaker: 'agent', text: 'That makes sense. A 12-person team is a good fit for our Growth plan. What does your current setup look like?', time: '10:42:31' },
  { speaker: 'lead', text: 'Mostly spreadsheets and HubSpot. We are also comparing a couple of other options.', time: '10:42:44' },
]

const languageCodes: Record<string, string> = {
  English: 'en-US',
  Español: 'es-ES',
  Français: 'fr-FR',
  Deutsch: 'de-DE',
}

function getAnswer(question: string) {
  const lower = question.toLowerCase()
  if (lower.includes('price') || lower.includes('cost') || lower.includes('budget')) return knowledge[1]
  if (lower.includes('security') || lower.includes('data') || lower.includes('integrat')) return knowledge[2]
  return knowledge[0]
}

function deriveLeadSignals(entries: TranscriptEntry[]) {
  const leadText = entries.filter((entry) => entry.speaker === 'lead').map((entry) => entry.text).join(' ').toLowerCase()
  const teamSizeMatch = leadText.match(/(?:team of |team has |team size of )(\d{1,3})\b|\b(\d{1,3})[ -]?(?:people|person|seats|seat)\b/)
  const teamSize = teamSizeMatch ? Number(teamSizeMatch[1] ?? teamSizeMatch[2]) : null
  const hasNeed = /follow.?up|automation|pipeline|missed|lost between tools|spreadsheet/.test(leadText)
  const hasTimeline = /before january|by january|next month|within \d+ (?:days|weeks)|this quarter/.test(leadText)
  const hasBudget = /our budget|budget is|budgeted|approved spend/.test(leadText)
  const hasDecisionMaker = /i(?:'m| am) the decision maker|i make the final decision|i decide|decision maker is/.test(leadText)
  const fitScore = Math.min(100, 50 + (teamSize ? 8 : 0) + (hasNeed ? 12 : 0) + (hasTimeline ? 8 : 0) + (hasBudget ? 11 : 0) + (hasDecisionMaker ? 11 : 0))
  const positiveCount = (leadText.match(/\b(excited|interested|great|love|helpful|perfect|thanks|thank you)\b/g) ?? []).length
  const negativeCount = (leadText.match(/\b(frustrated|disappointed|expensive|concerned|problem|issue|lost|difficult)\b/g) ?? []).length
  const sentimentScore = Math.max(0, Math.min(100, 55 + positiveCount * 12 - negativeCount * 14))
  const sentiment = sentimentScore >= 68 ? 'Positive' : sentimentScore <= 40 ? 'Negative' : 'Neutral'

  return { teamSize, hasNeed, hasTimeline, hasBudget, hasDecisionMaker, fitScore, sentimentScore, sentiment }
}

function App() {
  const [transcript, setTranscript] = useState(starterTranscript)
  const [draft, setDraft] = useState('')
  const [language, setLanguage] = useState('English')
  const [isCallActive, setIsCallActive] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [callSeconds, setCallSeconds] = useState(0)
  const [bookedSlot, setBookedSlot] = useState('')
  const [crmSynced, setCrmSynced] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const [activeNav, setActiveNav] = useState('Live call')
  const [activeSource, setActiveSource] = useState(knowledge[0])
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const transcriptEndRef = useRef<HTMLDivElement>(null)
  const leadSignals = deriveLeadSignals(transcript)

  useEffect(() => {
    if (!isCallActive) return
    const timer = window.setInterval(() => setCallSeconds((seconds) => seconds + 1), 1000)
    return () => window.clearInterval(timer)
  }, [isCallActive])

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [transcript])

  const duration = `${String(Math.floor(callSeconds / 60)).padStart(2, '0')}:${String(callSeconds % 60).padStart(2, '0')}`

  function speak(text: string) {
    if (isMuted || !('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = languageCodes[language]
    window.speechSynthesis.speak(utterance)
  }

  function respondToLead(text: string) {
    const source = getAnswer(text)
    setActiveSource(source)
    const reply = text.toLowerCase().includes('price') || text.toLowerCase().includes('cost')
      ? 'Our Growth plan is $89 per seat each month, and guided onboarding is included. I can walk you through what that looks like for your team.'
      : text.toLowerCase().includes('security') || text.toLowerCase().includes('integrat')
        ? 'We support HubSpot and Salesforce integrations, role-based access, and encryption at rest. I can share the security brief after our call.'
        : 'For a 12-person team, the Growth plan is a strong fit. It brings shared follow-ups and pipeline reporting into one place, and onboarding usually takes about 10 business days.'
    setTranscript((entries) => [...entries, { speaker: 'agent', text: reply, time: new Date().toLocaleTimeString([], { hour12: false }) }])
    speak(reply)
  }

  function addLeadMessage(text: string) {
    if (!text.trim()) return
    setTranscript((entries) => [...entries, { speaker: 'lead', text: text.trim(), time: new Date().toLocaleTimeString([], { hour12: false }) }])
    setDraft('')
    window.setTimeout(() => respondToLead(text), 450)
  }

  function toggleCall() {
    if (isCallActive) {
      recognitionRef.current?.stop()
      setIsListening(false)
      setIsCallActive(false)
      setShowSummary(true)
      return
    }
    setIsCallActive(true)
    const speechApi = window as SpeechWindow
    const Recognition = speechApi.SpeechRecognition ?? speechApi.webkitSpeechRecognition
    if (!Recognition) return
    const recognition = new Recognition()
    recognition.lang = languageCodes[language]
    recognition.continuous = true
    recognition.interimResults = false
    recognition.onresult = (event) => {
      const lastResult = event.results[event.results.length - 1]
      if (lastResult?.[0]?.transcript) addLeadMessage(lastResult[0].transcript)
    }
    recognition.onend = () => setIsListening(false)
    recognition.onerror = () => setIsListening(false)
    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
  }

  function sendDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    addLeadMessage(draft)
  }

  function saveSummary() {
    const text = [
      'CALL SUMMARY · OLIVIA CHEN',
      `Duration: ${duration}`,
      `Qualification: ${leadSignals.fitScore}/100 · ${leadSignals.teamSize ? `Team of ${leadSignals.teamSize}` : 'Team size unknown'} · ${leadSignals.hasNeed ? 'Need identified' : 'Need unconfirmed'} · ${leadSignals.hasTimeline ? 'Timeline identified' : 'Timeline unconfirmed'}`,
      `Next step: ${bookedSlot || 'No meeting booked'}`,
      '',
      ...transcript.map((entry) => `${entry.speaker === 'agent' ? 'Agent' : 'Olivia'}: ${entry.text}`),
    ].join('\n')
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }))
    link.download = 'olivia-chen-call-summary.txt'
    link.click()
    URL.revokeObjectURL(link.href)
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#home" aria-label="Relay home"><span className="brand-mark">r</span><span>relay<span className="brand-period">.</span></span></a>
        <div className="workspace-switcher"><span className="workspace-avatar">N</span><span className="workspace-copy"><strong>Northstar Labs</strong><small>Sales workspace</small></span><span className="chevron">⌄</span></div>
        <p className="nav-label">WORKSPACE</p>
        <nav className="primary-nav" aria-label="Main navigation">{['Overview', 'Live call', 'Call history', 'Knowledge base', 'Insights'].map((item, index) => <button key={item} className={`nav-item ${activeNav === item ? 'is-active' : ''}`} onClick={() => setActiveNav(item)}><span className="nav-icon">{['⌂', '◉', '◷', '▤', '▥'][index]}</span>{item}{item === 'Live call' && <span className="live-dot" />}</button>)}</nav>
        <div className="sidebar-bottom"><div className="plan-meter"><div className="plan-meter-top"><span>Minutes used</span><strong>684 <i>/ 1,000</i></strong></div><div className="meter-track"><span /></div><small>Resets Dec 1</small></div><button className="profile-button"><span className="profile-avatar">AM</span><span className="profile-copy"><strong>Alex Morgan</strong><small>Workspace admin</small></span><span className="chevron">···</span></button></div>
      </aside>

      <main className="main-area">
        <header className="topbar"><div className="breadcrumbs"><span>Workspace</span><span className="crumb-slash">/</span><strong>{activeNav}</strong></div><div className="topbar-actions"><span className="environment-pill"><span /> Demo environment</span><button className="icon-button" aria-label="Notifications" title="Notifications">♧<span className="notification-dot" /></button><span className="topbar-date">Wednesday, November 25</span></div></header>

        <div className="page-content">
          <section className="page-heading"><div><p className="eyebrow">WEDNESDAY · NOV 25, 2026 <span className="eyebrow-dot">/</span> SALES FLOOR</p><h1>Your calls, in good hands.</h1><p className="page-subtitle">An AI teammate that listens closely and moves every conversation forward.</p></div><div className="heading-actions"><button className="outline-button" onClick={() => setShowSummary(true)}><span>↗</span> View call summary</button><button className={`primary-button ${isCallActive ? 'end-call' : ''}`} onClick={toggleCall}><span className="call-button-icon">{isCallActive ? '■' : '◉'}</span>{isCallActive ? 'End call' : 'Start live call'}</button></div></section>

          <section className="stat-strip" aria-label="Today's call metrics"><div className="stat-item"><span className="stat-label">Calls today</span><div className="stat-value">24 <span className="stat-change positive">↑ 18%</span></div><span className="stat-foot">vs. previous Wednesday</span></div><div className="stat-item"><span className="stat-label">Qualified leads</span><div className="stat-value">16 <span className="stat-change positive">↑ 12%</span></div><span className="stat-foot">67% qualification rate</span></div><div className="stat-item"><span className="stat-label">Meetings booked</span><div className="stat-value">9 <span className="stat-change positive">↑ 3</span></div><span className="stat-foot">From today's conversations</span></div><div className="stat-item"><span className="stat-label">Avg. sentiment</span><div className="stat-value">82<span className="stat-unit">/100</span><span className="sentiment-face">☺</span></div><span className="stat-foot">Positive across 19 calls</span></div></section>

          <div className="section-heading"><div><span className="section-kicker">NOW IN PROGRESS</span><h2>Live conversation</h2></div><span className={`call-state ${isCallActive ? 'is-live' : ''}`}><span />{isCallActive ? `LIVE · ${duration}` : 'READY TO CONNECT'}</span></div>

          <section className="workbench">
            <div className="conversation-column">
              <div className="conversation-card">
                <div className="lead-header"><div className="lead-identity"><div className="lead-avatar">OC<span className="presence-indicator" /></div><div><div className="lead-name-line"><h3>Olivia Chen</h3><span className="lead-tag">INBOUND LEAD</span></div><p>VP of Sales <span>·</span> Brightpath Software</p></div></div><div className="lead-header-meta"><span className="phone-number">+1 (415) 555-0182</span><span className="source-label">Source: Website demo request</span></div></div>
                <div className="call-controls"><div className="control-left"><span className="audio-wave" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></span><span className="call-timer">{duration}</span><span className="control-divider" /><span className="language-select-wrap"><span className="language-globe">◎</span><select aria-label="Call language" value={language} onChange={(event) => setLanguage(event.target.value)}>{Object.keys(languageCodes).map((name) => <option key={name}>{name}</option>)}</select><span className="select-chevron">⌄</span></span></div><div className="control-right"><button className={`round-control ${isMuted ? 'control-selected' : ''}`} onClick={() => setIsMuted((muted) => !muted)} title={isMuted ? 'Unmute agent voice' : 'Mute agent voice'} aria-label={isMuted ? 'Unmute agent voice' : 'Mute agent voice'}>{isMuted ? '×' : '♫'}</button><button className={`round-control ${isListening ? 'control-selected' : ''}`} onClick={() => { if (!recognitionRef.current) toggleCall(); else if (isListening) { recognitionRef.current.stop(); setIsListening(false) } else { recognitionRef.current.start(); setIsListening(true) } }} title={isListening ? 'Pause microphone' : 'Enable microphone'} aria-label={isListening ? 'Pause microphone' : 'Enable microphone'}>♩</button><span className="control-caption">{isListening ? 'Mic on' : 'Mic off'}</span></div></div>
                <div className="transcript-toolbar"><span>TRANSCRIPT <span className="transcript-live-dot" /></span><button onClick={() => setTranscript([])} title="Clear transcript">Clear</button></div>
                <div className="transcript-list" aria-live="polite">{transcript.length === 0 && <div className="empty-transcript">Conversation cleared. Start a call or type a message to continue.</div>}{transcript.map((entry, index) => <article className={`transcript-entry ${entry.speaker}`} key={`${entry.time}-${index}`}><div className={`speaker-avatar ${entry.speaker}`}>{entry.speaker === 'agent' ? 'r' : 'OC'}</div><div className="transcript-message"><div className="message-meta"><strong>{entry.speaker === 'agent' ? 'Relay AI' : 'Olivia Chen'}</strong><time>{entry.time}</time>{entry.speaker === 'agent' && <span className="message-audio">♫ Voice</span>}</div><p>{entry.text}</p></div></article>)}<div ref={transcriptEndRef} /></div>
                <form className="message-composer" onSubmit={sendDraft}><input value={draft} onChange={(event) => setDraft(event.target.value)} aria-label="Add a transcript message" placeholder="Type a message as Olivia to test the conversation..." /><button type="submit" disabled={!draft.trim()} aria-label="Send message" title="Send message">↗</button></form><div className="conversation-footer"><span><span className="lock-icon">◈</span> Secure, encrypted session</span><span>Speech powered by your browser</span></div>
              </div>
              <div className="insight-banner"><div className="insight-mark">✳</div><div><strong>Good moment to ask about decision criteria</strong><p>Olivia mentioned a January launch and is comparing vendors. Find out who else is involved in the decision.</p></div><button onClick={() => addLeadMessage('Can you tell me what matters most as you compare solutions?')}>Use suggestion <span>↗</span></button></div>
            </div>

            <aside className="intelligence-column">
              <section className="side-panel qualification-panel"><div className="panel-heading"><div><span className="panel-overline">LEAD INTELLIGENCE</span><h3>Qualification</h3></div><button className="more-button" aria-label="Qualification options">···</button></div><div className="qualification-score"><div className="score-ring" style={{ background: `conic-gradient(#4f9a69 ${leadSignals.fitScore * 3.6}deg, #e8eee6 ${leadSignals.fitScore * 3.6}deg 360deg)` }}><div><strong>{leadSignals.fitScore}</strong><span>FIT SCORE</span></div></div><div className="score-summary"><strong>{leadSignals.fitScore >= 75 ? 'Strong fit' : leadSignals.fitScore >= 60 ? 'Promising fit' : 'More discovery needed'}</strong><p>Signals extracted from the live transcript.</p><span className={`sentiment-chip sentiment-${leadSignals.sentiment.toLowerCase()}`}>☺ {leadSignals.sentiment} sentiment</span></div></div><div className="qualifiers">{[{ label: 'Team size', value: leadSignals.teamSize ? `${leadSignals.teamSize} seats` : 'Not discussed', confirmed: Boolean(leadSignals.teamSize) }, { label: 'Primary need', value: leadSignals.hasNeed ? 'Follow-up automation' : 'Not confirmed', confirmed: leadSignals.hasNeed }, { label: 'Timeline', value: leadSignals.hasTimeline ? 'Before January' : 'Not discussed', confirmed: leadSignals.hasTimeline }, { label: 'Budget', value: leadSignals.hasBudget ? 'Discussed' : 'Not discussed', confirmed: leadSignals.hasBudget }, { label: 'Decision maker', value: leadSignals.hasDecisionMaker ? 'Confirmed' : 'Not confirmed', confirmed: leadSignals.hasDecisionMaker }].map((item) => <div className="qualifier-row" key={item.label}><span className={`qualifier-status ${item.confirmed ? 'confirmed' : 'pending'}`}>{item.confirmed ? '✓' : '·'}</span><span className="qualifier-label">{item.label}</span><span className={`qualifier-value ${item.confirmed ? 'confirmed' : 'pending'}`}>{item.value}</span></div>)}</div><div className="sentiment-meter"><div className="sentiment-meter-label"><span>Conversation sentiment</span><strong>{leadSignals.sentiment} <span>{leadSignals.sentimentScore}</span></strong></div><div className="sentiment-track"><span style={{ width: `${leadSignals.sentimentScore}%` }} /></div><div className="sentiment-scale"><span>Negative</span><span>Positive</span></div></div></section>

              <section className="side-panel knowledge-panel"><div className="panel-heading"><div><span className="panel-overline">GROUNDED IN YOUR CONTENT</span><h3>Knowledge match</h3></div><button className="more-button" aria-label="Knowledge options">···</button></div><div className="knowledge-question"><span>⌕</span><span>Recommended for this conversation</span></div>{knowledge.map((item, index) => <button key={item.title} className={`knowledge-result ${activeSource.title === item.title ? 'selected' : ''}`} onClick={() => setActiveSource(item)}><span className="doc-icon">▤</span><span className="knowledge-result-copy"><span className="doc-category">{item.category} <span>·</span> {index === 0 ? '94%' : index === 1 ? '88%' : '81%'} match</span><strong>{item.title}</strong></span><span className="result-arrow">↗</span></button>)}<div className="source-preview"><div className="source-preview-top"><span>RETRIEVED EXCERPT</span><span>● GROUNDED</span></div><p>{activeSource.text}</p></div></section>

              <section className="side-panel booking-panel"><div className="panel-heading"><div><span className="panel-overline">NEXT BEST ACTION</span><h3>Book a follow-up</h3></div><span className="calendar-icon">▦</span></div>{bookedSlot ? <div className="booking-confirmation"><span className="booking-check">✓</span><div><strong>Meeting booked</strong><p>{bookedSlot} · 30 min product walkthrough</p></div><button onClick={() => setBookedSlot('')} aria-label="Cancel booking" title="Cancel booking">×</button></div> : <><p className="booking-description">Offer Olivia a time for a product walkthrough.</p><div className="slot-list">{['Thu, Nov 26 · 10:30 AM', 'Thu, Nov 26 · 2:00 PM', 'Fri, Nov 27 · 11:00 AM'].map((slot) => <button key={slot} className="slot-button" onClick={() => setBookedSlot(slot)}><span className="slot-clock">◷</span>{slot}<span className="slot-add">+</span></button>)}</div></>}<button className={`crm-button ${crmSynced ? 'synced' : ''}`} onClick={() => setCrmSynced(true)}><span className="crm-mark">{crmSynced ? '✓' : '↗'}</span>{crmSynced ? 'Synced to HubSpot' : 'Sync lead to HubSpot'}<span className="crm-sync-state">{crmSynced ? 'DONE' : 'DEMO'}</span></button></section>
            </aside>
          </section>

          <footer className="page-footer"><span>Relay AI · Sales workspace</span><span>Prototype mode <span className="footer-separator">·</span> No customer data is sent to a CRM</span></footer>
        </div>
      </main>

      {showSummary && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowSummary(false) }}><section className="summary-modal" role="dialog" aria-modal="true" aria-labelledby="summary-title"><div className="summary-header"><div><span className="panel-overline">CALL RECAP · NOV 25, 2026</span><h2 id="summary-title">Olivia Chen</h2></div><button className="modal-close" onClick={() => setShowSummary(false)} aria-label="Close summary">×</button></div><div className="summary-body"><div className="summary-stat-grid"><div><span>Duration</span><strong>{duration}</strong></div><div><span>Lead fit</span><strong>{leadSignals.fitScore} / 100</strong></div><div><span>Sentiment</span><strong className={`sentiment-${leadSignals.sentiment.toLowerCase()}-text`}>{leadSignals.sentiment}</strong></div></div><h3>Conversation summary</h3><p>Olivia leads sales at Brightpath Software, a 12-person team currently working across spreadsheets and HubSpot. Follow-ups are being missed, and the team wants a solution live before January. They are actively comparing vendors.</p><h3>Recommended next steps</h3><ul><li>{leadSignals.hasBudget ? 'Confirm available budget and buying process.' : 'Confirm budget and other decision makers.'}</li><li>{bookedSlot ? `Product walkthrough booked for ${bookedSlot}.` : 'Offer a 30-minute product walkthrough.'}</li><li>Share pricing details and the security brief.</li></ul><div className="summary-actions"><button className="outline-button" onClick={saveSummary}>↓ Download recap</button><button className="primary-button" onClick={() => { setCrmSynced(true); setShowSummary(false) }}>✓ Save to CRM</button></div></div></section></div>}
    </div>
  )
}

export default App
