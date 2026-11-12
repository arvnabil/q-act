<?php

namespace App\Services;

use App\Models\SystemSetting;
use App\Models\User;
use Illuminate\Support\Facades\Log;

class EmailNotificationService
{
    public const KEY = 'email_notifications';

    /**
     * Get default settings structure.
     */
    public static function getDefaultSettings(): array
    {
        return [
            // 1. Upload PO Customer
            'po_uploaded' => [
                'enabled'      => true,
                'to_roles'     => ['Finance'],
                'custom_to'    => ['finance@activ.co.id'],
                'cc_sales'     => true,
                'cc_roles'     => [],
                'custom_cc'    => [],
                'bcc_roles'    => [],
                'custom_bcc'   => ['director@activ.co.id'],
            ],

            // 2. Ubah / Reset Kata Sandi
            'password_changed' => [
                'enabled'      => true,
                'notify_user'  => true, // Kirim ke user yang ubah password
                'to_roles'     => [],   // Misal: Administrator
                'custom_to'    => [],
                'cc_roles'     => [],
                'custom_cc'    => [],
                'bcc_roles'    => [],
                'custom_bcc'   => [],
            ],

            // 3. Lead Deal / Paid
            'lead_paid' => [
                'enabled'      => true,
                'to_roles'     => ['Finance'],
                'custom_to'    => [],
                'cc_sales'     => true,
                'cc_roles'     => [],
                'custom_cc'    => [],
                'bcc_roles'    => [],
                'custom_bcc'   => [],
            ],

            // 4. Pengajuan Revisi Quotation (Sales -> Manager)
            'change_request_submitted' => [
                'enabled'      => true,
                'to_roles'     => ['Manager', 'Sales Manager'],
                'custom_to'    => [],
                'cc_sales'     => true,  // CC ke Sales pemohon
                'cc_roles'     => [],
                'custom_cc'    => [],
                'bcc_roles'    => [],
                'custom_bcc'   => [],
            ],

            // 5. Hasil Approval Revisi (Manager -> Sales)
            'change_request_decided' => [
                'enabled'      => true,
                'notify_sales' => true,  // Kirim ke Sales pemilik quotation
                'to_roles'     => [],
                'custom_to'    => [],
                'cc_roles'     => ['Manager', 'Sales Manager'],
                'custom_cc'    => [],
                'bcc_roles'    => [],
                'custom_bcc'   => [],
            ],

            // 6. Disposisi / Assignment Lead Baru
            'lead_assigned' => [
                'enabled'        => true,
                'notify_assignee' => true,  // Kirim ke Sales yang ditugaskan
                'to_roles'       => [],
                'custom_to'      => [],
                'cc_roles'       => ['Manager', 'Sales Manager'],
                'custom_cc'      => [],
                'bcc_roles'      => [],
                'custom_bcc'     => [],
            ],

            // 7. Reminder Agenda Kunjungan Harian 07:00
            'daily_visit_reminder' => [
                'enabled'    => true,
                'send_time'  => '07:00',
                'to_roles'   => ['Sales', 'Presales'],  // Masing-masing yang punya jadwal
                'custom_to'  => [],
                'cc_roles'   => [],
                'custom_cc'  => [],
                'bcc_roles'  => [],
                'custom_bcc' => [],
            ],

            // 8. Pengingat Ulang Tahun PIC Customer H-7
            'customer_birthday_reminder' => [
                'enabled'       => true,
                'days_before'   => 7,
                'to_sales_pic'  => true,  // Kirim ke Sales PIC customer
                'cc_roles'      => [],    // Opsional Manager
                'custom_cc'     => [],
                'bcc_roles'     => [],
                'custom_bcc'    => [],
            ],
        ];
    }

    /**
     * Get active settings merged with defaults.
     */
    public function getSettings(): array
    {
        $setting = SystemSetting::find(self::KEY);
        $saved = $setting && is_array($setting->value) ? $setting->value : [];
        $defaults = self::getDefaultSettings();

        // Deep merge with defaults so all keys exist
        $merged = [];
        foreach ($defaults as $eventKey => $defaultConfig) {
            $savedEvent = $saved[$eventKey] ?? [];
            $merged[$eventKey] = array_merge($defaultConfig, $savedEvent);
        }

        return $merged;
    }

