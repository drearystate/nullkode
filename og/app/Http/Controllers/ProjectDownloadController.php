<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Services\ProjectRepository;
use Carbon\Carbon;
use Common\Core\BaseController;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;
use ZipStream\ZipStream;

class ProjectDownloadController extends BaseController
{
    public function __construct(protected ProjectRepository $projectRepository)
    {
    }

    public function download(Project $project)
    {
        $this->authorize('download', $project);

        return new StreamedResponse(
            function () use ($project) {
                $projectPath = $this->projectRepository->getProjectPath($project);
                $disk = Storage::disk('projects');

                $timestamp = Carbon::now()->getTimestamp();

                $zip = new ZipStream(
                    defaultEnableZeroHeader: true,
                    contentType: 'application/octet-stream',
                    sendHttpHeaders: true,
                    outputName: "download-$timestamp.zip",
                );

                $paths = $disk->allFiles($projectPath);
                foreach ($paths as $relativePath) {
                    $zip->addFileFromPath(
                        str_replace($projectPath, '', $relativePath),
                        $disk->path($relativePath),
                    );
                }

                $zip->finish();
            },
            200,
            [
                'X-Accel-Buffering' => 'no',
                'Pragma' => 'public',
                'Cache-Control' => 'no-cache',
                'Content-Transfer-Encoding' => 'binary',
            ],
        );
    }
}
