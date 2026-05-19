<?php

declare(strict_types=1);

namespace Tests\Unit\Mail;

use App\Services\Mail\MailSmtpTransportConfig;
use PHPUnit\Framework\TestCase;

final class MailSmtpTransportConfigTest extends TestCase
{
    public function test_normalizes_submission_port_security_mismatch(): void
    {
        $transport = MailSmtpTransportConfig::normalize([
            'host' => 'mail.example.test',
            'port' => 587,
            'security' => 'ssl',
        ]);

        $this->assertSame('starttls', $transport['security']);
        $this->assertSame(587, $transport['port']);
    }

    public function test_normalizes_implicit_tls_port(): void
    {
        $transport = MailSmtpTransportConfig::normalize([
            'host' => 'mail.example.test',
            'port' => 465,
            'security' => 'starttls',
        ]);

        $this->assertSame('ssl', $transport['security']);
    }
}
