<?php

namespace App\Http\Controllers;

use App\Models\Project;
use Common\Core\BaseController;
use Illuminate\Support\Facades\Storage;
use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\ImageManager;

class ProjectThumbnailController extends BaseController
{
    public function store($projectId)
    {
        $project = Project::find($projectId);

        $this->authorize('update', $project);

        $userId = request()->user()->id;
        $path = "$userId/$project->uuid/thumbnail.png";
        $thumbnail = $this->generateThumbnail();

        Storage::disk('projects')->put($path, $thumbnail);

        return $this->success(['path' => $path]);
    }

    private function generateThumbnail(): string
    {
        $string = preg_replace(
            '/data:image\/.+?;base64,/',
            '',
            request('dataUrl'),
        );

        $manager = new ImageManager(new Driver());
        $img = $manager->read(base64_decode($string));

        $img->cover(385, 240);

        return $img->toPng();
    }
}
