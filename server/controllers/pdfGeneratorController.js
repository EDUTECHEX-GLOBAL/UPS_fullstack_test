// pdfGeneratorController.js - PDF GENERATION ONLY
import Document from '../models/documentModel.js';
import { formatDocumentType } from './documentController.js';
import fs from 'fs';

// @desc    Generate combined PDF supporting ALL file formats
// @desc    Generate combined PDF supporting ALL file formats
const generateStudentPDF = async (req, res) => {
  try {
    // Check if either admin or process admin is authenticated
    const isAdmin = req.admin || req.processAdmin;
    
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin or Process Admin privileges required.'
      });
    }

    const { studentId } = req.params;
    
    console.log(`Generating combined PDF for student: ${studentId}`);
    
    // Get all documents for this student
    const documents = await Document.find({ 
      userId: studentId 
    })
    .populate({
      path: 'userId',
      select: 'firstName lastName email phoneNumber _id',
      model: 'Account'
    })
    .sort({ documentType: 1, uploadDate: -1 });

    if (!documents || documents.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No documents found for this student'
      });
    }

    // Get student info
    const student = documents[0].userId;
    
    // Student name extraction
    let studentName = 'Unknown Student';
    let studentEmail = 'No email';
    
    if (student && typeof student === 'object') {
      const firstName = student.firstName || '';
      const lastName = student.lastName || '';
      
      if (firstName && lastName) {
        studentName = `${firstName} ${lastName}`.trim();
      } else if (firstName) {
        studentName = firstName;
      } else if (lastName) {
        studentName = lastName;
      } else if (student.email) {
        studentName = student.email.split('@')[0];
      }
      
      studentEmail = student.email || 'No email';
    }
    
    console.log(`Found ${documents.length} documents for ${studentName}`);

    // Create main PDF
    const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
    const mergedPdf = await PDFDocument.create();
    
    // Add cover page
    await addCompactCoverPage(mergedPdf, studentName, studentId, studentEmail, documents.length);
    
    // Process each document
    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      console.log(`Processing document ${i+1}: ${doc.fileName || doc.documentType}`);
      
      try {
        if (!doc.filePath || !fs.existsSync(doc.filePath)) {
          console.warn(`File not found: ${doc.filePath}`);
          await addDocumentWithHeader(mergedPdf, doc, i + 1, 'missing');
          continue;
        }
        
        // Get file extension
        const fileName = doc.fileName || '';
        const fileExtension = fileName.split('.').pop().toLowerCase();
        
        // Handle different file types WITH header on same page
        if (fileExtension === 'pdf') {
          // PDF: Embed directly WITH header
          await addPdfWithHeader(mergedPdf, doc, i + 1, doc.filePath);
        } 
        else if (['jpg', 'jpeg', 'png'].includes(fileExtension)) {
          // Images: Convert to PDF page WITH header
          await addImageWithHeader(mergedPdf, doc, i + 1, doc.filePath, fileExtension);
        }
        else if (['doc', 'docx'].includes(fileExtension)) {
          // Word documents: Show placeholder WITH header
          await addWordDocumentWithHeader(mergedPdf, doc, i + 1, fileExtension);
        }
        else if (['txt', 'rtf'].includes(fileExtension)) {
          // Text files: Embed text content WITH header
          await addTextFileWithHeader(mergedPdf, doc, i + 1, doc.filePath, fileExtension);
        }
        else {
          // Other formats: Show file info WITH header
          await addOtherFileWithHeader(mergedPdf, doc, i + 1, fileExtension);
        }
        
        console.log(`✓ Added ${doc.fileName} to PDF`);
        
      } catch (error) {
        console.error(`❌ Error processing ${doc.fileName}:`, error);
        await addErrorWithHeader(mergedPdf, doc, i + 1, error);
      }
    }

    // Save merged PDF
    const mergedPdfBytes = await mergedPdf.save();
    
    // Set response headers
    const timestamp = new Date().toISOString().split('T')[0];
    const fileName = `${studentName.replace(/\s+/g, '_')}_Documents_${timestamp}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', mergedPdfBytes.length);
    
    // Send the PDF
    res.send(Buffer.from(mergedPdfBytes));

    console.log(`✅ PDF generated for student ${studentId}: ${documents.length} documents compiled`);

  } catch (error) {
    console.error('❌ Error generating PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate PDF document',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Helper: Compact cover page
async function addCompactCoverPage(mergedPdf, studentName, studentId, studentEmail, totalDocs) {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const coverPage = await PDFDocument.create();
  const page = coverPage.addPage([595, 842]);
  const { width, height } = page.getSize();
  
  const fontBold = await coverPage.embedFont(StandardFonts.HelveticaBold);
  const font = await coverPage.embedFont(StandardFonts.Helvetica);
  
  // Title
  page.drawText('STUDENT APPLICATION DOCUMENTS', {
    x: 50,
    y: height - 70,
    size: 20,
    font: fontBold,
    color: rgb(0, 0.4, 0.7),
  });
  
  // Line under title
  page.drawLine({
    start: { x: 50, y: height - 80 },
    end: { x: width - 50, y: height - 80 },
    thickness: 2,
    color: rgb(0, 0.4, 0.7),
  });
  
  // Student info - Compact
  const infoBoxY = height - 130;
  const lineHeight = 22;
  
  page.drawText('Name:', {
    x: 50,
    y: infoBoxY,
    size: 12,
    font: fontBold,
    color: rgb(0.3, 0.3, 0.3),
  });
  
  page.drawText(studentName, {
    x: 120,
    y: infoBoxY,
    size: 14,
    font: font,
    color: rgb(0, 0, 0),
  });
  
  page.drawText('ID:', {
    x: 50,
    y: infoBoxY - lineHeight,
    size: 12,
    font: fontBold,
    color: rgb(0.3, 0.3, 0.3),
  });
  
  const displayId = studentId.length > 20 
    ? studentId.substring(0, 20) + '...' 
    : studentId;
    
  page.drawText(displayId, {
    x: 120,
    y: infoBoxY - lineHeight,
    size: 12,
    font: font,
    color: rgb(0.2, 0.2, 0.2),
  });
  
  page.drawText('Email:', {
    x: 50,
    y: infoBoxY - (lineHeight * 2),
    size: 12,
    font: fontBold,
    color: rgb(0.3, 0.3, 0.3),
  });
  
  page.drawText(studentEmail, {
    x: 120,
    y: infoBoxY - (lineHeight * 2),
    size: 12,
    font: font,
    color: rgb(0.2, 0.2, 0.2),
  });
  
  page.drawText('Documents:', {
    x: 50,
    y: infoBoxY - (lineHeight * 3),
    size: 12,
    font: fontBold,
    color: rgb(0.3, 0.3, 0.3),
  });
  
  page.drawText(totalDocs.toString(), {
    x: 120,
    y: infoBoxY - (lineHeight * 3),
    size: 14,
    font: fontBold,
    color: rgb(0, 0.4, 0.2),
  });
  
  // Generated date
  const generatedDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  page.drawText(`Generated: ${generatedDate}`, {
    x: 50,
    y: 60,
    size: 10,
    font: font,
    color: rgb(0.5, 0.5, 0.5),
  });
  
  page.drawText('Page 1', {
    x: width - 80,
    y: 60,
    size: 10,
    font: font,
    color: rgb(0.5, 0.5, 0.5),
  });
  
  // Add to merged PDF
  const [coverPdfPage] = await mergedPdf.copyPages(coverPage, [0]);
  mergedPdf.addPage(coverPdfPage);
}

// Helper: Add PDF with header on same page
async function addPdfWithHeader(mergedPdf, doc, docNumber, filePath) {
  const { PDFDocument } = await import('pdf-lib');
  
  try {
    // Read the PDF file
    const pdfBytes = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    
    // Get all pages from the PDF
    const pageIndices = pdfDoc.getPageIndices();
    
    if (pageIndices.length === 0) {
      console.warn(`  ⚠️ Empty PDF file`);
      await addDocumentWithHeader(mergedPdf, doc, docNumber, 'empty');
      return;
    }
    
    // For first page, add header to it
    if (pageIndices.length > 0) {
      // Copy first page
      const [firstPage] = await mergedPdf.copyPages(pdfDoc, [0]);
      
      // Create a new page with header
      const headerPage = await PDFDocument.create();
      const newPage = headerPage.addPage([595, 842]);
      const { width, height } = newPage.getSize();
      
      // Draw header
      await drawDocumentHeader(newPage, doc, docNumber, width, height);
      
      // Embed the first page content BELOW header
      const embeddedPage = await headerPage.embedPage(firstPage);
      
      // Calculate position for embedded page (below header)
      const headerHeight = 80; // Space for header
      const scale = Math.min(
        (width - 100) / embeddedPage.width,
        (height - headerHeight - 50) / embeddedPage.height
      );
      
      const scaledWidth = embeddedPage.width * scale;
      const scaledHeight = embeddedPage.height * scale;
      const x = (width - scaledWidth) / 2;
      const y = height - headerHeight - scaledHeight - 20;
      
      newPage.drawPage(embeddedPage, {
        x,
        y,
        width: scaledWidth,
        height: scaledHeight,
      });
      
      // Add this modified first page
      const [modifiedFirstPage] = await mergedPdf.copyPages(headerPage, [0]);
      mergedPdf.addPage(modifiedFirstPage);
      
      // Add remaining pages as-is
      if (pageIndices.length > 1) {
        const remainingPages = await mergedPdf.copyPages(pdfDoc, pageIndices.slice(1));
        remainingPages.forEach((page) => mergedPdf.addPage(page));
      }
      
      console.log(`  ✓ Embedded PDF with ${pageIndices.length} pages (header on first page)`);
    }
    
  } catch (error) {
    throw new Error(`Failed to load PDF: ${error.message}`);
  }
}

// Helper: Add image with header on same page
async function addImageWithHeader(mergedPdf, doc, docNumber, imagePath, imageType) {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  
  const imagePage = await PDFDocument.create();
  const page = imagePage.addPage([595, 842]);
  const { width, height } = page.getSize();
  
  // Draw header
  await drawDocumentHeader(page, doc, docNumber, width, height);
  
  try {
    // Read image file
    const imageBytes = fs.readFileSync(imagePath);
    
    let embeddedImage;
    if (imageType === 'jpg' || imageType === 'jpeg') {
      embeddedImage = await imagePage.embedJpg(imageBytes);
    } else if (imageType === 'png') {
      embeddedImage = await imagePage.embedPng(imageBytes);
    } else {
      const sharp = await import('sharp');
      const pngBuffer = await sharp(imageBytes).png().toBuffer();
      embeddedImage = await imagePage.embedPng(pngBuffer);
    }
    
    // Calculate dimensions to fit below header
    const headerHeight = 80;
    const margin = 20;
    const maxWidth = width - (2 * margin);
    const maxHeight = height - headerHeight - (2 * margin);
    
    let imageWidth = embeddedImage.width;
    let imageHeight = embeddedImage.height;
    
    // Scale if too large
    if (imageWidth > maxWidth || imageHeight > maxHeight) {
      const scale = Math.min(maxWidth / imageWidth, maxHeight / imageHeight);
      imageWidth *= scale;
      imageHeight *= scale;
    }
    
    // Center the image below header
    const x = (width - imageWidth) / 2;
    const y = height - headerHeight - imageHeight - margin;
    
    page.drawImage(embeddedImage, {
      x,
      y,
      width: imageWidth,
      height: imageHeight,
    });
    
    // Add to merged PDF
    const [imagePdfPage] = await mergedPdf.copyPages(imagePage, [0]);
    mergedPdf.addPage(imagePdfPage);
    
    console.log(`  ✓ Converted ${imageType.toUpperCase()} with header`);
    
  } catch (error) {
    throw new Error(`Failed to embed image: ${error.message}`);
  }
}

// Helper: Add Word document with header
async function addWordDocumentWithHeader(mergedPdf, doc, docNumber, fileType) {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const wordPage = await PDFDocument.create();
  const page = wordPage.addPage([595, 842]);
  const { width, height } = page.getSize();
  
  const fontBold = await wordPage.embedFont(StandardFonts.HelveticaBold);
  const font = await wordPage.embedFont(StandardFonts.Helvetica);
  
  // Draw header
  await drawDocumentHeader(page, doc, docNumber, width, height);
  
  // Content starts below header
  const headerHeight = 80;
  const contentStartY = height - headerHeight - 50;
  
  // Icon
  page.drawText('📄', {
    x: width / 2 - 15,
    y: contentStartY - 40,
    size: 30,
    font: font,
  });
  
  page.drawText('WORD DOCUMENT', {
    x: 50,
    y: contentStartY - 80,
    size: 16,
    font: fontBold,
    color: rgb(0, 0, 0.6),
  });
  
  page.drawText(`Format: ${fileType.toUpperCase()}`, {
    x: 50,
    y: contentStartY - 105,
    size: 12,
    font: font,
    color: rgb(0.5, 0.5, 0.5),
  });
  
  page.drawText('This document cannot be displayed in PDF.', {
    x: 50,
    y: contentStartY - 130,
    size: 11,
    font: font,
  });
  
  page.drawText('Download and open the original file separately.', {
    x: 50,
    y: contentStartY - 150,
    size: 11,
    font: font,
    color: rgb(0.4, 0.4, 0.4),
  });
  
  const [wordPdfPage] = await mergedPdf.copyPages(wordPage, [0]);
  mergedPdf.addPage(wordPdfPage);
}

// Helper: Add text file with header
async function addTextFileWithHeader(mergedPdf, doc, docNumber, filePath, fileType) {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const textPage = await PDFDocument.create();
  const page = textPage.addPage([595, 842]);
  const { width, height } = page.getSize();
  
  const fontBold = await textPage.embedFont(StandardFonts.HelveticaBold);
  const font = await textPage.embedFont(StandardFonts.Helvetica);
  
  // Draw header
  await drawDocumentHeader(page, doc, docNumber, width, height);
  
  // Content starts below header
  const headerHeight = 80;
  const contentStartY = height - headerHeight - 40;
  const contentWidth = width - 100;
  
  try {
    const textContent = fs.readFileSync(filePath, 'utf8');
    
    page.drawText(`${fileType.toUpperCase()} CONTENT`, {
      x: 50,
      y: contentStartY,
      size: 14,
      font: fontBold,
      color: rgb(0, 0.4, 0.2),
    });
    
    if (textContent && textContent.trim().length > 0) {
      const maxChars = 6000;
      const displayText = textContent.length > maxChars 
        ? textContent.substring(0, maxChars) + '\n\n...[content continues]' 
        : textContent;
      
      page.drawText(displayText, {
        x: 50,
        y: contentStartY - 30,
        size: 10,
        font: font,
        maxWidth: contentWidth,
        lineHeight: 14,
      });
    } else {
      page.drawText('(Empty document)', {
        x: 50,
        y: contentStartY - 30,
        size: 12,
        font: font,
        color: rgb(0.6, 0.6, 0.6),
      });
    }
    
  } catch (error) {
    page.drawText(`Error reading ${fileType.toUpperCase()} file`, {
      x: 50,
      y: contentStartY,
      size: 12,
      font: font,
      color: rgb(0.8, 0, 0),
    });
  }
  
  const [textPdfPage] = await mergedPdf.copyPages(textPage, [0]);
  mergedPdf.addPage(textPdfPage);
}

// Helper: Add other file with header
async function addOtherFileWithHeader(mergedPdf, doc, docNumber, fileType) {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const otherPage = await PDFDocument.create();
  const page = otherPage.addPage([595, 842]);
  const { width, height } = page.getSize();
  
  const fontBold = await otherPage.embedFont(StandardFonts.HelveticaBold);
  const font = await otherPage.embedFont(StandardFonts.Helvetica);
  
  // Draw header
  await drawDocumentHeader(page, doc, docNumber, width, height);
  
  // Content starts below header
  const headerHeight = 80;
  const contentStartY = height - headerHeight - 50;
  
  // Icon
  page.drawText('📎', {
    x: width / 2 - 15,
    y: contentStartY - 40,
    size: 30,
    font: font,
  });
  
  page.drawText(`${fileType.toUpperCase()} FILE`, {
    x: 50,
    y: contentStartY - 80,
    size: 14,
    font: fontBold,
  });
  
  page.drawText('This file format requires separate viewing.', {
    x: 50,
    y: contentStartY - 105,
    size: 11,
    font: font,
  });
  
  page.drawText('Download the original file to view content.', {
    x: 50,
    y: contentStartY - 125,
    size: 11,
    font: font,
    color: rgb(0.4, 0.4, 0.4),
  });
  
  const [otherPdfPage] = await mergedPdf.copyPages(otherPage, [0]);
  mergedPdf.addPage(otherPdfPage);
}

// Helper: Add error with header
async function addErrorWithHeader(mergedPdf, doc, docNumber, error) {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const errorPage = await PDFDocument.create();
  const page = errorPage.addPage([595, 842]);
  const { width, height } = page.getSize();
  
  const fontBold = await errorPage.embedFont(StandardFonts.HelveticaBold);
  const font = await errorPage.embedFont(StandardFonts.Helvetica);
  
  // Draw header
  await drawDocumentHeader(page, doc, docNumber, width, height);
  
  // Content starts below header
  const headerHeight = 80;
  const contentStartY = height - headerHeight - 50;
  
  // Error icon
  page.drawText('⚠️', {
    x: width / 2 - 15,
    y: contentStartY - 40,
    size: 30,
    font: font,
    color: rgb(1, 0.5, 0),
  });
  
  page.drawText('ERROR PROCESSING DOCUMENT', {
    x: 50,
    y: contentStartY - 80,
    size: 14,
    font: fontBold,
    color: rgb(0.8, 0, 0),
  });
  
  page.drawText(error.message.substring(0, 150), {
    x: 50,
    y: contentStartY - 110,
    size: 10,
    font: font,
    color: rgb(0.6, 0, 0),
    maxWidth: width - 100,
  });
  
  const [errorPdfPage] = await mergedPdf.copyPages(errorPage, [0]);
  mergedPdf.addPage(errorPdfPage);
}

// Helper: Add missing file with header
async function addDocumentWithHeader(mergedPdf, doc, docNumber, type) {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const missingPage = await PDFDocument.create();
  const page = missingPage.addPage([595, 842]);
  const { width, height } = page.getSize();
  
  const fontBold = await missingPage.embedFont(StandardFonts.HelveticaBold);
  const font = await missingPage.embedFont(StandardFonts.Helvetica);
  
  // Draw header
  await drawDocumentHeader(page, doc, docNumber, width, height);
  
  // Content starts below header
  const headerHeight = 80;
  const contentStartY = height - headerHeight - 50;
  
  if (type === 'missing') {
    page.drawText('❌', {
      x: width / 2 - 15,
      y: contentStartY - 40,
      size: 30,
      font: font,
      color: rgb(1, 0, 0),
    });
    
    page.drawText('FILE NOT FOUND', {
      x: 50,
      y: contentStartY - 80,
      size: 14,
      font: fontBold,
      color: rgb(1, 0, 0),
    });
    
    page.drawText('The original file could not be located on the server.', {
      x: 50,
      y: contentStartY - 105,
      size: 11,
      font: font,
    });
  } else if (type === 'empty') {
    page.drawText('📄', {
      x: width / 2 - 15,
      y: contentStartY - 40,
      size: 30,
      font: font,
    });
    
    page.drawText('EMPTY DOCUMENT', {
      x: 50,
      y: contentStartY - 80,
      size: 14,
      font: fontBold,
      color: rgb(0.5, 0.5, 0.5),
    });
    
    page.drawText('This document contains no content.', {
      x: 50,
      y: contentStartY - 105,
      size: 11,
      font: font,
    });
  }
  
  const [missingPdfPage] = await mergedPdf.copyPages(missingPage, [0]);
  mergedPdf.addPage(missingPdfPage);
}

// Helper: Draw document header (reusable)
async function drawDocumentHeader(page, doc, docNumber, width, height) {
  const { StandardFonts, rgb } = await import('pdf-lib');
  
  const fontBold = await page.doc.embedFont(StandardFonts.HelveticaBold);
  const font = await page.doc.embedFont(StandardFonts.Helvetica);
  
  // Header background
  page.drawRectangle({
    x: 0,
    y: height - 80,
    width: width,
    height: 80,
    color: rgb(0.97, 0.98, 0.99),
  });
  
  // Document number badge
  page.drawRectangle({
    x: 30,
    y: height - 50,
    width: 60,
    height: 25,
    color: rgb(0, 0.4, 0.7),
  });
  
  page.drawText(`Doc ${docNumber}`, {
    x: 40,
    y: height - 45,
    size: 12,
    font: fontBold,
    color: rgb(1, 1, 1),
  });
  
  // Document type
  const docType = formatDocumentType(doc.documentType);
  page.drawText(docType, {
    x: 100,
    y: height - 45,
    size: 16,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  });
  
  // File name
  if (doc.fileName) {
    const fileName = doc.fileName.length > 40 
      ? doc.fileName.substring(0, 40) + '...' 
      : doc.fileName;
    
    page.drawText(fileName, {
      x: 100,
      y: height - 65,
      size: 11,
      font: font,
      color: rgb(0.4, 0.4, 0.4),
    });
  }
  
  // Upload date if available
  if (doc.uploadDate) {
    const uploadDate = new Date(doc.uploadDate);
    const dateStr = uploadDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    
    page.drawText(`Uploaded: ${dateStr}`, {
      x: width - 150,
      y: height - 45,
      size: 10,
      font: font,
      color: rgb(0.5, 0.5, 0.5),
    });
  }
  
  // Separator line
  page.drawLine({
    start: { x: 30, y: height - 85 },
    end: { x: width - 30, y: height - 85 },
    thickness: 1,
    color: rgb(0.85, 0.85, 0.85),
  });
}

// Export only PDF generation function
export { generateStudentPDF };