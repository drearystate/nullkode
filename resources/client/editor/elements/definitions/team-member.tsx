import {ArchitectElement} from '../architect-element';
import {hasClass} from '../../utils/has-class';
import {PersonIcon} from '@common/icons/material/Person';

const template = `<div class="team-member">
  <div class="member-card">
    <div class="member-image">
      <img src="/images/builder/placeholder.svg" alt="Team Member">
      <div class="member-overlay">
        <div class="social-links">
          <a href="#" class="social-link">
            <i class="fa fa-facebook"></i>
          </a>
          <a href="#" class="social-link">
            <i class="fa fa-twitter"></i>
          </a>
          <a href="#" class="social-link">
            <i class="fa fa-linkedin"></i>
          </a>
        </div>
      </div>
    </div>
    <div class="member-info">
      <h3 class="member-name">John Doe</h3>
      <p class="member-position">Senior Developer</p>
      <p class="member-description">Passionate about creating amazing user experiences and building scalable applications.</p>
      <div class="member-skills">
        <span class="skill-tag">React</span>
        <span class="skill-tag">Node.js</span>
        <span class="skill-tag">TypeScript</span>
      </div>
    </div>
  </div>
</div>`;

const style = `.team-member {
  max-width: 350px;
  margin: 0 auto;
}

.team-member .member-card {
  background: #fff;
  border-radius: 15px;
  overflow: hidden;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  position: relative;
}

.team-member .member-card:hover {
  transform: translateY(-10px);
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.15);
}

.team-member .member-image {
  position: relative;
  overflow: hidden;
  height: 280px;
}

.team-member .member-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.team-member .member-card:hover .member-image img {
  transform: scale(1.1);
}

.team-member .member-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(13, 110, 253, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.team-member .member-card:hover .member-overlay {
  opacity: 1;
}

.team-member .social-links {
  display: flex;
  gap: 15px;
}

.team-member .social-link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 45px;
  height: 45px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  color: white;
  text-decoration: none;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.team-member .social-link:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-3px);
}

.team-member .member-info {
  padding: 30px 25px;
  text-align: center;
}

.team-member .member-name {
  font-size: 24px;
  font-weight: 700;
  color: #212529;
  margin: 0 0 8px 0;
}

.team-member .member-position {
  font-size: 16px;
  color: #0d6efd;
  font-weight: 600;
  margin: 0 0 15px 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.team-member .member-description {
  font-size: 14px;
  line-height: 1.6;
  color: #6c757d;
  margin: 0 0 20px 0;
}

.team-member .member-skills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}

.team-member .skill-tag {
  background: #f8f9fa;
  color: #495057;
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid #dee2e6;
  transition: all 0.3s ease;
}

.team-member .skill-tag:hover {
  background: #0d6efd;
  color: white;
  border-color: #0d6efd;
}`;

export class TeamMemberEl extends ArchitectElement {
  name = 'Team Member';
  contentCategories = ['flow'];
  html = template;
  css = style;
  allowedContent = ['flow'];
  category = 'components';
  icon = (<PersonIcon />);
  specificity = 3;
  hiddenClasses = ['team-member'];
  matcher(node: HTMLElement) {
    return hasClass(node, 'team-member');
  }
} 