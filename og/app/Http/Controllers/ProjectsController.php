<?php namespace App\Http\Controllers;

use App\Models\Project;
use App\Services\ProjectRepository;
use Common\Core\BaseController;
use Common\Database\Datasource\Datasource;
use Common\Database\Datasource\DatasourceFilters;
use Illuminate\Http\Request;

class ProjectsController extends BaseController
{
    public function __construct(
        protected Request $request,
        protected Project $project,
        protected ProjectRepository $repository,
    ) {
    }
    public function index()
    {
        $builder = Project::with(['domain', 'user']);
        $filters = new DatasourceFilters(request('filters'));
        $userId = request('userId') ?? $filters->getAndRemove('userId');

        $this->authorize('index', [Project::class, $userId]);

        if (request('workspaceId')) {
            $builder->where('workspace_id', request('workspaceId'));
        } elseif ($userId) {
            $builder->where('user_id', $userId);
        }

        if (request()->has('published') && request('published') !== 'all') {
            $builder->where('published', request('published'));
        }

        $datasource = new Datasource($builder, request()->all(), $filters);

        return $this->success(['pagination' => $datasource->paginate()]);
    }

    public function show($id)
    {
        $project = Project::with('domain')->findOrFail($id);

        $this->authorize('show', $project);

        if (request('loader') === 'editor') {
            $project->load('pages', 'user');
            $project = $this->repository->load($project);
        }

        return $this->success(['project' => $project]);
    }

    public function update(int $id)
    {
        $project = Project::with('user')->find($id);

        $this->authorize('update', $project);

        $data = $this->validate(request(), [
            'name' => 'string|min:3|max:255',
            'css' => 'nullable|string|min:1',
            'js' => 'nullable|string|min:1',
            'template' => 'nullable|string|min:1|max:255',
            'custom_element_css' => 'nullable|string|min:1',
            'pages' => 'array',
            'pages.*' => 'array',
        ]);

        $this->repository->update($project, $data);

        return $this->success([
            'project' => $this->repository->load($project),
        ]);
    }

    public function store()
    {
        $this->authorize('store', Project::class);

        $data = $this->validate(request(), [
            'name' => 'required|string|min:3|max:255|unique:projects',
            'slug' => 'string|min:3|max:30|unique:projects',
            'css' => 'nullable|string|min:1|max:255',
            'js' => 'nullable|string|min:1|max:255',
            'templateName' => 'nullable|string',
            'published' => 'boolean',
            'pages' => 'array',
        ]);

        $project = $this->repository->create($data);

        return $this->success(['project' => $this->repository->load($project)]);
    }

    public function destroy(string $ids)
    {
        $projectIds = explode(',', $ids);
        $this->authorize('destroy', [Project::class, $projectIds]);

        foreach ($projectIds as $id) {
            $project = Project::findOrFail($id);
            $this->repository->delete($project);
        }

        return $this->success();
    }
}
