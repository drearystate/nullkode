<?php

namespace App\Policies;

use Common\Domains\CustomDomain;
use Common\Workspaces\Policies\WorkspacedResourcePolicy;

class WorkspacedCustomDomainPolicy extends WorkspacedResourcePolicy
{
    protected string $resource = CustomDomain::class;

    protected string $permissionName = 'custom_domains';
}
