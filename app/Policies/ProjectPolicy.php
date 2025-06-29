<?php

namespace App\Policies;

use App\Models\Project;
use App\Models\User;
use Common\Workspaces\ActiveWorkspace;
use Common\Workspaces\Policies\WorkspacedResourcePolicy;

class ProjectPolicy extends WorkspacedResourcePolicy
{
    protected string $resource = Project::class;

    public function index(User $currentUser, int $userId = null)
    {
        if (!app(ActiveWorkspace::class)->isPersonal()) {
            $this->userIsWorkspaceMember($currentUser);
        } elseif ($userId) {
            return $currentUser->id === $userId;
        }
        [, $permission] = $this->parseNamespace($this->resource, 'view');
        return $this->userHasPermission($currentUser, $permission);
    }

    public function publish(User $user, Project $project)
    {
        return $this->hasPermission($user, 'projects.publish') &&
            $this->show($user, $project);
    }

    public function download(User $user, Project $project)
    {
        return $this->hasPermission($user, 'projects.download') &&
            $project->user_id === $user->id;
    }

    public function show(User $currentUser, $resource)
    {
        if ($resource->published) {
            return true;
        }

        return parent::show($currentUser, $resource);
    }
}
