<?php

namespace App\Http\Controllers;

use App\Models\Project;
use Common\Core\BaseController;
use Common\Core\Exceptions\AccessResponseWithAction;
use Common\Domains\CustomDomain;
use Common\Files\Actions\GetUserSpaceUsage;
use Common\Workspaces\ActiveWorkspace;
use Common\Workspaces\Policies\WorkspacedResourcePolicy;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;

class AccountUsageController extends BaseController
{
    public function __invoke()
    {
        $user = Auth::user();
        $spaceUsage = app(GetUserSpaceUsage::class)->execute($user);

        return $this->success([
            'ai' => [
                'text' => $this->getAiUsage('ai.text'),
                'images' => $this->getAiUsage('ai.images'),
            ],
            'projects' => [
                'used' => $user->projects()->count(),
                'total' => $user->getRestrictionValue(
                    'projects.create',
                    'count',
                ),
                'customCode' => $user->hasPermission('editors.enable'),
                'download' => $user->hasPermission('projects.download'),
                'export' => $user->hasPermission('projects.export'),
                'create' => $this->gateResponseToArray('store', Project::class),
                'update' => $this->gateResponseToArray('update', new Project()),
                'delete' => $this->gateResponseToArray(
                    'destroy',
                    Project::class,
                ),
            ],
            'custom_domains' => [
                'used' => $user->customDomains()->count(),
                'total' => $user->getRestrictionValue(
                    'custom_domains.create',
                    'count',
                ),
                'create' => $this->gateResponseToArray(
                    'store',
                    CustomDomain::class,
                ),
                'update' => $this->gateResponseToArray(
                    'update',
                    new CustomDomain(),
                ),
                'delete' => $this->gateResponseToArray(
                    'destroy',
                    CustomDomain::class,
                ),
            ],
            'uploads' => [
                'used' => $spaceUsage['used'],
                'total' => $spaceUsage['available'],
            ],
        ]);
    }

    private function gateResponseToArray(string $ability, $resource): array
    {
        // policy will check whether user can update all projects, if in personal workspace. We need to check if user can update projects in their personal workspace (always true)
        $activeWorkspace = App(ActiveWorkspace::class);
        $alwaysAllowedInPersonalWorkspace =
            $activeWorkspace->currentUserIsOwner() &&
            ($ability === 'update' || $ability === 'destroy');

        $response = Gate::inspect($ability, $resource);
        if ($response->allowed() || $alwaysAllowedInPersonalWorkspace) {
            return [
                'allowed' => true,
            ];
        }

        if ($response instanceof AccessResponseWithAction) {
            return [
                'allowed' => false,
                'failReason' => 'overQuota',
            ];
        } elseif (
            $response->code() ===
            WorkspacedResourcePolicy::NO_WORKSPACE_PERMISSION
        ) {
            return [
                'allowed' => false,
                'failReason' => 'noWorkspacePermission',
            ];
        }

        return [
            'allowed' => false,
            'failReason' => 'noPermission',
        ];
    }

    private function getAiUsage(string $permission): array
    {
        $user = Auth::user();
        $data = [
            'hasPermission' => $user->hasPermission($permission),
            'used' => 0,
            'total' => 0,
        ];
        if ($data['hasPermission']) {
            $tokens =
                $permission === 'ai.images'
                    ? $user->getAiImageTokenUsage()
                    : $user->getAiTextTokenUsage();
            $data = array_merge($data, $tokens);
        } else {
            $data['failReason'] = 'noPermission';
        }

        if ($data['total'] && $data['used'] >= $data['total']) {
            $data['failReason'] = 'overQuota';
        }

        return $data;
    }
}
