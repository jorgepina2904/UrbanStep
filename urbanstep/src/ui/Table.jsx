import React from 'react';
import { Spinner } from './Spinner';

export const Table = ({ columns, data, loading, emptyMessage = "No hay datos disponibles" }) => {
    if (loading) return <div className="p-8"><Spinner /></div>;
    if (!data || data.length === 0) return <div className="p-8 text-center text-gray-500">{emptyMessage}</div>;

    return (
        <div className="overflow-x-auto w-full">
            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-800 dark:text-gray-400 border-b dark:border-gray-700">
                    <tr>
                        {columns.map((col, i) => (
                            <th key={i} scope="col" className="px-6 py-3">{col.header}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.map((row, i) => (
                        <tr key={i} className="bg-white border-b dark:bg-gray-900 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                            {columns.map((col, j) => (
                                <td key={j} className="px-6 py-4">
                                    {col.cell ? col.cell(row) : row[col.accessor]}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default Table;