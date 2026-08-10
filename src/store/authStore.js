import { create } from 'zustand';
import { supabase } from '../services/supabase';
import { getUserBU } from '../services/api';

// Helper: load profile + BU for a given session
async function loadUserProfile(session) {
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', session.user.id)
    .single();

  const userProfile = profile || session.user;

  // Load BU if user is Sales/Presales (not Admin/Manager who see all)
  let bu = null;
  try {
    bu = await getUserBU(userProfile.id);
  } catch (_) {
    bu = null;
  }

  return { ...userProfile, bu };
}

const useAuthStore = create((set) => ({
  user: null,
  session: null,
  isLoading: true,
  
  initialize: async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        throw error;
      }
      
      if (session) {
        const userWithBU = await loadUserProfile(session);
        set({ session, user: userWithBU, isLoading: false });
      } else {
        set({ session: null, user: null, isLoading: false });
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (event, currentSession) => {
        if (currentSession) {
          const userWithBU = await loadUserProfile(currentSession);
          set({ session: currentSession, user: userWithBU, isLoading: false });
        } else {
          set({ session: null, user: null, isLoading: false });
        }
      });
      
    } catch (error) {
      console.error('Error initializing auth:', error);
      set({ session: null, user: null, isLoading: false });
    }
  },

  /** Refresh BU data for the current user (panggil setelah user ditambah/hapus dari BU) */
  refreshBU: async () => {
    const state = useAuthStore.getState();
    if (!state.user?.id) return;
    try {
      const bu = await getUserBU(state.user.id);
      set((s) => ({ user: { ...s.user, bu } }));
    } catch (_) {}
  },
  
  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null });
  },

  setMockUser: (user) => {
    set({ user, session: { access_token: 'mock-token' }, isLoading: false });
  }
}));

export default useAuthStore;
