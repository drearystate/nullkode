import {ArchitectElement} from '../architect-element';
import {hasClass} from '../../utils/has-class';
import {HighlightIcon} from '@common/icons/material/Highlight';

const template = `<div class="text-highlighter">
  <div class="highlight-container">
    <div class="highlight-header">
      <h3>Text Highlighting Examples</h3>
      <p>Multiple styles to emphasize important content</p>
    </div>
    
    <div class="highlight-examples">
      <div class="highlight-item">
        <p class="highlight-text">
          This is a paragraph with <span class="highlight-yellow">yellow highlighted text</span> that draws attention to key information.
        </p>
      </div>
      
      <div class="highlight-item">
        <p class="highlight-text">
          You can also use <span class="highlight-blue">blue highlighting</span> for links or secondary information that needs emphasis.
        </p>
      </div>
      
      <div class="highlight-item">
        <p class="highlight-text">
          For warnings or important notes, <span class="highlight-red">red highlighting</span> is perfect to catch the reader's attention.
        </p>
      </div>
      
      <div class="highlight-item">
        <p class="highlight-text">
          Success messages or positive information can use <span class="highlight-green">green highlighting</span> to convey the right tone.
        </p>
      </div>
      
      <div class="highlight-item">
        <p class="highlight-text">
          For subtle emphasis, <span class="highlight-gray">gray highlighting</span> provides a professional, understated look.
        </p>
      </div>
      
      <div class="highlight-item">
        <p class="highlight-text">
          Creative projects might benefit from <span class="highlight-purple">purple highlighting</span> to add personality and flair.
        </p>
      </div>
    </div>
    
    <div class="highlight-styles-demo">
      <h4>Available Highlighting Styles</h4>
      <div class="styles-grid">
        <div class="style-sample">
          <span class="highlight-marker highlight-yellow">Yellow</span>
          <p>Default highlighting</p>
        </div>
        <div class="style-sample">
          <span class="highlight-marker highlight-blue">Blue</span>
          <p>Information & links</p>
        </div>
        <div class="style-sample">
          <span class="highlight-marker highlight-red">Red</span>
          <p>Warnings & alerts</p>
        </div>
        <div class="style-sample">
          <span class="highlight-marker highlight-green">Green</span>
          <p>Success & positive</p>
        </div>
        <div class="style-sample">
          <span class="highlight-marker highlight-gray">Gray</span>
          <p>Subtle emphasis</p>
        </div>
        <div class="style-sample">
          <span class="highlight-marker highlight-purple">Purple</span>
          <p>Creative & unique</p>
        </div>
      </div>
    </div>
    
    <div class="highlight-advanced">
      <h4>Advanced Highlighting Techniques</h4>
      <div class="advanced-examples">
        <div class="example-box">
          <h5>Gradient Highlight</h5>
          <p>Text with <span class="highlight-gradient">beautiful gradient highlighting</span> for modern designs.</p>
        </div>
        <div class="example-box">
          <h5>Animated Highlight</h5>
          <p>Text with <span class="highlight-animated">animated highlighting effect</span> that pulses gently.</p>
        </div>
        <div class="example-box">
          <h5>Underline Highlight</h5>
          <p>Text with <span class="highlight-underline">stylish underline highlighting</span> for elegant emphasis.</p>
        </div>
      </div>
    </div>
  </div>
</div>`;

