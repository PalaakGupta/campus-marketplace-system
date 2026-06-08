import './TabBar.css';

export default function TabBar({ tabs, activeTab, onTabChange, scrollable = false }) {
  return (
    <div className={`tab-bar ${scrollable ? "tab-bar--scrollable hide-scrollbar" : ""}`}>
      <div className="tab-bar__track">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-bar__tab ${activeTab === tab.id ? "tab-bar__tab--active" : ""}`}
            onClick={() => onTabChange(tab.id)}
            type="button"
          >
            {tab.icon && <span className="tab-bar__tab-icon">{tab.icon}</span>}
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="tab-bar__count">{tab.count}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}