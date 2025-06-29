import {Fragment, useState} from 'react';
import {Trans} from '@common/i18n/trans';
import {Button} from '@common/ui/buttons/button';
import {TextField} from '@common/ui/forms/input-field/text-field/text-field';
import {Select} from '@common/ui/forms/select/select';
import {IconButton} from '@common/ui/buttons/icon-button';
import {ArrowBackIcon} from '@common/icons/material/ArrowBack';
import {SearchIcon} from '@common/icons/material/Search';
import {OpenInNewIcon} from '@common/icons/material/OpenInNew';
import {CloudIcon} from '@common/icons/material/Cloud';
import {SmartToyIcon} from '@common/icons/material/SmartToy';
import {EmailIcon} from '@common/icons/material/Email';
import {StorageIcon} from '@common/icons/material/Storage';
import {FreeBreakfastIcon} from '@common/icons/material/FreeBreakfast';
import {WorkIcon} from '@common/icons/material/Work';
import {
  ApiProvider,
  ApiEndpoint,
  ApiRegistry,
  getProvidersByCategory,
  getProviderById
} from './api-registry';

interface ApiBrowserProps {
  onEndpointSelect: (provider: ApiProvider, endpoint: ApiEndpoint) => void;
  onBack: () => void;
}

type BrowserView = 'categories' | 'providers' | 'endpoints' | 'configure';

