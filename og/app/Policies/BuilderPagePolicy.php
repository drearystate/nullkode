<?php

namespace App\Policies;

use App\Models\Project;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class BuilderPagePolicy
{
    use HandlesAuthorization;

    public function index(User $user)
    {
        return $user->hasPermission('builder_pages.view');
    }

    public function show(User $user)
    {
        return $user->hasPermission('builder_pages.view');
    }

    public function store(User $user, Project $project)
    {
        //user can create pages for any project
        if ($user->hasPermission('builder_pages.create')) return true;

        //check if user can create pages for specific project
        if ( ! $project) return false;
        return is_null($project->user_id === $user->id);
    }

    public function update(User $user)
    {
        return $user->hasPermission('builder_pages.update');
    }

    public function destroy(User $user)
    {
        return $user->hasPermission('builder_pages.delete');
    }
}
