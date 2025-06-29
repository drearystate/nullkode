<?php

namespace App\Workspaces;

use App\Models\Project;
use Illuminate\Database\Eloquent\Relations\HasMany;

trait WorkspaceRelationships
{
    public function projects(): HasMany
    {
        return $this->hasMany(Project::class);
    }
}
