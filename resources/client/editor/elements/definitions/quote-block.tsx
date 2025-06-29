import {ArchitectElement} from '../architect-element';
import {hasClass} from '../../utils/has-class';
import {FormatQuoteIcon} from '@common/icons/material/FormatQuote';

const template = `<div class="quote-block">
  <div class="quote-container">
    <div class="quote-icon-top">
      <i class="fa fa-quote-left"></i>
    </div>
    
    <blockquote class="quote-text">
      "The best way to predict the future is to create it. Innovation distinguishes between a leader and a follower, so we must continue pushing boundaries and embracing change."
    </blockquote>
    
    <div class="quote-attribution">
      <div class="author-info">
        <img src="/images/builder/placeholder.svg" alt="Author" class="author-avatar">
        <div class="author-details">
          <h4 class="author-name">Steve Jobs</h4>
          <p class="author-title">Co-founder, Apple Inc.</p>
          <div class="quote-meta">
            <span class="quote-date">March 15, 2024</span>
            <span class="quote-source">Innovation Conference</span>
          </div>
        </div>
      </div>
    </div>
    
    <div class="quote-decoration">
      <div class="decoration-line"></div>
      <div class="decoration-dot"></div>
      <div class="decoration-line"></div>
    </div>
  </div>
</div>`;

const style = `.quote-block {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  padding: 40px;
  border-radius: 20px;
  max-width: 800px;
  margin: 0 auto;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;
}

.quote-block::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: 
    radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.1) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.1) 0%, transparent 50%);
  pointer-events: none;
}

.quote-block .quote-container {
  position: relative;
  z-index: 1;
  background: white;
  border-radius: 15px;
  padding: 40px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.08);
  border-left: 5px solid #007bff;
}

.quote-block .quote-icon-top {
  text-align: center;
  margin-bottom: 25px;
}

.quote-block .quote-icon-top i {
  font-size: 48px;
  color: #007bff;
  opacity: 0.3;
  background: linear-gradient(135deg, #007bff, #6610f2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.quote-block .quote-text {
  font-size: 24px;
  line-height: 1.6;
  color: #2c3e50;
  text-align: center;
  margin: 0 0 35px 0;
  font-style: italic;
  font-weight: 300;
  position: relative;
  padding: 0 20px;
}

.quote-block .quote-text::before,
.quote-block .quote-text::after {
  content: '';
  position: absolute;
  top: 0;
  width: 3px;
  height: 100%;
  background: linear-gradient(to bottom, transparent, #007bff, transparent);
  opacity: 0.3;
}

.quote-block .quote-text::before {
  left: 0;
}

.quote-block .quote-text::after {
  right: 0;
}

.quote-block .quote-attribution {
  margin-bottom: 25px;
}

.quote-block .author-info {
  display: flex;
  align-items: center;
  gap: 20px;
  justify-content: center;
}

.quote-block .author-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
  border: 4px solid #007bff;
  box-shadow: 0 8px 20px rgba(0, 123, 255, 0.3);
  transition: transform 0.3s ease;
}

.quote-block .author-avatar:hover {
  transform: scale(1.05);
}

.quote-block .author-details {
  text-align: left;
}

.quote-block .author-name {
  margin: 0 0 5px 0;
  font-size: 20px;
  font-weight: 700;
  color: #2c3e50;
  background: linear-gradient(135deg, #2c3e50, #007bff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.quote-block .author-title {
  margin: 0 0 10px 0;
  font-size: 16px;
  color: #6c757d;
  font-weight: 500;
}

.quote-block .quote-meta {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.quote-block .quote-date,
.quote-block .quote-source {
  font-size: 14px;
  color: #868e96;
  font-style: italic;
}

.quote-block .quote-decoration {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
}

.quote-block .decoration-line {
  width: 60px;
  height: 2px;
  background: linear-gradient(90deg, transparent, #007bff, transparent);
  border-radius: 1px;
}

.quote-block .decoration-dot {
  width: 8px;
  height: 8px;
  background: #007bff;
  border-radius: 50%;
  box-shadow: 0 0 10px rgba(0, 123, 255, 0.5);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.7;
  }
}

/* Alternative styles for different quote types */
.quote-block.testimonial {
  background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
}

.quote-block.testimonial .quote-container {
  border-left-color: #28a745;
}

.quote-block.testimonial .quote-icon-top i,
.quote-block.testimonial .author-name,
.quote-block.testimonial .decoration-dot {
  color: #28a745;
  background: linear-gradient(135deg, #28a745, #20c997);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.quote-block.testimonial .decoration-dot {
  background: #28a745;
  -webkit-text-fill-color: initial;
}

.quote-block.testimonial .author-avatar {
  border-color: #28a745;
  box-shadow: 0 8px 20px rgba(40, 167, 69, 0.3);
}

.quote-block.inspirational {
  background: linear-gradient(135deg, #fd7e14 0%, #ffc107 100%);
}

.quote-block.inspirational .quote-container {
  border-left-color: #fd7e14;
}

.quote-block.inspirational .quote-icon-top i,
.quote-block.inspirational .author-name,
.quote-block.inspirational .decoration-dot {
  color: #fd7e14;
  background: linear-gradient(135deg, #fd7e14, #ffc107);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.quote-block.inspirational .decoration-dot {
  background: #fd7e14;
  -webkit-text-fill-color: initial;
}

.quote-block.inspirational .author-avatar {
  border-color: #fd7e14;
  box-shadow: 0 8px 20px rgba(253, 126, 20, 0.3);
}

@media (max-width: 768px) {
  .quote-block {
    padding: 25px;
  }
  
  .quote-block .quote-container {
    padding: 25px;
  }
  
  .quote-block .quote-text {
    font-size: 20px;
    padding: 0 10px;
  }
  
  .quote-block .author-info {
    flex-direction: column;
    text-align: center;
    gap: 15px;
  }
  
  .quote-block .author-details {
    text-align: center;
  }
  
  .quote-block .author-avatar {
    width: 60px;
    height: 60px;
  }
  
  .quote-block .quote-icon-top i {
    font-size: 36px;
  }
}

@media (max-width: 480px) {
  .quote-block {
    padding: 20px;
  }
  
  .quote-block .quote-container {
    padding: 20px;
  }
  
  .quote-block .quote-text {
    font-size: 18px;
    line-height: 1.5;
  }
  
  .quote-block .author-name {
    font-size: 18px;
  }
  
  .quote-block .author-title {
    font-size: 14px;
  }
  
  .quote-block .quote-date,
  .quote-block .quote-source {
    font-size: 12px;
  }
  
  .quote-block .decoration-line {
    width: 40px;
  }
}`;

export class QuoteBlockEl extends ArchitectElement {
  name = 'quote block';
  contentCategories = ['flow'];
  html = template;
  css = style;
  allowedContent = [];
  category = 'typography';
  icon = <FormatQuoteIcon />;
  specificity = 3;
  hiddenClasses = ['quote-block'];
  matcher(node: HTMLElement) {
    return hasClass(node, 'quote-block');
  }
} 