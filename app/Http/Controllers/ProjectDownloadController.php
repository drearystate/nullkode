<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Services\ProjectRepository;
use App\Services\ProjectDatabaseService;
use App\Services\ProjectAutomationService;
use Carbon\Carbon;
use Common\Core\BaseController;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;
use ZipStream\ZipStream;

class ProjectDownloadController extends BaseController
{
    public function __construct(
        protected ProjectRepository $projectRepository,
        protected ProjectDatabaseService $databaseService,
        protected ProjectAutomationService $automationService
    ) {
    }

    public function download(Project $project)
    {
        $this->authorize('download', $project);

        return new StreamedResponse(
            function () use ($project) {
                $projectPath = $this->projectRepository->getProjectPath($project);
                $disk = Storage::disk('projects');

                $timestamp = Carbon::now()->getTimestamp();

                $zip = new ZipStream(
                    defaultEnableZeroHeader: true,
                    contentType: 'application/octet-stream',
                    sendHttpHeaders: true,
                    outputName: "download-$timestamp.zip",
                );

                $paths = $disk->allFiles($projectPath);
                foreach ($paths as $relativePath) {
                    $zip->addFileFromPath(
                        str_replace($projectPath, '', $relativePath),
                        $disk->path($relativePath),
                    );
                }

                // Add setup files for local development
                $this->addSetupFiles($zip, $project);

                // Add automation script if project has automation
                $automationData = $this->automationService->getAutomationData($project);
                if (!empty($automationData['triggers']) || !empty($automationData['bindings'])) {
                    $automationScript = $this->automationService->generateAutomationScript($project);
                    $zip->addFile('js/automation.js', $automationScript);
                }

                // Add README for database usage if database exists
                if ($this->databaseService->hasDatabase($project)) {
                    $readmeContent = $this->generateDatabaseReadme($project);
                    $zip->addFile('DATABASE_README.md', $readmeContent);
                }

                $zip->finish();
            },
            200,
            [
                'X-Accel-Buffering' => 'no',
                'Pragma' => 'public',
                'Cache-Control' => 'no-cache',
                'Content-Transfer-Encoding' => 'binary',
            ],
        );
    }

    /**
     * Generate README content for database usage
     */
    private function generateDatabaseReadme(Project $project): string
    {
        $stats = $this->databaseService->getDatabaseStats($project);
        
        $readme = "# {$project->name} - Database Information\n\n";
        $readme .= "This project includes a SQLite database with the following information:\n\n";
        $readme .= "## Database Statistics\n";
        $readme .= "- **Tables**: {$stats['tables']}\n";
        $readme .= "- **Total Records**: {$stats['records']}\n";
        $readme .= "- **Database Size**: " . $this->formatBytes($stats['size']) . "\n\n";
        
        $readme .= "## Database File Location\n";
        $readme .= "The SQLite database file is located at: `database/project.db`\n\n";
        
        $readme .= "## Usage Instructions\n";
        $readme .= "1. **SQLite Command Line**: \n";
        $readme .= "   ```bash\n";
        $readme .= "   sqlite3 database/project.db\n";
        $readme .= "   ```\n\n";
        
        $readme .= "2. **PHP PDO Connection**:\n";
        $readme .= "   ```php\n";
        $readme .= "   \$pdo = new PDO('sqlite:database/project.db');\n";
        $readme .= "   ```\n\n";
        
        $readme .= "3. **Configuration Files**:\n";
        $readme .= "   - Database config: `config/database.php`\n";
        $readme .= "   - App config: `config/app.php`\n";
        $readme .= "   - Environment: `.env`\n\n";
        
        $readme .= "## Migrations\n";
        $readme .= "Custom migrations are stored in `database/migrations/`\n\n";
        
        $readme .= "## Backup\n";
        $readme .= "To create a backup of your database:\n";
        $readme .= "```bash\n";
        $readme .= "sqlite3 database/project.db \".dump\" > backup.sql\n";
        $readme .= "```\n\n";
        
        $readme .= "## Schema\n";
        $readme .= "The database includes the following default tables:\n";
        $readme .= "- `users` - User management\n";
        $readme .= "- `settings` - Application settings\n";
        $readme .= "- `content` - Generic content storage\n";
        $readme .= "- `migrations` - Migration tracking\n\n";
        
        $readme .= "Generated on: " . date('Y-m-d H:i:s') . "\n";
        
        return $readme;
    }

