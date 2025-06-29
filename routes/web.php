<?php

use App\Http\Controllers\LandingPageController;
use App\Http\Controllers\TemplatePreviewController;
use App\Http\Controllers\UserSiteController;
use Common\Core\Controllers\HomeController;
use Common\Pages\CustomPageController;

Route::get('/', LandingPageController::class);
Route::get('contact', [HomeController::class, 'render']);
Route::get('pages/{slugOrId}', [CustomPageController::class, 'show']);
Route::get('login', [HomeController::class, 'render'])->name('login');
Route::get('register', [HomeController::class, 'render'])->name('register');
Route::get('forgot-password', [HomeController::class, 'render']);
Route::get('pricing', '\Common\Billing\PricingPageController');

Route::get('sites/{name}/{page?}', [UserSiteController::class, 'show'])->name('user-site-regular');
Route::get('templates/preview/{name}/{page?}', TemplatePreviewController::class);

//CATCH ALL ROUTES AND REDIRECT TO HOME
Route::fallback([HomeController::class, 'render']);

