import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';
import toast from 'react-hot-toast';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const returningFromGoogle = new URLSearchParams(window.location.search).get('oauth') === 'google';
        const storedUser = localStorage.getItem('us_user');
        if (storedUser && !returningFromGoogle) {
            try {
                setUser(JSON.parse(storedUser));
            } catch {
                localStorage.removeItem('us_user');
            }
            setLoading(false);
            return;
        }
        // ¿Regresa de iniciar sesión con Google? Se crea o vincula su cuenta de cliente
        authService.restoreOAuthSession().then((oauthUser) => {
            if (oauthUser?.blocked) {
                toast.error(oauthUser.error);
            } else if (oauthUser) {
                setUser(oauthUser);
                toast.success(`Bienvenido, ${oauthUser.name}`);
            } else if (storedUser) {
                setUser(JSON.parse(storedUser));
            }
        }).finally(() => setLoading(false));
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

    // Redirige a Google; la sesión se restaura al volver (efecto de montaje)
    const loginWithGoogle = async () => {
        try {
            const res = await authService.loginWithGoogle();
            if (!res.success && res.error) {
                toast.error(res.error);
                return { success: false, error: res.error };
            }
            return res;
        } catch (error) {
            const errMsg = error?.message || 'Error al conectar con Google';
            toast.error(errMsg);
            return { success: false, error: errMsg };
        }
    };

    const requestPasswordReset = async (email) => {
        try {
            const res = await authService.requestPasswordReset(email);
            if (res.success) {
                toast.success(res.message, { duration: 5000 });
                return res;
            } else {
                toast.error(res.error || 'Error al procesar recuperación');
                return res;
            }
        } catch (error) {
            const errMsg = error?.message || 'Error al solicitar recuperación';
            toast.error(errMsg);
            return { success: false, error: errMsg };
        }
    };

    const confirmPasswordReset = async (email, newPassword, code) => {
        try {
            const res = await authService.confirmPasswordReset(email, newPassword, code);
            if (res.success) {
                toast.success(res.message);
                return res;
            } else {
                toast.error(res.error || 'Error al restablecer contraseña');
                return res;
            }
        } catch (error) {
            const errMsg = error?.message || 'Error al restablecer contraseña';
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
        <AuthContext.Provider value={{ 
            user, 
            setUser,
            login, 
            loginWithGoogle,
            requestPasswordReset,
            confirmPasswordReset,
            logout, 
            loading, 
            isAuthenticated 
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        return {
            user: null,
            setUser: () => {},
            login: async () => ({ success: false }),
            loginWithGoogle: async () => ({ success: false }),
            requestPasswordReset: async () => ({ success: false }),
            confirmPasswordReset: async () => ({ success: false }),
            logout: () => {},
            loading: false,
            isAuthenticated: false,
        };
    }
    return context;
};

export default AuthContext;