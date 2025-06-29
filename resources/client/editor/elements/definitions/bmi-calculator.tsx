import {ArchitectElement} from '../architect-element';
import {hasClass} from '../../utils/has-class';
import {FitnessCenterIcon} from '@common/icons/material/FitnessCenter';

const template = `<div class="bmi-calculator">
  <div class="calculator-container">
    <div class="calculator-header">
      <h3>BMI Calculator</h3>
      <p>Calculate your Body Mass Index</p>
    </div>
    
    <div class="input-section">
      <div class="input-group">
        <label for="height">Height</label>
        <div class="input-with-unit">
          <input type="number" id="height" placeholder="170" min="1" max="300">
          <select id="heightUnit">
            <option value="cm">cm</option>
            <option value="feet">ft/in</option>
          </select>
        </div>
        <div id="feetInchInputs" style="display: none;">
          <input type="number" id="feet" placeholder="5" min="1" max="10"> ft
          <input type="number" id="inches" placeholder="7" min="0" max="11"> in
        </div>
      </div>
      
      <div class="input-group">
        <label for="weight">Weight</label>
        <div class="input-with-unit">
          <input type="number" id="weight" placeholder="70" min="1" max="500">
          <select id="weightUnit">
            <option value="kg">kg</option>
            <option value="lbs">lbs</option>
          </select>
        </div>
      </div>
      
      <button onclick="calculateBMI()" class="calculate-btn">Calculate BMI</button>
    </div>
    
    <div id="bmiResult" class="result-section" style="display: none;">
      <div class="bmi-display">
        <div class="bmi-value">
          <span id="bmiNumber">0</span>
          <span class="unit">kg/m²</span>
        </div>
        <div id="bmiCategory" class="bmi-category">Normal</div>
      </div>
      
      <div class="bmi-scale">
        <div class="scale-bar">
          <div class="scale-segment underweight"></div>
          <div class="scale-segment normal"></div>
          <div class="scale-segment overweight"></div>
          <div class="scale-segment obese"></div>
        </div>
        <div class="scale-labels">
          <span>Underweight</span>
          <span>Normal</span>
          <span>Overweight</span>
          <span>Obese</span>
        </div>
        <div id="bmiIndicator" class="bmi-indicator"></div>
      </div>
      
      <div class="bmi-ranges">
        <h4>BMI Categories:</h4>
        <div class="range-item">
          <span class="range-color underweight"></span>
          <span>Underweight: Below 18.5</span>
        </div>
        <div class="range-item">
          <span class="range-color normal"></span>
          <span>Normal: 18.5 - 24.9</span>
        </div>
        <div class="range-item">
          <span class="range-color overweight"></span>
          <span>Overweight: 25.0 - 29.9</span>
        </div>
        <div class="range-item">
          <span class="range-color obese"></span>
          <span>Obese: 30.0 and above</span>
        </div>
      </div>
    </div>
  </div>
  
  <script>
    window.BMICalculator = {
      init: function() {
        this.setupEventListeners();
      },
      
      setupEventListeners: function() {
        const heightUnit = document.getElementById('heightUnit');
        const weightUnit = document.getElementById('weightUnit');
        
        heightUnit.addEventListener('change', this.toggleHeightUnit);
        weightUnit.addEventListener('change', this.updateWeightPlaceholder);
        
        // Add Enter key support
        const inputs = ['height', 'weight', 'feet', 'inches'];
        inputs.forEach(id => {
          const input = document.getElementById(id);
          if (input) {
            input.addEventListener('keypress', (e) => {
              if (e.key === 'Enter') {
                this.calculate();
              }
            });
          }
        });
      },
      
      toggleHeightUnit: function() {
        const heightUnit = document.getElementById('heightUnit');
        const feetInchInputs = document.getElementById('feetInchInputs');
        const heightInput = document.getElementById('height');
        
        if (heightUnit.value === 'feet') {
          feetInchInputs.style.display = 'block';
          heightInput.style.display = 'none';
        } else {
          feetInchInputs.style.display = 'none';
          heightInput.style.display = 'block';
        }
      },
      
      updateWeightPlaceholder: function() {
        const weightUnit = document.getElementById('weightUnit');
        const weightInput = document.getElementById('weight');
        
        if (weightUnit.value === 'lbs') {
          weightInput.placeholder = '154';
        } else {
          weightInput.placeholder = '70';
        }
      },
      
      calculate: function() {
        const heightUnit = document.getElementById('heightUnit').value;
        const weightUnit = document.getElementById('weightUnit').value;
        
        let heightInMeters;
        
        if (heightUnit === 'feet') {
          const feet = parseFloat(document.getElementById('feet').value) || 0;
          const inches = parseFloat(document.getElementById('inches').value) || 0;
          const totalInches = (feet * 12) + inches;
          heightInMeters = totalInches * 0.0254;
        } else {
          const heightInCm = parseFloat(document.getElementById('height').value) || 0;
          heightInMeters = heightInCm / 100;
        }
        
        let weightInKg;
        const weight = parseFloat(document.getElementById('weight').value) || 0;
        
        if (weightUnit === 'lbs') {
          weightInKg = weight * 0.453592;
        } else {
          weightInKg = weight;
        }
        
        if (heightInMeters <= 0 || weightInKg <= 0) {
          alert('Please enter valid height and weight values.');
          return;
        }
        
        const bmi = weightInKg / (heightInMeters * heightInMeters);
        this.displayResult(bmi);
      },
      
      displayResult: function(bmi) {
        const resultSection = document.getElementById('bmiResult');
        const bmiNumber = document.getElementById('bmiNumber');
        const bmiCategory = document.getElementById('bmiCategory');
        const bmiIndicator = document.getElementById('bmiIndicator');
        
        bmiNumber.textContent = bmi.toFixed(1);
        
        let category, position;
        
        if (bmi < 18.5) {
          category = 'Underweight';
          position = (bmi / 18.5) * 25;
        } else if (bmi < 25) {
          category = 'Normal';
          position = 25 + ((bmi - 18.5) / (25 - 18.5)) * 25;
        } else if (bmi < 30) {
          category = 'Overweight';
          position = 50 + ((bmi - 25) / (30 - 25)) * 25;
        } else {
          category = 'Obese';
          position = 75 + Math.min(((bmi - 30) / 10) * 25, 25);
        }
        
        bmiCategory.textContent = category;
        bmiCategory.className = 'bmi-category ' + category.toLowerCase();
        
        bmiIndicator.style.left = Math.min(position, 100) + '%';
        
        resultSection.style.display = 'block';
        resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    };
    
    // Global functions
    window.calculateBMI = function() {
      window.BMICalculator.calculate();
    };
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        window.BMICalculator.init();
      });
    } else {
      window.BMICalculator.init();
    }
  </script>
</div>`;

