const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const generateOrderPDF = (order) => {
  return new Promise((resolve, reject) => {

    // Ruta donde se guardará el PDF
    const fileName = `orden-${order.order_number}.pdf`;
    const filePath = path.join(__dirname, '../../pdfs', fileName);
    console.log('Ruta del PDF:', filePath);

    // Creamos el documento PDF
    const doc = new PDFDocument({ margin: 50 });

    // Lo conectamos a un archivo
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // ── ENCABEZADO ────────────────────────────────────────
    doc
      .fontSize(20)
      .font('Helvetica-Bold')
      .text('ORDEN DE SERVICIO', { align: 'center' });

    doc
      .fontSize(16)
      .text(order.order_number, { align: 'center' });

    doc.moveDown();

    // Línea separadora
    doc
      .moveTo(50, doc.y)
      .lineTo(550, doc.y)
      .stroke();

    doc.moveDown();

    // ── INFORMACIÓN DEL CLIENTE ───────────────────────────
    doc
      .fontSize(13)
      .font('Helvetica-Bold')
      .text('INFORMACIÓN DEL CLIENTE');

    doc.moveDown(0.5);

    doc
      .fontSize(11)
      .font('Helvetica')
      .text(`Nombre:   ${order.client_name}`)
      .text(`Empresa:  ${order.client_company || 'N/A'}`)
      .text(`Email:    ${order.client_email || 'N/A'}`)
      .text(`Teléfono: ${order.client_phone || 'N/A'}`)
      .text(`Dirección:${order.client_address || 'N/A'}`);

    doc.moveDown();

    // ── INFORMACIÓN DEL TÉCNICO ───────────────────────────
    doc
      .fontSize(13)
      .font('Helvetica-Bold')
      .text('INFORMACIÓN DEL TÉCNICO');

    doc.moveDown(0.5);

    doc
      .fontSize(11)
      .font('Helvetica')
      .text(`Nombre: ${order.technician_name}`)
      .text(`Email:  ${order.technician_email}`);

    doc.moveDown();

    // Línea separadora
    doc
      .moveTo(50, doc.y)
      .lineTo(550, doc.y)
      .stroke();

    doc.moveDown();

    // ── DETALLES DE LA ORDEN ──────────────────────────────
    doc
      .fontSize(13)
      .font('Helvetica-Bold')
      .text('DETALLES DE LA ORDEN');

    doc.moveDown(0.5);

    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .text('Descripción del problema:');
    doc
      .font('Helvetica')
      .text(order.description || 'N/A');

    doc.moveDown(0.5);

    doc
      .font('Helvetica-Bold')
      .text('Diagnóstico:');
    doc
      .font('Helvetica')
      .text(order.diagnosis || 'N/A');

    doc.moveDown(0.5);

    doc
      .font('Helvetica-Bold')
      .text('Trabajo realizado:');
    doc
      .font('Helvetica')
      .text(order.work_done || 'N/A');

    doc.moveDown(0.5);

    doc
      .font('Helvetica-Bold')
      .text('Repuestos utilizados:');
    doc
      .font('Helvetica')
      .text(order.parts_used || 'N/A');

    doc.moveDown(0.5);

    doc
      .font('Helvetica-Bold')
      .text(`Estado: `)
      .font('Helvetica')
      .text(order.status?.toUpperCase(), { continued: false });

    doc.moveDown(0.5);

    doc
      .fontSize(13)
      .font('Helvetica-Bold')
      .text(`COSTO TOTAL: $${Number(order.total_cost || 0).toLocaleString('es-CO')}`);

    doc.moveDown();

    // Línea separadora
    doc
      .moveTo(50, doc.y)
      .lineTo(550, doc.y)
      .stroke();

    doc.moveDown();

    // ── FIRMA DEL CLIENTE ─────────────────────────────────
    doc
      .fontSize(13)
      .font('Helvetica-Bold')
      .text('FIRMA DEL CLIENTE');

    doc.moveDown(0.5);

    if (order.signature_base64) {
      try {
        // Convertimos el base64 a imagen y la insertamos
        const base64Data = order.signature_base64.replace(/^data:image\/\w+;base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');

        doc.image(imageBuffer, {
          fit: [200, 100],
          align: 'left'
        });
      } catch (e) {
        doc.text('Firma no disponible');
      }
    } else {
      doc.font('Helvetica').text('Sin firma');
    }

    doc.moveDown();

    doc
      .fontSize(11)
      .font('Helvetica')
      .text(`Fecha de firma: ${order.signature_date
        ? new Date(order.signature_date).toLocaleString('es-CO')
        : 'N/A'
      }`);

    doc.moveDown(2);

    // ── PIE DE PÁGINA ─────────────────────────────────────
    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('gray')
      .text(
        `Documento generado el ${new Date().toLocaleString('es-CO')}`,
        { align: 'center' }
      );

    // Cerramos el documento
    doc.end();

    // Cuando termina de escribir el archivo
    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
};

module.exports = { generateOrderPDF };