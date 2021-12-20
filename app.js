//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorCreate");

const homeStartingContent = "This is a simple blog application for all the lovers of blogging and sharing their daily activities.";
const aboutContent = "I am using this application to report the progress of my journey to becoming an software engineer.";
const contactContent = "email: wrightkaseem24@gmail.com github: royalxll linkedIn: Kaseem Wright";

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

app.use(session({
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/blogDB", {useNewUrlParser: true});

const postSchema = new mongoose.Schema ({
  title: String,
  content: String,
  googleId: String
});

postSchema.plugin(passportLocalMongoose);
postSchema.plugin(findOrCreate);

const Post = mongoose.model("Post", postSchema);

passport.use(Post.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  Post.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/blogs",
    //userProfileURL: "https://www.googleleapis.com/oauth2/v3/userinfo"// was needed to fetch user profile but is no longer needed
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    Post.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/", function(req, res){
  res.render("intro");
});

app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile"] })
);

app.get("/auth/google/blogs",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect secrets.
    res.redirect("/home");
  });

app.get("/login", function(req, res){
  res.render("login");
});


app.get("/home", function(req, res){

  Post.find({}, function(err, posts){
    res.render("home", {
      startingContent: homeStartingContent,
      posts: posts
      });
  });
});

app.get("/compose", function(req, res){
  if (req.isAuthenticated()){
    res.render("compose");
  } else {
    res.redirect("/login");
  }
});

app.post("/compose", function(req, res){
  const post = new Post({
    title: req.body.postTitle,
    content: req.body.postBody
  });

  console.log(req.user.id);

  Post.findById(req.user.id, function(err, post){
    if (err){
      console.log(err);
    } else {
      if (post) {
        post = new Post;
        post.save(function(){
          res.redirect("/home");
        });
      }
    }
  });

});

app.get("/posts/:postId", function(req, res){

  const requestedPostId = req.params.postId;

    Post.findOne({_id: requestedPostId}, function(err, post){
      res.render("post", {
        title: post.title,
        content: post.content
      });
    });

  });

app.get("/about", function(req, res){
  res.render("about", {aboutContent: aboutContent});
});

app.get("/contact", function(req, res){
  res.render("contact", {contactContent: contactContent});
});

app.get("/logout", function(req, res){
  req.logout();
  res.redirect("/");
});

app.listen(3000, function() {
  console.log("Server started on port 3000");
});
