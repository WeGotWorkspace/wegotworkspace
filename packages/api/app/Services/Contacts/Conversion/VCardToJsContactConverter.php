<?php

declare(strict_types=1);

namespace App\Services\Contacts\Conversion;

use App\Services\VObject\VObjectPayloadGuard;
use Sabre\VObject\Component\VCard;
use Sabre\VObject\Property;

final class VCardToJsContactConverter
{
    public function __construct(
        private readonly VObjectPayloadGuard $guard = new VObjectPayloadGuard,
    ) {}

    /** @var array<string, string> */
    private array $groupLabels = [];

    /** @var list<Property> */
    private array $deferredKnownProperties = [];

    /**
     * @return array<string, mixed>
     */
    public function convert(string $vcard): array
    {
        $document = $this->guard->readVCard($vcard);

        $this->groupLabels = [];
        $this->deferredKnownProperties = [];
        foreach ($document->select('X-ABLABEL') as $labelProperty) {
            $group = $this->groupNameFromProperty($labelProperty);
            if ($group !== null) {
                $this->groupLabels[$group] = trim((string) $labelProperty->getValue());
            }
        }

        $card = [
            '@type' => 'Card',
            'version' => '1.0',
        ];

        if (isset($document->UID)) {
            $card['uid'] = trim((string) $document->UID->getValue());
        } else {
            // RFC 9555 §2.1.1 for version "1.0"; RFC 9982 §5 omits uid for version "2.0"+.
            $card['uid'] = ConversionSupport::generateUid($vcard);
        }

        if (isset($document->KIND)) {
            $card['kind'] = strtolower(trim((string) $document->KIND->getValue()));
        }

        if (isset($document->LANGUAGE)) {
            $card['language'] = trim((string) $document->LANGUAGE->getValue());
        }

        if (isset($document->PRODID)) {
            $card['prodId'] = trim((string) $document->PRODID->getValue());
        }

        if (isset($document->CREATED)) {
            $card['created'] = ConversionSupport::normalizeUtcDateTime((string) $document->CREATED->getValue());
        }

        if (isset($document->REV)) {
            $card['updated'] = ConversionSupport::normalizeUtcDateTime((string) $document->REV->getValue());
        }

        $this->convertName($document, $card);
        $this->convertEmails($document, $card);
        $this->convertPhones($document, $card);
        $this->convertAddresses($document, $card);
        $this->convertOrganizations($document, $card);
        $this->convertNotes($document, $card);
        $this->convertMedia($document, $card);
        $this->convertKeywords($document, $card);
        $this->convertMembers($document, $card);
        $this->convertNicknames($document, $card);
        $this->convertTitles($document, $card);
        $this->convertLinks($document, $card);
        $this->convertPreferredLanguages($document, $card);
        $this->convertOnlineServices($document, $card);
        $this->convertSpeakToAs($document, $card);
        $this->convertAnniversaries($document, $card);
        $this->convertRelated($document, $card);
        $this->convertDirectories($document, $card);
        $this->convertPersonalInfo($document, $card);
        $this->convertCryptoKeys($document, $card);
        $this->convertCalendars($document, $card);
        $this->convertSchedulingAddresses($document, $card);
        $this->convertVCardProps($document, $card);

        return $card;
    }

    /**
     * @param  array<string, mixed>  $card
     */
    private function convertName(VCard $document, array &$card): void
    {
        $name = [];

        if (isset($document->FN) && ! ConversionSupport::isDerived($document->FN)) {
            $name['full'] = trim((string) $document->FN->getValue());
        }

        if (isset($document->N)) {
            $components = ConversionSupport::nameComponentsFromProperty($document->N);
            if ($components !== []) {
                $name['components'] = $components;
                $name['isOrdered'] = false;
            }
            if (isset($document->N['SORT-AS'])) {
                $sortParts = $document->N->getParts();
                $sortAsParts = ConversionSupport::splitStructuredValues((string) $document->N['SORT-AS']);
                $sortAs = [];
                if (isset($sortAsParts[0]) && $sortAsParts[0] !== '') {
                    $sortAs['surname'] = $sortAsParts[0];
                }
                if (isset($sortAsParts[1]) && $sortAsParts[1] !== '') {
                    $sortAs['given'] = $sortAsParts[1];
                }
                if ($sortAs !== []) {
                    $name['sortAs'] = $sortAs;
                }
                unset($sortParts);
            }
        }

        if ($name !== []) {
            $name['@type'] = 'Name';
            $card['name'] = $name;
        }
    }

