<?php

declare(strict_types=1);

namespace App\Dav\Storage;

use Illuminate\Contracts\Filesystem\Filesystem;
use Sabre\DAV\INode;

abstract class FlysystemNode implements INode
{
    public function __construct(
        protected Filesystem $filesystem,
        protected string $key,
        protected ?string $overrideName = null,
    ) {
        $this->key = trim(str_replace('\\', '/', $key), '/');
    }

    public function getName(): string
    {
        if ($this->overrideName !== null && $this->overrideName !== '') {
            return $this->overrideName;
        }

        return basename($this->key);
    }

    protected function childKey(string $name): string
    {
        return $this->key === '' ? $name : $this->key.'/'.$name;
    }
}
