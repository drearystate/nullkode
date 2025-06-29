import {ArchitectElement} from '../architect-element';
import {hasClass} from '../../utils/has-class';
import {PhotoLibraryIcon} from '@common/icons/material/PhotoLibrary';

const template = `<div class="image-gallery">
  <div class="gallery-container">
    <div class="gallery-header">
      <h3>Photo Gallery</h3>
      <div class="gallery-controls">
        <button class="filter-btn active" data-filter="all">All</button>
        <button class="filter-btn" data-filter="nature">Nature</button>
        <button class="filter-btn" data-filter="city">City</button>
        <button class="filter-btn" data-filter="people">People</button>
      </div>
    </div>
    
    <div class="gallery-grid">
      <div class="gallery-item" data-category="nature">
        <img src="/images/builder/placeholder.svg" alt="Nature 1">
        <div class="gallery-overlay">
          <div class="overlay-content">
            <h4>Beautiful Landscape</h4>
            <p>Stunning mountain view</p>
            <button class="view-btn">
              <i class="fa fa-eye"></i> View
            </button>
          </div>
        </div>
      </div>
      
      <div class="gallery-item" data-category="city">
        <img src="/images/builder/placeholder.svg" alt="City 1">
        <div class="gallery-overlay">
          <div class="overlay-content">
            <h4>Urban Architecture</h4>
            <p>Modern city skyline</p>
            <button class="view-btn">
              <i class="fa fa-eye"></i> View
            </button>
          </div>
        </div>
      </div>
      
      <div class="gallery-item" data-category="people">
        <img src="/images/builder/placeholder.svg" alt="People 1">
        <div class="gallery-overlay">
          <div class="overlay-content">
            <h4>Portrait Photography</h4>
            <p>Capturing human emotion</p>
            <button class="view-btn">
              <i class="fa fa-eye"></i> View
            </button>
          </div>
        </div>
      </div>
      
      <div class="gallery-item" data-category="nature">
        <img src="/images/builder/placeholder.svg" alt="Nature 2">
        <div class="gallery-overlay">
          <div class="overlay-content">
            <h4>Forest Path</h4>
            <p>Peaceful woodland trail</p>
            <button class="view-btn">
              <i class="fa fa-eye"></i> View
            </button>
          </div>
        </div>
      </div>
      
      <div class="gallery-item" data-category="city">
        <img src="/images/builder/placeholder.svg" alt="City 2">
        <div class="gallery-overlay">
          <div class="overlay-content">
            <h4>Night Lights</h4>
            <p>City illuminated at night</p>
            <button class="view-btn">
              <i class="fa fa-eye"></i> View
            </button>
          </div>
        </div>
      </div>
      
      <div class="gallery-item" data-category="people">
        <img src="/images/builder/placeholder.svg" alt="People 2">
        <div class="gallery-overlay">
          <div class="overlay-content">
            <h4>Group Photo</h4>
            <p>Friends having fun</p>
            <button class="view-btn">
              <i class="fa fa-eye"></i> View
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <div class="gallery-pagination">
      <button class="pagination-btn" id="prevPage">
        <i class="fa fa-chevron-left"></i>
      </button>
      <div class="page-info">
        <span class="current-page">1</span> / <span class="total-pages">3</span>
      </div>
      <button class="pagination-btn" id="nextPage">
        <i class="fa fa-chevron-right"></i>
      </button>
    </div>
  </div>
  
  <!-- Lightbox Modal -->
  <div class="lightbox-modal" id="lightboxModal">
    <div class="lightbox-content">
      <button class="lightbox-close">&times;</button>
      <img src="" alt="" id="lightboxImage">
      <div class="lightbox-info">
        <h4 id="lightboxTitle"></h4>
        <p id="lightboxDescription"></p>
      </div>
      <div class="lightbox-nav">
        <button class="lightbox-btn prev-btn" id="lightboxPrev">
          <i class="fa fa-chevron-left"></i>
        </button>
        <button class="lightbox-btn next-btn" id="lightboxNext">
          <i class="fa fa-chevron-right"></i>
        </button>
      </div>
    </div>
  </div>
</div>`;

