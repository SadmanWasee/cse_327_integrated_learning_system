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
const multer  = require('multer');

const UPLOADS_FOLDER = "./uploads/";



//const upload = multer({ storage: storage })

// var upload = multer({
//   dest:UPLOADS_FOLDER,
//   limits:{
//     fileSize: 524288000,
//   },
//   fileFilter:(req, file, cb)=>{

//     if(
//       file.mimetype == "application/pdf"||
//       file.mimetype == "video/x-matroska"||
//       file.mimetype == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"||
//       file.mimetype == "application/vnd.openxmlformats-officedocument.presentationml.presentation"
//     ){
//       cb(null,true);
//     }else{
//       cb(new Error("Only pdf, docx and mkv file allowed"));
//     }

//   },
// });

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


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_FOLDER);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = file.originalname;
    cb(null, uniqueSuffix)
  }
})

const upload = multer({ storage: storage })

app.use((err,req,res,next)=>{
  if(err){
    if(err instanceof multer.MulterError){
      res.status(500).send("There was an upload error!");
    }
  }else{
    res.status(500).send(err.message);
  }
})



const userSchema = new mongoose.Schema({
    username: String,
    googleId: String,
    email: String
});

const classSchema = new mongoose.Schema({
    _id:String,
    teacherid:String,
    teachername:String,
    teacheremail:String,
    classname:String,
    subject:String
});

const joinclassSchema = new mongoose.Schema({
  _id:String,
  studentid: String,
  studentname:String,
  studentemail:String,
  classid: Number,
  teacher:String,
  classname:String,
  subject:String
})

const waitinglistSchema = new mongoose.Schema({
  _id:String,
  studentid: String,
  studentname:String,
  studentemail:String,
  classid: Number,
  teacher:String,
  classname:String,
  subject:String
});

const announcemntShcema = new mongoose.Schema({

  classid:String,
  teacherid:String,
  title: String,
  details: String,
  date:String
});


const assignmentschema = new mongoose.Schema({
  classid:String,
  title:String,
  description:String,
  file:String,
  marks:String,
  deadline:String

})

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);
const Class = new mongoose.model("Class", classSchema);
const JoinClass = new mongoose.model("JoinClass", joinclassSchema);
const WaitingList = new mongoose.model("WaitingList", waitinglistSchema);
const Announcement = new mongoose.model("Announcement", announcemntShcema);
const Assignment = new mongoose.model("Assignment", assignmentschema);

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
    User.findOrCreate({ googleId: profile.id, username: profile.displayName, email:profile.emails[0].value }, function (err, user) {
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
      res.render("studenthome", {classes:classes})
    });
  } 
  else{
      res.redirect("/login");
  }

});

