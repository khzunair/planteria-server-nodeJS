
const express = require('express');
const bodyParser = require('body-parser');


// // Connect Application to Database
const connectDB = require('./config/db');

const cors = require("cors");



const app = express();

app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));
app.use(bodyParser.json({ limit: '10mb' })); // to support JSON-encoded bodies
app.use(express.json({ extended: false }))
// app.use(
// 	cookieSession({
// 		name: "session",
// 		keys: ["cyberwolve"],
// 		maxAge: 24 * 60 * 60 * 100,
// 	})
// );


// for Production
const path = require('path')


// Connect Database
connectDB();

app.use(cors())
// init middleware 
// to get data in request.body
app.use(express.json({extended: false}))





// ******* Routes *******

// Dummy Route
app.get('/', (req, res) => res.send('API Running'));
// app.use('/api/users', require('./routes/api/users'))


// for production
// Serve static assets in production
if(process.env.NODE_ENV === 'production'){
    // set static folder
    app.use(express.static('client/build'));
    const path = require('path')
    app.get('*',(req,res)=>{
        res.sendFile(path.resolve(__dirname, 'client','build','index.html'))
    })
}

const PORT = process.env.PORT  || 5000;

app.listen(PORT, ()=> console.log(`Server started on port ${PORT}`));
