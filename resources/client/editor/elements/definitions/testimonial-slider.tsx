import {ArchitectElement} from '../architect-element';
import {hasClass} from '../../utils/has-class';
import {FormatQuoteIcon} from '@common/icons/material/FormatQuote';

const template = `<div class="testimonial-slider">
  <div class="testimonial-container">
    <div class="testimonial-slide active">
      <div class="testimonial-content">
        <div class="quote-icon">
          <i class="fa fa-quote-left"></i>
        </div>
        <p class="testimonial-text">
          "This company exceeded all our expectations. The quality of work and attention to detail was outstanding. I would highly recommend their services to anyone looking for professional excellence."
        </p>
        <div class="testimonial-author">
          <img src="/images/builder/placeholder.svg" alt="Author" class="author-image">
          <div class="author-info">
            <h4 class="author-name">Sarah Johnson</h4>
            <p class="author-title">CEO, Tech Solutions Inc.</p>
            <div class="rating">
              <i class="fa fa-star"></i>
              <i class="fa fa-star"></i>
              <i class="fa fa-star"></i>
              <i class="fa fa-star"></i>
              <i class="fa fa-star"></i>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="testimonial-slide">
      <div class="testimonial-content">
        <div class="quote-icon">
          <i class="fa fa-quote-left"></i>
        </div>
        <p class="testimonial-text">
          "Working with this team was an absolute pleasure. They delivered our project on time and within budget, while maintaining the highest standards of quality throughout the process."
        </p>
        <div class="testimonial-author">
          <img src="/images/builder/placeholder.svg" alt="Author" class="author-image">
          <div class="author-info">
            <h4 class="author-name">Michael Chen</h4>
            <p class="author-title">Founder, Digital Innovations</p>
            <div class="rating">
              <i class="fa fa-star"></i>
              <i class="fa fa-star"></i>
              <i class="fa fa-star"></i>
              <i class="fa fa-star"></i>
              <i class="fa fa-star"></i>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="testimonial-controls">
      <button class="prev-btn" onclick="previousSlide()">
        <i class="fa fa-chevron-left"></i>
      </button>
      <div class="testimonial-dots">
        <span class="dot active" onclick="currentSlide(1)"></span>
        <span class="dot" onclick="currentSlide(2)"></span>
      </div>
      <button class="next-btn" onclick="nextSlide()">
        <i class="fa fa-chevron-right"></i>
      </button>
    </div>
  </div>
</div>`;

const style = `.testimonial-slider {
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: 80px 20px;
  position: relative;
  overflow: hidden;
}

.testimonial-slider::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: 
    radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3) 0%, transparent 50%);
}

.testimonial-slider .testimonial-container {
  max-width: 800px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
}

.testimonial-slider .testimonial-slide {
  display: none;
  text-align: center;
  background: white;
  border-radius: 20px;
  padding: 50px 40px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;
}

.testimonial-slider .testimonial-slide::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(45deg, rgba(255, 255, 255, 0.1) 0%, transparent 50%);
}

.testimonial-slider .testimonial-slide.active {
  display: block;
  animation: fadeIn 0.6s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.testimonial-slider .testimonial-content {
  position: relative;
  z-index: 2;
}

.testimonial-slider .quote-icon {
  font-size: 48px;
  color: #6c5ce7;
  margin-bottom: 30px;
  opacity: 0.3;
}

.testimonial-slider .testimonial-text {
  font-size: 20px;
  line-height: 1.8;
  color: #2d3436;
  margin-bottom: 40px;
  font-style: italic;
  position: relative;
}

.testimonial-slider .testimonial-author {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin-top: 30px;
}

.testimonial-slider .author-image {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
  border: 4px solid #6c5ce7;
  box-shadow: 0 8px 20px rgba(108, 92, 231, 0.3);
}

.testimonial-slider .author-info {
  text-align: left;
}

.testimonial-slider .author-name {
  font-size: 20px;
  font-weight: 700;
  color: #2d3436;
  margin: 0 0 5px 0;
}

.testimonial-slider .author-title {
  font-size: 16px;
  color: #636e72;
  margin: 0 0 10px 0;
}

.testimonial-slider .rating {
  display: flex;
  gap: 3px;
}

.testimonial-slider .rating i {
  color: #fdcb6e;
  font-size: 16px;
}

.testimonial-slider .testimonial-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 40px;
  max-width: 300px;
  margin-left: auto;
  margin-right: auto;
}

.testimonial-slider .prev-btn,
.testimonial-slider .next-btn {
  background: #6c5ce7;
  color: white;
  border: none;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.testimonial-slider .prev-btn:hover,
.testimonial-slider .next-btn:hover {
  background: #5f39d9;
  transform: scale(1.1);
}

.testimonial-slider .testimonial-dots {
  display: flex;
  gap: 15px;
}

.testimonial-slider .dot {
  width: 15px;
  height: 15px;
  border-radius: 50%;
  background: #ddd;
  cursor: pointer;
  transition: all 0.3s ease;
}

.testimonial-slider .dot.active {
  background: #6c5ce7;
  transform: scale(1.2);
}

.testimonial-slider .dot:hover {
  background: #6c5ce7;
}

@media (max-width: 768px) {
  .testimonial-slider .testimonial-slide {
    padding: 30px 25px;
  }
  
  .testimonial-slider .testimonial-text {
    font-size: 18px;
  }
  
  .testimonial-slider .testimonial-author {
    flex-direction: column;
    text-align: center;
  }
  
  .testimonial-slider .author-info {
    text-align: center;
  }
  
  .testimonial-slider .author-image {
    width: 60px;
    height: 60px;
  }
}`;

export class TestimonialSliderEl extends ArchitectElement {
  name = 'Testimonial Slider';
  contentCategories = ['flow'];
  html = template;
  css = style;
  allowedContent = ['flow'];
  category = 'components';
  icon = (<FormatQuoteIcon />);
  specificity = 3;
  hiddenClasses = ['testimonial-slider'];
  matcher(node: HTMLElement) {
    return hasClass(node, 'testimonial-slider');
  }
} 