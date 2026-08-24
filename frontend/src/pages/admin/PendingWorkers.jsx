import { useEffect, useState } from 'react';
import { Check, X, UserCheck, UsersRound } from 'lucide-react';
import { Api } from '../../lib/api';
import { useToast } from '../../lib/toast';

export default function PendingWorkers() {
  const [workers, setWorkers] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const { push } = useToast();

  function load() {
    Api.pendingWorkers()
      .then((res) => setWorkers(res.pending_workers || []))
      .catch((err) => push(err.message, 'error'));
  }

  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function approve(workerId) {
    setBusyId(workerId);
    try {
      await Api.approveWorker(workerId);
      push('Worker approved.', 'success');
      setWorkers((w) => w.filter((x) => x.worker_id !== workerId));
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setBusyId(null);
    }
  }

  async function reject(workerId) {
    setBusyId(workerId);
    try {
      await Api.rejectWorker(workerId);
      push('Registration rejected and removed.', 'success');
      setWorkers((w) => w.filter((x) => x.worker_id !== workerId));
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="sv-premium-page sv-admin-queue-page">
      <div className="sv-premium-hero">
        <div>
          <span className="sv-kicker"><UsersRound size={14} /> Access control</span>
          <h1>Approve the right people before they reach the floor.</h1>
          <p>Review worker registrations with contact context and keep SkillVault access clean.</p>
        </div>
        <div className="sv-hero-metrics">
          <span><strong>{workers?.length ?? '-'}</strong> Waiting</span>
        </div>
      </div>

      {workers === null && (
        <div className="sv-state-card">
          <span className="sv-loader-dot" />
          <p>Loading…</p>
        </div>
      )}

      {workers?.length === 0 && (
        <div className="sv-state-card sv-state-card--empty">
          <UserCheck size={32} />
          <h3>No pending registrations</h3>
          <p>Every current worker account has already been reviewed.</p>
        </div>
      )}

      <div className="sv-approval-list">
        {workers?.map((w) => (
          <div key={w.worker_id} className="sv-approval-card">
            <div>
              <h3>{w.name}</h3>
              <p className="sv-mono-line">{w.worker_id}</p>
              {(w.phone || w.address) && (
                <p className="sv-muted-line">
                  {[w.phone, w.address].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
            <div className="sv-action-row">
              <button className="sv-btn sv-btn--teal" disabled={busyId === w.worker_id} onClick={() => approve(w.worker_id)}>
                <Check size={14} /> Approve
              </button>
              <button className="sv-btn sv-btn--outline" style={{ color: 'var(--sv-danger)' }} disabled={busyId === w.worker_id} onClick={() => reject(w.worker_id)}>
                <X size={14} /> Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
