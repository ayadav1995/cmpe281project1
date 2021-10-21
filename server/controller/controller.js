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



//MongoDB method to create a new user
// exports.create = (req, res) => {

//     if (!req.body) {
//         res.status('400').send({ message: "Request body cannot be empty" })
//         return;
//     }

//     if (req.body.email == '') {
//         res.status('400').send({ message: "Request body cannot be empty" })
//         return;
//     }

//     console.log(req.body);
//     // using the user schema we created in module/user.js file for creating a new user in the database
//     const user = new userdb({
//         name: req.body.name,
//         email: req.body.email,
//         password: req.body.password

//     })
//     user.save('user').then(data => {
//         // res.send(data);
//         console.log("User created with details" + data);
//         res.redirect('/');
//     }).catch(err => {
//         res.status(500).send({
//             message: err.message || "Error encountered when creating new user"
//         })
//     })
// }

    


   
// DynamoDb method to create new user
exports.create = (req, res) => {

    if (!req.body) {
        res.status('400').send({ message: "Request body cannot be empty" })
        return;
    }

    if (req.body.email == '') {
        res.status('400').send({ message: "Request body cannot be empty" })
        return;
    }

    console.log(req.body);

    AWS.config.update({
        "region": process.env.region,
        "endpoint":process.env.DynamoDb_URI,
        "accessKeyId": process.env.AwsAccessKeyId,
        "secretAccessKey": process.env.AwsSecretAccessKey,
    });

    // implementing dynamodb
    var docClient = new AWS.DynamoDB.DocumentClient();

    var params = {
        TableName: "users",
        Item: {
            name: req.body.name,
            email: req.body.email,
            password: req.body.password
        }
    }

    docClient.put(params, function(err, data) {
        if (err) {
            console.error("Unable to add user", req.body.email, ". Error JSON:", JSON.stringify(err, null, 2));
        } else {
            console.log("PutItem succeeded:", req.body.email);
            res.redirect('/');
        }
     });
}

// DynamoDb method for upload functionality
exports.upload = (req, res) => {

    multerObject(req, res, async (err) => {

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

           await s3bucket.upload(params, async function (err, data) {
                if (err) {
                    res.status(500).json({ error: true, Message: err });
                } else {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    

                    console.log("file upload successful");
                    var endDate = new Date();

                    console.log("after s3 upload function");

                    console.log(data.Location);
                    var str = data.Location;
                    var cloudfrontUrl = process.env.cloudfrontUrl + str.substr(50)
                    // AWS.config.update({
                    //     "region": process.env.region,
                    //     "endpoint":process.env.DynamoDb_URI,
                    //     "accessKeyId": process.env.AwsAccessKeyId,
                    //     "secretAccessKey": process.env.AwsSecretAccessKey,
                    // });
                
                    // implementing dynamodb
                    var docClient = new AWS.DynamoDB.DocumentClient({
                        // "region": process.env.region,
                        "endpoint":process.env.DynamoDb_URI,
                        // "accessKeyId": process.env.AwsAccessKeyId,
                        // "secretAccessKey": process.env.AwsSecretAccessKey
                    });
                   ;
                
                    // https://dropcloudbucket.s3.us-west-1.amazonaws.com/image-1634602573857
                    var params = {
                        TableName: "files",
                        Item: {
                        user: req.session.user,
                        email: req.session.email,
                        fileUrl: data.Location,
                        fileName: file.originalname,
                        fileDesc: file.originalname,
                        cloudfrontUrl: cloudfrontUrl,
                        uploadTime: ((endDate - startDate) / 1000),
                        modifiedDate: ((endDate - startDate) / 1000)
                        }
                    }
                
                    docClient.put(params, async function(err, data2) {
                        if (err) {
                            console.error("Unable to add user", data.Location, ". Error JSON:", JSON.stringify(err, null, 2));
                        } else {
                            console.log("PutItem succeeded:", data.Location);
                            await new Promise(resolve => setTimeout(resolve, 2000));
                            console.log('File Uploaded');
                        
                            var params2 = {
                                TableName : "files"
                            }
                
                             docClient.scan(params2, async (err,data)=>{
                                if (err) {
                                    console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
                                } else {
                                    console.log("GetItem succeeded:", JSON.stringify(data, null, 2));
                                    filesList=data.Items;
                                    
                
                                    var filesList =[] ;
                                    data.Items.forEach((item) => {
                                        if(item.email==req.session.email){
                                            filesList.push(item);
                                        }
                                    })
                
                                    req.session.files=filesList;
                                        console.log(filesList);
                
                                        await new Promise(resolve => setTimeout(resolve, 1000));
                                        console.log("about to render dashboard with files: "+req.session.files);
                                        res.render('dashboard', { userName: req.session.user, filesToDisplay:req.session.files });
                                }
                            })
                        
                        
                        
                        
                            // res.render('dashboard', { userName: req.session.user , filesToDisplay:req.session.files});
                        }
                     })

                        
                   

                    }
                })

        }

    })

}

