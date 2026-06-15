import { FiTrendingUp, FiTrendingDown, FiMinus } from "react-icons/fi";

const THEMES = {
  blue:   { iconBg: "var(--ad-blue-soft)",    iconColor: "var(--ad-blue)",    valColor: "#1e3c72",  cls: "ad-stat--blue"   },
  indigo: { iconBg: "var(--ad-indigo-soft)",  iconColor: "var(--ad-indigo)",  valColor: "#4f46e5",  cls: "ad-stat--blue"   },
  green:  { iconBg: "var(--ad-green-soft)",   iconColor: "var(--ad-green)",   valColor: "#065f46",  cls: "ad-stat--green"  },
  amber:  { iconBg: "var(--ad-amber-soft)",   iconColor: "var(--ad-amber)",   valColor: "#92400e",  cls: "ad-stat--amber"  },
  red:    { iconBg: "var(--ad-red-soft)",     iconColor: "var(--ad-red)",     valColor: "#991b1b",  cls: "ad-stat--red"    },
  purple: { iconBg: "var(--ad-purple-soft)",  iconColor: "var(--ad-purple)",  valColor: "#5b21b6",  cls: "ad-stat--purple" },
  teal:   { iconBg: "var(--ad-teal-soft)",    iconColor: "var(--ad-teal)",    valColor: "#134e4a",  cls: "ad-stat--teal"   },
  pink:   { iconBg: "var(--ad-pink-soft)",    iconColor: "var(--ad-pink)",    valColor: "#9d174d",  cls: "ad-stat--pink"   },
  sky:    { iconBg: "var(--ad-sky-soft)",     iconColor: "var(--ad-sky)",     valColor: "#0c4a6e",  cls: "ad-stat--sky"    },
  orange: { iconBg: "var(--ad-orange-soft)",  iconColor: "var(--ad-orange)",  valColor: "#9a3412",  cls: "ad-stat--amber"  },
};

export default function AdminStatCard({
  icon: Icon,
  label,
  value,
  sub,
  trend,
  trendDir,
  theme = "indigo",
  onClick,
}) {
  const t = THEMES[theme] || THEMES.indigo;

  const TrendIcon =
    trendDir === "up" ? FiTrendingUp :
    trendDir === "down" ? FiTrendingDown : FiMinus;

  const trendColor =
    trendDir === "up"   ? "var(--ad-green)" :
    trendDir === "down" ? "var(--ad-red)"   : "var(--ad-text-sec)";

  return (
    <div
      className={`ad-stat ${t.cls}`}
      onClick={onClick}
      style={{ cursor: onClick ? "pointer" : "default" }}
    >
      <div className="ad-stat__icon-wrap" style={{ background: t.iconBg }}>
        <Icon size={20} color={t.iconColor} />
      </div>
      <div className="ad-stat__value" style={{ color: t.valColor }}>
        {value ?? "—"}
      </div>
      <div className="ad-stat__label">{label}</div>
      {(sub || trend) && (
        <div className="ad-stat__trend" style={{ color: trendColor }}>
          {trend && <TrendIcon size={12} />}
          <span>{trend || sub}</span>
        </div>
      )}
    </div>
  );
}