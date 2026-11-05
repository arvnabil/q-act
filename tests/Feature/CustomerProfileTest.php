<?php
namespace Tests\Feature;

use App\Models\Customer;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class CustomerProfileTest extends TestCase
{
    use RefreshDatabase;

    private function actor(array $permissions): User
    {
        $user = User::factory()->create(['role' => 'Sales', 'is_active' => true]);
        foreach ($permissions as $permission) {
            $user->givePermissionTo(Permission::findOrCreate($permission, 'web'));
        }
        return $user;
    }

    public function test_profile_persists_without_changing_customer_identity(): void
    {
        $user = $this->actor(['customers_view', 'customers_edit']);
        $customer = Customer::create(['id' => 'C1', 'name' => 'Company', 'address' => 'Jakarta', 'created_by' => $user->id]);
        $this->actingAs($user)->put('/customers/C1/profile', [
            'npwp' => '0012345678901234', 'website' => 'https://example.com', 'payment_terms_days' => 0,
            'billing_same_as_office' => true, 'shipping_same_as_office' => false,
            'name' => 'Must not change',
        ])->assertRedirect();
        $customer->refresh();
        $this->assertSame('0012345678901234', $customer->crm_profile['npwp']);
        $this->assertEquals(0, $customer->crm_profile['payment_terms_days']);
        $this->assertSame('Company', $customer->name);
        $this->assertSame('Jakarta', $customer->address);
        $this->get('/customers/C1')->assertOk()->assertInertia(fn ($page) => $page
            ->where('customer.crm_profile.npwp', '0012345678901234'));
    }

    public function test_edit_permission_and_visibility_are_both_required(): void
    {
        $owner = $this->actor(['customers_view']);
        Customer::create(['id' => 'C1', 'name' => 'Private', 'created_by' => $owner->id]);
        $this->actingAs($owner)->putJson('/customers/C1/profile', [])->assertForbidden();
        $other = $this->actor(['customers_view', 'customers_edit']);
        $this->actingAs($other)->putJson('/customers/C1/profile', [])->assertNotFound();
        $this->assertNull(Customer::find('C1')->crm_profile);
    }

    public function test_invalid_profile_fields_are_rejected(): void
    {
        $user = $this->actor(['customers_view', 'customers_edit']);
        Customer::create(['id' => 'C1', 'name' => 'Company', 'created_by' => $user->id]);
        $this->actingAs($user)->putJson('/customers/C1/profile', [
            'website' => 'javascript:alert(1)', 'billing_email' => 'invalid', 'payment_terms_days' => -1,
            'billing_same_as_office' => false, 'shipping_same_as_office' => false,
        ])->assertUnprocessable()->assertJsonValidationErrors(['website', 'billing_email', 'payment_terms_days']);
        $this->assertNull(Customer::find('C1')->crm_profile);
    }

    public function test_company_fields_and_private_document_lifecycle(): void
    {
        \Illuminate\Support\Facades\Storage::fake('local');
        $user = $this->actor(['customers_view', 'customers_edit']);
        $customer = Customer::create(['id' => 'C1', 'name' => 'Company', 'created_by' => $user->id]);
        $payload = ['_method' => 'put', 'billing_same_as_office' => '1', 'shipping_same_as_office' => '0',
            'address' => 'Jakarta baru', 'industry' => 'Industri khusus', 'category' => 'Partner khusus',
            'source' => 'referral', 'anniversary' => '2000-01-02', 'procurement_website' => 'https://example.com/tender',
            'linkedin' => 'https://linkedin.com/company/example'];
        $this->actingAs($user)->post('/customers/C1/profile', $payload + ['npwp_file' => \Illuminate\Http\UploadedFile::fake()->create('npwp.pdf', 100, 'application/pdf')])->assertRedirect();
        $customer->refresh();
        $path = $customer->crm_profile['npwp_document']['path'];
        \Illuminate\Support\Facades\Storage::disk('local')->assertExists($path);
        $this->assertSame('Jakarta baru', $customer->address);
        $this->assertSame('Industri khusus', $customer->crm_profile['industry']);
        $this->assertSame('2000-01-02', $customer->crm_profile['anniversary']);
        $this->get('/customers/C1/npwp-document')->assertOk();
        $other = $this->actor(['customers_view', 'customers_edit']);
        $this->actingAs($other)->get('/customers/C1/npwp-document')->assertNotFound();
        $this->actingAs($user)->post('/customers/C1/profile', $payload)->assertRedirect();
        \Illuminate\Support\Facades\Storage::disk('local')->assertExists($path);
        $this->post('/customers/C1/profile', $payload + ['npwp_file' => \Illuminate\Http\UploadedFile::fake()->create('new.pdf', 100, 'application/pdf')])->assertRedirect();
        \Illuminate\Support\Facades\Storage::disk('local')->assertMissing($path);
        $newPath = $customer->fresh()->crm_profile['npwp_document']['path'];
        $this->post('/customers/C1/profile', $payload + ['remove_npwp_file' => '1'])->assertRedirect();
        \Illuminate\Support\Facades\Storage::disk('local')->assertMissing($newPath);
        $this->post('/customers/C1/profile', $payload + ['npwp_file' => \Illuminate\Http\UploadedFile::fake()->create('big.pdf', 3073, 'application/pdf')])->assertSessionHasErrors('npwp_file');
    }

    public function test_pic_metadata_survives_customer_edit_and_is_scoped(): void
    {
        $user = $this->actor(['customers_view', 'customers_edit']);
        $customer = Customer::create(['id' => 'C1', 'name' => 'Company', 'created_by' => $user->id]);
        $pic = $customer->pics()->create(['name' => 'PIC', 'is_primary' => true]);
        $url = '/customers/C1/pics/'.$pic->id.'/profile';
        $this->actingAs($user)->put($url, ['birthday' => '1990-02-03', 'instagram' => 'https://instagram.com/example'])->assertRedirect();
        $this->put('/customers/C1', ['name' => 'Company', 'pics' => [['id' => $pic->id, 'name' => 'PIC updated', 'is_primary' => true]]])->assertRedirect();
        $this->assertSame('1990-02-03', $pic->fresh()->crm_profile['birthday']);
        $this->assertSame('PIC updated', $pic->fresh()->name);
        $this->putJson($url, ['birthday' => '2999-01-01', 'instagram' => 'javascript:bad'])->assertUnprocessable()->assertJsonValidationErrors(['birthday', 'instagram']);
        $other = $this->actor(['customers_view', 'customers_edit']);
        $this->actingAs($other)->putJson($url, [])->assertNotFound();
        Customer::create(['id' => 'C2', 'name' => 'Second', 'created_by' => $user->id]);
        $this->actingAs($user)->putJson('/customers/C2/pics/'.$pic->id.'/profile', [])->assertNotFound();
    }

    public function test_can_update_and_delete_pic_directly(): void
    {
        $user = $this->actor(['customers_view', 'customers_edit']);
        $customer = Customer::create(['id' => 'C1', 'name' => 'Company', 'created_by' => $user->id]);
        $pic1 = $customer->pics()->create(['name' => 'Budi', 'email' => 'budi@test.com', 'is_primary' => true]);
        $pic2 = $customer->pics()->create(['name' => 'Siti', 'email' => 'siti@test.com', 'is_primary' => false]);

        // Update pic2 details and promote to primary
        $this->actingAs($user)->put(route('customers.pics.update', ['customer' => 'C1', 'pic' => $pic2->id]), [
            'name' => 'Siti Rahma',
            'position' => 'Purchasing Manager',
            'email' => 'siti.rahma@test.com',
            'phone' => '08123456789',
            'is_primary' => true,
            'birthday' => '1992-05-10',
            'linkedin' => 'https://linkedin.com/in/sitirahma',
        ])->assertRedirect();

        $freshPic2 = $pic2->fresh();
        $this->assertSame('Siti Rahma', $freshPic2->name);
        $this->assertSame('Purchasing Manager', $freshPic2->position);
        $this->assertSame('siti.rahma@test.com', $freshPic2->email);
        $this->assertSame('08123456789', $freshPic2->phone);
        $this->assertTrue($freshPic2->is_primary);
        $this->assertSame('1992-05-10', $freshPic2->crm_profile['birthday']);
        $this->assertSame('https://linkedin.com/in/sitirahma', $freshPic2->crm_profile['linkedin']);

        // Check pic1 is no longer primary
        $this->assertFalse($pic1->fresh()->is_primary);

        // Delete pic1
        $this->actingAs($user)->delete(route('customers.pics.destroy', ['customer' => 'C1', 'pic' => $pic1->id]))
            ->assertRedirect();
        $this->assertDatabaseMissing('customer_pics', ['id' => $pic1->id]);

        // Attempt to delete last remaining pic (pic2) should be rejected
        $this->actingAs($user)->delete(route('customers.pics.destroy', ['customer' => 'C1', 'pic' => $pic2->id]))
            ->assertStatus(422);
    }
}
