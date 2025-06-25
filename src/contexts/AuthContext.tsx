import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { AuthState, User, Dealership, LoginCredentials, RegisterDealershipData, RegisterUserData } from '../types/auth';
import { DatabaseService, supabase } from '../utils/database';

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  registerDealership: (data: RegisterDealershipData) => Promise<void>;
  registerUser: (data: RegisterUserData) => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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

  const login = async (credentials: LoginCredentials) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password
      });

      if (error) throw error;

      if (data.user) {
        const user = await DatabaseService.getCurrentUser();
        if (user && user.dealershipId) {
          const dealership = await DatabaseService.getDealership(user.dealershipId);
          if (dealership) {
            dispatch({ type: 'LOGIN_SUCCESS', payload: { user, dealership } });
            return;
          }
        }
      }

      throw new Error('Invalid credentials');
    } catch (error) {
      console.error('LOGIN ERROR:', error);
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Login failed' });
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

  const registerUser = async (data: RegisterUserData) => {
    if (!state.dealership) {
      throw new Error('No dealership context');
    }
    
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            first_name: data.firstName,
            last_name: data.lastName,
            role: data.role,
            dealership_id: state.dealership.id
          }
        }
      });

      if (authError || !authData.user) {
        throw new Error(authError?.message || 'Failed to create user');
      }

      // Create profile
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
        logout,
        registerDealership,
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