app.get("/teacherhome", (req, res)=>{

  if(req.isAuthenticated()){
    Class.find({teacherid:req.user.id}).then(function(classes){
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

  
  
  User.findById(req.user.id).then((founduser)=>{

    let id = "";
    for(let i=0;i<7;i++)
    {
      let char = Math.floor((Math.random() * 10));
      char.toString;
      id = id+char;

    }

    const newClass = new Class({

      _id:id,
      teacherid:req.user.id,
      teachername:founduser.username,
      teacheremail:founduser.email,
      classname:req.body.classname,
      subject:req.body.subject
  
    });
  
    newClass.save();
  
    res.redirect("teacherhome");

  });
  
  
})

app.get("/joinclass",async(req,res)=>{
  if(req.isAuthenticated()){
    res.render("joinclass");
  } 
  else{
      res.redirect("/login");
  }

});


var class_exist, is_teacher, is_student, is_pending;
app.post("/joinclass",async(req,res)=>{

  var jccode = req.body.code; 

  var jcid = jccode+req.user.id; 

  class_exist = await Class.findById(jccode);

  is_teacher = await Class.findOne({_id:jccode, teacherid:req.user.id});

  is_student = await JoinClass.findOne({_id:jcid, studentid:req.user.id});

  is_pending = await WaitingList.findOne({_id:jccode, studentid:req.user.id});

  if(class_exist!=null && is_teacher == null && is_student == null && is_pending == null){
    User.findById(req.user.id).then(function(founduser){

      Class.findById(jccode).then(function(classes){
  
        const newrequestinfo = new WaitingList({
          _id:jcid,
          studentid: req.user.id,
          studentname: founduser.username,
          studentemail:founduser.email,
          classid: req.body.code,
          teacher:classes.teacher,
          classname:classes.classname,
          subject:classes.subject
        })
        
        newrequestinfo.save().then((res)=>{
          res.redirect("studenthome");
        }).catch((err)=>{
          res.redirect("studenthome");
        });
    
    
      }).catch((err)=>{
        res.redirect("studenthome");
      })
  
    });
  }
  else{
    res.redirect("studenthome");
  }
  

});



var coursehomeid;
app.get("/coursehome", (req,res)=>{
  
  Class.findById(coursehomeid).then(function(classes)
  {
    res.render("coursehome", {classname:classes.classname, code: classes.id});
  });
  
  
});

app.post("/coursehome", (req,res)=>{
    coursehomeid = req.body.classid;
    res.redirect("/coursehome");
 
});

app.post("/studentscoursehome", (req,res)=>{
  
    studentscoursehomeid = req.body.classid;
    res.redirect("/studentscoursehome");
 
});

var studentscoursehomeid;
app.get("/studentscoursehome", (req,res)=>{
  
  Class.findById(studentscoursehomeid).then(function(classes)
  {
    res.render("studentscoursehome", {classname:classes.classname});
  });
  
  
});

var waitinglistop;
var code; 

app.get("/waitinglist", (req,res)=>{

  if(waitinglistop == 1 || waitinglistop == 0)
  {
    if(waitinglistop==1)
    {
      WaitingList.findById(code).then((foundreq)=>{

        const newjoininfo = new JoinClass({
          _id:foundreq.id,
          studentid: foundreq.studentid,
          studentname:foundreq.studentname,
          studentemail:foundreq.studentemail,
          classid: foundreq.classid,
          teacher:foundreq.teacher,
          classname:foundreq.classname,
          subject:foundreq.subject

          
        })

        newjoininfo.save();
      })

      WaitingList.deleteOne({_id:code}).then(function(){

        Class.findById(coursehomeid).then(function(classes)
        {
          WaitingList.find({classid:coursehomeid}).then(function(joinclasses){

            res.render("waitinglist", {classes:classes , joinclasses:joinclasses});

          });
        });

      });

    }
    else
    {
      WaitingList.deleteOne({_id:code}).then(function(){

        Class.findById(coursehomeid).then(function(classes)
        {
          WaitingList.find({classid:coursehomeid}).then(function(joinclasses){

            res.render("waitinglist", {classes:classes , joinclasses:joinclasses});

          });
        });

      });
    }
    
  }
  else{

    Class.findById(coursehomeid).then(function(classes)
    {
      WaitingList.find({classid:coursehomeid}).then(function(joinclasses){

        res.render("waitinglist", {classes:classes , joinclasses:joinclasses});

      });
    });

  }
  
})

app.post("/waitinglist",(req,res)=>{
  code = req.body.waitinglistcode;
  waitinglistop = req.body.waitinglistop;
  res.redirect("waitinglist");
})


app.get("/listofpeople", (req,res)=>{
  Class.findById(coursehomeid).then(function(classes)
  {
    JoinClass.find({classid:coursehomeid}).then(function(joinclasses){

      res.render("listofpeople", {classes:classes , joinclasses:joinclasses});

    });
  });
})

app.post("/listofpeople",(req,res)=>{
  res.redirect("listofpeople");
})

app.get("/studentlistofpeople", (req,res)=>{
  Class.findById(studentscoursehomeid).then(function(classes)
  {
    JoinClass.find({classid:studentscoursehomeid}).then(function(joinclasses){

      res.render("studentlistofpeople", {classes:classes , joinclasses:joinclasses});

    });
  });
})

app.post("/studentlistofpeople",(req,res)=>{
  res.redirect("studentlistofpeople");
});


app.get("/announcementlist", (req,res)=>{

  if(req.isAuthenticated()){
    Class.findById(coursehomeid).then(function(classinfo){

      Announcement.find({classid:coursehomeid, teacherid:req.user.id}).then(function(announcements){
        res.render("announcementlist", { classinfo:classinfo, announcements: announcements});
      });

    })
    
  } 
  else{
      res.redirect("/login");
  }


});

app.post("/announcementlist", async(req,res)=>{
  res.redirect("announcementlist");
});


app.get("/studentannouncementlist", (req,res)=>{

  if(req.isAuthenticated()){
    JoinClass.find({classid:studentscoursehomeid}).then(function(classinfo){

      Announcement.find({classid:studentscoursehomeid}).then(function(announcements){
        res.render("studentannouncementlist", { classinfo:classinfo, announcements: announcements});
      });

    })
    
  } 
  else{
      res.redirect("/login");
  }


});

app.post("/studentannouncementlist", async(req,res)=>{
  res.redirect("studentannouncementlist");
});


app.get("/createannouncement", async(req,res)=>{

  Class.findById(coursehomeid).then(function(classinfo){

    res.render("createannouncement", {classinfo:classinfo});

  })
});



app.post("/createannouncement", (req,res)=>{

  const newannouncement = new Announcement({

    classid:coursehomeid,
    teacherid:req.user.id,
    title: req.body.title,
    details: req.body.description

  });

  newannouncement.save();
  
  res.redirect("announcementlist");
});


app.get("/assignmentslist", (req,res)=>{

  if(req.isAuthenticated()){
    Class.findById(coursehomeid).then(function(classinfo){

      Assignment.find({classid:coursehomeid}).then(function(assignments){
        res.render("assignmentslist", {classinfo:classinfo, assignments:assignments});
      })
  
    });
    
  } 
  else{
      res.redirect("/login");
  }


});

app.post("/assignmentslist", async(req,res)=>{
  res.redirect("assignmentslist");
});


app.get("/studentassignmentslist", (req,res)=>{

  if(req.isAuthenticated()){
    JoinClass.find({classid:studentscoursehomeid}).then(function(classinfo){

      Assignment.find({classid:studentscoursehomeid}).then(function(assignments){
        res.render("studentassignmentslist", { classinfo:classinfo, assignments: assignments});
      });
    })
  } 
  else{
      res.redirect("/login");
  }


});

app.post("/studentassignmentslist", async(req,res)=>{
  res.redirect("studentassignmentslist");
});


app.get("/createassignment", async(req,res)=>{

  Class.findById(coursehomeid).then(function(classinfo){

    res.render("createassignment", {classinfo:classinfo});

  })
});



app.post("/createassignment",upload.single("file-upload"),(req,res)=>{

  const newannouncement = new Assignment({

    classid:coursehomeid,
    title:req.body.title,
    description:req.body.description,
    file:req.body.filename,
    marks:req.body.marks,
    deadline:req.body.deadline

  });

  newannouncement.save().then(()=>{
    res.redirect("assignmentslist");
  }).catch(()=>{
    res.redirect("assignmentslist");
  })
  

});


app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/home', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/home');
  });

  


app.get('/logout', function(req, res, next){
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/');
  });
});


app.listen(3000, function(){
    console.log("Server started on port http://localhost:3000");
});