    /**
     * Format bytes to human readable format
     */
    private function formatBytes(int $bytes): string
    {
        if ($bytes == 0) return '0 B';
        
        $units = ['B', 'KB', 'MB', 'GB'];
        $i = floor(log($bytes, 1024));
        
        return round($bytes / pow(1024, $i), 2) . ' ' . $units[$i];
    }

    /**
     * Add setup and helper files to the download
     */
    private function addSetupFiles($zip, Project $project): void
    {
        // Main README with comprehensive instructions
        $zip->addFile('README.md', $this->generateMainReadme($project));
        
        // Database-specific README if database exists
        if ($this->databaseService->hasDatabase($project)) {
            $zip->addFile('DATABASE_README.md', $this->generateDatabaseReadme($project));
        }
        
        // PHP server script for routing
        $zip->addFile('server.php', $this->generateServerScript($project));
        
        // Batch script for Windows users
        $zip->addFile('start-server.bat', $this->generateBatchScript());
        
        // Shell script for Unix/Mac users
        $zip->addFile('start-server.sh', $this->generateShellScript());
        
        // Simple API router for database operations
        $zip->addFile('api.php', $this->generateApiRouter($project));
        
        // Basic HTML template for database viewer
        $zip->addFile('database-viewer.html', $this->generateDatabaseViewer($project));
        
        // Package.json for potential Node.js setup
        $zip->addFile('package.json', $this->generatePackageJson($project));
        
        // Add authentication documentation if auth is enabled
        $this->addAuthDocumentation($zip, $project);
    }

    /**
     * Generate main README with complete setup instructions
     */
    private function generateMainReadme(Project $project): string
    {
        $hasDatabase = $this->databaseService->hasDatabase($project);
        
        $readme = "# {$project->name}\n\n";
        $readme .= "A self-contained web project with " . ($hasDatabase ? "SQLite database" : "static files") . ".\n\n";
        
        $readme .= "## Quick Start\n\n";
        $readme .= "### Option 1: PHP Built-in Server (Recommended)\n\n";
        $readme .= "1. **Extract the ZIP file**\n";
        $readme .= "2. **Navigate to the project directory**\n";
        $readme .= "3. **Start the server**:\n\n";
        
        $readme .= "   **Windows:**\n";
        $readme .= "   ```\n";
        $readme .= "   double-click start-server.bat\n";
        $readme .= "   ```\n\n";
        
        $readme .= "   **Mac/Linux:**\n";
        $readme .= "   ```bash\n";
        $readme .= "   ./start-server.sh\n";
        $readme .= "   ```\n\n";
        
        $readme .= "   **Manual:**\n";
        $readme .= "   ```bash\n";
        $readme .= "   php -S localhost:8000 server.php\n";
        $readme .= "   ```\n\n";
        
        $readme .= "4. **Open your browser** to: http://localhost:8000\n\n";
        
        if ($hasDatabase) {
            $readme .= "### Database Access\n\n";
            $readme .= "- **Database Viewer**: http://localhost:8000/database-viewer.html\n";
            $readme .= "- **Database File**: `database/project.db`\n";
            $readme .= "- **API Endpoint**: http://localhost:8000/api.php\n\n";
        }
        
        $readme .= "### Option 2: Static File Server\n\n";
        $readme .= "If you don't have PHP installed, you can use any static file server:\n\n";
        $readme .= "**Python 3:**\n";
        $readme .= "```bash\n";
        $readme .= "python -m http.server 8000\n";
        $readme .= "```\n\n";
        
        $readme .= "**Node.js (if you have it):**\n";
        $readme .= "```bash\n";
        $readme .= "npm install -g http-server\n";
        $readme .= "http-server -p 8000\n";
        $readme .= "```\n\n";
        
        $readme .= "## Project Structure\n\n";
        $readme .= "```\n";
        $readme .= "project/\n";
        $readme .= "├── index.html              # Main page\n";
        $readme .= "├── *.html                  # Other pages\n";
        $readme .= "├── css/                    # Stylesheets\n";
        $readme .= "├── js/                     # JavaScript files\n";
        $readme .= "├── images/                 # Images and media\n";
        if ($hasDatabase) {
            $readme .= "├── database/               # SQLite database\n";
            $readme .= "├── config/                 # Configuration files\n";
        }
        $readme .= "├── server.php              # PHP development server\n";
        $readme .= "├── api.php                 # Database API\n";
        $readme .= "├── database-viewer.html    # Database management UI\n";
        $readme .= "└── README.md               # This file\n";
        $readme .= "```\n\n";
        
        if ($hasDatabase) {
            $readme .= "## Database Information\n\n";
            $stats = $this->databaseService->getDatabaseStats($project);
            $readme .= "- **Database Type**: SQLite\n";
            $readme .= "- **Tables**: {$stats['tables']}\n";
            $readme .= "- **Records**: {$stats['records']}\n";
            $readme .= "- **Size**: " . $this->formatBytes($stats['size']) . "\n\n";
            
            $readme .= "### Database Access Methods\n\n";
            $readme .= "1. **Web Interface**: Open `database-viewer.html` in your browser\n";
            $readme .= "2. **Command Line**: `sqlite3 database/project.db`\n";
            $readme .= "3. **PHP**: See `api.php` for examples\n\n";
        }
        
        $readme .= "## Requirements\n\n";
        $readme .= "- **For full functionality**: PHP 7.4+ with SQLite support\n";
        $readme .= "- **For static files only**: Any web server or modern browser\n\n";
        
        $readme .= "## Troubleshooting\n\n";
        $readme .= "- **Port 8000 in use**: Change port in start scripts or use `php -S localhost:8001 server.php`\n";
        $readme .= "- **Permission issues on Mac/Linux**: Run `chmod +x start-server.sh`\n";
        $readme .= "- **Database not working**: Ensure PHP SQLite extension is installed\n\n";
        
        $readme .= "---\n";
        $readme .= "*Generated from {$project->name} on " . date('Y-m-d H:i:s') . "*\n";
        
        return $readme;
    }

