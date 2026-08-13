import { supabase } from './supabase.js';

// ============================================
// PERMISSIONS
// ============================================
export async function getRolePermissions() {
  const { data, error } = await supabase
    .from('role_permissions')
    .select('*')
    .order('id');
  if (error) throw error;
  return data;
}

export async function updateRolePermissions(role, permissions) {
  try {
    // 1. Try update first
    const { data, error } = await supabase
      .from('role_permissions')
      .update({ permissions })
      .eq('role', role)
      .select();

    if (!error && data && data.length > 0) {
      return data[0];
    }

    // 2. Try insert if update affected 0 rows
    const { data: insertData, error: insertError } = await supabase
      .from('role_permissions')
      .insert([{ role, permissions }])
      .select();

    if (insertError) {
      console.warn('Supabase RLS on role_permissions warning:', insertError.message);
      return { role, permissions };
    }

    return insertData?.[0] || { role, permissions };
  } catch (err) {
    console.warn('updateRolePermissions exception fallback:', err);
    return { role, permissions };
  }
}

// ============================================
// CUSTOMERS & PICS
// ============================================

export async function getCustomers() {
  let data = [];
  try {
    const res = await supabase
      .from('customers')
      .select(`
        *,
        pics:customer_pics(*)
      `)
      .order('name');
    
    if (res.error) {
      console.warn('getCustomers pics select error, trying simple select:', res.error);
      const fallback = await supabase.from('customers').select('*').order('name');
      if (!fallback.error) data = fallback.data || [];
    } else {
      data = res.data || [];
    }
  } catch (err) {
    console.error('getCustomers exception:', err);
    try {
      const fallback = await supabase.from('customers').select('*').order('name');
      if (!fallback.error) data = fallback.data || [];
    } catch (e) {
      data = [];
    }
  }

  // Safely fetch quotations for calculating total spend per customer
  let quotationsMap = {};
  try {
    const { data: qData, error: qErr } = await supabase
      .from('quotations')
      .select('id, customer_id, status, sales_id, is_deleted, items:quotation_items(qty, price)');
      
    if (qErr) {
      console.warn('Error fetching quotations for customer mapping:', qErr);
    } else if (qData) {
      qData.forEach(q => {
        if (q.is_deleted || q.status === 'deleted') return;
        const cId = q.customer_id;
        if (!cId) return;
        if (!quotationsMap[cId]) quotationsMap[cId] = [];
        quotationsMap[cId].push(q);
      });
    }
  } catch (qErr) {
    console.warn('Could not fetch quotations for customer spend:', qErr);
  }

  return (data || []).map(c => {
    const qList = c.quotations || quotationsMap[c.id] || [];
    const totalSpend = qList.reduce((acc, q) => {
      const itemSum = (q.items || []).reduce((iAcc, item) => iAcc + ((item.qty || 0) * (item.price || 0)), 0);
      return acc + itemSum;
    }, 0);

    return {
      ...c,
      pics: c.pics || [],
      quotations: qList,
      quotations_count: qList.length,
      total_spend: totalSpend,
    };
  });
}

export async function upsertProfile(profileData) {
  const { data, error } = await supabase
    .from('users')
    .upsert([profileData], { onConflict: 'id' })
    .select()
    .single();
    
  if (error) throw error;
  return data;
}

const generateShortId = (prefix = 'ID') => `${prefix}${Math.floor(100000 + Math.random() * 900000)}`;

