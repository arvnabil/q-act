<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class PasswordController extends Controller
{
    /**
     * Update the user's password.
     */
    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'current_password' => ['required', 'current_password'],
            'password' => ['required', Password::defaults(), 'confirmed'],
        ]);

        $user = $request->user();
        $user->update([
            'password' => Hash::make($validated['password']),
        ]);

        // Send email notification based on notification settings
        try {
            $notificationService = app(\App\Services\EmailNotificationService::class);
            $recipients = $notificationService->resolveRecipients('password_changed', [
                'user_email' => $user->email,
            ]);

            if ($recipients['enabled'] && !empty($recipients['to'])) {
                $mail = \Illuminate\Support\Facades\Mail::to($recipients['to']);
                if (!empty($recipients['cc'])) {
                    $mail->cc($recipients['cc']);
                }
                if (!empty($recipients['bcc'])) {
                    $mail->bcc($recipients['bcc']);
                }

                $mail->send(new \App\Mail\PasswordChangedNotification($user, [
                    'changed_at' => now()->translatedFormat('l, d F Y H:i:s'),
                    'ip_address' => $request->ip(),
                    'user_agent' => $request->userAgent(),
                ]));
            }
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Password change email notification failed: ' . $e->getMessage());
        }

        return back();
    }
}
