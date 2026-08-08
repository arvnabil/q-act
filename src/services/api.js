import { supabase } from './supabase.js';

// ============================================
// CUSTOMERS & PICS
// ============================================

export async function getCustomers() {
  let data, error;
  const resWithSales = await supabase
    .from('customers')
    .select(`
      *,
      pics:customer_pics(*, sales:users(id, name, email)),
      quotations(id, status, items:quotation_items(qty, price))
    `)
    .order('name');

  if (resWithSales.error) {
    const resWithoutSales = await supabase
      .from('customers')
      .select(`
        *,
        pics:customer_pics(*),
        quotations(id, status, items:quotation_items(qty, price))
      `)
      .order('name');
    if (resWithoutSales.error) throw resWithoutSales.error;
    data = resWithoutSales.data;
  } else {
    data = resWithSales.data;
  }

  return (data || []).map(c => {
    const qList = c.quotations || [];
    const totalSpend = qList.reduce((acc, q) => {
      const itemSum = (q.items || []).reduce((iAcc, item) => iAcc + ((item.qty || 0) * (item.price || 0)), 0);
      return acc + itemSum;
    }, 0);

    return {
      ...c,
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
  const dataWithId = {
    id: customerData.id || generateShortId('C'),
    ...customerData,
  };

  let customer;
  let { data, error: customerError } = await supabase
    .from('customers')
    .insert([dataWithId])
    .select()
    .single();

  // Fallback if address column is missing in Supabase schema
  if (customerError && (customerError.code === '42703' || customerError.message?.includes('address'))) {
    const { address, ...dataWithoutAddress } = dataWithId;
    const retry = await supabase
      .from('customers')
      .insert([dataWithoutAddress])
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
      const { id, ...rest } = p;
      return {
        ...rest,
        customer_id: customer.id,
      };
    });
    
    let { data: picsData, error: picError } = await supabase
      .from('customer_pics')
      .insert(picsToInsert)
      .select();

    if (picError && (picError.code === '42703' || picError.message?.includes('sales_id'))) {
      const picsWithoutSales = picsToInsert.map(({ sales_id, ...rest }) => rest);
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
  let customer;
  let { data, error: customerError } = await supabase
    .from('customers')
    .update(customerData)
    .eq('id', customerId)
    .select()
    .single();

  // Fallback if address column is missing in Supabase schema
  if (customerError && (customerError.code === '42703' || customerError.message?.includes('address'))) {
    const { address, ...dataWithoutAddress } = customerData;
    const retry = await supabase
      .from('customers')
      .update(dataWithoutAddress)
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


export async function uploadProductImage(file, sku) {
  const fileExt = file.name.split('.').pop();
  const fileName = `${sku}-${Math.random()}.${fileExt}`;
  
  const { error: uploadError } = await supabase.storage
    .from('products')
    .upload(fileName, file);

  if (uploadError) throw uploadError;

  const { data } = supabase.storage
    .from('products')
    .getPublicUrl(fileName);
    
  return data.publicUrl;
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
        product:products(sku, name, image_url, brand:brands(name, color_hex))
      )
    `)
    .order('created_at', { ascending: false });
    
  if (error) throw error;
  if (!quotations || quotations.length === 0) return [];

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

export async function getQuotationsByUser(userId) {
  const { data: quotations, error } = await supabase
    .from('quotations')
    .select(`
      *,
      customer:customers(*, pics:customer_pics(*)),
      pic:customer_pics(name, phone, email),
      items:quotation_items(
        *,
        product:products(sku, name, image_url, brand:brands(name, color_hex))
      )
    `)
    .eq('sales_id', userId)
    .order('created_at', { ascending: false });
    
  if (error) throw error;
  if (!quotations || quotations.length === 0) return [];

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
  // Format nomor quotation sesuai mockup: QO5.MMYY.XXX (misal: QO5.0826.036)
  const generateMockupQuoId = () => {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yy = String(now.getFullYear()).slice(-2);
    const seq = String(Math.floor(100 + Math.random() * 900));
    return `QO5.${mm}${yy}.${seq}`;
  };

  const quoDataWithId = {
    id: quotationData.id || generateMockupQuoId(),
    ...quotationData,
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
      price: Number(i.price) || 0,
      margin: Number(i.margin) || 0,
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
