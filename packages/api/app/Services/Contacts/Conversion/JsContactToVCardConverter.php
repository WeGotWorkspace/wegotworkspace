<?php

declare(strict_types=1);

namespace App\Services\Contacts\Conversion;

use Sabre\VObject\Component\VCard;
use Sabre\VObject\Property;

final class JsContactToVCardConverter
{
    /** RFC 9555 §3 reverse conversion; optional uid per RFC 9982 when Card.version is "2.0"+. */
    private int $groupCounter = 0;

    public function convert(array $card): string
    {
        $this->groupCounter = 0;
        $vcard = new VCard([], false);

        $version = $this->versionFromCard($card);
        $vcard->add('VERSION', $version);

        if (isset($card['uid']) && is_string($card['uid'])) {
            $vcard->add('UID', $card['uid']);
        }

        if (isset($card['kind']) && is_string($card['kind'])) {
            $vcard->add('KIND', $card['kind']);
        }

        if (isset($card['language']) && is_string($card['language'])) {
            $vcard->add('LANGUAGE', $card['language']);
        }

        if (isset($card['prodId']) && is_string($card['prodId'])) {
            $vcard->add('PRODID', $card['prodId']);
        }

        if (isset($card['created']) && is_string($card['created'])) {
            $vcard->add('CREATED', ConversionSupport::utcDateTimeToVCard($card['created']));
        }

        if (isset($card['updated']) && is_string($card['updated'])) {
            $vcard->add('REV', ConversionSupport::utcDateTimeToVCard($card['updated']));
        }

        $this->writeName($vcard, $card);
        $this->writeEmails($vcard, $card);
        $this->writePhones($vcard, $card);
        $this->writeAddresses($vcard, $card);
        $this->writeOrganizations($vcard, $card);
        $this->writeNotes($vcard, $card);
        $this->writeMedia($vcard, $card);
        $this->writeKeywords($vcard, $card);
        $this->writeMembers($vcard, $card);
        $this->writeNicknames($vcard, $card);
        $this->writeTitles($vcard, $card);
        $this->writeLinks($vcard, $card);
        $this->writePreferredLanguages($vcard, $card);
        $this->writeOnlineServices($vcard, $card);
        $this->writeSpeakToAs($vcard, $card);
        $this->writeAnniversaries($vcard, $card);
        $this->writeRelated($vcard, $card);
        $this->writeDirectories($vcard, $card);
        $this->writePersonalInfo($vcard, $card);
        $this->writeCryptoKeys($vcard, $card);
        $this->writeCalendars($vcard, $card);
        $this->writeSchedulingAddresses($vcard, $card);
        $this->writeVCardProps($vcard, $card);

        return $vcard->serialize();
    }

    /**
     * @param  array<string, mixed>  $card
     */
    private function writeName(VCard $vcard, array $card): void
    {
        $name = $card['name'] ?? null;
        if (! is_array($name)) {
            $vcard->add('FN', '');

            return;
        }

        if (isset($name['full']) && is_string($name['full']) && $name['full'] !== '') {
            $vcard->add('FN', $name['full']);
        } else {
            $derived = ConversionSupport::deriveFullName($card);
            $params = $derived === '' ? [] : ['derived' => 'TRUE'];
            $vcard->add('FN', $derived, $params);
        }

        $components = $name['components'] ?? null;
        if (! is_array($components) || $components === []) {
            return;
        }

        $parts = ConversionSupport::nPartsFromComponents($components);
        $params = [];
        if (isset($name['sortAs']) && is_array($name['sortAs'])) {
            $sortAs = [];
            if (isset($name['sortAs']['surname'])) {
                $sortAs[] = (string) $name['sortAs']['surname'];
            }
            if (isset($name['sortAs']['given'])) {
                $sortAs[] = (string) $name['sortAs']['given'];
            }
            if ($sortAs !== []) {
                $params['sort-as'] = implode(',', $sortAs);
            }
        }
        $vcard->add('N', $parts, $params);
    }

