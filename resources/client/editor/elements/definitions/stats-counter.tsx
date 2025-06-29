import {ArchitectElement} from '../architect-element';
import {hasClass} from '../../utils/has-class';
import {BarChartIcon} from '@common/icons/material/BarChart';

const template = `<div class="stats-counter">
  <div class="stats-container">
    <div class="stat-item">
      <div class="stat-icon">
        <i class="fa fa-users"></i>
      </div>
      <div class="stat-number" data-target="1250">1250</div>
      <div class="stat-label">Happy Clients</div>
    </div>
    <div class="stat-item">
      <div class="stat-icon">
        <i class="fa fa-briefcase"></i>
      </div>
      <div class="stat-number" data-target="350">350</div>
      <div class="stat-label">Projects Completed</div>
    </div>
    <div class="stat-item">
      <div class="stat-icon">
        <i class="fa fa-code"></i>
      </div>
      <div class="stat-number" data-target="50000">50000</div>
      <div class="stat-label">Lines of Code</div>
    </div>
    <div class="stat-item">
      <div class="stat-icon">
        <i class="fa fa-trophy"></i>
      </div>
      <div class="stat-number" data-target="25">25</div>
      <div class="stat-label">Awards Won</div>
    </div>
  </div>
</div>`;

const style = `.stats-counter {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 80px 0;
  position: relative;
  overflow: hidden;
}

.stats-counter::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.1);
  background-image: 
    radial-gradient(circle at 25% 25%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
    radial-gradient(circle at 75% 75%, rgba(255, 255, 255, 0.05) 0%, transparent 50%);
}

.stats-counter .stats-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 40px;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  position: relative;
  z-index: 1;
}

.stats-counter .stat-item {
  text-align: center;
  color: white;
  background: rgba(255, 255, 255, 0.1);
  padding: 40px 20px;
  border-radius: 15px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.stats-counter .stat-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
  transition: left 0.5s ease;
}

.stats-counter .stat-item:hover::before {
  left: 100%;
}

.stats-counter .stat-item:hover {
  transform: translateY(-10px);
  background: rgba(255, 255, 255, 0.15);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
}

.stats-counter .stat-icon {
  font-size: 48px;
  margin-bottom: 20px;
  color: #ffd700;
  position: relative;
  z-index: 2;
}

.stats-counter .stat-number {
  font-size: 48px;
  font-weight: 800;
  margin-bottom: 10px;
  color: white;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
  font-family: 'Arial', sans-serif;
  position: relative;
  z-index: 2;
}

.stats-counter .stat-label {
  font-size: 18px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  text-transform: uppercase;
  letter-spacing: 1px;
  position: relative;
  z-index: 2;
}

@media (max-width: 768px) {
  .stats-counter .stats-container {
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
  }
  
  .stats-counter .stat-item {
    padding: 30px 15px;
  }
  
  .stats-counter .stat-icon {
    font-size: 36px;
    margin-bottom: 15px;
  }
  
  .stats-counter .stat-number {
    font-size: 36px;
  }
  
  .stats-counter .stat-label {
    font-size: 14px;
  }
}

@media (max-width: 480px) {
  .stats-counter .stats-container {
    grid-template-columns: 1fr;
  }
}`;

export class StatsCounterEl extends ArchitectElement {
  name = 'Stats Counter';
  contentCategories = ['flow'];
  html = template;
  css = style;
  allowedContent = ['flow'];
  category = 'components';
  icon = (<BarChartIcon />);
  specificity = 3;
  hiddenClasses = ['stats-counter'];
  matcher(node: HTMLElement) {
    return hasClass(node, 'stats-counter');
  }
} 