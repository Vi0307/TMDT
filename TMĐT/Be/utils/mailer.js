const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    connectionTimeout: 5000, // 5 giây timeout
    greetingTimeout: 5000
});

const sendOTP = async (toEmail, otpCode) => {
    try {
        const mailOptions = {
            from: `"Cửa hàng điện máy" <${process.env.EMAIL_USER}>`,
            to: toEmail,
            subject: 'Mã xác thực OTP - Đặt lại mật khẩu',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 10px;">
                    <h2 style="color: #4361ee; text-align: center;">Đặt lại mật khẩu</h2>
                    <p>Chào bạn,</p>
                    <p>Bạn đã yêu cầu đặt lại mật khẩu. Vui lòng sử dụng mã OTP dưới đây để xác thực. Mã này có hiệu lực trong <strong>5 phút</strong>:</p>
                    <div style="text-align: center; margin: 20px 0;">
                        <span style="display: inline-block; padding: 10px 20px; font-size: 24px; font-weight: bold; background-color: #f1f5f9; color: #1e293b; border-radius: 5px; letter-spacing: 5px;">
                            ${otpCode}
                        </span>
                    </div>
                    <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                    <p style="font-size: 12px; color: #888; text-align: center;">Đây là email tự động, vui lòng không trả lời.</p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent: ' + info.response);
        return true;
    } catch (error) {
        console.error('Error sending email:', error);
        return false;
    }
};

module.exports = { sendOTP };
