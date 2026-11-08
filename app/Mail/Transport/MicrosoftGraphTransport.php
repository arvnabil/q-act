<?php

namespace App\Mail\Transport;

use Psr\EventDispatcher\EventDispatcherInterface;
use Psr\Log\LoggerInterface;
use Symfony\Component\Mailer\Envelope;
use Symfony\Component\Mailer\SentMessage;
use Symfony\Component\Mailer\Transport\AbstractTransport;
use Symfony\Component\Mime\MessageConverter;
use Symfony\Component\Mime\Email;
use Illuminate\Support\Facades\Log;

class MicrosoftGraphTransport extends AbstractTransport
{
    protected string $tenantId;
    protected string $clientId;
    protected string $clientSecret;
    protected string $fromAddress;

    public function __construct(
        string $tenantId,
        string $clientId,
        string $clientSecret,
        string $fromAddress,
        ?EventDispatcherInterface $dispatcher = null,
        ?LoggerInterface $logger = null
    ) {
        parent::__construct($dispatcher, $logger);
        $this->tenantId    = $tenantId;
        $this->clientId    = $clientId;
        $this->clientSecret = $clientSecret;
        $this->fromAddress  = $fromAddress;
    }

    /**
     * Get OAuth2 access token from Microsoft Entra using client credentials flow.
     */
    protected function getAccessToken(): string
    {
        $url = "https://login.microsoftonline.com/{$this->tenantId}/oauth2/v2.0/token";

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => http_build_query([
                'grant_type'    => 'client_credentials',
                'client_id'     => $this->clientId,
                'client_secret' => $this->clientSecret,
                'scope'         => 'https://graph.microsoft.com/.default',
            ]),
            CURLOPT_HTTPHEADER => ['Content-Type: application/x-www-form-urlencoded'],
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200) {
            throw new \RuntimeException("Failed to get Microsoft Graph token (HTTP {$httpCode}): {$response}");
        }

        $data = json_decode($response, true);

        if (empty($data['access_token'])) {
            throw new \RuntimeException("No access_token in response: {$response}");
        }

        return $data['access_token'];
    }

    /**
     * Build recipients array for Graph API payload.
     */
    protected function buildRecipients(array $addresses): array
    {
        return array_map(fn($addr) => [
            'emailAddress' => [
                'address' => $addr->getAddress(),
                'name'    => $addr->getName() ?: $addr->getAddress(),
            ],
        ], $addresses);
    }

    /**
     * Send the email via Microsoft Graph API /sendMail endpoint.
     */
    protected function doSend(SentMessage $message): void
    {
        $email   = MessageConverter::toEmail($message->getOriginalMessage());
        $token   = $this->getAccessToken();
        $sender  = $this->fromAddress;

        // Build TO, CC, BCC
        $toRecipients  = $this->buildRecipients($email->getTo());
        $ccRecipients  = $this->buildRecipients($email->getCc());
        $bccRecipients = $this->buildRecipients($email->getBcc());

        // Build body — prefer HTML, fallback to text
        $bodyContent     = $email->getHtmlBody() ?? $email->getTextBody() ?? '';
        $bodyContentType = $email->getHtmlBody() ? 'HTML' : 'Text';

        // Build attachments
        $attachments = [];
        foreach ($email->getAttachments() as $part) {
            $disposition = $part->getPreparedHeaders()->get('content-disposition');
            $fileName    = $disposition?->getParameter('filename') ?? 'attachment';
            $attachments[] = [
                '@odata.type'  => '#microsoft.graph.fileAttachment',
                'name'         => $fileName,
                'contentType'  => $part->getMediaType() . '/' . $part->getMediaSubtype(),
                'contentBytes' => base64_encode($part->getBody()),
            ];
        }

        $payload = [
            'message' => [
                'subject' => $email->getSubject(),
                'body'    => [
                    'contentType' => $bodyContentType,
                    'content'     => $bodyContent,
                ],
                'from' => [
                    'emailAddress' => ['address' => $sender],
                ],
                'toRecipients'  => $toRecipients,
                'ccRecipients'  => $ccRecipients,
                'bccRecipients' => $bccRecipients,
                'attachments'   => $attachments,
            ],
            'saveToSentItems' => false,
        ];

        $url = "https://graph.microsoft.com/v1.0/users/{$sender}/sendMail";

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => json_encode($payload),
            CURLOPT_HTTPHEADER     => [
                'Authorization: Bearer ' . $token,
                'Content-Type: application/json',
            ],
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        // Graph API returns 202 Accepted on success (no body)
        if ($httpCode !== 202) {
            Log::error('MicrosoftGraphTransport error', [
                'http_code' => $httpCode,
                'response'  => $response,
            ]);
            throw new \RuntimeException("Microsoft Graph sendMail failed (HTTP {$httpCode}): {$response}");
        }

        Log::info('Email sent via Microsoft Graph', [
            'to'      => array_map(fn($r) => $r['emailAddress']['address'], $toRecipients),
            'subject' => $email->getSubject(),
        ]);
    }

    public function __toString(): string
    {
        return 'microsoft-graph';
    }
}
