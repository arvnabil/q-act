<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Lead;
use App\Models\LeadPic;
use App\Models\Quotation;
use App\Models\SalesOrder;
use App\Models\SystemSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class P0HotfixTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $perms = [
            'leads_view', 'leads_view_bu', 'leads_view_all',
            'leads_manage', 'leads_manage_bu', 'leads_manage_all',
            'sales_orders_view', 'sales_orders_edit',
        ];
        foreach ($perms as $p) {
            Permission::findOrCreate($p);
        }

        $salesRole = Role::findOrCreate('Sales');
        $salesRole->syncPermissions(['leads_view', 'leads_manage', 'sales_orders_view', 'sales_orders_edit']);

        $adminRole = Role::findOrCreate('Administrator');
        $adminRole->syncPermissions(Permission::all());
    }

    public function test_sales_cannot_modify_other_sales_lead(): void
    {
        $sales1 = User::factory()->create();
        $sales1->assignRole('Sales');

        $sales2 = User::factory()->create();
        $sales2->assignRole('Sales');

        $leadSales2 = Lead::create([
            'title' => 'Project Alpha',
            'sales_id' => $sales2->id,
            'created_by' => $sales2->id,
            'stage' => 'lead_masuk',
        ]);

        // 1. updateStage unauthorized (should be 403 or 404)
        $response = $this->actingAs($sales1)->patchJson("/leads/{$leadSales2->id}/stage", [
            'stage' => 'follow_up',
        ]);
        $this->assertTrue(in_array($response->status(), [403, 404]), "Expected 403 or 404, got {$response->status()}");

        // 2. storePic unauthorized
        $responsePic = $this->actingAs($sales1)->post("/leads/{$leadSales2->id}/pics", [
            'name' => 'Intruder PIC',
            'role' => 'technical',
        ]);
        $this->assertTrue(in_array($responsePic->status(), [403, 404]), "Expected 403 or 404, got {$responsePic->status()}");

        // 3. destroyPic unauthorized
        $pic = LeadPic::create([
            'lead_id' => $leadSales2->id,
            'name' => 'Original PIC',
            'role' => 'primary',
            'created_by' => $sales2->id,
        ]);
        $responseDelPic = $this->actingAs($sales1)->delete("/leads/{$leadSales2->id}/pics/{$pic->id}");
        $this->assertTrue(in_array($responseDelPic->status(), [403, 404]), "Expected 403 or 404, got {$responseDelPic->status()}");

        // 4. destroy unauthorized
        $responseDestroy = $this->actingAs($sales1)->delete("/leads/{$leadSales2->id}");
        $this->assertTrue(in_array($responseDestroy->status(), [403, 404]), "Expected 403 or 404, got {$responseDestroy->status()}");
    }

    public function test_sales_can_modify_own_lead(): void
    {
        $sales = User::factory()->create();
        $sales->assignRole('Sales');

        $lead = Lead::create([
            'title' => 'Project Beta',
            'sales_id' => $sales->id,
            'created_by' => $sales->id,
            'stage' => 'lead_masuk',
        ]);

        // 1. updateStage authorized
        $response = $this->actingAs($sales)->patchJson("/leads/{$lead->id}/stage", [
            'stage' => 'follow_up',
        ]);
        $response->assertOk();
        $this->assertEquals('follow_up', $lead->fresh()->stage);

        // 2. storePic authorized
        $responsePic = $this->actingAs($sales)->post("/leads/{$lead->id}/pics", [
            'name' => 'Own PIC',
            'role' => 'primary',
        ]);
        $responsePic->assertRedirect();
        $this->assertDatabaseHas('lead_pics', ['lead_id' => $lead->id, 'name' => 'Own PIC']);

        // 3. destroy authorized
        $responseDestroy = $this->actingAs($sales)->delete("/leads/{$lead->id}");
        $responseDestroy->assertRedirect();
        $this->assertTrue((bool) $lead->fresh()->is_archived);
    }

    public function test_sales_order_store_cost_calculates_grand_total_correctly(): void
    {
        $user = User::factory()->create();
        $user->assignRole('Administrator');

        $customer = Customer::create([
            'id' => 'CUST001',
            'name' => 'Test Customer',
        ]);

        $quotation = Quotation::create([
            'id' => 'Q01.0001',
            'sales_id' => $user->id,
            'customer_id' => $customer->id,
            'version' => 1,
            'date' => now()->toDateString(),
            'expired' => now()->addMonth()->toDateString(),
            'status' => 'approved',
            'subtotal' => 10000000,
            'grand_total' => 10000000,
        ]);

        $so = SalesOrder::create([
            'id' => 'SO.Q01.0001',
            'quotation_id' => $quotation->id,
            'sales_id' => $user->id,
            'customer_id' => $customer->id,
            'date' => now()->toDateString(),
            'status' => 'Pending',
            'total_item_value' => 10000000,
            'total_cost' => 0,
            'grand_total' => 10000000,
        ]);

        \App\Models\SalesOrderItem::create([
            'so_id' => $so->id,
            'item_name' => 'Produk A',
            'qty' => 10,
            'price' => 1000000,
        ]);

        // Add Cost: Rp 500.000
        $response = $this->actingAs($user)->post("/sales-orders/{$so->id}/costs", [
            'description' => 'Ongkos Kirim',
            'amount' => 500000,
        ]);
        $response->assertRedirect();

        $so->refresh();
        $this->assertEquals(500000, (float) $so->total_cost);
        $this->assertEquals(10500000, (float) $so->grand_total);

        // Delete Cost
        $cost = $so->costs()->first();
        $responseDel = $this->actingAs($user)->delete("/sales-orders/{$so->id}/costs/{$cost->id}");
        $responseDel->assertRedirect();

        $so->refresh();
        $this->assertEquals(0, (float) $so->total_cost);
        $this->assertEquals(10000000, (float) $so->grand_total);
    }

    public function test_zoom_webhook_requires_valid_hmac_signature(): void
    {
        SystemSetting::updateOrCreate(
            ['key' => 'zoom_credentials'],
            ['value' => ['webhook_secret_token' => 'my-secret-token-123']]
        );

        $payload = json_encode([
            'event' => 'meeting.ended',
            'payload' => ['object' => ['id' => '123456']],
        ]);

        // 1. Missing signature -> 401
        $resNoSig = $this->postJson('/webhooks/zoom', json_decode($payload, true));
        $resNoSig->assertStatus(401);

        // 2. Invalid signature -> 401
        $timestamp = (string) time();
        $resBadSig = $this->withHeaders([
            'x-zm-request-timestamp' => $timestamp,
            'x-zm-signature' => 'v0=bad_hash',
        ])->postJson('/webhooks/zoom', json_decode($payload, true));
        $resBadSig->assertStatus(401);

        // 3. Valid signature -> 200
        $message = 'v0:' . $timestamp . ':' . $payload;
        $validHash = 'v0=' . hash_hmac('sha256', $message, 'my-secret-token-123');

        $resValid = $this->call(
            'POST',
            '/webhooks/zoom',
            [],
            [],
            [],
            [
                'HTTP_x-zm-request-timestamp' => $timestamp,
                'HTTP_x-zm-signature' => $validHash,
                'CONTENT_TYPE' => 'application/json',
            ],
            $payload
        );

        $resValid->assertStatus(200);
        $resValid->assertJson(['status' => 'success']);
    }
}
