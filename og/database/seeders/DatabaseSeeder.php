<?php

namespace Database\Seeders;

// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        if (config('common.site.demo') || app()->environment('local')) {
            $this->call(DemoProductSeeder::class);
        }
        $this->call(WorkspaceRoleSeeder::class);
    }
}
