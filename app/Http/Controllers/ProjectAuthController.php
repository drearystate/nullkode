<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Services\AuthTemplateService;
use App\Services\ProjectDatabaseService;
use Common\Core\BaseController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ProjectAuthController extends BaseController
{
    private AuthTemplateService $authService;
    private ProjectDatabaseService $databaseService;

    public function __construct(AuthTemplateService $authService, ProjectDatabaseService $databaseService)
    {
        $this->authService = $authService;
        $this->databaseService = $databaseService;
    }

    /**
     * Add authentication system to a project
     */
    public function addAuthSystem(Request $request, Project $project)
    {
        $request->validate([
            'style' => 'sometimes|string|in:modern,classic,minimal',
            'brandColor' => 'sometimes|string|regex:/^#[0-9A-Fa-f]{6}$/',
            'features' => 'sometimes|array',
            'features.*' => 'string|in:email_verification,password_reset,remember_me,two_factor,social_login'
        ]);

        try {
            // Ensure database exists
            if (!$this->databaseService->hasDatabase($project)) {
                $this->databaseService->createDatabase($project);
            }

            $options = [
                'style' => $request->input('style', 'modern'),
                'brandColor' => $request->input('brandColor', '#007bff'),
                'features' => $request->input('features', ['password_reset', 'remember_me'])
            ];

            $success = $this->authService->addAuthSystem($project, $options);

            if ($success) {
                // Update project settings to indicate auth is enabled
                $settings = $project->settings ?? [];
                $settings['auth_enabled'] = true;
                $settings['auth_features'] = $options['features'];
                $project->update(['settings' => $settings]);

                return response()->json([
                    'success' => true,
                    'message' => 'Authentication system added successfully',
                    'pages_created' => [
                        'login.html',
                        'register.html', 
                        'forgot-password.html',
                        'dashboard.html',
                        'profile.html'
                    ],
                    'files_created' => [
                        'auth.php',
                        'logout.php',
                        'includes/session-check.php'
                    ]
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'Failed to add authentication system'
            ], 500);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error adding authentication: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get authentication status for a project
     */
    public function getAuthStatus(Project $project)
    {
        $settings = $project->settings ?? [];
        $authEnabled = $settings['auth_enabled'] ?? false;
        $authFeatures = $settings['auth_features'] ?? [];

        $stats = null;
        if ($authEnabled && $this->databaseService->hasDatabase($project)) {
            try {
                $pdo = $this->databaseService->getConnection($project);
                $stmt = $pdo->query("SELECT COUNT(*) as user_count FROM users");
                $userCount = $stmt->fetch(\PDO::FETCH_ASSOC)['user_count'];
                
                $stmt = $pdo->query("SELECT COUNT(*) as active_sessions FROM user_sessions WHERE last_activity > " . (time() - 3600));
                $activeSessions = $stmt->fetch(\PDO::FETCH_ASSOC)['active_sessions'];

                $stats = [
                    'total_users' => $userCount,
                    'active_sessions' => $activeSessions
                ];
            } catch (\Exception $e) {
                // Database might not be accessible
            }
        }

        return response()->json([
            'auth_enabled' => $authEnabled,
            'features' => $authFeatures,
            'stats' => $stats
        ]);
    }

    /**
     * Configure authentication settings
     */
    public function configureAuth(Request $request, Project $project)
    {
        $request->validate([
            'features' => 'required|array',
            'features.*' => 'string|in:email_verification,password_reset,remember_me,two_factor,social_login',
            'settings' => 'sometimes|array',
            'settings.session_lifetime' => 'sometimes|integer|min:1|max:10080',
            'settings.max_login_attempts' => 'sometimes|integer|min:1|max:10',
            'settings.lockout_duration' => 'sometimes|integer|min:1|max:1440'
        ]);

        try {
            $projectSettings = $project->settings ?? [];
            $projectSettings['auth_features'] = $request->input('features');
            
            if ($request->has('settings')) {
                $authSettings = $request->input('settings');
                $projectSettings['auth_settings'] = array_merge(
                    $projectSettings['auth_settings'] ?? [],
                    $authSettings
                );
            }

            $project->update(['settings' => $projectSettings]);

            // Update database settings if database exists
            if ($this->databaseService->hasDatabase($project)) {
                $pdo = $this->databaseService->getConnection($project);
                
                foreach ($request->input('settings', []) as $key => $value) {
                    $stmt = $pdo->prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)");
                    $stmt->execute(["auth_$key", $value, date('Y-m-d H:i:s')]);
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Authentication settings updated successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error updating settings: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get authentication templates/styles available
     */
    public function getAuthTemplates()
    {
        return response()->json([
            'styles' => [
                'modern' => [
                    'name' => 'Modern',
                    'description' => 'Clean, gradient backgrounds with rounded cards',
                    'features' => ['responsive', 'gradient_bg', 'rounded_cards', 'modern_typography']
                ],
                'classic' => [
                    'name' => 'Classic',
                    'description' => 'Traditional forms with solid backgrounds',
                    'features' => ['responsive', 'solid_bg', 'bordered_forms', 'standard_typography']
                ],
                'minimal' => [
                    'name' => 'Minimal',
                    'description' => 'Ultra-clean design with minimal styling',
                    'features' => ['responsive', 'minimal_bg', 'borderless_forms', 'light_typography']
                ]
            ],
            'features' => [
                'email_verification' => [
                    'name' => 'Email Verification',
                    'description' => 'Require users to verify their email address'
                ],
                'password_reset' => [
                    'name' => 'Password Reset',
                    'description' => 'Allow users to reset forgotten passwords'
                ],
                'remember_me' => [
                    'name' => 'Remember Me',
                    'description' => 'Keep users logged in across sessions'
                ],
                'two_factor' => [
                    'name' => 'Two-Factor Authentication',
                    'description' => 'Add extra security with 2FA'
                ],
                'social_login' => [
                    'name' => 'Social Login',
                    'description' => 'Login with Google, Facebook, etc.'
                ]
            ]
        ]);
    }

    /**
     * Remove authentication system from project
     */
    public function removeAuthSystem(Project $project)
    {
        try {
            $projectPath = app(\App\Services\ProjectRepository::class)->getProjectPath($project);
            $storage = app('filesystem')->disk('projects');

            // Remove auth pages
            $authFiles = [
                'login.html',
                'register.html',
                'forgot-password.html',
                'dashboard.html',
                'profile.html',
                'auth.php',
                'logout.php',
                'includes/session-check.php'
            ];

            foreach ($authFiles as $file) {
                $filePath = "$projectPath/$file";
                if ($storage->exists($filePath)) {
                    $storage->delete($filePath);
                }
            }

            // Update project settings
            $settings = $project->settings ?? [];
            unset($settings['auth_enabled'], $settings['auth_features'], $settings['auth_settings']);
            $project->update(['settings' => $settings]);

            return response()->json([
                'success' => true,
                'message' => 'Authentication system removed successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error removing authentication: ' . $e->getMessage()
            ], 500);
        }
    }
} 