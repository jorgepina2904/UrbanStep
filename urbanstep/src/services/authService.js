import { userService } from './userService';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { cashRegisterService } from './cashRegisterService';
import { customerService } from './customerService';
import {
  isPlaceholder, normalizeDocument, normalizeEmail, validateAddress, validateDocument, validateEmail,
  validatePassword, validatePersonName, validatePhoneVE
} from '../utils/validators';

const USER_KEY = 'us_user';
const TOKEN_KEY = 'us_token';
const REMEMBER_KEY = 'urbanstep_remembered_user';

const INVALID_CREDENTIALS = 'Credenciales inválidas. Verifica tu correo/usuario y contraseña.';
const INACTIVE_USER = 'Tu usuario está desactivado. Contacta al administrador.';

const siteOrigin = () => (typeof window !== 'undefined' ? window.location.origin : '');

const persistSession = (user, token) => {
  const { password: _password, ...safeUser } = user;
  localStorage.setItem(USER_KEY, JSON.stringify(safeUser));
  localStorage.setItem(TOKEN_KEY, token || `session-${Date.now()}`);
  return safeUser;
};

/** "cajero1" → "cajero1@urbanstep.com" solo si la parte local del correo identifica a un único usuario. */
const resolveIdentifier = (identifier) => {
  if (identifier.includes('@')) return identifier;
  const matches = userService.getAll().filter(u => normalizeEmail(u.email).split('@')[0] === identifier);
  return matches.length === 1 ? normalizeEmail(matches[0].email) : null;
};

const isMissingFunction = (error) => error?.code === 'PGRST202' || /login_usuario/i.test(error?.message || '');

/**
 * Verifica credenciales contra Supabase. Orden:
 * 1) login_usuario(): bcrypt en el servidor (requiere seguridad_usuarios_validaciones.sql).
 * 2) Compatibilidad temporal mientras la migración no se ejecute: compara la contraseña de ese único usuario.
 * 3) Supabase Auth (cuentas creadas en auth.users). El rol SIEMPRE sale de la tabla `usuarios`, nunca de
 *    user_metadata, que el propio usuario puede editar.
 * @returns {{status:'ok'|'invalid'|'inactive'|'unavailable', user?:object, token?:string}}
 */