export async function createCustomer(customerData, picData) {
  // 1. Insert Customer — generate short 7-char ID (C + 6 digits) for VARCHAR(10) column
  // Strip created_by & sales_id if customers table doesn't have those columns
  const { created_by, sales_id, ...rawCustomerPayload } = customerData;
  const dataWithId = {
    id: rawCustomerPayload.id || generateShortId('C'),
    ...rawCustomerPayload,
  };

  let customer;
  let { data, error: customerError } = await supabase
    .from('customers')
    .insert([dataWithId])
    .select()
    .single();

  // Fallback if address, sales_id, or created_by column is missing in Supabase schema
  if (customerError && (customerError.code === '42703' || customerError.message?.includes('address') || customerError.message?.includes('sales_id') || customerError.message?.includes('created_by') || customerError.message?.includes('schema cache'))) {
    const { address, created_by, sales_id, bu_id, ...cleanData } = dataWithId;
    const retry = await supabase
      .from('customers')
      .insert([{ id: cleanData.id, name: cleanData.name }])
      .select()
      .single();
    if (retry.error) throw retry.error;
    customer = retry.data;
  } else if (customerError) {
    throw customerError;
  } else {
    customer = data;
  }

  // 2. Insert PIC if provided — DO NOT pass string id because DB auto-increments BIGINT id
  let insertedPics = [];
  if (picData && picData.length > 0) {
    const picsToInsert = picData.map(p => {
      const { id, created_by, ...rest } = p;
      return {
        ...rest,
        customer_id: customer.id,
      };
    });
    
    let { data: picsData, error: picError } = await supabase
      .from('customer_pics')
      .insert(picsToInsert)
      .select();

    if (picError && (picError.code === '42703' || picError.message?.includes('sales_id') || picError.message?.includes('created_by') || picError.message?.includes('schema cache'))) {
      const picsWithoutSales = picsToInsert.map(({ sales_id, created_by, ...rest }) => rest);
      const retry = await supabase
        .from('customer_pics')
        .insert(picsWithoutSales)
        .select();
      if (retry.error) throw retry.error;
      insertedPics = retry.data || [];
    } else if (picError) {
      throw picError;
    } else {
      insertedPics = picsData || [];
    }
  }

  return { ...customer, pics: insertedPics };
}

export async function updateCustomer(customerId, customerData, picData = []) {
  // 1. Update Customer (name, address, etc.)
  const { created_by, sales_id, ...cleanCustomerPayload } = customerData;
  let customer;
  let { data, error: customerError } = await supabase
    .from('customers')
    .update(cleanCustomerPayload)
    .eq('id', customerId)
    .select()
    .single();

  // Fallback if address, sales_id, or created_by column is missing in Supabase schema
  if (customerError && (customerError.code === '42703' || customerError.message?.includes('address') || customerError.message?.includes('sales_id') || customerError.message?.includes('created_by') || customerError.message?.includes('schema cache'))) {
    const { address, created_by, sales_id, bu_id, ...cleanData } = cleanCustomerPayload;
    const retry = await supabase
      .from('customers')
      .update(cleanData)
      .eq('id', customerId)
      .select()
      .single();
    if (retry.error) throw retry.error;
    customer = retry.data;
  } else if (customerError) {
    throw customerError;
  } else {
    customer = data;
  }

  // 2. Sync multiple PICs
  if (Array.isArray(picData)) {
    const { data: existingPics } = await supabase
      .from('customer_pics')
      .select('id')
      .eq('customer_id', customerId);

    const existingPicIds = (existingPics || []).map(p => p.id);
    const currentPicIds = picData.filter(p => p.id).map(p => p.id);
    const toDeleteIds = existingPicIds.filter(id => !currentPicIds.includes(id));

    if (toDeleteIds.length > 0) {
      await supabase.from('customer_pics').delete().in('id', toDeleteIds);
    }

    for (let idx = 0; idx < picData.length; idx++) {
      const p = picData[idx];
      const isPrimary = p.is_primary ?? (idx === 0);
      const picPayload = {
        name: p.name,
        email: p.email || null,
        phone: p.phone || null,
        is_primary: isPrimary,
        ...(p.sales_id ? { sales_id: p.sales_id } : {}),
      };

      if (p.id) {
        let { error: updateErr } = await supabase
          .from('customer_pics')
          .update(picPayload)
          .eq('id', p.id);

        if (updateErr && (updateErr.code === '42703' || updateErr.message?.includes('sales_id'))) {
          const { sales_id, ...payloadWithoutSales } = picPayload;
          await supabase
            .from('customer_pics')
            .update(payloadWithoutSales)
            .eq('id', p.id);
        }
      } else {
        let { error: insertErr } = await supabase
          .from('customer_pics')
          .insert([{
            customer_id: customerId,
            ...picPayload
          }]);

        if (insertErr && (insertErr.code === '42703' || insertErr.message?.includes('sales_id'))) {
          const { sales_id, ...payloadWithoutSales } = picPayload;
          await supabase
            .from('customer_pics')
            .insert([{
              customer_id: customerId,
              ...payloadWithoutSales
            }]);
        }
      }
    }
  }

  return customer;
}

