<?php

namespace App\Http\Middleware;

use App\Models\Project;
use App\Notifications\UserSiteFormSubmitted;
use App\Services\RenderUserSite;
use Closure;
use Common\Core\AppUrl;
use Common\Domains\CustomDomainController;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Exception\SuspiciousOperationException;

class MaybeRenderUserSite
{
    public function __construct(protected AppUrl $appUrl)
    {
    }

    public function handle($request, Closure $next)
    {
        // allow validating custom domain
        if (
            $request->path() ===
            CustomDomainController::VALIDATE_CUSTOM_DOMAIN_PATH
        ) {
            return $next($request);
        }

        if ($domain = $this->appUrl->matchedCustomDomain) {
            $project = app(Project::class)->find($domain->resource_id);
        } elseif (
            settings('builder.enable_subdomains') &&
            !$this->appUrl->envAndCurrentHostsAreEqual
        ) {
            try {
                $requestHost = $this->appUrl->getRequestHost();
            } catch (SuspiciousOperationException $e) {
                abort(403, $e->getMessage());
            }
            if (Str::substrCount($requestHost, '.') > 1) {
                $subdomain = Arr::first(explode('.', $requestHost));
                $project = Project::where('slug', $subdomain)->first();
            }
        }

        if ($this->urlIsForUserSiteForm($request)) {
            if (!isset($project)) {
                $uuid = explode('/', $request->path())[3];
                $project = Project::where('uuid', $uuid)->firstOrFail();
            }

            Notification::route('mail', $project->formsEmail())->notify(
                new UserSiteFormSubmitted($request->all(), $project),
            );

            if ($request->expectsJson()) {
                return response()->json(['status' => 'success']);
            } else {
                return redirect()->back();
            }
        }

        if (
            isset($project) &&
            ($project->published || $project->user_id === Auth::id())
        ) {
            return response(
                app(RenderUserSite::class)->execute(
                    $project,
                    $request->segment(1),
                ),
            );
        } else {
            return $next($request);
        }
    }

    private function urlIsForUserSiteForm(Request $request): bool
    {
        $path = $request->path();
        return $request->isMethod('post') &&
            Str::endsWith($path, 'default-form-handler');
    }
}
