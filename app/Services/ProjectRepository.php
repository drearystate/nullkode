<?php namespace App\Services;

use App\Models\Project;
use Common\Domains\CustomDomain;
use Illuminate\Contracts\Filesystem\FileNotFoundException;
use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Support\Arr;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ProjectRepository
{
    private Filesystem $storage;
    private ProjectDatabaseService $databaseService;

    public function __construct(protected Project $project, ProjectDatabaseService $databaseService)
    {
        $this->storage = Storage::disk('projects');
        $this->databaseService = $databaseService;
    }

    public function load(Project $project)
    {
        $path = $this->getProjectPath($project);

        $pages = $this->loadProjectPages($path);

        $loaded = [
            'model' => $project->toArray(),
            'pages' => $pages,
        ];

        //load custom css
        if ($this->storage->exists("$path/css/code_editor_styles.css")) {
            $loaded['css'] = $this->storage->get(
                "$path/css/code_editor_styles.css",
            );
        }

        //load custom js
        if ($this->storage->exists("$path/js/code_editor_scripts.js")) {
            $loaded['js'] = $this->storage->get(
                "$path/js/code_editor_scripts.js",
            );
        }

        return $loaded;
    }

    public function getProjectPath(
        Project $project,
        bool $absolute = false,
        int $userId = null,
    ): string {
        // get user id from pivot in case user was deleted
        $userId =
            $userId ??
            DB::table('projects')
                ->where('id', $project->id)
                ->value('user_id');
        $path = "{$userId}/{$project->uuid}";
        return $absolute ? public_path("storage/projects/$path") : $path;
    }

    public function getPageHtml(
        Project $project,
        ?string $name = 'index',
    ): string {
        $projectPath = $this->getProjectPath($project);

        $name = Str::contains($name, '.html') ? $name : "$name.html";
        $pagePath = "$projectPath/$name";

        return $this->storage->get($pagePath);
    }

    public function update(Project $project, $data, $overrideFiles = true): void
    {
        // change owner of project
        if (
            Arr::get($data, 'userId') &&
            $project->user_id !== $data['userId']
        ) {
            $oldPath = $this->getProjectPath($project, true, $project->user_id);
            $newPath = $this->getProjectPath($project, true, $data['userId']);
            File::ensureDirectoryExists($newPath);
            if (File::moveDirectory($oldPath, $newPath, true)) {
                CustomDomain::where([
                    'resource_type' => Project::MODEL_TYPE,
                    'resource_id' => $project->id,
                    'global' => false,
                ])->update(['resource_id' => null, 'resource_type' => null]);
                $project->update(['user_id' => $data['userId']]);
            }
        }

        $projectPath = $this->getProjectPath($project);

        if (Arr::get($data, 'slug') && $project->slug !== $data['slug']) {
            $project->fill(['slug' => $data['slug']])->save();
        }

        if (isset($data['pages'])) {
            $this->updatePages($project, $data['pages']);
        }

        if (
            (Arr::get($data, 'template') ?: $project->template) !==
            $project->template
        ) {
            $this->updateTemplate($project, $data['template'], $overrideFiles);
        }

        if (
            (Arr::get($data, 'framework') ?: $project->framework) !==
            $project->framework
        ) {
            $this->addBootstrapFiles($projectPath);
        }

        if (Arr::get($data, 'custom_element_css')) {
            $this->addCustomElementCss(
                $projectPath,
                $data['custom_element_css'],
            );
        }

        // custom css
        if (array_key_exists('css', $data)) {
            $this->storage->put(
                "$projectPath/css/code_editor_styles.css",
                $data['css'] ?? '',
            );
        }

        // custom js
        if (array_key_exists('js', $data)) {
            $this->storage->put(
                "$projectPath/js/code_editor_scripts.js",
                $data['js'] ?? '',
            );
        }

        $project
            ->fill([
                'name' => Arr::get($data, 'name', $project->name),
                'template' => Arr::get($data, 'template', $project->template),
                'published' => Arr::get(
                    $data,
                    'published',
                    $project->published,
                ),
            ])
            ->save();
    }

    public function create(array $data): Project
    {
        $project = Project::create([
            'name' => $data['name'],
            'slug' => $data['slug'] ?? slugify($data['name']),
            'template' => $data['templateName'] ?? null,
            'uuid' => Str::random(36),
            'user_id' => $data['userId'] ?? Auth::id(),
            'published' => $data['published'] ?? false,
            'updated_at' => $data['updatedAt'] ?? now(),
        ])->fresh();

        $projectPath = $this->getProjectPath(
            $project,
            false,
            $project->user_id,
        );

        try {
            $this->addBootstrapFiles($projectPath);
        } catch (\Exception $e) {
            \Log::warning("Failed to add bootstrap files for project {$project->id}: " . $e->getMessage());
        }

        // thumbnail
        try {
            $this->storage->put(
                "$projectPath/thumbnail.png",
                Storage::disk('builder')->get(TemplateLoader::DEFAULT_THUMBNAIL),
            );
        } catch (\Exception $e) {
            \Log::warning("Failed to create thumbnail for project {$project->id}: " . $e->getMessage());
        }

        // custom css
        $this->storage->put("$projectPath/css/code_editor_styles.css", '');

        // custom js
        $this->storage->put("$projectPath/js/code_editor_scripts.js", '');

        // Create required pages
        try {
            $this->ensureRequiredPages($projectPath, $data['templateName'] ?? null);
        } catch (\Exception $e) {
            \Log::warning("Failed to create required pages for project {$project->id}: " . $e->getMessage());
        }

        // custom elements css
        $this->addCustomElementCss($projectPath, '');

        // create project database
        try {
            $this->databaseService->createDatabase($project);
        } catch (\Exception $e) {
            // Log error but don't fail project creation
            \Log::warning("Failed to create database for project {$project->id}: " . $e->getMessage());
        }

        // apply template
        if (isset($data['templateName'])) {
            try {
                $this->applyTemplate($data['templateName'], $projectPath);
            } catch (\Exception $e) {
                \Log::warning("Failed to apply template {$data['templateName']} for project {$project->id}: " . $e->getMessage());
            }
        }

        // create pages
        if (isset($data['pages'])) {
            try {
                $this->updatePages($project, $data['pages']);
            } catch (\Exception $e) {
                \Log::warning("Failed to create pages for project {$project->id}: " . $e->getMessage());
            }
        }

        return $project;
    }

    public function delete(Project $project)
    {
        $path = $this->getProjectPath($project);
        
        // Delete project database
        try {
            $this->databaseService->deleteDatabase($project);
        } catch (\Exception $e) {
            \Log::warning("Failed to delete database for project {$project->id}: " . $e->getMessage());
        }
        
        $this->storage->deleteDirectory($path);
        return $project->delete();
    }

    public function updatePages(Project $project, array $pages): void
    {
        if (empty($pages)) {
            return;
        }

        $projectPath = $this->getProjectPath($project);

        // delete old pages
        collect($this->storage->files($projectPath))
            ->filter(fn($path) => Str::contains($path, '.html'))
            ->each(fn($path) => $this->storage->delete($path));

        // store new pages
        foreach ($pages as $page) {
            $name = slugify($page['name']);
            $this->storage->put("$projectPath/{$name}.html", $page['html']);
        }
    }

    private function addBootstrapFiles(string $projectPath): void
    {
        // font awesome
        File::copyDirectory(
            public_path('builder/font-awesome'),
            public_path("storage/projects/$projectPath/font-awesome"),
        );

        // bootstrap
        File::copyDirectory(
            public_path('builder/bootstrap'),
            public_path("storage/projects/$projectPath/bootstrap"),
        );
    }

    private function updateTemplate(
        Project $project,
        string $templateName,
        bool $overrideFiles = true,
    ) {
        $oldTemplatePath = "template/$templateName";
        $projectPath = $this->getProjectPath($project);
        $builderDisk = Storage::disk('builder');

        //delete old images
        if ($builderDisk->exists("$oldTemplatePath/images")) {
            $paths = $builderDisk->files("$oldTemplatePath/images");

            collect($paths)->each(function ($imagePath) use ($projectPath) {
                $imgFileName = basename($imagePath);
                $path = "$projectPath/images/$imgFileName";

                if (!$this->storage->exists($path)) {
                    return;
                }

                if (!Str::contains($imgFileName, '.')) {
                    $this->storage->deleteDirectory($path);
                } else {
                    $this->storage->delete($path);
                }
            });
        }

        // apply new template
        $this->applyTemplate($templateName, $projectPath, $overrideFiles);
    }

    public function applyTemplate(
        string $templateName,
        string $projectPath,
        bool $overrideFiles = true,
    ) {
        $templateName = strtolower(Str::kebab($templateName));

        // Get current user data for template injection
        $user = Auth::user();
        $userName = $user ? ($user->display_name ?? trim(($user->first_name ?? '') . ' ' . ($user->last_name ?? '')) ?: $user->email) : 'Admin User';
        $userEmail = $user ? $user->email : 'admin@example.com';

        // copy template files recursively
        foreach (
            Storage::disk('builder')->allFiles("templates/$templateName")
            as $templateFilePath
        ) {
            $innerPath = str_replace(
                'templates' . DIRECTORY_SEPARATOR . $templateName,
                $projectPath,
                $templateFilePath,
            );

            // don't override project styles file
            if (Str::contains($innerPath, 'code_editor_styles.css')) {
                continue;
            }

            // don't copy over template config file
            if (Str::contains($innerPath, 'config.json')) {
                continue;
            }

            if ($this->storage->exists($innerPath) && !$overrideFiles) {
                continue;
            }

            $fileContent = Storage::disk('builder')->get($templateFilePath);

            // Inject user data into HTML files
            if (Str::contains($templateFilePath, '.html')) {
                $fileContent = str_replace('{{USER_NAME}}', htmlspecialchars($userName), $fileContent);
                $fileContent = str_replace('{{USER_EMAIL}}', htmlspecialchars($userEmail), $fileContent);
            }

            $this->storage->put($innerPath, $fileContent);
        }

        //thumbnail
        $this->storage->put(
            "$projectPath/thumbnail.png",
            Storage::disk('builder')->get(
                "templates/$templateName/thumbnail.png",
            ),
        );

        // Ensure all required pages exist after applying template
        $this->ensureRequiredPages($projectPath, $templateName);
    }

    /**
     * Load all pages for specified project.
     *
     * @param string $path
     * @return Collection
     */
    private function loadProjectPages($path)
    {
        return collect($this->storage->files($path))
            ->filter(function ($path) {
                return Str::contains($path, '.html');
            })
            ->map(function ($path) {
                return [
                    'name' => basename($path, '.html'),
                    'html' => $this->storage->get($path),
                ];
            })
            ->sort(function ($page) {
                return $page['name'] === 'index' ? -1 : 1;
            })
            ->values();
    }

    private function addCustomElementCss(
        string $projectPath,
        string $customElementCss,
    ): void {
        $path = "$projectPath/css/custom_elements.css";

        try {
            $contents = $this->storage->get($path);
        } catch (FileNotFoundException $e) {
            $contents = '';
        }

        //if this custom element css is already added, bail
        if ($contents && Str::contains($contents, $customElementCss)) {
            return;
        }

        $contents = "$contents\n$customElementCss";

        $this->storage->put($path, $contents);
    }

    private function getBuilderAsset(string $path): string
    {
        return Storage::disk('builder')->get($path);
    }

    private function ensureRequiredPages(string $projectPath, string $templateName = null): void
    {
        // Get required pages from config
        $authConfig = config('common.builder.template_auth_standard', []);
        $requiredPages = $authConfig['required_pages'] ?? [];

        if (empty($requiredPages)) {
            return;
        }

        // Get current pages
        $existingPages = collect($this->storage->files($projectPath))
            ->filter(fn($path) => Str::contains($path, '.html'))
            ->map(fn($path) => basename($path, '.html'))
            ->values()
            ->toArray();

        // Create missing required pages
        foreach ($requiredPages as $pageName) {
            if (!in_array($pageName, $existingPages)) {
                $pageHtml = $this->getDefaultPageHtml($pageName, $templateName);
                $this->storage->put("$projectPath/{$pageName}.html", $pageHtml);
            }
        }
    }

    private function getDefaultPageHtml(string $pageName, string $templateName = null): string
    {
        // Try to get page from template first if template is specified
        if ($templateName) {
            try {
                $templatePath = "templates/$templateName/$pageName.html";
                if (Storage::disk('builder')->exists($templatePath)) {
                    return Storage::disk('builder')->get($templatePath);
                }
            } catch (\Exception $e) {
                \Log::warning("Failed to get template page $pageName: " . $e->getMessage());
            }
        }

        // Default page HTML if template page doesn't exist
        return <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>$pageName</title>
    <link rel="stylesheet" href="bootstrap/css/bootstrap.min.css">
    <link rel="stylesheet" href="font-awesome/css/all.min.css">
</head>
<body>
    <div class="container mt-5">
        <h1>$pageName</h1>
        <p>This is the $pageName page.</p>
    </div>
    <script src="bootstrap/js/bootstrap.bundle.min.js"></script>
</body>
</html>
HTML;
    }
}
