const nodemailer = require('nodemailer'),
    config = load.config;

class Mailer {
    constructor() {
        this.transport = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: config.smtp.user,
                pass: config.smtp.pass
            }
        })
    }

    send(params) {
        return new Promise((resolve, reject) => {
            this.transport.sendMail(params, function (err, info) {
                if (!err)
                    resolve(info);
                else
                    reject(err);
            })
        })
    }
}

module.exports = Mailer;