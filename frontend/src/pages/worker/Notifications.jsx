import { BellOff, RadioTower } from 'lucide-react';

/**
 * Scope for notifications was explicitly left open in the handoff
 * brief ("only nav placeholders exist so far, not designed") and
 * there's no backend support. Real empty state rather than a fake list.
 */
export default function Notifications() {
  return (
    <div className="sv-premium-page sv-notifications-page">
      <div className="sv-premium-hero sv-premium-hero--worker">
        <div>
          <span className="sv-kicker"><RadioTower size={14} /> Signal center</span>
          <h1>Notifications</h1>
          <p>Approvals, safety updates, and work alerts will land here when the backend event stream is added.</p>
        </div>
      </div>
      <div className="sv-state-card sv-state-card--empty">
        <BellOff size={32} />
        <h3>No live alerts yet</h3>
        <p>
          SkillVault has the space ready; the backend still needs notification events before this can show real alerts.
        </p>
      </div>
    </div>
  );
}
