require('dotenv').config();
const express = require("express");
const bodyparser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');



const app = express();



app.use(express.static("public")); 
app.set('view engine', 'ejs');
app.use(bodyparser.urlencoded({
    extended: true
}));


app.use(session({
    secret: process.env.SECRET,
    resave:false,
    saveUninitialized:false
}));


app.use(passport.initialize());
app.use(passport.session());


mongoose.connect('mongodb://127.0.0.1:27017/ims1DB');


const userSchema = new mongoose.Schema({
    username: String,
    googleId: String,
    email: String,
    password: String,
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      cb(null, { id: user.id, username: user.username });
    });
  });
  
  passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user);
    });
  });

  passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/home"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));



app.get("/" , (req,res)=>{
    res.render("index"); 
});

app.get("/login", (req, res)=>{
    res.render("login");
})


app.get("/home", (req, res)=>{
    res.render("home");
})

app.get("/register", (req, res)=>{
    res.render("register");
})

app.get("/studenthome", (req, res)=>{
  res.render("studenthome");
})

app.get("/teacherhome", (req, res)=>{
  res.render("teacherhome");
})



app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));

app.get('/auth/google/home', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/home');
  });

app.post("/register", (req,res)=>{

    User.register({username: req.body.username}, req.body.password, function(err, user){
        if(err){
            console.log(err);
            res.redirect("/register");
        }else{
            passport.authenticate("local")(req,res, function(){
                res.redirect("/home");
            })
        }
    })


});

app.post("/login", (req,res)=>{
     
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, function(err){
        if(err){
            console.log(err);
        }else{
            passport.authenticate("local")(req, res, function(){
                res.redirect("/home"); 
            });
        }
    });

});






app.listen(3000, function(){
    console.log("Server started on port http://localhost:3000");
});
