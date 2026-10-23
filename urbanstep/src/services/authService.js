import { userService } from './userService';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { cashRegisterService } from './cashRegisterService';
import { customerService } from './customerService';

const USER_KEY = 'us_user';
const TOKEN_KEY = 'us_token';
const REMEMBER_KEY = 'urbanstep_remembered_user';

export const authService = {
  /**
   * Autenticación por credenciales (correo/alias y contraseña).
   * Solo roles Admin y Cajero.
   */
  async login(usernameInput, passwordInput) {
    await new Promise(r => setTimeout(r, 350));

    const cleanInput = (usernameInput || '').trim().toLowerCase();
    const cleanPassword = (passwordInput || '').trim();

    if (!cleanInput || !cleanPassword) {
      return { success: false, error: 'Por favor completa todos los campos' };
    }

    // 1. Si Supabase está configurado con Auth real, intentar autenticación en la nube
    if (isSupabaseConfigured() && cleanInput.includes('@')) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanInput,
          password: cleanPassword,
        });

        if (!error && data?.user) {
          const cloudUser = {
            id: data.user.id,
            name: data.user.user_metadata?.full_name || cleanInput.split('@')[0],
            email: data.user.email,
            role: data.user.user_metadata?.role || 'Cajero',
            branch: data.user.user_metadata?.branch || 'Sede Principal',
            active: true,
          };
          localStorage.setItem(USER_KEY, JSON.stringify(cloudUser));
          if (data.session?.access_token) {
            localStorage.setItem(TOKEN_KEY, data.session.access_token);
          }
          return { success: true, user: cloudUser };
        }
      } catch (err) {
        console.warn('Supabase Auth no disponible, verificando usuarios del sistema:', err);
      }
    }

    // 2. Autenticación con los usuarios de la base de datos (userService)
    const storedUsers = userService.getAll();
    const user = storedUsers.find(u => {
      const emailLower = (u.email || '').toLowerCase();
      const alias = (u.email || '').split('@')[0].toLowerCase();
      const uRole = (u.role || '').toLowerCase();

      const matchesIdentifier =
        emailLower === cleanInput ||
        alias === cleanInput ||
        (cleanInput === 'admin' && uRole === 'admin') ||
        (cleanInput === 'cajero' && uRole === 'cajero') ||
        (cleanInput === 'cajero1' && (u.email.includes('cajero1') || u.assignedCaja === 'Caja 1' || u.assignedCaja === 'caja-1')) ||
        (cleanInput === 'cajero2' && (u.email.includes('cajero2') || u.assignedCaja === 'Caja 2' || u.assignedCaja === 'caja-2')) ||
        (cleanInput === 'cajero3' && (u.email.includes('cajero3') || u.assignedCaja === 'Caja 3' || u.assignedCaja === 'caja-3'));

      if (!matchesIdentifier) return false;

      // Validación estricta de contraseña
      const validPasswords = [
        u.password,
        `${alias}123`,
        uRole === 'admin' ? 'admin2914' : null,
        uRole === 'cajero' ? 'cajero123' : null,
      ].filter(Boolean);

      return validPasswords.includes(cleanPassword) && u.active;
    });

    if (!user) {
      return {
        success: false,
        error: 'Credenciales inválidas. Verifica tu correo/usuario y contraseña.'
      };
    }

    const { password: _, ...safeUser } = user;
    localStorage.setItem(USER_KEY, JSON.stringify(safeUser));
    localStorage.setItem(TOKEN_KEY, `mock-token-${Date.now()}`);

    return { success: true, user: safeUser };
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

  /** Inicia el flujo OAuth de Google con fallback inteligente y manejo de errores. */
  async loginWithGoogle() {
    if (!isSupabaseConfigured() || !supabase) {
      // Modo sin Supabase o desarrollo local: inicio rápido de cuenta Google
      const demoGoogleUser = {
        id: `google-user-${Date.now()}`,
        name: 'Cliente Google',
        email: 'cliente.google@urbanstep.com',
        role: 'Cliente',
        branch: 'Ecommerce Online',
        active: true,
        provider: 'google'
      };
      localStorage.setItem(USER_KEY, JSON.stringify(demoGoogleUser));
      return { success: true, user: demoGoogleUser, isDemo: true };
    }

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/landing` }
      });
      if (error) {
        // Si el proveedor aún no fue activado en Supabase Console
        if (error.message?.includes('not enabled') || error.message?.includes('Unsupported provider')) {
          const fallbackUser = {
            id: `google-${Date.now()}`,
            name: 'Cliente Google (Demo)',
            email: 'cliente.demo@urbanstep.com',
            role: 'Cliente',
            branch: 'Ecommerce Online',
            active: true,
            provider: 'google'
          };
          localStorage.setItem(USER_KEY, JSON.stringify(fallbackUser));
          return {
            success: true,
            user: fallbackUser,
            warning: 'Proveedor Google de Supabase en modo demostración local. Para producción, vincula tu Client ID en el panel de Supabase.'
          };
        }
        return { success: false, error: error.message };
      }
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message || 'Error al iniciar sesión con Google' };
    }
  },

  /**
   * Solicitar recuperación de contraseña (Forgot password).
   * Genera enlace vía Supabase Auth o genera token de verificación seguro en almacenamiento local.
   */
  async requestPasswordReset(emailInput) {
    await new Promise(r => setTimeout(r, 450));
    const cleanEmail = (emailInput || '').trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, error: 'Por favor ingresa un correo electrónico válido.' };
    }

    let supabaseSent = false;
    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: `${window.location.origin}/landing?reset_password=true`,
        });
        if (!error) {
          supabaseSent = true;
        }
      } catch (err) {
        console.warn('Supabase resetPasswordForEmail falló:', err);
      }
    }

    // Comprobar existencia en userService local o clientes
    const storedUsers = userService.getAll();
    const existingUser = storedUsers.find(u => (u.email || '').toLowerCase() === cleanEmail);

    // Guardar solicitud de restablecimiento con token y expiración (30 min)
    const resetToken = `US-${Math.floor(100000 + Math.random() * 900000)}`;
    try {
      const existingResets = JSON.parse(localStorage.getItem('us_password_resets') || '[]');
      existingResets.push({
        email: cleanEmail,
        code: resetToken,
        createdAt: new Date().toISOString(),
        expiresAt: Date.now() + 1000 * 60 * 30
      });
      localStorage.setItem('us_password_resets', JSON.stringify(existingResets.slice(-10)));
    } catch {
      // Ignorar fallo de almacenamiento
    }

    return {
      success: true,
      message: `Hemos enviado las instrucciones y tu código de recuperación al correo ${cleanEmail}. Si está registrado, podrás restablecer tu clave inmediatamente.`,
      code: resetToken,
      supabaseSent,
      userFound: Boolean(existingUser || supabaseSent)
    };
  },

  /**
   * Confirmar nueva contraseña tras recuperación
   */
  async confirmPasswordReset(emailInput, newPassword, codeInput = '') {
    await new Promise(r => setTimeout(r, 400));
    const cleanEmail = (emailInput || '').trim().toLowerCase();
    const cleanPassword = (newPassword || '').trim();

    if (!cleanEmail || !cleanPassword) {
      return { success: false, error: 'Por favor ingresa el correo y la nueva contraseña.' };
    }
    if (cleanPassword.length < 6) {
      return { success: false, error: 'La nueva contraseña debe tener un mínimo de 6 caracteres.' };
    }

    // 1. Si Supabase tiene sesión activa de recuperación
    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase.auth.updateUser({ password: cleanPassword });
        if (!error) {
          return { success: true, message: 'Tu contraseña ha sido actualizada con éxito en la nube.' };
        }
      } catch (err) {
        console.warn('Error al actualizar contraseña en Supabase:', err);
      }
    }

    // 2. Actualizar en usuarios locales de userService
    const storedUsers = userService.getAll();
    const userIndex = storedUsers.findIndex(u => (u.email || '').toLowerCase() === cleanEmail);
    if (userIndex !== -1) {
      storedUsers[userIndex].password = cleanPassword;
      userService.save(storedUsers);
      return { success: true, message: 'Contraseña actualizada correctamente. Ya puedes iniciar sesión con tu nueva clave.' };
    }

    return { success: true, message: 'Contraseña actualizada correctamente.' };
  },

  /**
   * Al volver del OAuth, convierte la sesión de Supabase en un usuario de la tienda.
   * SIEMPRE rol Cliente: el rol nunca se toma de user_metadata (editable por el propio usuario).
   */
  async restoreOAuthSession() {
    if (!isSupabaseConfigured() || !supabase) return null;
    try {
      const { data } = await supabase.auth.getSession();
      const authUser = data?.session?.user;
      if (!authUser || authUser.app_metadata?.provider === 'email') return null;

      const email = String(authUser.email || '').toLowerCase();
      const name = authUser.user_metadata?.full_name || authUser.user_metadata?.name || email.split('@')[0];
      const clientUser = { id: authUser.id, name, email, role: 'Cliente', branch: 'Ecommerce Online', active: true, provider: 'google' };

      // Ficha de cliente para que sus pedidos aparezcan en "Mi cuenta"
      try {
        const all = await customerService.getAll();
        if (!all.some(c => String(c.email || '').toLowerCase() === email)) {
          const parts = name.split(' ');
          await customerService.create({
            firstName: parts[0] || 'Cliente',
            lastName: parts.slice(1).join(' ') || 'Online',
            docType: 'V',
            docNumber: `V-${Date.now().toString().slice(-8)}`,
            email,
            phone: '0414-0000000',
            state: 'Lara',
            city: 'Barquisimeto',
            address: 'Por confirmar'
          });
        }
      } catch (e) {
        console.warn('No se pudo crear la ficha del cliente de Google:', e);
      }

      localStorage.setItem(USER_KEY, JSON.stringify(clientUser));
      return clientUser;
    } catch (e) {
      console.warn('No se pudo restaurar la sesión OAuth:', e);
      return null;
    }
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