// MongoDB method for upload
// exports.upload = (req, res) => {

//     multerObject(req, res, (err) => {

//         console.log("INSIDE UPLOAD FUNCTION");
//         // console.log(req);
//         console.log(req.file);
//         // console.log(req.image);
//         // console.log(req.body.image);
//         const moment = require('moment');
//         //File Upload started
//         var startDate = new Date();

//         // const uemail = req.user.email;
//         // const uname = req.user.name;

//         const file = req.file;


//         if (!file) {
//             //   req.flash('error_msg','Please select a file');
//             res.redirect('/dashboard');
//         }
//         else {

//             const s3FileURL = process.env.s3Url;

//             let s3bucket = new AWS.S3({
//                 accessKeyId: process.env.AwsAccessKeyId,
//                 secretAccessKey: process.env.AwsSecretAccessKey,
//                 region: process.env.region
//             });

//             //Location of store for file upload

//             var params = {
//                 Bucket: process.env.bucketName,
//                 Key: file.fieldname + ('-') + Date.now(),
//                 Body: file.buffer,
//                 ContentType: file.mimetype,
//                 ACL: "public-read"
//             };

//             s3bucket.upload(params, function (err, data) {
//                 if (err) {
//                     res.status(500).json({ error: true, Message: err });
//                 } else {
//                     //success
//                     // req.flash('success_msg','File Uploaded!');
//                     // res.render('dashboard', { userName: req.session.user });
//                     //res.send(data.Location);


//                     //File Upload ended       
//                     var endDate = new Date();


//                     // creating an object to be stored in the nosql database, we create an object and pass the values we 
//                     // want to the fields in the schema 
//                     const newFile = new filesdb({
//                         //   user : uname,
//                         user: req.session.user,
//                         //   email : uemail,
//                         email: req.session.email,
//                         fileUrl: data.Location,
//                         fileName: file.originalname,
//                         fileDesc: file.originalname,
//                         uploadTime: ((endDate - startDate) / 1000),
//                         modifiedDate: ((endDate - startDate) / 1000)
//                     });
                   
//                     // the findOneAndReplace function with upsert:true is used to replace file if it exists or else add new file
//                     filesdb.findOneAndReplace(
//                         { "fileName": file.originalname }, 
//                         {"user": req.session.user ,"email": req.session.email,
//                         "fileUrl": data.Location,
//                         "fileName": file.originalname,
//                         "fileDesc": file.originalname,
//                         "uploadTime": ((endDate - startDate) / 1000),
//                         "modifiedDate": ((endDate - startDate) / 1000) },
//                         { upsert: true, returnNewDocument: true }
//                     ).then(fileName => {
//                         console.log('File Uploaded');
//                         res.render('dashboard', { userName: req.session.user , filesToDisplay:req.session.files});
//                     }).catch(err => console.log(err));



//                     }
//                 });

//         }

//     });

// }



//to find all users mongoDB
exports.find = (req, res) => {

    userdb.find().then(user => {
        res.send(user);
    }).catch(err => {
        res.status(500).send({
            message: err.message || "Error encountered when fetching all users"
        })
    })
}



exports.logout = (req, res) => {

    console.log("INSIDE LOGOUT FUNCTION");
    if(req.session.user){
        req.session.destroy();
    }

    res.render('index');
}