    /**
     * @param  array<string, mixed>  $card
     */
    private function convertEmails(VCard $document, array &$card): void
    {
        $emails = [];
        foreach ($document->select('EMAIL') as $index => $property) {
            $entry = [
                '@type' => 'EmailAddress',
                'address' => trim((string) $property->getValue()),
            ];
            ConversionSupport::applySharedFields($entry, $property);
            $this->applyGroupLabel($entry, $property);
            $emails[ConversionSupport::propertyId($property, $index)] = $entry;
        }
        if ($emails !== []) {
            $card['emails'] = $emails;
        }
    }

    /**
     * @param  array<string, mixed>  $card
     */
    private function convertPhones(VCard $document, array &$card): void
    {
        $phones = [];
        foreach ($document->select('TEL') as $index => $property) {
            $entry = [
                '@type' => 'Phone',
                'number' => trim((string) $property->getValue()),
            ];
            $features = ConversionSupport::telFeaturesFromProperty($property);
            if ($features !== null) {
                $entry['features'] = $features;
            }
            ConversionSupport::applySharedFields($entry, $property);
            $this->applyGroupLabel($entry, $property);
            $phones[ConversionSupport::propertyId($property, $index)] = $entry;
        }
        if ($phones !== []) {
            $card['phones'] = $phones;
        }
    }

    /**
     * @param  array<string, mixed>  $card
     */
    private function convertAddresses(VCard $document, array &$card): void
    {
        $addresses = [];
        foreach ($document->select('ADR') as $index => $property) {
            $parts = ConversionSupport::structuredParts($property);
            $components = ConversionSupport::addressComponentsFromParts($parts);
            $entry = [
                '@type' => 'Address',
                'components' => $components,
                'isOrdered' => false,
            ];
            if (isset($property['CC'])) {
                $entry['countryCode'] = (string) $property['CC'];
            }
            if (isset($property['LABEL'])) {
                $entry['full'] = (string) $property['LABEL'];
            }
            if (isset($property['GEO'])) {
                $entry['coordinates'] = $this->geoToCoordinates((string) $property['GEO']);
            }
            if (isset($property['TZ'])) {
                $entry['timeZone'] = $this->tzToTimeZone($property);
            }
            ConversionSupport::applySharedFields($entry, $property);
            $this->applyGroupLabel($entry, $property);
            $addresses[ConversionSupport::propertyId($property, $index)] = $entry;
        }

        foreach ($document->select('GEO') as $index => $property) {
            $entry = [
                '@type' => 'Address',
                'coordinates' => $this->geoToCoordinates((string) $property->getValue()),
            ];
            ConversionSupport::applySharedFields($entry, $property);
            $addresses[ConversionSupport::propertyId($property, $index)] = $entry;
        }

        foreach ($document->select('TZ') as $index => $property) {
            $timeZone = $this->tzToTimeZone($property);
            if ($timeZone === null) {
                $this->deferredKnownProperties[] = $property;

                continue;
            }
            $entry = [
                '@type' => 'Address',
                'timeZone' => $timeZone,
            ];
            ConversionSupport::applySharedFields($entry, $property);
            $addresses[ConversionSupport::propertyId($property, $index)] = $entry;
        }

        if ($addresses !== []) {
            $card['addresses'] = $addresses;
        }
    }

