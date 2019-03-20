const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const moment = require( 'moment' );
const mongoose = require('mongoose');
mongoose.connect(process.env.MLAB_URI || 'mongodb://localhost/exercise-track' );

const dbUser = require( './models/user.js' );

app.use(cors());
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// add a new user to the database
app.post( "/api/exercise/new-user", ( req, res ) => {
  let newUser = new dbUser( req.body );
  
  newUser.save()
   .then( item => {
     res.send( newUser );
   })
   .catch( error => {
     res.status( 400 ).send( "That username is taken." );
   });
});

// use momentJS to validate and send dates
const handleDate = ( date ) => {
  if ( !date ) {
    return moment().format( 'YYYY-MM-DD' );
    
  } else if ( !moment( date, 'YYYY-MM-DD' ).isValid() ) {
    return moment().format( 'YYYY-MM-DD' );;
    
  } else {
    return date;
    
  }
};

// add an exercise to an existing user
app.post( "/api/exercise/add", ( req, res ) => {
  let data = req.body;
  let userId = data.userId;
  let exercise = { 
    description: data.description,
    duration: data.duration,
    date: handleDate( data.date )
  };
  
  // find and update the user by ID
  dbUser.findOneAndUpdate( 
    { _id: userId },
    { $push: { exercise: exercise }},
    function( error, data ) {
      if ( error ) {
        return error;
      }
    }
  );
  
  // return the user object after adding exercise
  dbUser.findById( userId, ( error, user ) => {
    if ( error ) { return error }
    
    res.send({ 
      username: user.username, 
      exercise: user.exercise
    });
  });
});

// get a list of all users
app.get( "/api/exercise/users", ( req, res, next ) => {
  dbUser.find({}, ( error, users ) => {
    if ( error ) { return next( error );
    }
    
    res.send( users.map(( user ) => user.username ));
  });
});

// get user's exercise log
app.get( "/api/exercise/log", ( req, res, next ) => {
  // store all necessary variables
  let userId = req.query.userId;
  let queries = {
    from: req.query.from,
    to: req.query.to,
    limit: req.query.limit
  };
  
  // find the correct user by ID
  dbUser.findById( userId, ( error, user ) => {
    if ( !user ) { 
      res.send({ "Error": "User not found." })
      
    } else { 
      let results = user.exercise;
      
      if ( queries.from && queries.to ) {
        results = results.filter(( exercise ) => ( 
          exercise.date >= queries.from && exercise.date <= queries.to 
        ));
        
      } else if ( queries.from ) {
        results = results.filter(( exercise ) => ( 
          exercise.date >= queries.from 
          
        ))
      }
      
      if ( results.length > queries.limit ) {
        results = results.slice( 0, queries.limit );
      }
      
      res.send({
        user: user.username,
        total: results.length,
        exercise: results
      });
    }
  });
});

// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
});

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
});
