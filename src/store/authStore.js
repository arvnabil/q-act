import { create } from 'zustand';
import { supabase } from '../services/supabase';

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
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();
          
        set({ session, user: profile || session.user, isLoading: false });
      } else {
        set({ session: null, user: null, isLoading: false });
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (event, currentSession) => {
        if (currentSession) {
          const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', currentSession.user.id)
            .single();
          set({ session: currentSession, user: profile || currentSession.user, isLoading: false });
        } else {
          set({ session: null, user: null, isLoading: false });
        }
      });
      
    } catch (error) {
      console.error('Error initializing auth:', error);
      set({ session: null, user: null, isLoading: false });
    }
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
