<?php namespace App\Services;

use Exception;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use ZipArchive;

class TemplateRepository
{
    public function create(array $params): void
    {
        $name = $params['name'] ?? $params['display_name'];
        $this->update($name, $params);
    }

    public function update(string $name, array $params): void
    {
        $name = slugify($name);
        $templatePath = "templates/$name";
        $storage = Storage::disk('builder');

        // extract template files
        if (isset($params['template'])) {
            $zip = new ZipArchive();
            if (!$zip->open($params['template']->getRealPath())) {
                throw new Exception('Could not extract template zip file');
            }
            $zip->extractTo($storage->path($templatePath));
            $zip->close();
            $storage->setVisibility($templatePath, 'public');

            // if there are multiple index.html files, get the one that is closest to root
            $indexFilePath = collect($storage->allFiles($templatePath))
                ->filter(fn($path) => Str::contains($path, 'index.html'))
                ->sortBy(fn($path) => substr_count($path, '/'))
                ->first();

            if (!$indexFilePath) {
                // make sure there is always an index.html file in template folder
                $storage->put(
                    "$templatePath/index.html",
                    'Could not find index.html file in the template, so this file was created automatically.',
                );
            } else {
                // move template files to root if they were nested inside .zip file
                $nestedIndexFolder = str_replace(
                    '/index.html',
                    '',
                    $indexFilePath,
                );
                $nestedIndexFolder = trim(
                    str_replace($templatePath, '', $nestedIndexFolder),
                    '/',
                );
                if ($nestedIndexFolder) {
                    foreach (
                        $storage->allFiles("$templatePath/$nestedIndexFolder")
                        as $oldPath
                    ) {
                        $newPath = preg_replace(
                            "/$nestedIndexFolder/",
                            '',
                            $oldPath,
                            1,
                        );
                        $newPath = str_replace('//', '/', $newPath);
                        $storage->move($oldPath, $newPath);
                    }
                    $storage->deleteDirectory(
                        "$templatePath/$nestedIndexFolder",
                    );
                }
            }
        }

        // load config file if it exists
        $configPath = "$templatePath/config.json";
        $config = [];
        if ($storage->exists($configPath)) {
            $config = json_decode($storage->get($configPath), true);
        }

        // update config file
        foreach (
            Arr::except($params, ['template', 'thumbnail'])
            as $key => $value
        ) {
            $config[$key] =
                $key === 'includeBootstrap' ? castToBoolean($value) : $value;
        }
        $storage->put($configPath, json_encode($config, JSON_PRETTY_PRINT));

        // update thumbnail
        if (isset($params['thumbnail'])) {
            $storage->put(
                "$templatePath/thumbnail.png",
                file_get_contents($params['thumbnail']),
            );
        }
    }

    public function delete(array $names): void
    {
        foreach ($names as $name) {
            Storage::disk('builder')->deleteDirectory("templates/$name");
        }
    }
}
