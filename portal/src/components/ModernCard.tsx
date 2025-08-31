import React from 'react';

interface ModernCardProps {
  children: React.ReactNode;
  className?: string;
  gradient?: boolean;
  hover?: boolean;
  padding?: 'sm' | 'md' | 'lg';
}

export const ModernCard: React.FC<ModernCardProps> = ({
  children,
  className = '',
  gradient = false,
  hover = true,
  padding = 'md'
}) => {
  const paddingClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };

  const baseClasses = `
    bg-white/80 backdrop-blur-lg border border-white/20 rounded-xl shadow-lg
    ${hover ? 'hover:shadow-xl hover:-translate-y-1 transition-all duration-300' : ''}
    ${gradient ? 'bg-gradient-to-br from-white via-blue-50/30 to-indigo-100/30' : ''}
    ${paddingClasses[padding]}
    ${className}
  `;

  return (
    <div className={baseClasses}>
      {children}
    </div>
  );
};

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red';
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  color = 'blue'
}) => {
  const colorClasses = {
    blue: 'from-blue-500 to-cyan-500',
    green: 'from-green-500 to-emerald-500',
    purple: 'from-purple-500 to-violet-500',
    orange: 'from-orange-500 to-amber-500',
    red: 'from-red-500 to-pink-500'
  };

  return (
    <ModernCard className="relative overflow-hidden">
      <div className={`absolute inset-0 bg-gradient-to-r ${colorClasses[color]} opacity-5`} />
      <div className="relative">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-600">{title}</h3>
          {icon && (
            <div className={`p-2 rounded-lg bg-gradient-to-r ${colorClasses[color]} text-white`}>
              {icon}
            </div>
          )}
        </div>
        
        <div className="flex items-end justify-between">
          <div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
          </div>
          
          {trend && (
            <div className={`flex items-center space-x-1 text-sm font-medium ${
              trend.isPositive ? 'text-green-600' : 'text-red-600'
            }`}>
              <span>{trend.isPositive ? '↗' : '↘'}</span>
              <span>{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>
      </div>
    </ModernCard>
  );
};

export default ModernCard;
