<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('builder_pages', function (Blueprint $table) {
            $table->string('access_level')->default('public')->after('title');
            $table->boolean('requires_auth')->default(false)->after('access_level');
            $table->json('allowed_roles')->nullable()->after('requires_auth');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('builder_pages', function (Blueprint $table) {
            $table->dropColumn(['access_level', 'requires_auth', 'allowed_roles']);
        });
    }
};
