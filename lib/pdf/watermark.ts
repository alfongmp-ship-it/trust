import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib'

// Aplica un watermark "PREVIEW — TRUST" diagonal sobre cada página del PDF.
// Devuelve los bytes del PDF modificado. No muta el input.
export async function applyWatermark(
  pdfBytes: ArrayBuffer | Uint8Array,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(pdfBytes)
  const helveticaBold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const stamp = `PREVIEW — TRUST · ${new Date().toISOString().slice(0, 10)}`

  for (const page of pdf.getPages()) {
    const { width, height } = page.getSize()

    // Texto diagonal grande al centro, semi-transparente
    page.drawText(stamp, {
      x: width * 0.1,
      y: height * 0.5,
      size: Math.max(36, Math.min(width, height) * 0.07),
      font: helveticaBold,
      color: rgb(0.85, 0.1, 0.1),
      opacity: 0.25,
      rotate: degrees(30),
    })

    // Pie de página visible (no se confunde con el doc original)
    page.drawText(stamp, {
      x: 24,
      y: 18,
      size: 9,
      font: helveticaBold,
      color: rgb(0.5, 0.5, 0.5),
      opacity: 0.7,
    })
  }

  return pdf.save()
}