    /**
     * @param  array<string, mixed>  $card
     */
    private function writeEmails(VCard $vcard, array $card): void
    {
        foreach ($this->idMapEntries($card['emails'] ?? null) as $id => $entry) {
            if (! is_array($entry) || ! isset($entry['address'])) {
                continue;
            }
            $params = $this->sharedParams($entry, $id);
            $vcard->add('EMAIL', (string) $entry['address'], $params);
        }
    }

    /**
     * @param  array<string, mixed>  $card
     */
    private function writePhones(VCard $vcard, array $card): void
    {
        foreach ($this->idMapEntries($card['phones'] ?? null) as $id => $entry) {
            if (! is_array($entry) || ! isset($entry['number'])) {
                continue;
            }
            $params = $this->sharedParams($entry, $id);
            $types = [];
            if (isset($entry['features']) && is_array($entry['features'])) {
                $types = ConversionSupport::telTypesFromFeatures($entry['features'], $entry['contexts'] ?? null);
            } elseif (isset($entry['contexts']) && is_array($entry['contexts'])) {
                $types = ConversionSupport::telTypesFromFeatures([], $entry['contexts']);
            }
            if ($types !== []) {
                $params['type'] = implode(',', $types);
            }
            $group = $this->maybeWriteLabel($vcard, $entry, $params);
            $property = $vcard->add('TEL', (string) $entry['number'], $params);
            if ($group !== null) {
                $property->group = $group;
            }
        }
    }

    /**
     * @param  array<string, mixed>  $card
     */
    private function writeAddresses(VCard $vcard, array $card): void
    {
        foreach ($this->idMapEntries($card['addresses'] ?? null) as $id => $entry) {
            if (! is_array($entry)) {
                continue;
            }
            $components = $entry['components'] ?? [];
            $hasComponents = is_array($components) && $components !== [];
            $hasCoordinates = isset($entry['coordinates']);
            $hasTimeZone = isset($entry['timeZone']);

            if (! $hasComponents && $hasCoordinates && ! $hasTimeZone) {
                $params = $this->sharedParams($entry, $id);
                $vcard->add('GEO', $this->coordinatesToGeo((string) $entry['coordinates']), $params);

                continue;
            }

            if (! $hasComponents && $hasTimeZone && ! $hasCoordinates) {
                $params = $this->sharedParams($entry, $id);
                $timeZone = (string) $entry['timeZone'];
                if (str_starts_with($timeZone, 'Etc/GMT')) {
                    $params['value'] = 'UTC-OFFSET';
                    $vcard->add('TZ', $this->etcGmtToUtcOffset($timeZone), $params);
                } else {
                    $params['value'] = 'TEXT';
                    $vcard->add('TZ', $timeZone, $params);
                }

                continue;
            }

            $useRfc9554 = is_array($components) && $this->usesRfc9554AddressComponents($components);
            $parts = is_array($components)
                ? ConversionSupport::adrPartsFromComponents($components, $useRfc9554)
                : array_fill(0, $useRfc9554 ? 18 : 7, '');

            $params = $this->sharedParams($entry, $id);
            if (isset($entry['countryCode'])) {
                $params['cc'] = (string) $entry['countryCode'];
            }
            if (isset($entry['full'])) {
                $params['label'] = (string) $entry['full'];
            }
            if (isset($entry['coordinates'])) {
                $params['geo'] = $this->coordinatesToGeo((string) $entry['coordinates']);
            }
            if (isset($entry['timeZone'])) {
                $params['tz'] = (string) $entry['timeZone'];
            }
            $vcard->add('ADR', $parts, $params);
        }
    }

    /**
     * @param  array<string, mixed>  $card
     */
    private function writeOrganizations(VCard $vcard, array $card): void
    {
        foreach ($this->idMapEntries($card['organizations'] ?? null) as $id => $entry) {
            if (! is_array($entry)) {
                continue;
            }
            $parts = [(string) ($entry['name'] ?? '')];
            if (isset($entry['units']) && is_array($entry['units'])) {
                foreach ($entry['units'] as $unit) {
                    if (is_array($unit) && isset($unit['name'])) {
                        $parts[] = (string) $unit['name'];
                    }
                }
            }
            $params = $this->sharedParams($entry, $id);
            if (isset($entry['sortAs'])) {
                $sortAs = [(string) $entry['sortAs']];
                if (isset($entry['units']) && is_array($entry['units'])) {
                    foreach ($entry['units'] as $unit) {
                        if (is_array($unit) && isset($unit['sortAs'])) {
                            $sortAs[] = (string) $unit['sortAs'];
                        }
                    }
                }
                $params['sort-as'] = implode(',', $sortAs);
            }
            $vcard->add('ORG', $parts, $params);
        }
    }

