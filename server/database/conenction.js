const mongoose = require('mongoose');
const connectDB = async()=>{

    try {
        const con = await mongoose.connect(process.env.MONGO_URI, {
            useNewURLParser:true,
            useUnifiedTopology:true,
            // useFindandModify:false,
            // useCreateIndex:true

        });
        // this `` operator can be used to specify variables like below inside a string using the dollar sign
        // console.log(`MongoDB connected : ${con.connection.host}`);

    } catch (error) {
        console.log(error);
        process.exit(1);
    }

    

}

module.exports = connectDB;