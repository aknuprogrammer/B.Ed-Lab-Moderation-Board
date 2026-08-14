const { PDFDocument, PDFName, PDFDict, PDFArray } = require('pdf-lib');

/**
 * Inspects an uploaded PDF file buffer to detect digitally superimposed signature images
 * or added digital annotation layers specifically on the First Page (Certificate Page 1).
 * 
 * @param {Buffer} pdfBuffer 
 * @returns {Promise<{ isDigitallySignedImageOverlay: boolean, reason?: string }>}
 */
exports.inspectPdfSignatureLiveness = async (pdfBuffer) => {
  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
    const pageCount = pdfDoc.getPageCount();

    if (pageCount === 0) return { isDigitallySignedImageOverlay: false };

    // Inspect ONLY the first page (Page 1 - Certificate Page)
    const page = pdfDoc.getPage(0);
    const pageNode = page.node;

    // 1. Check for PDF Digital Annotations (digital stamps / ink drawings / inserted annotation layers)
    const annots = pageNode.lookup(PDFName.of('Annots'));
    if (annots && annots instanceof PDFArray && annots.size() > 0) {
      return {
        isDigitallySignedImageOverlay: true,
        reason: `Digital annotation or signature layer detected on Certificate Page 1. Please scan and upload the physical paper record signed by your Principal.`
      };
    }

    // 2. Check for XObject resources (Multiple superimposed image objects)
    const resources = pageNode.lookup(PDFName.of('Resources'));
    if (resources && resources instanceof PDFDict) {
      const xObjects = resources.lookup(PDFName.of('XObject'));
      if (xObjects && xObjects instanceof PDFDict) {
        const keys = xObjects.keys();

        let imageCount = 0;
        for (const key of keys) {
          const xObj = xObjects.lookup(key);
          if (xObj && xObj instanceof PDFDict) {
            const subtype = xObj.lookup(PDFName.of('Subtype'));
            if (subtype && subtype.toString() === '/Image') {
              imageCount++;
            }
          }
        }

        // A genuinely scanned certificate page is 1 full-page raster image.
        // Having > 1 image objects on Certificate Page 1 indicates a digitally pasted signature PNG/JPEG overlay!
        if (imageCount > 1) {
          return {
            isDigitallySignedImageOverlay: true,
            reason: `Digitally pasted signature image overlay detected on Certificate Page 1. Please scan and upload the physical paper record signed by your Principal.`
          };
        }
      }
    }

    return { isDigitallySignedImageOverlay: false };
  } catch (err) {
    console.warn('PDF Inspection notice:', err.message);
    // Fallback gracefully if buffer format is non-standard
    return { isDigitallySignedImageOverlay: false };
  }
};
