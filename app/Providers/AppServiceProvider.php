<?php

namespace App\Providers;

use App\Models\Project;
use App\Models\User;
use App\Services\Admin\GetAnalyticsHeaderData;
use App\Services\AppBootstrapData;
use Common\Admin\Analytics\Actions\GetAnalyticsHeaderDataAction;
use Common\Auth\BaseUser;
use Common\Core\Bootstrap\BootstrapData;
use Common\Domains\CustomDomain;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

const WORKSPACED_RESOURCES = [Project::class, CustomDomain::class];
const WORKSPACE_HOME_ROUTE = '/dashboard';

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        Relation::morphMap([
            CustomDomain::MODEL_TYPE => CustomDomain::class,
            BaseUser::MODEL_TYPE => User::class,
            Project::MODEL_TYPE => Project::class,
        ]);
    }

    public function boot(): void
    {
        $this->app->bind(BootstrapData::class, AppBootstrapData::class);

        $this->app->bind(
            GetAnalyticsHeaderDataAction::class,
            GetAnalyticsHeaderData::class
        );

        Gate::define('viewPulse', function (User $user) {
            return $user->hasPermission('admin');
        });
    }
}
