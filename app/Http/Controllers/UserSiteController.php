<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Services\RenderUserSite;
use Common\Core\BaseController;

class UserSiteController extends BaseController
{
    public function show(
        $projectSlug,
        string $pageName = 'index',
        string $tls = null,
        string $page = null,
    ): string {
        $project = Project::where('slug', $projectSlug)->firstOrFail();

        //if it's subdomain routing, laravel will pass subdomain, domain, tls and then page name
        $pageName = $page ?: $pageName;

        $this->authorize('show', $project);

        return app(RenderUserSite::class)->execute($project, $pageName);
    }
}