    /**
     * Save settings to database.
     */
    public function saveSettings(array $settings): void
    {
        $clean = [];
        $defaults = self::getDefaultSettings();

        foreach ($defaults as $eventKey => $defaultConfig) {
            $input = $settings[$eventKey] ?? [];
            $clean[$eventKey] = [
                'enabled'         => (bool) ($input['enabled'] ?? false),
                'notify_user'     => (bool) ($input['notify_user'] ?? ($defaultConfig['notify_user'] ?? true)),
                'notify_sales'    => (bool) ($input['notify_sales'] ?? ($defaultConfig['notify_sales'] ?? true)),
                'notify_assignee' => (bool) ($input['notify_assignee'] ?? ($defaultConfig['notify_assignee'] ?? true)),
                'to_sales_pic'    => (bool) ($input['to_sales_pic'] ?? ($defaultConfig['to_sales_pic'] ?? true)),
                'to_roles'        => array_values(array_filter((array) ($input['to_roles'] ?? []))),
                'custom_to'       => $this->cleanEmails($input['custom_to'] ?? []),
                'cc_sales'        => (bool) ($input['cc_sales'] ?? false),
                'cc_roles'        => array_values(array_filter((array) ($input['cc_roles'] ?? []))),
                'custom_cc'       => $this->cleanEmails($input['custom_cc'] ?? []),
                'bcc_roles'       => array_values(array_filter((array) ($input['bcc_roles'] ?? []))),
                'custom_bcc'      => $this->cleanEmails($input['custom_bcc'] ?? []),
            ];
        }

        SystemSetting::updateOrCreate(
            ['key' => self::KEY],
            ['value' => $clean]
        );
    }

    /**
     * Resolve TO, CC, and BCC recipient email addresses for a specific event.
     *
     * @param string $event 'po_uploaded' | 'password_changed' | 'lead_paid'
     * @param array $context Contextual data like ['sales_email' => ..., 'user_email' => ...]
     * @return array ['enabled' => bool, 'to' => string[], 'cc' => string[], 'bcc' => string[]]
     */
    public function resolveRecipients(string $event, array $context = []): array
    {
        $settings = $this->getSettings();
        $config = $settings[$event] ?? null;

        if (!$config || empty($config['enabled'])) {
            return [
                'enabled' => false,
                'to'      => [],
                'cc'      => [],
                'bcc'     => [],
            ];
        }

        // 1. Resolve TO
        $to = [];
        if (!empty($config['notify_user']) && !empty($context['user_email'])) {
            $to[] = $context['user_email'];
        }
        if (!empty($config['notify_sales']) && !empty($context['sales_email'])) {
            $to[] = $context['sales_email'];
        }
        if (!empty($config['notify_assignee']) && !empty($context['assignee_email'])) {
            $to[] = $context['assignee_email'];
        }
        if (!empty($config['to_sales_pic']) && !empty($context['sales_email'])) {
            $to[] = $context['sales_email'];
        }
        if (!empty($config['to_roles'])) {
            $roleEmails = $this->getEmailsForRoles($config['to_roles']);
            $to = array_merge($to, $roleEmails);
        }
        if (!empty($config['custom_to'])) {
            $to = array_merge($to, (array) $config['custom_to']);
        }

        // 2. Resolve CC
        $cc = [];
        if (!empty($config['cc_sales']) && !empty($context['sales_email'])) {
            $cc[] = $context['sales_email'];
        }
        if (!empty($config['cc_roles'])) {
            $roleEmails = $this->getEmailsForRoles($config['cc_roles']);
            $cc = array_merge($cc, $roleEmails);
        }
        if (!empty($config['custom_cc'])) {
            $cc = array_merge($cc, (array) $config['custom_cc']);
        }

        // 3. Resolve BCC
        $bcc = [];
        if (!empty($config['bcc_roles'])) {
            $roleEmails = $this->getEmailsForRoles($config['bcc_roles']);
            $bcc = array_merge($bcc, $roleEmails);
        }
        if (!empty($config['custom_bcc'])) {
            $bcc = array_merge($bcc, (array) $config['custom_bcc']);
        }

        // Clean & deduplicate: make sure CC doesn't duplicate TO, and BCC doesn't duplicate TO/CC
        $toClean  = array_values(array_unique(array_filter(array_map('trim', $to))));
        $ccClean  = array_values(array_diff(array_unique(array_filter(array_map('trim', $cc))), $toClean));
        $bccClean = array_values(array_diff(array_unique(array_filter(array_map('trim', $bcc))), array_merge($toClean, $ccClean)));

        return [
            'enabled' => true,
            'to'      => $toClean,
            'cc'      => $ccClean,
            'bcc'     => $bccClean,
        ];
    }

    /**
     * Get active user emails belonging to the specified roles.
     */
    protected function getEmailsForRoles(array $roles): array
    {
        if (empty($roles)) {
            return [];
        }

        return User::where('is_active', true)
            ->where(function ($query) use ($roles) {
                $query->whereIn('role', $roles)
                      ->orWhereHas('roles', function ($q) use ($roles) {
                          $q->whereIn('name', $roles);
                      });
            })
            ->pluck('email')
            ->filter()
            ->values()
            ->all();
    }

    /**
     * Clean and validate email list (string or array).
     */
    protected function cleanEmails(mixed $input): array
    {
        if (is_string($input)) {
            $input = preg_split('/[,;\s]+/', $input);
        }

        if (!is_array($input)) {
            return [];
        }

        $emails = [];
        foreach ($input as $item) {
            $trimmed = trim((string) $item);
            if (!empty($trimmed) && filter_var($trimmed, FILTER_VALIDATE_EMAIL)) {
                $emails[] = strtolower($trimmed);
            }
        }

        return array_values(array_unique($emails));
    }
}
