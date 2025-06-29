<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Services\ProjectAutomationService;
use App\Services\ProjectDatabaseService;
use Common\Core\BaseController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class ProjectAutomationController extends BaseController
{
    public function __construct(
        protected ProjectAutomationService $automationService,
        protected Request $request
    ) {
    }

    /**
     * Get automation data for a project
     */
    public function index(Project $project)
    {
        $this->authorize('show', $project);

        $automationData = $this->automationService->getAutomationData($project);
        
        return $this->success([
            'automation' => $automationData
        ]);
    }

    /**
     * Save complete automation data
     */
    public function store(Project $project)
    {
        $this->authorize('update', $project);

        $data = $this->validate($this->request, [
            'automation.triggers' => 'array',
            'automation.triggers.*.type' => 'required|string',
            'automation.triggers.*.name' => 'required|string',
            'automation.triggers.*.elementId' => 'nullable|string',
            'automation.triggers.*.enabled' => 'boolean',
            'automation.dataSchema' => 'array',
            'automation.dataSchema.*.name' => 'required|string',
            'automation.dataSchema.*.displayName' => 'required|string',
            'automation.dataSchema.*.fields' => 'array',
            'automation.bindings' => 'array',
            'automation.bindings.*.elementId' => 'required|string',
            'automation.bindings.*.property' => 'required|string',
            'automation.bindings.*.dataSource' => 'required|string',
            'automation.bindings.*.field' => 'required|string',
            'automation.externalConnections' => 'array',
            'automation.externalConnections.*.type' => 'required|string|in:google_sheets,airtable,api',
            'automation.externalConnections.*.name' => 'required|string',
        ]);

        try {
            $this->automationService->saveAutomationData($project, $data['automation']);
            
            return $this->success([
                'message' => 'Automation data saved successfully',
                'automation' => $this->automationService->getAutomationData($project)
            ]);
        } catch (\Exception $e) {
            return $this->error('Failed to save automation data: ' . $e->getMessage());
        }
    }

    /**
     * Save a single trigger
     */
    public function saveTrigger(Project $project)
    {
        $this->authorize('update', $project);

        $data = $this->validate($this->request, [
            'id' => 'nullable|string',
            'type' => 'required|string',
            'name' => 'required|string',
            'elementId' => 'nullable|string',
            'conditions' => 'array',
            'actions' => 'array',
            'parameters' => 'array',
            'enabled' => 'boolean'
        ]);

        try {
            $trigger = $this->automationService->saveTrigger($project, $data);
            
            return $this->success([
                'message' => 'Trigger saved successfully',
                'trigger' => $trigger
            ]);
        } catch (\Exception $e) {
            return $this->error('Failed to save trigger: ' . $e->getMessage());
        }
    }

    /**
     * Save a data table schema
     */
    public function saveDataTable(Project $project)
    {
        $this->authorize('update', $project);

        $data = $this->validate($this->request, [
            'id' => 'nullable|string',
            'name' => 'required|string|regex:/^[a-zA-Z_][a-zA-Z0-9_]*$/',
            'displayName' => 'required|string',
            'description' => 'nullable|string',
            'fields' => 'required|array|min:1',
            'fields.*.name' => 'required|string|regex:/^[a-zA-Z_][a-zA-Z0-9_]*$/',
            'fields.*.type' => 'required|string|in:text,textarea,number,decimal,boolean,date,datetime,email,url,phone,select,multiselect,image,file,json,reference',
            'fields.*.required' => 'boolean',
            'fields.*.unique' => 'boolean',
            'fields.*.defaultValue' => 'nullable',
            'isSystem' => 'boolean'
        ]);

        try {
            // First ensure the project has a database
            if (!app(ProjectDatabaseService::class)->hasDatabase($project)) {
                app(ProjectDatabaseService::class)->createDatabase($project);
            }

            $table = $this->automationService->saveDataTable($project, $data);
            
            return $this->success([
                'message' => 'Data table saved successfully',
                'table' => $table
            ]);
        } catch (\Exception $e) {
            return $this->error('Failed to save data table: ' . $e->getMessage());
        }
    }

    /**
     * Save a data binding
     */
    public function saveDataBinding(Project $project)
    {
        $this->authorize('update', $project);

        $data = $this->validate($this->request, [
            'elementId' => 'required|string',
            'property' => 'required|string|in:textContent,innerHTML,src,href,value,class,style',
            'dataSource' => 'required|string',
            'field' => 'required|string',
            'template' => 'nullable|string',
            'query' => 'nullable|array'
        ]);

        try {
            $binding = $this->automationService->saveDataBinding($project, $data);
            
            return $this->success([
                'message' => 'Data binding saved successfully',
                'binding' => $binding
            ]);
        } catch (\Exception $e) {
            return $this->error('Failed to save data binding: ' . $e->getMessage());
        }
    }

    /**
     * Save external connection
     */
    public function saveExternalConnection(Project $project)
    {
        $this->authorize('update', $project);

        $data = $this->validate($this->request, [
            'type' => 'required|string|in:google_sheets,airtable,api',
            'name' => 'required|string',
            'url' => 'nullable|url',
            'apiKey' => 'nullable|string',
            'sheetId' => 'nullable|string',
            'baseId' => 'nullable|string',
            'tableId' => 'nullable|string',
            'mappings' => 'array',
            'autoSync' => 'boolean',
            'syncInterval' => 'integer|min:1|max:1440',
            'enabled' => 'boolean'
        ]);

        try {
            $connection = $this->automationService->saveExternalConnection($project, $data);
            
            return $this->success([
                'message' => 'External connection saved successfully',
                'connection' => $connection
            ]);
        } catch (\Exception $e) {
            return $this->error('Failed to save external connection: ' . $e->getMessage());
        }
    }

    /**
     * Get Google Sheets configuration
     */
    public function getGoogleSheetsConfig()
    {
        return $this->success([
            'config' => $this->automationService->getGoogleSheetsConfig()
        ]);
    }

    /**
     * Get Airtable configuration
     */
    public function getAirtableConfig()
    {
        return $this->success([
            'config' => $this->automationService->getAirtableConfig()
        ]);
    }

    /**
     * Test external connection
     */
    public function testConnection(Project $project)
    {
        $this->authorize('update', $project);

        $data = $this->validate($this->request, [
            'type' => 'required|string|in:google_sheets,airtable,api',
            'config' => 'required|array'
        ]);

        try {
            // Test connection based on type
            switch ($data['type']) {
                case 'google_sheets':
                    $result = $this->testGoogleSheetsConnection($data['config']);
                    break;
                case 'airtable':
                    $result = $this->testAirtableConnection($data['config']);
                    break;
                case 'api':
                    $result = $this->testApiConnection($data['config']);
                    break;
                default:
                    return $this->error('Unsupported connection type');
            }
            
            return $this->success([
                'message' => 'Connection test successful',
                'result' => $result
            ]);
        } catch (\Exception $e) {
            return $this->error('Connection test failed: ' . $e->getMessage());
        }
    }

    /**
     * Test Google Sheets connection
     */
    private function testGoogleSheetsConnection(array $config): array
    {
        $required = ['spreadsheetId', 'range', 'apiKey'];
        foreach ($required as $field) {
            if (empty($config[$field])) {
                throw new \Exception("Missing required field: $field");
            }
        }

        $url = "https://sheets.googleapis.com/v4/spreadsheets/{$config['spreadsheetId']}/values/{$config['range']}?key={$config['apiKey']}";
        
        $response = file_get_contents($url, false, stream_context_create([
            'http' => [
                'method' => 'GET',
                'header' => 'Accept: application/json'
            ]
        ]));

        if ($response === false) {
            throw new \Exception('Failed to connect to Google Sheets API');
        }

        $data = json_decode($response, true);
        
        if (isset($data['error'])) {
            throw new \Exception('Google Sheets API error: ' . $data['error']['message']);
        }

        return [
            'status' => 'success',
            'rowCount' => count($data['values'] ?? []),
            'columns' => $data['values'][0] ?? [],
            'sampleData' => array_slice($data['values'] ?? [], 0, 3)
        ];
    }

    /**
     * Test Airtable connection
     */
    private function testAirtableConnection(array $config): array
    {
        $required = ['baseId', 'tableId', 'apiKey'];
        foreach ($required as $field) {
            if (empty($config[$field])) {
                throw new \Exception("Missing required field: $field");
            }
        }

        $url = "https://api.airtable.com/v0/{$config['baseId']}/{$config['tableId']}?maxRecords=3";
        
        $context = stream_context_create([
            'http' => [
                'method' => 'GET',
                'header' => [
                    'Accept: application/json',
                    'Authorization: Bearer ' . $config['apiKey']
                ]
            ]
        ]);

        $response = file_get_contents($url, false, $context);

        if ($response === false) {
            throw new \Exception('Failed to connect to Airtable API');
        }

        $data = json_decode($response, true);
        
        if (isset($data['error'])) {
            throw new \Exception('Airtable API error: ' . $data['error']['message']);
        }

        return [
            'status' => 'success',
            'recordCount' => count($data['records'] ?? []),
            'fields' => !empty($data['records']) ? array_keys($data['records'][0]['fields']) : [],
            'sampleData' => array_slice($data['records'] ?? [], 0, 3)
        ];
    }

    /**
     * Test API connection
     */
    private function testApiConnection(array $config): array
    {
        $required = ['url'];
        foreach ($required as $field) {
            if (empty($config[$field])) {
                throw new \Exception("Missing required field: $field");
            }
        }

        $headers = ['Accept: application/json'];
        if (!empty($config['apiKey'])) {
            $headers[] = 'Authorization: Bearer ' . $config['apiKey'];
        }

        $context = stream_context_create([
            'http' => [
                'method' => 'GET',
                'header' => implode("\r\n", $headers)
            ]
        ]);

        $response = file_get_contents($config['url'], false, $context);

        if ($response === false) {
            throw new \Exception('Failed to connect to API endpoint');
        }

        $data = json_decode($response, true);
        
        return [
            'status' => 'success',
            'responseSize' => strlen($response),
            'isJson' => json_last_error() === JSON_ERROR_NONE,
            'sampleData' => is_array($data) ? array_slice($data, 0, 3) : $data
        ];
    }

    /**
     * Setup automation system in project database
     */
    public function setupDatabase(Project $project)
    {
        $this->authorize('update', $project);

        try {
            $this->automationService->setupAutomationInDatabase($project);
            
            return $this->success([
                'message' => 'Automation database setup completed'
            ]);
        } catch (\Exception $e) {
            return $this->error('Failed to setup automation database: ' . $e->getMessage());
        }
    }

    /**
     * Create table relationship
     */
    public function createRelationship(Project $project)
    {
        $this->authorize('update', $project);

        $data = $this->validate($this->request, [
            'type' => 'required|string|in:hasOne,hasMany,belongsTo,manyToMany',
            'fromTable' => 'required|string',
            'toTable' => 'required|string',
            'foreignKey' => 'nullable|string',
            'pivotTable' => 'nullable|string'
        ]);

        try {
            $relationship = $this->automationService->createTableRelationship($project, $data);
            
            return $this->success([
                'message' => 'Table relationship created successfully',
                'relationship' => $relationship
            ]);
        } catch (\Exception $e) {
            return $this->error('Failed to create relationship: ' . $e->getMessage());
        }
    }

    /**
     * Delete a data table
     */
    public function deleteDataTable(Project $project, string $tableId)
    {
        $this->authorize('update', $project);

        try {
            $deleted = $this->automationService->deleteDataTable($project, $tableId);
            
            if ($deleted) {
                return $this->success([
                    'message' => 'Data table deleted successfully'
                ]);
            } else {
                return $this->error('Table not found or could not be deleted');
            }
        } catch (\Exception $e) {
            return $this->error('Failed to delete data table: ' . $e->getMessage());
        }
    }

    /**
     * Get OAuth configuration for external integrations
     */
    public function getOAuthConfig(string $provider)
    {
        $configs = [
            'google_sheets' => [
                'authUrl' => 'https://accounts.google.com/oauth2/v2/auth',
                'clientId' => config('services.google.client_id'),
                'redirectUri' => url('/api/v1/oauth/google_sheets/callback'),
                'scopes' => ['https://www.googleapis.com/auth/spreadsheets'],
                'enabled' => !empty(config('services.google.client_id'))
            ],
            'airtable' => [
                'authUrl' => 'https://airtable.com/oauth2/v1/authorize',
                'clientId' => config('services.airtable.client_id'),
                'redirectUri' => url('/api/v1/oauth/airtable/callback'),
                'scopes' => ['data.records:read', 'data.records:write', 'schema.bases:read'],
                'enabled' => !empty(config('services.airtable.client_id'))
            ]
        ];

        if (!isset($configs[$provider])) {
            return $this->error('Unsupported OAuth provider');
        }

        $config = $configs[$provider];
        
        if (!$config['enabled']) {
            return $this->error('OAuth not configured for this provider. Please set up credentials in your .env file.');
        }

        return $this->success(['config' => $config]);
    }

    /**
     * Handle OAuth callback
     */
    public function handleOAuthCallback(string $provider)
    {
        $code = request('code');
        $state = request('state');
        
        if (!$code) {
            return $this->error('Authorization code not provided');
        }

        try {
            // Handle different providers
            switch ($provider) {
                case 'google_sheets':
                    $tokenData = $this->exchangeGoogleToken($code);
                    break;
                case 'airtable':
                    $tokenData = $this->exchangeAirtableToken($code);
                    break;
                default:
                    return $this->error('Unsupported provider');
            }

            // For now, just show success message
            // In production, you'd save the tokens securely
            return response()->view('oauth.success', [
                'provider' => $provider,
                'message' => 'Successfully connected to ' . ucfirst($provider)
            ]);

        } catch (\Exception $e) {
            return response()->view('oauth.error', [
                'provider' => $provider,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Exchange Google OAuth code for tokens
     */
    private function exchangeGoogleToken(string $code): array
    {
        $response = Http::post('https://oauth2.googleapis.com/token', [
            'client_id' => config('services.google.client_id'),
            'client_secret' => config('services.google.client_secret'),
            'code' => $code,
            'grant_type' => 'authorization_code',
            'redirect_uri' => url('/api/v1/oauth/google_sheets/callback'),
        ]);

        if (!$response->successful()) {
            throw new \Exception('Failed to exchange Google OAuth code: ' . $response->body());
        }

        return $response->json();
    }

    /**
     * Exchange Airtable OAuth code for tokens
     */
    private function exchangeAirtableToken(string $code): array
    {
        $response = Http::post('https://airtable.com/oauth2/v1/token', [
            'client_id' => config('services.airtable.client_id'),
            'client_secret' => config('services.airtable.client_secret'),
            'code' => $code,
            'grant_type' => 'authorization_code',
            'redirect_uri' => url('/api/v1/oauth/airtable/callback'),
        ]);

        if (!$response->successful()) {
            throw new \Exception('Failed to exchange Airtable OAuth code: ' . $response->body());
        }

        return $response->json();
    }
} 