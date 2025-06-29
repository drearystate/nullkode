import {ArchitectElement} from '../architect-element';
import {hasClass} from '../../utils/has-class';
import {CreateIcon} from '@common/icons/material/Create';

const template = `<div class="initials-field">
  <label class="form-label">Initials</label>
  <div class="initials-pad border rounded text-center p-2" style="height: 60px; background: #f8f9fa; cursor: pointer; position: relative;">
    <canvas id="initialsPad" width="150" height="40" style="position: absolute; top: 10px; left: 50%; transform: translateX(-50%);"></canvas>
    <div class="initials-placeholder text-muted" style="line-height: 40px; font-size: 0.875rem;">
      <i class="fas fa-pen-fancy me-1"></i>
      Click to add initials
    </div>
  </div>
  <div class="mt-2">
    <button type="button" class="btn btn-sm btn-outline-secondary" onclick="clearInitials(this)">
      <i class="fas fa-eraser me-1"></i>Clear
    </button>
  </div>
  <input type="hidden" name="initials" class="initials-data">
</div>

<style>
.initials-field {
  margin: 20px 0;
}

.initials-pad {
  display: inline-block;
  position: relative;
}

.initials-pad canvas {
  cursor: crosshair;
  display: block;
}

.initials-pad canvas:hover {
  border-color: #0d6efd;
}
</style>

<script>
// Initialize initials pads
function initializeInitialsPad(canvas) {
  if (!canvas || canvas.initialsPad) return;
  
  const ctx = canvas.getContext('2d');
  let isDrawing = false;
  let lastX = 0;
  let lastY = 0;
  
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  canvas.initialsPad = {
    isEmpty: true,
    clear: function() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      this.isEmpty = true;
      const hiddenInput = canvas.closest('.initials-field').querySelector('.initials-data');
      if (hiddenInput) hiddenInput.value = '';
    }
  };
  
  function startDrawing(e) {
    isDrawing = true;
    [lastX, lastY] = getCoordinates(e);
    canvas.initialsPad.isEmpty = false;
  }
  
  function draw(e) {
    if (!isDrawing) return;
    const [currentX, currentY] = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(currentX, currentY);
    ctx.stroke();
    [lastX, lastY] = [currentX, currentY];
  }
  
  function stopDrawing() {
    if (isDrawing) {
      isDrawing = false;
      const dataURL = canvas.toDataURL('image/png');
      const hiddenInput = canvas.closest('.initials-field').querySelector('.initials-data');
      if (hiddenInput) hiddenInput.value = dataURL;
    }
  }
  
  function getCoordinates(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    return [clientX - rect.left, clientY - rect.top];
  }
  
  canvas.addEventListener('mousedown', startDrawing);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', stopDrawing);
  canvas.addEventListener('mouseout', stopDrawing);
  
  // Touch events
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    startDrawing(e);
  });
  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    draw(e);
  });
  canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    stopDrawing();
  });
}

window.clearInitials = function(button) {
  const canvas = button.closest('.initials-field').querySelector('canvas');
  if (canvas && canvas.initialsPad) {
    canvas.initialsPad.clear();
  }
};

function initializeAllInitialsPads() {
  const canvases = document.querySelectorAll('.initials-field canvas');
  canvases.forEach(canvas => {
    if (!canvas.initialsPad) {
      initializeInitialsPad(canvas);
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeAllInitialsPads);
} else {
  initializeAllInitialsPads();
}

window.initializeInitialsPad = initializeInitialsPad;
window.initializeAllInitialsPads = initializeAllInitialsPads;
</script>`;

export class InitialsEl extends ArchitectElement {
  name = 'Initials Field';
  contentCategories = ['flow'];
  html = template;
  allowedContent = [];
  category = 'forms';
  icon = (<CreateIcon />);
  specificity = 4;
  hiddenClasses = ['initials-field'];
  matcher(node: HTMLElement) {
    return hasClass(node, 'initials-field');
  }
} 