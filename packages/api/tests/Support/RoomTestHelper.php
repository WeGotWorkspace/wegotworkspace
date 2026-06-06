<?php

declare(strict_types=1);

namespace Tests\Support;

use App\Services\Rtc\RoomIdCodec;

final class RoomTestHelper
{
    public static function fileRoomId(string $path): string
    {
        return app(RoomIdCodec::class)->encodeFilePath($path);
    }
}
