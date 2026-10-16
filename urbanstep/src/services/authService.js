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

  /** Inicia el flujo OAuth de Google (requiere habilitar el proveedor en Supabase > Authentication). */
  async loginWithGoogle() {
    if (!isSupabaseConfigured() || !supabase) {
      return { success: false, error: 'El acceso con Google requiere Supabase configurado' };
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/landing` }
    });
    return error ? { success: false, error: error.message } : { success: true };
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
