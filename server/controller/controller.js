const express = require('express');
const router = express.Router();
const AWS = require("aws-sdk");
const multer = require("multer");
// const keys = require("../config/keys");
const filesdb = require('../model/files');
var userdb = require('../model/user');
// const session = require('express-session');


const storage = multer.memoryStorage();
const multerObject = multer({ storage: storage, limits: { fileSize: 10 * 1024 * 1024 } }).single('image');


//to create a new user
exports.create = (req, res) => {

    if (!req.body) {
        res.status('400').send({ message: "Request body cannot be empty" })
        return;
    }

    if (req.body.email = '') {
        res.status('400').send({ message: "Request body cannot be empty" })
        return;
    }

    // using the user schema we created in module/user.js file for creating a new user in the database
    const user = new userdb({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password

    })

    user.save('user').then(data => {
        res.send(data);
        // res.redirect('./index');
    }).catch(err => {
        res.status(500).send({
            message: err.message || "Error encountered when creating new user"
        })
    })


}


exports.upload = (req, res) => {

    multerObject(req, res, (err) => {

        console.log("INSIDE UPLOAD FUNCTION");
        // console.log(req);
        console.log(req.file);
        // console.log(req.image);
        // console.log(req.body.image);
        const moment = require('moment');
        //File Upload started
        var startDate = new Date();

        // const uemail = req.user.email;
        // const uname = req.user.name;

        const file = req.file;


        if (!file) {
            //   req.flash('error_msg','Please select a file');
            res.redirect('/dashboard');
        }
        else {

            const s3FileURL = process.env.s3Url;

            let s3bucket = new AWS.S3({
                accessKeyId: process.env.AwsAccessKeyId,
                secretAccessKey: process.env.AwsSecretAccessKey,
                region: process.env.region
            });

            //Location of store for file upload

            var params = {
                Bucket: process.env.bucketName,
                Key: file.fieldname + ('-') + Date.now(),
                Body: file.buffer,
                ContentType: file.mimetype,
                ACL: "public-read"
            };

            s3bucket.upload(params, function (err, data) {
                if (err) {
                    res.status(500).json({ error: true, Message: err });
                } else {
                    //success
                    // req.flash('success_msg','File Uploaded!');
                    // res.render('dashboard', { userName: req.session.user });
                    //res.send(data.Location);


                    //File Upload ended       
                    var endDate = new Date();


                    // creating an object to be stored in the nosql database, we create an object and pass the values we 
                    // want to the fields in the schema 
                    const newFile = new filesdb({
                        //   user : uname,
                        user: req.session.user,
                        //   email : uemail,
                        email: req.session.email,
                        fileUrl: data.Location,
                        fileName: file.originalname,
                        fileDesc: file.originalname,
                        uploadTime: ((endDate - startDate) / 1000),
                        modifiedDate: ((endDate - startDate) / 1000)
                    });
                    // check if already exisits
                    // var fileAlreadyExists = false;
                    // filesdb.findOne({ fileName: file.originalname })
                    //     .then((fileName) => {
                    //         if (fileName) {
                    //             fileAlreadyExists = true;
                    //             newFile.save()
                    //                 .then(file => {
                    //                     console.log('File Updated');
                    //                     res.render('dashboard', { userName: req.session.user });
                    //                 })
                    //                 .catch(err => console.log(err));
                    //         }
                    //     });


                    //   if(!fileAlreadyExists){
                    //     console.log('New File Uploaded');
                    //     res.render('dashboard', { userName: req.session.user });
                    //   }

                    // filesdb.findOneAndReplace(
                    //     { fileName: file.originalname }, {newFile},
                    //     { upsert: true, returnNewDocument: true }
                    // ).then(fileName => {
                    //     console.log('File Uploaded');
                    //     res.render('dashboard', { userName: req.session.user });
                    // }).catch(err => console.log(err));


                    // the findOneAndReplace function with upsert:true is used to replace file if it exists or else add new file
                    filesdb.findOneAndReplace(
                        { "fileName": file.originalname }, 
                        {"user": req.session.user ,"email": req.session.email,
                        "fileUrl": data.Location,
                        "fileName": file.originalname,
                        "fileDesc": file.originalname,
                        "uploadTime": ((endDate - startDate) / 1000),
                        "modifiedDate": ((endDate - startDate) / 1000) },
                        { upsert: true, returnNewDocument: true }
                    ).then(fileName => {
                        console.log('File Uploaded');
                        res.render('dashboard', { userName: req.session.user });
                    }).catch(err => console.log(err));



                    }
                });

        }

    });

}

//to find all users 
exports.find = (req, res) => {

    userdb.find().then(user => {
        res.send(user);
    }).catch(err => {
        res.status(500).send({
            message: err.message || "Error encountered when fetching all users"
        })
    })
}


//login using email 
exports.login = (req, res) => {

    console.log("inside login method");
    if (!req.body) {
        console.log("inside req.body check method");
        res.status('400').send({ message: "Request body cannot be empty" })
        return;
    }


    const inputEmail = req.body.email;
    console.log('THIS IS DATA BEFORE CALLBACK ' + userdb.findOne({ email: inputEmail }));
    // Checking if user in database exists with the given email 
    // findOne is the method for finding a particular field from the database in mongodb, we cannot use find here- doenst do validation
    userdb.findOne({ email: inputEmail })
        .then(data => {
            //    console.log(inputEmail);
            console.log("inside find method");
            console.log('THIS IS DATA After CALLBACK ' + data);
            if (!data) {
                // res.status(404).send({ message: `cannot find the user with email:${inputEmail}` });
                res.status(404);
                alert(`cannot find the user with email:${inputEmail}`);
            } else {
                if (data.password == req.body.password) {
                    // using session which we added as middlewear in server.js here . we use this session to pass username to ejs file dashboard.ejs
                    console.log(req.session.user);
                    req.session.user = data.name;
                    req.session.email = data.email;
                    console.log(req.session.user);

                    var userEmail = data.email;
                    console.log(userEmail);
                    // gettting list of the files uploaded by the user
                    filesdb.findById({email:userEmail}).then(
                        filesList=>{
                            if(!filesList){
                                console.log("No files found for the user");
                            }else{
                                req.session.files = filesList.name;
                                console.log(filesList);
                            }
                        }
                    ).catch(err => {
                        res.status(500).send({
                            message: err.message || "Error encountered when fetching all files for the user"
                        })
                    })
                        
                    res.render('dashboard', { userName: req.session.user, filesToDisplay:req.session.files });
                } else {
                    res.status(404).send({ message: `incorrect Password for user :${inputEmail}` });
                }


            }
        })
}




//to update a user
exports.update = (req, res) => {

    if (!req.body) {
        res.status('400').send({ message: "Request body cannot be empty" })
        return;
    }

    const id = req.params.id;
    userdb.findByIdAndUpdate(id, req.body, { useFindAndModify: false })
        .then(data => {
            if (!data) {
                res.status(404).send({ message: `cannot update the user with ID` });
            }
        }

        )

}

//to find a single users 
// exports.find = (req,res) =>{

//     userdb.find({

//     })

// }


//to delete a user
exports.delete = (req, res) => {

}


// module.exports=up;

