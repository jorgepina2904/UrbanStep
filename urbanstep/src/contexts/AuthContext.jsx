import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';
import toast from 'react-hot-toast';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedUser = localStorage.getItem('us_user');
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch {
                localStorage.removeItem('us_user');
            }
        }
        setLoading(false);
    }, []);

    const login = async (username, password) => {
        try {
            const data = await authService.login(username, password);
            if (data && data.user) {
                setUser(data.user);
                localStorage.setItem('us_user', JSON.stringify(data.user));
                toast.success(`Bienvenido, ${data.user.name}`);
                return { success: true, user: data.user };
            }
            const err = data?.error || 'Usuario o contraseña incorrectos';
            toast.error(err);
            return { success: false, error: err };
        } catch (error) {
            const errMsg = error?.message || 'Error de autenticación';
            toast.error(errMsg);
            return { success: false, error: errMsg };
        }
    };

    const logout = () => {
        setUser(null);
        authService.logout();
        toast.success("Sesión cerrada correctamente");
    };

    const isAuthenticated = !!user;

    return (
        <AuthContext.Provider value={{ user, login, logout, loading, isAuthenticated }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        return {
            user: null,
            login: async () => ({ success: false }),
            logout: () => {},
            loading: false,
            isAuthenticated: false,
        };
    }
    return context;
};

export default AuthContext;