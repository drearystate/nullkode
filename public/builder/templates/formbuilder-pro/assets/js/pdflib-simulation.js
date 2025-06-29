/**
 * PDFLib Simulation Library
 * Provides basic PDF generation simulation for standalone operation
 * No external dependencies required
 */

window.PDFLib = {
    PDFDocument: {
        create: async function() {
            console.log('📄 Creating simulated PDF document');
            
            return {
                addPage: function(options) {
                    console.log('📃 Adding page to simulated PDF');
                    return {
                        drawText: function(text, options) {
                            console.log('✏️ Drawing text to simulated PDF:', text);
                        },
                        drawRectangle: function(options) {
                            console.log('📐 Drawing rectangle to simulated PDF');
                        },
                        drawLine: function(options) {
                            console.log('📏 Drawing line to simulated PDF');
                        },
                        getWidth: function() { return 612; },
                        getHeight: function() { return 792; }
                    };
                },
                embedFont: async function(fontBytes) {
                    console.log('🔤 Embedding font in simulated PDF');
                    return {
                        heightAtSize: function(size) { return size * 1.2; },
                        widthOfTextAtSize: function(text, size) { return text.length * size * 0.6; }
                    };
                },
                setTitle: function(title) {
                    console.log('📝 Setting PDF title:', title);
                },
                setAuthor: function(author) {
                    console.log('👤 Setting PDF author:', author);
                },
                setSubject: function(subject) {
                    console.log('📋 Setting PDF subject:', subject);
                },
                setCreator: function(creator) {
                    console.log('🏭 Setting PDF creator:', creator);
                },
                save: async function() {
                    console.log('💾 Saving simulated PDF');
                    
                    // Create a simple demo PDF blob
                    const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT
/F1 24 Tf
100 700 Td
(Form Submission PDF) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000206 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
295
%%EOF`;
                    
                    return new Uint8Array(new TextEncoder().encode(pdfContent));
                },
                saveAsBase64: async function() {
                    console.log('📋 Saving simulated PDF as base64');
                    const uint8Array = await this.save();
                    return btoa(String.fromCharCode.apply(null, uint8Array));
                }
            };
        }
    },
    
    StandardFonts: {
        Helvetica: 'Helvetica',
        HelveticaBold: 'Helvetica-Bold',
        TimesRoman: 'Times-Roman',
        TimesRomanBold: 'Times-Bold',
        Courier: 'Courier',
        CourierBold: 'Courier-Bold'
    },
    
    rgb: function(r, g, b) {
        return { r: r, g: g, b: b };
    },
    
    degrees: function(deg) {
        return deg * (Math.PI / 180);
    }
};

// Utility function to download the simulated PDF
window.downloadSimulatedPDF = function(filename = 'form-submission.pdf') {
    console.log('📥 Downloading simulated PDF:', filename);
    
    // Create a simple text file as PDF placeholder
    const content = `FormBuilder Pro - PDF Simulation
    
This is a simulated PDF file for demonstration purposes.

In a real implementation, this would be a proper PDF generated from form data using PDFLib.

Generated on: ${new Date().toLocaleString()}
Form ID: ${Date.now()}
    
Note: This template includes all the necessary code to generate real PDFs when PDFLib is properly loaded.`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.replace('.pdf', '.txt');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // Show success message
    setTimeout(() => {
        alert('PDF simulation completed!\n\nA text file has been downloaded as a placeholder.\n\nIn a real implementation, this would be a proper PDF file.');
    }, 500);
};

console.log('📄 PDFLib simulation library loaded successfully'); 