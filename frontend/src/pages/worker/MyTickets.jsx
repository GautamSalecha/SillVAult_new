import { useEffect, useState } from 'react';
import { Api } from '../../lib/api';
import { useToast } from '../../lib/toast';
import { Ticket, Clock, Gauge, CheckCircle2 } from 'lucide-react';

const statusColor = {
  Open: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  'In Progress': { bg: '#fffbeb', text: '#b45309', border: '#fde68a' },
  Resolved: { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
  Closed: { bg: '#f8fafc', text: '#64748b', border: '#e2e8f0' },
};

const priorityColor = {
  High: '#ef4444',
  Medium: '#f59e0b',
  Low: '#22c55e',
};

export default function MyTickets() {
  const { push } = useToast();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTickets();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadTickets = async () => {
    try {
      const data = await Api.myTickets();
      setTickets(data);
    } catch {
      push('Failed to load tickets', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="sv-premium-page sv-queue-page">
        <div className="sv-state-card">
          <span className="sv-loader-dot" />
          <p>Loading your tickets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sv-premium-page sv-queue-page">
      <div className="sv-premium-hero sv-premium-hero--worker">
        <div>
          <span className="sv-kicker"><Ticket size={14} /> Work requests</span>
          <h1>Every issue has a visible path to resolution.</h1>
          <p>Track reported problems, priority, machine context, and admin progress from one clear queue.</p>
        </div>
        <div className="sv-hero-metrics">
          <span><strong>{tickets.length}</strong> Total</span>
          <span><strong>{tickets.filter((t) => t.status === 'Resolved' || t.status === 'Closed').length}</strong> Resolved</span>
        </div>
      </div>

      {tickets.length === 0 ? (
        <div className="sv-state-card sv-state-card--empty">
          <Ticket size={34} />
          <h3>No tickets yet</h3>
          <p>
            When you raise a ticket, it will appear here.
          </p>
        </div>
      ) : (
        <div className="sv-ticket-stack">
          {tickets.map((t) => {
            const sc = statusColor[t.status] || statusColor.Open;
            return (
              <div
                key={t.id}
                className="sv-ticket-card"
                style={{
                  '--ticket-accent': priorityColor[t.priority] || '#94a3b8',
                }}
              >
                <div className="sv-ticket-card__head">
                  <div>
                    <h3>{t.title}</h3>
                    <p>{t.description}</p>
                  </div>
                  <span
                    className="sv-status-pill"
                    style={{ background: sc.bg, color: sc.text, borderColor: sc.border }}
                  >
                    {t.status === 'Resolved' || t.status === 'Closed' ? <CheckCircle2 size={12} /> : <Gauge size={12} />}
                    {t.status}
                  </span>
                </div>

                <div className="sv-ticket-card__meta">
                  {t.machine_id && (
                    <span>
                      {t.machine_id}
                    </span>
                  )}
                  <span>
                    {t.priority}
                  </span>
                  <span>
                    <Clock size={13} />
                    {new Date(t.created_at).toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