    /**
     * Generate PHP server script for routing
     */
    private function generateServerScript(Project $project): string
    {
        $hasDatabase = $this->databaseService->hasDatabase($project);
        
        $script = "<?php\n";
        $script .= "// Simple PHP router for {$project->name}\n";
        $script .= "// This file routes requests appropriately\n\n";
        
        $script .= "\$uri = parse_url(\$_SERVER['REQUEST_URI'], PHP_URL_PATH);\n";
        $script .= "\$uri = urldecode(\$uri);\n\n";
        
        $script .= "// Handle API requests\n";
        $script .= "if (strpos(\$uri, '/api') === 0) {\n";
        if ($hasDatabase) {
            $script .= "    include 'api.php';\n";
            $script .= "    return;\n";
        } else {
            $script .= "    http_response_code(404);\n";
            $script .= "    echo json_encode(['error' => 'API not available - no database']);\n";
            $script .= "    return;\n";
        }
        $script .= "}\n\n";
        
        $script .= "// Serve static files\n";
        $script .= "if (\$uri !== '/' && file_exists(__DIR__ . \$uri)) {\n";
        $script .= "    return false; // Let PHP serve the file\n";
        $script .= "}\n\n";
        
        $script .= "// Default to index.html\n";
        $script .= "if (\$uri === '/' || \$uri === '') {\n";
        $script .= "    \$uri = '/index.html';\n";
        $script .= "}\n\n";
        
        $script .= "// Check if file exists\n";
        $script .= "\$file = __DIR__ . \$uri;\n";
        $script .= "if (file_exists(\$file) && !is_dir(\$file)) {\n";
        $script .= "    return false; // Let PHP serve the file\n";
        $script .= "}\n\n";
        
        $script .= "// 404 for missing files\n";
        $script .= "http_response_code(404);\n";
        $script .= "echo '<h1>404 - File Not Found</h1>';\n";
        $script .= "echo '<p>The requested file was not found.</p>';\n";
        $script .= "echo '<a href=\"/\">Return to homepage</a>';\n";
        
        return $script;
    }

    /**
     * Generate batch script for Windows
     */
    private function generateBatchScript(): string
    {
        $script = "@echo off\n";
        $script .= "echo Starting development server...\n";
        $script .= "echo.\n";
        $script .= "echo Opening: http://localhost:8000\n";
        $script .= "echo Press Ctrl+C to stop the server\n";
        $script .= "echo.\n";
        $script .= "start http://localhost:8000\n";
        $script .= "php -S localhost:8000 server.php\n";
        $script .= "pause\n";
        
        return $script;
    }