    /**
     * @param  array<string, mixed>  $card
     */
    private function convertOrganizations(VCard $document, array &$card): void
    {
        $organizations = [];
        foreach ($document->select('ORG') as $index => $property) {
            $parts = ConversionSupport::structuredParts($property);
            $name = trim((string) ($parts[0] ?? ''));
            $units = [];
            for ($i = 1, $count = count($parts); $i < $count; $i++) {
                $unitName = trim((string) $parts[$i]);
                if ($unitName === '') {
                    continue;
                }
                $units[] = ['@type' => 'OrgUnit', 'name' => $unitName];
            }
            $entry = ['@type' => 'Organization'];
            if ($name !== '') {
                $entry['name'] = $name;
            }
            if ($units !== []) {
                $entry['units'] = $units;
            }
            if (isset($property['SORT-AS'])) {
                $sortParts = ConversionSupport::splitStructuredValues((string) $property['SORT-AS']);
                if (isset($sortParts[0]) && $sortParts[0] !== '') {
                    $entry['sortAs'] = $sortParts[0];
                }
                for ($i = 1, $count = count($sortParts); $i < $count; $i++) {
                    $unitIndex = $i - 1;
                    if (! isset($entry['units'][$unitIndex])) {
                        continue;
                    }
                    $entry['units'][$unitIndex]['sortAs'] = $sortParts[$i];
                }
            }
            ConversionSupport::applySharedFields($entry, $property);
            $organizations[ConversionSupport::propertyId($property, $index)] = $entry;
        }
        if ($organizations !== []) {
            $card['organizations'] = $organizations;
        }
    }

    /**
     * @param  array<string, mixed>  $card
     */
    private function convertNotes(VCard $document, array &$card): void
    {
        $notes = [];
        foreach ($document->select('NOTE') as $index => $property) {
            $entry = [
                '@type' => 'Note',
                'note' => str_replace('\,', ',', trim((string) $property->getValue())),
            ];
            if (isset($property['CREATED'])) {
                $entry['created'] = ConversionSupport::normalizeUtcDateTime((string) $property['CREATED']);
            }
            $author = [];
            if (isset($property['AUTHOR-NAME'])) {
                $author['name'] = (string) $property['AUTHOR-NAME'];
            }
            if (isset($property['AUTHOR'])) {
                $author['uri'] = (string) $property['AUTHOR'];
            }
            if ($author !== []) {
                $author['@type'] = 'Author';
                $entry['author'] = $author;
            }
            $notes[ConversionSupport::propertyId($property, $index)] = $entry;
        }
        if ($notes !== []) {
            $card['notes'] = $notes;
        }
    }

    /**
     * @param  array<string, mixed>  $card
     */
    private function convertMedia(VCard $document, array &$card): void
    {
        $media = [];
        foreach ($document->select('PHOTO') as $index => $property) {
            $entry = [
                '@type' => 'Media',
                'kind' => 'photo',
                'uri' => ConversionSupport::mediaUriFromProperty($property),
            ];
            if (isset($property['MEDIATYPE'])) {
                $entry['mediaType'] = (string) $property['MEDIATYPE'];
            }
            ConversionSupport::applySharedFields($entry, $property);
            $media[ConversionSupport::propertyId($property, $index)] = $entry;
        }
        foreach ($document->select('LOGO') as $index => $property) {
            $entry = [
                '@type' => 'Media',
                'kind' => 'logo',
                'uri' => ConversionSupport::mediaUriFromProperty($property),
            ];
            ConversionSupport::applySharedFields($entry, $property);
            $media[ConversionSupport::propertyId($property, $index)] = $entry;
        }
        foreach ($document->select('SOUND') as $index => $property) {
            $entry = [
                '@type' => 'Media',
                'kind' => 'sound',
                'uri' => ConversionSupport::mediaUriFromProperty($property),
            ];
            ConversionSupport::applySharedFields($entry, $property);
            $media[ConversionSupport::propertyId($property, $index)] = $entry;
        }
        if ($media !== []) {
            $card['media'] = $media;
        }
    }

    /**
     * @param  array<string, mixed>  $card
     */
    private function convertKeywords(VCard $document, array &$card): void
    {
        $keywords = [];
        foreach ($document->select('CATEGORIES') as $property) {
            foreach ($property->getParts() as $part) {
                $keyword = trim((string) $part);
                if ($keyword !== '') {
                    $keywords[$keyword] = true;
                }
            }
        }
        if ($keywords !== []) {
            $card['keywords'] = $keywords;
        }
    }

    /**
     * @param  array<string, mixed>  $card
     */
    private function convertMembers(VCard $document, array &$card): void
    {
        $members = [];
        foreach ($document->select('MEMBER') as $property) {
            $uid = trim((string) $property->getValue());
            if ($uid !== '') {
                $members[$uid] = true;
            }
        }
        if ($members !== []) {
            $card['members'] = $members;
        }
    }