    /**
     * @param  array<string, mixed>  $card
     */
    private function writeNotes(VCard $vcard, array $card): void
    {
        foreach ($this->idMapEntries($card['notes'] ?? null) as $id => $entry) {
            if (! is_array($entry) || ! isset($entry['note'])) {
                continue;
            }
            $params = $this->sharedParams($entry, $id);
            if (isset($entry['created'])) {
                $params['created'] = ConversionSupport::utcDateTimeToVCard((string) $entry['created']);
            }
            if (isset($entry['author']) && is_array($entry['author'])) {
                if (isset($entry['author']['name'])) {
                    $params['author-name'] = (string) $entry['author']['name'];
                }
                if (isset($entry['author']['uri'])) {
                    $params['author'] = (string) $entry['author']['uri'];
                }
            }
            $vcard->add('NOTE', (string) $entry['note'], $params);
        }
    }

    /**
     * @param  array<string, mixed>  $card
     */
    private function writeMedia(VCard $vcard, array $card): void
    {
        foreach ($this->idMapEntries($card['media'] ?? null) as $id => $entry) {
            if (! is_array($entry) || ! isset($entry['uri'], $entry['kind'])) {
                continue;
            }
            $propertyName = match ((string) $entry['kind']) {
                'logo' => 'LOGO',
                'sound' => 'SOUND',
                default => 'PHOTO',
            };
            $params = $this->sharedParams($entry, $id);
            $uri = (string) $entry['uri'];
            if (str_starts_with(strtolower($uri), 'data:')) {
                if (preg_match('#^data:([^;]+);base64,(.+)$#i', $uri, $matches) === 1) {
                    $params['value'] = 'BINARY';
                    $params['mediatype'] = $matches[1];
                    $vcard->add($propertyName, $matches[2], $params);

                    continue;
                }
            }
            if (isset($entry['mediaType'])) {
                $params['mediatype'] = (string) $entry['mediaType'];
            }
            $vcard->add($propertyName, $uri, $params);
        }
    }

    /**
     * @param  array<string, mixed>  $card
     */
    private function writeKeywords(VCard $vcard, array $card): void
    {
        $keywords = $card['keywords'] ?? null;
        if (! is_array($keywords) || $keywords === []) {
            return;
        }
        $values = array_keys(array_filter($keywords, static fn ($enabled): bool => (bool) $enabled));
        if ($values !== []) {
            $vcard->add('CATEGORIES', $values);
        }
    }

    /**
     * @param  array<string, mixed>  $card
     */
    private function writeMembers(VCard $vcard, array $card): void
    {
        $members = $card['members'] ?? null;
        if (! is_array($members)) {
            return;
        }
        foreach (array_keys(array_filter($members, static fn ($enabled): bool => (bool) $enabled)) as $memberUid) {
            $vcard->add('MEMBER', (string) $memberUid);
        }
    }

    /**
     * @param  array<string, mixed>  $card
     */
    private function writeNicknames(VCard $vcard, array $card): void
    {
        foreach ($this->idMapEntries($card['nicknames'] ?? null) as $id => $entry) {
            if (! is_array($entry) || ! isset($entry['name'])) {
                continue;
            }
            $vcard->add('NICKNAME', (string) $entry['name'], $this->sharedParams($entry, $id));
        }
    }

    /**
     * @param  array<string, mixed>  $card
     */
    private function writeTitles(VCard $vcard, array $card): void
    {
        foreach ($this->idMapEntries($card['titles'] ?? null) as $id => $entry) {
            if (! is_array($entry) || ! isset($entry['name'])) {
                continue;
            }
            $kind = (string) ($entry['kind'] ?? 'title');
            $propertyName = $kind === 'role' ? 'ROLE' : 'TITLE';
            $vcard->add($propertyName, (string) $entry['name'], $this->sharedParams($entry, $id));
        }
    }

