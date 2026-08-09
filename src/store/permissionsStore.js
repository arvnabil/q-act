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

    // Default fallback logic if data hasn't loaded or role is missing
    if (!permissions || !permissions[normalizedRole]) {
      // Temporary fallback based on role name for safety until loaded
      if (normalizedRole === 'Administrator') return true;
      return false;
    }
    
    return !!permissions[normalizedRole][feature];
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
