<?php namespace App\Services;

use App\Models\Project;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use PDO;
use PDOException;

class ProjectDatabaseService
{
    private $storage;

    public function __construct()
    {
        $this->storage = Storage::disk('projects');
    }

    /**
     * Create a new SQLite database for a project
     */
    public function createDatabase(Project $project): bool
    {
        $projectPath = app(ProjectRepository::class)->getProjectPath($project, true);
        $databasePath = $this->getDatabasePath($project);
        $databaseDir = dirname($databasePath);

        // Ensure database directory exists
        File::ensureDirectoryExists($databaseDir);

        try {
            // Create SQLite database
            $pdo = new PDO("sqlite:$databasePath");
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

            // Initialize with basic schema
            $this->createBasicSchema($pdo);

            // Setup automation system if available
            if (app()->bound(\App\Services\ProjectAutomationService::class)) {
                app(\App\Services\ProjectAutomationService::class)->setupAutomationInDatabase($project);
            }

            // Create database configuration files
            $this->createDatabaseConfig($project);

            // Create initial migration file
            $this->createInitialMigration($project);

            return true;
        } catch (PDOException $e) {
            // Clean up on failure
            if (File::exists($databasePath)) {
                File::delete($databasePath);
            }
            throw new \Exception("Failed to create project database: " . $e->getMessage());
        }
    }

    /**
     * Get the path to the project's SQLite database
     */
    public function getDatabasePath(Project $project, bool $relative = false): string
    {
        $projectPath = app(ProjectRepository::class)->getProjectPath($project, !$relative);
        return "$projectPath/database/project.db";
    }

    /**
     * Get database connection for a specific project
     */
    public function getConnection(Project $project): PDO
    {
        $databasePath = $this->getDatabasePath($project);
        
        if (!File::exists($databasePath)) {
            throw new \Exception("Project database not found: $databasePath");
        }

        $pdo = new PDO("sqlite:$databasePath");
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        return $pdo;
    }

    /**
     * Create basic schema for new project database
     */
    private function createBasicSchema(PDO $pdo): void
    {
        $schema = [
            // Users table for the webapp with authentication
            "CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                email_verified_at DATETIME NULL,
                remember_token VARCHAR(255) NULL,
                reset_token VARCHAR(255) NULL,
                reset_token_expires DATETIME NULL,
                is_active BOOLEAN DEFAULT 1,
                last_login DATETIME NULL,
                login_attempts INTEGER DEFAULT 0,
                locked_until DATETIME NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )",

            // User sessions table
            "CREATE TABLE IF NOT EXISTS user_sessions (
                id VARCHAR(255) PRIMARY KEY,
                user_id INTEGER,
                ip_address VARCHAR(45),
                user_agent TEXT,
                payload TEXT,
                last_activity INTEGER,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )",

