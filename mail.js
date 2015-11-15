var MailComposer = require("mailcomposer").MailComposer;

// Pass a valid mg
function sendHtmlEmail(mg, to, bcc, subject, body_html, body_text) {
    var mailcomposer = new MailComposer();
    /* To bcc somebody on the email, because of the way mailgun works -
       https://github.com/mailgun/mailgun-php/issues/81 -- we don't add the 'bcc'
       address to the messageOptions, but only add it in buildMessage() */
    mailcomposer.setMessageOption({
        from: 'deckrank.co <no-reply@mg.deckrank.co>',
        to: to,
        subject: subject,
        body: body_text,
        html: body_html
    });

    mailcomposer.buildMessage(function(mailBuildError, messageSource) {
        var dataToSend = {
          to: to + "," + bcc,
          message: messageSource
        };

        mg.messages().sendMime(dataToSend, function (sendError, body) {
          if (sendError) {
            return;
          }
        });
    });
};

var mailgun = function(api_key, email_domain) {
  mailgun = require('mailgun-js')({
    apiKey: api_key, domain: email_domain
    });
  return mailgun;
};

exports.mailgun = mailgun;
exports.sendHtmlEmail = sendHtmlEmail;
