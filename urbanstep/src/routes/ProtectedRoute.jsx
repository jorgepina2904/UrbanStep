import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { hasPermission, getDefaultRoute } from '../utils/permissions';
import { Spinner } from '../ui/Spinner';

export const ProtectedRoute = ({ children, module }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) return <div className="h-screen w-full flex items-center justify-center"><Spinner size="lg" /></div>;
  if (!user) return <Navigate to="/landing?login=true" replace />;
  if (module && !hasPermission(user.role, module)) return <Navigate to={getDefaultRoute(user.role)} replace />;

  return children;
};

export default ProtectedRoute;