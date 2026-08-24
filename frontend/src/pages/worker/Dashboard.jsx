import { Link } from 'react-router-dom';
import { ArrowRight, Bot, ClipboardList, Mic, PlusCircle, ShieldCheck, Sparkles } from 'lucide-react';
import { getWorkerName } from '../../lib/auth';

const QUICK_ACTIONS = [
  {
    to: '/worker/help/ask',
    title: 'Ask a machine question',
    body: 'Get grounded answers from manuals and approved shop-floor knowledge.',
    icon: Bot,
    tone: 'blue',
  },
  {
    to: '/worker/knowledge/create',
    title: 'Capture a field tip',
    body: 'Record video, speak, type, and send a polished tip for review.',
    icon: PlusCircle,
    tone: 'amber',
  },
  {
    to: '/worker/safety',
    title: 'Complete safety checks',
    body: 'Review assigned machine procedures before starting work.',
    icon: ShieldCheck,
    tone: 'green',
  },
  {
    to: '/worker/work/new',
    title: 'Raise a work request',
    body: 'Report a problem and keep the maintenance loop visible.',
    icon: ClipboardList,
    tone: 'red',
  },
];

export default function Dashboard() {
  const workerName = getWorkerName();

  return (
    <div className="sv-dashboard">
      <section className="sv-dashboard__hero">
        <div className="sv-dashboard__hero-copy">
          <span className="sv-kicker"><Sparkles size={14} /> SkillVault Worker Console</span>
          <h1>{workerName ? `Welcome back, ${workerName}` : 'Work with machine knowledge in one place'}</h1>
          <p>
            Ask, capture, verify, and escalate without hunting through disconnected screens.
            The knowledge your team builds today becomes the answer someone needs tomorrow.
          </p>
          <div className="sv-dashboard__hero-actions">
            <Link to="/worker/help/ask" className="sv-btn sv-btn--primary sv-btn--lg">
              <Bot size={17} /> Ask Now
            </Link>
            <Link to="/worker/knowledge/create" className="sv-btn sv-btn--outline sv-btn--lg">
              <PlusCircle size={17} /> Create Tip
            </Link>
          </div>
        </div>

        <div className="sv-ops-panel" aria-label="Machine knowledge activity preview">
          <div className="sv-ops-panel__rail">
            <span />
            <span />
            <span />
          </div>
          <div className="sv-ops-panel__screen">
            <div className="sv-ops-panel__top">
              <span>CNC-204</span>
              <strong>Live Knowledge</strong>
            </div>
            <div className="sv-ops-panel__gauge">
              <div className="sv-ops-panel__needle" />
              <div className="sv-ops-panel__core">
                <Mic size={24} />
              </div>
            </div>
            <div className="sv-ops-panel__feed">
              <span>Manual answer ready</span>
              <span>2 safety checks due</span>
              <span>Video tip queued</span>
            </div>
          </div>
        </div>
      </section>

      <section className="sv-dashboard__grid" aria-label="Quick actions">
        {QUICK_ACTIONS.map(({ to, title, body, icon: Icon, tone }) => (
          <Link key={to} to={to} className={`sv-feature-tile sv-feature-tile--${tone}`}>
            <span className="sv-feature-tile__icon"><Icon size={20} /></span>
            <span className="sv-feature-tile__content">
              <strong>{title}</strong>
              <span>{body}</span>
            </span>
            <ArrowRight size={17} className="sv-feature-tile__arrow" />
          </Link>
        ))}
      </section>
    </div>
  );
}
