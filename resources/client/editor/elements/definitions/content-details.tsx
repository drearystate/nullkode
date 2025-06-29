import {ArchitectElement} from '../architect-element';
import {hasClass} from '../../utils/has-class';
import {DescriptionIcon} from '@common/icons/material/Description';

const template = `<section class="content-details">
  <div class="content-container">
    <div class="content-wrapper">
      <div class="hero-image">
        <img alt="content" class="hero-img" src="https://dummyimage.com/1200x500">
      </div>
      <div class="content-section">
        <div class="profile-section">
          <div class="profile-avatar">
            <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="avatar-icon" viewBox="0 0 24 24">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
          <div class="profile-info">
            <h2 class="profile-name">Phoebe Caulfield</h2>
            <div class="profile-accent"></div>
            <p class="profile-description">Raclette knausgaard hella meggs normcore williamsburg enamel pin sartorial venmo tbh hot chicken gentrify portland.</p>
          </div>
        </div>
        <div class="content-text">
          <p class="main-text">Meggings portland fingerstache lyft, post-ironic fixie man bun banh mi umami everyday carry hexagon locavore direct trade art party. Locavore small batch listicle gastropub farm-to-table lumbersexual salvia messenger bag. Coloring book flannel truffaut craft beer drinking vinegar sartorial, disrupt fashion axe normcore meh butcher. Portland 90's scenester vexillologist forage post-ironic asymmetrical, chartreuse disrupt butcher paleo intelligentsia pabst before they sold out four loko. 3 wolf moon brooklyn.</p>
          <a class="learn-more-link">Learn More
            <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="link-icon" viewBox="0 0 24 24">
              <path d="M5 12h14M12 5l7 7-7 7"></path>
            </svg>
          </a>
        </div>
      </div>
    </div>
  </div>
</section>`;

const style = `.content-details {
  color: #718096;
  padding: 96px 0;
}

.content-details .content-container {
  max-width: 1200px;
  padding: 0 20px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
}

.content-details .content-wrapper {
  width: 100%;
}

@media (min-width: 1024px) {
  .content-details .content-wrapper {
    width: 83.333333%;
    margin: 0 auto;
  }
}

.content-details .hero-image {
  border-radius: 8px;
  height: 256px;
  overflow: hidden;
  margin-bottom: 40px;
}

.content-details .hero-img {
  object-fit: cover;
  object-position: center;
  height: 100%;
  width: 100%;
}

.content-details .content-section {
  display: flex;
  flex-direction: column;
}

@media (min-width: 640px) {
  .content-details .content-section {
    flex-direction: row;
  }
}

.content-details .profile-section {
  width: 100%;
  text-align: center;
  padding-right: 0;
  padding: 32px 0;
  margin-bottom: 16px;
  padding-top: 16px;
  border-top: 1px solid #e2e8f0;
}

@media (min-width: 640px) {
  .content-details .profile-section {
    width: 33.333333%;
    padding-right: 32px;
    border-right: 1px solid #e2e8f0;
    border-top: none;
    margin-bottom: 0;
    padding-top: 32px;
  }
}

.content-details .profile-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background-color: #e2e8f0;
  color: #a0aec0;
  margin-bottom: 16px;
}

.content-details .avatar-icon {
  width: 40px;
  height: 40px;
}

.content-details .profile-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  justify-content: center;
}

.content-details .profile-name {
  font-weight: 500;
  margin-top: 16px;
  color: #1a202c;
  font-size: 18px;
}

.content-details .profile-accent {
  width: 48px;
  height: 4px;
  background-color: #667eea;
  border-radius: 2px;
  margin: 8px 0 16px 0;
}

.content-details .profile-description {
  font-size: 16px;
  color: #4a5568;
  line-height: 1.6;
}

.content-details .content-text {
  width: 100%;
  padding-left: 0;
  border-left: none;
  border-top: 1px solid #e2e8f0;
  margin-top: 16px;
  padding-top: 16px;
  text-align: center;
}

@media (min-width: 640px) {
  .content-details .content-text {
    width: 66.666667%;
    padding-left: 32px;
    border-left: 1px solid #e2e8f0;
    border-top: none;
    margin-top: 0;
    padding-top: 32px;
    text-align: left;
  }
}

.content-details .main-text {
  line-height: 1.6;
  font-size: 18px;
  margin-bottom: 16px;
  color: #4a5568;
}

.content-details .learn-more-link {
  color: #667eea;
  display: inline-flex;
  align-items: center;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s ease;
  cursor: pointer;
}

.content-details .learn-more-link:hover {
  color: #5a67d8;
}

.content-details .link-icon {
  width: 16px;
  height: 16px;
  margin-left: 8px;
}

/* Mobile responsiveness */
@media (max-width: 639px) {
  .content-details {
    padding: 48px 0;
  }
  
  .content-details .content-container {
    padding: 0 16px;
  }
  
  .content-details .hero-image {
    height: 200px;
    margin-bottom: 24px;
  }
  
  .content-details .profile-section {
    padding: 24px 0 16px 0;
  }
  
  .content-details .content-text {
    padding-top: 16px;
  }
}`;

export class ContentDetailsEl extends ArchitectElement {
  name = 'Content Details';
  contentCategories = ['flow'];
  html = template;
  css = style;
  allowedContent = ['flow'];
  category = 'prebuilt-blocks';
  icon = (<DescriptionIcon />);
  specificity = 3;
  hiddenClasses = ['content-details'];
  
  matcher(node: HTMLElement) {
    return hasClass(node, 'content-details');
  }
} 