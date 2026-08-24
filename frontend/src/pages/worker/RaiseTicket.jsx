import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Gauge, Send, Ticket } from 'lucide-react';
import { Api } from '../../lib/api';
import { useToast } from '../../lib/toast';
import MachineSelect from '../../components/MachineSelect';

const priorities = [
  { id: 'Low', title: 'Low', note: 'Can wait', icon: CheckCircle2 },
  { id: 'Medium', title: 'Medium', note: 'Needs planning', icon: Gauge },
  { id: 'High', title: 'High', note: 'Urgent risk', icon: AlertTriangle },
];

export default function RaiseTicket() {
  const { push } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [machineId, setMachineId] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [loading, setLoading] = useState(false);
  const [machines, setMachines] = useState([]);

  useEffect(() => {
    Api.myMachines()
      .then((data) => setMachines(data?.machine_ids || []))
      .catch((err) => {
        push(err.message || 'Failed to load machines', 'error');
        setMachines([]);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      push('Please fill title and description', 'error');
      return;
    }

    setLoading(true);
    try {
      await Api.createTicket({
        title: title.trim(),
        description: description.trim(),
        machine_id: machineId || null,
        priority,
      });
      push('Ticket submitted successfully', 'success');
      setTitle('');
      setDescription('');
      setMachineId('');
      setPriority('Medium');
    } catch (err) {
      push(err.message || 'Failed to submit ticket', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="sv-premium-page sv-ticket-page">
      <div className="sv-premium-hero sv-premium-hero--worker">
        <div>
          <span className="sv-kicker"><Ticket size={14} /> Work request</span>
          <h1>Raise the right signal fast.</h1>
          <p>Capture machine issues with enough clarity for maintenance to act without a long back-and-forth.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="sv-lux-form">
        <section className="sv-lux-form__main">
          <label className="sv-field">
            <span>Issue title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Machine making unusual noise"
              required
            />
          </label>

          <label className="sv-field">
            <span>What happened?</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mention what changed, when it started, what you already checked, and whether production is affected."
              rows={7}
              required
            />
          </label>

          <div className="sv-field">
            <span>Machine</span>
            <MachineSelect value={machineId} onChange={setMachineId} machines={machines} />
          </div>
        </section>

        <aside className="sv-lux-form__side">
          <div>
            <p className="sv-lux-form__eyebrow">Priority</p>
            <div className="sv-priority-grid">
              {priorities.map(({ id, title: label, note, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPriority(id)}
                  className={`sv-priority-card sv-priority-card--${id.toLowerCase()}${priority === id ? ' sv-priority-card--active' : ''}`}
                >
                  <Icon size={18} />
                  <strong>{label}</strong>
                  <span>{note}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="sv-submit-panel">
            <strong>Before submitting</strong>
            <span>Clear issue reports reduce downtime and help admins prioritize work.</span>
            <button type="submit" className="sv-btn sv-btn--primary sv-btn--lg sv-btn--full" disabled={loading}>
              <Send size={16} /> {loading ? 'Submitting...' : 'Submit Ticket'}
            </button>
          </div>
        </aside>
      </form>
    </div>
  );
}
