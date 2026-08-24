import { Routes, Route, Navigate } from 'react-router-dom';
import { RequireWorker, RequireAdmin } from './lib/guards';

import Login from './pages/Login';
import WorkerLayout from './components/WorkerLayout';
import AdminLayout from './components/AdminLayout';
import WorkerSectionLayout from './components/WorkerSectionLayout';
import { Bot, ClipboardList, ListChecks, Mic, PlusCircle, Ticket } from 'lucide-react';

import Ask from './pages/worker/Ask';
import Dashboard from './pages/worker/Dashboard';
import AddTip from './pages/worker/AddTip';
import MyTips from './pages/worker/MyTips';
import HandsFree from './pages/worker/HandsFree';
import Interview from './pages/worker/Interview';
import Notifications from './pages/worker/Notifications';
import Settings from './pages/worker/Settings';
import Safety from './pages/worker/Safety';
import SafetyBriefing from './pages/worker/SafetyBriefing';

import PendingWorkers from './pages/admin/PendingWorkers';
import AdminDashboard from './pages/admin/AdminDashboard';
import WorkersMachines from './pages/admin/WorkersMachines';
import KnowledgeReview from './pages/admin/KnowledgeReview';
import Analytics from './pages/admin/Analytics';
import Manuals from './pages/admin/Manuals';
import RaiseTicket from './pages/worker/RaiseTicket';
import MyTickets from './pages/worker/MyTickets';
import Tickets from './pages/admin/Tickets';
import SafetyMeasures from './pages/admin/SafetyMeasures';
import AdminProfile from './pages/admin/Profile';
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />

      <Route
        path="/worker"
        element={<RequireWorker><WorkerLayout /></RequireWorker>}
      >
        <Route index element={<Dashboard />} />
        <Route
          path="help"
          element={
            <WorkerSectionLayout
              title="Machine Help"
              subtitle="Ask questions from manuals or switch into hands-free mode when your hands are busy."
              tabs={[
                { to: '/worker/help/ask', label: 'Ask', icon: Bot },
                { to: '/worker/help/hands-free', label: 'Hands-free', icon: Mic },
              ]}
            />
          }
        >
          <Route index element={<Navigate to="ask" replace />} />
          <Route path="ask" element={<Ask />} />
          <Route path="hands-free" element={<HandsFree />} />
        </Route>
        <Route
          path="knowledge"
          element={
            <WorkerSectionLayout
              title="Knowledge Hub"
              subtitle="Capture field tips, review your contributions, and share deeper know-how through interviews."
              tabs={[
                { to: '/worker/knowledge/tips', label: 'My Tips', icon: ListChecks },
                { to: '/worker/knowledge/create', label: 'Create Tip', icon: PlusCircle },
                { to: '/worker/knowledge/interview', label: 'Interview', icon: Mic },
              ]}
              actions={[
                { to: '/worker/knowledge/create', label: 'Create Tip', icon: PlusCircle },
              ]}
            />
          }
        >
          <Route index element={<Navigate to="tips" replace />} />
          <Route path="tips" element={<MyTips />} />
          <Route path="create" element={<AddTip />} />
          <Route path="interview" element={<Interview />} />
        </Route>
        <Route
          path="work"
          element={
            <WorkerSectionLayout
              title="Work Requests"
              subtitle="Raise issues and track the tickets you have already submitted."
              tabs={[
                { to: '/worker/work/tickets', label: 'My Tickets', icon: ClipboardList },
                { to: '/worker/work/new', label: 'Raise Ticket', icon: Ticket },
              ]}
              actions={[
                { to: '/worker/work/new', label: 'Raise Ticket', icon: Ticket },
              ]}
            />
          }
        >
          <Route index element={<Navigate to="tickets" replace />} />
          <Route path="tickets" element={<MyTickets />} />
          <Route path="new" element={<RaiseTicket />} />
        </Route>
        <Route path="safety" element={<Safety />} />
        <Route path="safety/:machineId" element={<SafetyBriefing />} />
        <Route path="ask" element={<Navigate to="help/ask" replace />} />
        <Route path="add-tip" element={<Navigate to="knowledge/create" replace />} />
        <Route path="my-tips" element={<Navigate to="knowledge/tips" replace />} />
        <Route path="hands-free" element={<Navigate to="help/hands-free" replace />} />
        <Route path="interview" element={<Navigate to="knowledge/interview" replace />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="settings" element={<Settings />} />
        <Route path="raise-ticket" element={<Navigate to="work/new" replace />} />
        <Route path="my-tickets" element={<Navigate to="work/tickets" replace />} />
        
      </Route>

      <Route
        path="/admin"
        element={<RequireAdmin><AdminLayout /></RequireAdmin>}
      >
        <Route index element={<Navigate to="analytics" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="pending-workers" element={<PendingWorkers />} />
        <Route path="workers-machines" element={<WorkersMachines />} />
        <Route path="knowledge-review" element={<KnowledgeReview />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="manuals" element={<Manuals />} />
        <Route path="tickets" element={<Tickets />} />
        <Route path="safety-measures" element={<SafetyMeasures />} />
        <Route path="profile" element={<AdminProfile />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
