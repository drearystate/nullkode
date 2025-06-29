/**
 * Real PDF Generator for FormBuilder Pro
 * Uses PDFLib to create actual PDF documents
 */

class PDFGenerator {
    constructor() {
        this.pdfLib = null;
        this.initializePDFLib();
    }

    async initializePDFLib() {
        try {
            if (!window.PDFLib) {
                await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js');
            }
            this.pdfLib = window.PDFLib;
            console.log('✅ PDFLib initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize PDFLib:', error);
        }
    }

    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    async createFormSubmissionPDF(formData, options = {}) {
        try {
            if (!this.pdfLib) {
                throw new Error('PDFLib not initialized');
            }

            const {
                title = 'Form Submission',
                author = 'FormBuilder Pro',
                watermark = '',
                includeSignature = false,
                signatureDataURL = null
            } = options;

            // Create PDF document
            const pdfDoc = await this.pdfLib.PDFDocument.create();
            
            // Set document metadata
            pdfDoc.setTitle(title);
            pdfDoc.setAuthor(author);
            pdfDoc.setCreator('FormBuilder Pro');
            pdfDoc.setProducer('FormBuilder Pro PDF Generator');
            pdfDoc.setCreationDate(new Date());

            // Add first page
            const page = pdfDoc.addPage([612, 792]); // Standard letter size
            const { width, height } = page.getSize();

            // Embed fonts
            const helveticaFont = await pdfDoc.embedFont(this.pdfLib.StandardFonts.Helvetica);
            const helveticaBoldFont = await pdfDoc.embedFont(this.pdfLib.StandardFonts.HelveticaBold);

            let yPosition = height - 50;

            // Add title
            page.drawText(title, {
                x: 50,
                y: yPosition,
                size: 24,
                font: helveticaBoldFont,
                color: this.pdfLib.rgb(0.15, 0.39, 0.92) // Blue color
            });

            yPosition -= 40;

            // Add submission date
            const submissionDate = new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            page.drawText(`Submitted: ${submissionDate}`, {
                x: 50,
                y: yPosition,
                size: 12,
                font: helveticaFont,
                color: this.pdfLib.rgb(0.4, 0.4, 0.4)
            });

            yPosition -= 30;

            // Add form data
            page.drawText('Form Data:', {
                x: 50,
                y: yPosition,
                size: 16,
                font: helveticaBoldFont,
                color: this.pdfLib.rgb(0, 0, 0)
            });

            yPosition -= 25;

            // Draw form fields
            for (const [key, value] of Object.entries(formData)) {
                if (yPosition < 100) {
                    // Add new page if needed
                    const newPage = pdfDoc.addPage([612, 792]);
                    yPosition = height - 50;
                    
                    // Continue on new page
                    this.drawFormField(newPage, key, value, 50, yPosition, helveticaFont, helveticaBoldFont);
                } else {
                    this.drawFormField(page, key, value, 50, yPosition, helveticaFont, helveticaBoldFont);
                }
                yPosition -= 30;
            }

            // Add signature if provided
            if (includeSignature && signatureDataURL) {
                await this.addSignatureToPDF(pdfDoc, page, signatureDataURL, yPosition);
            }

            // Add watermark if specified
            if (watermark) {
                this.addWatermark(page, watermark, width, height, helveticaFont);
            }

            // Generate PDF
            const pdfBytes = await pdfDoc.save();
            return pdfBytes;

        } catch (error) {
            console.error('Error creating PDF:', error);
            throw error;
        }
    }

    drawFormField(page, key, value, x, y, regularFont, boldFont) {
        // Format field name
        const fieldName = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
        
        // Draw field label
        page.drawText(`${fieldName}:`, {
            x: x,
            y: y,
            size: 12,
            font: boldFont,
            color: this.pdfLib.rgb(0, 0, 0)
        });

        // Draw field value
        const valueText = String(value || 'N/A');
        const maxWidth = 400;
        const wrappedText = this.wrapText(valueText, maxWidth, regularFont, 11);
        
        let currentY = y - 15;
        wrappedText.forEach(line => {
            page.drawText(line, {
                x: x + 20,
                y: currentY,
                size: 11,
                font: regularFont,
                color: this.pdfLib.rgb(0.2, 0.2, 0.2)
            });
            currentY -= 14;
        });
    }

    async addSignatureToPDF(pdfDoc, page, signatureDataURL, yPosition) {
        try {
            // Convert data URL to bytes
            const signatureBytes = this.dataURLToBytes(signatureDataURL);
            
            // Embed signature image
            let signatureImage;
            if (signatureDataURL.includes('data:image/png')) {
                signatureImage = await pdfDoc.embedPng(signatureBytes);
            } else {
                signatureImage = await pdfDoc.embedJpg(signatureBytes);
            }

            // Calculate signature dimensions
            const signatureDims = signatureImage.scale(0.5);

            // Add signature label
            const helveticaBoldFont = await pdfDoc.embedFont(this.pdfLib.StandardFonts.HelveticaBold);
            page.drawText('Digital Signature:', {
                x: 50,
                y: yPosition - 40,
                size: 12,
                font: helveticaBoldFont,
                color: this.pdfLib.rgb(0, 0, 0)
            });

            // Draw signature
            page.drawImage(signatureImage, {
                x: 50,
                y: yPosition - 100,
                width: signatureDims.width,
                height: signatureDims.height
            });

        } catch (error) {
            console.error('Error adding signature to PDF:', error);
        }
    }

    addWatermark(page, watermarkText, width, height, font) {
        // Add diagonal watermark
        page.drawText(watermarkText, {
            x: width / 2 - 100,
            y: height / 2,
            size: 48,
            font: font,
            color: this.pdfLib.rgb(0.9, 0.9, 0.9),
            rotate: this.pdfLib.degrees(-45),
            opacity: 0.3
        });
    }

    wrapText(text, maxWidth, font, fontSize) {
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';

        words.forEach(word => {
            const testLine = currentLine + (currentLine ? ' ' : '') + word;
            const textWidth = font.widthOfTextAtSize(testLine, fontSize);
            
            if (textWidth <= maxWidth) {
                currentLine = testLine;
            } else {
                if (currentLine) {
                    lines.push(currentLine);
                }
                currentLine = word;
            }
        });

        if (currentLine) {
            lines.push(currentLine);
        }

        return lines;
    }

    dataURLToBytes(dataURL) {
        const base64 = dataURL.split(',')[1];
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        
        return bytes;
    }

    async downloadPDF(pdfBytes, filename = 'document.pdf') {
        try {
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            URL.revokeObjectURL(url);
            
            console.log('PDF downloaded successfully:', filename);
        } catch (error) {
            console.error('Error downloading PDF:', error);
            throw error;
        }
    }

    async generateFormPDF(formData, options = {}) {
        try {
            const pdfBytes = await this.createFormSubmissionPDF(formData, options);
            const filename = `form-submission-${Date.now()}.pdf`;
            await this.downloadPDF(pdfBytes, filename);
            
            if (window.configManager) {
                window.configManager.showNotification('PDF generated and downloaded successfully!', 'success');
            }
            
            return { success: true, filename };
        } catch (error) {
            console.error('Error generating form PDF:', error);
            
            if (window.configManager) {
                window.configManager.showNotification('Failed to generate PDF: ' + error.message, 'error');
            }
            
            return { success: false, error: error.message };
        }
    }
}

// Initialize global PDF generator
window.pdfGenerator = new PDFGenerator();

console.log('📄 Real PDF Generator loaded successfully'); 