import { NavLink, Outlet, useLocation } from 'react-router-dom';

export default function WorkerSectionLayout({ title, subtitle, tabs, actions }) {
  const location = useLocation();
  const visibleActions = actions?.filter((action) => action.to !== location.pathname) || [];

  return (
    <div className="sv-worker-section">
      <div className="sv-worker-section__header">
        <div>
          <h1 className="sv-worker-section__title">{title}</h1>
          {subtitle && <p className="sv-worker-section__subtitle">{subtitle}</p>}
        </div>
        {visibleActions.length > 0 && (
          <div className="sv-worker-section__actions">
            {visibleActions.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} className="sv-btn sv-btn--primary sv-worker-section__action">
                {Icon && <Icon size={16} />}
                <span>{label}</span>
              </NavLink>
            ))}
          </div>
        )}
      </div>

      <nav className="sv-section-tabs" aria-label={`${title} navigation`}>
        {tabs.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end
            className={({ isActive }) => `sv-section-tabs__tab${isActive ? ' sv-section-tabs__tab--active' : ''}`}
          >
            {Icon && <Icon size={15} />}
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sv-worker-section__body">
        <Outlet />
      </div>
    </div>
  );
}
