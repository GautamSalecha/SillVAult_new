import { useEffect, useState } from 'react';
import { Inbox, Clock, CheckCircle2, Lightbulb } from 'lucide-react';
import { Api } from '../../lib/api';
import { useToast } from '../../lib/toast';
import { useI18n } from '../../lib/i18n';

function StatusBadge({ status }) {
  const { t } = useI18n();
  const isApproved = status === 'approved';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, fontWeight: 600,
      padding: '3px 10px', borderRadius: 'var(--sv-radius-full)',
      background: isApproved ? 'var(--sv-brass-soft)' : 'var(--sv-bg)',
      color: isApproved ? 'var(--sv-brass)' : 'var(--sv-muted)',
      border: `1px solid ${isApproved ? 'var(--sv-brass)' : 'var(--sv-border)'}`,
    }}>
      {isApproved ? <CheckCircle2 size={11} /> : <Clock size={11} />}
      {isApproved ? (t('tipStatusApproved') || 'Approved') : (t('tipStatusPending') || 'Pending review')}
    </span>
  );
}

export default function MyTips() {
  const { t } = useI18n();
  const [tips, setTips] = useState([]);
  const [loading, setLoading] = useState(true);
  const { push } = useToast();

  useEffect(() => {
    Api.myTips()
      .then((res) => setTips(res.tips || []))
      .catch((err) => push(err.message, 'error'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="sv-premium-page sv-knowledge-page">
      <div className="sv-premium-hero sv-premium-hero--worker">
        <div>
          <span className="sv-kicker"><Lightbulb size={14} /> Worker knowledge</span>
          <h1>{t('myTipsTitle')}</h1>
          <p>{t('myTipsSubtitle')}</p>
        </div>
        <div className="sv-hero-metrics">
          <span><strong>{tips.length}</strong> Submitted</span>
          <span><strong>{tips.filter((tip) => tip.status === 'approved').length}</strong> Approved</span>
        </div>
      </div>

      {loading ? (
        <div className="sv-state-card">
          <span className="sv-loader-dot" />
          <p>{t('loading') || 'Loading…'}</p>
        </div>
      ) : tips.length === 0 ? (
        <div className="sv-state-card sv-state-card--empty">
          <Inbox size={32} />
          <h3>
            {t('myTipsEmptyTitle') || "You haven't submitted any tips yet"}
          </h3>
          <p>
            {t('myTipsEmptyBody') || 'Tips you create in the Knowledge Hub will show up here once submitted.'}
          </p>
        </div>
      ) : (
        <div className="sv-knowledge-grid">
          {tips.map((tip) => (
            <div key={tip.id} className="sv-knowledge-card">
              <div className="sv-knowledge-card__head">
                <span>
                  {tip.machine_id}
                </span>
                <StatusBadge status={tip.status} />
              </div>
              <p>
                {tip.text}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