    /**
     * @param  array<string, mixed>  $card
     */
    private function writeLinks(VCard $vcard, array $card): void
    {
        foreach ($this->idMapEntries($card['links'] ?? null) as $id => $entry) {
            if (! is_array($entry) || ! isset($entry['uri'])) {
                continue;
            }
            $propertyName = (($entry['kind'] ?? null) === 'contact') ? 'CONTACT-URI' : 'URL';
            $vcard->add($propertyName, (string) $entry['uri'], $this->sharedParams($entry, $id));
        }
    }

    /**
     * @param  array<string, mixed>  $card
     */
    private function writePreferredLanguages(VCard $vcard, array $card): void
    {
        foreach ($this->idMapEntries($card['preferredLanguages'] ?? null) as $id => $entry) {
            if (! is_array($entry) || ! isset($entry['language'])) {
                continue;
            }
            $vcard->add('LANG', (string) $entry['language'], $this->sharedParams($entry, $id));
        }
    }

    /**
     * @param  array<string, mixed>  $card
     */
    private function writeOnlineServices(VCard $vcard, array $card): void
    {
        foreach ($this->idMapEntries($card['onlineServices'] ?? null) as $id => $entry) {
            if (! is_array($entry)) {
                continue;
            }
            $propertyName = match (strtolower((string) ($entry['vCardName'] ?? 'impp'))) {
                'socialprofile' => 'SOCIALPROFILE',
                default => 'IMPP',
            };
            $value = isset($entry['uri']) ? (string) $entry['uri'] : (string) ($entry['user'] ?? '');
            $params = $this->sharedParams($entry, $id);
            if (isset($entry['service'])) {
                $params['service-type'] = (string) $entry['service'];
            }
            if (isset($entry['user'])) {
                $params['username'] = (string) $entry['user'];
            }
            $vcard->add($propertyName, $value, $params);
        }
    }

    /**
     * @param  array<string, mixed>  $card
     */
    private function writeSpeakToAs(VCard $vcard, array $card): void
    {
        $speakToAs = $card['speakToAs'] ?? null;
        if (! is_array($speakToAs)) {
            return;
        }
        if (isset($speakToAs['grammaticalGender'])) {
            $vcard->add('GRAMGENDER', strtoupper((string) $speakToAs['grammaticalGender']));
        }
        foreach ($this->idMapEntries($speakToAs['pronouns'] ?? null) as $id => $entry) {
            if (! is_array($entry) || ! isset($entry['pronouns'])) {
                continue;
            }
            $vcard->add('PRONOUNS', (string) $entry['pronouns'], $this->sharedParams($entry, $id));
        }
    }

    /**
     * @param  array<string, mixed>  $card
     */
    private function writeAnniversaries(VCard $vcard, array $card): void
    {
        foreach ($this->idMapEntries($card['anniversaries'] ?? null) as $id => $entry) {
            if (! is_array($entry) || ! isset($entry['kind'], $entry['date']) || ! is_array($entry['date'])) {
                continue;
            }
            $kind = (string) $entry['kind'];
            $propertyName = match ($kind) {
                'death' => 'DEATHDATE',
                'wedding' => 'ANNIVERSARY',
                default => 'BDAY',
            };
            [$value, $dateParams] = ConversionSupport::anniversaryDateToVCardValue($entry['date'], $propertyName);
            $params = array_merge(['prop-id' => $id], $dateParams);
            $vcard->add($propertyName, $value, $params);

            if (! isset($entry['place']) || ! is_array($entry['place'])) {
                continue;
            }
            $placeProperty = match ($kind) {
                'death' => 'DEATHPLACE',
                default => 'BIRTHPLACE',
            };
            if ($kind === 'wedding') {
                continue;
            }
            $place = $entry['place'];
            if (isset($place['coordinates'])) {
                $vcard->add($placeProperty, (string) $place['coordinates'], ['value' => 'URI']);
            } elseif (isset($place['full'])) {
                $vcard->add($placeProperty, (string) $place['full']);
            }
        }
    }

