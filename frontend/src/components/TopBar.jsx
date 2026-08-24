import { Link } from 'react-router-dom';
import { Bell, Sparkles, WifiOff } from 'lucide-react';

function initials(name) {
  if (!name) return '?';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

/**
 * offline / queuedCount: offline mode is flagged in the brief as a
 * separate architecture task (service worker + local queue), not
 * wired up yet. This banner is presentational only until that lands.
 *
 * Hands-free and Settings moved to the bottom tab bar (WorkerNav) so
 * every section is reachable from every screen — this bar now just
 * carries the brand, notifications, and the signed-in worker.
 */
export default function TopBar({ workerName, offline = false, queuedCount = 0 }) {
  return (
    <div className="sv-topbar">
      {offline && (
        <div className="sv-topbar__offline">
          <WifiOff size={13} />
          Offline — {queuedCount} tip{queuedCount === 1 ? '' : 's'} queued, will sync when back online
        </div>
      )}
      <div className="sv-topbar__row">
        <div className="sv-topbar__status">
          <Sparkles size={15} />
          <span>Live floor intelligence</span>
        </div>
        <div className="sv-topbar__actions">
          <Link to="/worker/notifications" aria-label="Notifications"><Bell size={18} /></Link>
          <Link to="/worker/settings" className="sv-topbar__avatar" aria-label="Settings">{initials(workerName)}</Link>
        </div>
      </div>
    </div>
  );
}
