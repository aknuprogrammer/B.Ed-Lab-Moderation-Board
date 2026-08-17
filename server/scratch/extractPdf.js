const fs = require('fs');
const path = require('path');
const { PDFDocument, PDFName, PDFDict } = require('pdf-lib');

async function extract() {
  const pdfPath = 'C:\\Users\\polin\\Downloads\\lesson observation empty.pdf';
  if (!fs.existsSync(pdfPath)) {
    console.log('PDF does not exist at:', pdfPath);
    return;
  }
  const buffer = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(buffer);
  console.log('PDF loaded, page count:', pdfDoc.getPageCount());

  const scratchDir = path.join(__dirname, 'scratch_images');
  if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });

  const pages = pdfDoc.getPages();
  for (let i = 0; i < pages.length; i++) {
    console.log(`--- PAGE ${i + 1} ---`);
    const page = pages[i];
    const { width, height } = page.getSize();
    console.log(`Size: ${width} x ${height}`);
  }
}

extract().catch(console.error);
