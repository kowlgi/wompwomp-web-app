var MailComposer = require("mailcomposer");

// Pass a valid mg
function sendHtmlEmail(mg, to, bcc, subject, body_html, body_text) {
  var mailcomposer = new MailComposer({
      from: 'deckrank.co <no-reply@mg.deckrank.co>',
      to: to,
      subject: subject,
      body: body_text,
      html: body_html
  });
  mailcomposer.build(function(err, msg) {
    var dataToSend = {
      to: to + "," + bcc,
      message: msg
    };
    mg.messages().sendMime(dataToSend, function (err, body) {
      if (err) {
        console.log('unable to send ' + err);
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