    /**
     * Generate shell script for Unix/Mac
     */
    private function generateShellScript(): string
    {
        $script = "#!/bin/bash\n\n";
        $script .= "echo \"Starting development server...\"\n";
        $script .= "echo \"Opening: http://localhost:8000\"\n";
        $script .= "echo \"Press Ctrl+C to stop the server\"\n";
        $script .= "echo\n\n";
        
        $script .= "# Try to open browser (works on most systems)\n";
        $script .= "if command -v xdg-open > /dev/null; then\n";
        $script .= "    xdg-open http://localhost:8000\n";
        $script .= "elif command -v open > /dev/null; then\n";
        $script .= "    open http://localhost:8000\n";
        $script .= "fi\n\n";
        
        $script .= "# Start PHP server\n";
        $script .= "php -S localhost:8000 server.php\n";
        
        return $script;
    }

    /**
     * Generate API router for database operations
     */
    private function generateApiRouter(Project $project): string
    {
        if (!$this->databaseService->hasDatabase($project)) {
            return "<?php\nheader('Content-Type: application/json');\necho json_encode(['error' => 'No database available']);\n";
        }

        $script = "<?php\n";
        $script .= "// Simple API for {$project->name} database\n";
        $script .= "header('Content-Type: application/json');\n";
        $script .= "header('Access-Control-Allow-Origin: *');\n";
        $script .= "header('Access-Control-Allow-Methods: GET, POST, OPTIONS');\n";
        $script .= "header('Access-Control-Allow-Headers: Content-Type');\n\n";
        
        $script .= "if (\$_SERVER['REQUEST_METHOD'] === 'OPTIONS') {\n";
        $script .= "    exit(0);\n";
        $script .= "}\n\n";
        
        $script .= "try {\n";
        $script .= "    \$pdo = new PDO('sqlite:database/project.db');\n";
        $script .= "    \$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);\n\n";
        
        $script .= "    \$path = parse_url(\$_SERVER['REQUEST_URI'], PHP_URL_PATH);\n";
        $script .= "    \$path = str_replace('/api', '', \$path);\n\n";
        
        $script .= "    switch (\$path) {\n";
        $script .= "        case '/tables':\n";
        $script .= "            \$tables = \$pdo->query(\"SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'\")->fetchAll(PDO::FETCH_COLUMN);\n";
        $script .= "            echo json_encode(['tables' => \$tables]);\n";
        $script .= "            break;\n\n";
        
        $script .= "        case '/stats':\n";
        $script .= "            \$tables = \$pdo->query(\"SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'\")->fetchColumn();\n";
        $script .= "            \$size = filesize('database/project.db');\n";
        $script .= "            echo json_encode(['tables' => \$tables, 'size' => \$size]);\n";
        $script .= "            break;\n\n";
        
        $script .= "        default:\n";
        $script .= "            if (preg_match('/^\/table\/([a-zA-Z_]+)$/', \$path, \$matches)) {\n";
        $script .= "                \$table = \$matches[1];\n";
        $script .= "                \$limit = \$_GET['limit'] ?? 50;\n";
        $script .= "                \$offset = \$_GET['offset'] ?? 0;\n";
        $script .= "                \$data = \$pdo->query(\"SELECT * FROM {\$table} LIMIT {\$limit} OFFSET {\$offset}\")->fetchAll(PDO::FETCH_ASSOC);\n";
        $script .= "                \$total = \$pdo->query(\"SELECT COUNT(*) FROM {\$table}\")->fetchColumn();\n";
        $script .= "                echo json_encode(['data' => \$data, 'total' => \$total]);\n";
        $script .= "            } else {\n";
        $script .= "                http_response_code(404);\n";
        $script .= "                echo json_encode(['error' => 'Endpoint not found']);\n";
        $script .= "            }\n";
        $script .= "    }\n";
        $script .= "} catch (Exception \$e) {\n";
        $script .= "    http_response_code(500);\n";
        $script .= "    echo json_encode(['error' => \$e->getMessage()]);\n";
        $script .= "}\n";
        
        return $script;
    }

