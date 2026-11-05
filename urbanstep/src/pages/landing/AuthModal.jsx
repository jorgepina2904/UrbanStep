import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Lock, Mail, Eye, EyeOff, ArrowRight, ChevronLeft, CheckCircle2, Loader2, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { authService } from '../../services/authService';
import { getDefaultRoute } from '../../utils/permissions';
import { collectErrors, validateAddress, validateDocument, validateEmail, validatePassword, validatePersonName, validatePhoneVE } from '../../utils/validators';
import { fieldError, fieldInput, fieldLabel, modalBox, modalBtnPrimary, modalClose, modalLink, modalMuted, modalOverlay, modalPanel, modalSegment, modalSegmentBtn, useEscapeKey } from './ui';

const EMPTY_REGISTER = { name: '', email: '', docType: 'V', docNumber: '', phone: '', address: '', password: '', confirmPassword: '' };

const STAFF_GREETING = {
    Admin: (u) => `Bienvenido Administrador, ${u.name}`,
    Cajero: (u) => `Terminal de Caja asignado: ${u.assignedCaja || 'Caja 1'}`,
    Supervisor: () => 'Panel de Supervisión y Auditoría',
    Motorizado: (u) => `Ruta de despachos lista, ${u.name}`
};

const registerRules = (f) => ({
    name: () => validatePersonName(f.name),
    email: () => validateEmail(f.email),
    phone: () => validatePhoneVE(f.phone),
    docNumber: () => validateDocument(f.docType, f.docNumber),
    address: () => (f.address.trim() ? validateAddress(f.address) : null),
    password: () => validatePassword(f.password),
    confirmPassword: () => (f.password !== f.confirmPassword ? 'Las contraseñas no coinciden' : null)
});

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

function Field({ id, label, error, children }) {
    return (
        <div>
            <label htmlFor={id} className={fieldLabel}>{label}</label>
            {children}
            {error && <p id={`${id}-error`} className={fieldError}>{error}</p>}
        </div>
    );
}

/**
 * Portal único de acceso (Admin, Cajero, Supervisor, Motorizado y Cliente): inicio de sesión con
 * ruteo por rol, Google, recuperación y cambio de contraseña, y registro de cliente validado.
 */
