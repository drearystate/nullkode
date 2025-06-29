<?php

namespace App\Policies;

use App\Models\User;
use Common\Core\Policies\BasePolicy;
use Illuminate\Auth\Access\Response;

class AiPolicy extends BasePolicy
{
    public function text(User $user)
    {
        return $this->authorizeAiFeature(
            $user,
            'ai.text',
            $user->getAiTextTokenUsage(),
        );
    }

    public function images(User $user)
    {
        return $this->authorizeAiFeature(
            $user,
            'ai.images',
            $user->getAiImageTokenUsage(),
        );
    }

    protected function authorizeAiFeature(
        User $user,
        string $permission,
        array $usage,
    ) {
        if (!$this->hasPermission($user, $permission)) {
            return Response::deny();
        }

        if (!is_null($usage['total']) && $usage['used'] >= $usage['total']) {
            return $this->denyWithAction(
                __('policies.ai_quota_exceeded'),
                $this->upgradeAction(),
            );
        }

        return Response::allow();
    }
}
