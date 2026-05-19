<?php

declare(strict_types=1);

namespace Tests\Unit\Mail;

use App\Services\Mail\MailFromAddressResolver;
use PHPUnit\Framework\TestCase;

final class MailFromAddressResolverTest extends TestCase
{
    public function test_prefers_imap_username_when_it_is_a_valid_email(): void
    {
        $addr = MailFromAddressResolver::resolve([
            'emailAddress' => 'profile@example.test',
            'imap' => ['username' => 'smtp@example.test'],
            'smtp' => ['host' => 'mail.example.test'],
        ]);

        $this->assertSame('smtp@example.test', $addr);
    }

    public function test_falls_back_to_principal_email(): void
    {
        $addr = MailFromAddressResolver::resolve([
            'emailAddress' => 'admin@wegotworkspace.local',
            'imap' => ['username' => 'admin'],
            'smtp' => ['host' => 'mail.wegotworkspace.local'],
        ]);

        $this->assertSame('admin@wegotworkspace.local', $addr);
    }

    public function test_derives_address_from_bare_username_and_smtp_host(): void
    {
        $addr = MailFromAddressResolver::resolve([
            'emailAddress' => '',
            'imap' => ['username' => 'admin'],
            'smtp' => ['host' => 'mail.wegotworkspace.local'],
        ]);

        $this->assertSame('admin@wegotworkspace.local', $addr);
    }

    public function test_throws_when_no_valid_candidate(): void
    {
        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('invalid_from_address');

        MailFromAddressResolver::resolve([
            'emailAddress' => '',
            'imap' => ['username' => 'admin'],
            'smtp' => ['host' => 'localhost'],
        ]);
    }
}
