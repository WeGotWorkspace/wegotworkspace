<?php

declare(strict_types=1);

namespace App\Services\Drive;

final class DriveShareAccess
{
    public const VIEW = 'view';

    public const COMMENT = 'comment';

    public const REVIEW = 'review';

    public const EDIT = 'edit';

    public const FULL = 'full';

    /** @var array<string, int> */
    private const RANK = [
        self::VIEW => 1,
        self::COMMENT => 2,
        self::REVIEW => 3,
        self::EDIT => 4,
        self::FULL => 5,
    ];

    public static function isValid(string $access): bool
    {
        return array_key_exists($access, self::RANK);
    }

    public static function leastPermissive(string $a, string $b): string
    {
        return self::rank($a) <= self::rank($b) ? $a : $b;
    }

    public static function rank(string $access): int
    {
        return self::RANK[$access] ?? 0;
    }

    /**
     * @return array{
     *   mayView: bool,
     *   mayComment: bool,
     *   mayReview: bool,
     *   mayEditContent: bool,
     *   mayManageStructure: bool,
     *   mayShare: bool
     * }
     */
    public static function rightsFor(
        string $access,
        bool $isCollabDoc,
        bool $mayShare = false,
    ): array {
        $rank = self::rank($access);
        $comment = $isCollabDoc && $rank >= self::rank(self::COMMENT);
        $review = $isCollabDoc && $rank >= self::rank(self::REVIEW);
        $edit = $rank >= self::rank(self::EDIT);
        $full = $rank >= self::rank(self::FULL);

        return [
            'mayView' => $rank >= self::rank(self::VIEW),
            'mayComment' => $comment,
            'mayReview' => $review,
            'mayEditContent' => $edit,
            'mayManageStructure' => $full,
            'mayShare' => $mayShare,
        ];
    }
}
