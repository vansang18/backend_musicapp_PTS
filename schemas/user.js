let mongoose = require('mongoose');
let bcrypt = require('bcrypt')
let userSchema = mongoose.Schema({
    username: {
        type: String,
        required: [true, "username khong duoc de trong"],
        unique: [true, "username da ton tai"]
    },
    password: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    fullName: {
        type: String,
        default: "",
    },
    avatarUrl: {
        type: String,
        default: "",
    },
    loginCount: {
        type: String,
        default: 0,
        min: 0
    },
    role: {
        type: mongoose.Types.ObjectId,
        ref: 'role',
        required: true
    },
    status: {
        type: Boolean,
        default: false
    },
    resetPasswordToken: String,
    resetPasswordTokenExp: Date
}, {
    timestamps: true,
})
userSchema.pre('save', function (next) {
    if (this.isModified("password")) {
        let salt = bcrypt.genSaltSync(10);
        let encrypted = bcrypt.hashSync(this.password + "", salt);
        this.password = encrypted;
    }
    next()
})
module.exports = mongoose.model('user', userSchema)
// products