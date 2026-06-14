<?php

declare(strict_types=1);

namespace App\Services\Contacts\Conversion;

/**
 * RFC 9555 bidirectional vCard ↔ JSContact Card converter.
 *
 * Emits JSContact 1.0 by default. uid conversion for version 2.0 is defined in RFC 9982.
 */
final class VCardJsContactConverter
{
    public function __construct(
        private readonly VCardToJsContactConverter $reader = new VCardToJsContactConverter,
        private readonly JsContactToVCardConverter $writer = new JsContactToVCardConverter,
    ) {}

    /**
     * @return array<string, mixed> JSContact Card
     */
    public function cardFromVCard(string $vcard): array
    {
        return $this->reader->convert($vcard);
    }

    /**
     * @param  array<string, mixed>  $card  JSContact Card
     */
    public function vCardFromCard(array $card): string
    {
        return $this->writer->convert($card);
    }
}