    /**
     * @param  array<string, mixed>  $card
     */
    private function writeRelated(VCard $vcard, array $card): void
    {
        $relatedTo = $card['relatedTo'] ?? null;
        if (! is_array($relatedTo)) {
            return;
        }
        foreach ($relatedTo as $key => $entry) {
            if (! is_array($entry)) {
                continue;
            }
            $params = [];
            $relations = $entry['relation'] ?? null;
            if (is_array($relations) && $relations !== []) {
                $types = array_keys(array_filter($relations, static fn ($enabled): bool => (bool) $enabled));
                if ($types !== []) {
                    $params['type'] = implode(',', $types);
                }
            }
            $vcard->add('RELATED', (string) $key, $params);
        }
    }

    /**
     * @param  array<string, mixed>  $card
     */
    private function writeDirectories(VCard $vcard, array $card): void
    {
        foreach ($this->idMapEntries($card['directories'] ?? null) as $id => $entry) {
            if (! is_array($entry) || ! isset($entry['uri'], $entry['kind'])) {
                continue;
            }
            $propertyName = ((string) $entry['kind']) === 'entry' ? 'SOURCE' : 'ORG-DIRECTORY';
            $params = $this->sharedParams($entry, $id);
            if (isset($entry['listAs'])) {
                $params['index'] = (string) $entry['listAs'];
            }
            $vcard->add($propertyName, (string) $entry['uri'], $params);
        }
    }

    /**
     * @param  array<string, mixed>  $card
     */
    private function writePersonalInfo(VCard $vcard, array $card): void
    {
        foreach ($this->idMapEntries($card['personalInfo'] ?? null) as $id => $entry) {
            if (! is_array($entry) || ! isset($entry['kind'], $entry['value'])) {
                continue;
            }
            $propertyName = match ((string) $entry['kind']) {
                'hobby' => 'HOBBY',
                'interest' => 'INTEREST',
                default => 'EXPERTISE',
            };
            $params = $this->sharedParams($entry, $id);
            if ($propertyName === 'EXPERTISE' && isset($entry['level'])) {
                $params['level'] = ConversionSupport::expertiseLevelToVCard((string) $entry['level']);
            }
            if (isset($entry['listAs'])) {
                $params['index'] = (string) $entry['listAs'];
            }
            $vcard->add($propertyName, (string) $entry['value'], $params);
        }
    }

    /**
     * @param  array<string, mixed>  $card
     */
    private function writeCryptoKeys(VCard $vcard, array $card): void
    {
        foreach ($this->idMapEntries($card['cryptoKeys'] ?? null) as $id => $entry) {
            if (! is_array($entry) || ! isset($entry['uri'])) {
                continue;
            }
            $params = $this->sharedParams($entry, $id);
            if (isset($entry['mediaType'])) {
                $params['mediatype'] = (string) $entry['mediaType'];
            }
            $vcard->add('KEY', (string) $entry['uri'], $params);
        }
    }

    /**
     * @param  array<string, mixed>  $card
     */
    private function writeCalendars(VCard $vcard, array $card): void
    {
        foreach ($this->idMapEntries($card['calendars'] ?? null) as $id => $entry) {
            if (! is_array($entry) || ! isset($entry['uri'], $entry['kind'])) {
                continue;
            }
            $propertyName = ((string) $entry['kind']) === 'freeBusy' ? 'FBURL' : 'CALURI';
            $vcard->add($propertyName, (string) $entry['uri'], $this->sharedParams($entry, $id));
        }
    }

    /**
     * @param  array<string, mixed>  $card
     */
    private function writeSchedulingAddresses(VCard $vcard, array $card): void
    {
        foreach ($this->idMapEntries($card['schedulingAddresses'] ?? null) as $id => $entry) {
            if (! is_array($entry) || ! isset($entry['uri'])) {
                continue;
            }
            $vcard->add('CALADRURI', (string) $entry['uri'], $this->sharedParams($entry, $id));
        }
    }

