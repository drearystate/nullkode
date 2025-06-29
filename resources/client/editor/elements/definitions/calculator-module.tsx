import {ArchitectElement} from '../architect-element';
import {hasClass} from '../../utils/has-class';
import {CalculateIcon} from '@common/icons/material/Calculate';

const template = `<div class="calculator-module">
  <div class="calculator-container">
    <div class="calculator-display">
      <input type="text" id="calc-display" readonly value="0">
    </div>
    <div class="calculator-buttons">
      <button class="calc-btn clear" onclick="clearCalculator()">C</button>
      <button class="calc-btn clear" onclick="clearEntry()">CE</button>
      <button class="calc-btn operator" onclick="backspace()">⌫</button>
      <button class="calc-btn operator" onclick="appendToDisplay('/')">/</button>
      
      <button class="calc-btn number" onclick="appendToDisplay('7')">7</button>
      <button class="calc-btn number" onclick="appendToDisplay('8')">8</button>
      <button class="calc-btn number" onclick="appendToDisplay('9')">9</button>
      <button class="calc-btn operator" onclick="appendToDisplay('*')">×</button>
      
      <button class="calc-btn number" onclick="appendToDisplay('4')">4</button>
      <button class="calc-btn number" onclick="appendToDisplay('5')">5</button>
      <button class="calc-btn number" onclick="appendToDisplay('6')">6</button>
      <button class="calc-btn operator" onclick="appendToDisplay('-')">-</button>
      
      <button class="calc-btn number" onclick="appendToDisplay('1')">1</button>
      <button class="calc-btn number" onclick="appendToDisplay('2')">2</button>
      <button class="calc-btn number" onclick="appendToDisplay('3')">3</button>
      <button class="calc-btn operator" onclick="appendToDisplay('+')">+</button>
      
      <button class="calc-btn number zero" onclick="appendToDisplay('0')">0</button>
      <button class="calc-btn number" onclick="appendToDisplay('.')">.</button>
      <button class="calc-btn equals" onclick="calculateResult()">=</button>
    </div>
  </div>
  
  <script>
    window.calculatorFunctions = {
      appendToDisplay: function(value) {
        const display = document.getElementById('calc-display');
        if (display.value === '0' && value !== '.') {
          display.value = value;
        } else {
          display.value += value;
        }
      },
      
      clearCalculator: function() {
        document.getElementById('calc-display').value = '0';
      },
      
      clearEntry: function() {
        const display = document.getElementById('calc-display');
        display.value = '0';
      },
      
      backspace: function() {
        const display = document.getElementById('calc-display');
        if (display.value.length > 1) {
          display.value = display.value.slice(0, -1);
        } else {
          display.value = '0';
        }
      },
      
      calculateResult: function() {
        const display = document.getElementById('calc-display');
        try {
          // Replace × with * for evaluation
          const expression = display.value.replace(/×/g, '*');
          // Use Function constructor for safer evaluation
          const result = new Function('return ' + expression)();
          display.value = parseFloat(result.toFixed(10)).toString();
        } catch (error) {
          display.value = 'Error';
          setTimeout(() => {
            display.value = '0';
          }, 1500);
        }
      }
    };
    
    // Expose functions globally for onclick handlers
    window.appendToDisplay = window.calculatorFunctions.appendToDisplay;
    window.clearCalculator = window.calculatorFunctions.clearCalculator;
    window.clearEntry = window.calculatorFunctions.clearEntry;
    window.backspace = window.calculatorFunctions.backspace;
    window.calculateResult = window.calculatorFunctions.calculateResult;
    
    // Keyboard support
    document.addEventListener('keydown', function(event) {
      const calcModule = event.target.closest('.calculator-module');
      if (!calcModule) return;
      
      const key = event.key;
      event.preventDefault();
      
      if ('0123456789.'.includes(key)) {
        window.appendToDisplay(key);
      } else if (key === '+' || key === '-' || key === '/' || key === '*') {
        window.appendToDisplay(key === '*' ? '×' : key);
      } else if (key === 'Enter' || key === '=') {
        window.calculateResult();
      } else if (key === 'Escape') {
        window.clearCalculator();
      } else if (key === 'Backspace') {
        window.backspace();
      }
    });
  </script>
</div>`;

const style = `.calculator-module {
  display: inline-block;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: linear-gradient(145deg, #2c3e50, #3498db);
  padding: 20px;
  border-radius: 20px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  user-select: none;
}

.calculator-module .calculator-container {
  background: #34495e;
  border-radius: 15px;
  padding: 20px;
  max-width: 300px;
}

.calculator-module .calculator-display {
  margin-bottom: 20px;
}

.calculator-module #calc-display {
  width: 100%;
  height: 60px;
  background: #2c3e50;
  border: none;
  border-radius: 10px;
  color: #ecf0f1;
  font-size: 24px;
  font-weight: bold;
  text-align: right;
  padding: 0 15px;
  box-shadow: inset 0 2px 10px rgba(0, 0, 0, 0.3);
  outline: none;
}

.calculator-module .calculator-buttons {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.calculator-module .calc-btn {
  height: 50px;
  border: none;
  border-radius: 10px;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
  outline: none;
  position: relative;
  overflow: hidden;
}

.calculator-module .calc-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s ease;
}

.calculator-module .calc-btn:hover::before {
  left: 100%;
}

.calculator-module .calc-btn:active {
  transform: scale(0.98);
}

.calculator-module .calc-btn.number {
  background: linear-gradient(145deg, #95a5a6, #7f8c8d);
  color: #2c3e50;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.calculator-module .calc-btn.number:hover {
  background: linear-gradient(145deg, #bdc3c7, #95a5a6);
}

.calculator-module .calc-btn.operator {
  background: linear-gradient(145deg, #e74c3c, #c0392b);
  color: white;
  box-shadow: 0 4px 8px rgba(231, 76, 60, 0.3);
}

.calculator-module .calc-btn.operator:hover {
  background: linear-gradient(145deg, #ec7063, #e74c3c);
}

.calculator-module .calc-btn.clear {
  background: linear-gradient(145deg, #f39c12, #e67e22);
  color: white;
  box-shadow: 0 4px 8px rgba(243, 156, 18, 0.3);
}

.calculator-module .calc-btn.clear:hover {
  background: linear-gradient(145deg, #f5b041, #f39c12);
}

.calculator-module .calc-btn.equals {
  background: linear-gradient(145deg, #27ae60, #229954);
  color: white;
  box-shadow: 0 4px 8px rgba(39, 174, 96, 0.3);
}

.calculator-module .calc-btn.equals:hover {
  background: linear-gradient(145deg, #58d68d, #27ae60);
}

.calculator-module .calc-btn.zero {
  grid-column: span 2;
}

@media (max-width: 480px) {
  .calculator-module {
    padding: 15px;
  }
  
  .calculator-module .calculator-container {
    padding: 15px;
    max-width: 250px;
  }
  
  .calculator-module #calc-display {
    height: 50px;
    font-size: 20px;
  }
  
  .calculator-module .calc-btn {
    height: 45px;
    font-size: 16px;
  }
}`;

export class CalculatorModuleEl extends ArchitectElement {
  name = 'Calculator';
  contentCategories = ['flow'];
  html = template;
  css = style;
  allowedContent = [];
  category = 'modules';
  icon = (<CalculateIcon />);
  specificity = 3;
  hiddenClasses = ['calculator-module'];
  matcher(node: HTMLElement) {
    return hasClass(node, 'calculator-module');
  }
} 