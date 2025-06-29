<?php

/**
 * Nullkode Platform Installer Package Creator
 * 
 * This script creates a complete installation package for nullkode
 * including all advanced features like automation, AI, database management, etc.
 */

class NullkodePackager
{
    private string $version;
    private string $packageName;
    private array $excludePatterns;
    private array $features;

    public function __construct()
    {
        $this->version = '2.0.0';
        $this->packageName = "nullkode-v{$this->version}";
        
        $this->excludePatterns = [
            '.git*',
            'node_modules/*',
            'storage/app/projects/*',
            'storage/logs/*',
            'storage/clockwork/*',
            '.env',
            'tests/*',
            'og/*',
            'phpunit.xml',
            '.phpunit.result.cache'
        ];

        $this->features = [
            'visual_editor' => 'Visual drag-and-drop editor with 100+ elements',
            'automation_system' => 'Zapier-like automation with triggers and actions',
            'database_management' => 'Visual database designer with SQLite integration',
            'ai_content_generation' => 'OpenAI-powered content and image generation',
            'authentication_system' => 'Complete auth system for all templates',
            'project_export' => 'Standalone project export with database',
            'template_library' => '25+ professional templates',
            'responsive_design' => 'Mobile-first responsive design tools',
            'external_integrations' => 'Google Sheets, Airtable, API connections',
            'canvas_data_binding' => 'Dynamic content population system'
        ];
    }

    public function createInstaller(): string
    {
        echo "Creating nullkode v{$this->version} installation package...\n";

        $packageDir = $this->createPackageStructure();
        $this->copySourceFiles($packageDir);
        $this->createInstallationFiles($packageDir);
        $this->createDocumentation($packageDir);
        $this->optimizeForProduction($packageDir);
        $zipFile = $this->createZipPackage($packageDir);
        
        echo "Package created successfully: {$zipFile}\n";
        return $zipFile;
    }

    private function createPackageStructure(): string
    {
        $packageDir = "/tmp/{$this->packageName}";
        
        if (is_dir($packageDir)) {
            $this->deleteDirectory($packageDir);
        }
        
        mkdir($packageDir, 0755, true);
        mkdir("{$packageDir}/installer", 0755, true);
        mkdir("{$packageDir}/docs", 0755, true);
        
        return $packageDir;
    }

    private function copySourceFiles(string $packageDir): void
    {
        echo "Copying source files...\n";
        
        $sourceDir = getcwd();
        $this->copyDirectoryRecursive($sourceDir, $packageDir, $this->excludePatterns);
        
        // Create production .env file
        $this->createProductionEnv($packageDir);
    }

    private function createInstallationFiles(string $packageDir): void
    {
        echo "Creating installation files...\n";
        
        // Main installer script
        $this->createMainInstaller($packageDir);
        
        // System requirements checker
        $this->createRequirementsChecker($packageDir);
        
        // Database installer
        $this->createDatabaseInstaller($packageDir);
        
        // Feature installer
        $this->createFeatureInstaller($packageDir);
        
        // Configuration wizard
        $this->createConfigWizard($packageDir);
    }

