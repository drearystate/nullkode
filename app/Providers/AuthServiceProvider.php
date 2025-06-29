<?php

namespace App\Providers;

use App\Policies\WorkspacedCustomDomainPolicy;
use Common\Domains\CustomDomain;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;

class AuthServiceProvider extends ServiceProvider
{
    protected $policies = [
        'Template' => 'App\Policies\TemplatePolicy',
        'AI' => 'App\Policies\AiPolicy',
        CustomDomain::class => WorkspacedCustomDomainPolicy::class
    ];

    public function boot(): void
    {
        //
    }
}
