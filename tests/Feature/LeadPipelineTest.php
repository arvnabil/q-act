<?php

namespace Tests\Feature;

use App\Models\Lead;
use App\Models\SystemSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LeadPipelineTest extends TestCase
{
    use RefreshDatabase;

    private function makeUser(string $role = 'Sales'): User
    {
        return User::factory()->create([
            'role' => $role,
            'name' => 'Test User ' . $role,
            'email' => strtolower($role) . '_' . uniqid() . '@example.com',
        ]);
    }

    public function test_leads_can_be_created_with_new_default_stage(): void
    {
        $sales = $this->makeUser('Sales');

        $response = $this->actingAs($sales)->post(route('leads.store'), [
            'title' => 'Pengadaan Laptop Kantor',
            'customer_name' => 'PT Sukses Mandiri',
            'contact_name' => 'Budi Santoso',
            'contact_phone' => '081234567890',
            'stage' => 'lead_masuk',
            'estimated_value' => 50000000,
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('leads', [
            'title' => 'Pengadaan Laptop Kantor',
            'customer_name' => 'PT Sukses Mandiri',
            'stage' => 'lead_masuk',
        ]);
    }

    public function test_lead_stage_can_be_updated_dynamically(): void
    {
        $sales = $this->makeUser('Sales');
        $lead = Lead::create([
            'title' => 'Pengadaan Server',
            'customer_name' => 'PT Digital Solusi',
            'sales_id' => $sales->id,
            'created_by' => $sales->id,
            'stage' => 'lead_masuk',
            'status' => 'active',
            'estimated_value' => 100000000,
        ]);

        $response = $this->actingAs($sales)->patch(route('leads.stage.update', $lead), [
            'stage' => 'negotiation',
        ]);

        $response->assertRedirect();
        $this->assertSame('negotiation', $lead->fresh()->stage);
    }

    public function test_moving_lead_to_win_stage_marks_status_converted(): void
    {
        $sales = $this->makeUser('Sales');
        $lead = Lead::create([
            'title' => 'Proyek Switch Cisco',
            'customer_name' => 'PT Jaringan Luas',
            'sales_id' => $sales->id,
            'created_by' => $sales->id,
            'stage' => 'negotiation',
            'status' => 'active',
            'estimated_value' => 75000000,
        ]);

        $response = $this->actingAs($sales)->patch(route('leads.stage.update', $lead), [
            'stage' => 'win',
        ]);

        $response->assertRedirect();
        $freshLead = $lead->fresh();
        $this->assertSame('win', $freshLead->stage);
        $this->assertNotNull($freshLead->converted_at);
        $this->assertNotNull($freshLead->customer_id);
    }

    public function test_pipeline_settings_can_customize_stages(): void
    {
        $admin = $this->makeUser('Administrator');

        $customStages = [
            ['key' => 'lead_masuk', 'name' => 'Lead Masuk', 'type' => 'normal', 'color' => '#94A3B8'],
            ['key' => 'follow_up', 'name' => 'Follow Up', 'type' => 'normal', 'color' => '#3B82F6'],
            ['key' => 'custom_pitch', 'name' => 'Pitching & Demo', 'type' => 'normal', 'color' => '#009680'],
            ['key' => 'win', 'name' => 'Win Deal', 'type' => 'deal', 'color' => '#8B5CF6'],
            ['key' => 'lost', 'name' => 'Lost', 'type' => 'lost', 'color' => '#10B981'],
        ];

        $response = $this->actingAs($admin)->post(route('leads.settings.update'), [
            'stages' => $customStages,
            'featured_stage_1' => 'custom_pitch',
            'featured_stage_2' => 'win',
        ]);

        $response->assertRedirect();

        $saved = SystemSetting::find('lead_pipeline_settings');
        $this->assertNotNull($saved);
        $this->assertCount(5, $saved->value['stages']);
        $this->assertSame('Pitching & Demo', $saved->value['stages'][2]['name']);
    }
}
