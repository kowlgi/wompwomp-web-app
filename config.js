var config = {};

config.port = 3000;
config.submitkey = "hellno";
config.pushnotificationkey = "inyoface";
config.db = "agniimages";
config.logindb = "agnilogin";
config.session_secret = "don martin doesn't want any secrets but his spies are what me worry about";
config.sessiondb = "agnisession";
config.userstatsdb = "agniuserstats";

config.release_content_scheduler_frequency = "0 0 1,3,6,10,13,17,21,23 * * *";

config.push_share_card_scheduler_frequency = "10 59 22 * * 5";
config.push_rate_card_scheduler_frequency = "10 59 9 * * 4";
config.push_upgrade_card_scheduler_frequency = "30 59 9 * * 0,3,7";
config.push_remove_all_cta_scheduler_frequency = "1 50 9,22 * * *";
config.push_upgrade_card_version = "8";

/* in cases where release time overlaps, give ~10 seconds for buffered content
   to be released  */
config.push_notification_scheduler_frequency = "10 0 10,23 * * *";

/* image upload */
config.imgurkey = "490ca385c5ef403";
config.height = 640;
config.width = 640;

/* Mailing parameters */
config.mailgun_key = 'key-2b47b2fba4ae2209ec9596983a661e75';
config.email_domain = 'mg.wompwomp.co';
config.test_mailing_list = 'wompwompapp@gmail.com';
config.prod_mailing_list = 'fun@mg.wompwomp.co';
//config.test_mailing_list_scheduler_frequency = "0 */1 * * * * "; // 0th second of every minute
config.test_mailing_list_scheduler_frequency = "0 0 10 * * 3,6";
config.prod_mailing_list_scheduler_frequency = "0 0 10 * * 3,6";

config.AWSAccessKeyId = "accesskey";
config.AWSSecretKey = "secretkey";
config.AWSS3BucketVideoURL = "http://wompwomp.s3.amazonaws.com/video/";

module.exports = config;
