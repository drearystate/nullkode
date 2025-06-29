# Element Development Guide

This guide provides complete instructions for creating custom elements in the Architect platform, including technical requirements, best practices, and examples.

## Table of Contents
1. [Element System Overview](#element-system-overview)
2. [Element Structure](#element-structure)
3. [Development Process](#development-process)
4. [Element Class Definition](#element-class-definition)
5. [Styling Guidelines](#styling-guidelines)
6. [JavaScript Functionality](#javascript-functionality)
7. [Icon Configuration](#icon-configuration)
8. [Categories and Organization](#categories-and-organization)
9. [Games and Modules (HTML Files)](#games-and-modules-html-files)
10. [Testing Elements](#testing-elements)
11. [Examples](#examples)
12. [Best Practices](#best-practices)

## Element System Overview

The Architect platform uses a modular element system where custom components are:
- **CORRECT APPROACH**: Stored in `resources/client/editor/elements/definitions/` as `.tsx` files
- Exported through `resources/client/editor/elements/definitions/all.ts`
- Compiled during the build process with all other components
- Integrated into the editor's drag-and-drop interface

**IMPORTANT**: Do NOT put custom elements in `public/builder/elements/` - this was the old/incorrect approach that caused visibility issues.

### System Architecture
```
definitions/*.tsx → TypeScript element definitions
↓
definitions/all.ts → Exports all elements
↓
elements.ts → Manages element lifecycle
↓
elements-panel.tsx → Displays elements in editor
↓
Editor Canvas → Renders and manipulates elements
```

## Element Structure

Every custom element must be a TypeScript React file (`.tsx`) with the following structure:

```typescript
import {ArchitectElement} from '../architect-element';
import {hasClass} from '../../utils/has-class';
import {IconComponent} from '@common/icons/material/IconName';

const template = `<div class="my-component">
  <!-- HTML structure here -->
</div>`;

const style = `.my-component {
  /* CSS styles here */
}`;

export class MyComponentEl extends ArchitectElement {
  name = 'My Component';
  contentCategories = ['flow'];
  html = template;
  css = style;
  allowedContent = ['flow'];
  category = 'components';
  icon = (<IconComponent />);
  specificity = 3;
  hiddenClasses = ['my-component'];
  matcher(node: HTMLElement) {
    return hasClass(node, 'my-component');
  }
}
```

### File Naming Convention
- Use kebab-case for files: `team-member.tsx`, `pricing-table.tsx`
- Use PascalCase for class names: `TeamMemberEl`, `PricingTableEl`
- Be descriptive: `testimonial-slider.tsx` not `slider.tsx`
- Always end class names with `El`: `CardEl`, `StatsCounterEl`
- Avoid conflicts with existing elements

## Development Process

### 1. Create Element File
Create your element in `resources/client/editor/elements/definitions/`:
```bash
touch resources/client/editor/elements/definitions/my-component.tsx
```

### 2. Define the Component
```typescript
import {ArchitectElement} from '../architect-element';
import {hasClass} from '../../utils/has-class';
import {YourIcon} from '@common/icons/material/YourIcon';

const template = `<div class="my-component">
  <div class="component-content">
    <!-- Your HTML structure -->
  </div>
</div>`;

const style = `.my-component {
  /* Container styles */
}

.my-component .component-content {
  /* Content styles */
}

/* Always use scoped CSS with your main class */`;

export class MyComponentEl extends ArchitectElement {
  name = 'My Component';
  contentCategories = ['flow'];
  html = template;
  css = style;
  allowedContent = ['flow'];
  category = 'components';
  icon = (<YourIcon />);
  specificity = 3;
  hiddenClasses = ['my-component'];
  
  matcher(node: HTMLElement) {
    return hasClass(node, 'my-component');
  }
}
```

### 3. Export the Component
Add your component to `resources/client/editor/elements/definitions/all.ts`:
```typescript
export {MyComponentEl} from './my-component';
```

### 4. Build the Application
**CRITICAL**: After creating/modifying components, you MUST rebuild the application:
```bash
# Set up Node.js environment (if needed)
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Build the application
npx vite build
```

### 5. Clear Browser Cache
After rebuilding, clear your browser cache or hard refresh (Ctrl+F5 / Cmd+Shift+R) to see the new components.

### 6. Test and Iterate
1. Check the Elements panel for your component
2. Verify it appears in the correct category
3. Drag component to canvas
4. Test functionality and styling
5. If changes needed, modify the file and repeat steps 4-6

## Element Class Definition

### Required Properties

#### `name` (string)
Display name in the elements panel
```javascript
name = 'Card Component';
```

#### `matcher(node)` (function)
Determines if a DOM node matches this element
```javascript
matcher(node) {
  return node.classList.contains('card-component');
}
```

### Common Properties

#### `category` (string)
Organizes elements in the panel
```javascript
category = 'components'; // or 'media', 'typography', etc.
```

#### `contentCategories` (array)
Defines content model compatibility
```javascript
contentCategories = ['flow']; // Most common
// Other options: ['phrasing', 'embedded', 'interactive']
```

#### `allowedContent` (array)
What content can be placed inside
```javascript
allowedContent = ['flow']; // Allows other elements
allowedContent = []; // No child elements allowed
```

#### `icon` (array)
SVG icon for the elements panel
```javascript
icon = [
  {
    tag: 'path',
    attr: {
      d: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z'
    }
  }
];
```

#### `specificity` (number)
Higher numbers = higher priority in matching
```javascript
specificity = 3; // Good for custom components
```

#### `hiddenClasses` (array)
CSS classes hidden from the editor
```javascript
hiddenClasses = ['my-component', 'internal-class'];
```

### Advanced Properties

#### `controls` (array)
Custom editor controls
```javascript
controls = [
  new ArchitectElControl({
    label: 'Style',
    type: ElementControlType.Select,
    options: [
      {key: 'Default', value: 'style-default'},
      {key: 'Minimal', value: 'style-minimal'}
    ],
    defaultValue(node) {
      return node.classList.contains('style-minimal') ? 'style-minimal' : 'style-default';
    },
    onChange(node, value) {
      // Apply style change
    }
  })
];
```

#### `canEdit` (array)
Available editor panels
```javascript
canEdit = [
  ElementEditableProp.Settings,
  ElementEditableProp.Padding,
  ElementEditableProp.Margin,
  ElementEditableProp.Border,
  ElementEditableProp.Shadow,
  ElementEditableProp.Background
];
```

## Styling Guidelines

### CSS Scoping
Always scope styles to prevent conflicts:
```css
.my-component {
  /* Base styles */
}

.my-component .child-element {
  /* Child styles */
}

/* NEVER use global selectors like: */
/* div { } */
/* .btn { } */
```

### Responsive Design
Include mobile-first responsive styles:
```css
.my-component {
  /* Base mobile styles */
}

@media (min-width: 768px) {
  .my-component {
    /* Tablet styles */
  }
}

@media (min-width: 1024px) {
  .my-component {
    /* Desktop styles */
  }
}
```

### Modern CSS Features
Use modern CSS for better performance:
```css
.my-component {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  
  /* Flexbox for alignment */
  display: flex;
  align-items: center;
  justify-content: space-between;
  
  /* CSS Custom Properties */
  --primary-color: #0d6efd;
  --border-radius: 8px;
  
  /* Modern transitions */
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
```

### Hover and Interactive States
Include hover effects for better UX:
```css
.my-component .interactive-element {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.my-component .interactive-element:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}
```

## JavaScript Functionality

### Simple Components
For static components, only the class definition is needed:
```javascript
export class SimpleCard extends ArchitectElement {
  name = 'Simple Card';
  // ... other properties
}
```

### Interactive Components
For interactive features, add functionality:
```javascript
export class InteractiveSlider extends ArchitectElement {
  name = 'Interactive Slider';
  // ... other properties
}

// Global functions for component interaction
window.nextSlide = function(button) {
  const slider = button.closest('.slider-component');
  // Implementation
};

window.prevSlide = function(button) {
  const slider = button.closest('.slider-component');
  // Implementation
};
```

### Initialization Functions
For components requiring setup:
```javascript
function initializeComponent() {
  const components = document.querySelectorAll('.my-component');
  
  components.forEach(component => {
    // Setup event listeners
    // Initialize animations
    // Configure options
  });
}

// Auto-initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeComponent);
} else {
  initializeComponent();
}

// Export for manual initialization
window.initializeMyComponent = initializeComponent;
```

### Intersection Observer Pattern
For scroll-triggered animations:
```javascript
function initScrollAnimations() {
  const animatedElements = document.querySelectorAll('.animate-on-scroll');
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animated');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });
  
  animatedElements.forEach(el => observer.observe(el));
}
```

## Icon Configuration

### Material Icons (Recommended)
Use pre-built Material Design icons from the common library:
```typescript
import {CreditCardIcon} from '@common/icons/material/CreditCard';
import {PersonIcon} from '@common/icons/material/Person';
import {BarChartIcon} from '@common/icons/material/BarChart';

// In your component class
icon = (<CreditCardIcon />);
```

### Available Material Icons
Some commonly used icons for components:
- `CreditCardIcon` - For card components
- `PersonIcon` - For team/profile components  
- `BarChartIcon` - For statistics/charts
- `FormatQuoteIcon` - For testimonials
- `AttachMoneyIcon` - For pricing tables
- `ImageIcon` - For image components
- `ViewModuleIcon` - For grid layouts

### Legacy SVG Path Icons (Not Recommended)
If you must use custom SVG paths:
```typescript
icon = [
  {
    tag: 'path',
    attr: {
      d: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'
    }
  }
];
```

### Finding Icons
- Use Material Design Icons: https://material.io/icons/
- Get SVG path from icon libraries
- Use icon conversion tools
- Create custom SVG paths

## Categories and Organization

### Standard Categories
- `components` - Interactive UI components
- `media` - Images, videos, audio
- `typography` - Text elements
- `layout` - Grid, containers, spacers
- `forms` - Form inputs and controls
- `navigation` - Menus, breadcrumbs

**Note**: Games and modules are NOT TypeScript element categories. They must be standalone .html files.

### Advanced Categories
- `modules` - **NOTE: Modules must be standalone .html files, not TypeScript elements**
- `games` - **NOTE: Games must be standalone .html files, not TypeScript elements**

### Custom Categories
Create new categories for specialized elements:
```javascript
category = 'e-commerce'; // For shopping components
category = 'marketing'; // For landing page elements
category = 'social'; // For social media components
// NOTE: Do NOT create TypeScript elements for modules or games
// Modules and games must be standalone .html files in appropriate directories
```

### Games and Modules (Special Case)
**IMPORTANT**: Games and modules are handled differently from other elements:

- **Games**: Must be standalone `.html` files placed in `public/games/`
- **Modules**: Must be standalone `.html` files placed in `public/modules/` or similar directory
- **DO NOT** create TypeScript element definitions (`.tsx` files) for games or modules
- **DO NOT** export games or modules in `all.ts`

These are complete, self-contained applications that run independently, not editor elements.

## Games and Modules (HTML Files)

### Overview
Games and modules are fundamentally different from TypeScript elements. They are standalone HTML applications that run independently of the editor system.

### Key Differences

#### TypeScript Elements vs HTML Files
| TypeScript Elements (.tsx) | Games & Modules (.html) |
|---------------------------|-------------------------|
| Built into editor system | Standalone applications |
| Drag-and-drop components | Complete self-contained files |
| Part of build process | No build process needed |
| Exported in `all.ts` | Direct file access |
| Editor integration | Independent execution |

### Games Structure
```
public/games/
├── game-name.html          ← Complete game in single file
├── another-game.html       ← Another complete game
└── README.md              ← Optional documentation
```

### Modules Structure
```
public/modules/
├── calculator.html         ← Complete calculator app
├── converter.html          ← Complete converter app
└── README.md              ← Optional documentation
```

### HTML File Requirements

#### Games (.html files)
- **Location**: `public/games/`
- **Naming**: `game-name.html` (kebab-case)
- **Content**: Complete HTML document with embedded CSS and JavaScript
- **Independence**: Must work without external dependencies
- **Responsive**: Should work on mobile and desktop

#### Modules (.html files)
- **Location**: `public/modules/` (or appropriate directory)
- **Naming**: `module-name.html` (kebab-case)
- **Content**: Complete HTML document with embedded CSS and JavaScript
- **Independence**: Must work without external dependencies
- **Functionality**: Should provide useful tools or utilities

### Example Game Structure
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Game Name</title>
    <style>
        /* All CSS embedded here */
        body {
            margin: 0;
            padding: 0;
            background: #000;
            color: #fff;
            font-family: Arial, sans-serif;
        }
        
        #game-container {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
        }
        
        canvas {
            border: 2px solid #fff;
            background: #222;
        }
    </style>
</head>
<body>
    <div id="game-container">
        <canvas id="gameCanvas" width="800" height="600"></canvas>
    </div>
    
    <script>
        // All JavaScript embedded here
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        
        // Game logic here...
        function gameLoop() {
            // Game loop implementation
            requestAnimationFrame(gameLoop);
        }
        
        // Start game
        gameLoop();
    </script>
</body>
</html>
```

### Example Module Structure
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Calculator Module</title>
    <style>
        /* All CSS embedded here */
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            max-width: 400px;
            margin: 50px auto;
            padding: 20px;
            background: #f5f5f5;
        }
        
        .calculator {
            background: white;
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        
        .display {
            width: 100%;
            height: 60px;
            font-size: 24px;
            text-align: right;
            padding: 10px;
            margin-bottom: 20px;
            border: 1px solid #ddd;
            border-radius: 5px;
        }
        
        .buttons {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
        }
        
        button {
            height: 50px;
            font-size: 18px;
            border: none;
            border-radius: 5px;
            background: #e9ecef;
            cursor: pointer;
            transition: background 0.2s;
        }
        
        button:hover {
            background: #dee2e6;
        }
        
        button.operator {
            background: #007bff;
            color: white;
        }
        
        button.operator:hover {
            background: #0056b3;
        }
    </style>
</head>
<body>
    <div class="calculator">
        <input type="text" class="display" id="display" readonly>
        <div class="buttons">
            <button onclick="clearDisplay()">C</button>
            <button onclick="deleteLast()">⌫</button>
            <button onclick="appendToDisplay('/')" class="operator">÷</button>
            <button onclick="appendToDisplay('*')" class="operator">×</button>
            
            <button onclick="appendToDisplay('7')">7</button>
            <button onclick="appendToDisplay('8')">8</button>
            <button onclick="appendToDisplay('9')">9</button>
            <button onclick="appendToDisplay('-')" class="operator">-</button>
            
            <button onclick="appendToDisplay('4')">4</button>
            <button onclick="appendToDisplay('5')">5</button>
            <button onclick="appendToDisplay('6')">6</button>
            <button onclick="appendToDisplay('+')" class="operator">+</button>
            
            <button onclick="appendToDisplay('1')">1</button>
            <button onclick="appendToDisplay('2')">2</button>
            <button onclick="appendToDisplay('3')">3</button>
            <button onclick="calculate()" class="operator" style="grid-row: span 2;">=</button>
            
            <button onclick="appendToDisplay('0')" style="grid-column: span 2;">0</button>
            <button onclick="appendToDisplay('.')">.</button>
        </div>
    </div>

    <script>
        // All JavaScript embedded here
        const display = document.getElementById('display');
        
        function appendToDisplay(value) {
            display.value += value;
        }
        
        function clearDisplay() {
            display.value = '';
        }
        
        function deleteLast() {
            display.value = display.value.slice(0, -1);
        }
        
        function calculate() {
            try {
                // Replace display symbols with actual operators
                let expression = display.value.replace(/×/g, '*').replace(/÷/g, '/');
                let result = eval(expression);
                display.value = result;
            } catch (error) {
                display.value = 'Error';
            }
        }
        
        // Allow keyboard input
        document.addEventListener('keydown', function(event) {
            const key = event.key;
            
            if (key >= '0' && key <= '9' || key === '.') {
                appendToDisplay(key);
            } else if (key === '+' || key === '-') {
                appendToDisplay(key);
            } else if (key === '*') {
                appendToDisplay('*');
            } else if (key === '/') {
                event.preventDefault();
                appendToDisplay('/');
            } else if (key === 'Enter' || key === '=') {
                calculate();
            } else if (key === 'Escape' || key === 'c' || key === 'C') {
                clearDisplay();
            } else if (key === 'Backspace') {
                deleteLast();
            }
        });
    </script>
</body>
</html>
```

### Best Practices for HTML Games & Modules

#### Development Guidelines
1. **Self-Contained**: Everything (HTML, CSS, JavaScript) in one file
2. **No External Dependencies**: Don't rely on external libraries or frameworks
3. **Responsive Design**: Work on both mobile and desktop
4. **Error Handling**: Include proper error handling for edge cases
5. **Performance**: Optimize for smooth performance
6. **Accessibility**: Include keyboard navigation and screen reader support

#### File Organization
1. **Clear Naming**: Use descriptive, kebab-case filenames
2. **Documentation**: Add comments explaining complex logic
3. **Version Control**: Track changes and maintain backwards compatibility
4. **Testing**: Test across different browsers and devices

#### Security Considerations
1. **Input Validation**: Validate all user inputs
2. **XSS Prevention**: Sanitize any dynamic content
3. **Safe Defaults**: Use secure default configurations

### Deployment Process

#### For Games
1. Create complete `.html` file in `public/games/`
2. Test functionality in browser
3. Verify responsive design
4. No build process required
5. Access directly via `/games/filename.html`

#### For Modules  
1. Create complete `.html` file in `public/modules/`
2. Test functionality across browsers
3. Verify all features work correctly
4. No build process required
5. Access directly via `/modules/filename.html`

### Common Mistakes to Avoid

#### ❌ DON'T
- Create `.tsx` files for games or modules
- Export games/modules in `all.ts`
- Try to integrate games/modules into the TypeScript build system
- Use external dependencies that require build processes
- Split HTML, CSS, and JavaScript into separate files

#### ✅ DO
- Create single, complete `.html` files
- Embed all CSS and JavaScript inline
- Test as standalone applications
- Make them responsive and accessible
- Focus on performance and user experience

## Testing Elements

### Development Testing
1. **File Creation**: Verify file is in `resources/client/editor/elements/definitions/`
2. **Export Check**: Ensure component is exported in `all.ts`
3. **Build Process**: Run `npx vite build` successfully
4. **Browser Cache**: Clear cache after rebuilding
5. **Syntax Check**: Ensure valid TypeScript, HTML, and CSS
6. **Editor Loading**: Check Elements panel shows component
7. **Drag and Drop**: Test element can be placed on canvas
8. **Visual Rendering**: Verify appearance matches design
9. **Responsiveness**: Test on different screen sizes

### Functionality Testing
1. **Interactive Features**: Test all buttons, animations, hover effects
2. **Editor Integration**: Ensure element works within editor environment
3. **Browser Compatibility**: Test in Chrome, Firefox, Safari
4. **Performance**: Check for smooth animations and fast loading

### Testing Checklist
- [ ] File created in correct location (`resources/client/editor/elements/definitions/`)
- [ ] Component exported in `all.ts`
- [ ] Build process completes successfully
- [ ] Browser cache cleared after build
- [ ] Element appears in correct category
- [ ] Icon displays properly
- [ ] Drag and drop works
- [ ] Styles are scoped correctly
- [ ] TypeScript compiles without errors
- [ ] Responsive design works
- [ ] Hover effects function
- [ ] No console errors
- [ ] Performance is acceptable

## Examples

### 1. Card Component
```typescript
import {ArchitectElement} from '../architect-element';
import {hasClass} from '../../utils/has-class';
import {CreditCardIcon} from '@common/icons/material/CreditCard';

const template = `<div class="card-component">
  <div class="card">
    <img src="/images/builder/placeholder.svg" class="card-img-top" alt="Card image">
    <div class="card-body">
      <h5 class="card-title">Card Title</h5>
      <p class="card-text">Description text goes here.</p>
      <a href="#" class="btn btn-primary">Action</a>
    </div>
  </div>
</div>`;

const style = `.card-component .card {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  overflow: hidden;
  transition: transform 0.2s ease;
}

.card-component .card:hover {
  transform: translateY(-2px);
}`;

export class CardEl extends ArchitectElement {
  name = 'Card';
  contentCategories = ['flow'];
  html = template;
  css = style;
  allowedContent = ['flow'];
  category = 'components';
  icon = (<CreditCardIcon />);
  specificity = 3;
  hiddenClasses = ['card-component'];
  matcher(node: HTMLElement) {
    return hasClass(node, 'card-component');
  }
}
```

### 2. Interactive Counter
```html
<template>
<div class="counter-component">
  <div class="counter-display" data-target="100">0</div>
  <div class="counter-label">Items Completed</div>
</div>
</template>

<style>
.counter-component {
  text-align: center;
  padding: 20px;
}

.counter-component .counter-display {
  font-size: 48px;
  font-weight: bold;
  color: #0d6efd;
}
</style>

<script>
export class CounterComponent extends ArchitectElement {
  name = 'Counter';
  category = 'components';
  icon = [{tag: 'path', attr: {d: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z'}}];
  hiddenClasses = ['counter-component'];
  matcher(node) { return node.classList.contains('counter-component'); }
}

function animateCounters() {
  const counters = document.querySelectorAll('.counter-display');
  counters.forEach(counter => {
    const target = parseInt(counter.dataset.target);
    const increment = target / 50;
    let current = 0;
    
    const updateCounter = () => {
      if (current < target) {
        current += increment;
        counter.textContent = Math.ceil(current);
        requestAnimationFrame(updateCounter);
      } else {
        counter.textContent = target;
      }
    };
    
    updateCounter();
  });
}

// Initialize when needed
window.animateCounters = animateCounters;
</script>
```

## Best Practices

### Performance
- **Optimize CSS**: Use efficient selectors, avoid deep nesting
- **Minimize JavaScript**: Only include necessary functionality
- **Image Optimization**: Use appropriate formats and sizes
- **Animation Performance**: Use `transform` and `opacity` for smooth animations

### Maintainability
- **Consistent Naming**: Use clear, descriptive class names
- **Documentation**: Comment complex CSS and JavaScript
- **Modular Design**: Create reusable, self-contained components
- **Version Control**: Track changes and maintain backwards compatibility

### User Experience
- **Accessibility**: Include ARIA attributes, keyboard navigation
- **Loading States**: Show feedback during interactions
- **Error Handling**: Gracefully handle edge cases
- **Mobile First**: Design for mobile, enhance for desktop

### Code Quality
- **Clean Code**: Use consistent formatting and structure
- **Error Prevention**: Validate inputs and handle edge cases
- **Testing**: Test across browsers and devices
- **Standards Compliance**: Follow web standards and best practices

### Security
- **XSS Prevention**: Sanitize any dynamic content
- **Input Validation**: Validate all user inputs
- **Safe Defaults**: Use secure default configurations
- **Dependencies**: Avoid unnecessary external dependencies

## Build Process & Troubleshooting

### Common Issues

#### Components Not Showing After Creation
If your new components don't appear in the Elements panel:

1. **Check File Location**: Ensure files are in `resources/client/editor/elements/definitions/` NOT `public/builder/elements/`
2. **Verify Export**: Make sure component is exported in `all.ts`
3. **Rebuild Application**: Run `npx vite build` - this is REQUIRED for changes to take effect
4. **Clear Browser Cache**: Hard refresh (Ctrl+F5 / Cmd+Shift+R) after rebuilding
5. **Check Console**: Look for TypeScript compilation errors

#### Build Errors
Common build issues and solutions:

**Node.js Version Issues**: 
- Use Node.js 16 or 18: `nvm install 16 && nvm use 16`
- Avoid very old (14) or very new (19+) versions

**Permission Errors**:
```bash
chmod -R 755 public/build/
rm -rf public/build/assets/*
```

**Missing Dependencies**:
```bash
npm install
```

### Build Commands

```bash
# Set Node version (if using nvm)
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Full build (recommended)
npx vite build

# Development mode (for testing)
npm run dev

# Clear build cache (if needed)
rm -rf public/build/assets/*
npx vite build
```

### Cache Clearing (Required After Adding Elements)

After adding new elements, you MUST clear both application and browser caches:

```bash
# Clear Laravel application caches (required)
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear

# Clear browser cache (CRITICAL!)
# Method 1: Hard refresh
# - Windows/Linux: Ctrl + F5
# - Mac: Cmd + Shift + R

# Method 2: Developer Tools
# - F12 → Network tab → right-click Reload → "Empty Cache and Hard Reload"

# Method 3: Incognito/Private browsing (for testing)
```

**⚠️ IMPORTANT**: Browser cache clearing is absolutely critical! New elements won't appear without it, even after successful builds.

### Deployment Checklist

1. [ ] Component files created in correct location (`resources/client/editor/elements/definitions/`)
2. [ ] Components exported in `all.ts`
3. [ ] Build completes without errors (`npx vite build`)
4. [ ] Assets generated in `public/build/assets/`
5. [ ] Laravel caches cleared (`php artisan cache:clear` etc.)
6. [ ] Browser cache cleared (CRITICAL - hard refresh)
7. [ ] Components visible in Elements panel
8. [ ] Components function correctly on canvas

---

This guide provides everything needed to create professional, functional elements for the Architect platform. Follow these guidelines to ensure your elements integrate seamlessly with the system and provide excellent user experiences.

**Remember**: The key difference from older approaches is that components must be built into the application bundle, not loaded dynamically. Always rebuild after making changes! 