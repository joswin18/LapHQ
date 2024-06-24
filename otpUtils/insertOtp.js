const nodemailer = require('nodemailer');

const userMail = process.env.USER_MAIL;
const userPass = process.env.USER_PASS;

const sendOtp = async (email, otp) => {
    try {
        console.log(email)
        console.log(otp)
        let transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            auth: {
                user: userMail,
                pass: userPass
            }
        });

        let mailOptions = {
            from: userMail,
            to: email,
            subject: 'Your OTP Code',
            text: `Your OTP code is ${otp}. It is valid for 10 minutes.`
        };

        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.log('hii')
        console.log(error.message);
    }
};

module.exports = { sendOtp };