    /**
     * Generate database viewer HTML
     */
    private function generateDatabaseViewer(Project $project): string
    {
        if (!$this->databaseService->hasDatabase($project)) {
            return "<html><body><h1>No Database Available</h1><p>This project doesn't include a database.</p></body></html>";
        }

        $html = "<!DOCTYPE html>\n";
        $html .= "<html lang=\"en\">\n";
        $html .= "<head>\n";
        $html .= "    <meta charset=\"UTF-8\">\n";
        $html .= "    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n";
        $html .= "    <title>{$project->name} - Database Viewer</title>\n";
        $html .= "    <style>\n";
        $html .= "        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }\n";
        $html .= "        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }\n";
        $html .= "        .header { border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 20px; }\n";
        $html .= "        .nav { margin-bottom: 20px; }\n";
        $html .= "        .nav button { margin-right: 10px; padding: 8px 16px; border: 1px solid #ddd; background: #f8f9fa; cursor: pointer; border-radius: 4px; }\n";
        $html .= "        .nav button.active { background: #007bff; color: white; }\n";
        $html .= "        .section { display: none; }\n";
        $html .= "        .section.active { display: block; }\n";
        $html .= "        table { width: 100%; border-collapse: collapse; margin-top: 10px; }\n";
        $html .= "        th, td { padding: 8px 12px; border: 1px solid #ddd; text-align: left; }\n";
        $html .= "        th { background: #f8f9fa; font-weight: 600; }\n";
        $html .= "        tr:nth-child(even) { background: #f9f9f9; }\n";
        $html .= "        .loading { text-align: center; padding: 20px; color: #666; }\n";
        $html .= "        .error { color: #dc3545; background: #f8d7da; padding: 10px; border-radius: 4px; border: 1px solid #f5c6cb; }\n";
        $html .= "    </style>\n";
        $html .= "</head>\n";
        $html .= "<body>\n";
        $html .= "    <div class=\"container\">\n";
        $html .= "        <div class=\"header\">\n";
        $html .= "            <h1>{$project->name} Database</h1>\n";
        $html .= "            <p>Browse and manage your project's SQLite database</p>\n";
        $html .= "        </div>\n\n";
        
        $html .= "        <div class=\"nav\">\n";
        $html .= "            <button onclick=\"showSection('tables')\" class=\"nav-btn active\">Tables</button>\n";
        $html .= "            <button onclick=\"showSection('stats')\" class=\"nav-btn\">Statistics</button>\n";
        $html .= "            <a href=\"/\" style=\"float: right; text-decoration: none; color: #007bff;\">← Back to Website</a>\n";
        $html .= "        </div>\n\n";
        
        $html .= "        <div id=\"tables\" class=\"section active\">\n";
        $html .= "            <h3>Database Tables</h3>\n";
        $html .= "            <div id=\"tables-list\" class=\"loading\">Loading tables...</div>\n";
        $html .= "            <div id=\"table-data\"></div>\n";
        $html .= "        </div>\n\n";
        
        $html .= "        <div id=\"stats\" class=\"section\">\n";
        $html .= "            <h3>Database Statistics</h3>\n";
        $html .= "            <div id=\"stats-data\" class=\"loading\">Loading statistics...</div>\n";
        $html .= "        </div>\n";
        $html .= "    </div>\n\n";
        
        $html .= "    <script>\n";
        $html .= "        function showSection(sectionId) {\n";
        $html .= "            document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));\n";
        $html .= "            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));\n";
        $html .= "            document.getElementById(sectionId).classList.add('active');\n";
        $html .= "            event.target.classList.add('active');\n";
        $html .= "            if (sectionId === 'stats') loadStats();\n";
        $html .= "        }\n\n";
        
        $html .= "        function loadTables() {\n";
        $html .= "            fetch('/api/tables')\n";
        $html .= "                .then(r => r.json())\n";
        $html .= "                .then(data => {\n";
        $html .= "                    const html = data.tables.map(table => \n";
        $html .= "                        `<button onclick=\"loadTable('\${table}')\" style=\"margin: 5px; padding: 8px 12px; border: 1px solid #ddd; background: #f8f9fa; cursor: pointer; border-radius: 4px;\">\${table}</button>`\n";
        $html .= "                    ).join('');\n";
        $html .= "                    document.getElementById('tables-list').innerHTML = html || 'No tables found';\n";
        $html .= "                })\n";
        $html .= "                .catch(e => document.getElementById('tables-list').innerHTML = `<div class=\"error\">Error: \${e.message}</div>`);\n";
        $html .= "        }\n\n";
        
        $html .= "        function loadTable(tableName) {\n";
        $html .= "            document.getElementById('table-data').innerHTML = '<div class=\"loading\">Loading table data...</div>';\n";
        $html .= "            fetch(`/api/table/\${tableName}?limit=50`)\n";
        $html .= "                .then(r => r.json())\n";
        $html .= "                .then(data => {\n";
        $html .= "                    if (!data.data.length) {\n";
        $html .= "                        document.getElementById('table-data').innerHTML = `<h4>\${tableName}</h4><p>No data in this table</p>`;\n";
        $html .= "                        return;\n";
        $html .= "                    }\n";
        $html .= "                    const headers = Object.keys(data.data[0]);\n";
        $html .= "                    const headerRow = headers.map(h => `<th>\${h}</th>`).join('');\n";
        $html .= "                    const rows = data.data.map(row => \n";
        $html .= "                        `<tr>\${headers.map(h => `<td>\${row[h] || ''}</td>`).join('')}</tr>`\n";
        $html .= "                    ).join('');\n";
        $html .= "                    document.getElementById('table-data').innerHTML = \n";
        $html .= "                        `<h4>\${tableName} (\${data.total} total records)</h4><table><thead><tr>\${headerRow}</tr></thead><tbody>\${rows}</tbody></table>`;\n";
        $html .= "                })\n";
        $html .= "                .catch(e => document.getElementById('table-data').innerHTML = `<div class=\"error\">Error: \${e.message}</div>`);\n";
        $html .= "        }\n\n";
        
        $html .= "        function loadStats() {\n";
        $html .= "            fetch('/api/stats')\n";
        $html .= "                .then(r => r.json())\n";
        $html .= "                .then(data => {\n";
        $html .= "                    const size = (data.size / 1024).toFixed(2);\n";
        $html .= "                    document.getElementById('stats-data').innerHTML = \n";
        $html .= "                        `<p><strong>Tables:</strong> \${data.tables}</p><p><strong>Database Size:</strong> \${size} KB</p>`;\n";
        $html .= "                })\n";
        $html .= "                .catch(e => document.getElementById('stats-data').innerHTML = `<div class=\"error\">Error: \${e.message}</div>`);\n";
        $html .= "        }\n\n";
        
        $html .= "        // Load tables on page load\n";
        $html .= "        loadTables();\n";
        $html .= "    </script>\n";
        $html .= "</body>\n";
        $html .= "</html>\n";
        
        return $html;
    }

