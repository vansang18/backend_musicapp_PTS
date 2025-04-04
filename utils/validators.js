let { body, validationResult } = require('express-validator')
let constants = require('./constants')
let utils = require('util')
const { ERROR_EMAIL, ERROR_ROLE } = require('./constants')
let options = {
    password: {
        minLength: 8,
        minLowercase: 1,
        minUppercase: 1,
        minNumbers: 1,
        minSymbols: 1
    }
}
module.exports = {
    validate: function (req, res, next) {
        let errors = validationResult(req);
        if (!errors.isEmpty()) {
            CreateErrorRes(res, errors.array(), 404);
        } else {
            next()
        }
    },
    validatorLogin: [
        body("username").isAlphanumeric().withMessage(constants.ERROR_USERNAME),
        body("password").isStrongPassword(options.password).withMessage(utils.format(constants.ERROR_PASSWORD,
            options.password.minLength,
            options.password.minLowercase,
            options.password.minUppercase,
            options.password.minNumbers,
            options.password.minSymbols,
        )),
        body("email").isEmail().withMessage(ERROR_EMAIL)],
    validatorLogin: [
        body("username").isAlphanumeric().withMessage(constants.ERROR_USERNAME),
        body("password").isStrongPassword(options.password).withMessage(utils.format(constants.ERROR_PASSWORD,
            options.password.minLength,
            options.password.minLowercase,
            options.password.minUppercase,
            options.password.minNumbers,
            options.password.minSymbols,
        )),
        body("email").isEmail().withMessage(ERROR_EMAIL)],
    validatorForgotPassword: [
        body("email").isEmail().withMessage(ERROR_EMAIL)
    ], validatorChangePassword: [
        body("password").isStrongPassword(options.password).withMessage(utils.format(constants.ERROR_PASSWORD,
            options.password.minLength,
            options.password.minLowercase,
            options.password.minUppercase,
            options.password.minNumbers,
            options.password.minSymbols,
        ))
    ]
}
// lay code tren github va them validator cho CreateUser