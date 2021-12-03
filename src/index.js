const express = require("express");
const dotenv = require("dotenv");
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const GitHubStrategy = require("passport-github").Strategy;
const User = require("./User");
// const pool = require("../db");
const { query } = require("express");

dotenv.config();
const app = express();
//----------------------------------------- END OF IMPORTS---------------------------------------------------

const CONNECTION_URL = `${process.env.START_MONGODB}${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}${process.env.END_MONGODB}`;

const PORT = process.env.PORT || 4000;

mongoose.connect(
  `${process.env.START_MONGODB}${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}${process.env.END_MONGODB}`,
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  },
  () => {
    console.log("Connected to mongoose successfully");
  }
);

// mongoose
//   .connect(
//     `${process.env.START_MONGODB}${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}${process.env.END_MONGODB}`,
//     { useNewUrlParser: true, useUnifiedTopology: true }
//   )
//   .then(() =>
//     app.listen(PORT, () =>
//       console.log(`Mongoose Server Running on Port: http://localhost:${PORT}`)
//     )
//   )
//   .catch((error) => console.log(`${error} did not connect`));

//----------------------------------------- END OF MONGODB CONNECTION---------------------------------------------------
app.use(express.json());
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.set("trust proxy", 1);

app.use(
  session({
    secret: "secretcode",
    resave: true,
    saveUninitialized: true,
    cookie: {
      sameSite: "none",
      secure: true,
      maxAge: 1000 * 60 * 60 * 24 * 7, // One Week
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
  return done(null, user._id);
});

passport.deserializeUser((id, done) => {
  User.findById(id, (err, doc) => {
    return done(null, doc);
  });
});

//passport google strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: `${process.env.GOOGLE_CLIENT_ID}`,
      clientSecret: `${process.env.GOOGLE_SECRET_KEY}`,
      callbackURL: "http://localhost:4000/auth/google/callback",
    },
    function (accessToken, refreshToken, profile, cb) {
      //Called on  Successful authentication
      User.findOne({ googleId: profile.id }, async (err, doc) => {
        if (err) {
          cb(err, null);
        }

        if (!doc) {
          const newUser = new User({
            googleId: profile.id,
            username: profile.name.givenName,
          });
          await newUser.save();
          cb(null, newUser);
        }
        cb(null, doc);
      });
    }
  )
);

// passport Github Strategy

passport.use(
  new GitHubStrategy(
    {
      clientID: `${process.env.GITHUB_CLIENT_ID}`,
      clientSecret: `${process.env.GITHUB_CLIENT_SECRET}`,
      callbackURL: "http://localhost:4000/auth/github/callback",
    },
    function (accessToken, refreshToken, profile, cb) {
      User.findOne({ githubId: profile.id }, async (err, doc) => {
        if (err) {
          return cb(err, null);
        }

        if (!doc) {
          const newUser = new User({
            githubId: profile.id,
            username: profile.username,
          });

          await newUser.save();
          cb(null, newUser);
        }
        cb(null, doc);
      });
    }
  )
);

// app.use(bodyParser.json({ limit: "30mb", extended: true }));
// app.use(bodyParser.urlencoded({ limit: "30mb", extended: true }));
// app.use(cors());

// mongoose.set("useFindAndModify", false);
//----------------------------------------- END OF MIDDLEWARE---------------------------------------------------

//----Google auth-----
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile"] })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function (req, res) {
    // Successful authentication, redirect home.
    res.redirect("http://localhost:3000");
  }
);

//------Github auth---------------

app.get("/auth/github", passport.authenticate("github"));

app.get(
  "/auth/github/callback",
  passport.authenticate("github", { failureRedirect: "/login" }),
  function (req, res) {
    // Successful authentication, redirect home.
    res.redirect("http://localhost:3000");
  }
);

//-----------
app.get("/", (req, res) => {
  res.send("Hello World");
});

app.get("/getuser", (req, res) => {
  res.send(req.user);
});

app.get("/auth/logout", (req, res) => {
  if (req.user) {
    req.logOut();
    res.send("done");
  }
});

//Start Server

app.listen(4000, () => {
  console.log("server is running on port 4000");
});

//----------------------------------------- SQL CODE---------------------------------------------------

// create/add a student
// app.post("/students", async (req, res) => {
//   try {
//     const { sname } = req.body;
//     const newStudent = await pool.query(
//       "INSERT INTO students (sname) VALUES ($1) RETURNING *",
//       [sname]
//     );

//     res.json(sname);
//   } catch (err) {
//     console.error(err.message);
//   }
// });

// get all the student names
// app.get("/students", async (req, res) => {
//   try {
//     const allStudent = await pool.query("SELECT * FROM students");

//     res.json(allStudent.rows);
//   } catch (err) {
//     console.error(err.message);
//   }
// });

// // get a specific student with their id
// app.get("/students/:id", async (req, res) => {
//   try {
//     const { id } = req.params;

//     const getStudent = await pool.query(
//       "SELECT * FROM students WHERE student_id = $1",
//       [id]
//     );
//     console.log(getStudent.rows[0]);
//     res.json(getStudent.rows[0]);
//   } catch (err) {
//     console.error(err.message);
//   }
// });

// // update a student
// app.put("/students/:id", async (req, res) => {
//   try {
//     const { sname } = req.body;
//     const { id } = req.params;

//     const update = await pool.query(
//       "UPDATE students SET sname = $1 WHERE student_id = $2",
//       [sname, id]
//     );

//     res.json("Student name was updated");
//   } catch (err) {
//     console.err(err.message);
//   }
// });

// // delete a Student
// app.delete("/students/:id", async (req, res) => {
//   try {
//     const { id } = req.params;
//     const deleteTodo = await pool.query(
//       "DELETE FROM students WHERE student_id = $1 ",
//       [id]
//     );

//     res.json("Student was deleted");
//   } catch (err) {
//     console.error(err.message);
//   }
// });

//----------------------------------------- END OF ROUTES---------------------------------------------------