    /**
     * @param  array<string, mixed>  $card
     */
    private function convertNicknames(VCard $document, array &$card): void
    {
        $nicknames = [];
        foreach ($document->select('NICKNAME') as $index => $property) {
            $entry = [
                '@type' => 'Nickname',
                'name' => trim((string) $property->getValue()),
            ];
            ConversionSupport::applySharedFields($entry, $property);
            $nicknames[ConversionSupport::propertyId($property, $index)] = $entry;
        }
        if ($nicknames !== []) {
            $card['nicknames'] = $nicknames;
        }
    }

    /**
     * @param  array<string, mixed>  $card
     */
    private function convertTitles(VCard $document, array &$card): void
    {
        $titles = [];
        foreach ($document->select('TITLE') as $index => $property) {
            $entry = [
                '@type' => 'Title',
                'kind' => 'title',
                'name' => trim((string) $property->getValue()),
            ];
            ConversionSupport::applySharedFields($entry, $property);
            $titles[ConversionSupport::propertyId($property, $index)] = $entry;
        }
        foreach ($document->select('ROLE') as $index => $property) {
            $entry = [
                '@type' => 'Title',
                'kind' => 'role',
                'name' => trim((string) $property->getValue()),
            ];
            ConversionSupport::applySharedFields($entry, $property);
            $titles[ConversionSupport::propertyId($property, $index)] = $entry;
        }
        if ($titles !== []) {
            $card['titles'] = $titles;
        }
    }

    /**
     * @param  array<string, mixed>  $card
     */
    private function convertLinks(VCard $document, array &$card): void
    {
        $links = [];
        foreach ($document->select('URL') as $index => $property) {
            $entry = [
                '@type' => 'Link',
                'uri' => trim((string) $property->getValue()),
            ];
            ConversionSupport::applySharedFields($entry, $property);
            $links[ConversionSupport::propertyId($property, $index)] = $entry;
        }
        foreach ($document->select('CONTACT-URI') as $index => $property) {
            $entry = [
                '@type' => 'Link',
                'kind' => 'contact',
                'uri' => trim((string) $property->getValue()),
            ];
            ConversionSupport::applySharedFields($entry, $property);
            $links[ConversionSupport::propertyId($property, $index)] = $entry;
        }
        if ($links !== []) {
            $card['links'] = $links;
        }
    }

    /**
     * @param  array<string, mixed>  $card
     */
    private function convertPreferredLanguages(VCard $document, array &$card): void
    {
        $languages = [];
        foreach ($document->select('LANG') as $index => $property) {
            $entry = [
                '@type' => 'LanguagePref',
                'language' => trim((string) $property->getValue()),
            ];
            ConversionSupport::applySharedFields($entry, $property);
            $languages[ConversionSupport::propertyId($property, $index)] = $entry;
        }
        if ($languages !== []) {
            $card['preferredLanguages'] = $languages;
        }
    }

    /**
     * @param  array<string, mixed>  $card
     */
    private function convertOnlineServices(VCard $document, array &$card): void
    {
        $services = [];
        foreach ($document->select('IMPP') as $index => $property) {
            $entry = [
                '@type' => 'OnlineService',
                'uri' => trim((string) $property->getValue()),
                'vCardName' => 'impp',
            ];
            if (isset($property['SERVICE-TYPE'])) {
                $entry['service'] = (string) $property['SERVICE-TYPE'];
            }
            if (isset($property['USERNAME'])) {
                $entry['user'] = (string) $property['USERNAME'];
            }
            ConversionSupport::applySharedFields($entry, $property);
            $services[ConversionSupport::propertyId($property, $index)] = $entry;
        }
        foreach ($document->select('SOCIALPROFILE') as $index => $property) {
            $value = trim((string) $property->getValue());
            $entry = [
                '@type' => 'OnlineService',
                'vCardName' => 'socialprofile',
            ];
            if (preg_match('#^[a-z][a-z0-9+.-]*:#i', $value) === 1) {
                $entry['uri'] = $value;
            } else {
                $entry['user'] = $value;
            }
            if (isset($property['SERVICE-TYPE'])) {
                $entry['service'] = (string) $property['SERVICE-TYPE'];
            }
            if (isset($property['USERNAME'])) {
                $entry['user'] = (string) $property['USERNAME'];
            }
            ConversionSupport::applySharedFields($entry, $property);
            $services[ConversionSupport::propertyId($property, $index)] = $entry;
        }
        if ($services !== []) {
            $card['onlineServices'] = $services;
        }
    }

