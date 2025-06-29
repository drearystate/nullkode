<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        foreach (DB::table('projects')->lazyById() as $project) {
            $userId = DB::table('users_projects')
                ->where('project_id', $project->id)
                ->value('user_id');
            DB::table('projects')
                ->where('id', $project->id)
                ->update(['user_id' => $userId]);
        }
    }

    public function down(): void
    {
        //
    }
};
