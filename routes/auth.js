var express = require('express');
var router = express.Router();
var userController = require('../controllers/users')
let { CreateSuccessRes, CreateErrorRes } = require('../utils/responseHandler');
let jwt = require('jsonwebtoken')
let constants = require('../utils/constants')
let { check_authentication } = require('../utils/check_auth')
let { validate, validatorLogin, validatorForgotPassword, validatorChangePassword } = require('../utils/validators')
let crypto = require('crypto')
let { sendmail } = require('../utils/sendmail')
let multer = require('multer')
let path = require('path');
let axios = require("axios")
let FormData = require('form-data')
let fs = require('fs')

let avatarDir = path.join(__dirname, '../avatars')
let postcdnURL = `http://localhost:4000/upload_avatar`
/* GET home page. */
router.post('/login', async function (req, res, next) {
    try {
        let body = req.body;
        let username = body.username;
        let password = body.password;
        let userID = await userController.CheckLogin(username, password);
        CreateSuccessRes(res, jwt.sign({
            id: userID,
            expire: (new Date(Date.now() + 60 * 60 * 1000)).getTime()
        }, constants.SECRET_KEY), 200)
    } catch (error) {
        next(error)
    }
});

router.post('/signup', validatorLogin, validate, async function (req, res, next) {
    try {
        let body = req.body;
        let newUser = await userController.CreateAnUser(
            body.username, body.password, body.email, 'user'
        )
        CreateSuccessRes(res, jwt.sign({
            id: newUser._id,
            expire: (new Date(Date.now() + 60 * 60 * 1000)).getTime()
        }, constants.SECRET_KEY), 200);
    } catch (error) {
        next(error)
    }
})
router.post('/changepassword', check_authentication, async function (req, res, next) {
    try {
        let body = req.body;
        let oldpassword = body.oldpassword;
        let newpassword = body.newpassword;
        let result = await userController.ChangePassword(req.user, oldpassword, newpassword);
        CreateSuccessRes(res, result, 200);
    } catch (error) {
        next(error)
    }

})

router.get('/me', check_authentication, async function (req, res, next) {
    console.log(req.user);
    CreateSuccessRes(res, req.user, 200)
})

router.post('/forgotpassword', validatorForgotPassword, validate, async function (req, res, next) {
    try {
        let email = req.body.email;
        let user = await userController.GetUserByEmail(email);
        if (user) {
            user.resetPasswordToken = crypto.randomBytes(24).toString('hex')
            user.resetPasswordTokenExp = (new Date(Date.now() + 10 * 60 * 1000)).getTime();
            await user.save();
            let url = `http://localhost:3000/auth/reset_password/${user.resetPasswordToken}`
            await sendmail(user.email, "bam vao day di anh chai", url)
            CreateSuccessRes(res, {
                url: url
            }, 200)

        } else {
            throw new Error("email khong ton tai")
        }
    } catch (error) {
        next(error)
    }
})

router.post('/reset_password/:token', validatorChangePassword,
    validate, async function (req, res, next) {
        try {
            let token = req.params.token;
            let user = await userController.GetUserByToken(token);
            if (user) {
                let newpassword = req.body.password;
                user.password = newpassword;
                user.resetPasswordToken = null;
                user.resetPasswordTokenExp = null;
                await user.save();
                CreateSuccessRes(res, user, 200)
            } else {
                throw new Error("email khong ton tai")
            }
        } catch (error) {
            next(error)
        }
    })

//upload -

//storage
let storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, avatarDir),
    filename: (req, file, cb) => cb(null,
        (new Date(Date.now())).getTime() + '-' + file.originalname
    )
})
//upload
let upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/image/)) {
            cb(new Error("tao chi nhan anh? thoi"))
        }
        cb(null, true)
    }, limits: {
        fileSize: 10 * 1024 * 1024
    }
})
router.post('/change_avatar', upload.single('avatar'), async function (req, res, next) {
    try {
        if (!req.file) {
            throw new Error("k co file")
        } else {
            //co file
            let formData = new FormData();
            let avatarfile = path.join(avatarDir, req.file.filename);
            formData.append('avatar', fs.createReadStream(avatarfile));
            let result = await axios.post(
                postcdnURL, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            })
            fs.unlinkSync(avatarfile);
            CreateSuccessRes(res, {
                url: result.data.data.url
            }, 200);
        }
    } catch (error) {
        next(error)
    }
})
router.get('/avatars/:filename', function (req, res, next) {
    let pathFile = path.join(avatarDir, req.params.filename);
    res.sendFile(pathFile)
})
//67de10517282904fbca502ae
module.exports = router;
