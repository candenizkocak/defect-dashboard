import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendPasswordResetEmail(email: string, tempPass: string) {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[EMAIL MOCK] To: ${email} | Temp Password: ${tempPass}`);
    return;
  }

  try {
    await resend.emails.send({
      // UPDATE THIS LINE:
      // You can use 'security', 'admin', 'no-reply', etc.
      from: 'security@candenizkocak.com', 
      
      to: email, // Now you can send to Gmail, Hotmail, etc.
      subject: 'CeraSight: Temporary Password Access',
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Password Reset Request</h2>
          <p>Your administrator has reset your CeraSight access.</p>
          <p>Your temporary password is:</p>
          <h1 style="background: #f3f4f6; padding: 10px; border-radius: 8px; display: inline-block;">${tempPass}</h1>
          <p>Please log in immediately. You will be required to change this password upon entry.</p>
        </div>
      `
    });
  } catch (error) {
    console.error("Failed to send email:", error);
    throw new Error("Email delivery failed");
  }
}