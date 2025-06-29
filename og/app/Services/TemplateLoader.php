<?php namespace App\Services;

use Carbon\Carbon;
use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class TemplateLoader
{
    const DEFAULT_THUMBNAIL = 'default_project_thumbnail.png';

    private Filesystem $storage;

    public function __construct()
    {
        $this->storage = Storage::disk('builder');
    }

    public function loadAll(): Collection
    {
        $paths = $this->storage->directories('templates');

        return collect($paths)->map(function ($path) {
            $name = basename($path);

            $updatedAt = $this->storage->exists("$path/index.html")
                ? Carbon::createFromTimestamp(
                    $this->storage->lastModified("$path/index.html"),
                )
                : Carbon::now();

            return [
                'id' => $name,
                'name' => $name,
                'updated_at' => $updatedAt,
                'config' => $this->getTemplateConfig(basename($path)),
                'thumbnail' => $this->getTemplateImagePath($name),
            ];
        });
    }

    public function load(string $name, bool $loadPages = false): array
    {
        $paths = $this->storage->files("templates/$name");
        $pages = [];

        if ($loadPages) {
            $pages = collect($paths)
                ->filter(fn($path) => Str::contains($path, '.html'))
                ->map(function ($path) use ($name) {
                    return [
                        'name' => basename($path, '.html'),
                        'html' => $this->storage->get($path),
                    ];
                })
                ->values();
        }

        return [
            'id' => $name,
            'name' => $name,
            'config' => $this->getTemplateConfig($name),
            'thumbnail' => $this->getTemplateImagePath($name),
            'pages' => $pages,
        ];
    }

    public function exists(string $name): bool
    {
        return $this->storage->exists("templates/$name");
    }

    private function getTemplateImagePath(string $name): string
    {
        $path = "templates/$name/thumbnail.png";

        if ($this->storage->exists($path)) {
            return $this->storage->url($path);
        }

        return Storage::disk('builder')->url(self::DEFAULT_THUMBNAIL);
    }

    private function getTemplateConfig(string $name): array
    {
        $path = "templates/$name/config.json";
        $config = [];

        if ($this->storage->exists($path)) {
            $config = json_decode($this->storage->get($path), true);
        }

        return $config;
    }
}