    /**
     * @param  array<string, mixed>  $card
     */
    private function writeVCardProps(VCard $vcard, array $card): void
    {
        $props = $card['vCardProps'] ?? null;
        if (! is_array($props)) {
            return;
        }
        foreach ($props as $tuple) {
            if (! is_array($tuple) || count($tuple) < 4) {
                continue;
            }
            $name = strtoupper((string) $tuple[0]);
            if ($name === 'VERSION') {
                continue;
            }
            $params = is_array($tuple[1]) ? $tuple[1] : [];
            $valueType = isset($tuple[2]) ? (string) $tuple[2] : 'text';
            $value = $tuple[3];
            $vparams = [];
            foreach ($params as $paramName => $paramValue) {
                $vparams[strtolower((string) $paramName)] = $paramValue;
            }
            if ($valueType !== '' && strtolower($valueType) !== 'text') {
                $vparams['value'] = strtoupper($valueType);
            }
            $property = $vcard->add($name, $value, $vparams);
            if ($property instanceof Property && isset($params['group'])) {
                $property->group = (string) $params['group'];
            }
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function sharedParams(array $entry, string $id): array
    {
        $params = ['prop-id' => $id];
        if (isset($entry['contexts']) && is_array($entry['contexts'])) {
            $types = [];
            if (isset($entry['contexts']['private'])) {
                $types[] = 'home';
            }
            if (isset($entry['contexts']['work'])) {
                $types[] = 'work';
            }
            if (isset($entry['contexts']['billing'])) {
                $types[] = 'billing';
            }
            if (isset($entry['contexts']['delivery'])) {
                $types[] = 'delivery';
            }
            if ($types !== []) {
                $params['type'] = implode(',', $types);
            }
        }
        if (isset($entry['pref'])) {
            $params['pref'] = (string) $entry['pref'];
        }
        $vCardParams = ConversionSupport::vCardParamsFromObject($entry);
        if ($vCardParams !== null) {
            foreach ($vCardParams as $name => $value) {
                $params[strtolower((string) $name)] = $value;
            }
        }

        return $params;
    }

    /**
     * @return array<string, mixed>
     */
    private function idMapEntries(mixed $map): array
    {
        return is_array($map) ? $map : [];
    }

    /**
     * @param  array<string, mixed>  $entry
     * @param  array<string, mixed>  $params
     */
    private function maybeWriteLabel(VCard $vcard, array $entry, array $params): ?string
    {
        if (! isset($entry['label']) || ! is_string($entry['label']) || $entry['label'] === '') {
            return null;
        }
        $group = 'item'.(++$this->groupCounter);
        $labelProperty = $vcard->add('X-ABLABEL', $entry['label']);
        $labelProperty->group = $group;

        return $group;
    }

    /**
     * @param  list<array<string, mixed>>  $components
     */
    private function usesRfc9554AddressComponents(array $components): bool
    {
        $rfc9554Kinds = ['number', 'block', 'direction', 'landmark', 'subdistrict', 'district', 'room', 'floor', 'building'];
        foreach ($components as $component) {
            if (! is_array($component)) {
                continue;
            }
            if (in_array((string) ($component['kind'] ?? ''), $rfc9554Kinds, true)) {
                return true;
            }
        }

        return false;
    }

    private function coordinatesToGeo(string $coordinates): string
    {
        if (str_starts_with(strtolower($coordinates), 'geo:')) {
            return substr($coordinates, 4);
        }

        return $coordinates;
    }

    private function etcGmtToUtcOffset(string $timeZone): string
    {
        if ($timeZone === 'Etc/UTC') {
            return '+0000';
        }
        if (preg_match('/^Etc\/GMT([+-])(\d+)$/', $timeZone, $matches) === 1) {
            $sign = $matches[1] === '+' ? '-' : '+';
            $hours = str_pad($matches[2], 2, '0', STR_PAD_LEFT);

            return $sign.$hours.'00';
        }

        return $timeZone;
    }

    /**
     * @param  array<string, mixed>  $card
     */
    private function versionFromCard(array $card): string
    {
        $props = $card['vCardProps'] ?? null;
        if (! is_array($props)) {
            return '4.0';
        }
        foreach ($props as $tuple) {
            if (! is_array($tuple) || count($tuple) < 4) {
                continue;
            }
            if (strtoupper((string) $tuple[0]) !== 'VERSION') {
                continue;
            }
            $value = $tuple[3];
            if (is_array($value) && isset($value[0])) {
                return (string) $value[0];
            }
            if (is_string($value) && $value !== '') {
                return $value;
            }
        }

        return '4.0';
    }
}