    /**
     * Generate package.json for Node.js users
     */
    private function generatePackageJson(Project $project): string
    {
        $package = [
            'name' => strtolower(str_replace(' ', '-', $project->name)),
            'version' => '1.0.0',
            'description' => "Exported project: {$project->name}",
            'scripts' => [
                'start' => 'php -S localhost:8000 server.php',
                'serve' => 'http-server -p 8000',
                'dev' => 'php -S localhost:8000 server.php'
            ],
            'devDependencies' => [
                'http-server' => '^14.0.0'
            ],
            'keywords' => ['webapp', 'php', 'sqlite'],
            'author' => 'Generated by App Builder',
            'license' => 'MIT'
        ];
        
        return json_encode($package, JSON_PRETTY_PRINT);
    }

    /**
     * Add authentication documentation if auth is enabled
     */
    private function addAuthDocumentation($zip, Project $project): void
    {
        $settings = $project->settings ?? [];
        $authEnabled = $settings['auth_enabled'] ?? false;
        
        if (!$authEnabled) {
            return;
        }
        
        // Generate authentication README
        $authReadme = $this->generateAuthReadme($project);
        $zip->addFile('AUTHENTICATION_README.md', $authReadme);
        
        // Generate API documentation for auth endpoints
        $authApiDocs = $this->generateAuthApiDocs($project);
        $zip->addFile('AUTH_API.md', $authApiDocs);
    }

