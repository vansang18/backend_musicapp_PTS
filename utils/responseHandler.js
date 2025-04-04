module.exports={
    CreateErrorRes:function(res,message,statusCode){
        return res.status(statusCode).send({
            success:false,
            message:message
        })
    },
    CreateSuccessRes:function(res,data,statusCode){
        return res.status(statusCode).send({
            success:true,
            data:data
        })
    }
}