export function ApiBrowser({onEndpointSelect, onBack}: ApiBrowserProps) {
  const [view, setView] = useState<BrowserView>('categories');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedProvider, setSelectedProvider] = useState<ApiProvider | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    {id: 'ai', name: 'AI & Machine Learning', icon: <SmartToyIcon />, color: 'text-purple-500'},
    {id: 'communication', name: 'Communication', icon: <EmailIcon />, color: 'text-blue-500'},
    {id: 'data', name: 'Data & Storage', icon: <StorageIcon />, color: 'text-green-500'},
    {id: 'free', name: 'Free APIs', icon: <FreeBreakfastIcon />, color: 'text-orange-500'},
    {id: 'productivity', name: 'Productivity', icon: <WorkIcon />, color: 'text-indigo-500'}
  ];

  const filteredProviders = selectedCategory 
    ? getProvidersByCategory(selectedCategory).filter(provider =>
        provider.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        provider.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setView('providers');
  };

  const handleProviderSelect = (provider: ApiProvider) => {
    setSelectedProvider(provider);
    setView('endpoints');
  };

  const handleBack = () => {
    if (view === 'providers') {
      setView('categories');
      setSelectedCategory('');
    } else if (view === 'endpoints') {
      setView('providers');
      setSelectedProvider(null);
    } else {
      onBack();
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-12 p-16 border-b">
        <IconButton size="sm" onClick={handleBack}>
          <ArrowBackIcon />
        </IconButton>
        <div className="flex-1">
          <h3 className="font-semibold">
            {view === 'categories' && <Trans message="API Integrations" />}
            {view === 'providers' && (
              <Trans message="{{category}} APIs" values={{
                category: categories.find(c => c.id === selectedCategory)?.name
              }} />
            )}
            {view === 'endpoints' && selectedProvider?.name}
          </h3>
          {view !== 'categories' && (
            <p className="text-xs text-muted mt-4">
              {view === 'providers' && <Trans message="Choose an API provider to integrate" />}
              {view === 'endpoints' && <Trans message="Select an endpoint to configure" />}
            </p>
          )}
        </div>
      </div>

      {/* Search (for providers view) */}
      {view === 'providers' && (
        <div className="p-16 border-b">
          <TextField
            size="sm"
            placeholder="Search APIs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            startAdornment={<SearchIcon size="sm" />}
          />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto p-16">
        {view === 'categories' && (
          <CategoryGrid categories={categories} onSelect={handleCategorySelect} />
        )}
        
        {view === 'providers' && (
          <ProviderGrid providers={filteredProviders} onSelect={handleProviderSelect} />
        )}
        
        {view === 'endpoints' && selectedProvider && (
          <EndpointList 
            provider={selectedProvider} 
            onSelect={(endpoint) => onEndpointSelect(selectedProvider, endpoint)}
          />
        )}
      </div>
    </div>
  );
}

function CategoryGrid({categories, onSelect}: {
  categories: any[];
  onSelect: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-12">
      {categories.map(category => (
        <button
          key={category.id}
          onClick={() => onSelect(category.id)}
          className="flex items-center gap-16 p-16 rounded-lg border hover:bg-hover transition-colors text-left"
        >
          <div className={`text-2xl ${category.color}`}>
            {category.icon}
          </div>
          <div className="flex-1">
            <div className="font-medium">{category.name}</div>
            <div className="text-sm text-muted">
              {getProvidersByCategory(category.id).length} providers available
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

function ProviderGrid({providers, onSelect}: {
  providers: ApiProvider[];
  onSelect: (provider: ApiProvider) => void;
}) {
  if (providers.length === 0) {
    return (
      <div className="text-center py-32">
        <CloudIcon className="mx-auto text-muted mb-16" size="xl" />
        <p className="text-muted">
          <Trans message="No APIs found matching your search" />
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-12">
      {providers.map(provider => (
        <button
          key={provider.id}
          onClick={() => onSelect(provider)}
          className="flex items-start gap-16 p-16 rounded-lg border hover:bg-hover transition-colors text-left"
        >
          <div className="w-48 h-48 rounded-lg bg-chip flex items-center justify-center flex-shrink-0">
            <img 
              src={provider.logo} 
              alt={provider.name}
              className="w-32 h-32 object-contain"
              onError={(e) => {
                // Fallback to text if logo fails to load
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.nextElementSibling?.removeAttribute('hidden');
              }}
            />
            <span className="text-xs font-bold text-muted hidden">
              {provider.name.slice(0, 2).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-8 mb-4">
              <h4 className="font-semibold">{provider.name}</h4>
              {provider.authType === 'none' && (
                <span className="px-6 py-2 bg-positive/10 text-positive text-xs rounded-full">
                  Free
                </span>
              )}
            </div>
            <p className="text-sm text-muted mb-8">{provider.description}</p>
            <div className="flex items-center gap-16 text-xs text-muted">
              <span>{provider.endpoints.length} endpoints</span>
              {provider.website && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(provider.website, '_blank');
                  }}
                  className="flex items-center gap-4 hover:text-primary"
                >
                  <OpenInNewIcon size="xs" />
                  Website
                </button>
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

function EndpointList({provider, onSelect}: {
  provider: ApiProvider;
  onSelect: (endpoint: ApiEndpoint) => void;
}) {
  return (
    <div className="space-y-12">
      <div className="flex items-start gap-16 p-16 rounded-lg bg-chip">
        <div className="w-48 h-48 rounded-lg bg-background flex items-center justify-center flex-shrink-0">
          <img 
            src={provider.logo} 
            alt={provider.name}
            className="w-32 h-32 object-contain"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              target.nextElementSibling?.removeAttribute('hidden');
            }}
          />
          <span className="text-xs font-bold text-muted hidden">
            {provider.name.slice(0, 2).toUpperCase()}
          </span>
        </div>
        <div className="flex-1">
          <h4 className="font-semibold mb-4">{provider.name}</h4>
          <p className="text-sm text-muted mb-8">{provider.description}</p>
          {provider.documentation && (
            <Button
              size="xs"
              variant="outline"
              onClick={() => window.open(provider.documentation, '_blank')}
              endIcon={<OpenInNewIcon />}
            >
              <Trans message="Documentation" />
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-8">
        <h5 className="font-medium">
          <Trans message="Available Endpoints" />
        </h5>
        {provider.endpoints.map(endpoint => (
          <button
            key={endpoint.id}
            onClick={() => onSelect(endpoint)}
            className="w-full flex items-start gap-12 p-12 rounded-lg border hover:bg-hover transition-colors text-left"
          >
            <div className={`px-6 py-2 rounded text-xs font-medium ${
              endpoint.method === 'GET' ? 'bg-blue-100 text-blue-700' :
              endpoint.method === 'POST' ? 'bg-green-100 text-green-700' :
              endpoint.method === 'PUT' ? 'bg-orange-100 text-orange-700' :
              'bg-red-100 text-red-700'
            }`}>
              {endpoint.method}
            </div>
            <div className="flex-1">
              <h6 className="font-medium mb-4">{endpoint.name}</h6>
              <p className="text-sm text-muted">{endpoint.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
} 