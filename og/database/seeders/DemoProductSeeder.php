<?php

namespace Database\Seeders;

use Common\Auth\Permissions\Permission;
use Common\Billing\Models\Product;
use Common\Billing\Products\Actions\CrupdateProduct;
use Illuminate\Database\Seeder;

class DemoProductSeeder extends Seeder
{
    public function run(): void
    {
        if (Product::count()) {
            return;
        }

        $this->basicPlan();
        $this->standardPlan();
        $this->proPlan();
    }

    protected function basicPlan(): void
    {
        $permissionIds = app(Permission::class)->pluck('id', 'name');
        app(CrupdateProduct::class)->execute([
            'name' => 'Basic',
            'position' => 1,
            'feature_list' => [
                '2 Sites',
                'Drag & Drop Builder',
                '1000 AI image & text tokens',
                '500MB Storage',
                'Workspaces',
                'Custom code',
                'No Ads',
                'Free Subdomain',
            ],
            'permissions' => [
                ['id' => $permissionIds['workspaces.create']],
                ['id' => $permissionIds['editors.enable']],
                [
                    'id' => $permissionIds['projects.create'],
                    'restrictions' => [['name' => 'count', 'value' => 3]],
                ],
                [
                    'id' => $permissionIds['ai.images'],
                    'restrictions' => [['name' => 'tokens', 'value' => 1000]],
                ],
                [
                    'id' => $permissionIds['ai.text'],
                    'restrictions' => [['name' => 'tokens', 'value' => 1000]],
                ],
            ],
            'prices' => [
                [
                    'amount' => 10,
                    'currency' => 'USD',
                    'interval' => 'month',
                    'interval_count' => 1,
                ],
                [
                    'amount' => 54,
                    'currency' => 'USD',
                    'interval' => 'month',
                    'interval_count' => 6,
                ],
                [
                    'amount' => 96,
                    'currency' => 'USD',
                    'interval' => 'month',
                    'interval_count' => 12,
                ],
            ],
        ]);
    }

    protected function standardPlan(): void
    {
        $permissionIds = app(Permission::class)->pluck('id', 'name');
        app(CrupdateProduct::class)->execute([
            'name' => 'Standard',
            'position' => 2,
            'feature_list' => [
                '5 Sites',
                'Drag & Drop Builder',
                '10,000 AI image & text tokens',
                '2GB Storage',
                'Custom code',
                'Workspaces',
                'No Ads',
                'Custom Domains',
                'Download Projects',
            ],
            'permissions' => [
                ['id' => $permissionIds['workspaces.create']],
                ['id' => $permissionIds['editors.enable']],
                ['id' => $permissionIds['projects.download']],
                [
                    'id' =>  $permissionIds['projects.create'],
                    'restrictions' => [['name' => 'count', 'value' => 5]],
                ],
                [
                    'id' => $permissionIds['ai.images'],
                    'restrictions' => [['name' => 'tokens', 'value' => 10000]],
                ],
                [
                    'id' => $permissionIds['ai.text'],
                    'restrictions' => [['name' => 'tokens', 'value' => 10000]],
                ],
            ],
            'recommended' => true,
            'prices' => [
                [
                    'amount' => 15,
                    'currency' => 'USD',
                    'interval' => 'month',
                    'interval_count' => 1,
                ],
                [
                    'amount' => 81,
                    'currency' => 'USD',
                    'interval' => 'month',
                    'interval_count' => 6,
                ],
                [
                    'amount' => 144,
                    'currency' => 'USD',
                    'interval' => 'month',
                    'interval_count' => 12,
                ],
            ],
        ]);
    }

    protected function proPlan(): void
    {
        $permissionIds = app(Permission::class)->pluck('id', 'name');
        app(CrupdateProduct::class)->execute([
            'name' => 'Pro',
            'position' => 3,
            'feature_list' => [
                '10 Sites',
                'Drag & Drop Builder',
                'Unlimited AI image & text tokens',
                '10GB Storage',
                'Custom code',
                'Workspaces',
                'No Ads',
                'Custom Domains',
                'Download Projects',
                'Export Projects to FTP',
                'Priority Support',
            ],
            'permissions' => [
                ['id' => $permissionIds['workspaces.create']],
                ['id' => $permissionIds['editors.enable']],
                ['id' => $permissionIds['projects.download']],
                ['id' => $permissionIds['projects.export']],
                [
                    'id' =>  $permissionIds['projects.create'],
                    'restrictions' => [['name' => 'count', 'value' => 10]],
                ],
                [
                    'id' => $permissionIds['ai.images'],
                    'restrictions' => [['name' => 'tokens', 'value' => null]],
                ],
                [
                    'id' => $permissionIds['ai.text'],
                    'restrictions' => [['name' => 'tokens', 'value' => null]],
                ],
            ],
            'prices' => [
                [
                    'amount' => 20,
                    'currency' => 'USD',
                    'interval' => 'month',
                    'interval_count' => 1,
                ],
                [
                    'amount' => 135,
                    'currency' => 'USD',
                    'interval' => 'month',
                    'interval_count' => 6,
                ],
                [
                    'amount' => 240,
                    'currency' => 'USD',
                    'interval' => 'month',
                    'interval_count' => 12,
                ],
            ],
        ]);
    }
}