const style = `.bmi-calculator {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 25px;
  border-radius: 20px;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.2);
  color: white;
  max-width: 450px;
  margin: 0 auto;
}

.bmi-calculator .calculator-container {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 15px;
  padding: 25px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.bmi-calculator .calculator-header {
  text-align: center;
  margin-bottom: 25px;
}

.bmi-calculator .calculator-header h3 {
  margin: 0 0 8px 0;
  font-size: 28px;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.bmi-calculator .calculator-header p {
  margin: 0;
  opacity: 0.9;
  font-size: 16px;
}

.bmi-calculator .input-section {
  margin-bottom: 25px;
}

.bmi-calculator .input-group {
  margin-bottom: 20px;
}

.bmi-calculator label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  font-size: 16px;
}

.bmi-calculator .input-with-unit {
  display: flex;
  gap: 10px;
  align-items: center;
}

.bmi-calculator input[type="number"] {
  flex: 1;
  padding: 12px 15px;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  background: rgba(255, 255, 255, 0.9);
  color: #333;
  outline: none;
  transition: all 0.3s ease;
}

.bmi-calculator input[type="number"]:focus {
  background: white;
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.3);
}

.bmi-calculator select {
  padding: 12px;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  background: rgba(255, 255, 255, 0.9);
  color: #333;
  outline: none;
  cursor: pointer;
}

.bmi-calculator #feetInchInputs {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-top: 10px;
  font-size: 14px;
}

.bmi-calculator #feetInchInputs input {
  width: 80px;
}

.bmi-calculator .calculate-btn {
  width: 100%;
  padding: 15px;
  background: linear-gradient(145deg, #4ecca3, #45b7aa);
  color: #1a1a2e;
  border: none;
  border-radius: 12px;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 1px;
  box-shadow: 0 6px 15px rgba(0, 0, 0, 0.2);
}

.bmi-calculator .calculate-btn:hover {
  background: linear-gradient(145deg, #5ff3d1, #4ecca3);
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
}

.bmi-calculator .result-section {
  animation: fadeInUp 0.5s ease;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.bmi-calculator .bmi-display {
  text-align: center;
  margin-bottom: 25px;
}

.bmi-calculator .bmi-value {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 8px;
  margin-bottom: 10px;
}

.bmi-calculator #bmiNumber {
  font-size: 48px;
  font-weight: 800;
  color: #4ecca3;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.bmi-calculator .unit {
  font-size: 18px;
  opacity: 0.8;
}

.bmi-calculator .bmi-category {
  font-size: 20px;
  font-weight: 600;
  padding: 8px 16px;
  border-radius: 20px;
  display: inline-block;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.bmi-calculator .bmi-category.underweight {
  background: #3498db;
  color: white;
}

.bmi-calculator .bmi-category.normal {
  background: #2ecc71;
  color: white;
}

.bmi-calculator .bmi-category.overweight {
  background: #f39c12;
  color: white;
}

.bmi-calculator .bmi-category.obese {
  background: #e74c3c;
  color: white;
}

.bmi-calculator .bmi-scale {
  margin-bottom: 25px;
  position: relative;
}

.bmi-calculator .scale-bar {
  display: flex;
  height: 20px;
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.bmi-calculator .scale-segment {
  flex: 1;
}

.bmi-calculator .scale-segment.underweight {
  background: #3498db;
}

.bmi-calculator .scale-segment.normal {
  background: #2ecc71;
}

.bmi-calculator .scale-segment.overweight {
  background: #f39c12;
}

.bmi-calculator .scale-segment.obese {
  background: #e74c3c;
}

.bmi-calculator .scale-labels {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  opacity: 0.9;
}

.bmi-calculator .bmi-indicator {
  position: absolute;
  top: -8px;
  width: 4px;
  height: 36px;
  background: white;
  border-radius: 2px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  transition: left 0.5s ease;
  transform: translateX(-50%);
}

.bmi-calculator .bmi-indicator::before {
  content: '';
  position: absolute;
  top: -6px;
  left: -4px;
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-bottom: 8px solid white;
}

.bmi-calculator .bmi-ranges {
  background: rgba(255, 255, 255, 0.1);
  padding: 20px;
  border-radius: 12px;
  backdrop-filter: blur(5px);
}

.bmi-calculator .bmi-ranges h4 {
  margin: 0 0 15px 0;
  font-size: 16px;
  font-weight: 600;
}

.bmi-calculator .range-item {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
  font-size: 14px;
}

.bmi-calculator .range-color {
  width: 16px;
  height: 16px;
  border-radius: 3px;
  flex-shrink: 0;
}

.bmi-calculator .range-color.underweight {
  background: #3498db;
}

.bmi-calculator .range-color.normal {
  background: #2ecc71;
}

.bmi-calculator .range-color.overweight {
  background: #f39c12;
}

.bmi-calculator .range-color.obese {
  background: #e74c3c;
}

@media (max-width: 480px) {
  .bmi-calculator {
    padding: 20px;
  }
  
  .bmi-calculator .calculator-container {
    padding: 20px;
  }
  
  .bmi-calculator .calculator-header h3 {
    font-size: 24px;
  }
  
  .bmi-calculator #bmiNumber {
    font-size: 36px;
  }
  
  .bmi-calculator .scale-labels {
    font-size: 11px;
  }
}`;

export class BMICalculatorEl extends ArchitectElement {
  name = 'BMI Calculator';
  contentCategories = ['flow'];
  html = template;
  css = style;
  allowedContent = [];
  category = 'modules';
  icon = (<FitnessCenterIcon />);
  specificity = 3;
  hiddenClasses = ['bmi-calculator'];
  matcher(node: HTMLElement) {
    return hasClass(node, 'bmi-calculator');
  }
} 