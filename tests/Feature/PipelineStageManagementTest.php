<?php
namespace Tests\Feature;
use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use App\Models\{User, Lead, LeadActivity, SystemSetting};
class PipelineStageManagementTest extends TestCase
{
    use RefreshDatabase;
    private function setupStages(): array {
        $this->actingAs(User::factory()->create(['role'=>'Administrator', 'is_active'=>true]));
        $stages = collect(['first','second','win'])->map(fn($key)=>['key'=>$key,'name'=>$key,'color'=>'#009680','type'=>$key==='win'?'deal':'normal'])->all();
        SystemSetting::create(['key'=>'lead_pipeline_settings','value'=>['stages'=>$stages,'featured_stage_1'=>'first','featured_stage_2'=>'win']]);
        return $stages;
    }
    public function test_removal_moves_active_and_archived_leads_and_logs_each(): void {
        $stages=$this->setupStages();
        $a=Lead::create(['title'=>'Active','stage'=>'first']);
        $b=Lead::create(['title'=>'Archive','stage'=>'first','is_archived'=>true]);
        $this->postJson('/leads/settings',['stages'=>array_slice($stages,1),'original_stages'=>$stages,'stage_moves'=>['first'=>'win'],'featured_stage_1'=>'win'])->assertOk();
        $this->assertSame('win',$a->fresh()->stage);
        $this->assertSame('win',$b->fresh()->stage);
        $this->assertTrue($b->fresh()->is_archived);
        $this->assertSame(2,LeadActivity::where('type','stage_change')->count());
        $this->assertSame('first',LeadActivity::first()->metadata['from']);
        $this->assertCount(2,SystemSetting::find('lead_pipeline_settings')->value['stages']);
    }
    public function test_invalid_destination_rolls_back_all_moves_and_settings(): void {
        $stages=$this->setupStages();
        $a=Lead::create(['title'=>'A','stage'=>'first']);
        $b=Lead::create(['title'=>'B','stage'=>'second']);
        $this->postJson('/leads/settings',['stages'=>[$stages[2]],'stage_moves'=>['first'=>'win','second'=>'second'],'featured_stage_1'=>'win'])->assertUnprocessable();
        $this->assertSame('first',$a->fresh()->stage);
        $this->assertSame('second',$b->fresh()->stage);
        $this->assertDatabaseCount('lead_activities',0);
        $this->assertCount(3,SystemSetting::find('lead_pipeline_settings')->value['stages']);
    }
    public function test_empty_removal_addition_reordering_and_stale_changes(): void {
        $stages=$this->setupStages();
        $next=[$stages[2],['key'=>'demo','name'=>'Demo','color'=>'#112233','type'=>'normal'],$stages[1]];
        $this->postJson('/leads/settings',['stages'=>$next,'original_stages'=>$stages,'featured_stage_1'=>'demo'])->assertOk();
        $this->assertSame(['win','demo','second'],array_column(SystemSetting::find('lead_pipeline_settings')->value['stages'],'key'));
        $this->postJson('/leads/settings',['stages'=>$stages,'original_stages'=>$stages])->assertUnprocessable();
    }
    public function test_rejects_empty_duplicate_stages_and_unauthorized_user(): void {
        $stages=$this->setupStages();
        $this->postJson('/leads/settings',['stages'=>[]])->assertUnprocessable();
        $this->postJson('/leads/settings',['stages'=>[$stages[0],$stages[0]]])->assertUnprocessable();
        $this->actingAs(User::factory()->create(['role'=>'Sales','is_active'=>true]));
        $this->postJson('/leads/settings',['stages'=>$stages])->assertForbidden();
    }
}
