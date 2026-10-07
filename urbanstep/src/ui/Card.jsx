import React from 'react';

export function Card({ children, className = '', padding = true, hover = false, ...props }) {
  return (
    <div
      className={`
        bg-white dark:bg-gray-800/80 backdrop-blur-sm
        rounded-2xl border border-gray-200 dark:border-gray-700/60
        ${padding ? 'p-6' : ''}
        ${hover ? 'hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-300 hover:-translate-y-0.5' : ''}
        shadow-sm
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }) {
  return (
    <div className={`flex items-center justify-between mb-4 ${className}`}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '' }) {
  return (
    <h3 className={`text-lg font-semibold text-gray-900 dark:text-white ${className}`}>
      {children}
    </h3>
  );
}

export default Card;
