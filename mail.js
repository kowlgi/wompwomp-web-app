var MailComposer = require('mailcomposer'),
    util = require('util');

// Pass a valid mg
function sendHtmlEmail(mg, to, subject, body_text, body_html, current_time, update_callback) {
  var mailcomposer = new MailComposer({
      from: 'wompwomp.co <no-reply@mg.deckrank.co>',
      to: to,
      subject: subject,
      body: body_text,
      html: body_html
  });

  mailcomposer.build(function(err, message) {
    var dataToSend = {
      to: to,
      message: message.toString('ascii')
    };

    mg.messages().sendMime(dataToSend, function (err, body) {
      if (err) {
        util.log('Unable to send outbound emails. Error:' + err.statusCode);
      } else {
        update_callback(body_html, current_time);
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