const verifyInCloud = async (email, password) => {
  const { data: rows, error } = await supabase.rpc('login_usuario', { p_correo: email, p_password: password });
  if (!error && Array.isArray(rows) && rows[0]) {
    const user = userService.fromDbRow(rows[0]);
    return user.active ? { status: 'ok', user } : { status: 'inactive' };
  }

  if (error && isMissingFunction(error)) {
    const { data: legacy, error: legacyError } = await supabase
      .from('usuarios')
      .select(`${userService.publicColumns}, password_hash`)
      .eq('correo', email)
      .maybeSingle();
    if (legacyError) return { status: 'unavailable' };
    // Una contraseña ya cifrada sin la función de verificación no puede compararse en el navegador
    if (legacy?.password_hash && !legacy.password_hash.startsWith('$2') && legacy.password_hash === password) {
      const user = userService.fromDbRow(legacy);
      return user.active ? { status: 'ok', user } : { status: 'inactive' };
    }
  } else if (error) {
    return { status: 'unavailable' };
  }

  try {
    const { data: auth, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (!authError && auth?.user) {
      const account = await userService.findInCloudByEmail(email);
      if (account && !account.active) {
        await supabase.auth.signOut();
        return { status: 'inactive' };
      }
      const user = account || {
        id: auth.user.id,
        name: auth.user.user_metadata?.full_name || email.split('@')[0],
        email,
        role: 'Cliente',
        branch: 'Ecommerce Online',
        active: true
      };
      return { status: 'ok', user, token: auth.session?.access_token };
    }
  } catch (err) {
    console.warn('Supabase Auth no disponible:', err);
  }
  return { status: 'invalid' };
};

export const authService = {
  /**
   * Autenticación por correo (o alias único) y contraseña para todos los roles.
   * Con Supabase configurado solo se aceptan usuarios verificados por la base de datos; los usuarios de
   * demostración (mockUsers) únicamente sirven sin nube o mientras la tabla `usuarios` está vacía.
   */
  async login(usernameInput, passwordInput) {
    const identifier = normalizeEmail(usernameInput);
    const password = String(passwordInput || '');
    if (!identifier || !password) {
      return { success: false, error: 'Por favor completa todos los campos' };
    }

    const email = resolveIdentifier(identifier);
    if (!email) return { success: false, error: INVALID_CREDENTIALS };

    if (isSupabaseConfigured() && supabase) {
      const result = await verifyInCloud(email, password);
      if (result.status === 'ok') return { success: true, user: persistSession(result.user, result.token) };
      if (result.status === 'inactive') return { success: false, error: INACTIVE_USER };
      // Los usuarios de demostración solo valen si la tabla `usuarios` está confirmada vacía
      if (!(await userService.isCloudEmpty())) {
        return { success: false, error: result.status === 'invalid' ? INVALID_CREDENTIALS : 'No se pudo verificar tu acceso. Revisa tu conexión e intenta de nuevo.' };
      }
    }

    // Sin nube (o instalación nueva sin usuarios): cada usuario entra solo con SU contraseña
    const user = userService.getAll().find(u => normalizeEmail(u.email) === email && u.password && u.password === password);
    if (!user) return { success: false, error: INVALID_CREDENTIALS };
    if (!user.active) return { success: false, error: INACTIVE_USER };
    return { success: true, user: persistSession(user) };
  },

  /**
   * Registro de cliente desde la tienda. Aplica la regla única de identidad:
   * un correo = una cuenta web, y una cédula/RIF = una ficha de cliente (se vincula si ya compró en tienda).
   */
  async registerClient(form) {
    const checks = [
      validatePersonName(form.name),
      validateEmail(form.email),
      validatePhoneVE(form.phone),
      validateDocument(form.docType, form.docNumber),
      form.address?.trim() ? validateAddress(form.address) : null,
      validatePassword(form.password),
      form.password !== form.confirmPassword ? 'Las contraseñas no coinciden' : null
    ].filter(Boolean);
    if (checks.length > 0) throw new Error(checks[0]);

    const email = normalizeEmail(form.email);
    const name = form.name.trim().replace(/\s+/g, ' ');
    const docType = String(form.docType || 'V').toUpperCase();
    const docNumber = normalizeDocument(docType, form.docNumber);

    if (userService.getByEmail(email) || await userService.findInCloudByEmail(email)) {
      throw new Error('Ya existe una cuenta con ese correo. Inicia sesión o recupera tu contraseña.');
    }
    const byDoc = await customerService.findByDocument(docType, docNumber);
    if (byDoc && !isPlaceholder(byDoc.email) && normalizeEmail(byDoc.email) !== email) {
      throw new Error('Esa cédula/RIF ya está registrada con otro correo. Si es tuya, escríbenos para vincularla.');
    }
    const byEmail = await customerService.findByEmail(email);
    if (byEmail && normalizeDocument(byEmail.docType, byEmail.docNumber) !== docNumber) {
      throw new Error('Ese correo ya está asociado a otra cédula/RIF.');
    }

    // Ficha de cliente primero: si ya compró en la tienda física se vincula en lugar de duplicarla
    const [firstName, ...rest] = name.split(' ');
    const existing = byDoc || byEmail;
    if (existing) {
      await customerService.update(existing.id, { email, phone: form.phone, address: form.address?.trim() || existing.address });
    } else {
      await customerService.create({
        firstName,
        lastName: rest.join(' '),
        docType,
        docNumber,
        email,
        phone: form.phone,
        state: 'Lara',
        city: 'Barquisimeto',
        address: form.address?.trim() || 'Barquisimeto, Estado Lara'
      });
    }

    return userService.create({
      name,
      email,
      password: form.password,
      role: 'Cliente',
      phone: form.phone,
      assignedCaja: 'Tienda Online',
      branch: 'Ecommerce Online'
    });
  },

  /**
   * Validar credenciales (PIN) para apertura de caja registradora
   */
  async validateCajaCredentials(cajaId, pin) {
    return cashRegisterService.validatePin(cajaId, pin);
  },

  /**
   * Obtener lista de cajas disponibles
   */
  getCashRegisters() {
    return cashRegisterService.getActive();
  },

  /**
   * Inicia el acceso con Google (OAuth de Supabase). El navegador sale hacia Google y, al volver,
   * restoreOAuthSession() crea o vincula la cuenta del cliente. No existe un modo de demostración:
   * sin Google configurado en Supabase el acceso se rechaza.
   */
  async loginWithGoogle() {
    if (!isSupabaseConfigured() || !supabase) {
      return { success: false, error: 'El acceso con Google requiere conectar la tienda a Supabase.' };
    }
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${siteOrigin()}/landing?oauth=google`,
          queryParams: { prompt: 'select_account' }
        }
      });
      if (error) {
        if (/not enabled|unsupported provider/i.test(error.message || '')) {
          return { success: false, error: 'El acceso con Google aún no está activado en Supabase (Authentication > Providers > Google).' };
        }
        return { success: false, error: error.message };
      }
      return { success: true, redirecting: true };
    } catch (err) {
      return { success: false, error: err.message || 'Error al iniciar sesión con Google' };
    }
  },

  /**
   * Envía el enlace de recuperación (Supabase Auth). La respuesta es la misma exista o no el correo,
   * para no revelar qué cuentas están registradas.
   */
  async requestPasswordReset(emailInput) {
    const emailError = validateEmail(emailInput);
    if (emailError) return { success: false, error: emailError };
    if (!isSupabaseConfigured() || !supabase) {
      return { success: false, error: 'La recuperación por correo requiere la conexión con Supabase. Pide al administrador que restablezca tu contraseña.' };
    }
    const { error } = await supabase.auth.resetPasswordForEmail(normalizeEmail(emailInput), {
      redirectTo: `${siteOrigin()}/landing?reset_password=true`
    });
    if (error && /rate limit|too many/i.test(error.message || '')) {
      return { success: false, error: 'Ya enviamos un enlace hace poco. Espera unos minutos antes de pedir otro.' };
    }
    return {
      success: true,
      message: 'Si el correo está registrado recibirás un enlace para crear una contraseña nueva (revisa también spam). Si tu cuenta la creó la tienda, el administrador puede asignarte una nueva en Configuración > Usuarios.'
    };
  },

  /**
   * Guarda la contraseña nueva. Solo funciona con la sesión de recuperación que abre el enlace del
   * correo: sin ella no se puede cambiar la contraseña de nadie.
   */
  async confirmPasswordReset(_emailInput, newPassword) {
    const passwordError = validatePassword(newPassword);
    if (passwordError) return { success: false, error: passwordError };
    if (!isSupabaseConfigured() || !supabase) {
      return { success: false, error: 'El cambio de contraseña por enlace requiere la conexión con Supabase.' };
    }
    const { data } = await supabase.auth.getSession();
    const sessionUser = data?.session?.user;
    if (!sessionUser) {
      return { success: false, error: 'El enlace de recuperación expiró o no es válido. Solicita uno nuevo.' };
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { success: false, error: error.message };

    // Mantiene sincronizada la cuenta de la tabla `usuarios` con el mismo correo
    const account = await userService.findInCloudByEmail(sessionUser.email);
    if (account) await userService.update(account.id, { password: newPassword }).catch(() => {});
    await supabase.auth.signOut();
    return { success: true, message: 'Tu contraseña fue actualizada. Ya puedes iniciar sesión.' };
  },

  /**
   * Al volver de Google convierte la sesión de Supabase en un cliente de la tienda:
   * crea (una sola vez) su cuenta en `usuarios` para que aparezca en Configuración y revisa si ya
   * tiene ficha de cliente; si no, `profileComplete` queda en false para pedirle cédula y teléfono.
   * SIEMPRE rol Cliente: el rol nunca se toma de user_metadata (editable por el propio usuario).
   */
  async restoreOAuthSession() {
    if (!isSupabaseConfigured() || !supabase) return null;
    try {
      const { data } = await supabase.auth.getSession();
      const authUser = data?.session?.user;
      if (!authUser || authUser.app_metadata?.provider !== 'google') return null;

      const email = normalizeEmail(authUser.email);
      const name = authUser.user_metadata?.full_name || authUser.user_metadata?.name || email.split('@')[0];

      let account = null;
      try {
        account = await userService.ensureClientAccount({ name, email });
      } catch (e) {
        console.warn('No se pudo registrar la cuenta Google en usuarios:', e);
      }
      if (account && account.active === false) {
        await supabase.auth.signOut();
        return { blocked: true, error: INACTIVE_USER };
      }

      const customer = await customerService.findByEmail(email).catch(() => null);
      const clientUser = {
        id: account?.role === 'Cliente' ? account.id : authUser.id,
        name: account?.role === 'Cliente' ? account.name : name,
        email,
        phone: customer?.phone || '',
        role: 'Cliente',
        branch: 'Ecommerce Online',
        active: true,
        provider: 'google',
        profileComplete: Boolean(customer)
      };
      return persistSession(clientUser, data.session.access_token);
    } catch (e) {
      console.warn('No se pudo restaurar la sesión OAuth:', e);
      return null;
    }
  },

  /**
   * Completa el registro de quien entró con Google: crea su ficha de cliente (cédula, teléfono y
   * dirección) con las mismas validaciones y la regla de identidad única.
   */
  async completeGoogleProfile(user, form) {
    const checks = [
      validatePersonName(form.name),
      validatePhoneVE(form.phone),
      validateDocument(form.docType, form.docNumber),
      validateAddress(form.address)
    ].filter(Boolean);
    if (checks.length > 0) throw new Error(checks[0]);

    const email = normalizeEmail(user.email);
    const docType = String(form.docType || 'V').toUpperCase();
    const docNumber = normalizeDocument(docType, form.docNumber);
    const byDoc = await customerService.findByDocument(docType, docNumber);
    if (byDoc && !isPlaceholder(byDoc.email) && normalizeEmail(byDoc.email) !== email) {
      throw new Error('Esa cédula/RIF ya está registrada con otro correo. Si es tuya, escríbenos para vincularla.');
    }
    const name = form.name.trim().replace(/\s+/g, ' ');
    const [firstName, ...rest] = name.split(' ');
    if (byDoc) {
      await customerService.update(byDoc.id, { email, phone: form.phone, address: form.address.trim() });
    } else {
      await customerService.create({
        firstName, lastName: rest.join(' '), docType, docNumber, email,
        phone: form.phone, state: 'Lara', city: 'Barquisimeto', address: form.address.trim()
      });
    }
    const account = userService.getByEmail(email);
    if (account?.role === 'Cliente') await userService.update(account.id, { name, phone: form.phone }).catch(() => {});
    return persistSession({ ...user, name, phone: form.phone, profileComplete: true }, localStorage.getItem(TOKEN_KEY));
  },

  logout() {
    if (isSupabaseConfigured() && supabase) {
      supabase.auth.signOut().catch(() => {});
    }
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
  },

  getCurrentUser() {
    try {
      const stored = localStorage.getItem(USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  },

  saveRememberedUser(username) {
    if (username) {
      localStorage.setItem(REMEMBER_KEY, username);
    } else {
      localStorage.removeItem(REMEMBER_KEY);
    }
  },

  getRememberedUser() {
    return localStorage.getItem(REMEMBER_KEY) || '';
  }
};

export default authService;
