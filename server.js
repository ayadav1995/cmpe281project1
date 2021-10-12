const express = require('express');
const dotenv = require('dotenv');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const path = require('path');
const mongoose = require('mongoose');
const session=require('express-session');

const connectDB = require('./server/database/conenction');

const app = express();

dotenv.config({path:'config.env'})
// creating a constant port variable and keeping 8080 as default value 
const PORT = process.env.PORT||8080

//to log requests : will print stuff like : 'GET / 200 19 - 4.930 ms' in the console. that is the request type , path and time taken
app.use(morgan('tiny'));

//mongoDB connection
connectDB();

// using body parser to  parse request
app.use(bodyParser.urlencoded({extended:true}));

//Express session
app.use(session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true
}));

//setting the view engine
app.set("view engine", 'ejs');


app.use('/css', express.static(path.resolve(__dirname,"assets/css")));
app.use('/img', express.static(path.resolve(__dirname,"assets/img")));
app.use('/js', express.static(path.resolve(__dirname,"assets/js")));


//load routers 
app.use('/',require('./server/routes/router'));

app.listen(PORT, ()=>{
    console.log('Server is running on http://localhost:${'+PORT+'}');
}); 