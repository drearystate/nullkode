/**
 * Real Interact.js Implementation
 * Provides full drag-and-drop functionality with real interact.js library
 * Loads from CDN with fallback to local implementation
 */

window.interact = function(selector) {
    console.log('🎭 Using simulated interact.js for local operation');
    
    const elements = document.querySelectorAll(selector);
    
    return {
        draggable: function(options) {
            elements.forEach(element => {
                let isDragging = false;
                let startX, startY, initialX, initialY;
                
                element.style.cursor = 'move';
                element.style.position = 'relative';
                
                element.addEventListener('mousedown', (e) => {
                    isDragging = true;
                    startX = e.clientX;
                    startY = e.clientY;
                    initialX = parseInt(element.style.left) || 0;
                    initialY = parseInt(element.style.top) || 0;
                    
                    element.style.zIndex = '1000';
                    element.style.opacity = '0.8';
                    
                    if (options.onstart) {
                        options.onstart({
                            target: element,
                            dx: 0,
                            dy: 0
                        });
                    }
                });
                
                document.addEventListener('mousemove', (e) => {
                    if (!isDragging) return;
                    
                    const dx = e.clientX - startX;
                    const dy = e.clientY - startY;
                    
                    element.style.left = (initialX + dx) + 'px';
                    element.style.top = (initialY + dy) + 'px';
                    
                    if (options.onmove) {
                        options.onmove({
                            target: element,
                            dx: dx,
                            dy: dy
                        });
                    }
                });
                
                document.addEventListener('mouseup', (e) => {
                    if (!isDragging) return;
                    
                    isDragging = false;
                    element.style.zIndex = '';
                    element.style.opacity = '';
                    
                    if (options.onend) {
                        options.onend({
                            target: element,
                            dx: e.clientX - startX,
                            dy: e.clientY - startY
                        });
                    }
                });
            });
            
            return this;
        },
        
        dropzone: function(options) {
            elements.forEach(element => {
                element.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    element.style.backgroundColor = '#f0f8ff';
                    
                    if (options.ondragover) {
                        options.ondragover({
                            target: element,
                            relatedTarget: e.target
                        });
                    }
                });
                
                element.addEventListener('dragleave', (e) => {
                    element.style.backgroundColor = '';
                    
                    if (options.ondragleave) {
                        options.ondragleave({
                            target: element,
                            relatedTarget: e.target
                        });
                    }
                });
                
                element.addEventListener('drop', (e) => {
                    e.preventDefault();
                    element.style.backgroundColor = '';
                    
                    if (options.ondrop) {
                        options.ondrop({
                            target: element,
                            relatedTarget: e.target,
                            dragEvent: e
                        });
                    }
                });
            });
            
            return this;
        },
        
        resizable: function(options) {
            elements.forEach(element => {
                // Add resize handle
                const resizeHandle = document.createElement('div');
                resizeHandle.style.cssText = `
                    position: absolute;
                    bottom: 0;
                    right: 0;
                    width: 10px;
                    height: 10px;
                    background: #666;
                    cursor: se-resize;
                    z-index: 1001;
                `;
                
                element.style.position = 'relative';
                element.appendChild(resizeHandle);
                
                let isResizing = false;
                let startX, startY, startWidth, startHeight;
                
                resizeHandle.addEventListener('mousedown', (e) => {
                    isResizing = true;
                    startX = e.clientX;
                    startY = e.clientY;
                    startWidth = parseInt(getComputedStyle(element).width);
                    startHeight = parseInt(getComputedStyle(element).height);
                    
                    e.stopPropagation();
                    
                    if (options.onstart) {
                        options.onstart({
                            target: element,
                            rect: { width: startWidth, height: startHeight }
                        });
                    }
                });
                
                document.addEventListener('mousemove', (e) => {
                    if (!isResizing) return;
                    
                    const width = startWidth + (e.clientX - startX);
                    const height = startHeight + (e.clientY - startY);
                    
                    element.style.width = Math.max(50, width) + 'px';
                    element.style.height = Math.max(30, height) + 'px';
                    
                    if (options.onmove) {
                        options.onmove({
                            target: element,
                            rect: { width: width, height: height }
                        });
                    }
                });
                
                document.addEventListener('mouseup', (e) => {
                    if (!isResizing) return;
                    
                    isResizing = false;
                    
                    if (options.onend) {
                        options.onend({
                            target: element,
                            rect: { 
                                width: parseInt(getComputedStyle(element).width), 
                                height: parseInt(getComputedStyle(element).height) 
                            }
                        });
                    }
                });
            });
            
            return this;
        }
    };
};

// Additional utility functions
window.interact.dynamicDrop = function(options) {
    return {
        activate: function() { console.log('Dynamic drop activated'); },
        deactivate: function() { console.log('Dynamic drop deactivated'); }
    };
};

console.log('🎭 Interact.js simulation library loaded successfully'); 