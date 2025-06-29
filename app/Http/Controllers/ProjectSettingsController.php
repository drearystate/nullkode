<?php

namespace App\Http\Controllers;

use App\Models\Project;
use Common\Core\BaseController;
use Common\Domains\CustomDomain;

class ProjectSettingsController extends BaseController
{
    public function __invoke(Project $project)
    {
        $this->authorize('update', $project);

        $data = $this->validate(request(), [
            'published' => 'boolean',
            'domainId' => 'nullable|integer',
            'formsEmail' => 'nullable|email',
        ]);

        // connect or remove custom domain project
        if (array_key_exists('domainId', $data)) {
            if ($data['domainId']) {
                CustomDomain::where(['id' => $data['domainId']])->update([
                    'resource_id' => $project->id,
                    'resource_type' => Project::MODEL_TYPE,
                ]);
            } else {
                CustomDomain::where([
                    'resource_type' => Project::MODEL_TYPE,
                    'resource_id' => $project->id,
                ])->update(['resource_id' => null, 'resource_type' => null]);
            }
        }

        if (array_key_exists('published', $data)) {
            $this->authorize('publish', $project);
            $project->published = $data['published'];
        }

        $jsonSettings = [];
        if (array_key_exists('formsEmail', $data)) {
            $jsonSettings['formsEmail'] = $data['formsEmail'];
        }

        // merge with current settings, so we don't have to submit all possible settings every time
        $project->settings = [...$project->settings, ...$jsonSettings];

        $project->save();

        return $this->success(['project' => $project]);
    }
}
