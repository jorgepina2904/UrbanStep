import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Lock, Mail, Eye, EyeOff, ArrowRight, ChevronLeft, CheckCircle2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { userService } from '../../services/userService';
import { customerService } from '../../services/customerService';
import { getDefaultRoute } from '../../utils/permissions';
import { fieldInput, fieldLabel, useEscapeKey } from './ui';

const EMPTY_REGISTER = { name: '', email: '', docType: 'V', docNumber: '', phone: '', address: '', password: '', confirmPassword: '' };

const STAFF_GREETING = {
    Admin: (u) => `Bienvenido Administrador, ${u.name}`,
    Cajero: (u) => `Terminal de Caja asignado: ${u.assignedCaja || 'Caja 1'}`,
    Supervisor: () => 'Panel de Supervisión y Auditoría',
    Motorizado: (u) => `Ruta de despachos lista, ${u.name}`
};

function GoogleIcon() {
    return (
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
        </svg>
    );
}

/**
 * Portal único de acceso (Admin, Cajero, Supervisor, Motorizado y Cliente): inicio de sesión con
 * ruteo por rol, Google, recuperación de contraseña y registro de cliente.
 */
export default function AuthModal({ isOpen, initialTab = 'login', prefill = null, onClose, onAuthenticated }) {
    const { login, loginWithGoogle, requestPasswordReset } = useAuth();
    const navigate = useNavigate();

    const [tab, setTab] = useState(initialTab);
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotSent, setForgotSent] = useState(false);
    const [forgotMessage, setForgotMessage] = useState('');
    const [regForm, setRegForm] = useState(EMPTY_REGISTER);

    // Cada apertura respeta la pestaña pedida y los datos que el cliente ya escribió (p. ej. desde el Club VIP)
    useEffect(() => {
        if (!isOpen) return;
        setTab(initialTab);
        setError('');
        setForgotSent(false);
        if (prefill) {
            setRegForm(prev => ({ ...prev, ...prefill }));
            if (prefill.email) setLoginEmail(prefill.email);
        }
    }, [isOpen, initialTab, prefill]);

    const close = () => { setError(''); onClose(); };
    useEscapeKey(isOpen && !loading, close);
    if (!isOpen) return null;

    const switchTab = (next) => { setTab(next); setError(''); };

    const finishLogin = (loggedUser) => {
        onClose();
        if (loggedUser.role === 'Cliente') {
            toast.success(`¡Bienvenido de nuevo, ${loggedUser.name}!`);
            onAuthenticated?.(loggedUser);
            return;
        }
        toast.success((STAFF_GREETING[loggedUser.role] || ((u) => `Bienvenido, ${u.name}`))(loggedUser));
        navigate(getDefaultRoute(loggedUser.role), { replace: true });
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!loginEmail.trim() || !loginPassword.trim()) { setError('Por favor ingresa tu correo y contraseña'); return; }
        setLoading(true);
        setError('');
        try {
            const res = await login(loginEmail.trim(), loginPassword.trim());
            if (res.success) finishLogin(res.user);
            else setError(res.error || 'Credenciales inválidas');
        } catch (err) {
            setError(err.message || 'Error de conexión con el sistema');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogle = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await loginWithGoogle();
            if (res.success) onClose();
            else if (res.error) setError(res.error);
        } catch (err) {
            setError(err.message || 'Error al conectar con Google');
        } finally {
            setLoading(false);
        }
    };

    const handleForgot = async (e) => {
        e.preventDefault();
        if (!forgotEmail.trim()) { setError('Por favor ingresa tu correo electrónico.'); return; }
        setLoading(true);
        setError('');
        try {
            const res = await requestPasswordReset(forgotEmail.trim());
            if (res.success) { setForgotSent(true); setForgotMessage(res.message); }
            else setError(res.error || 'No se pudo procesar la recuperación de contraseña.');
        } catch (err) {
            setError(err.message || 'Error al procesar recuperación de contraseña');
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        if (!regForm.name.trim() || !regForm.email.trim() || !regForm.password.trim()) { setError('Por favor completa todos los campos requeridos'); return; }
        if (regForm.password !== regForm.confirmPassword) { setError('Las contraseñas no coinciden'); return; }
        if (regForm.password.length < 4) { setError('La contraseña debe tener al menos 4 caracteres'); return; }
        setLoading(true);
        setError('');
        try {
            await userService.create({
                name: regForm.name.trim(),
                email: regForm.email.trim(),
                password: regForm.password.trim(),
                role: 'Cliente',
                assignedCaja: 'Tienda Online',
                branch: 'Ecommerce Online'
            });

            const nameParts = regForm.name.trim().split(' ');
            await customerService.create({
                firstName: nameParts[0] || 'Cliente',
                lastName: nameParts.slice(1).join(' ') || 'Online',
                docType: regForm.docType,
                docNumber: regForm.docNumber ? `${regForm.docType}-${regForm.docNumber.trim()}` : `V-${Date.now().toString().slice(-8)}`,
                email: regForm.email.trim(),
                phone: regForm.phone.trim() || '0414-0000000',
                state: 'Lara',
                city: 'Barquisimeto',
                address: regForm.address.trim() || 'Barquisimeto, Estado Lara'
            });

            const loginRes = await login(regForm.email.trim(), regForm.password.trim());
            if (loginRes.success) {
                toast.success('¡Tu cuenta de cliente ha sido creada con éxito!', { icon: '🎉' });
                setRegForm(EMPTY_REGISTER);
                onClose();
                onAuthenticated?.(loginRes.user);
            } else {
                toast.success('Cuenta creada. Ya puedes iniciar sesión.');
                setLoginEmail(regForm.email);
                setTab('login');
            }
        } catch (err) {
            setError(err.message || 'Error al crear cuenta de cliente');
        } finally {
            setLoading(false);
        }
    };

    const reg = (field) => ({ value: regForm[field], onChange: (e) => setRegForm(prev => ({ ...prev, [field]: e.target.value })) });
    const title = tab === 'login' ? 'Iniciar sesión' : tab === 'register' ? 'Crear cuenta de cliente' : 'Recuperar contraseña';
    const subtitle = tab === 'login'
        ? 'Portal de acceso único para Admin, Cajero, Supervisor, Motorizado o Cliente.'
        : tab === 'register' ? 'Regístrate para comprar online, sumar puntos VIP y recibir delivery express en Lara.'
            : 'Ingresa tu correo para recibir las instrucciones de recuperación.';

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="auth-title">
            <div className="bg-white text-gray-900 rounded-2xl w-full max-w-md p-6 shadow-2xl relative space-y-4 my-auto us-fade-in">
                <button type="button" onClick={close} aria-label="Cerrar" className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors">
                    <X className="w-5 h-5" />
                </button>

                <div className="text-center space-y-1">
                    <div className="w-12 h-12 bg-blue-600 text-white rounded-xl mx-auto flex items-center justify-center shadow-md shadow-blue-500/30 mb-2">
                        <Lock className="w-6 h-6" />
                    </div>
                    <h3 id="auth-title" className="font-us-display text-lg font-black uppercase">{title}</h3>
                    <p className="text-xs text-gray-500">{subtitle}</p>
                </div>

                {tab !== 'forgot' ? (
                    <div className="grid grid-cols-2 gap-1 bg-gray-100 p-1 rounded-xl text-xs font-bold" role="tablist">
                        {[['login', 'Iniciar sesión'], ['register', 'Registrarse (cliente)']].map(([id, label]) => (
                            <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => switchTab(id)}
                                className={`py-2 rounded-lg transition-all ${tab === id ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:text-gray-900'}`}>
                                {label}
                            </button>
                        ))}
                    </div>
                ) : (
                    <button type="button" onClick={() => switchTab('login')} className="text-xs font-bold flex items-center gap-1.5 text-blue-600 hover:text-blue-700">
                        <ChevronLeft className="w-4 h-4" /> Volver al inicio de sesión
                    </button>
                )}

                {error && <p role="alert" className="p-3 rounded-lg text-xs border bg-red-50 border-red-200 text-red-700">{error}</p>}

                {tab !== 'forgot' && (
                    <>
                        <button type="button" onClick={handleGoogle} disabled={loading} className="w-full py-2.5 px-3 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-60">
                            <GoogleIcon /> Continuar con Google
                        </button>
                        <div className="relative flex items-center justify-center">
                            <div className="border-t border-gray-200 w-full" />
                            <span className="bg-white px-2 text-[10px] font-bold uppercase text-gray-400 tracking-wider absolute">O con credenciales</span>
                        </div>
                    </>
                )}

                {tab === 'login' && (
                    <form onSubmit={handleLogin} className="space-y-3 text-left text-xs">
                        <div>
                            <label htmlFor="auth-email" className={fieldLabel}>Correo electrónico o usuario</label>
                            <div className="relative">
                                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input id="auth-email" type="text" required autoComplete="username" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} placeholder="tu-correo@ejemplo.com" className={`${fieldInput} pl-9`} />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="auth-pass" className={fieldLabel}>Contraseña</label>
                            <div className="relative">
                                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input id="auth-pass" type={showPassword ? 'text' : 'password'} required autoComplete="current-password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="••••••••" className={`${fieldInput} pl-9 pr-10`} />
                                <button type="button" onClick={() => setShowPassword(s => !s)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700">
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                        <div className="text-right">
                            <button type="button" onClick={() => { setForgotEmail(loginEmail); switchTab('forgot'); }} className="text-[11px] font-bold text-blue-600 hover:underline">¿Olvidaste tu contraseña?</button>
                        </div>
                        <button type="submit" disabled={loading} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold uppercase tracking-wider rounded-xl shadow-md flex items-center justify-center gap-1.5 text-xs">
                            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Verificando…</> : <>Acceder al sistema <ArrowRight className="w-4 h-4" /></>}
                        </button>
                    </form>
                )}

                {tab === 'forgot' && (forgotSent ? (
                    <div className="p-4 rounded-xl border text-center space-y-3 bg-emerald-50 border-emerald-200 text-emerald-800">
                        <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500" />
                        <h4 className="font-bold text-sm">Instrucciones enviadas</h4>
                        <p className="text-xs leading-relaxed">{forgotMessage}</p>
                        <button type="button" onClick={() => switchTab('login')} className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider">Volver a iniciar sesión</button>
                    </div>
                ) : (
                    <form onSubmit={handleForgot} className="space-y-3 text-left text-xs">
                        <p className="text-gray-600 leading-relaxed">Te enviaremos un enlace de restablecimiento al correo asociado a tu cuenta.</p>
                        <div>
                            <label htmlFor="auth-forgot" className={fieldLabel}>Correo electrónico</label>
                            <input id="auth-forgot" type="email" required autoComplete="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} placeholder="tu-correo@ejemplo.com" className={fieldInput} />
                        </div>
                        <button type="submit" disabled={loading} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold uppercase tracking-wider rounded-xl shadow-md flex items-center justify-center gap-1.5 text-xs">
                            {loading ? 'Enviando…' : <>Enviar instrucciones <ArrowRight className="w-4 h-4" /></>}
                        </button>
                    </form>
                ))}

                {tab === 'register' && (
                    <form onSubmit={handleRegister} className="space-y-2.5 text-left text-xs">
                        <div>
                            <label htmlFor="reg-name" className={fieldLabel}>Nombre completo *</label>
                            <input id="reg-name" type="text" required autoComplete="name" placeholder="Tu nombre y apellido" className={fieldInput} {...reg('name')} />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                                <label htmlFor="reg-email" className={fieldLabel}>Correo electrónico *</label>
                                <input id="reg-email" type="email" required autoComplete="email" placeholder="cliente@ejemplo.com" className={fieldInput} {...reg('email')} />
                            </div>
                            <div>
                                <label htmlFor="reg-phone" className={fieldLabel}>Teléfono WhatsApp *</label>
                                <input id="reg-phone" type="tel" required autoComplete="tel" placeholder="0414-1234567" className={fieldInput} {...reg('phone')} />
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <div>
                                <label htmlFor="reg-doc" className={fieldLabel}>Doc.</label>
                                <select id="reg-doc" className={`${fieldInput} px-2`} {...reg('docType')}>
                                    <option value="V">V-</option>
                                    <option value="E">E-</option>
                                    <option value="J">J-</option>
                                </select>
                            </div>
                            <div className="col-span-2">
                                <label htmlFor="reg-docnum" className={fieldLabel}>Cédula / RIF</label>
                                <input id="reg-docnum" type="text" inputMode="numeric" placeholder="28123456" className={fieldInput} {...reg('docNumber')} />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="reg-address" className={fieldLabel}>Dirección de entrega en Lara</label>
                            <input id="reg-address" type="text" autoComplete="street-address" placeholder="Barquisimeto / Cabudare, Urb. o sector" className={fieldInput} {...reg('address')} />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label htmlFor="reg-pass" className={fieldLabel}>Contraseña *</label>
                                <input id="reg-pass" type="password" required autoComplete="new-password" placeholder="••••••••" className={fieldInput} {...reg('password')} />
                            </div>
                            <div>
                                <label htmlFor="reg-pass2" className={fieldLabel}>Repetir *</label>
                                <input id="reg-pass2" type="password" required autoComplete="new-password" placeholder="••••••••" className={fieldInput} {...reg('confirmPassword')} />
                            </div>
                        </div>
                        <button type="submit" disabled={loading} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold uppercase tracking-wider rounded-xl shadow-md text-xs mt-1">
                            {loading ? 'Creando cuenta…' : 'Crear cuenta de cliente'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
