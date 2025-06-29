import {useState} from 'react';
import {Trans} from '@common/i18n/trans';
import {Button} from '@common/ui/buttons/button';
import {TextField} from '@common/ui/forms/input-field/text-field/text-field';
import {IconButton} from '@common/ui/buttons/icon-button';
import {ArrowBackIcon} from '@common/icons/material/ArrowBack';
import {PlayArrowIcon} from '@common/icons/material/PlayArrow';
import {CheckIcon} from '@common/icons/material/Check';
import {ErrorIcon} from '@common/icons/material/Error';
import {Form} from '@common/ui/forms/form';
import {useForm} from 'react-hook-form';
import {ApiProvider, ApiEndpoint, ApiParameter} from './api-registry';

interface ApiConfiguratorProps {
  provider: ApiProvider;
  endpoint: ApiEndpoint;
  onBack: () => void;
  onSave: (configuration: any) => void;
}

interface TestResult {
  status: 'success' | 'error' | 'loading';
  response?: any;
  error?: string;
}

export function ApiConfigurator({provider, endpoint, onBack, onSave}: ApiConfiguratorProps) {
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [isTestPanelOpen, setIsTestPanelOpen] = useState(false);
  
  const form = useForm({
    defaultValues: getDefaultValues(endpoint.parameters),
  });

  const handleTest = async (values: any) => {
    setTestResult({status: 'loading'});
    setIsTestPanelOpen(true);

    try {
      // Mock API test - in real implementation, this would make actual API calls
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const mockResponse = getMockResponse(provider.id, endpoint.id);
      setTestResult({
        status: 'success',
        response: mockResponse
      });
    } catch (error) {
      setTestResult({
        status: 'error',
        error: 'Failed to connect to API. Please check your configuration.'
      });
    }
  };

  const handleSave = (values: any) => {
    onSave({
      providerId: provider.id,
      endpointId: endpoint.id,
      parameters: values,
      name: `${provider.name} - ${endpoint.name}`,
    });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-12 p-16 border-b">
        <IconButton size="sm" onClick={onBack}>
          <ArrowBackIcon />
        </IconButton>
        <div className="flex-1">
          <h3 className="font-semibold">Configure {endpoint.name}</h3>
          <p className="text-xs text-muted mt-4">
            Set up parameters and test your API connection
          </p>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Configuration Panel */}
        <div className="flex-1 p-16 overflow-auto">
          <Form form={form} onSubmit={handleSave}>
            <div className="space-y-16">
              {/* API Info */}
              <div className="p-12 rounded-lg bg-chip">
                <div className="flex items-center gap-12 mb-8">
                  <img 
                    src={provider.logo} 
                    alt={provider.name}
                    className="w-24 h-24 object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                  <div>
                    <h4 className="font-medium">{provider.name}</h4>
                    <p className="text-sm text-muted">{endpoint.name}</p>
                  </div>
                </div>
                <div className="text-xs space-y-4">
                  <div><strong>Method:</strong> {endpoint.method}</div>
                  <div><strong>URL:</strong> {endpoint.url}</div>
                  <div><strong>Response:</strong> {endpoint.responseFormat}</div>
                </div>
              </div>

              {/* Authentication */}
              {provider.authType !== 'none' && (
                <div className="space-y-8">
                  <h5 className="font-medium">
                    <Trans message="Authentication" />
                  </h5>
                  {provider.authType === 'apiKey' && (
                    <TextField
                      name="apiKey"
                      label={<Trans message="API Key" />}
                      type="password"
                      required
                      description={`Get your API key from ${provider.name} dashboard`}
                    />
                  )}
                  {provider.authType === 'oauth' && (
                    <div className="p-12 rounded border bg-orange-50">
                      <p className="text-sm">
                        OAuth authentication required. You'll be redirected to {provider.name} to authorize access.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Parameters */}
              <div className="space-y-8">
                <h5 className="font-medium">
                  <Trans message="Parameters" />
                </h5>
                {endpoint.parameters.map((param) => (
                  <ParameterField key={param.name} parameter={param} />
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-12 pt-16 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={form.handleSubmit(handleTest)}
                  startIcon={<PlayArrowIcon />}
                >
                  <Trans message="Test Connection" />
                </Button>
                <Button
                  type="submit"
                  variant="flat"
                  color="primary"
                  disabled={testResult?.status !== 'success'}
                >
                  <Trans message="Save & Connect" />
                </Button>
              </div>
            </div>
          </Form>
        </div>

        {/* Test Panel */}
        {isTestPanelOpen && (
          <div className="w-1/3 border-l bg-alt overflow-auto">
            <div className="p-16">
              <h5 className="font-medium mb-12">
                <Trans message="Test Results" />
              </h5>
              
              {testResult?.status === 'loading' && (
                <div className="flex items-center gap-8 text-muted">
                  <div className="w-16 h-16 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <Trans message="Testing connection..." />
                </div>
              )}
              
              {testResult?.status === 'success' && (
                <div className="space-y-12">
                  <div className="flex items-center gap-8 text-positive">
                    <CheckIcon size="sm" />
                    <Trans message="Connection successful!" />
                  </div>
                  <div>
                    <h6 className="text-sm font-medium mb-8">Response:</h6>
                    <pre className="text-xs bg-background p-12 rounded border overflow-auto max-h-200">
                      {JSON.stringify(testResult.response, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
              
              {testResult?.status === 'error' && (
                <div className="space-y-12">
                  <div className="flex items-center gap-8 text-danger">
                    <ErrorIcon size="sm" />
                    <Trans message="Connection failed" />
                  </div>
                  <p className="text-sm text-muted">{testResult.error}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ParameterField({parameter}: {parameter: ApiParameter}) {
  const getFieldType = () => {
    switch (parameter.type) {
      case 'number': return 'number';
      case 'boolean': return 'checkbox';
      default: return 'text';
    }
  };

  if (parameter.options) {
    return (
      <div className="space-y-4">
        <label className="text-sm font-medium">
          {parameter.name}
          {parameter.required && <span className="text-danger ml-4">*</span>}
        </label>
        <select
          name={parameter.name}
          className="w-full px-12 py-8 rounded border bg-background"
          required={parameter.required}
          defaultValue={parameter.defaultValue}
        >
          {!parameter.required && <option value="">Select an option</option>}
          {parameter.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted">{parameter.description}</p>
      </div>
    );
  }

  return (
    <TextField
      name={parameter.name}
      label={parameter.name}
      type={getFieldType()}
      required={parameter.required}
      defaultValue={parameter.defaultValue}
      description={parameter.description}
    />
  );
}

function getDefaultValues(parameters: ApiParameter[]) {
  const defaults: Record<string, any> = {};
  parameters.forEach(param => {
    if (param.defaultValue !== undefined) {
      defaults[param.name] = param.defaultValue;
    }
  });
  return defaults;
}

function getMockResponse(providerId: string, endpointId: string) {
  // Mock responses for different APIs
  const responses: Record<string, Record<string, any>> = {
    openai: {
      'chat-completion': {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        choices: [{
          message: {
            role: 'assistant',
            content: 'Hello! How can I help you today?'
          }
        }]
      },
      'text-to-speech': {
        audio_url: 'https://api.openai.com/v1/audio/speech/abc123'
      }
    },
    quotable: {
      'random-quote': {
        content: 'The only way to do great work is to love what you do.',
        author: 'Steve Jobs',
        tags: ['inspirational', 'motivational']
      }
    },
    openweather: {
      'current-weather': {
        main: {
          temp: 22.5,
          humidity: 60
        },
        weather: [{
          main: 'Clear',
          description: 'clear sky'
        }],
        name: 'London'
      }
    }
  };

  return responses[providerId]?.[endpointId] || {
    success: true,
    message: 'API connection successful'
  };
} 