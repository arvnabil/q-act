<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\CustomerPic;
use App\Models\LeadPic;
use Illuminate\Validation\ValidationException;

class LeadCustomerInput
{
    public static function prepare($user, array &$data): ?CustomerPic
    {
        $mode = $data['customer_mode'] ?? null;
        $picId = $data['pic_id'] ?? null;
        $picMode = $data['pic_mode'] ?? null;
        unset($data['customer_mode'], $data['pic_id'], $data['pic_mode']);
        $customer = null;
        if ($mode === 'new') {
            abort_unless(DocumentVisibility::allows($user, 'customers_create'), 403);
            $name = trim($data['customer_name'] ?? '');
            validator(['customer_name' => $name], ['customer_name' => 'required|max:255|unique:customers,name'],
                ['customer_name.unique' => 'Customer sudah terdaftar. Pilih Customer Existing.'])->validate();
            do { $id = 'C'.random_int(100000, 999999); } while (Customer::whereKey($id)->exists());
            try {
                $customer = Customer::create(['id' => $id, 'name' => $name, 'address' => $data['customer_address'] ?? null, 'created_by' => $user->id]);
            } catch (\Illuminate\Database\UniqueConstraintViolationException $e) {
                throw ValidationException::withMessages(['customer_name' => 'Customer gagal dibuat karena data duplikat. Pilih customer existing atau coba lagi.']);
            }
            $data['customer_id'] = $customer->id;
        } elseif (!empty($data['customer_id'])) {
            $customer = Customer::findOrFail($data['customer_id']);
            DocumentVisibility::authorize($user, 'customers', $customer);
        }
        if ($customer) {
            $data['customer_name'] = $customer->name;
            $data['customer_address'] = $customer->address;
        }
        $pic = null;
        if ($picMode === 'new' && $customer) {
            abort_unless(DocumentVisibility::allows($user, $mode === 'new' ? 'customers_create' : 'customers_edit'), 403);
            validator($data, ['pic_name' => 'required|string|max:255'])->validate();
            $pic = CustomerPic::create(['customer_id' => $customer->id, 'name' => trim($data['pic_name']),
                'phone' => $data['pic_phone'] ?? null, 'email' => $data['customer_email'] ?? null,
                'is_primary' => !$customer->pics()->exists()]);
        } elseif ($picId && $customer) {
            $pic = CustomerPic::where('customer_id', $customer->id)->find($picId);
            if (!$pic) throw ValidationException::withMessages(['pic_id' => 'PIC harus milik customer yang dipilih.']);
        }
        if ($pic) {
            $data['pic_name'] = $pic->name;
            $data['pic_phone'] = $pic->phone;
            $data['customer_phone'] = $pic->phone;
            $data['customer_email'] = $pic->email;
        }
        return $pic;
    }

    public static function attach($lead, $pic, $user): void
    {
        if ($pic) LeadPic::create(['lead_id' => $lead->id, 'customer_pic_id' => $pic->id, 'name' => $pic->name,
            'phone' => $pic->phone, 'email' => $pic->email, 'role' => 'primary', 'is_primary' => true, 'created_by' => $user->id]);
    }
}
