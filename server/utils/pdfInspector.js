const { PDFDocument, PDFName, PDFDict, PDFArray, PDFNumber } = require('pdf-lib');

const SUSPICIOUS_ANNOT_SUBTYPES = new Set([
  '/Ink',
  '/Stamp',
  '/FreeText',
  '/Line',
  '/Square',
  '/Circle',
  '/Polygon',
  '/PolyLine',
  '/Highlight',
  '/Widget'
]);

function readPdfNumber(val) {
  if (!val) return 0;
  if (val instanceof PDFNumber || typeof val.asNumber === 'function') {
    return val.asNumber();
  }
  const n = Number(val.toString());
  return Number.isFinite(n) ? n : 0;
}

/**
 * Inspects an uploaded PDF file buffer to detect digitally superimposed signature images
 * or added digital annotation layers specifically on the First Page (Certificate Page 1).
 *
 * Allows legitimate single-page scans as well as MRC-compressed or strip-tiled PDFs
 * produced by mobile scanners (Adobe Scan, CamScanner, 11zon, Google Drive Scan).
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

    // 1. Check for visual PDF Digital Annotations (ink drawings, digital stamps, pasted widgets)
    // Ignore harmless non-visual annotations such as /Link added by mobile PDF scanners/converters.
    const annots = pageNode.lookup(PDFName.of('Annots'));
    if (annots && annots instanceof PDFArray && annots.size() > 0) {
      let hasSuspiciousAnnot = false;
      for (let i = 0; i < annots.size(); i++) {
        const annot = annots.lookup(i);
        if (annot && annot instanceof PDFDict) {
          const subtype = annot.lookup(PDFName.of('Subtype'));
          const subtypeStr = subtype ? subtype.toString() : '';
          if (!subtypeStr || SUSPICIOUS_ANNOT_SUBTYPES.has(subtypeStr)) {
            hasSuspiciousAnnot = true;
            break;
          }
        }
      }
      if (hasSuspiciousAnnot) {
        return {
          isDigitallySignedImageOverlay: true,
          reason: `Digital annotation or signature layer detected on Certificate Page 1. Please scan and upload the physical paper record signed by your Principal.`
        };
      }
    }

    // 2. Check for XObject resources (superimposed signature image overlays or unprinted cover PDF)
    const resources = pageNode.lookup(PDFName.of('Resources'));
    if (resources && resources instanceof PDFDict) {
      const xObjects = resources.lookup(PDFName.of('XObject'));
      if (xObjects && xObjects instanceof PDFDict) {
        const keys = xObjects.keys();
        const smaskRefs = new Set();
        const rawImages = [];

        for (const key of keys) {
          const rawRef = xObjects.get(key);
          const xObj = xObjects.lookup(key);
          const xDict =
            xObj instanceof PDFDict
              ? xObj
              : xObj && xObj.dict instanceof PDFDict
                ? xObj.dict
                : null;
          if (xDict) {
            const subtype = xDict.lookup(PDFName.of('Subtype'));
            if (subtype && subtype.toString() === '/Image') {
              const smaskRef = xDict.get(PDFName.of('SMask'));
              if (smaskRef) {
                smaskRefs.add(smaskRef.toString());
              }
              rawImages.push({
                refStr: rawRef ? rawRef.toString() : '',
                width: readPdfNumber(xDict.lookup(PDFName.of('Width'))),
                height: readPdfNumber(xDict.lookup(PDFName.of('Height'))),
                hasSMask: !!xDict.lookup(PDFName.of('SMask'))
              });
            }
          }
        }

        // Exclude helper soft-mask objects from visible image count
        const images = rawImages.filter((img) => !img.refStr || !smaskRefs.has(img.refStr));

        if (images.length > 1) {
          const sizedImages = images.filter((img) => img.width > 0 && img.height > 0);
          if (sizedImages.length !== images.length) {
            return {
              isDigitallySignedImageOverlay: true,
              reason: `Digitally pasted signature image overlay detected on Certificate Page 1. Please scan and upload the physical paper record signed by your Principal.`
            };
          }

          const largest = sizedImages.reduce((best, cur) =>
            cur.width * cur.height > best.width * best.height ? cur : best
          );
          const largestArea = largest.width * largest.height;

          // Unprinted cover PDF (e.g. raw BarcodePDF with small logos + QR and no full-page scan image)
          const hasFullPageScan = Math.max(largest.width, largest.height) >= 400;
          if (!hasFullPageScan) {
            return {
              isDigitallySignedImageOverlay: true,
              reason: `Unscanned digital Certificate Page 1 detected. Please print, obtain your Principal's physical signature, scan the paper record, and upload it.`
            };
          }

          // Pattern A: Strip-tiled scan (scanner splits one full page into equal-width or equal-height strips)
          const isHorizontalTiledScan =
            sizedImages.every((img) => Math.abs(img.width - largest.width) <= 4);
          const isVerticalTiledScan =
            sizedImages.every((img) => Math.abs(img.height - largest.height) <= 4);

          // Pattern B: MRC-compressed scan (foreground mask + background image with matching page aspect ratio)
          const largestRatio = largest.width / largest.height;
          const isMrcLayeredScan = sizedImages.every((img) => {
            const ratio = img.width / img.height;
            const ratioDiff = Math.abs(ratio - largestRatio) / largestRatio;
            const isSmallTransparentOverlay = img.hasSMask && img.width * img.height < largestArea * 0.4;
            return ratioDiff <= 0.10 && !isSmallTransparentOverlay;
          });

          // Pattern C: Small transparent PNG overlay (e.g. pasted digital signature with alpha channel over a full-page scan)
          const hasSmallTransparentOverlay = sizedImages.some(
            (img) => img !== largest && img.hasSMask && img.width * img.height < largestArea * 0.5
          );

          if (hasSmallTransparentOverlay || (!isHorizontalTiledScan && !isVerticalTiledScan && !isMrcLayeredScan && sizedImages.some((img) => img !== largest && img.width * img.height >= 2500 && !img.hasSMask && img.width * img.height < largestArea * 0.3 && Math.abs((img.width / img.height) - largestRatio) / largestRatio > 0.25 && img.width > 120 && img.height > 60 && img.width / img.height < 6))) {
            return {
              isDigitallySignedImageOverlay: true,
              reason: `Digitally pasted signature image overlay detected on Certificate Page 1. Please scan and upload the physical paper record signed by your Principal.`
            };
          }
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
