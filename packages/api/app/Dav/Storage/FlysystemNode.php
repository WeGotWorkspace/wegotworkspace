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

    public function setName($name): void
    {
        $name = trim(str_replace('\\', '/', (string) $name), '/');
        if ($name === '' || str_contains($name, '/')) {
            throw new \InvalidArgumentException('Invalid node name.');
        }
        $parent = dirname($this->key);
        $newKey = $parent === '.' || $parent === '' ? $name : $parent.'/'.$name;
        if ($newKey === $this->key) {
            return;
        }
        $this->filesystem->move($this->key, $newKey);
        $this->key = $newKey;
    }

    public function getLastModified(): ?int
    {
        if (! $this->filesystem->exists($this->key)) {
            return null;
        }

        try {
            return $this->filesystem->lastModified($this->key);
        } catch (\Throwable) {
            return null;
        }
    }

    protected function childKey(string $name): string
    {
        return $this->key === '' ? $name : $this->key.'/'.$name;
    }
}