export default function AuthModal({ isOpen, initialTab = 'login', prefill = null, onClose, onAuthenticated }) {
    const { login, loginWithGoogle, requestPasswordReset, confirmPasswordReset } = useAuth();
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
    const [regErrors, setRegErrors] = useState({});
    const [reset, setReset] = useState({ password: '', confirm: '', done: false });

    // Cada apertura respeta la pestaña pedida y los datos que el cliente ya escribió (p. ej. desde el Club VIP)
    useEffect(() => {
        if (!isOpen) return;
        setTab(initialTab);
        setError('');
        setForgotSent(false);
        setRegErrors({});
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
            onAuthenticated?.(loggedUser);
            return;
        }
        toast.success((STAFF_GREETING[loggedUser.role] || ((u) => `Bienvenido, ${u.name}`))(loggedUser));
        navigate(getDefaultRoute(loggedUser.role), { replace: true });
    };

    const run = async (task) => {
        setLoading(true);
        setError('');
        try {
            await task();
        } catch (err) {
            setError(err.message || 'Ocurrió un error inesperado. Intenta nuevamente.');
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = (e) => {
        e.preventDefault();
        if (!loginEmail.trim() || !loginPassword) { setError('Por favor ingresa tu correo y contraseña'); return; }
        run(async () => {
            const res = await login(loginEmail.trim(), loginPassword);
            if (res.success) finishLogin(res.user);
            else setError(res.error || 'Credenciales inválidas');
        });
    };

    // Google redirige a su pantalla de acceso; al volver, AuthContext restaura la sesión del cliente
    const handleGoogle = () => run(async () => {
        const res = await loginWithGoogle();
        if (!res.success) setError(res.error || 'No se pudo conectar con Google');
    });

    const handleForgot = (e) => {
        e.preventDefault();
        const emailError = validateEmail(forgotEmail);
        if (emailError) { setError(emailError); return; }
        run(async () => {
            const res = await requestPasswordReset(forgotEmail.trim());
            if (res.success) { setForgotSent(true); setForgotMessage(res.message); }
            else setError(res.error || 'No se pudo procesar la recuperación de contraseña.');
        });
    };

    const handleReset = (e) => {
        e.preventDefault();
        const passError = validatePassword(reset.password);
        if (passError) { setError(passError); return; }
        if (reset.password !== reset.confirm) { setError('Las contraseñas no coinciden'); return; }
        run(async () => {
            const res = await confirmPasswordReset(null, reset.password);
            if (res.success) setReset({ password: '', confirm: '', done: true });
            else setError(res.error || 'No se pudo actualizar la contraseña.');
        });
    };

    const handleRegister = (e) => {
        e.preventDefault();
        const errors = collectErrors(registerRules(regForm));
        setRegErrors(errors);
        if (Object.keys(errors).length > 0) { setError('Revisa los campos marcados en rojo.'); return; }
        run(async () => {
            const created = await authService.registerClient(regForm);
            if (created?.needsConfirmation) {
                setForgotSent(true);
                setForgotMessage(`Te enviamos un enlace de confirmación a ${created.email}. Revisa tu correo (y la carpeta de spam) para activar tu cuenta antes de iniciar sesión.`);
                setTab('forgot');
                return;
            }
            const loginRes = await login(created.email, regForm.password);
            toast.success('¡Tu cuenta de cliente ha sido creada con éxito!', { icon: '🎉' });
            setRegForm(EMPTY_REGISTER);
            if (loginRes.success) {
                onClose();
                onAuthenticated?.(loginRes.user);
            } else {
                setLoginEmail(created.email);
                setTab('login');
            }
        });
    };

    const reg = (field) => ({
        value: regForm[field],
        'aria-invalid': Boolean(regErrors[field]),
        'aria-describedby': regErrors[field] ? `reg-${field}-error` : undefined,
        onChange: (e) => {
            setRegForm(prev => ({ ...prev, [field]: e.target.value }));
            if (regErrors[field]) setRegErrors(prev => ({ ...prev, [field]: undefined }));
        }
    });

    const titles = {
        login: ['Iniciar sesión', 'Portal de acceso único para Admin, Cajero, Supervisor, Motorizado o Cliente.'],
        register: ['Crear cuenta de cliente', 'Regístrate para comprar online, sumar puntos VIP y recibir delivery express en Lara.'],
        forgot: ['Recuperar contraseña', 'Ingresa tu correo para recibir el enlace de recuperación.'],
        reset: ['Nueva contraseña', 'Elige una contraseña nueva para tu cuenta.']
    };
    const [title, subtitle] = titles[tab] || titles.login;
    const showTabs = tab === 'login' || tab === 'register';

    return (
        <div className={modalOverlay} role="dialog" aria-modal="true" aria-labelledby="auth-title">
            <div className={`${modalPanel} w-full max-w-md p-6 relative space-y-4 my-auto us-fade-in`}>
                <button type="button" onClick={close} aria-label="Cerrar" className={`absolute top-4 right-4 ${modalClose}`}>
                    <X className="w-5 h-5" />
                </button>

                <div className="text-center space-y-1">
                    <div className="w-12 h-12 bg-blue-600 text-white dark:bg-us-cyan dark:text-black rounded-xl mx-auto flex items-center justify-center shadow-md shadow-blue-500/30 dark:shadow-cyan-500/30 mb-2">
                        {tab === 'reset' ? <KeyRound className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
                    </div>
                    <h3 id="auth-title" className="font-us-display text-lg font-black uppercase">{title}</h3>
                    <p className={`text-xs ${modalMuted}`}>{subtitle}</p>
                </div>

                {showTabs ? (
                    <div className={`grid grid-cols-2 gap-1 text-xs font-bold ${modalSegment}`} role="tablist">
                        {[['login', 'Iniciar sesión'], ['register', 'Registrarse (cliente)']].map(([id, label]) => (
                            <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => switchTab(id)}
                                className={`py-2 rounded-lg transition-all ${modalSegmentBtn(tab === id)}`}>
                                {label}
                            </button>
                        ))}
                    </div>
                ) : (
                    <button type="button" onClick={() => switchTab('login')} className={`text-xs font-bold flex items-center gap-1.5 ${modalLink}`}>
                        <ChevronLeft className="w-4 h-4" /> Volver al inicio de sesión
                    </button>
                )}

                {error && <p role="alert" className="p-3 rounded-lg text-xs border bg-red-50 border-red-200 text-red-700 dark:bg-red-950/50 dark:border-red-900 dark:text-red-300">{error}</p>}

                {showTabs && (
                    <>
                        <button type="button" onClick={handleGoogle} disabled={loading} className="w-full py-2.5 px-3 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 dark:border-white/15 rounded-lg text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-60">
                            <GoogleIcon /> {tab === 'register' ? 'Registrarme con Google' : 'Continuar con Google'}
                        </button>
                        <div className="relative flex items-center justify-center">
                            <div className="border-t border-gray-200 dark:border-white/10 w-full" />
                            <span className="bg-white dark:bg-us-panel px-2 text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500 tracking-wider absolute">O con credenciales</span>
                        </div>
                    </>
                )}

                {tab === 'login' && (
                    <form onSubmit={handleLogin} className="space-y-3 text-left text-xs" noValidate>
                        <Field id="auth-email" label="Correo electrónico o usuario">
                            <div className="relative">
                                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input id="auth-email" type="text" required autoComplete="username" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} placeholder="tu-correo@ejemplo.com" className={`${fieldInput} pl-9`} />
                            </div>
                        </Field>
                        <Field id="auth-pass" label="Contraseña">
                            <div className="relative">
                                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input id="auth-pass" type={showPassword ? 'text' : 'password'} required autoComplete="current-password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="••••••••" className={`${fieldInput} pl-9 pr-10`} />
                                <button type="button" onClick={() => setShowPassword(s => !s)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700 dark:hover:text-white">
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </Field>
                        <div className="text-right">
                            <button type="button" onClick={() => { setForgotEmail(loginEmail.includes('@') ? loginEmail : ''); switchTab('forgot'); }} className={`text-[11px] font-bold hover:underline ${modalLink}`}>¿Olvidaste tu contraseña?</button>
                        </div>
                        <button type="submit" disabled={loading} className={`w-full py-2.5 font-bold uppercase tracking-wider rounded-xl shadow-md flex items-center justify-center gap-1.5 text-xs ${modalBtnPrimary}`}>
                            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Verificando…</> : <>Acceder al sistema <ArrowRight className="w-4 h-4" /></>}
                        </button>
                    </form>
                )}

                {tab === 'forgot' && (forgotSent ? (
                    <div className="p-4 rounded-xl border text-center space-y-3 bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-300">
                        <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500" />
                        <h4 className="font-bold text-sm">Revisa tu correo</h4>
                        <p className="text-xs leading-relaxed">{forgotMessage}</p>
                        <button type="button" onClick={() => switchTab('login')} className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider">Volver a iniciar sesión</button>
                    </div>
                ) : (
                    <form onSubmit={handleForgot} className="space-y-3 text-left text-xs" noValidate>
                        <p className={`leading-relaxed ${modalMuted}`}>Te enviaremos un enlace para restablecer la contraseña al correo asociado a tu cuenta.</p>
                        <Field id="auth-forgot" label="Correo electrónico">
                            <input id="auth-forgot" type="email" required autoComplete="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} placeholder="tu-correo@ejemplo.com" className={fieldInput} />
                        </Field>
                        <button type="submit" disabled={loading} className={`w-full py-2.5 font-bold uppercase tracking-wider rounded-xl shadow-md flex items-center justify-center gap-1.5 text-xs ${modalBtnPrimary}`}>
                            {loading ? 'Enviando…' : <>Enviar enlace <ArrowRight className="w-4 h-4" /></>}
                        </button>
                    </form>
                ))}

                {tab === 'reset' && (reset.done ? (
                    <div className="p-4 rounded-xl border text-center space-y-3 bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-300">
                        <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500" />
                        <h4 className="font-bold text-sm">Contraseña actualizada</h4>
                        <button type="button" onClick={() => switchTab('login')} className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider">Iniciar sesión</button>
                    </div>
                ) : (
                    <form onSubmit={handleReset} className="space-y-3 text-left text-xs" noValidate>
                        <Field id="reset-pass" label="Nueva contraseña">
                            <input id="reset-pass" type="password" autoComplete="new-password" value={reset.password} onChange={(e) => setReset(r => ({ ...r, password: e.target.value }))} placeholder="Mínimo 8, con letras y números" className={fieldInput} />
                        </Field>
                        <Field id="reset-pass2" label="Repetir contraseña">
                            <input id="reset-pass2" type="password" autoComplete="new-password" value={reset.confirm} onChange={(e) => setReset(r => ({ ...r, confirm: e.target.value }))} placeholder="••••••••" className={fieldInput} />
                        </Field>
                        <button type="submit" disabled={loading} className={`w-full py-2.5 font-bold uppercase tracking-wider rounded-xl shadow-md text-xs ${modalBtnPrimary}`}>
                            {loading ? 'Guardando…' : 'Guardar nueva contraseña'}
                        </button>
                    </form>
                ))}

                {tab === 'register' && (
                    <form onSubmit={handleRegister} className="space-y-2.5 text-left text-xs" noValidate>
                        <Field id="reg-name" label="Nombre y apellido *" error={regErrors.name}>
                            <input id="reg-name" type="text" autoComplete="name" placeholder="Tu nombre y apellido" className={fieldInput} {...reg('name')} />
                        </Field>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <Field id="reg-email" label="Correo electrónico *" error={regErrors.email}>
                                <input id="reg-email" type="email" autoComplete="email" placeholder="cliente@ejemplo.com" className={fieldInput} {...reg('email')} />
                            </Field>
                            <Field id="reg-phone" label="Teléfono WhatsApp *" error={regErrors.phone}>
                                <input id="reg-phone" type="tel" autoComplete="tel" placeholder="0414-1234567" className={fieldInput} {...reg('phone')} />
                            </Field>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <Field id="reg-doc" label="Doc.">
                                <select id="reg-doc" className={`${fieldInput} px-2`} value={regForm.docType} onChange={(e) => setRegForm(prev => ({ ...prev, docType: e.target.value }))}>
                                    <option value="V">V-</option>
                                    <option value="E">E-</option>
                                    <option value="J">J-</option>
                                    <option value="G">G-</option>
                                    <option value="P">P-</option>
                                </select>
                            </Field>
                            <div className="col-span-2">
                                <Field id="reg-docNumber" label="Cédula / RIF *" error={regErrors.docNumber}>
                                    <input id="reg-docNumber" type="text" inputMode="numeric" placeholder="28123456" className={fieldInput} {...reg('docNumber')} />
                                </Field>
                            </div>
                        </div>
                        <Field id="reg-address" label="Dirección de entrega en Lara" error={regErrors.address}>
                            <input id="reg-address" type="text" autoComplete="street-address" placeholder="Barquisimeto / Cabudare, urb. o sector" className={fieldInput} {...reg('address')} />
                        </Field>
                        <div className="grid grid-cols-2 gap-2">
                            <Field id="reg-password" label="Contraseña *" error={regErrors.password}>
                                <input id="reg-password" type="password" autoComplete="new-password" placeholder="8+ letras y números" className={fieldInput} {...reg('password')} />
                            </Field>
                            <Field id="reg-confirmPassword" label="Repetir *" error={regErrors.confirmPassword}>
                                <input id="reg-confirmPassword" type="password" autoComplete="new-password" placeholder="••••••••" className={fieldInput} {...reg('confirmPassword')} />
                            </Field>
                        </div>
                        <p className={`p-2 rounded-lg text-[11px] ${modalBox} ${modalMuted}`}>Tu cédula identifica tu ficha de cliente y tu factura fiscal: no puede estar registrada con otro correo.</p>
                        <button type="submit" disabled={loading} className={`w-full py-2.5 font-bold uppercase tracking-wider rounded-xl shadow-md text-xs mt-1 ${modalBtnPrimary}`}>
                            {loading ? 'Creando cuenta…' : 'Crear cuenta de cliente'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
