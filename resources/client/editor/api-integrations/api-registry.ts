export interface ApiProvider {
  id: string;
  name: string;
  description: string;
  logo: string;
  category: 'ai' | 'communication' | 'data' | 'free' | 'productivity';
  authType: 'apiKey' | 'oauth' | 'none';
  endpoints: ApiEndpoint[];
  documentation?: string;
  website?: string;
}

export interface ApiEndpoint {
  id: string;
  name: string;
  description: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  url: string;
  parameters: ApiParameter[];
  responseFormat: 'json' | 'text' | 'xml';
  example?: any;
}

export interface ApiParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  description: string;
  defaultValue?: any;
  options?: string[]; // for enum-like parameters
}

export interface ApiConnection {
  id: string;
  providerId: string;
  endpointId: string;
  name: string;
  configuration: Record<string, any>;
  authentication?: Record<string, any>;
  elementId?: string; // which element this is connected to
}

// API Registry with initial providers
export const ApiRegistry: ApiProvider[] = [
  // AI Category
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'Advanced AI models for chat, completion, and more',
    logo: '/images/api-logos/openai.png',
    category: 'ai',
    authType: 'apiKey',
    website: 'https://openai.com',
    documentation: 'https://platform.openai.com/docs',
    endpoints: [
      {
        id: 'chat-completion',
        name: 'Chat Completion',
        description: 'Generate conversational responses using GPT models',
        method: 'POST',
        url: 'https://api.openai.com/v1/chat/completions',
        responseFormat: 'json',
        parameters: [
          {
            name: 'model',
            type: 'string',
            required: true,
            description: 'The model to use',
            defaultValue: 'gpt-3.5-turbo',
            options: ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo']
          },
          {
            name: 'messages',
            type: 'array',
            required: true,
            description: 'List of messages for the conversation'
          },
          {
            name: 'max_tokens',
            type: 'number',
            required: false,
            description: 'Maximum number of tokens to generate',
            defaultValue: 150
          },
          {
            name: 'temperature',
            type: 'number',
            required: false,
            description: 'Creativity level (0-2)',
            defaultValue: 0.7
          }
        ]
      },
      {
        id: 'text-to-speech',
        name: 'Text to Speech',
        description: 'Convert text to natural speech',
        method: 'POST',
        url: 'https://api.openai.com/v1/audio/speech',
        responseFormat: 'text',
        parameters: [
          {
            name: 'model',
            type: 'string',
            required: true,
            description: 'TTS model to use',
            defaultValue: 'tts-1',
            options: ['tts-1', 'tts-1-hd']
          },
          {
            name: 'input',
            type: 'string',
            required: true,
            description: 'Text to convert to speech'
          },
          {
            name: 'voice',
            type: 'string',
            required: true,
            description: 'Voice to use',
            defaultValue: 'alloy',
            options: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']
          }
        ]
      }
    ]
  },
  // Communication Category
  {
    id: 'twilio',
    name: 'Twilio',
    description: 'SMS, voice, and video communication APIs',
    logo: '/images/api-logos/twilio.png',
    category: 'communication',
    authType: 'apiKey',
    website: 'https://twilio.com',
    documentation: 'https://www.twilio.com/docs',
    endpoints: [
      {
        id: 'send-sms',
        name: 'Send SMS',
        description: 'Send text messages to phone numbers',
        method: 'POST',
        url: 'https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Messages.json',
        responseFormat: 'json',
        parameters: [
          {
            name: 'To',
            type: 'string',
            required: true,
            description: 'Phone number to send to'
          },
          {
            name: 'From',
            type: 'string',
            required: true,
            description: 'Your Twilio phone number'
          },
          {
            name: 'Body',
            type: 'string',
            required: true,
            description: 'Message content'
          }
        ]
      }
    ]
  },
  {
    id: 'sendgrid',
    name: 'SendGrid',
    description: 'Email delivery and marketing platform',
    logo: '/images/api-logos/sendgrid.png',
    category: 'communication',
    authType: 'apiKey',
    website: 'https://sendgrid.com',
    documentation: 'https://docs.sendgrid.com',
    endpoints: [
      {
        id: 'send-email',
        name: 'Send Email',
        description: 'Send transactional emails',
        method: 'POST',
        url: 'https://api.sendgrid.com/v3/mail/send',
        responseFormat: 'json',
        parameters: [
          {
            name: 'to',
            type: 'string',
            required: true,
            description: 'Recipient email address'
          },
          {
            name: 'from',
            type: 'string',
            required: true,
            description: 'Sender email address'
          },
          {
            name: 'subject',
            type: 'string',
            required: true,
            description: 'Email subject'
          },
          {
            name: 'content',
            type: 'string',
            required: true,
            description: 'Email content'
          }
        ]
      }
    ]
  },
  // Data Category
  {
    id: 'google-sheets',
    name: 'Google Sheets',
    description: 'Read and write data to Google Spreadsheets',
    logo: '/images/api-logos/google-sheets.png',
    category: 'data',
    authType: 'oauth',
    website: 'https://sheets.google.com',
    documentation: 'https://developers.google.com/sheets/api',
    endpoints: [
      {
        id: 'append-row',
        name: 'Append Row',
        description: 'Add a new row to a spreadsheet',
        method: 'POST',
        url: 'https://sheets.googleapis.com/v4/spreadsheets/{spreadsheetId}/values/{range}:append',
        responseFormat: 'json',
        parameters: [
          {
            name: 'spreadsheetId',
            type: 'string',
            required: true,
            description: 'ID of the spreadsheet'
          },
          {
            name: 'range',
            type: 'string',
            required: true,
            description: 'Range to append to (e.g., Sheet1!A1)',
            defaultValue: 'Sheet1!A1'
          },
          {
            name: 'values',
            type: 'array',
            required: true,
            description: 'Array of values to append'
          }
        ]
      }
    ]
  },
  {
    id: 'nhtsa',
    name: 'NHTSA Vehicle API',
    description: 'Vehicle information and safety data',
    logo: '/images/api-logos/nhtsa.png',
    category: 'data',
    authType: 'none',
    website: 'https://vpic.nhtsa.dot.gov',
    documentation: 'https://vpic.nhtsa.dot.gov/api/',
    endpoints: [
      {
        id: 'decode-vin',
        name: 'Decode VIN',
        description: 'Get vehicle information from VIN number',
        method: 'GET',
        url: 'https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/{vin}',
        responseFormat: 'json',
        parameters: [
          {
            name: 'vin',
            type: 'string',
            required: true,
            description: '17-character VIN number'
          }
        ]
      }
    ]
  },
  // Free APIs Category
  {
    id: 'openweather',
    name: 'OpenWeatherMap',
    description: 'Weather data and forecasts',
    logo: '/images/api-logos/openweather.png',
    category: 'free',
    authType: 'apiKey',
    website: 'https://openweathermap.org',
    documentation: 'https://openweathermap.org/api',
    endpoints: [
      {
        id: 'current-weather',
        name: 'Current Weather',
        description: 'Get current weather for a location',
        method: 'GET',
        url: 'https://api.openweathermap.org/data/2.5/weather',
        responseFormat: 'json',
        parameters: [
          {
            name: 'q',
            type: 'string',
            required: true,
            description: 'City name (e.g., London,UK)'
          },
          {
            name: 'units',
            type: 'string',
            required: false,
            description: 'Temperature units',
            defaultValue: 'metric',
            options: ['metric', 'imperial', 'kelvin']
          }
        ]
      }
    ]
  },
  {
    id: 'quotable',
    name: 'Quotable',
    description: 'Inspirational quotes and sayings',
    logo: '/images/api-logos/quotable.png',
    category: 'free',
    authType: 'none',
    website: 'https://quotable.io',
    documentation: 'https://github.com/lukePeavey/quotable',
    endpoints: [
      {
        id: 'random-quote',
        name: 'Random Quote',
        description: 'Get a random inspirational quote',
        method: 'GET',
        url: 'https://api.quotable.io/random',
        responseFormat: 'json',
        parameters: [
          {
            name: 'minLength',
            type: 'number',
            required: false,
            description: 'Minimum quote length'
          },
          {
            name: 'maxLength',
            type: 'number',
            required: false,
            description: 'Maximum quote length'
          },
          {
            name: 'tags',
            type: 'string',
            required: false,
            description: 'Quote categories (comma-separated)'
          }
        ]
      }
    ]
  },
  {
    id: 'exchangerate',
    name: 'Exchange Rate API',
    description: 'Currency exchange rates',
    logo: '/images/api-logos/exchangerate.png',
    category: 'free',
    authType: 'none',
    website: 'https://exchangerate-api.com',
    documentation: 'https://www.exchangerate-api.com/docs',
    endpoints: [
      {
        id: 'latest-rates',
        name: 'Latest Rates',
        description: 'Get latest currency exchange rates',
        method: 'GET',
        url: 'https://api.exchangerate-api.com/v4/latest/{base}',
        responseFormat: 'json',
        parameters: [
          {
            name: 'base',
            type: 'string',
            required: true,
            description: 'Base currency code',
            defaultValue: 'USD',
            options: ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD']
          }
        ]
      }
    ]
  },
  {
    id: 'qrserver',
    name: 'QR Server',
    description: 'Generate QR codes',
    logo: '/images/api-logos/qrserver.png',
    category: 'free',
    authType: 'none',
    website: 'https://qr-server.com',
    documentation: 'https://qr-server.com/api/',
    endpoints: [
      {
        id: 'generate-qr',
        name: 'Generate QR Code',
        description: 'Create QR codes from text',
        method: 'GET',
        url: 'https://api.qrserver.com/v1/create-qr-code/',
        responseFormat: 'text',
        parameters: [
          {
            name: 'data',
            type: 'string',
            required: true,
            description: 'Text to encode in QR code'
          },
          {
            name: 'size',
            type: 'string',
            required: false,
            description: 'QR code size (e.g., 200x200)',
            defaultValue: '200x200'
          }
        ]
      }
    ]
  }
];

// Helper functions
export function getProvidersByCategory(category: string): ApiProvider[] {
  return ApiRegistry.filter(provider => provider.category === category);
}

export function getProviderById(id: string): ApiProvider | undefined {
  return ApiRegistry.find(provider => provider.id === id);
}

export function getEndpointById(providerId: string, endpointId: string): ApiEndpoint | undefined {
  const provider = getProviderById(providerId);
  return provider?.endpoints.find(endpoint => endpoint.id === endpointId);
} 