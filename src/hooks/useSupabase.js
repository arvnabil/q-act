import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../services/api.js';

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