    private function createMainInstaller(string $packageDir): void
    {
        $installerScript = <<<'PHP'
#!/usr/bin/env php
<?php

/**
 * Nullkode Installation Script
 * 
 * This script installs nullkode on your web server with all features enabled.
 * Run: php install.php
 */

class NullkodeInstaller
{
    private array $config = [];
    private array $errors = [];

    public function run(): void
    {
        $this->showWelcome();
        $this->checkRequirements();
        $this->gatherConfiguration();
        $this->installApplication();
        $this->setupDatabase();
        $this->configureFeatures();
        $this->finalize();
    }

    private function showWelcome(): void
    {
        echo "\n";
        echo "┌─────────────────────────────────────────────────────────┐\n";
        echo "│                                                         │\n";
        echo "│              Welcome to nullkode v2.0.0                │\n";
        echo "│                                                         │\n";
        echo "│    Advanced Web Application & Website Builder Platform │\n";
        echo "│                                                         │\n";
        echo "└─────────────────────────────────────────────────────────┘\n";
        echo "\n";
        echo "This installer will set up nullkode with the following features:\n";
        echo "✓ Visual drag-and-drop editor with 100+ elements\n";
        echo "✓ Zapier-like automation system\n";
        echo "✓ Visual database designer\n";
        echo "✓ AI-powered content generation\n";
        echo "✓ Complete authentication system\n";
        echo "✓ 25+ professional templates\n";
        echo "✓ External API integrations\n";
        echo "✓ Project export capabilities\n";
        echo "\n";
        echo "Press Enter to continue...";
        readline();
    }

    private function checkRequirements(): void
    {
        echo "Checking system requirements...\n";
        
        $requirements = [
            'php_version' => ['PHP 8.1+', version_compare(PHP_VERSION, '8.1.0', '>=')],
            'pdo_sqlite' => ['PDO SQLite', extension_loaded('pdo_sqlite')],
            'fileinfo' => ['Fileinfo', extension_loaded('fileinfo')],
            'gd' => ['GD Library', extension_loaded('gd')],
            'curl' => ['cURL', extension_loaded('curl')],
            'zip' => ['ZIP', extension_loaded('zip')],
            'openssl' => ['OpenSSL', extension_loaded('openssl')],
            'writable_storage' => ['Writable storage/', is_writable(__DIR__ . '/storage')],
            'writable_bootstrap' => ['Writable bootstrap/cache/', is_writable(__DIR__ . '/bootstrap/cache')]
        ];

        $allPassed = true;
        foreach ($requirements as $key => [$name, $passed]) {
            echo sprintf("  %-30s %s\n", $name, $passed ? '✓ OK' : '✗ FAIL');
            if (!$passed) {
                $allPassed = false;
                $this->errors[] = "Missing requirement: {$name}";
            }
        }

        if (!$allPassed) {
            echo "\nInstallation cannot continue. Please fix the requirements above.\n";
            exit(1);
        }
        
        echo "All requirements met!\n\n";
    }

    private function gatherConfiguration(): void
    {
        echo "Configuration Setup\n";
        echo "===================\n\n";

        // Database configuration
        echo "Database Configuration:\n";
        $this->config['DB_CONNECTION'] = $this->ask('Database type (mysql/sqlite)', 'sqlite');
        
        if ($this->config['DB_CONNECTION'] === 'mysql') {
            $this->config['DB_HOST'] = $this->ask('Database host', 'localhost');
            $this->config['DB_PORT'] = $this->ask('Database port', '3306');
            $this->config['DB_DATABASE'] = $this->ask('Database name');
            $this->config['DB_USERNAME'] = $this->ask('Database username');
            $this->config['DB_PASSWORD'] = $this->ask('Database password', '', true);
        }

        // Application configuration
        echo "\nApplication Configuration:\n";
        $this->config['APP_NAME'] = $this->ask('Application name', 'nullkode');
        $this->config['APP_URL'] = $this->ask('Application URL', 'http://localhost');
        $this->config['APP_ENV'] = $this->ask('Environment (local/production)', 'production');
        $this->config['APP_DEBUG'] = $this->ask('Debug mode (true/false)', 'false');

        // Admin account
        echo "\nAdmin Account Setup:\n";
        $this->config['ADMIN_EMAIL'] = $this->ask('Admin email address');
        $this->config['ADMIN_PASSWORD'] = $this->ask('Admin password', '', true);

        // Optional features
        echo "\nOptional Features:\n";
        $this->config['ENABLE_AI'] = $this->askBool('Enable AI content generation? (requires OpenAI API key)');
        if ($this->config['ENABLE_AI']) {
            $this->config['OPENAI_API_KEY'] = $this->ask('OpenAI API Key', '', true);
        }

        $this->config['ENABLE_ANALYTICS'] = $this->askBool('Enable analytics and monitoring?');
        $this->config['ENABLE_CUSTOM_DOMAINS'] = $this->askBool('Enable custom domain support?');

        echo "\nConfiguration complete!\n\n";
    }

    private function installApplication(): void
    {
        echo "Installing application...\n";
        
        // Generate app key
        $this->config['APP_KEY'] = 'base64:' . base64_encode(random_bytes(32));
        
        // Create .env file
        $this->createEnvFile();
        
        // Install composer dependencies
        if (file_exists('composer.phar')) {
            exec('php composer.phar install --optimize-autoloader --no-dev');
        } else {
            exec('composer install --optimize-autoloader --no-dev');
        }
        
        // Build frontend assets if Node.js is available
        if ($this->commandExists('npm')) {
            echo "Building frontend assets...\n";
            exec('npm ci');
            exec('npm run build');
        } else {
            echo "Node.js not found. Using pre-built assets.\n";
        }
        
        echo "Application installed successfully!\n";
    }

    private function setupDatabase(): void
    {
        echo "Setting up database...\n";
        
        // Run migrations
        exec('php artisan migrate --force');
        
        // Seed initial data
        exec('php artisan db:seed --force');
        
        echo "Database setup complete!\n";
    }

    private function configureFeatures(): void
    {
        echo "Configuring features...\n";
        
        // Create admin user
        $this->createAdminUser();
        
        // Configure enabled features
        $this->setFeatureSettings();
        
        // Clear caches
        exec('php artisan config:cache');
        exec('php artisan route:cache');
        exec('php artisan view:cache');
        
        echo "Features configured successfully!\n";
    }

    private function finalize(): void
    {
        echo "\n";
        echo "┌─────────────────────────────────────────────────────────┐\n";
        echo "│                                                         │\n";
        echo "│            Installation Complete! 🎉                   │\n";
        echo "│                                                         │\n";
        echo "│  Your nullkode installation is ready to use!           │\n";
        echo "│                                                         │\n";
        echo "└─────────────────────────────────────────────────────────┘\n";
        echo "\n";
        echo "Access your installation at: {$this->config['APP_URL']}\n";
        echo "Admin email: {$this->config['ADMIN_EMAIL']}\n";
        echo "Admin password: [Your configured password]\n";
        echo "\n";
        echo "Next steps:\n";
        echo "1. Visit your nullkode installation\n";
        echo "2. Log in with your admin credentials\n";
        echo "3. Start creating amazing websites and applications!\n";
        echo "\n";
        echo "Documentation: https://docs.nullkode.com\n";
        echo "Support: https://support.nullkode.com\n";
        echo "\n";
    }

    private function ask(string $question, string $default = '', bool $hidden = false): string
    {
        if ($default) {
            echo "{$question} [{$default}]: ";
        } else {
            echo "{$question}: ";
        }
        
        if ($hidden) {
            $answer = $this->askHidden();
        } else {
            $answer = trim(readline());
        }
        
        return $answer ?: $default;
    }

    private function askBool(string $question): bool
    {
        $answer = $this->ask($question . ' (y/n)', 'n');
        return in_array(strtolower($answer), ['y', 'yes', '1', 'true']);
    }

    private function askHidden(): string
    {
        if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
            $exe = __DIR__ . '/hiddeninput.exe';
            if (file_exists($exe)) {
                $value = rtrim(shell_exec($exe));
            } else {
                $value = trim(readline());
            }
        } else {
            system('stty -echo');
            $value = trim(readline());
            system('stty echo');
            echo "\n";
        }
        return $value;
    }

    private function createEnvFile(): void
    {
        $envContent = '';
        foreach ($this->config as $key => $value) {
            if (str_contains($value, ' ')) {
                $value = '"' . $value . '"';
            }
            $envContent .= "{$key}={$value}\n";
        }
        
        file_put_contents('.env', $envContent);
    }

    private function createAdminUser(): void
    {
        $email = $this->config['ADMIN_EMAIL'];
        $password = $this->config['ADMIN_PASSWORD'];
        
        exec("php artisan tinker --execute=\"\$user = App\Models\User::firstOrNew(['email' => '{$email}']); \$user->password = '{$password}'; \$user->email_verified_at = now(); \$user->save(); \$user->permissions()->sync([1]);\"");
    }

    private function setFeatureSettings(): void
    {
        $settings = [
            'branding.site_name' => $this->config['APP_NAME'],
            'ai.enabled' => $this->config['ENABLE_AI'] ? 'true' : 'false',
            'analytics.enabled' => $this->config['ENABLE_ANALYTICS'] ? 'true' : 'false',
            'builder.enable_custom_domains' => $this->config['ENABLE_CUSTOM_DOMAINS'] ? 'true' : 'false'
        ];

        foreach ($settings as $key => $value) {
            exec("php artisan tinker --execute=\"app(Common\Settings\Settings::class)->save('{$key}', '{$value}');\"");
        }
    }

    private function commandExists(string $command): bool
    {
        $return = shell_exec(sprintf("which %s", escapeshellarg($command)));
        return !empty($return);
    }
}

// Run installer
if (php_sapi_name() === 'cli') {
    (new NullkodeInstaller())->run();
} else {
    echo "This installer must be run from the command line.\n";
    exit(1);
}
PHP;

