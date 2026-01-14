import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'orange';
  onClick?: () => void;
  change?: string;
  clickable?: boolean;
}

export default function StatsCard({ title, value, icon: Icon, trend, color = 'blue', onClick, change, clickable }: StatsCardProps) {

  // Updated Colors for White Theme (Lighter backgrounds, darker text)
  const colorStyles = {
    blue: { icon: 'text-blue-600', bg: 'bg-blue-50', hover: 'group-hover:bg-blue-100', border: 'hover:border-blue-300' },
    green: { icon: 'text-emerald-600', bg: 'bg-emerald-50', hover: 'group-hover:bg-emerald-100', border: 'hover:border-emerald-300' },
    yellow: { icon: 'text-amber-600', bg: 'bg-amber-50', hover: 'group-hover:bg-amber-100', border: 'hover:border-amber-300' }, // Use Amber for better visibility on white
    red: { icon: 'text-red-600', bg: 'bg-red-50', hover: 'group-hover:bg-red-100', border: 'hover:border-red-300' },
    purple: { icon: 'text-purple-600', bg: 'bg-purple-50', hover: 'group-hover:bg-purple-100', border: 'hover:border-purple-300' },
    orange: { icon: 'text-orange-600', bg: 'bg-orange-50', hover: 'group-hover:bg-orange-100', border: 'hover:border-orange-300' },
  };

  const style = colorStyles[color] || colorStyles.blue;

  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 p-5 shadow-sm transition-all duration-200 group ${style.border
        } ${clickable ? 'cursor-pointer hover:shadow-md transform hover:-translate-y-0.5' : ''}`}
      onClick={clickable ? onClick : undefined}
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">{title}</p>
          <h3 className="text-2xl font-bold text-slate-800 mt-1">{value}</h3>

          {trend && (
            <div className={`flex items-center text-xs font-bold mt-2 ${trend.isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
              {trend.isPositive ? '+' : ''}{trend.value}
              <span className="ml-1 text-slate-400 font-normal">vs mês anterior</span>
            </div>
          )}

          {change && (
            <p className="text-sm text-slate-500 mt-1">{change}</p>
          )}
        </div>

        <div className={`p-2.5 rounded-lg transition-colors ${style.bg} ${style.hover}`}>
          <Icon className={`w-5 h-5 ${style.icon}`} />
        </div>
      </div>
    </div>
  );
}
