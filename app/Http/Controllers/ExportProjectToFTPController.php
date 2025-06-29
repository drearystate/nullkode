<?php namespace App\Http\Controllers;

use App\Models\Project;
use App\Services\ProjectRepository;
use Common\Core\BaseController;
use Exception;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Storage;
use League\Flysystem\Filesystem;
use League\Flysystem\Ftp\FtpAdapter;
use League\Flysystem\Ftp\FtpConnectionOptions;
use League\Flysystem\MountManager;

class ExportProjectToFTPController extends BaseController
{
    public function __construct(protected ProjectRepository $repository)
    {
    }

    public function __invoke(Project $project)
    {
        $this->authorize('download', $project);

        $data = $this->validate(request(), [
            'host' => 'required|string|min:1',
            'username' => 'required|string|min:1',
            'password' => 'string|min:1|nullable',
            'port' => 'integer|min:1',
            'directory' => 'string|min:1|nullable',
            'rememberCredentials' => 'boolean',
            'ssl' => 'boolean',
        ]);

        if (Arr::get($data, 'rememberCredentials')) {
            $settings = $project->settings;
            $settings['ftpCredentials'] = $data;
            $project->fill(['settings' => $settings])->save();
        }

        try {
            $this->exportToFTP($project, $data);
        } catch (Exception $e) {
            return $this->error($e->getMessage());
        }

        return $this->success();
    }

    private function exportToFTP(Project $project, array $data)
    {
        $ftp = new Filesystem(
            new FtpAdapter(
                new FtpConnectionOptions(
                    host: $data['host'],
                    root: '/',
                    username: $data['username'],
                    password: $data['password'],
                    port: $data['port'] ?? $this->getDefaultPort($data),
                    ssl: $data['ssl'] ?? false,
                    timeout: 30,
                    passive: true,
                ),
            ),
        );

        $directory = request('directory');
        if ($directory && !$ftp->has($directory)) {
            $ftp->createDirectory($directory);
        }

        $manager = new MountManager([
            'ftp' => $ftp,
            'local' => Storage::disk('projects')->getDriver(),
        ]);

        $projectRoot = $this->repository->getProjectPath($project);

        foreach (
            $manager->listContents("local://$projectRoot", true)
            as $file
        ) {
            if ($file['type'] !== 'file') {
                continue;
            }

            $ftpPath = str_replace($projectRoot, $directory, $file['path']);
            $ftpPath = preg_replace('/\/{3,}/', '//', $ftpPath);
            $ftpPath = preg_replace('{^local://}', 'ftp://', $ftpPath);

            // delete old files from ftp
            if ($ftp->has($ftpPath)) {
                $ftp->delete($ftpPath);
            }

            // copy file from local disk to ftp
            $manager->copy($file['path'], $ftpPath);
        }
    }

    private function getDefaultPort(array $data): int
    {
        return Arr::get($data, 'ssl') ? 22 : 21;
    }
}