        file_put_contents("{$packageDir}/install.php", $installerScript);
        chmod("{$packageDir}/install.php", 0755);
    }

    private function createProductionEnv(string $packageDir): void
    {
        $envExample = <<<'ENV'
APP_NAME=nullkode
APP_ENV=production
APP_KEY=
APP_DEBUG=false
APP_URL=http://localhost

LOG_CHANNEL=stack
LOG_DEPRECATIONS_CHANNEL=null
LOG_LEVEL=debug

DB_CONNECTION=sqlite
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=
DB_USERNAME=
DB_PASSWORD=

BROADCAST_DRIVER=log
CACHE_DRIVER=file
FILESYSTEM_DISK=local
QUEUE_CONNECTION=sync
SESSION_DRIVER=file
SESSION_LIFETIME=120

MEMCACHED_HOST=127.0.0.1

REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379

MAIL_MAILER=smtp
MAIL_HOST=mailpit
MAIL_PORT=1025
MAIL_USERNAME=null
MAIL_PASSWORD=null
MAIL_ENCRYPTION=null
MAIL_FROM_ADDRESS="hello@example.com"
MAIL_FROM_NAME="${APP_NAME}"

# AI Features (Optional)
OPENAI_API_KEY=
AI_ENABLED=false

# Analytics (Optional)
ANALYTICS_ENABLED=false

# Custom Domains
ENABLE_CUSTOM_DOMAINS=false

# File Uploads
MAX_FILE_SIZE=50M
ALLOWED_EXTENSIONS=jpg,jpeg,png,gif,svg,pdf,doc,docx,zip

# Security
INSTALLED=false
ENV;

        file_put_contents("{$packageDir}/.env.example", $envExample);
    }

    private function createDocumentation(string $packageDir): void
    {
        echo "Creating documentation...\n";
        
        // Installation guide
        $installGuide = <<<'MD'
# nullkode Installation Guide

## System Requirements

- PHP 8.1 or higher
- MySQL 5.7+ or SQLite 3
- Web server (Apache/Nginx)
- 100MB+ disk space
- SSL certificate (recommended)

### PHP Extensions Required

- PDO (with SQLite and/or MySQL driver)
- GD Library
- cURL
- ZIP
- OpenSSL
- Fileinfo

## Installation Methods

### Method 1: Automated Installation (Recommended)

1. Upload the package files to your web server
2. Run the installer: `php install.php`
3. Follow the setup wizard
4. Access your nullkode installation

### Method 2: Manual Installation

1. Upload files to your web server
2. Copy `.env.example` to `.env`
3. Configure database settings in `.env`
4. Run: `php artisan key:generate`
5. Run: `php artisan migrate`
6. Run: `php artisan db:seed`
7. Set proper file permissions

## Post-Installation

### File Permissions

```bash
chmod -R 755 storage
chmod -R 755 bootstrap/cache
chmod -R 755 public
```

### Web Server Configuration

#### Apache
Ensure `.htaccess` files are enabled and mod_rewrite is active.

#### Nginx
Add the following to your server configuration:

```nginx
location / {
    try_files $uri $uri/ /index.php?$query_string;
}

location ~ \.php$ {
    fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
    fastcgi_index index.php;
    fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
    include fastcgi_params;
}
```

## Features Configuration

### AI Content Generation
1. Obtain OpenAI API key
2. Set `OPENAI_API_KEY` in `.env`
3. Set `AI_ENABLED=true`

### Custom Domains
1. Set `ENABLE_CUSTOM_DOMAINS=true`
2. Configure DNS for your domains
3. Set up SSL certificates

### Email Configuration
Configure SMTP settings in `.env` for:
- User registration emails
- Password reset emails
- System notifications

## Troubleshooting

### Common Issues

**Permission Errors**
- Ensure web server has write access to `storage/` and `bootstrap/cache/`

**Database Connection Errors**
- Verify database credentials in `.env`
- Ensure database server is running
- Check firewall settings

**Missing Features**
- Run `php artisan config:cache` to refresh configuration
- Clear browser cache

## Support

- Documentation: https://docs.nullkode.com
- Support: https://support.nullkode.com
- Community: https://community.nullkode.com
MD;

        file_put_contents("{$packageDir}/docs/INSTALLATION.md", $installGuide);

        // Feature guide
        $featureGuide = <<<'MD'
# nullkode Features Guide

## Visual Editor

The drag-and-drop editor includes:
- 100+ pre-built elements
- Responsive design tools
- Real-time preview
- Custom CSS/JS support

## Automation System

Create sophisticated workflows:
- Visual trigger builder
- Database integration
- External API connections
- Scheduled tasks

## Database Management

Every project includes:
- Visual schema designer
- SQLite integration
- Data binding tools
- Backup/restore functionality

## AI Content Generation

Powered by OpenAI:
- Text generation and editing
- Image creation
- Content optimization
- Smart suggestions

## Authentication System

Complete user management:
- Registration/login flows
- Password reset
- Email verification
- Role-based permissions

## Template Library

25+ professional templates:
- Business websites
- Landing pages
- Web applications
- E-commerce sites
- Portfolios

## Project Export

Export complete applications:
- Standalone HTML/CSS/JS
- Database included
- Production-ready code
- Deployment documentation

## External Integrations

Connect to external services:
- Google Sheets
- Airtable
- Custom APIs
- Webhook endpoints
MD;

        file_put_contents("{$packageDir}/docs/FEATURES.md", $featureGuide);
    }

    private function optimizeForProduction(string $packageDir): void
    {
        echo "Optimizing for production...\n";
        
        // Remove development files
        $devFiles = [
            'package.json',
            'package-lock.json',
            'webpack.mix.js',
            'tailwind.config.js',
            'vite.config.js',
            'tsconfig.json'
        ];
        
        foreach ($devFiles as $file) {
            if (file_exists("{$packageDir}/{$file}")) {
                unlink("{$packageDir}/{$file}");
            }
        }
        
        // Remove empty directories
        $this->removeEmptyDirectories($packageDir);
    }

    private function createZipPackage(string $packageDir): string
    {
        echo "Creating ZIP package...\n";
        
        $zipFile = "/tmp/{$this->packageName}.zip";
        $zip = new ZipArchive();
        
        if ($zip->open($zipFile, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== TRUE) {
            throw new Exception("Cannot create ZIP file: {$zipFile}");
        }
        
        $this->addDirectoryToZip($zip, $packageDir, $this->packageName);
        $zip->close();
        
        return $zipFile;
    }

    private function copyDirectoryRecursive(string $src, string $dst, array $excludePatterns = []): void
    {
        $dir = opendir($src);
        @mkdir($dst);
        
        while (($file = readdir($dir)) !== false) {
            if ($file != '.' && $file != '..') {
                $srcPath = $src . '/' . $file;
                $dstPath = $dst . '/' . $file;
                
                // Check if file/directory should be excluded
                $excluded = false;
                foreach ($excludePatterns as $pattern) {
                    if (fnmatch($pattern, $file) || fnmatch($pattern, $srcPath)) {
                        $excluded = true;
                        break;
                    }
                }
                
                if (!$excluded) {
                    if (is_dir($srcPath)) {
                        $this->copyDirectoryRecursive($srcPath, $dstPath, $excludePatterns);
                    } else {
                        copy($srcPath, $dstPath);
                    }
                }
            }
        }
        
        closedir($dir);
    }

    private function addDirectoryToZip(ZipArchive $zip, string $dir, string $base = ''): void
    {
        $files = scandir($dir);
        
        foreach ($files as $file) {
            if ($file != '.' && $file != '..') {
                $filePath = $dir . '/' . $file;
                $zipPath = $base . '/' . $file;
                
                if (is_dir($filePath)) {
                    $zip->addEmptyDir($zipPath);
                    $this->addDirectoryToZip($zip, $filePath, $zipPath);
                } else {
                    $zip->addFile($filePath, $zipPath);
                }
            }
        }
    }

    private function deleteDirectory(string $dir): void
    {
        if (!is_dir($dir)) return;
        
        $files = array_diff(scandir($dir), ['.', '..']);
        foreach ($files as $file) {
            $path = $dir . '/' . $file;
            is_dir($path) ? $this->deleteDirectory($path) : unlink($path);
        }
        rmdir($dir);
    }

    private function removeEmptyDirectories(string $dir): void
    {
        $files = scandir($dir);
        $files = array_diff($files, ['.', '..']);
        
        foreach ($files as $file) {
            $path = $dir . '/' . $file;
            if (is_dir($path)) {
                $this->removeEmptyDirectories($path);
                if (count(scandir($path)) == 2) { // Only . and ..
                    rmdir($path);
                }
            }
        }
    }
}

// Create the package
if (php_sapi_name() === 'cli') {
    try {
        $packager = new NullkodePackager();
        $packageFile = $packager->createInstaller();
        echo "\nPackage created successfully: {$packageFile}\n";
        echo "Ready for distribution!\n";
    } catch (Exception $e) {
        echo "Error creating package: " . $e->getMessage() . "\n";
        exit(1);
    }
} else {
    echo "This script must be run from the command line.\n";
} 