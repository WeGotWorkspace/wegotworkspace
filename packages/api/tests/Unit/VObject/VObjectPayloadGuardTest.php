<?php

declare(strict_types=1);

namespace Tests\Unit\VObject;

use App\Exceptions\ApiHttpException;
use App\Services\VObject\VObjectPayloadGuard;
use PHPUnit\Framework\TestCase;

final class VObjectPayloadGuardTest extends TestCase
{
    private VObjectPayloadGuard $guard;

    protected function setUp(): void
    {
        parent::setUp();
        $this->guard = new VObjectPayloadGuard;
    }

    public function test_accepts_vcard_at_size_boundary(): void
    {
        $padding = str_repeat('x', VObjectPayloadGuard::MAX_VCARD_BYTES - 120);
        $vcard = "BEGIN:VCARD\r\nVERSION:4.0\r\nFN:Boundary\r\nNOTE:{$padding}\r\nEND:VCARD\r\n";

        $this->guard->assertVCardSize($vcard);
        $document = $this->guard->readVCard($vcard);
        $this->assertSame('Boundary', (string) $document->FN->getValue());
    }

    public function test_rejects_oversized_vcard(): void
    {
        $oversized = str_repeat('x', VObjectPayloadGuard::MAX_VCARD_BYTES + 1);

        try {
            $this->guard->assertVCardSize($oversized);
            $this->fail('Expected ApiHttpException');
        } catch (ApiHttpException $e) {
            $this->assertSame(413, $e->getStatusCode());
            $this->assertSame('payload_too_large', $e->errorCode());
        }
    }

    public function test_rejects_ics_with_too_many_components(): void
    {
        $chunks = [];
        for ($i = 0; $i < VObjectPayloadGuard::MAX_ICALENDAR_COMPONENTS + 1; $i++) {
            $chunks[] = "BEGIN:VEVENT\r\nUID:evt-{$i}\r\nSUMMARY:E{$i}\r\nEND:VEVENT";
        }
        $ics = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\n".implode("\r\n", $chunks)."\r\nEND:VCALENDAR\r\n";

        try {
            $this->guard->readICalendar($ics);
            $this->fail('Expected ApiHttpException');
        } catch (ApiHttpException $e) {
            $this->assertSame(400, $e->getStatusCode());
            $this->assertSame('bad_request', $e->errorCode());
        }
    }
}
