<?php

namespace App\Models;

use App\Workspaces\WorkspaceRelationships;
use Common\Auth\BaseUser;
use Common\Domains\CustomDomain;
use Common\Workspaces\Workspace;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Laravel\Sanctum\HasApiTokens;

class User extends BaseUser
{
    use WorkspaceRelationships, HasApiTokens;

    public function workspaces(): HasMany
    {
        return $this->hasMany(Workspace::class, 'owner_id');
    }

    public function projects(): HasMany
    {
        return $this->hasMany(Project::class);
    }

    public function customDomains(): HasMany
    {
        return $this->hasMany(CustomDomain::class);
    }

    public function aiHistory(): HasMany
    {
        return $this->hasMany(AiHistoryItem::class);
    }

    public function getAiTextTokenUsage()
    {
        return [
            'total' => $this->getRestrictionValue('ai.text', 'tokens'),
            'used' => (int) $this->aiHistory()
                ->text()
                ->whereBetween('created_at', [
                    now()->startOfMonth(),
                    now()->endOfMonth(),
                ])
                ->sum('tokens_used'),
        ];
    }

    public function getAiImageTokenUsage()
    {
        return [
            'total' => $this->getRestrictionValue('ai.images', 'tokens'),
            'used' => (int) $this->aiHistory()
                ->images()
                ->whereBetween('created_at', [
                    now()->startOfMonth(),
                    now()->endOfMonth(),
                ])
                ->sum('tokens_used'),
        ];
    }
}
