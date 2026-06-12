import { Outlet } from 'react-router-dom';
import Sidebar from '../Sidebar/Sidebar';
import BottomNav from '../BottomNav/BottomNav';
import "./AppShell.css";

export default function AppShell({ user, unreadCount }) {
  return (
    <div className="app-shell">
      <Sidebar user={user} unreadCount={unreadCount} />
      <div className="app-shell__content">
        <main className="app-shell__main">
          <Outlet />
        </main>
      </div>
      <BottomNav unreadCount={unreadCount} />
    </div>
  );
}