// ============================================
// BRANDS & PRODUCTS
// ============================================

export async function getBrands() {
  const { data, error } = await supabase
    .from('brands')
    .select('*')
    .order('name');
    
  if (error) throw error;
  return data;
}

export async function createBrand(brandData) {
  const { data, error } = await supabase
    .from('brands')
    .insert([brandData])
    .select()
    .single();
    
  if (error) throw error;
  return data;
}

export async function updateBrand(id, brandData) {
  const { data, error } = await supabase
    .from('brands')
    .update(brandData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteBrand(id) {
  const { error } = await supabase
    .from('brands')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function getProducts() {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      brand:brands(name, color_hex)
    `)
    .order('sku');
    
  if (error) throw error;
  return data;
}

export async function createProduct(productData) {
  const { data, error } = await supabase
    .from('products')
    .insert([productData])
    .select()
    .single();
    
  if (error) throw error;
  return data;
}

export async function updateProduct(sku, productData) {
  const { data, error } = await supabase
    .from('products')
    .update(productData)
    .eq('sku', sku)
    .select()
    .single();
    
  if (error) throw error;
  return data;
}

export async function deleteProduct(sku) {
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('sku', sku);
    
  if (error) throw error;
  return true;
}

export async function deleteProducts(skus) {
  const { error } = await supabase
    .from('products')
    .delete()
    .in('sku', skus);
    
  if (error) throw error;
  return true;
}

/**
 * Batch upsert products by SKU.
 * If SKU exists → update. If new → insert.
 * @param {Array} productsArray - array of product objects
 * @returns {{ inserted: number, updated: number, errors: Array }}
 */
export async function upsertProducts(productsArray) {
  if (!productsArray || productsArray.length === 0) return { inserted: 0, updated: 0, errors: [] };

  // Fetch existing SKUs to differentiate insert vs update
  const skus = productsArray.map(p => p.sku);
  const { data: existing } = await supabase.from('products').select('sku').in('sku', skus);
  const existingSkuSet = new Set((existing || []).map(e => e.sku));

  const toInsert = productsArray.filter(p => !existingSkuSet.has(p.sku));
  const toUpdate = productsArray.filter(p => existingSkuSet.has(p.sku));

  const errors = [];
  let inserted = 0;
  let updated = 0;

  // Insert new products
  if (toInsert.length > 0) {
    const { error } = await supabase.from('products').insert(toInsert);
    if (error) errors.push({ phase: 'insert', message: error.message });
    else inserted = toInsert.length;
  }

  // Update existing products one by one to capture individual errors
  for (const prod of toUpdate) {
    const { sku, ...rest } = prod;
    const { error } = await supabase.from('products').update(rest).eq('sku', sku);
    if (error) errors.push({ sku, message: error.message });
    else updated++;
  }

  return { inserted, updated, errors };
}


/**
 * Upload gambar produk ke server cPanel via PHP endpoint.
 * Di development (Vite), request di-proxy ke plugin lokal.
 * Di production (cPanel), request dikirim ke VITE_UPLOAD_URL.
 */
export async function uploadProductImage(file, sku = 'prod', oldUrl = null) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const base64 = ev.target.result;
        const ext = (file.name || 'image.png').split('.').pop();
        const cleanSku = (sku || 'prod').toLowerCase().replace(/[^a-z0-9_-]/g, '');
        const filename = `${cleanSku}-${Date.now()}.${ext}`;

        // Gunakan VITE_UPLOAD_URL di production (cPanel), paksa fallback ke /api/upload-local di dev (lokal)
        const uploadEndpoint = (import.meta.env.PROD && import.meta.env.VITE_UPLOAD_URL) 
          ? import.meta.env.VITE_UPLOAD_URL 
          : '/api/upload-local';

        const res = await fetch(uploadEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64, filename, old_url: oldUrl }),
        });

        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson.error || `Upload gagal (HTTP ${res.status})`);
        }

        const data = await res.json();
        resolve(data.url); // e.g. /images/prod-sku-123.png atau https://domain.com/images/...
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    reader.readAsDataURL(file);
  });
}

export async function deleteProductImage(url) {
  if (!url) return true;
  try {
    const uploadEndpoint = import.meta.env.VITE_UPLOAD_URL || '/api/upload-local';
    await fetch(uploadEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', url }),
    });
    return true;
  } catch (err) {
    console.warn('Delete product image warning:', err.message);
    return false;
  }
}

// ============================================
// QUOTATIONS
// ============================================
export async function getDashboardStats() {
  const { data: quotations, error } = await supabase
    .from('quotations')
    .select('status, quotation_items(qty, price)');

  if (error) throw error;

  let totalQuotation = quotations.length;
  let approvedCount = 0;
  let pendingCount = 0;
  let grandTotal = 0;

  quotations.forEach(q => {
    if (q.status === 'approved') approvedCount++;
    if (q.status === 'sent') pendingCount++;
    
    // Calculate simple grand total from items
    if (q.quotation_items) {
      q.quotation_items.forEach(item => {
        grandTotal += (item.qty * item.price);
      });
    }
  });

  return { totalQuotation, approvedCount, pendingCount, grandTotal };
}

export async function getQuotations() {
  const { data: quotations, error } = await supabase
    .from('quotations')
    .select(`
      *,
      customer:customers(*, pics:customer_pics(*)),
      pic:customer_pics(name, phone, email),
      items:quotation_items(
        *,
        product:products(sku, name, modal, pricelist_distributor, diskon_distributor, image_url, description, brand:brands(name, color_hex))
      )
    `)
    .order('created_at', { ascending: false });
    
  if (error) throw error;
  let activeQuotations = (quotations || []).filter(q => !q.is_deleted && q.status !== 'deleted');
  if (activeQuotations.length === 0) return [];

  // Auto-expire past quotations
  const todayStr = new Date().toISOString().slice(0, 10);
  const expiredIdsToUpdate = [];
  activeQuotations.forEach(q => {
    const expDateStr = (q.expired || q.expired_at || '').slice(0, 10);
    if (expDateStr && expDateStr < todayStr && (q.status === 'sent' || q.status === 'created' || q.status === 'draft')) {
      q.status = 'expired';
      expiredIdsToUpdate.push(q.id);
    }
  });

  if (expiredIdsToUpdate.length > 0) {
    supabase.from('quotations').update({ status: 'expired' }).in('id', expiredIdsToUpdate).then(() => {});
  }

  // Fallback pic to primary PIC of customer if q.pic is null
  activeQuotations.forEach(q => {
    if (!q.pic && q.customer?.pics && q.customer.pics.length > 0) {
      q.pic = q.customer.pics.find(p => p.is_primary) || q.customer.pics[0];
    }
  });

  // Fetch all users to resolve creator by ID, sales_code, or ID prefix (e.g. Q05)
  const { data: users } = await supabase.from('users').select('id, name, email, signature_url, mobile, sales_code');
  const userById = new Map(users?.map(u => [u.id, u]) || []);
  const userByCode = new Map(users?.filter(u => u.sales_code).map(u => [u.sales_code.trim().toUpperCase(), u]) || []);

  activeQuotations.forEach(q => {
    let matchedUser = userById.get(q.sales_id || q.created_by);

    if (!matchedUser && q.sales_code) {
      matchedUser = userByCode.get(q.sales_code.trim().toUpperCase());
    }

    if (!matchedUser && q.id && q.id.includes('.')) {
      const prefix = q.id.split('.')[0].trim().toUpperCase();
      matchedUser = userByCode.get(prefix);
    }

    if (!matchedUser && q.sales_name) {
      matchedUser = { name: q.sales_name };
    }

    q.creator = matchedUser || (q.id && q.id.includes('.') ? { name: q.id.split('.')[0].trim().toUpperCase() } : null);
  });

  return activeQuotations;
}

export async function getQuotationsByUser(userId) {
  const { data: quotations, error } = await supabase
    .from('quotations')
    .select(`
      *,
      customer:customers(*, pics:customer_pics(*)),
      pic:customer_pics(name, phone, email),
      items:quotation_items(
        *,
        product:products(sku, name, modal, pricelist_distributor, diskon_distributor, image_url, description, brand:brands(name, color_hex))
      )
    `)
    .eq('sales_id', userId)
    .order('created_at', { ascending: false });
    
  if (error) throw error;
  if (!quotations || quotations.length === 0) return [];

  // Auto-expire past quotations
  const todayStr = new Date().toISOString().slice(0, 10);
  const expiredIdsToUpdate = [];
  quotations.forEach(q => {
    const expDateStr = (q.expired || q.expired_at || '').slice(0, 10);
    if (expDateStr && expDateStr < todayStr && (q.status === 'sent' || q.status === 'created' || q.status === 'draft')) {
      q.status = 'expired';
      expiredIdsToUpdate.push(q.id);
    }
  });

  if (expiredIdsToUpdate.length > 0) {
    supabase.from('quotations').update({ status: 'expired' }).in('id', expiredIdsToUpdate).then(() => {});
  }

  // Fallback pic to primary PIC of customer if q.pic is null
  quotations.forEach(q => {
    if (!q.pic && q.customer?.pics && q.customer.pics.length > 0) {
      q.pic = q.customer.pics.find(p => p.is_primary) || q.customer.pics[0];
    }
  });

  const creatorIds = [...new Set(quotations.map(q => q.sales_id || q.created_by).filter(Boolean))];
  if (creatorIds.length > 0) {
    const { data: users } = await supabase.from('users').select('id, name, email, signature_url, mobile').in('id', creatorIds);
    const userMap = new Map(users?.map(u => [u.id, u]) || []);
    quotations.forEach(q => {
      q.creator = userMap.get(q.sales_id || q.created_by) || null;
    });
  }

  return quotations;
}

export async function getSalesUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('name');
    
  if (error) throw error;
  return data;
}

export async function createQuotation(quotationData, itemsData) {
  // Format nomor quotation sesuai sales_code pengguna: [SALES_CODE].MMYY.XXX (misal: Q05.0826.036 atau Q01.0826.123)
  const generateMockupQuoId = () => {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yy = String(now.getFullYear()).slice(-2);
    const seq = String(Math.floor(100 + Math.random() * 900));
    
    // Ambil sales_code dari quotationData jika ada, atau fallback ke QO5
    const prefix = quotationData.sales_code ? quotationData.sales_code.trim().toUpperCase() : 'QO5';
    return `${prefix}.${mm}${yy}.${seq}`;
  };

  // Hapus sales_code dari payload insert ke database jika kolomnya tidak ada di tabel quotations
  const { sales_code, ...cleanQuotationPayload } = quotationData;

  const quoDataWithId = {
    id: quotationData.id || generateMockupQuoId(),
    ...cleanQuotationPayload,
  };

  // 1. Insert Quotation
  const { data: quotation, error: quoError } = await supabase
    .from('quotations')
    .insert([quoDataWithId])
    .select()
    .single();
    
  if (quoError) throw quoError;

  // 2. Insert Items — only include columns in DB schema:
  // quotation_id, sku (FK->products nullable), qty, price, margin, sort_order
  if (itemsData && itemsData.length > 0) {
    const itemsToInsert = itemsData.map((i, idx) => ({
      quotation_id: quotation.id,
      sku: i.sku || null,
      qty: Number(i.qty) || 1,
      hpp: Number(i.hpp) || 0,
      price: Number(i.price) || 0,
      margin: Number(i.margin) || 0,
      is_pph_applied: Boolean(i.is_pph_applied),
      sort_order: i.sort_order || (idx + 1),
    }));
    const { error: itemsError } = await supabase
      .from('quotation_items')
      .insert(itemsToInsert);
      
    if (itemsError) throw itemsError;
  }
  
  return quotation;
}

// ============================================
// COMPANY & SYSTEM CONFIG
// ============================================

export async function getCompanyBankAccounts() {
  const { data, error } = await supabase
    .from('company_bank_accounts')
    .select('*')
    .order('is_default', { ascending: false });
    
  if (error) throw error;
  return data;
}

// ============================================
// TRASH & SOFT DELETE MANAGEMENT
// ============================================
export async function getTrashQuotations() {
  try {
    // 1. Query by is_deleted = true
    const { data: d1 } = await supabase
      .from('quotations')
      .select(`
        *,
        customer:customers(*, pics:customer_pics(*)),
        pic:customer_pics(name, phone, email),
        items:quotation_items(
          *,
          product:products(sku, name, modal, pricelist_distributor, diskon_distributor, image_url, description, brand:brands(name, color_hex))
        )
      `)
      .eq('is_deleted', true);

    // 2. Query by status = 'deleted'
    const { data: d2 } = await supabase
      .from('quotations')
      .select(`
        *,
        customer:customers(*, pics:customer_pics(*)),
        pic:customer_pics(name, phone, email),
        items:quotation_items(
          *,
          product:products(sku, name, modal, pricelist_distributor, diskon_distributor, image_url, description, brand:brands(name, color_hex))
        )
      `)
      .eq('status', 'deleted');

    const map = new Map();
    (d1 || []).forEach(q => map.set(q.id, q));
    (d2 || []).forEach(q => map.set(q.id, q));
    const quotations = Array.from(map.values());

    if (quotations.length === 0) return [];

    const creatorIds = [...new Set(quotations.map(q => q.sales_id || q.created_by).filter(Boolean))];
    if (creatorIds.length > 0) {
      const { data: users } = await supabase.from('users').select('id, name, email').in('id', creatorIds);
      const userMap = new Map(users?.map(u => [u.id, u]) || []);
      quotations.forEach(q => {
        q.creator = userMap.get(q.sales_id || q.created_by) || null;
      });
    }

    return quotations;
  } catch (err) {
    console.error('Error fetching trash quotations:', err);
    return [];
  }
}

export async function restoreQuotation(id) {
  const { data, error } = await supabase
    .from('quotations')
    .update({ is_deleted: false, deleted_at: null, status: 'created' })
    .eq('id', id)
    .select();

  if (error) throw error;
  return data;
}

export async function hardDeleteQuotation(id) {
  await supabase.from('quotation_items').delete().eq('quotation_id', id);
  const { data, error } = await supabase.from('quotations').delete().eq('id', id);
  if (error) throw error;
  return data;
}

// ============================================
// SYSTEM SETTINGS / MAINTENANCE MODE
// ============================================

export async function getMaintenanceMode() {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'maintenance_mode')
      .maybeSingle();

    if (error) {
      console.warn('Error fetching maintenance mode settings:', error);
      return { enabled: false, domains: [] };
    }

    if (!data || !data.value) {
      return { enabled: false, domains: [] };
    }

    return {
      enabled: !!data.value.enabled,
      domains: Array.isArray(data.value.domains) ? data.value.domains : []
    };
  } catch (err) {
    console.error('Failed to get maintenance mode:', err);
    return { enabled: false, domains: [] };
  }
}

export async function setMaintenanceMode(settings) {
  const payload = {
    key: 'maintenance_mode',
    value: {
      enabled: !!settings.enabled,
      domains: Array.isArray(settings.domains) ? settings.domains.map(d => d.trim().toLowerCase()).filter(Boolean) : []
    },
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('system_settings')
    .upsert(payload, { onConflict: 'key' })
    .select()
    .single();

  if (error) throw error;
  return data.value;
}

export async function getCompanyInfoSettings() {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'company_info')
      .maybeSingle();

    if (error || !data || !data.value) return null;
    return data.value;
  } catch (err) {
    console.error('Failed to load company_info from system_settings:', err);
    return null;
  }
}

export async function saveCompanyInfoSettings(info) {
  const payload = {
    key: 'company_info',
    value: info,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('system_settings')
    .upsert(payload, { onConflict: 'key' })
    .select()
    .single();

  if (error) throw error;
  return data.value;
}

export async function getMasterTermsSettings() {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'master_terms')
      .maybeSingle();

    if (error || !data || !data.value) return null;
    return data.value;
  } catch (err) {
    console.error('Failed to load master_terms from system_settings:', err);
    return null;
  }
}

export async function saveMasterTermsSettings(templates) {
  const payload = {
    key: 'master_terms',
    value: templates,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('system_settings')
    .upsert(payload, { onConflict: 'key' })
    .select()
    .single();

  if (error) throw error;
  return data.value;
}


// ============================================
// BUSINESS UNITS (BU)
// ============================================

/** Ambil semua Business Units beserta jumlah anggota */
export async function getBusinessUnits() {
  try {
    const { data, error } = await supabase
      .from('business_units')
      .select(`
        *,
        members:business_unit_members(
          id,
          user_id,
          role_in_bu,
          joined_at,
          user:users(id, name, email, role, sales_code)
        )
      `)
      .order('name');

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('getBusinessUnits error:', err);
    return [];
  }
}

/** Ambil satu BU berdasarkan ID */
export async function getBusinessUnitById(buId) {
  const { data, error } = await supabase
    .from('business_units')
    .select(`
      *,
      members:business_unit_members(
        id,
        user_id,
        role_in_bu,
        joined_at,
        user:users(id, name, email, role, sales_code)
      )
    `)
    .eq('id', buId)
    .single();

  if (error) throw error;
  return data;
}

/** Ambil BU dari user yang sedang login (1 user = 1 BU) */
export async function getUserBU(userId) {
  try {
    const { data, error } = await supabase
      .from('business_unit_members')
      .select(`
        role_in_bu,
        joined_at,
        business_unit:business_units(*)
      `)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.warn('getUserBU error:', error);
      return null;
    }
    if (!data) return null;

    return {
      ...data.business_unit,
      role_in_bu: data.role_in_bu,
    };
  } catch (err) {
    console.error('getUserBU exception:', err);
    return null;
  }
}

/** Buat Business Unit baru */
export async function createBusinessUnit({ name, code, color, description }) {
  const { data, error } = await supabase
    .from('business_units')
    .insert([{
      name: name.trim(),
      code: code.trim().toUpperCase(),
      color: color || '#6366f1',
      description: description?.trim() || null,
      is_active: true,
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/** Update Business Unit */
export async function updateBusinessUnit(buId, { name, code, color, description, is_active }) {
  const updatePayload = {};
  if (name !== undefined)        updatePayload.name        = name.trim();
  if (code !== undefined)        updatePayload.code        = code.trim().toUpperCase();
  if (color !== undefined)       updatePayload.color       = color;
  if (description !== undefined) updatePayload.description = description?.trim() || null;
  if (is_active !== undefined)   updatePayload.is_active   = is_active;
  updatePayload.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('business_units')
    .update(updatePayload)
    .eq('id', buId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/** Hapus Business Unit */
export async function deleteBusinessUnit(buId) {
  const { error } = await supabase
    .from('business_units')
    .delete()
    .eq('id', buId);

  if (error) throw error;
  return true;
}

/** Tambah anggota ke BU (hapus dari BU lama dulu karena 1 user = 1 BU) */
export async function addBUMember(buId, userId, roleInBu = 'member') {
  // Hapus dari BU lama dulu jika ada
  await supabase
    .from('business_unit_members')
    .delete()
    .eq('user_id', userId);

  // Insert ke BU baru
  const { data, error } = await supabase
    .from('business_unit_members')
    .insert([{ business_unit_id: buId, user_id: userId, role_in_bu: roleInBu }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/** Hapus anggota dari BU */
export async function removeBUMember(buId, userId) {
  const { error } = await supabase
    .from('business_unit_members')
    .delete()
    .eq('business_unit_id', buId)
    .eq('user_id', userId);

  if (error) throw error;
  return true;
}

/** Ambil semua user yang belum masuk BU manapun */
export async function getUsersWithoutBU() {
  try {
    // Ambil semua user_id yang sudah punya BU
    const { data: memberData } = await supabase
      .from('business_unit_members')
      .select('user_id');

    const assignedUserIds = (memberData || []).map(m => m.user_id);

    // Ambil users yang tidak ada di list tersebut
    let query = supabase.from('users').select('id, name, email, role, sales_code').order('name');
    if (assignedUserIds.length > 0) {
      query = query.not('id', 'in', `(${assignedUserIds.join(',')})`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('getUsersWithoutBU error:', err);
    return [];
  }
}

/** Ambil quotations berdasarkan BU ID (untuk filter per BU di Manager/Admin) */
export async function getQuotationsByBU(buId) {
  try {
    if (!buId) return [];

    // 1. Ambil data BU dan anggotanya
    const { data: bu } = await supabase
      .from('business_units')
      .select('code, members:business_unit_members(user_id)')
      .eq('id', buId)
      .maybeSingle();

    const memberIds = (bu?.members || []).map(m => m.user_id).filter(Boolean);
    const buCode = bu?.code;

    // 2. Ambil semua active quotations
    const { data: quotations, error } = await supabase
      .from('quotations')
      .select(`
        *,
        customer:customers(*, pics:customer_pics(*)),
        pic:customer_pics(name, phone, email),
        items:quotation_items(
          *,
          product:products(sku, name, modal, pricelist_distributor, diskon_distributor, image_url, description, brand:brands(name, color_hex))
        )
      `)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!quotations) return [];

    // 3. Filter quotation yang milik BU ini: bu_id, sales_id member, atau prefix ID
    return quotations.filter(q => {
      if (q.bu_id === buId) return true;
      if (memberIds.length > 0 && memberIds.includes(q.sales_id || q.created_by)) return true;
      if (buCode && (q.id?.toUpperCase().startsWith(buCode.toUpperCase() + '.') || q.id?.toUpperCase().startsWith(buCode.toUpperCase()))) return true;
      return false;
    });
  } catch (err) {
    console.error('getQuotationsByBU error:', err);
    return [];
  }
}

// ============================================
// ACTIVITY LOGS
// ============================================

export async function logActivity({ userId, action, entityType, entityId, description }) {
  try {
    const { error } = await supabase.from('activity_logs').insert([{
      user_id: userId,
      action,
      entity_type: entityType || null,
      entity_id: entityId || null,
      description: description || null,
    }]);
    if (error) console.warn('[logActivity] error:', error.message);
  } catch (err) {
    console.warn('[logActivity] exception:', err);
  }
}

export async function getActivityLogs(userId, limit = 30) {
  try {
    let query = supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (userId) query = query.eq('user_id', userId);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('[getActivityLogs] error:', err);
    return [];
  }
}

// ============================================
// NOTIFICATIONS
// ============================================

export async function createNotification({ userId, title, message, link }) {
  try {
    const { error } = await supabase.from('notifications').insert([{
      user_id: userId,
      title,
      message,
      link: link || null,
      is_read: false,
    }]);
    if (error) console.warn('[createNotification] error:', error.message);
  } catch (err) {
    console.warn('[createNotification] exception:', err);
  }
}

export async function getNotifications(userId) {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('[getNotifications] error:', err);
    return [];
  }
}

export async function markNotificationAsRead(id) {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);
    if (error) throw error;
  } catch (err) {
    console.warn('[markNotificationAsRead] error:', err);
  }
}

export async function markAllNotificationsAsRead(userId) {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    if (error) throw error;
  } catch (err) {
    console.warn('[markAllNotificationsAsRead] error:', err);
  }
}

export async function deleteNotification(id) {
  try {
    const { error } = await supabase.from('notifications').delete().eq('id', id);
    if (error) throw error;
  } catch (err) {
    console.warn('[deleteNotification] error:', err);
  }
}
