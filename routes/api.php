<?php

use App\Http\Controllers\AccountUsageController;
use App\Http\Controllers\AiController;
use App\Http\Controllers\ElementsController;
use App\Http\Controllers\ExportProjectToFTPController;
use App\Http\Controllers\ProjectAuthController;
use App\Http\Controllers\ProjectAutomationController;
use App\Http\Controllers\ProjectDatabaseController;
use App\Http\Controllers\ProjectDownloadController;
use App\Http\Controllers\ProjectsController;
use App\Http\Controllers\ProjectSettingsController;
use App\Http\Controllers\ProjectThumbnailController;
use App\Http\Controllers\TemplatesController;

Route::group(['prefix' => 'v1'], function() {
    Route::group(['middleware' => 'auth:sanctum'], function () {
        //templates
        Route::get('templates', [TemplatesController::class, 'index']);
        Route::get('templates/{name}', [TemplatesController::class, 'show']);
        Route::post('templates', [TemplatesController::class, 'store']);
        Route::put('templates/{name}', [TemplatesController::class, 'update']);
        Route::delete('templates/{ids}', [TemplatesController::class, 'destroy']);

        // projects
        Route::get('projects', [ProjectsController::class, 'index']);
        Route::post('projects/{project}/export/ftp', ExportProjectToFTPController::class);
        Route::post('projects', [ProjectsController::class, 'store']);
        Route::get('projects/{id}', [ProjectsController::class, 'show']);
        Route::put('projects/{id}', [ProjectsController::class, 'update']);
        Route::delete('projects/{ids}', [ProjectsController::class, 'destroy']);
        Route::post('projects/{id}/generate-thumbnail', [ProjectThumbnailController::class, 'store']);
        Route::get('projects/{project}/download', [ProjectDownloadController::class, 'download']);
        Route::post('projects/{project}/settings', ProjectSettingsController::class);

        // project database management
        Route::get('projects/{project}/database/stats', [ProjectDatabaseController::class, 'stats']);
        Route::post('projects/{project}/database', [ProjectDatabaseController::class, 'create']);
        Route::post('projects/{project}/database/migrate', [ProjectDatabaseController::class, 'migrate']);
        Route::post('projects/{project}/database/backup', [ProjectDatabaseController::class, 'backup']);
        Route::post('projects/{project}/database/query', [ProjectDatabaseController::class, 'query']);
        Route::get('projects/{project}/database/schema', [ProjectDatabaseController::class, 'schema']);
        Route::get('projects/{project}/database/tables/{tableName}', [ProjectDatabaseController::class, 'tableData']);
        Route::post('projects/{project}/database/tables/{tableName}/rows', [ProjectDatabaseController::class, 'insertRow']);
        Route::put('projects/{project}/database/tables/{tableName}/rows/{rowId}', [ProjectDatabaseController::class, 'updateRow']);
        Route::delete('projects/{project}/database/tables/{tableName}/rows/{rowId}', [ProjectDatabaseController::class, 'deleteRow']);
        Route::post('projects/{project}/database/tables/{tableName}/import-csv', [ProjectDatabaseController::class, 'importCSV']);
        Route::post('projects/{project}/database/populate-canvas', [ProjectDatabaseController::class, 'populateCanvas']);
        Route::delete('projects/{project}/database', [ProjectDatabaseController::class, 'destroy']);

        // project authentication system
        Route::get('auth/templates', [ProjectAuthController::class, 'getAuthTemplates']);
        Route::get('projects/{project}/auth/status', [ProjectAuthController::class, 'getAuthStatus']);
        Route::post('projects/{project}/auth', [ProjectAuthController::class, 'addAuthSystem']);
        Route::put('projects/{project}/auth/configure', [ProjectAuthController::class, 'configureAuth']);
        Route::delete('projects/{project}/auth', [ProjectAuthController::class, 'removeAuthSystem']);

        // project automation system
        Route::get('projects/{project}/automation', [ProjectAutomationController::class, 'index']);
        Route::post('projects/{project}/automation', [ProjectAutomationController::class, 'store']);
        Route::post('projects/{project}/automation/triggers', [ProjectAutomationController::class, 'saveTrigger']);
        Route::post('projects/{project}/automation/data-tables', [ProjectAutomationController::class, 'saveDataTable']);
        Route::delete('projects/{project}/automation/data-tables/{tableId}', [ProjectAutomationController::class, 'deleteDataTable']);
        
        // OAuth configuration and callbacks
        Route::get('oauth/{provider}/config', [ProjectAutomationController::class, 'getOAuthConfig']);
        Route::get('oauth/{provider}/callback', [ProjectAutomationController::class, 'handleOAuthCallback']);
        Route::get('oauth/google_sheets/callback', [ProjectAutomationController::class, 'handleOAuthCallback'])->defaults('provider', 'google_sheets');
        Route::post('projects/{project}/automation/data-bindings', [ProjectAutomationController::class, 'saveDataBinding']);
        Route::post('projects/{project}/automation/external-connections', [ProjectAutomationController::class, 'saveExternalConnection']);
        Route::post('projects/{project}/automation/relationships', [ProjectAutomationController::class, 'createRelationship']);
        Route::post('projects/{project}/automation/test-connection', [ProjectAutomationController::class, 'testConnection']);
        Route::post('projects/{project}/automation/setup-database', [ProjectAutomationController::class, 'setupDatabase']);
        Route::get('automation/google-sheets/config', [ProjectAutomationController::class, 'getGoogleSheetsConfig']);
        Route::get('automation/airtable/config', [ProjectAutomationController::class, 'getAirtableConfig']);

        // api
        Route::post('ai/generate-text', [AiController::class, 'generateText']);
        Route::post('ai/generate-image', [AiController::class, 'generateImage']);
        Route::post('ai/modify-text', [AiController::class, 'modifyText']);
        Route::post('ai/upload-generated-image', [AiController::class, 'uploadGeneratedImage']);

        // account
        Route::get('account/usage', AccountUsageController::class);
    });

    // elements
    Route::get('elements/custom', [ElementsController::class, 'custom']);
});