// DynamoDb login method
 exports.login = async (req, res) => {

    req.session.user = req.body.user;
    req.session.email = req.body.email;
    req.session.password = req.body.password;


    console.log("inside login method");
    if (!req.body) {
        console.log("inside req.body check method");
        res.status('400').send({ message: "Request body cannot be empty" })
        return;
    }

    AWS.config.update({
        "region": process.env.region,
        // "endpoint":process.env.DynamoDb_URI, -- adding this here will cause problems with s3 upload function coz it wil change bucket URL
        "accessKeyId": process.env.AwsAccessKeyId,
        "secretAccessKey": process.env.AwsSecretAccessKey,
    });

    // implementing dynamodb
    var docClient = new AWS.DynamoDB.DocumentClient({
        "endpoint":process.env.DynamoDb_URI
    });

    let inputEmail = req.body.email;
    // console.log('THIS IS DATA BEFORE CALLBACK ' + userdb.findOne({ email: inputEmail }));
    

    if(req.body.email=='admin@gmail.com' && req.body.password=='admin'){
            console.log("inside admin function");

            var userList='';
            var filesList='';
            // req.session.user = req.body.email;
            req.session.user = "Admin";
            

            var params = {
                TableName : "users"
            }
            var userList = '';
            var filesList = '';

           await docClient.scan(params, (err,data2)=>{
                if (err) {
                    console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
                } else {
                    console.log("GetItem succeeded:", JSON.stringify(data2, null, 2));
                    userList=data2.Items;
                    req.session.users=data2.Items;
                    
                }
            })

            var params2 = {
                TableName : "files"
            }

            await docClient.scan(params2, async (err,data)=>{
                if (err) {
                    console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
                } else {
                    console.log("GetItem succeeded:", JSON.stringify(data, null, 2));
                    filesList=data.Items;
                    req.session.files=data.Items;
                    // console.log(data);
                    console.log(req.session.files);
                    console.log(req.session.users);
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    res.render('adminView', { userName: req.session.user, filesToDisplay:req.session.files , usersToDisplay:req.session.users });
                }
            })
           
            // userdb.find().then(users => {
            //     userList = users;
            // }).catch(err => {
            //     res.status(500).send({
            //         message: err.message || "Error encountered when fetching all users"
            //     })
            // })

            

            // filesdb.find().then(files => {
            //     filesList = files;
            //     req.session.files = filesList;

            //     res.render('adminView', { userName: req.session.user, filesToDisplay:req.session.files , usersToDisplay:userList });

            // }).catch(err => {
            //     res.status(500).send({
            //         message: err.message || "Error encountered when fetching all users"
            //     })
            // })

    }else{

        console.log(req.session.email);
        
        var docClient = new AWS.DynamoDB.DocumentClient({
            "endpoint":process.env.DynamoDb_URI
        });
        

        var params = {
        TableName: "users",
        Key:{
        "email": req.session.email
                }   ,
                "ProjectionExpression":" email,password",
                // "ConsistentRead": true,
                // "ReturnConsumedCapacity": "TOTAL"     
                
            };

            console.log(req.session.email);

        docClient.get(params, (err, data3) =>{
        if (err) {
        console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
            } else {
        console.log("GetItem succeeded:", data3);
        console.log(data3.Item);
        console.log(data3.Item.password);

        if(data3.Item.password==req.body.password){
            console.log("User password Verified, USER CAN NOW LOGIN");

            req.session.user=data3.Item.name;
            req.session.password=data3.Item.password;

            var params2 = {
                TableName : "files"
            }

             docClient.scan(params2, async (err,data)=>{
                if (err) {
                    console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
                } else {
                    console.log("GetItem succeeded:", JSON.stringify(data, null, 2));
                    filesList=data.Items;
                    

                    var filesList =[] ;
                    data.Items.forEach((item) => {
                        if(item.email==req.session.email){
                            filesList.push(item);
                        }
                    })

                    req.session.files=filesList;
                        console.log(filesList);

                        await new Promise(resolve => setTimeout(resolve, 1000));
                        console.log("about to render dashboard with files: "+req.session.files);
                        res.render('dashboard', { userName: req.session.user, filesToDisplay:req.session.files });
                }
            })


        }else{
            res.render('index');
        }

            }
        });
    }
    
}

