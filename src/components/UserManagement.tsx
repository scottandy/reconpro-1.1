import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AuthManager } from '../utils/auth';
import { User, RegisterUserData } from '../types/auth';
import { Users, Plus, Mail, User as UserIcon, Shield, Calendar, Eye, EyeOff, X } from 'lucide-react';

const UserManagement: React.FC = () => {
  const { user: currentUser, dealership, registerUser, clearError, error } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showPasswords, setShowPasswords] = useState({ password: false, confirmPassword: false });
  const [formData, setFormData] = useState<RegisterUserData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'technician'
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>('');

  useEffect(() => {
    if (dealership) {
      loadUsers();
    }
  }, [dealership]);

  const loadUsers = async () => {
    if (dealership) {
      try {
        const dealershipUsers = await AuthManager.getDealershipUsers(dealership.id);
        setUsers(dealershipUsers);
      } catch (error) {
        console.error('Error loading users:', error);
      }
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!formData.password) newErrors.password = 'Password is required';
    if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setSuccessMessage('');
    
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await registerUser(formData);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'technician'
      });
      setShowAddUser(false);
      setSuccessMessage(`User ${formData.firstName} ${formData.lastName} has been added successfully! They can now sign in with their email and password.`);
      await loadUsers();
    } catch (error) {
      // Error is handled by the auth context
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof RegisterUserData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleDeactivateUser = async (userId: string) => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone and will permanently remove the user.')) {
      try {
        await AuthManager.deleteUser(userId);
        await loadUsers();
      } catch (error) {
        console.error('Error deleting user:', error);
      }
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'manager':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'technician':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'sales':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 dark:border-gray-700/20 p-8 text-center">
        <Shield className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Access Restricted</h3>
        <p className="text-gray-600 dark:text-gray-400">Only administrators can manage users.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 dark:bg-green-900/70 border border-green-200 dark:border-green-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-100 dark:bg-green-800 rounded-lg flex items-center justify-center">
              <Users className="w-4 h-4 text-green-600 dark:text-green-300" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-green-900 dark:text-green-200">User Added Successfully</h3>
              <p className="text-sm text-green-700 dark:text-green-100">{successMessage}</p>
            </div>
            <button
              onClick={() => setSuccessMessage('')}
              className="text-green-400 hover:text-green-600 dark:hover:text-green-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 dark:border-gray-700/20 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">User Management</h2>
              <p className="text-gray-600 dark:text-gray-400">Manage your dealership team members</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddUser(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Plus className="w-4 h-4" />
            Add User
          </button>
        </div>
      </div>

      {/* User Limits Info */}
      {dealership && (
        <div className="bg-blue-50/80 dark:bg-blue-900/70 backdrop-blur-sm border border-blue-200 dark:border-blue-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
                User Limit: {users.length} / {dealership.settings.maxUsers}
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-100">
                {dealership.subscriptionPlan === 'basic' ? 'Upgrade to Premium for more users' : 
                 dealership.subscriptionPlan === 'premium' ? 'Contact us for Enterprise features' : 
                 'Unlimited users available'}
              </p>
            </div>
            <div className="w-full max-w-xs bg-blue-200 dark:bg-blue-800 rounded-full h-2 ml-4">
              <div 
                className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(users.length / dealership.settings.maxUsers) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* Users List */}
      <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 dark:border-gray-700/20 overflow-hidden">
        <div className="p-6 border-b border-gray-200/60 dark:border-gray-700/60">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Team Members ({users.length})</h3>
        </div>
        
        <div className="divide-y divide-gray-200/60 dark:divide-gray-700/60">
          {users.map((user) => (
            <div key={user.id} className="p-6 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">{user.initials}</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                      {user.firstName} {user.lastName}
                      {user.id === currentUser.id && (
                        <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 px-2 py-1 rounded-full">You</span>
                      )}
                    </h4>
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <Mail className="w-3 h-3" />
                      <span>{user.email || 'Email not available'}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${getRoleColor(user.role)}`}>
                    <UserIcon className="w-3 h-3" />
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </span>
                  
                  <div className="text-right text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>Joined {formatDate(user.createdAt)}</span>
                    </div>
                    {user.lastLogin && (
                      <div className="mt-1">
                        Last login: {formatDate(user.lastLogin)}
                      </div>
                    )}
                  </div>
                  
                  {user.id !== currentUser.id && (
                    <button
                      onClick={() => handleDeactivateUser(user.id)}
                      className="px-3 py-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg transition-colors text-sm font-medium"
                    >
                      Deactivate
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {users.length === 0 && (
            <div className="p-12 text-center">
              <Users className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">No Users Found</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">Add your first team member to get started.</p>
              <button
                onClick={() => setShowAddUser(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <Plus className="w-4 h-4" />
                Add User
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add User Modal */}
      {showAddUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-2xl shadow-2xl max-w-md w-full border border-white/20 dark:border-gray-700/40">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Add New User</h3>
                <button
                  onClick={() => {
                    setShowAddUser(false);
                    setFormData({
                      firstName: '',
                      lastName: '',
                      email: '',
                      password: '',
                      confirmPassword: '',
                      role: 'technician'
                    });
                    setFormErrors({});
                    clearError();
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-red-700 dark:text-red-200 text-sm">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                      First Name *
                    </label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 ${formErrors.firstName ? 'border-red-300 dark:border-red-500' : 'border-gray-300 dark:border-gray-700'}`}
                      placeholder="First name"
                    />
                    {formErrors.firstName && <p className="text-red-600 dark:text-red-300 text-xs mt-1">{formErrors.firstName}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 ${formErrors.lastName ? 'border-red-300 dark:border-red-500' : 'border-gray-300 dark:border-gray-700'}`}
                      placeholder="Last name"
                    />
                    {formErrors.lastName && <p className="text-red-600 dark:text-red-300 text-xs mt-1">{formErrors.lastName}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 ${formErrors.email ? 'border-red-300 dark:border-red-500' : 'border-gray-300 dark:border-gray-700'}`}
                    placeholder="user@dealership.com"
                  />
                  {formErrors.email && <p className="text-red-600 dark:text-red-300 text-xs mt-1">{formErrors.email}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    Role *
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => handleInputChange('role', e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  >
                    <option value="technician">Technician</option>
                    <option value="sales">Sales</option>
                    <option value="manager">Manager</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.password ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm pr-10 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 ${formErrors.password ? 'border-red-300 dark:border-red-500' : 'border-gray-300 dark:border-gray-700'}`}
                      placeholder="Create password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(prev => ({ ...prev, password: !prev.password }))}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                      {showPasswords.password ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {formErrors.password && <p className="text-red-600 dark:text-red-300 text-xs mt-1">{formErrors.password}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.confirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm pr-10 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 ${formErrors.confirmPassword ? 'border-red-300 dark:border-red-500' : 'border-gray-300 dark:border-gray-700'}`}
                      placeholder="Confirm password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(prev => ({ ...prev, confirmPassword: !prev.confirmPassword }))}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                      {showPasswords.confirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {formErrors.confirmPassword && <p className="text-red-600 dark:text-red-300 text-xs mt-1">{formErrors.confirmPassword}</p>}
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Adding User...' : 'Add User'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddUser(false);
                      setFormData({
                        firstName: '',
                        lastName: '',
                        email: '',
                        password: '',
                        confirmPassword: '',
                        role: 'technician'
                      });
                      setFormErrors({});
                      clearError();
                    }}
                    className="flex-1 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;