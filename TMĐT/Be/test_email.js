require('dotenv').config();
const nodemailer = require('nodemailer');

console.log("USER:", process.env.EMAIL_USER);
console.log("PASS:", process.env.EMAIL_PASS ? "LOADED" : "NOT SET");

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

transporter.verify(function(error, success) {
  if (error) {
    console.log("VERIFY ERROR:");
    console.log(error);
  } else {
    console.log("SUCCESS: Server is ready to take our messages");
  }
});