//login using email mongoDB method
// exports.login = (req, res) => {

//     console.log("inside login method");
//     if (!req.body) {
//         console.log("inside req.body check method");
//         res.status('400').send({ message: "Request body cannot be empty" })
//         return;
//     }


//     const inputEmail = req.body.email;
//     // console.log('THIS IS DATA BEFORE CALLBACK ' + userdb.findOne({ email: inputEmail }));
    

//     if(req.body.email=='admin@gmail.com'){
//             console.log("inside admin function");

//             var userList='';
//             var filesList='';
//             // req.session.user = req.body.email;
//             req.session.user = "Admin";

//             userdb.find().then(users => {
//                 userList = users;
//             }).catch(err => {
//                 res.status(500).send({
//                     message: err.message || "Error encountered when fetching all users"
//                 })
//             })

//             filesdb.find().then(files => {
//                 filesList = files;
//                 req.session.files = filesList;

//                 res.render('adminView', { userName: req.session.user, filesToDisplay:req.session.files , usersToDisplay:userList });

//             }).catch(err => {
//                 res.status(500).send({
//                     message: err.message || "Error encountered when fetching all users"
//                 })
//             })




//     }else{
//     // Checking if user in database exists with the given email 
//     // findOne is the method for finding a particular field from the database in mongodb, we cannot use find here- doenst do validation
//     userdb.findOne({ email: inputEmail })
//         .then(data => {
//             //    console.log(inputEmail);
//             console.log("inside find method");
//             console.log('THIS IS DATA After CALLBACK ' + data);
//             if (!data) {
//                 // res.status(404).send({ message: `cannot find the user with email:${inputEmail}` });
//                 res.status(404);
//                 alert(`cannot find the user with email:${inputEmail}`);
//             } else {
//                 if (data.password == req.body.password) {
//                     // using session which we added as middlewear in server.js here . we use this session to pass username to ejs file dashboard.ejs
//                     console.log(req.session.user);
//                     req.session.user = data.name;
//                     req.session.email = data.email;
//                     console.log(req.session.user);

//                     var userEmail = data.email;
//                     console.log(userEmail);
//                     // using this userEmail object did not work in the below filesdb.find({email:req.body.email})

//                     // gettting list of the files uploaded by the user
//                     filesdb.find({email:req.body.email}).then(
//                         filesList=>{
//                             console.log("entered filesdb function");
//                             if(!filesList){
//                                 console.log("No files found for the user");
//                             }else{
//                                 req.session.files = filesList;
//                                 console.log("trying to print files list after fetch from db "+filesList);
//                             }
//                         }
//                     ).then( render =>{
//                         console.log("about to render dashboard with files: "+req.session.files);
//                         res.render('dashboard', { userName: req.session.user, filesToDisplay:req.session.files });
//                     }
                       
//                     ).catch(err => {
//                         res.status(500).send({
//                             message: err.message || "Error encountered when fetching all files for the user"
//                         })
//                     })
                        
//                 } else {
//                     res.status(404).send({ message: `incorrect Password for user :${inputEmail}` });
//                 }


//             }
//         })
//     }
    
// }




//to update a user
exports.update = (req, res) => {

    // console.log(req);
    console.log(req.session.user);

 
    if (!req.body) {
        res.status('400').send({ message: "Request body cannot be empty" })
        return;
    }

    console.log("inside update func");
    console.log(req.file);
    console.log(req.body.test);
    console.log(req.body.fileUrl);
    // console.log(req.body.file);

    // const id = req.params.id;
    // userdb.findByIdAndUpdate(id, req.body, { useFindAndModify: false })
    //     .then(data => {
    //         if (!data) {
    //             res.status(404).send({ message: `cannot update the user with ID` });
    //         }
    //     }

    //     )

}

