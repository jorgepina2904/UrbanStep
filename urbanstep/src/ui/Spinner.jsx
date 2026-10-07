import React from 'react';

export const Spinner = ({ size = 'md', className = '' }) => {
    const sizeClasses = { sm: 'h-4 w-4 border-2', md: 'h-8 w-8 border-3', lg: 'h-12 w-12 border-4' };
    return (
        <div className={`flex justify-center items-center ${className}`}>
            <div className={`animate-spin rounded-full border-t-blue-600 border-r-blue-600 border-b-transparent border-l-transparent ${sizeClasses[size]}`}></div>
        </div>
    );
};

export default Spinner;