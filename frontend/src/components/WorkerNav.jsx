import { NavLink, useLocation } from 'react-router-dom';
import { Bot, BookOpenText, ClipboardList, Gauge, Settings, ShieldCheck } from 'lucide-react';
import { useI18n } from '../lib/i18n';
import Wordmark from './Wordmark';

/**
 * Persistent bottom tab bar with multilingual support.
 * Every worker screen renders inside WorkerLayout below this,
 * so there is always a way back to Ask (or any other section).
 */
export default function WorkerNav() {
  const { t } = useI18n();
  const location = useLocation();

  const TABS = [
    { to: '/worker', match: '/worker', exact: true, label: 'Home', icon: Gauge },
    { to: '/worker/help/ask', match: '/worker/help', label: 'Help', icon: Bot },
    { to: '/worker/knowledge/tips', match: '/worker/knowledge', label: 'Knowledge', icon: BookOpenText },
    { to: '/worker/work/tickets', match: '/worker/work', label: 'Work', icon: ClipboardList },
    { to: '/worker/safety', match: '/worker/safety', label: t('safetyTitle'), icon: ShieldCheck },
    { to: '/worker/settings', match: '/worker/settings', label: t('settingsTitle'), icon: Settings },
  ];

  return (
    <aside className="sv-worker-nav-shell">
      <div className="sv-worker-nav__brand">
        <Wordmark size={16} />
        <span>Worker OS</span>
      </div>
      <nav className="sv-worker-nav" aria-label="Primary navigation">
        {TABS.map(({ to, match, exact, label, icon: Icon }) => {
          const active = exact ? location.pathname === match : location.pathname === match || location.pathname.startsWith(`${match}/`);
          return (
          <NavLink
            key={to}
            to={to}
            className={`sv-worker-nav__tab${active ? ' sv-worker-nav__tab--active' : ''}`}
            title={label}
          >
            <Icon size={20} strokeWidth={2} />
            <span>{label}</span>
          </NavLink>
          );
        })}
      </nav>
      <div className="sv-worker-nav__signature">
        <strong>SkillVault</strong>
        <span>Machine intelligence for every shift</span>
      </div>
    </aside>
  );
}
