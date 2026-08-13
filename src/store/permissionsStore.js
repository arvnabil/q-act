import { create } from 'zustand';
import { supabase } from '../services/supabase';

const usePermissionsStore = create((set, get) => ({
  permissions: {}, // { 'Administrator': { ... }, 'Manager': { ... } }
  isLoading: true,
  
  initialize: async () => {
    try {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('role, permissions');
        
      if (error) {
        throw error;
      }
      
      if (data) {
        const permsObj = {};
        data.forEach(item => {
          permsObj[item.role] = item.permissions;
        });
        set({ permissions: permsObj, isLoading: false });
      } else {
        set({ permissions: {}, isLoading: false });
      }
      
    } catch (error) {
      console.error('Error loading permissions:', error);
      set({ permissions: {}, isLoading: false });
    }
  },
  
  // Helper to check if a specific role has a specific permission
  hasPermission: (role, feature) => {
    const { permissions } = get();
    
    // Normalize role name
    const normalizedRole = role === 'admin' ? 'Administrator' : 
                           role === 'Sales Manager' ? 'Manager' : 
                           role;

    // If permissions loaded from DB and feature is defined, use them
    if (permissions && permissions[normalizedRole] && typeof permissions[normalizedRole][feature] !== 'undefined') {
      return !!permissions[normalizedRole][feature];
    }
    
    // Default fallback by role when DB permissions not yet loaded or missing
    const defaultPermissions = {
      'Administrator': true,
      'Manager': ['analytics', 'manager_view', 'dashboard', 'quotations', 'customers', 'products', 'brands'].includes(feature),
      'Account Executive': ['dashboard', 'quotations', 'customers', 'products'].includes(feature),
      'Sales Representative': ['dashboard', 'quotations', 'customers', 'products'].includes(feature),
      'Finance': ['dashboard', 'quotations', 'quotations_view'].includes(feature),
    };
    
    if (normalizedRole === 'Administrator') return true;
    return defaultPermissions[normalizedRole] ?? false;
  },

  updatePermissionsLocal: (role, newPermissions) => {
    set((state) => ({
      permissions: {
        ...state.permissions,
        [role]: newPermissions
      }
    }));
  }
}));

export default usePermissionsStore;
