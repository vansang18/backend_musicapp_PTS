var express = require('express');
var router = express.Router();
let categoryModel = require('../schemas/category')
let {CreateErrorRes,
  CreateSuccessRes} = require('../utils/responseHandler')

/* GET users listing. */
router.get('/', async function(req, res, next) {
  let products = await categoryModel.find({
    isDeleted:false
  })
  CreateSuccessRes(res,products,200);
});
router.get('/:id', async function(req, res, next) {
  try {
    let product = await categoryModel.findOne({
      _id:req.params.id, isDeleted:false
    }
    )
    CreateSuccessRes(res,product,200);
  } catch (error) {
    next(error)
  }
});
router.post('/', async function(req, res, next) {
  try {
    let body = req.body
    let newProduct = new categoryModel({
      name:body.name,
    })
    await newProduct.save();
    CreateSuccessRes(res,newProduct,200);
  } catch (error) {
    next(error)
  }
});
router.put('/:id', async function(req, res, next) {
  let id = req.params.id;
  try {
    let body = req.body
    let updatedInfo = {};
    if(body.name){
      updatedInfo.name = body.name;
    }
    let updateProduct = await categoryModel.findByIdAndUpdate(
      id,updatedInfo,{new:true}
    )
    CreateSuccessRes(res,updateProduct,200);
  } catch (error) {
    next(error)
  }
});
router.delete('/:id', async function(req, res, next) {
  let id = req.params.id;
  try {
    let updateProduct = await categoryModel.findByIdAndUpdate(
      id,{
        isDeleted:true
      },{new:true}
    )
    CreateSuccessRes(res,updateProduct,200);
  } catch (error) {
    next(error)
  }
});

module.exports = router;
