<?php

use App\Http\Controllers\AccountUsageController;
use App\Http\Controllers\AiController;
use App\Http\Controllers\ElementsController;
use App\Http\Controllers\ExportProjectToFTPController;
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
