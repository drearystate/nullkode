<?php

use Common\Settings\DotEnvEditor;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration {
    public function up(): void
    {
        app(DotEnvEditor::class)->write(['DYNAMIC_APP_URL' => 'true']);
    }

    public function down(): void
    {
        //
    }
};
