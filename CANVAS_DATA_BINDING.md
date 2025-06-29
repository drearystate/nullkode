# Canvas Data Binding System

This system allows you to populate form components on your canvas with data from your project's SQLite database. It provides automatic field mapping, data population rules, and real-time testing capabilities.

## Features

### 1. **Canvas Data Binding Service**
Located in `resources/client/editor/data-management/canvas-data-binding.ts`

- **Automatic Element Detection**: Scans canvas for form elements (input, select, textarea)
- **Smart Field Mapping**: Automatically matches element names to database field names
- **Population Rules**: Define how and when elements should be populated
- **Data Templates**: Support for template strings with placeholders like `{{field_name}}`
- **Multiple Record Selection**: Choose first, last, random, or conditional records
- **Real-time Population**: Apply data bindings instantly to see changes

### 2. **Canvas Binding Panel UI**
Located in `resources/client/editor/editor-sidebar/data-panel/canvas-binding-panel.tsx`

- **Element Scanning**: Detects all form elements on the canvas
- **Auto-Binding**: One-click binding to database tables
- **Rule Management**: Create, edit, and delete population rules
- **Test Mode**: Preview how data will populate elements
- **Visual Feedback**: Shows binding status and element counts

### 3. **Database Integration**
Enhanced `app/Http/Controllers/ProjectDatabaseController.php`

- **Sample Data Generation**: Creates realistic sample data based on field types and names
- **Canvas Population API**: `/api/projects/{project}/database/populate-canvas`
- **Smart Data Types**: Recognizes email, phone, name fields for appropriate sample data
- **Schema Analysis**: Uses table structure to generate meaningful test data

## How It Works

### 1. **Element Detection**
The system scans your canvas for form elements and identifies them by:
- `data-element-id` attributes
- `name` attributes
- `id` attributes
- Element types (input, select, textarea)

### 2. **Field Matching**
Elements are automatically matched to database fields using:
- Exact name matches
- Display name matches
- Partial name matches (case-insensitive)

### 3. **Data Population**
When triggered, the system:
1. Fetches data from the specified SQLite table
2. Applies any filtering conditions
3. Selects records based on the population rule
4. Maps field values to appropriate element properties
5. Updates the DOM elements with the data

## Usage Instructions

### 1. **Add Form Elements to Canvas**
Create form elements with appropriate `name` attributes that match your database field names:

```html
<input type="text" name="first_name" data-element-id="input-1">
<input type="email" name="email" data-element-id="input-2">
<select name="status" data-element-id="select-1">
```

### 2. **Scan for Elements**
1. Open the Data Panel in the editor sidebar
2. Navigate to "Canvas Data Binding" section
3. Click "Scan Elements" to detect form elements

### 3. **Create Auto-Bindings**
1. In the "Quick Auto-Bind" section
2. Click "Auto-bind to [Table Name]" for your desired table
3. The system automatically creates bindings based on field names

### 4. **Test Population**
1. Click "Test" on any population rule
2. Elements will be populated with sample data
3. Verify the bindings work correctly

## API Endpoints

### **POST** `/api/projects/{project}/database/populate-canvas`

Populates canvas elements with database data.

**Parameters:**
- `table` (required): Name of the database table
- `limit` (optional): Number of records to fetch (default: 1)

**Response:**
```json
{
  "data": {
    "table": "users",
    "data": [
      {
        "id": 1,
        "first_name": "Sample First Name 1",
        "email": "sample1@example.com",
        "phone": "+1-555-0001"
      }
    ],
    "count": 1
  }
}
```

## Configuration Options

### Population Rules
```typescript
interface PopulationRule {
  id: string;
  name: string;
  description?: string;
  tableSource: string; // Database table name
  recordSelection: 'first' | 'last' | 'random' | 'conditional';
  conditions?: DataCondition[]; // Filtering conditions
  bindings: CanvasElementBinding[]; // Element-to-field mappings
  isEnabled: boolean;
}
```

### Element Bindings
```typescript
interface CanvasElementBinding {
  elementId: string; // Canvas element ID
  elementType: string; // input, select, textarea, etc.
  property: string; // value, textContent, innerHTML, etc.
  dataSource: string; // Table name
  field: string; // Database field name
  template?: string; // Template with {{placeholders}}
  conditions?: DataCondition[]; // Field-specific conditions
  defaultValue?: any; // Fallback value
  isActive: boolean; // Enable/disable binding
}
```

## Sample Data Generation

The system automatically generates realistic sample data based on:

### Field Name Patterns
- `email` → `sample1@example.com`
- `name`, `first_name`, `last_name` → `Sample First Name 1`
- `phone` → `+1-555-0001`
- `id` → Sequential numbers

### Data Types
- `INTEGER/DECIMAL` → Random numbers (1-1000)
- `BOOLEAN` → Random true/false
- `DATE/DATETIME` → Current timestamp
- `TEXT/VARCHAR` → Sample text with field name

## Integration with Automation System

The canvas data binding system integrates with the existing automation system:

1. **Export Integration**: Bindings are included in project exports
2. **Database Sync**: Works with the project's SQLite database
3. **Automation Scripts**: Generated scripts include binding logic
4. **Template Support**: Uses the same template processing engine

## Best Practices

### 1. **Naming Conventions**
- Use descriptive `name` attributes that match database fields
- Keep field names consistent between frontend and database
- Use snake_case for database fields, the system handles conversion

### 2. **Element Organization**
- Group related form elements together
- Use semantic HTML structure
- Include proper labels for accessibility

### 3. **Testing**
- Always test bindings before finalizing
- Verify data types match expected formats
- Check that all required fields are properly bound

### 4. **Performance**
- Limit the number of bindings per rule for better performance
- Use conditions to filter data appropriately
- Consider using pagination for large datasets

## Troubleshooting

### Elements Not Detected
- Ensure elements have `name` or `data-element-id` attributes
- Click "Scan Elements" after adding new form elements
- Check that elements are in the canvas iframe

### Bindings Not Working
- Verify field names match database schema
- Check that the database table exists and has data
- Ensure the population rule is enabled

### Data Not Populating
- Test with the "Test" button first
- Check browser console for JavaScript errors
- Verify database connectivity and permissions

## Future Enhancements

1. **Advanced Conditions**: More complex filtering options
2. **Data Transformation**: Built-in data formatting functions
3. **Real-time Sync**: Live updates from database changes
4. **Validation Integration**: Automatic form validation based on database constraints
5. **Multiple Table Joins**: Support for complex data relationships

This system provides a powerful foundation for creating dynamic, data-driven forms that automatically populate with your project's database content. 