<?php

declare(strict_types=1);

namespace App\Storage;

/**
 * Addressing scope for a notes tree: a personal user tree or a shared group tree.
 *
 * Personal: users/{username}/.notes/…
 * Group:    groups/{slug}/.notes/…
 */
final class NoteScope
{
    private const PERSONAL = 'personal';

    private const GROUP = 'group';

    private function __construct(
        private string $type,
        private string $owner,
    ) {}

    public static function personal(string $username): self
    {
        return new self(self::PERSONAL, $username);
    }

    public static function group(string $slug): self
    {
        return new self(self::GROUP, $slug);
    }

    public function isGroup(): bool
    {
        return $this->type === self::GROUP;
    }

    public function type(): string
    {
        return $this->type;
    }

    public function owner(): string
    {
        return $this->owner;
    }

    /**
     * @return string|null group slug when shared, null when personal
     */
    public function groupSlug(): ?string
    {
        return $this->isGroup() ? $this->owner : null;
    }
}
