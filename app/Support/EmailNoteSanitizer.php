<?php

namespace App\Support;

use DOMDocument;
use DOMNode;

class EmailNoteSanitizer
{
    private const ALLOWED_TAGS = ['p', 'div', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'a'];

    public static function sanitize(?string $html): ?string
    {
        if (blank($html)) {
            return null;
        }

        $document = new DOMDocument('1.0', 'UTF-8');
        $previous = libxml_use_internal_errors(true);
        $document->loadHTML('<!doctype html><html><head><meta charset="utf-8"></head><body><div id="email-note-root">'.$html.'</div></body></html>', LIBXML_HTML_NODEFDTD);
        libxml_clear_errors();
        libxml_use_internal_errors($previous);

        $root = $document->getElementsByTagName('body')->item(0)?->firstElementChild;
        if (! $root) {
            return null;
        }

        $safe = '';
        foreach ($root->childNodes as $child) {
            $safe .= self::renderNode($child);
        }

        $plainText = html_entity_decode(strip_tags($safe), ENT_QUOTES | ENT_HTML5, 'UTF-8');
        return trim(str_replace("\xc2\xa0", ' ', $plainText)) === '' ? null : $safe;
    }

    private static function renderNode(DOMNode $node): string
    {
        if ($node->nodeType === XML_TEXT_NODE) {
            return htmlspecialchars($node->nodeValue ?? '', ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        }

        if ($node->nodeType !== XML_ELEMENT_NODE) {
            return '';
        }

        $tag = strtolower($node->nodeName);
        if (in_array($tag, ['script', 'style', 'iframe', 'object', 'svg', 'math'], true)) {
            return '';
        }

        $inner = '';
        foreach ($node->childNodes as $child) {
            $inner .= self::renderNode($child);
        }

        if (! in_array($tag, self::ALLOWED_TAGS, true)) {
            return $inner;
        }

        if ($tag === 'br') {
            return '<br>';
        }

        if ($tag === 'a') {
            $href = trim((string) $node->attributes?->getNamedItem('href')?->nodeValue);
            $scheme = strtolower((string) parse_url($href, PHP_URL_SCHEME));
            if ($href === '' || ! in_array($scheme, ['http', 'https', 'mailto'], true)) {
                return $inner;
            }

            return '<a href="'.htmlspecialchars($href, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8').'" rel="noopener noreferrer">'.$inner.'</a>';
        }

        return "<{$tag}>{$inner}</{$tag}>";
    }
}
