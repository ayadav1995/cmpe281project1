const mongoose = require('mongoose');

var userSchema = new mongoose.Schema({

    name:{
        type : String,
        required : true
    },
    email:{
        type : String,
        required: true
    },
    password:{
        type : String,
        required : true
    }
})

const userdb = mongoose.model('user',userSchema);

module.exports = userdb;






// var AWS = require("aws-sdk");

// AWS.config.update({
//   region: "us-west-2",
//   endpoint: "http://localhost:8000"
// });

// var dynamodb = new AWS.DynamoDB();

// var params = {
//     TableName : "Users",
//     KeySchema: [       
//         { AttributeName: "year", KeyType: "HASH"},  //Partition key
//     ],
//     AttributeDefinitions: [       
//         { AttributeName: "id", AttributeType: "N" },
//         { AttributeName: "name", AttributeType: "S" },
//         { AttributeName: "email", AttributeType: "S" },
//         { AttributeName: "password", AttributeType: "S" },
//         { AttributeName: "date", AttributeType: "S" }
//     ],
//     // ProvisionedThroughput: {       
//     //     ReadCapacityUnits: 10, 
//     //     WriteCapacityUnits: 10
//     // }
// };

// dynamodb.createTable(params, function(err, data) {
//     if (err) {
//         console.error("Unable to create table. Error JSON:", JSON.stringify(err, null, 2));
//     } else {
//         console.log("Created table. Table description JSON:", JSON.stringify(data, null, 2));
//     }
// });