const style = `.text-highlighter {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: #f8f9fa;
  padding: 30px;
  border-radius: 15px;
  max-width: 900px;
  margin: 0 auto;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

.text-highlighter .highlight-container {
  background: white;
  border-radius: 12px;
  padding: 30px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
}

.text-highlighter .highlight-header {
  text-align: center;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid #e9ecef;
}

.text-highlighter .highlight-header h3 {
  margin: 0 0 10px 0;
  font-size: 28px;
  font-weight: 700;
  color: #2c3e50;
}

.text-highlighter .highlight-header p {
  margin: 0;
  font-size: 16px;
  color: #6c757d;
}

.text-highlighter .highlight-examples {
  margin-bottom: 35px;
}

.text-highlighter .highlight-item {
  margin-bottom: 20px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #007bff;
}

.text-highlighter .highlight-text {
  margin: 0;
  font-size: 16px;
  line-height: 1.6;
  color: #495057;
}

/* Basic Highlight Styles */
.text-highlighter .highlight-yellow {
  background: linear-gradient(120deg, #fff59d 0%, #fff59d 100%);
  background-size: 100% 0.4em;
  background-repeat: no-repeat;
  background-position: 0 88%;
  padding: 2px 4px;
  border-radius: 3px;
  transition: all 0.3s ease;
}

.text-highlighter .highlight-yellow:hover {
  background-size: 100% 100%;
  color: #333;
}

.text-highlighter .highlight-blue {
  background: linear-gradient(120deg, #81d4fa 0%, #81d4fa 100%);
  background-size: 100% 0.4em;
  background-repeat: no-repeat;
  background-position: 0 88%;
  padding: 2px 4px;
  border-radius: 3px;
  transition: all 0.3s ease;
}

.text-highlighter .highlight-blue:hover {
  background-size: 100% 100%;
  color: #0d47a1;
}

.text-highlighter .highlight-red {
  background: linear-gradient(120deg, #ffab91 0%, #ffab91 100%);
  background-size: 100% 0.4em;
  background-repeat: no-repeat;
  background-position: 0 88%;
  padding: 2px 4px;
  border-radius: 3px;
  transition: all 0.3s ease;
}

.text-highlighter .highlight-red:hover {
  background-size: 100% 100%;
  color: #b71c1c;
}

.text-highlighter .highlight-green {
  background: linear-gradient(120deg, #a5d6a7 0%, #a5d6a7 100%);
  background-size: 100% 0.4em;
  background-repeat: no-repeat;
  background-position: 0 88%;
  padding: 2px 4px;
  border-radius: 3px;
  transition: all 0.3s ease;
}

.text-highlighter .highlight-green:hover {
  background-size: 100% 100%;
  color: #1b5e20;
}

.text-highlighter .highlight-gray {
  background: linear-gradient(120deg, #e0e0e0 0%, #e0e0e0 100%);
  background-size: 100% 0.4em;
  background-repeat: no-repeat;
  background-position: 0 88%;
  padding: 2px 4px;
  border-radius: 3px;
  transition: all 0.3s ease;
}

.text-highlighter .highlight-gray:hover {
  background-size: 100% 100%;
  color: #212121;
}

.text-highlighter .highlight-purple {
  background: linear-gradient(120deg, #ce93d8 0%, #ce93d8 100%);
  background-size: 100% 0.4em;
  background-repeat: no-repeat;
  background-position: 0 88%;
  padding: 2px 4px;
  border-radius: 3px;
  transition: all 0.3s ease;
}

.text-highlighter .highlight-purple:hover {
  background-size: 100% 100%;
  color: #4a148c;
}

/* Styles Demo Section */
.text-highlighter .highlight-styles-demo {
  margin-bottom: 35px;
  padding: 25px;
  background: linear-gradient(135deg, #f8f9fa, #e9ecef);
  border-radius: 10px;
}

.text-highlighter .highlight-styles-demo h4 {
  margin: 0 0 20px 0;
  font-size: 20px;
  font-weight: 600;
  color: #2c3e50;
  text-align: center;
}

.text-highlighter .styles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 15px;
}

.text-highlighter .style-sample {
  text-align: center;
  padding: 15px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;
}

.text-highlighter .style-sample:hover {
  transform: translateY(-3px);
}

.text-highlighter .highlight-marker {
  display: inline-block;
  padding: 8px 16px;
  border-radius: 20px;
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 8px;
}

.text-highlighter .style-sample p {
  margin: 0;
  font-size: 12px;
  color: #6c757d;
}

/* Advanced Highlighting Styles */
.text-highlighter .highlight-advanced h4 {
  margin: 0 0 20px 0;
  font-size: 20px;
  font-weight: 600;
  color: #2c3e50;
  text-align: center;
}

.text-highlighter .advanced-examples {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
}

.text-highlighter .example-box {
  padding: 20px;
  background: linear-gradient(135deg, #fff, #f8f9fa);
  border-radius: 10px;
  border: 1px solid #e9ecef;
  transition: all 0.3s ease;
}

.text-highlighter .example-box:hover {
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.text-highlighter .example-box h5 {
  margin: 0 0 10px 0;
  font-size: 16px;
  font-weight: 600;
  color: #495057;
}

.text-highlighter .example-box p {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: #6c757d;
}

.text-highlighter .highlight-gradient {
  background: linear-gradient(45deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-weight: 600;
  padding: 2px 4px;
  position: relative;
}

.text-highlighter .highlight-gradient::before {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(45deg, #667eea, #764ba2);
  border-radius: 2px;
}

.text-highlighter .highlight-animated {
  background: #fff59d;
  padding: 2px 4px;
  border-radius: 3px;
  animation: highlightPulse 2s infinite;
  font-weight: 500;
}

@keyframes highlightPulse {
  0%, 100% {
    background: #fff59d;
    transform: scale(1);
  }
  50% {
    background: #ffeb3b;
    transform: scale(1.02);
  }
}

.text-highlighter .highlight-underline {
  position: relative;
  padding: 2px 0;
  font-weight: 500;
  color: #495057;
  text-decoration: none;
}

.text-highlighter .highlight-underline::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 3px;
  background: linear-gradient(90deg, #007bff, #6610f2);
  border-radius: 2px;
  animation: underlineSlide 3s infinite;
}

@keyframes underlineSlide {
  0%, 100% {
    transform: scaleX(1);
    transform-origin: left;
  }
  50% {
    transform: scaleX(1.1);
    transform-origin: center;
  }
}

@media (max-width: 768px) {
  .text-highlighter {
    padding: 20px;
  }
  
  .text-highlighter .highlight-container {
    padding: 20px;
  }
  
  .text-highlighter .highlight-header h3 {
    font-size: 24px;
  }
  
  .text-highlighter .styles-grid {
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 10px;
  }
  
  .text-highlighter .advanced-examples {
    grid-template-columns: 1fr;
    gap: 15px;
  }
  
  .text-highlighter .highlight-text {
    font-size: 15px;
  }
}

@media (max-width: 480px) {
  .text-highlighter .styles-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .text-highlighter .style-sample {
    padding: 10px;
  }
  
  .text-highlighter .highlight-marker {
    padding: 6px 12px;
    font-size: 12px;
  }
  
  .text-highlighter .highlight-text {
    font-size: 14px;
  }
}`;

export class TextHighlighterEl extends ArchitectElement {
  name = 'text highlighter';
  contentCategories = ['flow'];
  html = template;
  css = style;
  allowedContent = [];
  category = 'typography';
  icon = <HighlightIcon />;
  specificity = 3;
  hiddenClasses = ['text-highlighter'];
  matcher(node: HTMLElement) {
    return hasClass(node, 'text-highlighter');
  }
} 