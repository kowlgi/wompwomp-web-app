var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var passportLocalMongoose = require('passport-local-mongoose');

exports.init = function(connection){
    var Account = new Schema(
        {
            username: String,
            email: String,
            role: String,
            resetPasswordToken: String,
            resetPasswordExpires: Date
        }
    );

    Account.plugin(
        passportLocalMongoose,
        {
            limitAttempts: true,
            maxAttempts: 5,
            usernameLowerCase: true,
            usernameField: 'email',
            errorMessages: {
                IncorrectPasswordError: 'Password or email are incorrect',
                IncorrectUsernameError: 'Password or email are incorrect',
                MissingUsernameError: 'No email was given',
                UserExistsError: 'A user with the given email is already registered'
            },
            passwordValidator: function(password, cb) {
                    if(password.length < 8 || password.length > 50) {
                        cb(new Error("Please set a password between 8 and 50 characters long"));
                    }
                    else {
                        cb(null, "Password is valid");
                    }
            }
        }
    );

    connection.model('Accounts', Account);
};
