const nodemailer = require("nodemailer");
const transporter = nodemailer.createTransport({
    host: "sandbox.smtp.mailtrap.io",
    port: 25,
    secure: false,
    auth: {
        user: "",
        pass: "",
    },
});
module.exports = {
    sendmail: async function (to, subject, URL) {
        return await transporter.sendMail({
            from: 'NNPTDU@heheheh.com',
            to: to,
            subject: subject,
            html: `<a href=${URL}>URL</a>`, // html body
        });
    }
}