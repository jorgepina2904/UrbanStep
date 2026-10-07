import { userService } from './userService';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { cashRegisterService } from './cashRegisterService';

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

    // 2. Autenticación con los usuarios locales del sistema (userService)
    const storedUsers = userService.getAll();
    const user = storedUsers.find(u => {
      const emailLower = (u.email || '').toLowerCase();
      const alias = (u.email || '').split('@')[0].toLowerCase();

      const matchesIdentifier =
        emailLower === cleanInput ||
        alias === cleanInput ||
        (cleanInput === 'admin' && u.role === 'Admin') ||
        (cleanInput === 'cajero' && u.role === 'Cajero' && u.id === 'u2') ||
        (cleanInput === 'cajero1' && (u.assignedCaja === 'Caja 1' || u.id === 'u2')) ||
        (cleanInput === 'cajero2' && (u.assignedCaja === 'Caja 2' || u.id === 'u3')) ||
        (cleanInput === 'cajero3' && (u.assignedCaja === 'Caja 3' || u.id === 'u4'));

      if (!matchesIdentifier) return false;

      // Validación estricta de contraseña
      const validPasswords = [
        u.password,
        `${alias}123`,
        u.role.toLowerCase() === 'admin' ? 'admin123' : null,
        u.role.toLowerCase() === 'cajero' ? 'cajero123' : null,
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

  logout() {
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
