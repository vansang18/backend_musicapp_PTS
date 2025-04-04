var express = require('express');
var router = express.Router();
let productModel = require('../schemas/products')
let categoryModel = require('../schemas/category')
let {CreateErrorRes,
  CreateSuccessRes} = require('../utils/responseHandler')

/* GET users listing. */
router.get('/', async function(req, res, next) {
  let products = await productModel.find({
    isDeleted:false
  }).populate("category")
  CreateSuccessRes(res,products,200);
});
router.get('/:id', async function(req, res, next) {
  try {
    let product = await productModel.findOne({
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
    let category = await categoryModel.findOne({
      name:body.category
    })
    if(category){
      let newProduct = new productModel({
        name:body.name,
        price:body.price,
        quantity:body.quantity,
        category:category._id
      })
      await newProduct.save();
      CreateSuccessRes(res,newProduct,200);
    }else{
      throw new Error("cate khong ton tai")
    } 
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
    if(body.price){
      updatedInfo.price = body.price;
    }
    if(body.quantity){
      updatedInfo.quantity = body.quantity;
    }
    if(body.category){
      updatedInfo.category = body.category;
    }
    let updateProduct = await productModel.findByIdAndUpdate(
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
    let body = req.body
    let updateProduct = await productModel.findByIdAndUpdate(
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
