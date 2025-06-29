import {ArchitectElement} from '../architect-element';
import {hasClass} from '../../utils/has-class';
import {AttachMoneyIcon} from '@common/icons/material/AttachMoney';

const template = `<div class="custom-pricing-table">
  <div class="pricing-container">
    <div class="pricing-plan">
      <div class="plan-header">
        <h3 class="plan-name">Basic</h3>
        <div class="plan-price">
          <span class="currency">$</span>
          <span class="amount">19</span>
          <span class="period">/month</span>
        </div>
        <p class="plan-description">Perfect for individuals and small projects</p>
      </div>
      <div class="plan-features">
        <ul>
          <li><i class="fa fa-check"></i> 5 Projects</li>
          <li><i class="fa fa-check"></i> 10GB Storage</li>
          <li><i class="fa fa-check"></i> Email Support</li>
          <li><i class="fa fa-check"></i> Basic Analytics</li>
          <li><i class="fa fa-times"></i> Priority Support</li>
        </ul>
      </div>
      <div class="plan-footer">
        <button class="plan-button">Get Started</button>
      </div>
    </div>
    
    <div class="pricing-plan featured">
      <div class="popular-badge">Most Popular</div>
      <div class="plan-header">
        <h3 class="plan-name">Professional</h3>
        <div class="plan-price">
          <span class="currency">$</span>
          <span class="amount">49</span>
          <span class="period">/month</span>
        </div>
        <p class="plan-description">Ideal for growing businesses and teams</p>
      </div>
      <div class="plan-features">
        <ul>
          <li><i class="fa fa-check"></i> 25 Projects</li>
          <li><i class="fa fa-check"></i> 100GB Storage</li>
          <li><i class="fa fa-check"></i> Priority Support</li>
          <li><i class="fa fa-check"></i> Advanced Analytics</li>
          <li><i class="fa fa-check"></i> API Access</li>
        </ul>
      </div>
      <div class="plan-footer">
        <button class="plan-button">Get Started</button>
      </div>
    </div>
    
    <div class="pricing-plan">
      <div class="plan-header">
        <h3 class="plan-name">Enterprise</h3>
        <div class="plan-price">
          <span class="currency">$</span>
          <span class="amount">99</span>
          <span class="period">/month</span>
        </div>
        <p class="plan-description">For large organizations with advanced needs</p>
      </div>
      <div class="plan-features">
        <ul>
          <li><i class="fa fa-check"></i> Unlimited Projects</li>
          <li><i class="fa fa-check"></i> Unlimited Storage</li>
          <li><i class="fa fa-check"></i> 24/7 Support</li>
          <li><i class="fa fa-check"></i> Custom Analytics</li>
          <li><i class="fa fa-check"></i> White-label Solution</li>
        </ul>
      </div>
      <div class="plan-footer">
        <button class="plan-button">Contact Sales</button>
      </div>
    </div>
  </div>
</div>`;

const style = `.custom-pricing-table {
  padding: 80px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  position: relative;
  overflow: hidden;
}

.custom-pricing-table::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: 
    radial-gradient(circle at 30% 40%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
    radial-gradient(circle at 70% 80%, rgba(255, 255, 255, 0.05) 0%, transparent 50%);
}

.custom-pricing-table .pricing-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 30px;
  max-width: 1200px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
}

.custom-pricing-table .pricing-plan {
  background: white;
  border-radius: 20px;
  padding: 40px 30px;
  text-align: center;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.custom-pricing-table .pricing-plan::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(45deg, rgba(255, 255, 255, 0.1) 0%, transparent 50%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.custom-pricing-table .pricing-plan:hover::before {
  opacity: 1;
}

.custom-pricing-table .pricing-plan:hover {
  transform: translateY(-15px);
  box-shadow: 0 30px 60px rgba(0, 0, 0, 0.2);
}

.custom-pricing-table .pricing-plan.featured {
  transform: scale(1.05);
  border: 3px solid #6c5ce7;
  position: relative;
}

.custom-pricing-table .pricing-plan.featured:hover {
  transform: scale(1.05) translateY(-15px);
}

.custom-pricing-table .popular-badge {
  position: absolute;
  top: -15px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #6c5ce7, #a55eea);
  color: white;
  padding: 8px 30px;
  border-radius: 25px;
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  box-shadow: 0 5px 15px rgba(108, 92, 231, 0.4);
}

.custom-pricing-table .plan-header {
  margin-bottom: 30px;
  position: relative;
  z-index: 2;
}

.custom-pricing-table .plan-name {
  font-size: 28px;
  font-weight: 700;
  color: #2d3436;
  margin: 0 0 20px 0;
}

.custom-pricing-table .plan-price {
  margin-bottom: 15px;
  position: relative;
}

.custom-pricing-table .currency {
  font-size: 24px;
  font-weight: 600;
  color: #6c5ce7;
  vertical-align: top;
}

.custom-pricing-table .amount {
  font-size: 60px;
  font-weight: 800;
  color: #2d3436;
  line-height: 1;
}

.custom-pricing-table .period {
  font-size: 18px;
  color: #636e72;
  font-weight: 500;
}

.custom-pricing-table .plan-description {
  color: #636e72;
  font-size: 16px;
  margin: 0;
  line-height: 1.5;
}

.custom-pricing-table .plan-features {
  margin-bottom: 40px;
  position: relative;
  z-index: 2;
}

.custom-pricing-table .plan-features ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.custom-pricing-table .plan-features li {
  padding: 12px 0;
  font-size: 16px;
  color: #2d3436;
  border-bottom: 1px solid #f8f9fa;
  position: relative;
}

.custom-pricing-table .plan-features li:last-child {
  border-bottom: none;
}

.custom-pricing-table .plan-features i {
  margin-right: 15px;
  width: 20px;
  text-align: center;
}

.custom-pricing-table .plan-features .fa-check {
  color: #00b894;
}

.custom-pricing-table .plan-features .fa-times {
  color: #e17055;
}

.custom-pricing-table .plan-footer {
  position: relative;
  z-index: 2;
}

.custom-pricing-table .plan-button {
  width: 100%;
  padding: 15px 30px;
  font-size: 16px;
  font-weight: 600;
  color: white;
  background: linear-gradient(135deg, #6c5ce7, #a55eea);
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  position: relative;
  overflow: hidden;
}

.custom-pricing-table .plan-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s ease;
}

.custom-pricing-table .plan-button:hover::before {
  left: 100%;
}

.custom-pricing-table .plan-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px rgba(108, 92, 231, 0.4);
}

@media (max-width: 768px) {
  .custom-pricing-table .pricing-container {
    grid-template-columns: 1fr;
    gap: 20px;
  }
  
  .custom-pricing-table .pricing-plan.featured {
    transform: none;
  }
  
  .custom-pricing-table .pricing-plan.featured:hover {
    transform: translateY(-15px);
  }
  
  .custom-pricing-table .pricing-plan {
    padding: 30px 20px;
  }
  
  .custom-pricing-table .amount {
    font-size: 48px;
  }
}`;

export class CustomPricingTableEl extends ArchitectElement {
  name = 'Custom Pricing Table';
  contentCategories = ['flow'];
  html = template;
  css = style;
  allowedContent = ['flow'];
  category = 'components';
  icon = (<AttachMoneyIcon />);
  specificity = 3;
  hiddenClasses = ['custom-pricing-table'];
  matcher(node: HTMLElement) {
    return hasClass(node, 'custom-pricing-table');
  }
} 