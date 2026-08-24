import { Outlet } from 'react-router-dom';
import TopBar from './TopBar';
import WorkerNav from './WorkerNav';
import { getWorkerName } from '../lib/auth';
import { WorkerSessionProvider } from '../lib/workerSession';

export default function WorkerLayout() {
  return (
    <WorkerSessionProvider>
      <div className="sv-worker-shell">
        <WorkerNav />
        <div className="sv-worker-stage">
          <TopBar workerName={getWorkerName()} />
          <div className="sv-worker-content">
            <Outlet />
          </div>
        </div>
      </div>
    </WorkerSessionProvider>
  );
}