    /**
     * @param  array<string, mixed>  $card
     */
    private function convertSpeakToAs(VCard $document, array &$card): void
    {
        $speakToAs = [];
        if (isset($document->GRAMGENDER)) {
            $speakToAs['grammaticalGender'] = strtolower(trim((string) $document->GRAMGENDER->getValue()));
        }
        $pronouns = [];
        foreach ($document->select('PRONOUNS') as $index => $property) {
            $entry = [
                '@type' => 'Pronouns',
                'pronouns' => trim((string) $property->getValue()),
            ];
            ConversionSupport::applySharedFields($entry, $property);
            $pronouns[ConversionSupport::propertyId($property, $index)] = $entry;
        }
        if ($pronouns !== []) {
            $speakToAs['pronouns'] = $pronouns;
        }
        if ($speakToAs !== []) {
            $speakToAs['@type'] = 'SpeakToAs';
            $card['speakToAs'] = $speakToAs;
        }
    }

    /**
     * @param  array<string, mixed>  $card
     */
    private function convertAnniversaries(VCard $document, array &$card): void
    {
        $anniversaries = [];

        foreach ($document->select('BDAY') as $index => $property) {
            $date = ConversionSupport::anniversaryDateFromProperty($property, true);
            if ($date === null) {
                $this->deferredKnownProperties[] = $property;

                continue;
            }
            $entry = [
                '@type' => 'Anniversary',
                'kind' => 'birth',
                'date' => $date,
            ];
            $anniversaries[ConversionSupport::propertyId($property, $index)] = $entry;
        }

        foreach ($document->select('DEATHDATE') as $index => $property) {
            $date = ConversionSupport::anniversaryDateFromProperty($property, true);
            if ($date === null) {
                $this->deferredKnownProperties[] = $property;

                continue;
            }
            $entry = [
                '@type' => 'Anniversary',
                'kind' => 'death',
                'date' => $date,
            ];
            $anniversaries[ConversionSupport::propertyId($property, $index)] = $entry;
        }

        foreach ($document->select('ANNIVERSARY') as $index => $property) {
            $date = ConversionSupport::anniversaryDateFromProperty($property, false);
            if ($date === null) {
                $this->deferredKnownProperties[] = $property;

                continue;
            }
            $entry = [
                '@type' => 'Anniversary',
                'kind' => 'wedding',
                'date' => $date,
            ];
            $anniversaries[ConversionSupport::propertyId($property, $index)] = $entry;
        }

        $this->mergeAnniversaryPlace($document, $anniversaries, 'BIRTHPLACE', 'birth');
        $this->mergeAnniversaryPlace($document, $anniversaries, 'DEATHPLACE', 'death');

        if ($anniversaries !== []) {
            $card['anniversaries'] = $anniversaries;
        }
    }

    /**
     * @param  array<string, array<string, mixed>>  $anniversaries
     */
    private function mergeAnniversaryPlace(VCard $document, array &$anniversaries, string $propertyName, string $kind): void
    {
        foreach ($document->select($propertyName) as $index => $property) {
            $place = ConversionSupport::placeFromProperty($property);
            $merged = false;
            foreach ($anniversaries as &$entry) {
                if (($entry['kind'] ?? '') === $kind) {
                    $entry['place'] = $place;
                    $merged = true;
                    break;
                }
            }
            unset($entry);
            if (! $merged) {
                continue;
            }
        }
    }

    /**
     * @param  array<string, mixed>  $card
     */
    private function convertRelated(VCard $document, array &$card): void
    {
        $relatedTo = [];
        foreach ($document->select('RELATED') as $property) {
            $value = trim((string) $property->getValue());
            if ($value === '') {
                continue;
            }
            $relations = ConversionSupport::relationTypesFromProperty($property);
            $entry = ['@type' => 'Relation'];
            if ($relations !== []) {
                $entry['relation'] = $relations;
            } else {
                $entry['relation'] = [];
            }
            $relatedTo[$value] = $entry;
        }
        if ($relatedTo !== []) {
            $card['relatedTo'] = $relatedTo;
        }
    }

