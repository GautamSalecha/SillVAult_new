import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowRight, BookOpenText, ClipboardList, FileText, ShieldCheck, UsersRound } from 'lucide-react';
import { Api } from '../../lib/api';
import { useToast } from '../../lib/toast';

const EMPTY = { workers: [], machines: [], tickets: [], pendingWorkers: [] };

export default function AdminDashboard() {
  const { push } = useToast();
  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    Promise.allSettled([
      Api.allWorkers(),
      Api.allMachines(),
      Api.adminTickets(),
      Api.pendingWorkers(),
    ])
      .then((results) => {
        if (!alive) return;
        const [workers, machines, tickets, pendingWorkers] = results;
        setData({
          workers: workers.status === 'fulfilled' ? workers.value.workers || [] : [],
          machines: machines.status === 'fulfilled' ? machines.value.machine_ids || [] : [],
          tickets: tickets.status === 'fulfilled' ? tickets.value || [] : [],
          pendingWorkers: pendingWorkers.status === 'fulfilled' ? pendingWorkers.value.pending_workers || [] : [],
        });
        const failed = results.filter((r) => r.status === 'rejected');
        if (failed.length) push('Some dashboard data could not load yet.', 'error');
      })
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const stats = useMemo(() => {
    const openTickets = data.tickets.filter((t) => t.status === 'Open' || t.status === 'In Progress').length;
    const approvedWorkers = data.workers.filter((w) => w.is_approved).length;
    return [
      { label: 'Workers', value: data.workers.length, note: `${approvedWorkers} approved`, icon: UsersRound },
      { label: 'Machines', value: data.machines.length, note: 'Manual-backed assets', icon: BookOpenText },
      { label: 'Open Tickets', value: openTickets, note: 'Need attention', icon: ClipboardList },
      { label: 'Pending Workers', value: data.pendingWorkers.length, note: 'Awaiting approval', icon: AlertCircle },
    ];
  }, [data]);

  return (
    <div className="sv-admin-command">
      <section className="sv-admin-command__hero">
        <div>
          <span className="sv-kicker">SkillVault Admin Command</span>
          <h1>Operate the knowledge system like a control room.</h1>
          <p>
            Review people, machines, manuals, safety, tickets, and knowledge quality from a sharper operations center.
          </p>
        </div>
        <div className="sv-admin-command__status">
          <span className={loading ? 'sv-pulse-dot' : 'sv-pulse-dot sv-pulse-dot--ready'} />
          {loading ? 'Syncing backend data' : 'Command center live'}
        </div>
      </section>

      <section className="sv-admin-command__stats">
        {stats.map(({ label, value, note, icon: Icon }) => (
          <div className="sv-admin-stat" key={label}>
            <Icon size={20} />
            <strong>{loading ? '--' : value}</strong>
            <span>{label}</span>
            <small>{note}</small>
          </div>
        ))}
      </section>

      <section className="sv-admin-command__grid">
        <AdminAction
          to="/admin/pending-workers"
          icon={UsersRound}
          title="Approve Workers"
          body="Control who can enter the worker app and start contributing knowledge."
        />
        <AdminAction
          to="/admin/knowledge-review"
          icon={BookOpenText}
          title="Review Knowledge"
          body="Approve, edit, or reject worker tips and captured interview insights."
        />
        <AdminAction
          to="/admin/manuals"
          icon={FileText}
          title="Manual Library"
          body="Upload and refresh the machine manuals that power answers."
        />
        <AdminAction
          to="/admin/safety-measures"
          icon={ShieldCheck}
          title="Safety Builder"
          body="Create guided safety briefings and track worker completions."
        />
      </section>
    </div>
  );
}

function AdminAction({ to, icon: Icon, title, body }) {
  return (
    <Link to={to} className="sv-admin-action">
      <span className="sv-admin-action__icon"><Icon size={20} /></span>
      <strong>{title}</strong>
      <span>{body}</span>
      <ArrowRight size={17} />
    </Link>
  );
}
