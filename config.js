var config = {};

config.port = 3000;
config.submitkey = "hellno";
config.pushnotificationkey = "inyoface";
config.db = "agnitest";
config.logindb = "agnilogin";
config.session_secret = "keyboard cat"
config.sessiondb = "agnisession";
config.userstatsdb = "agniuserstats";

/* aggressive mailing list scheduler: run mailing list in the
   0th second of every minute */
config.mailing_list_scheduler_frequency = "0 */1 * * * * ";

//config.mailing_list_scheduler_frequency = "0 0 10 * * 3,6";
//config.release_content_scheduler_frequency = "0 0 1,3,6,10,13,17,21,23 * * *";

config.release_content_scheduler_frequency = "0 */1 * * * *"

/* in cases where release time overlaps, give ~10 seconds for buffered content
   to be released  */
config.push_notification_scheduler_frequency = "10 0 10,23 * * *";

/* image upload */
config.imgurkey = "490ca385c5ef403";
config.height = 640;
config.width = 640;

module.exports = config;
