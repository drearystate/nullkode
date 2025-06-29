<?php

namespace App\Services;

use App\Models\Project;
use Illuminate\Contracts\Filesystem\FileNotFoundException;
use Illuminate\Support\Str;
use Symfony\Component\DomCrawler\Crawler;

class RenderUserSite
{
    public function __construct(protected ProjectRepository $repository)
    {
    }

    public function execute(Project $project, ?string $pageName)
    {
        try {
            $html = $this->repository->getPageHtml(
                $project,
                $pageName ?? 'index',
            );
            $html = preg_replace('/<base.href=".+?">/', '', $html);
            return $this->replaceRelativeLinks($project, $html);
        } catch (FileNotFoundException $e) {
            abort(404);
        }
    }

    private function replaceRelativeLinks(Project $project, string $html): string
    {
        $assetBaseUri = url(
            "storage/projects/{$project->user_id}/$project->uuid",
        );
        $pathParts = explode('/', request()->path());
        $crawler = new Crawler($html);

        // on "sites/foo" version project homepage with no page name in url, need to prefix all links with project name
        if (count($pathParts) === 2 && $pathParts[0] == 'sites') {
            $aHref = $crawler->filter('a')->extract(['href']);
            $html = $this->prefixAssetUrls($html, $aHref, $pathParts[1]);
        }

        $styleLinks = $crawler->filter('link')->extract(['href']);
        $html = $this->prefixAssetUrls($html, $styleLinks, $assetBaseUri);

        $scriptSrc = $crawler->filter('script')->extract(['src']);
        $html = $this->prefixAssetUrls($html, $scriptSrc, $assetBaseUri);

        $formActions = $crawler->filter('form')->extract(['action']);
        $html = $this->prefixAssetUrls($html, $formActions, $assetBaseUri);

        $imgSrc = $crawler->filter('img')->extract(['src']);
        $html = $this->prefixAssetUrls($html, $imgSrc, $assetBaseUri);

        $stylesWithUrl = collect(
            $crawler->filter('*[style*="url("]')->extract(['style']),
        );
        $styleUrls = $stylesWithUrl
            ->flatMap(fn($cssStyles) => explode(';', $cssStyles))
            ->flatMap(fn($cssPropAndValue) => explode(':', $cssPropAndValue, 2))
            ->map(fn($cssValue) => trim($cssValue))
            ->filter(fn($cssValue) => Str::startsWith($cssValue, 'url'))
            ->map(function ($valueWithUrl) {
                $valueWithUrl = explode(' ', $valueWithUrl)[0];
                $valueWithUrl = preg_replace('/^url\(/', '', $valueWithUrl);
                return trim($valueWithUrl, ')"');
            });
        return $this->prefixAssetUrls(
            $html,
            $styleUrls->toArray(),
            $assetBaseUri,
        );
    }

    private function prefixAssetUrls(string $html, array $urls, string $baseUri): string
    {
        foreach (array_unique($urls) as $url) {
            $url = trim($url, " /.\t\n\r\0\x0B");
            $url = str_replace('"', '', htmlspecialchars_decode($url));

            // prefix only if not already absolute url
            if ($url && !Str::startsWith($url, ['//', 'http', '#'])) {
                $html = str_replace($url, "$baseUri/$url", $html);
            }
        }

        return $html;
    }
}