// DynamoDb method to delete a file
exports.delete = (req, res) => {
    console.log("inside delete function");
    console.log(req.query.url);
    console.log(req.session);

    var fileUrl = req.query.url;

    AWS.config.update({
        "region": process.env.region,
        // "endpoint":process.env.DynamoDb_URI, -- adding this here will cause problems with s3 upload function coz it wil change bucket URL
        "accessKeyId": process.env.AwsAccessKeyId,
        "secretAccessKey": process.env.AwsSecretAccessKey,
    });

    // implementing dynamodb
    var docClient = new AWS.DynamoDB.DocumentClient({
        "endpoint":process.env.DynamoDb_URI
    });
    
    var params = {
        TableName:"files",
        Key:{
            "fileUrl": fileUrl 
        }
    };
    
    console.log("Attempting a conditional delete...");
    docClient.delete(params, function(err, data) {
        if (err) {
            console.error("Unable to delete item. Error JSON:", JSON.stringify(err, null, 2));
        } else {
            console.log("DeleteItem succeeded:", JSON.stringify(data, null, 2));

            var params2 = {
                TableName : "files"
            }

             docClient.scan(params2, async (err,data)=>{
                if (err) {
                    console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
                } else {
                    console.log("GetItem succeeded:", JSON.stringify(data, null, 2));
                    filesList=data.Items;
                    

                    var filesList =[] ;
                    data.Items.forEach((item) => {
                        if(item.email==req.session.email){
                            filesList.push(item);
                        }
                    })

                    req.session.files=filesList;
                        console.log(filesList);

                        await new Promise(resolve => setTimeout(resolve, 1000));
                        console.log("about to render dashboard with files: "+req.session.files);
                        res.render('dashboard', { userName: req.session.user, filesToDisplay:req.session.files });
                }
            })

            // res.render('dashboard', { userName: req.session.user, filesToDisplay:req.session.files });
        }
    });


    // filesdb.remove({fileUrl:req.query.url}).then(
    //     // waiting for 2 seconds before fetching new fileslist, didnt work here probably because we need to define a func inside then
    //     // await new Promise(resolve => setTimeout(resolve, 5000));

    //     filesdb.find({email:req.session.email}).then(
    //         // have to make this function async in order to use await in the below func
    //     async filesList=>{
    //         // waits for 3 seconds before fetching new list of files for the user
    //         await new Promise(resolve => setTimeout(resolve, 3000));
    //         console.log("entered filesdb function");
    //         if(!filesList){
    //             console.log("No files found for the user");
    //         }else{
    //             req.session.files = filesList;
    //             console.log("trying to print files list after fetch from db "+filesList);
    //         }
    //     }
    // ).then( render =>{
    //     console.log("about to render dashboard with files: "+req.session.files);
    //     res.render('dashboard', { userName: req.session.user, filesToDisplay:req.session.files });
    // }
       
    // )).catch(err => {
    //     res.status(500).send({
    //         message: err.message || "Error encountered when fetching all files for the user"
    //     })
    // })



}


//MongoDB method to delete a user
// exports.delete = (req, res) => {
//     console.log("inside delete function");
//     console.log(req.query.url);
//     console.log(req.session);

//     var fileUrl = req.query.url;
//     // console.log(req.file);
//     // console.log(req.body.fileUrl);
//     // console.log(req.body.test);
//     // console.log(req.body.fileName);
//     // console.log(req.body.test2);

//     filesdb.remove({fileUrl:req.query.url}).then(
//         // waiting for 2 seconds before fetching new fileslist, didnt work here probably because we need to define a func inside then
//         // await new Promise(resolve => setTimeout(resolve, 5000));

//         filesdb.find({email:req.session.email}).then(
//             // have to make this function async in order to use await in the below func
//         async filesList=>{
//             // waits for 3 seconds before fetching new list of files for the user
//             await new Promise(resolve => setTimeout(resolve, 3000));
//             console.log("entered filesdb function");
//             if(!filesList){
//                 console.log("No files found for the user");
//             }else{
//                 req.session.files = filesList;
//                 console.log("trying to print files list after fetch from db "+filesList);
//             }
//         }
//     ).then( render =>{
//         console.log("about to render dashboard with files: "+req.session.files);
//         res.render('dashboard', { userName: req.session.user, filesToDisplay:req.session.files });
//     }
       
//     )).catch(err => {
//         res.status(500).send({
//             message: err.message || "Error encountered when fetching all files for the user"
//         })
//     })



// }


// module.exports=up;

