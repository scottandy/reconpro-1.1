import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { AuthState, User, Dealership, LoginCredentials, RegisterDealershipData, RegisterUserData } from '../types/auth';
import { DatabaseService, supabase } from '../utils/database';

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<boolean>;
  superAdminLogin: (credentials: LoginCredentials) => Promise<boolean>;
  logout: () => void;
  registerDealership: (data: RegisterDealershipData) => Promise<void>;
  createAdminForDealership: (data: RegisterDealershipData) => Promise<void>;
  registerUser: (data: RegisterUserData) => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export { AuthContext };

type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; dealership: Dealership } }
  | { type: 'LOGOUT' };

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  dealership: null,
  isLoading: true,
  error: null
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload.user,
        dealership: action.payload.dealership,
        isLoading: false,
        error: null
      };
    case 'LOGOUT':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        dealership: null,
        isLoading: false,
        error: null
      };
    default:
      return state;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    // Check for existing session using Supabase
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const user = await DatabaseService.getCurrentUser();
          if (user && user.dealershipId) {
            const dealership = await DatabaseService.getDealership(user.dealershipId);
            if (dealership) {
              dispatch({ type: 'LOGIN_SUCCESS', payload: { user, dealership } });
              return;
            }
          }
        }
        dispatch({ type: 'SET_LOADING', payload: false });
      } catch (error) {
        console.error('Error checking session:', error);
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    checkSession();
  }, []);

  const login = async (credentials: LoginCredentials): Promise<boolean> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password
      });

      if (error) {
        // Provide more specific error messages
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Incorrect email or password');
        } else if (error.message.includes('Email not confirmed')) {
          throw new Error('Please check your email and confirm your account');
        } else if (error.message.includes('Too many requests')) {
          throw new Error('Too many login attempts. Please try again later');
        } else {
          throw new Error(error.message);
        }
      }

      if (data.user) {
        const user = await DatabaseService.getCurrentUser();
        if (user && user.dealershipId) {
          const dealership = await DatabaseService.getDealership(user.dealershipId);
          if (dealership) {
            dispatch({ type: 'LOGIN_SUCCESS', payload: { user, dealership } });
            return true;
          } else {
            throw new Error('Dealership not found. Please contact support.');
          }
        } else {
          throw new Error('User profile not found. Please contact support.');
        }
      }

      throw new Error('Invalid credentials');
    } catch (error) {
      console.error('LOGIN ERROR:', error);
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Login failed' });
      return false;
    }
  };

  const superAdminLogin = async (credentials: LoginCredentials): Promise<boolean> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password
      });

      if (error) {
        // Provide more specific error messages
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Incorrect email or password');
        } else if (error.message.includes('Email not confirmed')) {
          throw new Error('Please check your email and confirm your account');
        } else if (error.message.includes('Too many requests')) {
          throw new Error('Too many login attempts. Please try again later');
        } else {
          throw new Error(error.message);
        }
      }

      if (data.user) {
        const user = await DatabaseService.getCurrentUser();
        if (user) {
          // Check if user is a super admin
          if (user.role === 'super-admin') {
            // For super admin, we don't need a dealership, so we'll create a placeholder
            const superAdminDealership: Dealership = {
              id: 'super-admin',
              name: 'Platform Administration',
              address: '',
              city: '',
              state: '',
              zipCode: '',
              phone: '',
              email: user.email,
              website: '',
              isActive: true,
              subscriptionPlan: 'super-admin',
              status: 'active',
              lastActivity: new Date().toISOString(),
              totalUsers: 0,
              totalVehicles: 0,
              monthlyRevenue: 0,
              settings: {},
              createdAt: user.createdAt
            };
            dispatch({ type: 'LOGIN_SUCCESS', payload: { user, dealership: superAdminDealership } });
            return true;
          } else {
            throw new Error('Not Authorized');
          }
        } else {
          throw new Error('User profile not found. Please contact support.');
        }
      }

      throw new Error('Invalid credentials');
    } catch (error) {
      console.error('SUPER ADMIN LOGIN ERROR:', error);
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Super admin login failed' });
      return false;
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      dispatch({ type: 'LOGOUT' });
    } catch (error) {
      console.error('Error during logout:', error);
      dispatch({ type: 'LOGOUT' });
    }
  };

  const registerDealership = async (data: RegisterDealershipData) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const { data: { user }, error } = await DatabaseService.registerDealership(data);

      if (error) {
        throw error;
      }

      if (user) {
        // After successful signup, the trigger creates the profile.
        // Now, we log the user in to get a session and update the app state.
        // This will fail if email confirmation is required, which is correct behavior.
        // The `login` function will handle dispatching success or error.
        await login({ email: data.email, password: data.password });
      } else {
        // This case should not be reached if there is no error.
        throw new Error('Registration failed: no user data returned.');
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Registration failed' });
    }
  };

  const createAdminForDealership = async (data: RegisterDealershipData) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      // 1. Create user in Supabase Auth (no dealership_id in metadata)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            first_name: data.firstName,
            last_name: data.lastName,
            role: 'admin'
          }
        }
      });
      if (authError || !authData.user) {
        throw new Error(authError?.message || 'Failed to create user');
      }

      // 2. Insert dealership (all required fields)
      const { data: dealershipData, error: dealershipError } = await supabase
        .from('dealerships')
        .insert({
          name: data.dealershipName,
          address: data.address,
          city: data.city,
          state: data.state,
          zip_code: data.zipCode,
          phone: data.phone,
          email: data.dealershipEmail,
          website: data.website
        })
        .select()
        .single();
      if (dealershipError) throw new Error(dealershipError.message);

      // 3. Insert profile for the new admin user
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          first_name: data.firstName,
          last_name: data.lastName,
          initials: `${data.firstName[0]}${data.lastName[0]}`.toUpperCase(),
          role: 'admin',
          dealership_id: dealershipData.id,
          is_active: true
        });
      if (profileError) throw new Error(profileError.message);

      // 4. Now log in
      await login({ email: data.email, password: data.password });

    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Registration failed' });
    }
  };

  const registerUser = async (data: RegisterUserData) => {
    if (!state.dealership) {
      throw new Error('No dealership context');
    }
    
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      // 1. Create user in Supabase Auth (no dealership_id in metadata)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            first_name: data.firstName,
            last_name: data.lastName,
            role: data.role
          }
        }
      });
      if (authError || !authData.user) {
        throw new Error(authError?.message || 'Failed to create user');
      }

      // 2. Insert profile with all required fields, including dealership_id
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          first_name: data.firstName,
          last_name: data.lastName,
          initials: `${data.firstName[0]}${data.lastName[0]}`.toUpperCase(),
          role: data.role,
          dealership_id: state.dealership.id,
          is_active: true
        });
      if (profileError) {
        throw new Error(profileError.message);
      }

      dispatch({ type: 'SET_LOADING', payload: false });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'User registration failed' });
    }
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        superAdminLogin,
        logout,
        registerDealership,
        createAdminForDealership,
        registerUser,
        clearError
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};