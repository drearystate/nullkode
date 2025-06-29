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

    public function __construct(protected Project $project)
    {
        $this->storage = Storage::disk('projects');
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

        $this->addBootstrapFiles($projectPath);

        // thumbnail
        $this->storage->put(
            "$projectPath/thumbnail.png",
            Storage::disk('builder')->get(TemplateLoader::DEFAULT_THUMBNAIL),
        );

        // custom css
        $this->storage->put("$projectPath/css/code_editor_styles.css", '');

        // custom js
        $this->storage->put("$projectPath/js/code_editor_scripts.js", '');

        // custom elements css
        $this->addCustomElementCss($projectPath, '');

        // apply template
        if (isset($data['templateName'])) {
            $this->applyTemplate($data['templateName'], $projectPath);
        }

        // create pages
        if (isset($data['pages'])) {
            $this->updatePages($project, $data['pages']);
        }

        return $project;
    }

    public function delete(Project $project)
    {
        $path = $this->getProjectPath($project);
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

            $this->storage->put(
                $innerPath,
                Storage::disk('builder')->get($templateFilePath),
            );
        }

        //thumbnail
        $this->storage->put(
            "$projectPath/thumbnail.png",
            Storage::disk('builder')->get(
                "templates/$templateName/thumbnail.png",
            ),
        );
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
}
