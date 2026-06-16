<?php

declare(strict_types=1);

namespace App\Services\Contacts;

use App\Exceptions\ApiHttpException;
use App\Http\Support\OptimisticConcurrency;

final class ContactCardSetService
{
    public function __construct(
        private readonly ContactCardRepository $cards,
        private readonly JmapContactStateService $states,
    ) {}

    /**
     * JMAP Contact/set mapping (RFC 9610).
     *
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    public function set(string $username, array $payload): array
    {
        $created = [];
        $updated = [];
        $destroyed = [];
        $notCreated = [];
        $notUpdated = [];
        $notDestroyed = [];

        $createMap = $payload['create'] ?? [];
        if (is_array($createMap)) {
            foreach ($createMap as $creationId => $cardPayload) {
                if (! is_string($creationId) || ! is_array($cardPayload)) {
                    continue;
                }
                try {
                    $card = $this->cards->create($username, $cardPayload);
                    $created[$creationId] = (string) $card['id'];
                } catch (ApiHttpException $e) {
                    $notCreated[$creationId] = $this->errorShape($e);
                } catch (\Throwable $e) {
                    $notCreated[$creationId] = [
                        'type' => 'serverError',
                        'description' => $e->getMessage(),
                    ];
                }
            }
        }

        $updateMap = $payload['update'] ?? [];
        if (is_array($updateMap)) {
            foreach ($updateMap as $cardId => $updatePayload) {
                if (! is_string($cardId) || ! is_array($updatePayload)) {
                    continue;
                }
                try {
                    $ifInState = isset($updatePayload['ifInState']) && is_string($updatePayload['ifInState'])
                        ? $updatePayload['ifInState']
                        : null;
                    $patch = $updatePayload;
                    unset($patch['ifInState']);

                    $ifMatch = null;
                    $requirePrecondition = false;
                    if ($ifInState !== null && $ifInState !== '') {
                        $ifMatch = OptimisticConcurrency::formatEtag(
                            $this->states->resolveEtagForIfInState($username, $cardId, $ifInState),
                        );
                        $requirePrecondition = true;
                    }

                    $card = $this->cards->patchWithPrecondition(
                        $username,
                        $cardId,
                        $patch,
                        $ifMatch,
                        null,
                        $requirePrecondition,
                    );
                    $updated[$cardId] = (string) ($card['state'] ?? '');
                } catch (ApiHttpException $e) {
                    $notUpdated[$cardId] = $this->errorShape($e);
                } catch (\Throwable $e) {
                    $notUpdated[$cardId] = [
                        'type' => 'serverError',
                        'description' => $e->getMessage(),
                    ];
                }
            }
        }

        $destroyPayload = $payload['destroy'] ?? null;
        if (is_array($destroyPayload)) {
            if ($this->isListArray($destroyPayload)) {
                foreach ($destroyPayload as $cardId) {
                    if (! is_string($cardId) || $cardId === '') {
                        continue;
                    }
                    try {
                        $this->cards->deleteWithPrecondition($username, $cardId, null, null, false);
                        $destroyed[] = $cardId;
                    } catch (ApiHttpException $e) {
                        $notDestroyed[$cardId] = $this->errorShape($e);
                    }
                }
            } else {
                foreach ($destroyPayload as $cardId => $destroyEntry) {
                    if (! is_string($cardId)) {
                        continue;
                    }
                    try {
                        $ifInState = null;
                        if (is_array($destroyEntry) && isset($destroyEntry['ifInState']) && is_string($destroyEntry['ifInState'])) {
                            $ifInState = $destroyEntry['ifInState'];
                        }

                        $ifMatch = null;
                        $requirePrecondition = false;
                        if ($ifInState !== null && $ifInState !== '') {
                            $ifMatch = OptimisticConcurrency::formatEtag(
                                $this->states->resolveEtagForIfInState($username, $cardId, $ifInState),
                            );
                            $requirePrecondition = true;
                        }

                        $this->cards->deleteWithPrecondition($username, $cardId, $ifMatch, null, $requirePrecondition);
                        $destroyed[] = $cardId;
                    } catch (ApiHttpException $e) {
                        $notDestroyed[$cardId] = $this->errorShape($e);
                    }
                }
            }
        }

        return [
            'created' => $created,
            'updated' => $updated,
            'destroyed' => $destroyed,
            'notCreated' => $notCreated,
            'notUpdated' => $notUpdated,
            'notDestroyed' => $notDestroyed,
        ];
    }

    /**
     * @return array{type: string, description: string}
     */
    private function errorShape(ApiHttpException $e): array
    {
        $type = $e->errorCode() ?? 'unknown';
        if ($type === 'stateMismatch' || $type === 'precondition_failed') {
            $type = 'stateMismatch';
        }

        return [
            'type' => $type,
            'description' => $e->getMessage(),
        ];
    }

    /**
     * @param  array<mixed>  $array
     */
    private function isListArray(array $array): bool
    {
        if ($array === []) {
            return true;
        }

        return array_keys($array) === range(0, count($array) - 1);
    }
}
