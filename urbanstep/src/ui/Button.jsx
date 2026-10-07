import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const Button = ({ children, variant = 'primary', size = 'md', className, isLoading, icon: Icon, disabled, ...props }) => {
    const baseClass = "inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

    const variants = {
        primary: "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/25 focus:ring-blue-500",
        secondary: "bg-gray-100 hover:bg-gray-200 text-gray-900 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-100 border border-gray-200 dark:border-gray-700",
        success: "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 focus:ring-emerald-500",
        danger: "bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-500/25 focus:ring-red-500",
        ghost: "bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300",
        warning: "bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-500/25 focus:ring-amber-500"
    };

    const sizes = {
        sm: "px-3 py-1.5 text-xs",
        md: "px-4 py-2 text-sm",
        lg: "px-6 py-3 text-base"
    };

    return (
        <button className={twMerge(clsx(baseClass, variants[variant], sizes[size], className))} disabled={isLoading || disabled} {...props}>
            {isLoading ? (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            ) : Icon ? <Icon className="w-4 h-4 mr-2" /> : null}
            {children}
        </button>
    );
};

export default Button;