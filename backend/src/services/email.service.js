const nodemailer = require('nodemailer');
const path = require('path');
require('dotenv').config();

// ── Configuración del transportador ───────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// ── Función principal de envío ────────────────────────────
const sendOrderEmail = async (order, pdfPath) => {

  // Cuerpo del correo en HTML
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      
      <div style="background-color: #1a3c5e; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">Orden de Servicio</h1>
        <h2 style="color: #f97316; margin: 5px 0;">${order.order_number}</h2>
      </div>

      <div style="padding: 20px; background-color: #f9f9f9;">
        <p>Estimado/a <strong>${order.client_name}</strong>,</p>
        <p>Su orden de servicio ha sido <strong>completada</strong>. 
           A continuación encontrará el resumen:</p>
      </div>

      <div style="padding: 20px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="background-color: #1a3c5e; color: white;">
            <td style="padding: 10px; font-weight: bold;">Campo</td>
            <td style="padding: 10px; font-weight: bold;">Detalle</td>
          </tr>
          <tr style="background-color: #f2f2f2;">
            <td style="padding: 10px;">Número de Orden</td>
            <td style="padding: 10px;">${order.order_number}</td>
          </tr>
          <tr>
            <td style="padding: 10px;">Cliente</td>
            <td style="padding: 10px;">${order.client_name} - ${order.client_company || 'N/A'}</td>
          </tr>
          <tr style="background-color: #f2f2f2;">
            <td style="padding: 10px;">Técnico</td>
            <td style="padding: 10px;">${order.technician_name}</td>
          </tr>
          <tr>
            <td style="padding: 10px;">Descripción</td>
            <td style="padding: 10px;">${order.description || 'N/A'}</td>
          </tr>
          <tr style="background-color: #f2f2f2;">
            <td style="padding: 10px;">Diagnóstico</td>
            <td style="padding: 10px;">${order.diagnosis || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 10px;">Trabajo Realizado</td>
            <td style="padding: 10px;">${order.work_done || 'N/A'}</td>
          </tr>
          <tr style="background-color: #f2f2f2;">
            <td style="padding: 10px;">Repuestos</td>
            <td style="padding: 10px;">${order.parts_used || 'N/A'}</td>
          </tr>
          <tr style="background-color: #1a3c5e; color: white;">
            <td style="padding: 10px; font-weight: bold;">Costo Total</td>
            <td style="padding: 10px; font-weight: bold;">
              $${Number(order.total_cost || 0).toLocaleString('es-CO')}
            </td>
          </tr>
        </table>
      </div>

      <div style="padding: 20px; background-color: #f9f9f9;">
        <p>📎 Adjunto encontrará el PDF con todos los detalles y la firma del cliente.</p>
        <p style="color: #666; font-size: 12px;">
          Fecha de firma: ${order.signature_date 
            ? new Date(order.signature_date).toLocaleString('es-CO') 
            : 'N/A'}
        </p>
      </div>

      <div style="background-color: #1a3c5e; padding: 15px; text-align: center;">
        <p style="color: white; margin: 0; font-size: 12px;">
          Sistema de Gestión de Órdenes de Mantenimiento
        </p>
      </div>

    </div>
  `;

  // Destinatarios
  const recipients = [];

  // Cliente
  if (order.client_email) recipients.push(order.client_email);

  // Técnico
  if (order.technician_email) recipients.push(order.technician_email);

  // Configuración del correo
  const mailOptions = {
    from: `"Gestión de Mantenimiento" <${process.env.EMAIL_USER}>`,
    to: recipients.join(', '),
    cc: process.env.EMAIL_ADMIN,
    subject: `Orden de Servicio ${order.order_number} - Completada`,
    html: htmlContent,
    attachments: [
      {
        filename: `${order.order_number}.pdf`,
        path: pdfPath
      }
    ]
  };

  // Enviamos el correo
  const info = await transporter.sendMail(mailOptions);
  console.log(`✅ Correo enviado: ${info.messageId}`);
  return info;
};

module.exports = { sendOrderEmail };