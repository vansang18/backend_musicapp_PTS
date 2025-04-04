let userModel = require('../schemas/user')
let roleModel = require('../schemas/role')
let bcrypt = require('bcrypt')

module.exports = {
    GetAllUsers: async function () {
        return await userModel.find({
            status: false
        })
    },
    GetUserByID: async function (id) {
        return await userModel.findById(id).populate({
            path:'role',select:'name'
        });
    },
    GetUserByEmail: async function (email) {
        return await userModel.findOne({
            email:email
        }).populate({
            path:'role',select:'name'
        });
    },
    GetUserByToken: async function (token) {
        return await userModel.findOne({
            resetPasswordToken:token
        }).populate({
            path:'role',select:'name'
        });
    },
    GetUserByUsername: async function (username) {
        return await userModel.findOne({
            username: username
        }).populate('role');
    },
    CreateAnUser: async function (username, password, email, rolename) {
        try {
            let role = await roleModel.findOne({
                name: rolename
            })
            if (role) {
                let user = new userModel({
                    username: username,
                    password: password,
                    email: email,
                    role: role._id
                })
                return await user.save();
            } else {
                throw new Error("khong tim thay")
            }
        } catch (error) {
            throw new Error(error.message)
        }
    },
    UpdateAnUser: async function (id, body) {
        try {
            let user = await userModel.findById(id);
            let allowField = ["password", "email", "urlImg", "role"]
            for (const key of Object.keys(body)) {
                if (allowField.includes(key)) {
                    user[key] = body[key];
                }
            }
            return await user.save();
        } catch (error) {
            throw new Error(error.message)
        }
    },
    DeleteAnUser: async function (id) {
        try {

            return await userModel.findByIdAndUpdate(
                id, {
                status: false
            }
            )
        } catch (error) {
            throw new Error(error.message)
        }
    },
    CheckLogin: async function (username, password) {
        let user = await this.GetUserByUsername(username);
        if (!user) {
            throw new Error("Username hoc password khong dung")
        } else {
            if (bcrypt.compareSync(password, user.password)) {
                return  user._id;
            } else {
                throw new Error("Username hoc password khong dung")
            }
        }
    },
    ChangePassword: async function(user,oldpassword,newpassword){
        if(bcrypt.compareSync(oldpassword,user.password)){
            user.password = newpassword;
            return await user.save();
        }else{
            throw new Error('oldpassword khong dung')
        }
    }
    
}
