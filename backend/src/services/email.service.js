const { Resend } = require('resend');
require('dotenv').config();

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.EMAIL_FROM || 'GPanel Mantenimiento <onboarding@resend.dev>';

// ── 1. Envío de Órdenes de Servicio Completadas ─────────────
// pdfUrl: URL segura de Cloudinary (order.pdf_url), no ruta local
const sendOrderEmail = async (order, pdfUrl) => {
  try {
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        
        <div style="background-color: #1a3c5e; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Orden de Servicio</h1>
          <h2 style="color: #f97316; margin: 5px 0;">${order.order_number}</h2>
        </div>

        <div style="padding: 20px; background-color: #f9f9f9;">
          <p>Estimado/a <strong>${order.client_name}</strong>,</p>
          <p>Su orden de servicio ha sido <strong>completada</strong>. 
             A continuación encontrará el resumen de la atención:</p>
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
            Sistema de Gestión de Órdenes de Mantenimiento - GPanel
          </p>
        </div>

      </div>
    `;

    // Cargar adjunto PDF desde la URL de Cloudinary
    const attachments = [];
    if (pdfUrl) {
      attachments.push({
        filename: `${order.order_number}.pdf`,
        path: pdfUrl, // Resend soporta adjuntar directo desde una URL
      });
    }

    // Lista de destinatarios
    const recipients = [];
    if (order.client_email) recipients.push(order.client_email);
    if (order.technician_email) recipients.push(order.technician_email);

    // Enviar correo a través de Resend
    const response = await resend.emails.send({
      from: FROM_EMAIL,
      to: recipients.length > 0 ? recipients : [process.env.EMAIL_ADMIN || 'delivered@resend.dev'],
      subject: `Orden de Servicio ${order.order_number} - Completada`,
      html: htmlContent,
      attachments: attachments
    });

    console.log(`✅ Correo de Orden enviado vía Resend ID: ${response.data?.id || response.id}`);
    return response;
  } catch (error) {
    console.error('❌ Error enviando correo con Resend:', error.message);
    throw error;
  }
};

// ── 2. Autenticación: Correo de Verificación de Cuenta ───────────
const sendVerificationEmail = async (email, name, code) => {
  try {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5500';
    // Apuntamos directamente a auth.html para evitar el redirect de /index.html → /
    // que hace npx serve y que descarta los query params.
    // &amp; es necesario en href HTML para que los clientes de correo no trunquen la URL.
    const authLink = `${frontendUrl}/auth.html?email=${encodeURIComponent(email)}&amp;code=${code}`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0;">
        <div style="background-color: #1a3c5e; padding: 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">🔧 GPanel Mantenimiento</h1>
          <p style="color: #f97316; margin: 5px 0 0 0; font-size: 16px; font-weight: bold;">Verificación de Cuenta</p>
        </div>

        <div style="padding: 30px; color: #334155; line-height: 1.6;">
          <h2 style="color: #1e293b; margin-top: 0;">¡Hola, ${name}!</h2>
          <p>Gracias por registrarte en GPanel. Para completar la activación de tu cuenta, ingresa el siguiente código de verificación:</p>
          
          <div style="background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
            <span style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #1a3c5e;">${code}</span>
          </div>

          <p style="text-align: center; margin: 30px 0;">
            <a href="${authLink}" style="background-color: #f97316; color: #ffffff; padding: 14px 28px; text-decoration: none; font-weight: bold; border-radius: 6px; display: inline-block;">Verificar mi cuenta ahora</a>
          </p>

          <p style="font-size: 13px; color: #64748b;">
            O si lo prefieres, ingresa directamente a <a href="${authLink}" style="color: #1a3c5e;">este enlace de autenticación</a> e ingresa manualmente el código.
          </p>
        </div>

        <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #64748b;">
          Si no solicitaste esta cuenta, puedes ignorar este mensaje.
        </div>
      </div>
    `;

    const response = await resend.emails.send({
      from: FROM_EMAIL,
      to: [email],
      subject: `Código de verificación: ${code} - GPanel`,
      html: htmlContent
    });

    if (response.error) {
      throw new Error(response.error.message || 'Error al enviar correo con Resend');
    }

    console.log(`✅ Correo de verificación enviado a ${email} (Resend ID: ${response.data?.id})`);
    return response;
  } catch (error) {
    console.error('❌ Error enviando correo de verificación:', error.message);
    throw error;
  }
};

module.exports = {
  sendOrderEmail,
  sendVerificationEmail
};