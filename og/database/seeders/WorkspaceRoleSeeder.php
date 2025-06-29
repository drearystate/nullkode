<?php

namespace Database\Seeders;

use Common\Auth\Permissions\Permission;
use Common\Auth\Roles\Role;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;
use Str;
use const App\Providers\WORKSPACED_RESOURCES;

class WorkspaceRoleSeeder extends Seeder
{
    /**
     * @var Role
     */
    private $role;

    public function __construct(Role $role)
    {
        $this->role = $role;
    }

    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        if ($this->role->where('type', 'workspace')->count() === 0) {
            $permissions = $this->loadPermissions();
            $role = $this->role->create([
                'name' => 'Workspace Admin',
                'description' => 'Manage all workspace resources, invite and manage members.',
                'type' => 'workspace',
            ]);
            $role->permissions()->sync($permissions);

            $editorPermissions = $permissions->filter(function(Permission $permission) {
                return $permission->group !== 'workspace_members';
            });
            $role = $this->role->create([
                'name' => 'Workspace Editor',
                'description' => "Manage all workspace resources, regardless of resource owner.",
                'type' => 'workspace',
            ]);
            $role->permissions()->sync($editorPermissions);

            $memberPermissions = $permissions->filter(function(Permission $permission) {
                return $permission->group !== 'workspace_members' && (Str::endsWith($permission->name, 'view') || Str::endsWith($permission->name, 'create'));
            });
            $role = $this->role->create([
                'name' => 'Workspace Member',
                'description' => "Create workspace resources, but can't edit or delete resources owned by other members.",
                'type' => 'workspace',
            ]);
            $role->permissions()->sync($memberPermissions);
        }
    }

    private function loadPermissions(): Collection
    {
        $groups = collect(WORKSPACED_RESOURCES)
            ->map(function($resource) {
                return app($resource)->getTable();
            });

        $groups->push('workspace_members');

        return app(Permission::class)->whereIn('group', $groups)->get();
    }
}