            // Password reset tokens
            "CREATE TABLE IF NOT EXISTS password_resets (
                email VARCHAR(255) NOT NULL,
                token VARCHAR(255) NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                expires_at DATETIME NOT NULL
            )",
            
            // Settings table for app configuration
            "CREATE TABLE IF NOT EXISTS settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                key VARCHAR(255) UNIQUE NOT NULL,
                value TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )",
            
            // Generic content table
            "CREATE TABLE IF NOT EXISTS content (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title VARCHAR(255) NOT NULL,
                content TEXT,
                type VARCHAR(100) DEFAULT 'page',
                status VARCHAR(50) DEFAULT 'published',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )",

            // Migrations tracking
            "CREATE TABLE IF NOT EXISTS migrations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                migration VARCHAR(255) NOT NULL,
                batch INTEGER NOT NULL,
                executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )"
        ];

        foreach ($schema as $sql) {
            $pdo->exec($sql);
        }

        // Insert initial settings
        $initialSettings = [
            ['app_name', 'My Web App'],
            ['app_version', '1.0.0'],
            ['database_version', '1']
        ];

        $stmt = $pdo->prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)");
        foreach ($initialSettings as $setting) {
            $stmt->execute($setting);
        }
    }

    /**
     * Create database configuration files
     */
    private function createDatabaseConfig(Project $project): void
    {
        $projectPath = app(ProjectRepository::class)->getProjectPath($project);
        
        // Database configuration
        $dbConfig = [
            'default' => 'sqlite',
            'connections' => [
                'sqlite' => [
                    'driver' => 'sqlite',
                    'database' => './database/project.db',
                    'prefix' => '',
                    'foreign_key_constraints' => true,
                ]
            ]
        ];

        $this->storage->put("$projectPath/config/database.php", "<?php\n\nreturn " . var_export($dbConfig, true) . ";\n");

        // App configuration
        $appConfig = [
            'name' => $project->name,
            'env' => 'production',
            'debug' => false,
            'url' => 'http://localhost',
            'timezone' => 'UTC',
            'key' => base64_encode(random_bytes(32)),
        ];

        $this->storage->put("$projectPath/config/app.php", "<?php\n\nreturn " . var_export($appConfig, true) . ";\n");

        // .env file for local development
        $envContent = "APP_NAME=\"{$project->name}\"\n";
        $envContent .= "APP_ENV=local\n";
        $envContent .= "APP_KEY=" . base64_encode(random_bytes(32)) . "\n";
        $envContent .= "APP_DEBUG=true\n";
        $envContent .= "APP_URL=http://localhost\n\n";
        $envContent .= "DB_CONNECTION=sqlite\n";
        $envContent .= "DB_DATABASE=./database/project.db\n";

        $this->storage->put("$projectPath/.env", $envContent);
    }

    /**
     * Create initial migration file
     */
    private function createInitialMigration(Project $project): void
    {
        $projectPath = app(ProjectRepository::class)->getProjectPath($project);
        $timestamp = date('Y_m_d_His');
        
        $migrationContent = "<?php\n\n";
        $migrationContent .= "// Initial database schema migration\n";
        $migrationContent .= "// Created: " . date('Y-m-d H:i:s') . "\n\n";
        $migrationContent .= "// This migration sets up the basic tables for your web application\n";
        $migrationContent .= "// You can modify this file to add your own tables and columns\n\n";
        $migrationContent .= "return [\n";
        $migrationContent .= "    'up' => [\n";
        $migrationContent .= "        // Add your table creation SQL here\n";
        $migrationContent .= "        // Example:\n";
        $migrationContent .= "        // \"CREATE TABLE posts (id INTEGER PRIMARY KEY, title TEXT, content TEXT)\"\n";
        $migrationContent .= "    ],\n";
        $migrationContent .= "    'down' => [\n";
        $migrationContent .= "        // Add your table dropping SQL here\n";
        $migrationContent .= "        // Example:\n";
        $migrationContent .= "        // \"DROP TABLE IF EXISTS posts\"\n";
        $migrationContent .= "    ]\n";
        $migrationContent .= "];\n";

        $this->storage->put("$projectPath/database/migrations/{$timestamp}_initial_schema.php", $migrationContent);
    }

    /**
     * Run migrations for a project
     */
    public function runMigrations(Project $project): array
    {
        $projectPath = app(ProjectRepository::class)->getProjectPath($project);
        $migrationsPath = "$projectPath/database/migrations";
        
        if (!$this->storage->exists($migrationsPath)) {
            return ['executed' => [], 'errors' => []];
        }

        $pdo = $this->getConnection($project);
        $executed = [];
        $errors = [];

        $migrationFiles = $this->storage->files($migrationsPath);
        
        foreach ($migrationFiles as $file) {
            $migrationName = basename($file, '.php');
            
            // Check if migration already executed
            $stmt = $pdo->prepare("SELECT COUNT(*) FROM migrations WHERE migration = ?");
            $stmt->execute([$migrationName]);
            
            if ($stmt->fetchColumn() > 0) {
                continue; // Already executed
            }

            try {
                $migrationPath = $this->storage->path($file);
                $migration = include $migrationPath;
                
                if (isset($migration['up']) && is_array($migration['up'])) {
                    foreach ($migration['up'] as $sql) {
                        $pdo->exec($sql);
                    }
                    
                    // Record migration
                    $stmt = $pdo->prepare("INSERT INTO migrations (migration, batch) VALUES (?, 1)");
                    $stmt->execute([$migrationName]);
                    
                    $executed[] = $migrationName;
                }
            } catch (\Exception $e) {
                $errors[] = "Migration $migrationName failed: " . $e->getMessage();
            }
        }

        return ['executed' => $executed, 'errors' => $errors];
    }

    /**
     * Backup database to SQL file
     */
    public function backupDatabase(Project $project): string
    {
        $pdo = $this->getConnection($project);
        $projectPath = app(ProjectRepository::class)->getProjectPath($project);
        
        $backupContent = "-- Database backup for project: {$project->name}\n";
        $backupContent .= "-- Generated: " . date('Y-m-d H:i:s') . "\n\n";

        // Get all tables
        $tables = $pdo->query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")->fetchAll(PDO::FETCH_COLUMN);

        foreach ($tables as $table) {
            // Get CREATE TABLE statement
            $createStmt = $pdo->query("SELECT sql FROM sqlite_master WHERE type='table' AND name='$table'")->fetchColumn();
            $backupContent .= "$createStmt;\n\n";

            // Get data
            $rows = $pdo->query("SELECT * FROM $table")->fetchAll(PDO::FETCH_ASSOC);
            if (!empty($rows)) {
                foreach ($rows as $row) {
                    $values = array_map(function($value) {
                        return $value === null ? 'NULL' : "'" . str_replace("'", "''", $value) . "'";
                    }, array_values($row));
                    
                    $backupContent .= "INSERT INTO $table VALUES (" . implode(', ', $values) . ");\n";
                }
                $backupContent .= "\n";
            }
        }

        $backupPath = "$projectPath/database/backup_" . date('Y_m_d_His') . ".sql";
        $this->storage->put($backupPath, $backupContent);

        return $backupPath;
    }

    /**
     * Delete project database and related files
     */
    public function deleteDatabase(Project $project): bool
    {
        $projectPath = app(ProjectRepository::class)->getProjectPath($project);
        
        // Delete database directory
        if ($this->storage->exists("$projectPath/database")) {
            return $this->storage->deleteDirectory("$projectPath/database");
        }

        return true;
    }

    /**
     * Check if project has a database
     */
    public function hasDatabase(Project $project): bool
    {
        $databasePath = $this->getDatabasePath($project);
        return File::exists($databasePath);
    }

    /**
     * Get database statistics
     */
    public function getDatabaseStats(Project $project): array
    {
        if (!$this->hasDatabase($project)) {
            return ['tables' => 0, 'size' => 0, 'records' => 0];
        }

        $pdo = $this->getConnection($project);
        $databasePath = $this->getDatabasePath($project);
        
        // Get table count
        $tables = $pdo->query("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")->fetchColumn();
        
        // Get total record count
        $totalRecords = 0;
        $tableNames = $pdo->query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")->fetchAll(PDO::FETCH_COLUMN);
        
        foreach ($tableNames as $table) {
            $count = $pdo->query("SELECT COUNT(*) FROM $table")->fetchColumn();
            $totalRecords += $count;
        }

        return [
            'tables' => $tables,
            'size' => File::exists($databasePath) ? File::size($databasePath) : 0,
            'records' => $totalRecords
        ];
    }
} 