    /**
     * Generate authentication documentation
     */
    private function generateAuthReadme(Project $project): string
    {
        $settings = $project->settings ?? [];
        $authFeatures = $settings['auth_features'] ?? [];
        
        $readme = "# Authentication System\n\n";
        $readme .= "This project includes a complete authentication system with the following features:\n\n";
        
        // List enabled features
        $featureDescriptions = [
            'password_reset' => '🔒 Password Reset - Users can reset forgotten passwords',
            'remember_me' => '💾 Remember Me - Stay logged in across sessions',
            'email_verification' => '✉️ Email Verification - Verify email addresses',
            'two_factor' => '🔐 Two-Factor Authentication - Extra security layer',
            'social_login' => '🌐 Social Login - Login with external providers'
        ];
        
        foreach ($authFeatures as $feature) {
            if (isset($featureDescriptions[$feature])) {
                $readme .= "- {$featureDescriptions[$feature]}\n";
            }
        }
        
        $readme .= "\n## Available Pages\n\n";
        $readme .= "- **login.html** - User login page\n";
        $readme .= "- **register.html** - User registration page\n";
        $readme .= "- **forgot-password.html** - Password reset request\n";
        $readme .= "- **dashboard.html** - User dashboard (protected)\n";
        $readme .= "- **profile.html** - User profile management (protected)\n\n";
        
        $readme .= "## Authentication Flow\n\n";
        $readme .= "1. **Registration**: Users create an account via `register.html`\n";
        $readme .= "2. **Login**: Users sign in via `login.html`\n";
        $readme .= "3. **Session**: Authenticated users access protected pages\n";
        $readme .= "4. **Logout**: Users can logout from any protected page\n\n";
        
        $readme .= "## Default Admin Account\n\n";
        $readme .= "If no users exist, you can create an admin account by:\n\n";
        $readme .= "1. Opening the **Database Viewer** (`database-viewer.html`)\n";
        $readme .= "2. Go to the **Users** table\n";
        $readme .= "3. Add a new record with:\n";
        $readme .= "   - **name**: Your Name\n";
        $readme .= "   - **email**: your@email.com\n";
        $readme .= "   - **password**: Use `password_hash('yourpassword', PASSWORD_DEFAULT)` in PHP\n";
        $readme .= "   - **is_active**: 1\n\n";
        
        $readme .= "## Security Features\n\n";
        $readme .= "- ✅ Password hashing with PHP's `password_hash()`\n";
        $readme .= "- ✅ Session management with regeneration\n";
        $readme .= "- ✅ CSRF protection via form validation\n";
        $readme .= "- ✅ SQL injection prevention with prepared statements\n";
        $readme .= "- ✅ Login attempt limiting\n";
        $readme .= "- ✅ Remember me functionality with secure tokens\n\n";
        
        $readme .= "## Database Tables\n\n";
        $readme .= "The authentication system uses these database tables:\n\n";
        $readme .= "### users\n";
        $readme .= "- **id** - Primary key\n";
        $readme .= "- **name** - User's full name\n";
        $readme .= "- **email** - Email address (unique)\n";
        $readme .= "- **password** - Hashed password\n";
        $readme .= "- **email_verified_at** - Email verification timestamp\n";
        $readme .= "- **remember_token** - Remember me token\n";
        $readme .= "- **is_active** - Account status\n";
        $readme .= "- **last_login** - Last login timestamp\n";
        $readme .= "- **login_attempts** - Failed login counter\n";
        $readme .= "- **locked_until** - Account lockout timestamp\n\n";
        
        $readme .= "### user_sessions\n";
        $readme .= "- **id** - Session ID\n";
        $readme .= "- **user_id** - Reference to user\n";
        $readme .= "- **ip_address** - User's IP\n";
        $readme .= "- **user_agent** - Browser information\n";
        $readme .= "- **last_activity** - Last activity timestamp\n\n";
        
        $readme .= "### password_resets\n";
        $readme .= "- **email** - User's email\n";
        $readme .= "- **token** - Reset token\n";
        $readme .= "- **expires_at** - Token expiration\n\n";
        
        $readme .= "## Customization\n\n";
        $readme .= "You can customize the authentication system by:\n\n";
        $readme .= "1. **Styling**: Modify the CSS in the auth pages\n";
        $readme .= "2. **Brand Colors**: Update the `--brand-color` CSS variable\n";
        $readme .= "3. **Pages**: Customize the HTML in auth pages\n";
        $readme .= "4. **Logic**: Modify `auth.php` for custom behavior\n";
        $readme .= "5. **Database**: Add custom fields to the users table\n\n";
        
        $readme .= "## Troubleshooting\n\n";
        $readme .= "- **Can't login**: Check if the user exists in the database\n";
        $readme .= "- **Redirected to login**: Sessions may have expired\n";
        $readme .= "- **Password issues**: Passwords are hashed, can't view plain text\n";
        $readme .= "- **Database errors**: Ensure SQLite extension is installed\n\n";
        
        return $readme;
    }

