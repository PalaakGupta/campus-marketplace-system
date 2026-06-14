import { NavLink } from 'react-router-dom';
import {
  FiHome,
  FiShoppingBag,
  FiPlus,
  FiMessageCircle,
  FiUser,
} from 'react-icons/fi';
import './BottomNav.css';

const NAV_ITEMS = [
  { to: '/dashboard',   icon: FiHome,          label: 'Home' },
  { to: '/marketplace', icon: FiShoppingBag,   label: 'Market' },
  { to: '/list-item',   icon: FiPlus,          label: 'Sell',   isSell: true },
  { to: '/messages',    icon: FiMessageCircle, label: 'Chat' },
  { to: '/profile',     icon: FiUser,          label: 'Profile' },
];

export default function BottomNav({ unreadCount = 0 }) {
  return (
    <nav className="bottom-nav">
      {NAV_ITEMS.map(({ to, icon: Icon, label, isSell }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            `bottom-nav__item ${isActive ? 'bottom-nav__item--active' : ''}`
          }
        >
          {isSell ? (
            <div className="bottom-nav__sell-btn">
              <Icon size={22} />
            </div>
          ) : (
            <>
              <div className="bottom-nav__icon-wrap">
                <Icon size={21} />
                {label === 'Chat' && unreadCount > 0 && (
                  <span className="bottom-nav__badge">{unreadCount}</span>
                )}
              </div>
              <span className="bottom-nav__label">{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}