import { sendEmail } from './mailer.js';

export async function sendOrderConfirmationEmail(order) {
  const itemsHtml = order.items
    .map((i) => `<li>${i.name} (${i.size}) × ${i.quantity} — $${(i.price * i.quantity).toFixed(2)}</li>`)
    .join('');

  await sendEmail({
    to: order.customerEmail,
    subject: `Order confirmed — #${order._id.toString().slice(-8).toUpperCase()}`,
    html: `
      <h2>Thank you for your order, ${order.customerName}</h2>
      <p>Your order total: <strong>$${order.total.toFixed(2)}</strong></p>
      <ul>${itemsHtml}</ul>
      <p>Shipping to: ${order.shippingAddress.address}, ${order.shippingAddress.city}, ${order.shippingAddress.country}</p>
    `,
  });
}

export async function sendRefundConfirmationEmail(order) {
  await sendEmail({
    to: order.customerEmail,
    subject: `Refund issued — Order #${order._id.toString().slice(-8).toUpperCase()}`,
    html: `
      <h2>Your refund has been processed</h2>
      <p>Hi ${order.customerName},</p>
      <p>We've issued a refund of <strong>$${order.refund.amount.toFixed(2)}</strong> for your order.</p>
      <p><strong>Reason:</strong> ${order.refund.reason}</p>
      <p>This typically takes 5–10 business days to appear on your statement, depending on your bank.</p>
    `,
  });
}