    /**
     * Generate authentication API documentation
     */
    private function generateAuthApiDocs(Project $project): string
    {
        $docs = "# Authentication API Reference\n\n";
        $docs .= "This document describes the authentication API endpoints available in your project.\n\n";
        
        $docs .= "## Base URL\n\n";
        $docs .= "```\nhttp://localhost:8000/auth.php\n```\n\n";
        
        $docs .= "## Endpoints\n\n";
        
        // Login endpoint
        $docs .= "### POST /auth.php?action=login\n\n";
        $docs .= "Authenticate a user with email and password.\n\n";
        $docs .= "**Parameters:**\n";
        $docs .= "- `email` (string, required) - User's email address\n";
        $docs .= "- `password` (string, required) - User's password\n";
        $docs .= "- `remember` (boolean, optional) - Remember user login\n\n";
        $docs .= "**Response:**\n";
        $docs .= "```json\n";
        $docs .= "{\n";
        $docs .= "  \"success\": true,\n";
        $docs .= "  \"message\": \"Login successful\"\n";
        $docs .= "}\n";
        $docs .= "```\n\n";
        
        // Register endpoint
        $docs .= "### POST /auth.php?action=register\n\n";
        $docs .= "Register a new user account.\n\n";
        $docs .= "**Parameters:**\n";
        $docs .= "- `name` (string, required) - User's full name\n";
        $docs .= "- `email` (string, required) - User's email address\n";
        $docs .= "- `password` (string, required) - User's password (min 6 chars)\n\n";
        $docs .= "**Response:**\n";
        $docs .= "```json\n";
        $docs .= "{\n";
        $docs .= "  \"success\": true,\n";
        $docs .= "  \"message\": \"Account created successfully\"\n";
        $docs .= "}\n";
        $docs .= "```\n\n";
        
        // Check session endpoint
        $docs .= "### GET /auth.php?action=check\n\n";
        $docs .= "Check if user is currently logged in.\n\n";
        $docs .= "**Response:**\n";
        $docs .= "```json\n";
        $docs .= "{\n";
        $docs .= "  \"logged_in\": true,\n";
        $docs .= "  \"user\": {\n";
        $docs .= "    \"id\": 1,\n";
        $docs .= "    \"name\": \"John Doe\",\n";
        $docs .= "    \"email\": \"john@example.com\"\n";
        $docs .= "  }\n";
        $docs .= "}\n";
        $docs .= "```\n\n";
        
        // Logout endpoint
        $docs .= "### POST /auth.php?action=logout\n\n";
        $docs .= "Log out the current user.\n\n";
        $docs .= "**Response:**\n";
        $docs .= "```json\n";
        $docs .= "{\n";
        $docs .= "  \"success\": true,\n";
        $docs .= "  \"message\": \"Logged out successfully\"\n";
        $docs .= "}\n";
        $docs .= "```\n\n";
        
        $docs .= "## Error Responses\n\n";
        $docs .= "All endpoints may return error responses in this format:\n\n";
        $docs .= "```json\n";
        $docs .= "{\n";
        $docs .= "  \"success\": false,\n";
        $docs .= "  \"message\": \"Error description\"\n";
        $docs .= "}\n";
        $docs .= "```\n\n";
        
        $docs .= "## Usage Examples\n\n";
        $docs .= "### JavaScript Login Example\n\n";
        $docs .= "```javascript\n";
        $docs .= "async function login(email, password) {\n";
        $docs .= "  const formData = new FormData();\n";
        $docs .= "  formData.append('email', email);\n";
        $docs .= "  formData.append('password', password);\n";
        $docs .= "  \n";
        $docs .= "  const response = await fetch('auth.php?action=login', {\n";
        $docs .= "    method: 'POST',\n";
        $docs .= "    body: formData\n";
        $docs .= "  });\n";
        $docs .= "  \n";
        $docs .= "  const result = await response.json();\n";
        $docs .= "  return result;\n";
        $docs .= "}\n";
        $docs .= "```\n\n";
        
        $docs .= "### Check Login Status\n\n";
        $docs .= "```javascript\n";
        $docs .= "async function checkLoginStatus() {\n";
        $docs .= "  const response = await fetch('auth.php?action=check');\n";
        $docs .= "  const result = await response.json();\n";
        $docs .= "  \n";
        $docs .= "  if (result.logged_in) {\n";
        $docs .= "    console.log('User is logged in:', result.user);\n";
        $docs .= "  } else {\n";
        $docs .= "    console.log('User is not logged in');\n";
        $docs .= "  }\n";
        $docs .= "}\n";
        $docs .= "```\n\n";
        
        return $docs;
    }
}
