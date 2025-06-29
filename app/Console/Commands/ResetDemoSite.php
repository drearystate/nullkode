<?php namespace App\Console\Commands;

use App\Models\Project;
use App\Models\User;
use App\Services\ProjectRepository;
use Common\Auth\Permissions\Permission;
use Common\Database\Seeds\DefaultPagesSeeder;
use Common\Localizations\Localization;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

class ResetDemoSite extends Command
{
    protected $signature = 'demo:reset';
    protected $description = 'Reset demo site.';

    public function __construct(protected ProjectRepository $projectRepository)
    {
        parent::__construct();
    }

    public function handle(): void
    {
        if (!config('common.site.demo')) {
            $this->error('This is not a demo site.');
            return;
        }

        $admin = User::findAdmin();
        if (!$admin) {
            $admin = User::create([
                'email' => 'admin@admin.com',
            ]);
        }
        $superAdmin = User::where('email', 'Ic0OdCIodqz8q1r@demo.com')->first();
        if (!$superAdmin) {
            $superAdmin = User::create([
                'email' => 'Ic0OdCIodqz8q1r@demo.com',
                'password' => config('common.site.demo_password'),
            ]);
        }

        $admin->avatar = null;
        $admin->first_name = 'Demo';
        $admin->last_name = 'Admin';
        $admin->password = 'admin';

        $adminPermission = app(Permission::class)
            ->where('name', 'admin')
            ->first();
        $admin->permissions()->syncWithoutDetaching([$adminPermission->id]);
        $superAdmin->permissions()->syncWithoutDetaching([$adminPermission->id]);

        $admin->save();

        $admin->subscriptions()->delete();

        // delete projects
        foreach (Project::lazyById(50) as $project) {
            $this->projectRepository->delete($project);
        }

        // create some demo projects
        $demoTemplates = [
            'one-page-wonder',
            'pratt',
            'stylish-portfolio',
            'stanley',
            'creative',
            'flatty',
        ];
        foreach ($demoTemplates as $key => $template) {
            $this->projectRepository->create([
                'name' => 'Demo ' . (6 - $key),
                'userId' => $admin->id,
                'templateName' => $template,
                'published' => true,
                'updatedAt' => now()->subDays(rand(1, 24)),
            ]);
        }

        DB::table('failed_jobs')->truncate();
        DB::table('active_sessions')->truncate();
        DB::table('bans')->truncate();
        DB::table('custom_domains')->truncate();
        DB::table('custom_pages')->truncate();
        DB::table('workspace_invites')->truncate();
        DB::table('workspace_user')->truncate();
        DB::table('workspaces')->truncate();
        Localization::get()->each(function (Localization $localization) {
            if (strtolower($localization->name) !== 'english') {
                $localization->delete();
            }
        });

        // re-seed default custom pages
        app(DefaultPagesSeeder::class)
            ->setContainer(app())
            ->run();

        Artisan::call('cache:clear');

        $this->info('Demo site reset.');
    }
}
