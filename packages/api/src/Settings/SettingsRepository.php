<?php

declare(strict_types=1);

namespace App\Settings;

final class SettingsRepository
{
    /**
     * @return array<string, mixed>
     */
    public static function fetchAll(\PDO $pdo): array
    {
        $stmt = $pdo->query('SELECT name, value FROM app_settings');
        if ($stmt === false) {
            return [];
        }
        $out = [];
        while ($row = $stmt->fetch(\PDO::FETCH_ASSOC)) {
            $name = (string) ($row['name'] ?? '');
            if ($name === '') {
                continue;
            }
            $out[$name] = self::decode((string) ($row['value'] ?? ''));
        }

        return $out;
    }

    /**
     * @param array<string, mixed> $values
     */
    public static function replaceMany(\PDO $pdo, array $values): void
    {
        $ownTx = !$pdo->inTransaction();
        if ($ownTx) {
            $pdo->beginTransaction();
        }
        try {
            $stmt = $pdo->prepare('INSERT OR REPLACE INTO app_settings (name, value) VALUES (?, ?)');
            foreach ($values as $name => $value) {
                if (!is_string($name) || $name === '') {
                    continue;
                }
                $stmt->execute([$name, self::encode($value)]);
            }
            if ($ownTx) {
                $pdo->commit();
            }
        } catch (\Throwable $e) {
            if ($ownTx && $pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }
    }

    /**
     * @param array<string, mixed> $values
     */
    public static function replaceManyMysql(\PDO $pdo, array $values): void
    {
        $ownTx = !$pdo->inTransaction();
        if ($ownTx) {
            $pdo->beginTransaction();
        }
        try {
            $stmt = $pdo->prepare('REPLACE INTO app_settings (name, value) VALUES (?, ?)');
            foreach ($values as $name => $value) {
                if (!is_string($name) || $name === '') {
                    continue;
                }
                $stmt->execute([$name, self::encode($value)]);
            }
            if ($ownTx) {
                $pdo->commit();
            }
        } catch (\Throwable $e) {
            if ($ownTx && $pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }
    }

    /**
     * @param array<string, mixed> $values
     */
    public static function replaceManyDriver(\PDO $pdo, array $values): void
    {
        $driver = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME);
        if ($driver === 'mysql') {
            self::replaceManyMysql($pdo, $values);
        } else {
            self::replaceMany($pdo, $values);
        }
    }

    public static function count(\PDO $pdo): int
    {
        $stmt = $pdo->query('SELECT COUNT(*) FROM app_settings');
        if ($stmt === false) {
            return 0;
        }

        return (int) $stmt->fetchColumn();
    }

    private static function encode(mixed $value): string
    {
        return json_encode($value, JSON_THROW_ON_ERROR);
    }

    private static function decode(string $json): mixed
    {
        try {
            return json_decode($json, true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            return $json;
        }
    }
}
