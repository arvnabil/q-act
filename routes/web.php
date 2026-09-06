<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\QuotationController;
use App\Http\Controllers\BrandController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\BusinessUnitController;
use App\Http\Controllers\SalesOrderController;
use App\Http\Controllers\CostCategoryController;
use App\Http\Controllers\QuotationSalesNoteController;
use App\Http\Controllers\AnalyticsController;
use App\Http\Controllers\NotificationController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// Redirect root to dashboard or login
Route::get('/', function () {
    return redirect()->route('dashboard');
});

// Protected routes
Route::middleware(['auth', 'verified'])->group(function () {

    // Dashboard
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::post('/dashboard/sales-targets', [DashboardController::class, 'updateSalesTargets'])->name('dashboard.sales-targets.update');

    // Customers
    Route::get('/customers', [CustomerController::class, 'index'])->name('customers.index');
    Route::post('/customers', [CustomerController::class, 'store'])->name('customers.store');
    Route::put('/customers/{customer}', [CustomerController::class, 'update'])->name('customers.update');
    Route::delete('/customers/{customer}', [CustomerController::class, 'destroy'])->name('customers.destroy');
    Route::delete('/customers', [CustomerController::class, 'bulkDestroy'])->name('customers.bulk-destroy');

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

    // Quotations
    Route::get('/quotations', [QuotationController::class, 'index'])->name('quotations.index');
    Route::get('/quotations/create', [QuotationController::class, 'create'])->name('quotations.create');
    Route::post('/quotations', [QuotationController::class, 'store'])->name('quotations.store');
    Route::post('/quotations/bulk-destroy', [QuotationController::class, 'bulkDestroy'])->name('quotations.bulk-destroy');
    Route::get('/quotations/{quotation}', [QuotationController::class, 'show'])->name('quotations.show');
    Route::get('/quotations/{quotation}/edit', [QuotationController::class, 'edit'])->name('quotations.edit');
    Route::put('/quotations/{quotation}', [QuotationController::class, 'update'])->name('quotations.update');
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
    Route::delete('/sales-orders/{salesOrder}', [SalesOrderController::class, 'destroy'])->name('sales-orders.destroy');
    Route::post('/sales-orders/{salesOrder}/costs', [SalesOrderController::class, 'storeCost'])->name('sales-orders.costs.store');
    Route::delete('/sales-orders/{salesOrder}/costs/{cost}', [SalesOrderController::class, 'destroyCost'])->name('sales-orders.costs.destroy');
    Route::post('/sales-orders/{salesOrder}/status', [SalesOrderController::class, 'updateStatus'])->name('sales-orders.status.update');

    // Cost Categories (Other COGS)
    Route::get('/cost-categories', [CostCategoryController::class, 'index'])->name('cost-categories.index');
    Route::post('/cost-categories', [CostCategoryController::class, 'store'])->name('cost-categories.store');
    Route::put('/cost-categories/{costCategory}', [CostCategoryController::class, 'update'])->name('cost-categories.update');
    Route::delete('/cost-categories/{costCategory}', [CostCategoryController::class, 'destroy'])->name('cost-categories.destroy');

    // Users (admin only)
    Route::get('/users', [UserController::class, 'index'])->name('users.index');
    Route::post('/users', [UserController::class, 'store'])->name('users.store');
    Route::put('/users/{id}', [UserController::class, 'update'])->name('users.update');
    Route::delete('/users/{id}', [UserController::class, 'destroy'])->name('users.destroy');

    // Business Units (admin only)
    Route::get('/business-units', [BusinessUnitController::class, 'index'])->name('business-units.index');
    Route::post('/business-units', [BusinessUnitController::class, 'store'])->name('business-units.store');
    Route::put('/business-units/{businessUnit}', [BusinessUnitController::class, 'update'])->name('business-units.update');
    Route::delete('/business-units/{businessUnit}', [BusinessUnitController::class, 'destroy'])->name('business-units.destroy');
    Route::post('/business-units/{businessUnit}/members', [BusinessUnitController::class, 'addMember'])->name('business-units.members.store');
    Route::delete('/business-units/{businessUnit}/members/{userId}', [BusinessUnitController::class, 'removeMember'])->name('business-units.members.destroy');

    // Profile
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // Analytics
    Route::get('/analytics', [AnalyticsController::class, 'index'])->name('analytics');

    // Notifications
    Route::get('/notifications', [NotificationController::class, 'index'])->name('notifications.index');
    Route::post('/notifications/{id}/read', [NotificationController::class, 'markRead'])->name('notifications.read');
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllRead'])->name('notifications.read-all');
    Route::delete('/notifications/{id}', [NotificationController::class, 'destroy'])->name('notifications.destroy');

    // Manager View & Trash Management
    Route::get('/manager', [\App\Http\Controllers\ManagerController::class, 'index'])->name('manager');
    Route::post('/manager/quotations/batch-restore', [\App\Http\Controllers\ManagerController::class, 'batchRestore'])->name('manager.quotations.batch-restore');
    Route::post('/manager/quotations/batch-force-delete', [\App\Http\Controllers\ManagerController::class, 'batchForceDelete'])->name('manager.quotations.batch-force-delete');
    Route::post('/manager/quotations/{id}/restore', [\App\Http\Controllers\ManagerController::class, 'restore'])->name('manager.quotations.restore');
    Route::delete('/manager/quotations/{id}/force-delete', [\App\Http\Controllers\ManagerController::class, 'forceDelete'])->name('manager.quotations.force-delete');
    Route::get('/roles', [\App\Http\Controllers\RoleController::class, 'index'])->name('roles.index');
    Route::put('/roles', [\App\Http\Controllers\RoleController::class, 'update'])->name('roles.update');
    Route::get('/settings', [\App\Http\Controllers\SettingController::class, 'index'])->name('settings');
    Route::post('/settings/company-info', [\App\Http\Controllers\SettingController::class, 'updateCompanyInfo'])->name('settings.company-info');
    Route::post('/settings/bank-accounts', [\App\Http\Controllers\SettingController::class, 'storeBankAccount'])->name('settings.bank-accounts.store');
    Route::put('/settings/bank-accounts/{id}', [\App\Http\Controllers\SettingController::class, 'updateBankAccount'])->name('settings.bank-accounts.update');
    Route::post('/settings/bank-accounts/{id}/default', [\App\Http\Controllers\SettingController::class, 'setDefaultBankAccount'])->name('settings.bank-accounts.default');
    Route::delete('/settings/bank-accounts/{id}', [\App\Http\Controllers\SettingController::class, 'destroyBankAccount'])->name('settings.bank-accounts.destroy');
    Route::post('/settings/master-terms', [\App\Http\Controllers\SettingController::class, 'updateMasterTerms'])->name('settings.master-terms');
    Route::post('/settings/domain-logo', [\App\Http\Controllers\SettingController::class, 'updateDomainLogoMap'])->name('settings.domain-logo');
    Route::post('/settings/maintenance-mode', [\App\Http\Controllers\SettingController::class, 'updateMaintenanceMode'])->name('settings.maintenance-mode');
});

require __DIR__.'/auth.php';
