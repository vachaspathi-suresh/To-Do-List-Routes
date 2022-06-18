require("dotenv").config();
const express = require("express");
const path = require("path");
const { v1: uuidV1 } = require("uuid");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

const app = express();
app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(process.env.DBURL, {
  useNewUrlParser: true,
});

const item1 = {
  name: "Welcome to your todolist!",
  uuid: uuidV1(),
};

const item2 = {
  name: "Hit the + button to add a new item.",
  uuid: uuidV1(),
};

const item3 = {
  name: "<-- Hit this to delete an item.",
  uuid: uuidV1(),
};

const defaultItems = [item1, item2, item3];

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  lists: [{ name: String, items: [{ name: String, uuid: String }] }],
});

userSchema.plugin(passportLocalMongoose);

const User = mongoose.model("user", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.get("/auth", function (req, res) {
  res.render("signin");
});

app.get("/list", function (req, res) {
  if (req.isAuthenticated()) {
    User.findById(req.user.id, function (err, foundUser) {
      if (err) {
        console.log(err);
        res.redirect("/auth");
      } else {
        if (foundUser) {
          const list = foundUser.lists.find(function (lis) {
            return lis.name === "Today";
          });
          if (list) {
            //Show an existing list
            res.render("list", {
              listTitle: list.name,
              newListItems: list.items,
            });
          } else {
            //Create a new list
            const newList = {
              name: "Today",
              items: defaultItems,
            };
            foundUser.lists.push(newList);
            foundUser.save();
            res.redirect("/list");
          }
        }
      }
    });
  } else {
    res.redirect("/auth");
  }
});

app.get("/list/:customListName", function (req, res) {
  const customListName = _.capitalize(req.params.customListName);
  if (req.isAuthenticated()) {
    User.findById(req.user.id, function (err, foundUser) {
      if (err) {
        console.log(err);
        res.redirect("/auth");
      } else {
        if (foundUser) {
          const list = foundUser.lists.find(function (lis) {
            return lis.name === customListName;
          });
          if (list) {
            //Show an existing list
            res.render("list", {
              listTitle: list.name,
              newListItems: list.items,
            });
          } else {
            //Create a new list
            const newList = {
              name: customListName,
              items: defaultItems,
            };
            foundUser.lists.push(newList);
            foundUser.save();
            res.redirect("/list/" + customListName);
          }
        }
      }
    });
  } else {
    res.redirect("/auth");
  }
});

app.get("/logout", function (req, res) {
  req.logOut(function (err) {
    if (err) {
      console.log(err);
      res.redirect("/lists");
    } else {
      res.redirect("/auth");
    }
  });
});

app.post("/signup", function (req, res) {
  User.register(
    { username: req.body.username },
    req.body.password,
    function (err, user) {
      if (err) {
        console.log(err);
        res.redirect("/auth");
      } else {
        passport.authenticate("local")(req, res, function () {
          res.redirect("/list");
        });
      }
    }
  );
});

app.post("/signin", function (req, res) {
  const user = new User({
    username: req.body.username,
    password: req.body.password,
  });

  req.logIn(user, function (err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function () {
        res.redirect("/list");
      });
    }
  });
});

app.post("/list", function (req, res) {
  const itemName = req.body.newItem;
  const listName = req.body.list;
  const item = {
    name: itemName,
    uuid: uuidV1(),
  };

  if (req.isAuthenticated()) {
    User.findById(req.user.id, function (err, foundUser) {
      if (err) {
        console.log(err);
        res.redirect("/auth");
      } else {
        if (foundUser) {
          foundUser.lists = foundUser.lists.map(function (list) {
            if (list.name === listName) {
              list.items.push(item);
            }
            return list;
          });
          foundUser.save();
          if (listName === "Today") {
            res.redirect("/list");
          } else {
            res.redirect("/list/" + listName);
          }
        }
      }
    });
  } else {
    res.redirect("/auth");
  }
});

app.post("/delete", function (req, res) {
  const checkedItemId = req.body.checkbox;
  const listName = req.body.listName;

  if (req.isAuthenticated()) {
    User.findById(req.user.id, function (err, foundUser) {
      if (err) {
        console.log(err);
        res.redirect("/auth");
      } else {
        if (foundUser) {
          foundUser.lists = foundUser.lists.map(function (list) {
            if (list.name === listName) {
              list.items = list.items.filter(function (item) {
                return item.uuid !== checkedItemId;
              });
            }
            return list;
          });
          foundUser.save();
          if (listName === "Today") {
            res.redirect("/list");
          } else {
            res.redirect("/list/" + listName);
          }
        }
      }
    });
  } else {
    res.redirect("/auth");
  }
});

app.listen(process.env.PORT || 3000, function () {
  console.log("Server started on port 3000");
});
