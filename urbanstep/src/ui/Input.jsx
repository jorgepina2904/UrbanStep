import React, { forwardRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const Input = forwardRef(({ label, error, className, icon: Icon, ...props }, ref) => {
    return (
        <div className={twMerge(clsx("w-full", className))}>
            {label && <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>}
            <div className="relative">
                {Icon && <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"><Icon className="h-5 w-5" /></div>}
                <input
                    ref={ref}
                    className={twMerge(clsx(
                        "block w-full rounded-xl border-gray-300 dark:border-gray-700 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 text-sm dark:bg-gray-800 dark:text-white transition-colors duration-200 py-2.5 px-3",
                        Icon && "pl-10",
                        error && "border-red-500 focus:border-red-500 focus:ring-red-500"
                    ))}
                    {...props}
                />
            </div>
            {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
        </div>
    );
});

export default Input;