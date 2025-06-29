import {ArchitectElement} from '../architect-element';
import {CreateIcon} from '@common/icons/material/Create';

const template = `<div class="signature-pad-container">
  <label class="form-label">Digital Signature</label>
  <div class="signature-pad">
    <canvas id="signaturePad" width="400" height="200" style="border: 2px solid #ddd; border-radius: 8px; background: white;"></canvas>
    <div class="signature-controls mt-2">
      <button type="button" class="btn btn-sm btn-secondary" onclick="clearSignature(this)">
        <i class="fas fa-eraser"></i> Clear
      </button>
      <button type="button" class="btn btn-sm btn-outline-primary" onclick="saveSignature(this)">
        <i class="fas fa-save"></i> Save
      </button>
    </div>
    <input type="hidden" name="signature" class="signature-data">
    <div class="signature-status text-muted small mt-1">Click and drag to sign</div>
  </div>
</div>

<style>
.signature-pad-container {
  margin: 20px 0;
}

.signature-pad {
  display: inline-block;
  position: relative;
}

.signature-pad canvas {
  cursor: crosshair;
  display: block;
}

.signature-pad canvas:hover {
  border-color: #0d6efd;
}

.signature-controls {
  text-align: center;
}

.signature-status.signed {
  color: #28a745;
  font-weight: 500;
}

.signature-status.error {
  color: #dc3545;
}
</style>

<script>
// Signature Pad Implementation
function initializeSignaturePad(canvas) {
  if (!canvas || canvas.signaturePad) return;
  
  const ctx = canvas.getContext('2d');
  let isDrawing = false;
  let lastX = 0;
  let lastY = 0;
  
  // Set up canvas context
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  canvas.signaturePad = {
    isEmpty: true,
    clear: function() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      this.isEmpty = true;
      const hiddenInput = canvas.closest('.signature-pad-container').querySelector('.signature-data');
      if (hiddenInput) hiddenInput.value = '';
      updateStatus(canvas, 'Click and drag to sign', '');
    },
    save: function() {
      if (this.isEmpty) {
        updateStatus(canvas, 'Please provide a signature first', 'error');
        return false;
      }
      const dataURL = canvas.toDataURL('image/png');
      const hiddenInput = canvas.closest('.signature-pad-container').querySelector('.signature-data');
      if (hiddenInput) hiddenInput.value = dataURL;
      updateStatus(canvas, 'Signature saved successfully', 'signed');
      return true;
    }
  };
  
  function startDrawing(e) {
    isDrawing = true;
    [lastX, lastY] = getCoordinates(e);
    canvas.signaturePad.isEmpty = false;
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
      updateStatus(canvas, 'Signature captured - click Save to confirm', '');
    }
  }
  
  function getCoordinates(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    return [
      clientX - rect.left,
      clientY - rect.top
    ];
  }
  
  function updateStatus(canvas, message, className) {
    const status = canvas.closest('.signature-pad-container').querySelector('.signature-status');
    if (status) {
      status.textContent = message;
      status.className = 'signature-status text-muted small mt-1';
      if (className) status.classList.add(className);
    }
  }
  
  // Mouse events
  canvas.addEventListener('mousedown', startDrawing);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', stopDrawing);
  canvas.addEventListener('mouseout', stopDrawing);
  
  // Touch events for mobile
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

// Global functions for button controls
window.clearSignature = function(button) {
  const canvas = button.closest('.signature-pad-container').querySelector('canvas');
  if (canvas && canvas.signaturePad) {
    canvas.signaturePad.clear();
  }
};

window.saveSignature = function(button) {
  const canvas = button.closest('.signature-pad-container').querySelector('canvas');
  if (canvas && canvas.signaturePad) {
    return canvas.signaturePad.save();
  }
  return false;
};

// Auto-initialize signature pads
function initializeAllSignaturePads() {
  const canvases = document.querySelectorAll('.signature-pad canvas');
  canvases.forEach(canvas => {
    if (!canvas.signaturePad) {
      initializeSignaturePad(canvas);
    }
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeAllSignaturePads);
} else {
  initializeAllSignaturePads();
}

// Export for manual initialization
window.initializeSignaturePad = initializeSignaturePad;
window.initializeAllSignaturePads = initializeAllSignaturePads;
</script>`;

export class SignaturePadEl extends ArchitectElement {
  name = 'Signature Pad';
  html = template;
  contentCategories = [
    'flow',
    'interactive',
    'listed',
    'submittable',
    'resettable',
    'form-associated',
  ];
  allowedContent = [];
  category = 'forms';
  icon = (<CreateIcon />);
  specificity = 3;
  hiddenClasses = ['signature-pad-container', 'signature-pad', 'signature-controls'];
  matcher(node: HTMLElement) {
    return node.querySelector('canvas#signaturePad') !== null ||
           node.classList.contains('signature-pad-container');
  }
} 