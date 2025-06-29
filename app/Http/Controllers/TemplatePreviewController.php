<?php

namespace App\Http\Controllers;

use App\Services\TemplateLoader;

class TemplatePreviewController
{
    public function __construct(protected TemplateLoader $loader)
    {
    }

    public function __invoke(string $templateName, ?string $pageName = 'index')
    {
        $name = slugify($templateName);
        $pageName = $pageName ?: 'index';

        if (!$this->loader->exists($name)) {
            abort(404);
        }

        $template = $this->loader->load($name, loadPages: true);

        foreach ($template['pages'] as $page) {
            if ($page['name'] === $pageName) {

                // insert <base> tag into html
                $page['html'] = preg_replace(
                    '/<head>/',
                    "<head><base href='/builder/templates/{$template['name']}/'>",
                    $page['html'],
                    1,
                );

                return $page['html'];
            }
        }

        abort(404);
    }
}