    /**
     * @param  array<string, mixed>  $card
     */
    private function convertDirectories(VCard $document, array &$card): void
    {
        $directories = [];
        foreach ($document->select('SOURCE') as $index => $property) {
            $entry = [
                '@type' => 'Directory',
                'kind' => 'entry',
                'uri' => trim((string) $property->getValue()),
            ];
            ConversionSupport::applySharedFields($entry, $property);
            $directories[ConversionSupport::propertyId($property, $index)] = $entry;
        }
        foreach ($document->select('ORG-DIRECTORY') as $index => $property) {
            $entry = [
                '@type' => 'Directory',
                'kind' => 'directory',
                'uri' => trim((string) $property->getValue()),
            ];
            if (isset($property['INDEX'])) {
                $entry['listAs'] = (int) (string) $property['INDEX'];
            }
            ConversionSupport::applySharedFields($entry, $property);
            $directories[ConversionSupport::propertyId($property, $index)] = $entry;
        }
        if ($directories !== []) {
            $card['directories'] = $directories;
        }
    }

    /**
     * @param  array<string, mixed>  $card
     */
    private function convertPersonalInfo(VCard $document, array &$card): void
    {
        $personalInfo = [];
        foreach ($document->select('EXPERTISE') as $index => $property) {
            $entry = [
                '@type' => 'PersonalInfo',
                'kind' => 'expertise',
                'value' => trim((string) $property->getValue()),
            ];
            if (isset($property['LEVEL'])) {
                $entry['level'] = ConversionSupport::expertiseLevelFromVCard((string) $property['LEVEL']);
            }
            if (isset($property['INDEX'])) {
                $entry['listAs'] = (int) (string) $property['INDEX'];
            }
            ConversionSupport::applySharedFields($entry, $property);
            $personalInfo[ConversionSupport::propertyId($property, $index)] = $entry;
        }
        foreach ($document->select('HOBBY') as $index => $property) {
            $entry = [
                '@type' => 'PersonalInfo',
                'kind' => 'hobby',
                'value' => trim((string) $property->getValue()),
            ];
            if (isset($property['INDEX'])) {
                $entry['listAs'] = (int) (string) $property['INDEX'];
            }
            ConversionSupport::applySharedFields($entry, $property);
            $personalInfo[ConversionSupport::propertyId($property, $index)] = $entry;
        }
        foreach ($document->select('INTEREST') as $index => $property) {
            $entry = [
                '@type' => 'PersonalInfo',
                'kind' => 'interest',
                'value' => trim((string) $property->getValue()),
            ];
            if (isset($property['INDEX'])) {
                $entry['listAs'] = (int) (string) $property['INDEX'];
            }
            ConversionSupport::applySharedFields($entry, $property);
            $personalInfo[ConversionSupport::propertyId($property, $index)] = $entry;
        }
        if ($personalInfo !== []) {
            $card['personalInfo'] = $personalInfo;
        }
    }

    /**
     * @param  array<string, mixed>  $card
     */
    private function convertCryptoKeys(VCard $document, array &$card): void
    {
        $cryptoKeys = [];
        foreach ($document->select('KEY') as $index => $property) {
            $entry = [
                '@type' => 'CryptoKey',
                'uri' => ConversionSupport::mediaUriFromProperty($property),
            ];
            if (isset($property['MEDIATYPE'])) {
                $entry['mediaType'] = (string) $property['MEDIATYPE'];
            }
            ConversionSupport::applySharedFields($entry, $property);
            $cryptoKeys[ConversionSupport::propertyId($property, $index)] = $entry;
        }
        if ($cryptoKeys !== []) {
            $card['cryptoKeys'] = $cryptoKeys;
        }
    }

    /**
     * @param  array<string, mixed>  $card
     */
    private function convertCalendars(VCard $document, array &$card): void
    {
        $calendars = [];
        foreach ($document->select('CALURI') as $index => $property) {
            $entry = [
                '@type' => 'Calendar',
                'kind' => 'calendar',
                'uri' => trim((string) $property->getValue()),
            ];
            ConversionSupport::applySharedFields($entry, $property);
            $calendars[ConversionSupport::propertyId($property, $index)] = $entry;
        }
        foreach ($document->select('FBURL') as $index => $property) {
            $entry = [
                '@type' => 'Calendar',
                'kind' => 'freeBusy',
                'uri' => trim((string) $property->getValue()),
            ];
            ConversionSupport::applySharedFields($entry, $property);
            $calendars[ConversionSupport::propertyId($property, $index)] = $entry;
        }
        if ($calendars !== []) {
            $card['calendars'] = $calendars;
        }
    }

