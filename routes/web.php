<?php

use App\Http\Controllers\AchievementController;
use App\Http\Controllers\AnalyticsController;
use App\Http\Controllers\LeadController;
use App\Http\Controllers\BrandController;
use App\Http\Controllers\BusinessUnitController;
use App\Http\Controllers\ChangeRequestController;
use App\Http\Controllers\CostCategoryController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ManagerController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\QuotationController;
use App\Http\Controllers\QuotationSalesNoteController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\SalesOrderController;
use App\Http\Controllers\SettingController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

// Redirect root to dashboard or login
Route::get('/', function () {
    return redirect()->route('dashboard');
});

// Protected routes
Route::middleware(['auth', 'verified'])->group(function () {

    Route::get('/header-search', \App\Http\Controllers\HeaderSearchController::class)->middleware('throttle:60,1')->name('header-search');

    // Dashboard
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::post('/dashboard/sales-targets', [DashboardController::class, 'updateSalesTargets'])->name('dashboard.sales-targets.update');

    // Customers
    Route::get('/customers', [CustomerController::class, 'index'])->name('customers.index');
    Route::post('/customers', [CustomerController::class, 'store'])->name('customers.store');
    Route::delete('/customers', [CustomerController::class, 'bulkDestroy'])->name('customers.bulk-destroy');
    // Admin-only: merge duplicate customers (must be BEFORE /{customer} routes)
    Route::get('/customers/duplicates/scan', [CustomerController::class, 'duplicates'])->name('customers.duplicates');
    Route::post('/customers/merge', [CustomerController::class, 'merge'])->name('customers.merge');
    // Dynamic customer routes
    Route::get('/customers/{customer}', [CustomerController::class, 'show'])->name('customers.show');
    Route::post('/customers/{customer}/pics', [CustomerController::class, 'storePic'])->name('customers.pics.store');
    Route::get('/customers/{customer}/npwp-document', [CustomerController::class, 'npwpDocument'])->name('customers.npwp-document');
    Route::put('/customers/{customer}/pics/{pic}', [CustomerController::class, 'updatePic'])->name('customers.pics.update');
    Route::delete('/customers/{customer}/pics/{pic}', [CustomerController::class, 'destroyPic'])->name('customers.pics.destroy');
    Route::put('/customers/{customer}/pics/{pic}/profile', [CustomerController::class, 'updatePicProfile'])->name('customers.pics.profile.update');
    Route::put('/customers/{customer}/profile', [CustomerController::class, 'updateProfile'])->name('customers.profile.update');
    Route::put('/customers/{customer}', [CustomerController::class, 'update'])->name('customers.update');
    Route::delete('/customers/{customer}', [CustomerController::class, 'destroy'])->name('customers.destroy');

    // Products
    Route::get('/products', [ProductController::class, 'index'])->name('products.index');
    Route::post('/products', [ProductController::class, 'store'])->name('products.store');
    Route::put('/products/{product}', [ProductController::class, 'update'])->name('products.update');
    Route::delete('/products/{product}', [ProductController::class, 'destroy'])->name('products.destroy');
    Route::post('/products/destroy-mass', [ProductController::class, 'destroyMass'])->name('products.destroy.mass');
    Route::post('/products/import', [ProductController::class, 'import'])->name('products.import');
    Route::post('/products/upload-image', [ProductController::class, 'uploadImage'])->name('products.upload-image');

    // Brands
    Route::get('/brands', [BrandController::class, 'index'])->name('brands.index');
    Route::post('/brands', [BrandController::class, 'store'])->name('brands.store');
    Route::put('/brands/{brand}', [BrandController::class, 'update'])->name('brands.update');
    Route::delete('/brands/{brand}', [BrandController::class, 'destroy'])->name('brands.destroy');

    Route::get('/workflow/quotations/{quotation}', [\App\Http\Controllers\WorkflowController::class, 'quotation']);
    Route::post('/workflow/quotations/{quotation}/lead', [\App\Http\Controllers\WorkflowController::class, 'link'])->name('quotations.workflow.lead');
    Route::get('/workflow/leads/{lead}', [\App\Http\Controllers\WorkflowController::class, 'lead']);
    Route::post('/workflow/visits/{visit}/cancel', [\App\Http\Controllers\WorkflowController::class, 'cancel']);

    // Quotations
    Route::get('/quotations', [QuotationController::class, 'index'])->name('quotations.index');
    Route::get('/quotations/create', [QuotationController::class, 'create'])->name('quotations.create');
    Route::post('/quotations', [QuotationController::class, 'store'])->name('quotations.store');
    Route::post('/quotations/bulk-destroy', [QuotationController::class, 'bulkDestroy'])->name('quotations.bulk-destroy');
    Route::get('/quotations/{quotation}', [QuotationController::class, 'show'])->name('quotations.show');
    Route::get('/quotations/{quotation}/edit', [QuotationController::class, 'edit'])->name('quotations.edit');
    Route::put('/quotations/{quotation}', [QuotationController::class, 'update'])->name('quotations.update');
    Route::post('/quotations/{quotation}/reorder-items', [QuotationController::class, 'reorderItems'])->name('quotations.reorder-items');
    Route::post('/quotations/{quotation}/duplicate', [QuotationController::class, 'duplicate'])->name('quotations.duplicate');
    Route::post('/quotations/{quotation}/download-pdf', [QuotationController::class, 'downloadPdf'])->name('quotations.download-pdf');
    Route::post('/quotations/{quotation}/sub-quotation', [QuotationController::class, 'createSubQuotation'])->name('quotations.sub-quotation.store');
    Route::post('/quotations/{quotation}/items/{item}/move', [QuotationController::class, 'moveItemToSubQuotation'])->name('quotations.items.move');
    Route::post('/quotations/{quotation}/purchase-orders', [QuotationController::class, 'addPurchaseOrder'])->name('quotations.purchase-orders.store');
    Route::post('/quotations/{quotation}/bulk-purchase-orders', [QuotationController::class, 'bulkPurchaseOrder'])->name('quotations.bulk-purchase-orders.store');
    Route::post('/quotations/import-legacy', [QuotationController::class, 'importLegacy'])
        ->middleware('permission:quotations_import_legacy')
        ->name('quotations.import-legacy');
    Route::post('/quotations/{quotation}/change-requests', [ChangeRequestController::class, 'store'])->name('quotations.change-requests.store');
    Route::post('/quotations/{quotation}/new-from-cancelled', [ChangeRequestController::class, 'createFromCancelled'])->name('quotations.new-from-cancelled');
    Route::post('/quotation-templates', [SettingController::class, 'storePersonalTermsTemplate'])->name('quotation-templates.store');
    Route::post('/quotation-templates/import-legacy', [SettingController::class, 'importLegacyPersonalTermsTemplates'])->name('quotation-templates.import-legacy');
    Route::delete('/quotation-templates/{template}', [SettingController::class, 'destroyPersonalTermsTemplate'])->name('quotation-templates.destroy');
    Route::delete('/quotations/{quotation}', [QuotationController::class, 'destroy'])->name('quotations.destroy');

    // Quotation Sales Notes (Sales Zone)
    Route::get('/quotations/{quotation}/sales-notes', [QuotationSalesNoteController::class, 'show'])->name('quotations.sales-notes.show');
    Route::put('/quotations/{quotation}/sales-notes', [QuotationSalesNoteController::class, 'upsert'])->name('quotations.sales-notes.upsert');

    // Sales Orders
    Route::get('/sales-orders', [SalesOrderController::class, 'index'])->name('sales-orders.index');
    Route::post('/sales-orders', [SalesOrderController::class, 'store'])->name('sales-orders.store');
    Route::post('/sales-orders/bulk-destroy', [SalesOrderController::class, 'bulkDestroy'])->name('sales-orders.bulk-destroy');
    Route::get('/sales-orders/{salesOrder}', [SalesOrderController::class, 'show'])->name('sales-orders.show');
    Route::put('/sales-orders/{salesOrder}', [SalesOrderController::class, 'update'])->name('sales-orders.update');
    Route::post('/sales-orders/{salesOrder}/purchase-order-metadata', [SalesOrderController::class, 'updatePurchaseOrderMetadata'])->name('sales-orders.purchase-order-metadata');
    Route::delete('/sales-orders/{salesOrder}', [SalesOrderController::class, 'destroy'])->name('sales-orders.destroy');
    Route::post('/sales-orders/{salesOrder}/costs', [SalesOrderController::class, 'storeCost'])->name('sales-orders.costs.store');
    Route::post('/sales-orders/{salesOrder}/costs/{cost}', [SalesOrderController::class, 'updateCost'])->name('sales-orders.costs.update');
    Route::delete('/sales-orders/{salesOrder}/costs/{cost}', [SalesOrderController::class, 'destroyCost'])->name('sales-orders.costs.destroy');
    Route::post('/sales-orders/{salesOrder}/status', [SalesOrderController::class, 'updateStatus'])->name('sales-orders.status.update');

    // Cost Categories (Other COGS)
    Route::get('/cost-categories', [CostCategoryController::class, 'index'])->name('cost-categories.index');
    Route::post('/cost-categories', [CostCategoryController::class, 'store'])->name('cost-categories.store');
    Route::put('/cost-categories/{costCategory}', [CostCategoryController::class, 'update'])->name('cost-categories.update');
    Route::delete('/cost-categories/{costCategory}', [CostCategoryController::class, 'destroy'])->name('cost-categories.destroy');

    Route::middleware('permission:user_management')->group(function () {
        Route::get('/users', [UserController::class, 'index'])->name('users.index');
        Route::post('/users', [UserController::class, 'store'])->name('users.store');
        Route::put('/users/{id}', [UserController::class, 'update'])->name('users.update');
        Route::delete('/users/{id}', [UserController::class, 'destroy'])->name('users.destroy');
    });

    Route::middleware('permission:manage_business_units')->group(function () {
        Route::get('/business-units', [BusinessUnitController::class, 'index'])->name('business-units.index');
        Route::post('/business-units', [BusinessUnitController::class, 'store'])->name('business-units.store');
        Route::put('/business-units/{businessUnit}', [BusinessUnitController::class, 'update'])->name('business-units.update');
        Route::delete('/business-units/{businessUnit}', [BusinessUnitController::class, 'destroy'])->name('business-units.destroy');
        Route::post('/business-units/{businessUnit}/members', [BusinessUnitController::class, 'addMember'])->name('business-units.members.store');
        Route::delete('/business-units/{businessUnit}/members/{userId}', [BusinessUnitController::class, 'removeMember'])->name('business-units.members.destroy');
    });

    // Profile
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // Release Notes & Version Info
    Route::get('/releases', [\App\Http\Controllers\ReleaseController::class, 'index'])->name('releases.index');

    // Download Center
    Route::prefix('downloads')->name('downloads.')->group(function () {
        Route::get('/', [\App\Http\Controllers\DownloadCenterController::class, 'index'])->name('index');
        Route::post('/sales-orders', [\App\Http\Controllers\DownloadCenterController::class, 'exportSalesOrders'])->name('export.sales-orders');
        Route::get('/{id}/download', [\App\Http\Controllers\DownloadCenterController::class, 'download'])->name('download');
        Route::delete('/{id}', [\App\Http\Controllers\DownloadCenterController::class, 'destroy'])->name('destroy');
    });

    // Lead Pipeline
    Route::prefix('leads')->name('leads.')->group(function () {
        Route::get('/',                              [LeadController::class, 'index'])->name('index');
        Route::post('/',                             [LeadController::class, 'store'])->name('store');
        Route::get('/visits',                        [LeadController::class, 'indexVisits'])->name('visits');
        Route::post('/visits',                       [LeadController::class, 'storeVisit'])->name('visits.store');
        Route::put('/visits/{visit}',                [LeadController::class, 'updateVisit'])->name('visits.update');
        Route::delete('/visits/{visit}',             [LeadController::class, 'destroyVisit'])->name('visits.destroy');
        Route::post('/visits/{visit}/check-in',      [LeadController::class, 'checkIn'])->name('visits.check-in');
        Route::post('/visits/{visit}/zoom',          [LeadController::class, 'createZoomForVisit'])->name('visits.zoom');
        Route::get('/calendar',                      [LeadController::class, 'indexCalendar'])->name('calendar');
        Route::get('/{lead}',                        [LeadController::class, 'show'])->name('show');
        Route::put('/{lead}',                        [LeadController::class, 'update'])->name('update');
        Route::patch('/{lead}/stage',                [LeadController::class, 'updateStage'])->name('stage.update');
        Route::delete('/{lead}',                     [LeadController::class, 'destroy'])->name('destroy');
        Route::post('/{lead}/activities',            [LeadController::class, 'addActivity'])->name('activities.store');
        Route::patch('/{lead}/activities/{activity}', [LeadController::class, 'updateActivity'])->name('activities.update');
        Route::delete('/{lead}/activities/{activity}',[LeadController::class, 'destroyActivity'])->name('activities.destroy');
        Route::post('/{lead}/pics',                  [LeadController::class, 'storePic'])->name('pics.store');
        Route::delete('/{lead}/pics/{pic}',          [LeadController::class, 'destroyPic'])->name('pics.destroy');
        Route::post('/settings',                     [LeadController::class, 'updateSettings'])->name('settings.update');
    });

    Route::get('/team-calendar', [LeadController::class, 'indexCalendar'])->name('team-calendar');

    // Analytics
    Route::get('/analytics', [AnalyticsController::class, 'index'])->name('analytics');
    Route::get('/achievements', [AchievementController::class, 'index'])->name('achievements.index');

    // Notifications
    Route::get('/notifications', [NotificationController::class, 'index'])->name('notifications.index');
    Route::post('/notifications/{id}/read', [NotificationController::class, 'markRead'])->name('notifications.read');
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllRead'])->name('notifications.read-all');
    Route::delete('/notifications/{id}', [NotificationController::class, 'destroy'])->name('notifications.destroy');

    // Manager View & Trash Management
    Route::middleware('permission:manager_view')->group(function () {
        Route::get('/manager', [ManagerController::class, 'index'])->name('manager');
        Route::post('/manager/quotations/batch-restore', [ManagerController::class, 'batchRestore'])->name('manager.quotations.batch-restore');
        Route::post('/manager/quotations/batch-force-delete', [ManagerController::class, 'batchForceDelete'])->name('manager.quotations.batch-force-delete');
        Route::post('/manager/quotations/{id}/restore', [ManagerController::class, 'restore'])->name('manager.quotations.restore');
        Route::delete('/manager/quotations/{id}/force-delete', [ManagerController::class, 'forceDelete'])->name('manager.quotations.force-delete');
        Route::post('/change-requests/{changeRequest}/approve', [ChangeRequestController::class, 'approve'])->name('change-requests.approve');
        Route::post('/change-requests/{changeRequest}/reject', [ChangeRequestController::class, 'reject'])->name('change-requests.reject');
    });
    Route::middleware('permission:manage_roles')->group(function () {
        Route::get('/roles', [RoleController::class, 'index'])->name('roles.index');
        Route::put('/roles', [RoleController::class, 'update'])->name('roles.update');
    });
    Route::middleware('permission:manage_settings')->group(function () {
        Route::get('/settings', [SettingController::class, 'index'])->name('settings');
        Route::post('/settings/company-info', [SettingController::class, 'updateCompanyInfo'])->name('settings.company-info');
        Route::post('/settings/bank-accounts', [SettingController::class, 'storeBankAccount'])->name('settings.bank-accounts.store');
        Route::put('/settings/bank-accounts/{id}', [SettingController::class, 'updateBankAccount'])->name('settings.bank-accounts.update');
        Route::post('/settings/bank-accounts/{id}/default', [SettingController::class, 'setDefaultBankAccount'])->name('settings.bank-accounts.default');
        Route::delete('/settings/bank-accounts/{id}', [SettingController::class, 'destroyBankAccount'])->name('settings.bank-accounts.destroy');
        Route::post('/settings/master-terms', [SettingController::class, 'updateMasterTerms'])->name('settings.master-terms');
        Route::post('/settings/domain-logo', [SettingController::class, 'updateDomainLogoMap'])->name('settings.domain-logo');
        Route::post('/settings/maintenance-mode', [SettingController::class, 'updateMaintenanceMode'])->name('settings.maintenance-mode');
        Route::post('/settings/integrations/google-calendar', [SettingController::class, 'updateGoogleCalendar'])->name('settings.google-calendar');
        Route::post('/settings/integrations/zoom', [SettingController::class, 'updateZoom'])->name('settings.zoom');
        Route::post('/settings/users/{user}/integrations', [SettingController::class, 'updateUserIntegrations'])->name('settings.users.integrations');
    });
});

// Zoom Webhook (Unauthenticated, CSRF excluded)
Route::post('/webhooks/zoom', [LeadController::class, 'handleZoomWebhook'])->name('webhooks.zoom');

require __DIR__.'/auth.php';