const style = `.image-gallery {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: #f8f9fa;
  padding: 30px;
  border-radius: 15px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  max-width: 1200px;
  margin: 0 auto;
}

.image-gallery .gallery-container {
  background: white;
  border-radius: 12px;
  padding: 30px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
}

.image-gallery .gallery-header {
  margin-bottom: 30px;
  text-align: center;
}

.image-gallery .gallery-header h3 {
  margin: 0 0 20px 0;
  font-size: 32px;
  font-weight: 700;
  color: #2c3e50;
  text-transform: uppercase;
  letter-spacing: 2px;
}

.image-gallery .gallery-controls {
  display: flex;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
}

.image-gallery .filter-btn {
  background: #f8f9fa;
  color: #6c757d;
  border: 2px solid #dee2e6;
  padding: 10px 20px;
  border-radius: 25px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.image-gallery .filter-btn:hover,
.image-gallery .filter-btn.active {
  background: #007bff;
  color: white;
  border-color: #007bff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3);
}

.image-gallery .gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 25px;
  margin-bottom: 30px;
}

.image-gallery .gallery-item {
  position: relative;
  aspect-ratio: 4/3;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
  cursor: pointer;
}

.image-gallery .gallery-item:hover {
  transform: translateY(-5px);
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.2);
}

.image-gallery .gallery-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.image-gallery .gallery-item:hover img {
  transform: scale(1.1);
}

.image-gallery .gallery-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(0, 123, 255, 0.9), rgba(108, 92, 231, 0.9));
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.image-gallery .gallery-item:hover .gallery-overlay {
  opacity: 1;
}

.image-gallery .overlay-content {
  text-align: center;
  color: white;
  padding: 20px;
}

.image-gallery .overlay-content h4 {
  margin: 0 0 10px 0;
  font-size: 20px;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.image-gallery .overlay-content p {
  margin: 0 0 15px 0;
  font-size: 14px;
  opacity: 0.9;
}

.image-gallery .view-btn {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 2px solid rgba(255, 255, 255, 0.3);
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.image-gallery .view-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.5);
  transform: scale(1.05);
}

.image-gallery .gallery-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
}

.image-gallery .pagination-btn {
  background: #007bff;
  color: white;
  border: none;
  width: 45px;
  height: 45px;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}

.image-gallery .pagination-btn:hover {
  background: #0056b3;
  transform: scale(1.1);
}

.image-gallery .pagination-btn:disabled {
  background: #dee2e6;
  color: #6c757d;
  cursor: not-allowed;
  transform: none;
}

.image-gallery .page-info {
  font-size: 16px;
  font-weight: 600;
  color: #495057;
}

.image-gallery .current-page {
  color: #007bff;
  font-weight: 700;
}

/* Lightbox Modal */
.image-gallery .lightbox-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.9);
  display: none;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(5px);
}

.image-gallery .lightbox-modal.active {
  display: flex;
}

.image-gallery .lightbox-content {
  position: relative;
  max-width: 90%;
  max-height: 90%;
  background: white;
  border-radius: 15px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.image-gallery .lightbox-close {
  position: absolute;
  top: 15px;
  right: 15px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  font-size: 24px;
  cursor: pointer;
  z-index: 10001;
  transition: all 0.3s ease;
}

.image-gallery .lightbox-close:hover {
  background: rgba(0, 0, 0, 0.9);
  transform: rotate(90deg);
}

.image-gallery #lightboxImage {
  width: 100%;
  height: auto;
  max-height: 70vh;
  object-fit: contain;
}

.image-gallery .lightbox-info {
  padding: 20px;
  text-align: center;
}

.image-gallery .lightbox-info h4 {
  margin: 0 0 10px 0;
  font-size: 24px;
  font-weight: 700;
  color: #2c3e50;
}

.image-gallery .lightbox-info p {
  margin: 0;
  font-size: 16px;
  color: #6c757d;
}

.image-gallery .lightbox-nav {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  transform: translateY(-50%);
  display: flex;
  justify-content: space-between;
  padding: 0 20px;
  pointer-events: none;
}

.image-gallery .lightbox-btn {
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border: none;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.3s ease;
  pointer-events: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.image-gallery .lightbox-btn:hover {
  background: rgba(0, 0, 0, 0.9);
  transform: scale(1.1);
}

/* Hidden by default - will be shown by filter */
.image-gallery .gallery-item.hidden {
  display: none;
}

@media (max-width: 768px) {
  .image-gallery {
    padding: 20px;
  }
  
  .image-gallery .gallery-container {
    padding: 20px;
  }
  
  .image-gallery .gallery-header h3 {
    font-size: 24px;
  }
  
  .image-gallery .gallery-grid {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 15px;
  }
  
  .image-gallery .filter-btn {
    padding: 8px 16px;
    font-size: 12px;
  }
  
  .image-gallery .overlay-content h4 {
    font-size: 16px;
  }
  
  .image-gallery .overlay-content p {
    font-size: 12px;
  }
  
  .image-gallery .lightbox-content {
    max-width: 95%;
    max-height: 95%;
  }
  
  .image-gallery .lightbox-nav {
    padding: 0 10px;
  }
  
  .image-gallery .lightbox-btn {
    width: 40px;
    height: 40px;
    font-size: 16px;
  }
}

@media (max-width: 480px) {
  .image-gallery .gallery-grid {
    grid-template-columns: 1fr;
  }
  
  .image-gallery .gallery-controls {
    gap: 5px;
  }
  
  .image-gallery .filter-btn {
    padding: 6px 12px;
    font-size: 11px;
  }
}`;

export class ImageGalleryEl extends ArchitectElement {
  name = 'image gallery';
  contentCategories = ['flow'];
  html = template;
  css = style;
  allowedContent = [];
  category = 'media';
  icon = <PhotoLibraryIcon />;
  specificity = 3;
  hiddenClasses = ['image-gallery'];
  matcher(node: HTMLElement) {
    return hasClass(node, 'image-gallery');
  }
} 