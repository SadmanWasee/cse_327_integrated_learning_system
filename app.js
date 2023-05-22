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
    googleId: String
});

const classSchema = new mongoose.Schema({
    _id:Number,
    teacher:String,
    classname:String,
    subject:String
});

const joinclassSchema = new mongoose.Schema({
  studentid: String,
  classid: Number,
  teacher:String,
  classname:String,
  subject:String
})

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);
const Class = new mongoose.model("Class", classSchema);
const JoinClass = new mongoose.model("JoinClass", joinclassSchema);

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
    User.findOrCreate({ googleId: profile.id, username: profile.displayName }, function (err, user) {
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
  if(req.isAuthenticated()){
    res.render("home");
} 
else{
    res.redirect("/login");
}

});



app.get("/register", (req, res)=>{
    res.render("register");
})

app.get("/studenthome", (req, res)=>{
  if(req.isAuthenticated()){

    JoinClass.find({studentid:req.user.id}).then(function(classes){
      //console.log(classes);
      res.render("studenthome", {classes:classes})
    })
    // res.render("studenthome");
  } 
  else{
      res.redirect("/login");
  }

});

app.get("/teacherhome", (req, res)=>{

  if(req.isAuthenticated()){
    Class.find({teacher:req.user.id}).then(function(classes){
      res.render("teacherhome", { classes: classes});
    })
  } 
  else{
      res.redirect("/login");
  }


});

app.post("/studenthome", (req,res)=>{
  res.redirect("studenthome");
});

app.post("/teacherhome", (req,res)=>{
   
   res.redirect("teacherhome");
})

app.get("/createclass",(req,res)=>{
  if(req.isAuthenticated()){
    res.render("createclass");
  } 
  else{
      res.redirect("/login");
  }

});

app.post("/createclass",(req,res)=>{

  let id = Math.floor((Math.random() * 100000) + 1);
  
  const newClass = new Class({

    _id:id,
    teacher:req.user.id,
    classname:req.body.classname,
    subject:req.body.subject

  });

  newClass.save();

  res.redirect("teacherhome");
})

app.get("/joinclass",(req,res)=>{
  if(req.isAuthenticated()){
    res.render("joinclass");
  } 
  else{
      res.redirect("/login");
  }

});

app.post("/joinclass",(req,res)=>{

  Class.findById(req.body.code).then(function(classes){

    const newjoinclasinfo = new JoinClass({
      studentid: req.user.id,
      classid: req.body.code,
      teacher:classes.teacher,
      classname:classes.classname,
      subject:classes.subject
    })
    newjoinclasinfo.save();
    res.redirect("studenthome");


  })
  

})

var coursehomeid;
app.get("/coursehome", (req,res)=>{
  
  //res.render("coursehome", {classname:classname});
  Class.findById(coursehomeid).then(function(classes)
  {
    res.render("coursehome", {classname:classes.classname});
  });
  
  
});

app.post("/coursehome", (req,res)=>{
  // console.log(req.body.classid);
  // let classid = req.body.classid;
  // Class.findById(classid).then(function(classes)
  // {
    coursehomeid = req.body.classid;
    res.redirect("/coursehome");
 
});

app.post("/studentscoursehome", (req,res)=>{
  // console.log(req.body.classid);
  // let classid = req.body.classid;
  // Class.findById(classid).then(function(classes)
  // {
    studentscoursehomeid = req.body.classid;
    res.redirect("/studentscoursehome");
 
});

var studentscoursehomeid;
app.get("/studentscoursehome", (req,res)=>{
  
  //res.render("coursehome", {classname:classname});
  Class.findById(studentscoursehomeid).then(function(classes)
  {
    res.render("studentscoursehome", {classname:classes.classname});
  });
  
  
});


app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/home', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/home');
  });

  
// app.post("/register", (req,res)=>{

//     User.register({username: req.body.username}, req.body.password, function(err, user){
//         if(err){
//             console.log(err);
//             res.redirect("/register");
//         }else{
//             passport.authenticate("local")(req,res, function(){
//                 res.redirect("/home");
//             })
//         }
//     })


// });

// app.post("/login", (req,res)=>{
     
//     const user = new User({
//         username: req.body.username,
//         password: req.body.password
//     });

//     req.login(user, function(err){
//         if(err){
//             console.log(err);
//         }else{
//             passport.authenticate("local")(req, res, function(){
//                 res.redirect("/home"); 
//             });
//         }
//     });

// });


app.get('/logout', function(req, res, next){
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/');
  });
});


app.listen(3000, function(){
    console.log("Server started on port http://localhost:3000");
});
