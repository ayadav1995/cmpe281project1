
const express = require('express');
const route = express.Router();

const rederServices = require('../services/render');
const controller = require('../controller/controller');
const { Router } = require('express');

// route.get('/', (req,res)=>{
//     // res.send("Application started");
//     // we dont need to mention indx.ejs because we already did app.set("view engine",'ejs')
    
//     res.render('index');
// } )

route.get('/', rederServices.homeRoutes );

// route.get('/add-user-route', (req,res)=>{
//     // res.send("Application started");
//     // we dont need to mention indx.ejs because we already did app.set("view engine",'ejs')
//     res.render('add_user');
//     // res.render('index');
// } )

// @description
// @method GET/add-user
route.get('/add-user-route', rederServices.addUser );

route.get('/dashboard',rederServices.dashboard);


//api methods dealing with database
route.post('/upload',controller.upload);

route.post('/login',controller.login);

route.post('/api/users', controller.create);

route.post('/update', controller.update);

route.get('/api/users',controller.find);

route.get('/delete',controller.delete);


// why do we need this?
module.exports=route;