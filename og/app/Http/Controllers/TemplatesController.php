<?php namespace App\Http\Controllers;

use App\Services\TemplateLoader;
use App\Services\TemplateRepository;
use Common\Core\BaseController;
use Illuminate\Contracts\Filesystem\FileNotFoundException;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Str;

class TemplatesController extends BaseController
{
    public function __construct(
        protected TemplateLoader $templateLoader,
        protected TemplateRepository $repository,
    ) {
    }

    public function index()
    {
        $this->authorize('index', 'Template');

        $templates = $this->templateLoader->loadAll();

        $perPage = request('perPage', 15);
        $page = request('page', 1);

        if (request('category')) {
            $templates = $templates->filter(function ($template) {
                return Str::contains(
                    strtolower($template['config']['category'] ?? ''),
                    strtolower(request('category')),
                );
            });
        }

        if (request('query')) {
            $templates = $templates->filter(
                fn($template) => Str::contains(
                    strtolower($template['name']),
                    request('query'),
                ),
            );
        }

        if ($orderBy = request('orderBy', 'updated_at')) {
            $desc = request('orderDir', 'desc') === 'desc';
            $templates = $templates->sortBy($orderBy, SORT_REGULAR, $desc);
        }

        $pagination = new LengthAwarePaginator(
            $templates->slice($perPage * ($page - 1), $perPage)->values(),
            count($templates),
            $perPage,
            $page,
        );

        return $this->success(['pagination' => $pagination]);
    }

    public function show(string $name)
    {
        $this->authorize('show', 'Template');

        try {
            $template = $this->templateLoader->load(
                $name,
                loadPages: request('loadPages') ?? false,
            );
        } catch (FileNotFoundException $exception) {
            return abort(404);
        }

        return $this->success(['template' => $template]);
    }

    public function store()
    {
        $this->authorize('store', 'Template');

        $data = $this->validate(request(), [
            'name' => 'required|string|min:1|max:255',
            'category' => 'required|string|min:1|max:255',
            'template' => 'required|file|mimes:zip',
            'thumbnail' => 'file|image',
            'includeBootstrap' => 'string',
        ]);

        if ($this->templateLoader->exists($data['name'])) {
            return $this->error('', [
                'name' => 'Template with this name already exists.',
            ]);
        }

        $this->repository->create($data);

        return $this->success([
            'template' => $this->templateLoader->load($data['name']),
        ]);
    }

    public function update(string $name)
    {
        $this->authorize('update', 'Template');

        $data = $this->validate(request(), [
            'name' => 'string|min:1|max:255',
            'category' => 'string|min:1|max:255',
            'template' => 'file|mimes:zip',
            'thumbnail' => 'file|image',
            'includeBootstrap' => 'string',
        ]);

        $this->repository->update($name, $data);

        return $this->success([
            'template' => $this->templateLoader->load($name),
        ]);
    }

    public function destroy(string $ids)
    {
        $this->authorize('destroy', 'Template');

        $this->repository->delete(explode(',', $ids));

        return $this->success();
    }
}
