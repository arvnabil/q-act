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
    protected string $mailbox;

    public function __construct(
        string $tenantId,
        string $clientId,
        string $clientSecret,
        string $fromAddress,
        string $mailbox = '',
        ?EventDispatcherInterface $dispatcher = null,
        ?LoggerInterface $logger = null
    ) {
        parent::__construct($dispatcher, $logger);
        $this->tenantId     = $tenantId;
        $this->clientId     = $clientId;
        $this->clientSecret = $clientSecret;
        $this->fromAddress  = $fromAddress;
        // mailbox = akun utama untuk Graph API endpoint (bisa beda dari FROM alias)
        $this->mailbox      = $mailbox ?: $fromAddress;
    }

    /**
     * Get OAuth2 access token from Microsoft Entra using client credentials flow (cached).
     */
    protected function getAccessToken(): string
    {
        return (new \App\Services\MicrosoftGraphTokenService(
            $this->tenantId,
            $this->clientId,
            $this->clientSecret
        ))->getAccessToken();
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
        $fromList = $email->getFrom();
        $fromItem = !empty($fromList) ? $fromList[0] : null;
        $senderAddress = $fromItem ? $fromItem->getAddress() : $this->fromAddress;
        $senderName    = $fromItem ? $fromItem->getName() : null;

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

        $fromData = ['address' => $senderAddress];
        if (!empty($senderName)) {
            $fromData['name'] = $senderName;
        }

        $payload = [
            'message' => [
                'subject' => $email->getSubject(),
                'body'    => [
                    'contentType' => $bodyContentType,
                    'content'     => $bodyContent,
                ],
                'from' => [
                    'emailAddress' => $fromData,
                ],
                'toRecipients'  => $toRecipients,
                'ccRecipients'  => $ccRecipients,
                'bccRecipients' => $bccRecipients,
                'attachments'   => $attachments,
            ],
            'saveToSentItems' => false,
        ];

        $url = "https://graph.microsoft.com/v1.0/users/{$this->mailbox}/sendMail";

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
