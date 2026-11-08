<?php

namespace App\Providers;

use App\Mail\Transport\MicrosoftGraphTransport;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Register Microsoft Graph custom mail transport
        Mail::extend('microsoft-graph', function (array $config) {
            return new MicrosoftGraphTransport(
                tenantId:     $config['tenant_id'],
                clientId:     $config['client_id'],
                clientSecret: $config['client_secret'],
                fromAddress:  $config['from_address'],
                mailbox:      $config['mailbox'] ?? $config['from_address'],
            );
        });

        // Super admin bypass for Administrator role
        Gate::before(function ($user, $ability) {
            return ($user->hasRole('Administrator') || $user->role === 'Administrator') ? true : null;
        });

        Vite::prefetch(concurrency: 3);

        ResetPassword::toMailUsing(function (object $notifiable, string $token) {
            $url = url(route('password.reset', [
                'token' => $token,
                'email' => $notifiable->getEmailForPasswordReset(),
            ], false));

            $expire = config('auth.passwords.'.config('auth.defaults.passwords').'.expire', 60);

            return (new MailMessage)
                ->subject('Permintaan Reset Kata Sandi - QSales')
                ->view('emails.reset-password', [
                    'nama' => $notifiable->name ?? 'Pengguna',
                    'url' => $url,
                    'expire' => $expire,
                ]);
        });
    }
}
