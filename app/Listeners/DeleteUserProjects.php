<?php

namespace App\Listeners;

use App\Models\Project;
use App\Services\ProjectRepository;
use Common\Auth\Events\UsersDeleted;
use Illuminate\Support\Facades\DB;

class DeleteUserProjects
{
    public function __construct(protected ProjectRepository $projectRepository)
    {
    }

    public function handle(UsersDeleted $event): void
    {
        $projectIds = DB::table('users_projects')
            ->whereIn('user_id', $event->users->pluck('id'))
            ->pluck('project_id');

        $projects = app(Project::class)
            ->whereIn('id', $projectIds)
            ->get();

        $projects->each(function (Project $project) {
            $this->projectRepository->delete($project);
        });
    }
}
