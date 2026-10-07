import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * Unified Login Redirect
 * As per architecture requirements, the entire authentication flow (Admin, Cajero, Supervisor, Cliente)
 * is now unified directly within the modernized Ecommerce Storefront (/landing?login=true).
 */
export default function Login() {
    return <Navigate to="/landing?login=true" replace />;
}
