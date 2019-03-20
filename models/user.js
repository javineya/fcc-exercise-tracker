const mongoose = require( 'mongoose' );

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  exercise: [{
    _id: false,
    description: String,
    duration: Number,
    date: {}
  }]
});

const User = mongoose.model( 'etUser', userSchema );

module.exports = User;