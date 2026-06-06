<?php

declare(strict_types=1);

namespace App\Services\Rtc\Signaling;

use App\Models\CollabMessage;
use App\Models\CollabPeer;
use App\Models\MeetMessage;
use App\Models\MeetPeer;
use Illuminate\Database\Eloquent\Model;

enum RtcSignalingPollMode
{
    /** Return messages with id > since; keep rows until pruned. */
    case SinceCursor;

    /** Return undelivered messages and delete them after read. */
    case DeleteOnRead;
}

final readonly class RtcSignalingPolicy
{
    /**
     * @param  list<string>  $allowedSendTypes
     * @param  class-string<Model>  $peerModelClass
     * @param  class-string<Model>  $messageModelClass
     */
    public function __construct(
        public string $peersTable,
        public string $messagesTable,
        public string $peerModelClass,
        public string $messageModelClass,
        public int $peerTimeoutSeconds,
        public int $messageRetentionSeconds,
        public ?int $maxMessagesPerRoom,
        public RtcSignalingPollMode $pollMode,
        public array $allowedSendTypes,
        public string $peerIdPattern,
        public string $sendFromField,
        public bool $unknownPeerWhenMissing,
        public bool $leaveDeletesPeerMessages,
        public bool $trimMessagesOnSend,
        public bool $requireLivePeersOnSend,
    ) {}

    public static function meet(): self
    {
        return new self(
            peersTable: 'meet_peers',
            messagesTable: 'meet_messages',
            peerModelClass: MeetPeer::class,
            messageModelClass: MeetMessage::class,
            peerTimeoutSeconds: 600,
            messageRetentionSeconds: 600,
            maxMessagesPerRoom: null,
            pollMode: RtcSignalingPollMode::DeleteOnRead,
            allowedSendTypes: ['offer', 'answer', 'ice', 'bye'],
            peerIdPattern: '/^[A-Za-z0-9_-]{4,64}$/',
            sendFromField: 'from',
            unknownPeerWhenMissing: true,
            leaveDeletesPeerMessages: false,
            trimMessagesOnSend: false,
            requireLivePeersOnSend: false,
        );
    }

    public static function collab(): self
    {
        return new self(
            peersTable: 'collab_peers',
            messagesTable: 'collab_messages',
            peerModelClass: CollabPeer::class,
            messageModelClass: CollabMessage::class,
            peerTimeoutSeconds: 30,
            messageRetentionSeconds: 600,
            maxMessagesPerRoom: 1000,
            pollMode: RtcSignalingPollMode::SinceCursor,
            allowedSendTypes: ['offer', 'answer', 'ice'],
            peerIdPattern: '/^[a-f0-9]{16}$/',
            sendFromField: 'peerId',
            unknownPeerWhenMissing: true,
            leaveDeletesPeerMessages: true,
            trimMessagesOnSend: true,
            requireLivePeersOnSend: true,
        );
    }
}