    /**
     * @param  array<string, mixed>  $card
     */
    private function convertSchedulingAddresses(VCard $document, array &$card): void
    {
        $schedulingAddresses = [];
        foreach ($document->select('CALADRURI') as $index => $property) {
            $entry = [
                '@type' => 'SchedulingAddress',
                'uri' => trim((string) $property->getValue()),
            ];
            ConversionSupport::applySharedFields($entry, $property);
            $schedulingAddresses[ConversionSupport::propertyId($property, $index)] = $entry;
        }
        if ($schedulingAddresses !== []) {
            $card['schedulingAddresses'] = $schedulingAddresses;
        }
    }

    /**
     * @param  array<string, mixed>  $card
     */
    private function convertVCardProps(VCard $document, array &$card): void
    {
        $props = [];
        $deferredKeys = [];
        foreach ($this->deferredKnownProperties as $property) {
            $deferredKeys[$this->propertyIdentity($property)] = true;
        }
        foreach ($document->children() as $child) {
            if (! $child instanceof Property) {
                continue;
            }
            $name = strtoupper((string) $child->name);
            if ($name === 'BEGIN' || $name === 'END') {
                continue;
            }
            $isKnown = ConversionSupport::isKnownVCardProperty($name);
            $isPreserveOnly = ConversionSupport::shouldPreserveVCardProperty($name);
            $isDeferred = isset($deferredKeys[$this->propertyIdentity($child)]);
            if ($isKnown && ! $isPreserveOnly && ! $isDeferred) {
                continue;
            }
            $props[] = ConversionSupport::jCardTupleFromProperty($child);
        }
        if ($props !== []) {
            $card['vCardProps'] = $props;
        }
    }

    private function propertyIdentity(Property $property): string
    {
        return strtoupper((string) $property->name).':'.$property->serialize();
    }

    /**
     * @param  array<string, mixed>  $entry
     */
    private function applyGroupLabel(array &$entry, Property $property): void
    {
        $group = $this->groupNameFromProperty($property);
        if ($group !== null && isset($this->groupLabels[$group])) {
            $entry['label'] = $this->groupLabels[$group];
        }
    }

    private function groupNameFromProperty(Property $property): ?string
    {
        $group = $property->group;
        if ($group === null || $group === '') {
            return null;
        }

        return (string) $group;
    }

    private function geoToCoordinates(string $value): string
    {
        $trimmed = trim($value);
        if (str_starts_with(strtolower($trimmed), 'geo:')) {
            return $trimmed;
        }
        if (str_contains($trimmed, ',')) {
            return 'geo:'.$trimmed;
        }
        $parts = array_map('trim', explode(';', $trimmed));
        if (count($parts) >= 2) {
            return 'geo:'.$parts[0].','.$parts[1];
        }

        return $trimmed;
    }

    private function tzToTimeZone(Property $property): ?string
    {
        $value = trim((string) $property->getValue());
        $valueType = strtolower((string) ($property['VALUE'] ?? $property->getValueType()));

        if ($valueType === 'text' || ($valueType === 'unknown' && ! preg_match('/^[+-]?\d/', $value))) {
            return $value;
        }

        if ($valueType === 'utc-offset' || preg_match('/^[+-]?\d{4}$/', $value) === 1) {
            $sign = $value[0] === '-' ? -1 : 1;
            $digits = ltrim($value, '+-');
            if (strlen($digits) < 4) {
                return null;
            }
            $hours = (int) substr($digits, 0, 2);
            $minutes = (int) substr($digits, 2, 2);
            if ($minutes !== 0) {
                return null;
            }
            if ($hours === 0 && $sign === 1) {
                return 'Etc/UTC';
            }

            return 'Etc/GMT'.($sign < 0 ? '+' : '-').$hours;
        }

        return null;
    }
}
