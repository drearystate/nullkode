<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use const App\Providers\WORKSPACED_RESOURCES;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $models = WORKSPACED_RESOURCES;

        foreach ($models as $model) {
            $table = app($model)->getTable();
            if (!Schema::hasColumn($table, 'workspace_id')) {
                Schema::table($table, function (Blueprint $table) {
                    $table->integer('workspace_id')->unsigned()->default(0)->index();
                });
            }
        }

        Schema::table('projects', function (Blueprint $table) {
            $table->integer('user_id')->unsigned()->default(0)->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        //
    }
};
