import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../services/api.js';

// ============================================
// PERMISSIONS
// ============================================

export function useRolePermissions() {
  return useQuery({
    queryKey: ['role_permissions'],
    queryFn: api.getRolePermissions,
  });
}

export function useUpdateRolePermissions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ role, permissions }) => api.updateRolePermissions(role, permissions),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role_permissions'] });
    },
  });
}

// ============================================
// CUSTOMERS
// ============================================

export function useCustomers() {
  return useQuery({
    queryKey: ['customers'],
    queryFn: api.getCustomers,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ customerData, picData }) => api.createCustomer(customerData, picData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

// ============================================
// BRANDS & PRODUCTS
// ============================================

export function useBrands() {
  return useQuery({
    queryKey: ['brands'],
    queryFn: api.getBrands,
  });
}

export function useCreateBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (brandData) => api.createBrand(brandData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] });
    },
  });
}

export function useUpdateBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, brandData }) => api.updateBrand(id, brandData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] });
    },
  });
}

export function useDeleteBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.deleteBrand(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] });
    },
  });
}

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: api.getProducts,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (productData) => api.createProduct(productData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sku, productData }) => api.updateProduct(sku, productData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sku) => api.deleteProduct(sku),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useDeleteProducts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (skus) => api.deleteProducts(skus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useUpsertProducts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (productsArray) => api.upsertProducts(productsArray),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['brands'] });
    },
  });
}

export function useUpdateProfile() {
  return useMutation({
    mutationFn: (profileData) => api.upsertProfile(profileData),
  });
}

// ============================================
// QUOTATIONS
// ============================================

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard_stats'],
    queryFn: api.getDashboardStats,
  });
}

export function useQuotations() {
  return useQuery({
    queryKey: ['quotations'],
    queryFn: api.getQuotations,
  });
}

export function useQuotationsByUser(userId) {
  return useQuery({
    queryKey: ['quotations', 'by_user', userId],
    queryFn: () => api.getQuotationsByUser(userId),
    enabled: !!userId,
  });
}

export function useSalesUsers() {
  return useQuery({
    queryKey: ['sales_users'],
    queryFn: api.getSalesUsers,
  });
}

export function useSalesTargets() {
  return useQuery({
    queryKey: ['sales_targets'],
    queryFn: api.getSalesTargets,
  });
}

export function useUpdateSalesTargets() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (targetsMap) => api.saveSalesTargets(targetsMap),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales_targets'] });
    },
  });
}

export function useCreateQuotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ quotationData, itemsData }) => api.createQuotation(quotationData, itemsData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
    },
  });
}

// ============================================
// SYSTEM
// ============================================

export function useBankAccounts() {
  return useQuery({
    queryKey: ['bank_accounts'],
    queryFn: api.getCompanyBankAccounts,
  });
}

export function useTrashQuotations() {
  return useQuery({
    queryKey: ['trash_quotations'],
    queryFn: api.getTrashQuotations,
  });
}

export function useMaintenanceMode() {
  return useQuery({
    queryKey: ['maintenance_mode'],
    queryFn: api.getMaintenanceMode,
    refetchInterval: 15000, // Refetch every 15 seconds to sync state
  });
}

export function useUpdateMaintenanceMode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (settings) => api.setMaintenanceMode(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance_mode'] });
    },
  });
}

// ============================================
// BUSINESS UNITS
// ============================================

export function useBusinessUnits() {
  return useQuery({
    queryKey: ['business_units'],
    queryFn: api.getBusinessUnits,
  });
}

export function useUserBU(userId) {
  return useQuery({
    queryKey: ['user_bu', userId],
    queryFn: () => api.getUserBU(userId),
    enabled: !!userId,
  });
}

export function useCreateBusinessUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (buData) => api.createBusinessUnit(buData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business_units'] });
    },
  });
}

export function useUpdateBusinessUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => api.updateBusinessUnit(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business_units'] });
    },
  });
}

export function useDeleteBusinessUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.deleteBusinessUnit(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business_units'] });
    },
  });
}

export function useAddBUMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ buId, userId, roleInBu }) => api.addBUMember(buId, userId, roleInBu),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business_units'] });
      queryClient.invalidateQueries({ queryKey: ['user_bu'] });
      queryClient.invalidateQueries({ queryKey: ['sales_users'] });
    },
  });
}

