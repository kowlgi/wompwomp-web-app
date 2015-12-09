var config = {};

config.port = 3000;
config.submitkey = "hellno";
config.pushnotificationkey = "inyoface";
//config.db = "agnitest";
config.db = "agnitest2";
config.mailing_list_scheduler_frequency = "0 0 10 * * *";
config.release_content_scheduler_frequency = "0 0 */3 * * *";
config.push_notification_scheduler_frequency = "10 0 */6 * * *"; /* give ~10 seconds for buffered content to be released */

module.exports = config;
