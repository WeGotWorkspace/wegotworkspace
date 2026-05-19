<?php

declare(strict_types=1);

namespace Tests\Support;

use Illuminate\Support\Facades\Storage;

final class WgwTestDisks
{
    public static function refresh(string $dataDir): void
    {
        $dataDir = rtrim($dataDir, '/');
        config([
            'wgw.data_dir' => $dataDir,
            'filesystems.disks.wgw_data.root' => $dataDir,
            'filesystems.disks.wgw_files.root' => $dataDir.'/files',
            'filesystems.disks.wgw_notes.root' => $dataDir.'/files',
        ]);

        foreach (['wgw_data', 'wgw_files', 'wgw_notes'] as $disk) {
            Storage::forgetDisk($disk);
        }
    }
}