export function useRemoveBUMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ buId, userId }) => api.removeBUMember(buId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business_units'] });
      queryClient.invalidateQueries({ queryKey: ['user_bu'] });
      queryClient.invalidateQueries({ queryKey: ['sales_users'] });
    },
  });
}

export function useUsersWithoutBU() {
  return useQuery({
    queryKey: ['users_without_bu'],
    queryFn: api.getUsersWithoutBU,
  });
}

export function useQuotationsByBU(buId) {
  return useQuery({
    queryKey: ['quotations_by_bu', buId],
    queryFn: () => api.getQuotationsByBU(buId),
    enabled: !!buId,
  });
}

// Company Info & Master Terms Settings
export function useCompanyInfoSettings() {
  return useQuery({
    queryKey: ['company_info_settings'],
    queryFn: api.getCompanyInfoSettings,
  });
}

export function useUpdateCompanyInfoSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (info) => api.saveCompanyInfoSettings(info),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company_info_settings'] });
    },
  });
}

export function useMasterTermsSettings() {
  return useQuery({
    queryKey: ['master_terms_settings'],
    queryFn: api.getMasterTermsSettings,
  });
}

export function useUpdateMasterTermsSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (templates) => api.saveMasterTermsSettings(templates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master_terms_settings'] });
    },
  });
}

// ============================================
// ACTIVITY LOGS
// ============================================

export function useActivityLogs(userId) {
  return useQuery({
    queryKey: ['activity_logs', userId],
    queryFn: () => api.getActivityLogs(userId),
    enabled: !!userId,
    staleTime: 30000,
  });
}

// ============================================
// NOTIFICATIONS
// ============================================

export function useNotifications(userId) {
  return useQuery({
    queryKey: ['notifications', userId],
    queryFn: () => api.getNotifications(userId),
    enabled: !!userId,
    refetchInterval: 30000, // poll every 30s for new notifications
    staleTime: 15000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.markNotificationAsRead(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId) => api.markAllNotificationsAsRead(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.deleteNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

// ============================================
// SALES ORDERS (SO)
// ============================================

export function useSalesOrders() {
  return useQuery({
    queryKey: ['sales_orders'],
    queryFn: api.getSalesOrders,
    retry: 1,
    staleTime: 30000,
  });
}

export function useSalesOrder(id) {
  return useQuery({
    queryKey: ['sales_order', id],
    queryFn: () => api.getSalesOrderById(id),
    enabled: !!id,
  });
}

export function useCreateSalesOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ soData, items, costs }) => api.createSalesOrder(soData, items, costs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales_orders'] });
    },
  });
}

export function useUpdateSalesOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }) => api.updateSalesOrderStatus(id, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sales_orders'] });
      queryClient.invalidateQueries({ queryKey: ['sales_order', variables.id] });
    },
  });
}

export function useAddSalesOrderCost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (costData) => api.addSalesOrderCost(costData),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sales_orders'] });
      queryClient.invalidateQueries({ queryKey: ['sales_order', variables.so_id] });
    },
  });
}

export function useRemoveSalesOrderCost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, so_id }) => api.removeSalesOrderCost(id, so_id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sales_orders'] });
      queryClient.invalidateQueries({ queryKey: ['sales_order', variables.so_id] });
    },
  });
}

// ============================================
// SALES ZONE
// ============================================

import { supabase } from '../services/supabase.js';

/**
 * Lazy fetch: only fetches when `enabled` is true (i.e. when Sales Zone is opened).
 */
export function useQuotationSalesNote(quotationId, enabled = false) {
  return useQuery({
    queryKey: ['quotation_sales_note', quotationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quotation_sales_notes')
        .select('*')
        .eq('quotation_id', quotationId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!quotationId && enabled,
    staleTime: 30_000,
  });
}

export function useUpsertSalesNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ quotationId, adjustments }) => {
      const { data, error } = await supabase
        .from('quotation_sales_notes')
        .upsert(
          { quotation_id: quotationId, adjustments, updated_at: new Date().toISOString() },
          { onConflict: 'quotation_id' }
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['quotation_sales_note', variables.quotationId] });
    },
  });
}

