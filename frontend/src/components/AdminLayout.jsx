import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { BarChart3, BookOpenText, ClipboardList, FileText, Gauge, LogOut, Moon, ShieldCheck, Sun, Globe, UserRoundCog, UsersRound } from 'lucide-react';
import { useState } from 'react';
import Wordmark from './Wordmark';
import { clearAdminSession } from '../lib/auth';
import { getTheme, setTheme } from '../lib/theme';
import { useI18n } from '../lib/i18n';

export default function AdminLayout() {
  const navigate = useNavigate();
  const [theme, setThemeState] = useState(getTheme());
  const { t, lang, setLang, LANGUAGES } = useI18n();
  const [showLanguages, setShowLanguages] = useState(false);

  const NAV = [
    { to: '/admin/dashboard', label: 'Command', icon: Gauge },
    { to: '/admin/pending-workers', label: 'Approvals', icon: UsersRound },
    { to: '/admin/workers-machines', label: 'Workforce', icon: UserRoundCog },
    { to: '/admin/knowledge-review', label: 'Knowledge', icon: BookOpenText },
    { to: '/admin/tickets', label: 'Tickets', icon: ClipboardList },
    { to: '/admin/safety-measures', label: 'Safety', icon: ShieldCheck },
    { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/admin/manuals', label: 'Manuals', icon: FileText },
    { to: '/admin/profile', label: 'Profile', icon: UserRoundCog },
  ];

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setThemeState(next);
    setTheme(next);
  }

  function handleLogout() {
    clearAdminSession();
    navigate('/');
  }

  return (
    <div className="sv-admin-shell">
      <aside className="sv-admin-sidebar">
        <div className="sv-admin-sidebar__brand"><Wordmark size={16} /></div>
        <nav className="sv-admin-sidebar__nav" aria-label="Admin navigation">
        {NAV.map((item) => {
          const Icon = item.icon;
          return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `sv-admin-nav-item${isActive ? ' sv-admin-nav-item--active' : ''}`}
          >
            <Icon size={17} />
            {item.label}
          </NavLink>
          );
        })}
        </nav>

        <div className="sv-admin-sidebar__spacer" />

        {/* Language Selector */}
        <div style={{ position: 'relative', marginBottom: 4 }}>
          <button
            className="sv-btn"
            onClick={() => setShowLanguages(!showLanguages)}
            style={{
              justifyContent: 'flex-start',
              padding: '10px 12px',
              gap: 8,
              color: 'var(--sv-muted)',
              fontSize: 13,
              fontWeight: 500,
              width: '100%',
              borderRadius: 'var(--sv-radius-sm)',
            }}
            title={t('selectLanguage')}
          >
            <Globe size={16} />
            <span>{lang.toUpperCase()}</span>
          </button>
          {showLanguages && (
            <div
              style={{
                position: 'absolute',
                bottom: '100%',
                left: 0,
                right: 0,
                background: 'var(--sv-surface)',
                border: '1px solid var(--sv-border)',
                borderRadius: 'var(--sv-radius-md)',
                boxShadow: '0 -4px 12px rgba(0,0,0,0.1)',
                marginBottom: 4,
                zIndex: 10,
                overflow: 'hidden',
              }}
            >
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => {
                    setLang(l.code);
                    setShowLanguages(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    textAlign: 'left',
                    background: lang === l.code ? 'var(--sv-brass-soft)' : 'transparent',
                    color: lang === l.code ? 'var(--sv-brass)' : 'var(--sv-ink)',
                    border: 'none',
                    borderBottom: '1px solid var(--sv-border)',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 500,
                    transition: 'all var(--sv-transition-fast)',
                  }}
                  onMouseEnter={(e) => {
                    if (lang !== l.code) {
                      e.currentTarget.style.background = 'var(--sv-bg-secondary)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (lang !== l.code) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  {l.native}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          className="sv-btn"
          onClick={toggleTheme}
          style={{
            justifyContent: 'flex-start',
            padding: '10px 12px',
            gap: 8,
            color: 'var(--sv-muted)',
            fontSize: 13,
            fontWeight: 500,
            width: '100%',
            borderRadius: 'var(--sv-radius-sm)',
          }}
          title={theme === 'dark' ? t('light') : t('dark')}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          {theme === 'dark' ? t('light') : t('dark')}
        </button>
        <button
          className="sv-btn"
          onClick={handleLogout}
          style={{
            justifyContent: 'flex-start',
            padding: '10px 12px',
            gap: 8,
            color: 'var(--sv-danger)',
            fontSize: 13,
            fontWeight: 500,
            width: '100%',
            borderRadius: 'var(--sv-radius-sm)',
            transition: 'all var(--sv-transition-fast)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--sv-danger-soft)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
          title={t('logout')}
        >
          <LogOut size={16} /> {t('logout')}
        </button>
      </aside>
      <main className="sv-admin-main">
        <Outlet />
      </main>
    </div>
  );
}
