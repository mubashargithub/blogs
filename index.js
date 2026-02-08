// =====================
// IMPORTS
// =====================
const express = require('express');
const app = express();
const path = require('path');
const {faker} = require("@faker-js/faker");
const methodOverride = require('method-override');
const session = require("express-session");
const bcrypt = require("bcryptjs"); // 🔴 CHANGE: password hashing
const { v4: uuidv4 } = require("uuid");

const connection = require("./config/db_connection");
const { error } = require('console');



app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));





// app.use((req, res, next) => {
//     // Pass user session data to all views
//     res.locals.user = req.session.user || null;
//     next();
// });





app.use(
    session({
        secret: "keyboard cat",
        resave: true,
        saveUninitialized: false,
        cookie: { maxAge: 1000 * 60 * 60 }
    })
);

// // 🔴 CHANGE: prevent browser cache after logout
// app.use((req, res, next) => {
//     res.setHeader("Cache-Control", "no-store");
//     next();
// });


// =====================
// VIEW ENGINE
// =====================
app.set('view engine', 'ejs');
app.set("views", path.join(__dirname, 'views'));




// =====================
// AUTH MIDDLEWARES
// =====================

// 🔴 CHANGE: reusable user authentication middleware
const isUserLoggedIn = (req, res, next) => {
    if (!req.session.user) return res.redirect("/user/login");
    next();
};

// 🔴 CHANGE: reusable admin authentication middleware
const isAdminLoggedIn = (req, res, next) => {
    if (!req.session.admin) return res.redirect("/admin/login");
    next();
};







app.get("/", (req, res) => {
    query = `SELECT * FROM posts`;
    connection.query(query , (err,result)=>{
        // console.log(result);
        if(err) throw err;
        res.render("home.ejs" , {posts:result});
    })
});

app.get("/post/detail/:id",(req,res)=>{
    const id = req.params.id;
    const q = `SELECT * FROM posts WHERE id=?`;

    connection.query(q, [id],(err, posts) => {
        const post_s = posts[0];
        // console.log(posts);
        connection.query("SELECT * FROM users WHERE id=?" , [post_s.user_id] , (err , result)=>{
            const user_s = result[0];
            const autho = req.session.admin;
            res.render("view_postDetails" , {post_s , user_s , autho})
        })
    })   
})

app.get("/user/signup",(req,res)=>{
    res.render("user_signup");
})

app.post("/user/signup",(req,res)=>{
    try {
        const { name, email, password } = req.body;
        const id = uuidv4();

        // 🔴 CHANGE: hash password before saving
        // const hashedPassword = await bcrypt.hash(password, 10);

        const q = `
            INSERT INTO users (id, name, email, password, role, created_at)
            VALUES (?, ?, ?, ?, "user" ,  NOW())
        `;

        connection.query(q, [id, name, email, password], (err) => {
            if (err) {
                return res.render("user_signup.ejs", { error: "User already exists" });
            }
            res.redirect("/user/login");
        });

    } catch (err) {
        console.log(err);
        res.render("signup.ejs", { error: "Something went wrong" });
    }
    // res.render("user_signup");
})


app.get("/user/login",(req,res)=>{
    res.render("user_login");
})

app.post("/user/login",(req,res)=>{

    const { email, password } = req.body;

    const q = `SELECT * FROM users WHERE email=?`;

    connection.query(q, [email],(err, result) => {
        if (err) return res.render("login.ejs", { error: "Database error" });

        // 🔴 CHANGE: check if user exists
        if (result.length === 0) {
            console.log("error in")
            return res.render("login.ejs", { error: "Invalid credentials" });
        }

        const user = result[0];

        // 🔴 CHANGE: compare hashed password          

        if (user.password !== password) {
            return res.render("user_login.ejs", { error: "Invalid credentials" });
        }
        console.log(user);
        if(user.role=="user"){
            req.session.user = {
                id: user.id,
                name: user.name,
                email: user.email,
                created_at: user.created_at,
                role: user.role
            };
    
            req.session.save((err) => {
                if (err) {
                    console.error("Session save error:", err);
                    return res.render("login.ejs", { error: "Session error" });
                }
                res.redirect("/user/dashboard");
            });
        }
        else{
            if(user.role=="admin"){
                req.session.admin = {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    created_at: user.created_at,
                    role: user.role
                };
        
                req.session.save((err) => {
                    if (err) {
                        console.error("Session save error:", err);
                        return res.render("login.ejs", { error: "Session error" });
                    }
                    res.redirect("/admin/dashboard");
                });
            }
        }
        console.log(req.session.user);
    });
})

app.get("/user/dashboard",(req,res)=>{

    const user =  req.session.user;
    console.log(user);
    if(req.session.user){
    }
    else{
        const user =  req.session.admin;
            }
    const q = `SELECT id , title , content , created_at FROM posts WHERE user_id = ?`;
    connection.query(
        q,[user.id],
        (err, posts) => {
            if (err) return res.redirect("/user/login");
            if(req.session.user){
                res.render("user_dashboard", {
                    user: req.session.user,
                    posts
                });
            }else{
                res.redirect("/admin/dashboard");
            }
        }
    ); 
})

app.get("/user/edit", (req , res)=>{
    // console.log("user data");
    // console.log(req.session.user);
    // console.log(id);
    const user1 = req.session.user;
    const id = user1.id;
    const q = `SELECT * FROM users WHERE id=?`;
    connection.query(q,[id],(err , result)=>{
        // console.log(result);
        const user = result[0];
        res.render("user_profileEdit" , {user});
    })
})

app.post("/user/profile/update/:id" , (req , res)=>{
    const id = req.params.id;
    const {name , email , new_password} = req.body;
    const q = `
            UPDATE users SET name = ? , email = ? , password = ? WHERE id = ?; 
        `;
    connection.query(q,[name , email , new_password , id],(err , result)=>{
        res.redirect("/user/login");
    })
})

app.get("/user/post/create/:id",(req,res)=>{
    const id = req.params.id;
    res.render("user_postCreate" , {id});
})

app.post("/user/post/create/:id",(req,res)=>{
    const user_id = req.params.id;
    const {title , content} = req.body;
    const id = uuidv4();

    const q = `
            INSERT INTO posts (id, title, content, user_id,  created_at)
            VALUES (?, ?, ?, ? , NOW())
        `;

        // console.log(req.session.user);
        connection.query(q, [id, title, content, user_id], (err) => {
            if (err) {
                return res.render("user_postCreate.ejs");
            }
            res.redirect("/user/dashboard");
        });
})

app.get("/user/post/edit/:id",(req,res)=>{
    const id = req.params.id;
    const q = `SELECT * FROM posts WHERE id=?`;
    connection.query(q ,[id],(err , result)=>{
        // console.log(post);
        const post = result[0];
        // console.log(post);
        res.render("user_postEdit",{post});
    })
})

app.post("/user/post/edit/:id",(req,res)=>{
    const id = req.params.id;
    const {title , content} = req.body;
    const q = `
            UPDATE posts SET title = ? , content = ? WHERE id = ?; 
        `;
    connection.query(q,[title , content , id],(err , result)=>{
        // console.log(" gal Bngai");
        // console.log(req.session.admin);
        if(req.session.admin){
            res.redirect("/admin/dashboard");
        }else{
            res.redirect("/user/dashboard");
        }
    })
})


app.get("/user/post/delete/:id",(req,res)=>{
    const id = req.params.id;
    // console.log(id);
    const q = `
            DELETE FROM posts WHERE id = ?; 
        `;
    connection.query(q,[id],(err , result)=>{
        // console.log(result);
        if(req.session.admin){
            res.redirect("/admin/dashboard");
        }else{
            res.redirect("/user/dashboard");
        }
    })
})

app.get("/user/logout",(req,res)=>{
    req.session.destroy((err) => {
        if (err) {
            console.error("Logout error:", err);
            return res.redirect('/');
        }       
        // Clear the session cookie
        res.clearCookie('connect.sid'); // Default session cookie name
        // OR if you specified a name:
        // res.clearCookie('session_cookie_name');     
        res.redirect("/user/login");
    });
})


app.get("/admin/dashboard",(req,res)=>{
    // console.log(req.session.admin);
    const user = req.session.admin;
    const q = `
            SELECT * FROM posts; 
        `;
    connection.query(q,(err , posts)=>{
        res.render("admin_dashboard",{posts , user});
    })
})

app.get("/admin/users/dashboard",(req,res)=>{
    const user = req.session.admin;
    const q = `
            SELECT * FROM users WHERE role='user' OR role='moderator'; 
        `;
    connection.query(q,(err , users)=>{
        if(err) throw err;
        res.render("admin_userDashboard",{users,user});
    })
})

app.get("/admin/user/role/:id",(req,res)=>{
    const id = req.params.id;
    const q = `
            UPDATE users SET role='admin' WHERE id=?; 
        `;
    connection.query(q,[id],(err , result)=>{
        if(err) throw err;
        res.redirect("/admin/users/dashboard");
    })
})

app.get("/admin/user/create",(req,res)=>{
    res.render("admin_newUser");
})

app.post("/admin/user/create",(req,res)=>{
    res.render("admin_dashboard");
})


app.get("/admin/user/delete/:id",(req,res)=>{
    const id = req.params.id;
    const q = `
            DELETE FROM users WHERE id = ?; 
        `;
    connection.query(q,[id],(err , result)=>{
    })
    res.redirect("/admin/users/dashboard");
})


// --------------------admin => User posts handling------------------------

app.get("/admin/user/post/dashboard/:id",(req,res)=>{
    const id = req.params.id;
    query = `SELECT * FROM posts WHERE user_id=?`;
    connection.query(query ,[id],(err,result)=>{
        if(err) throw err;
        res.render("admin_postDashboard.ejs" , {posts:result , user_id:id});
    })
})



app.get("/admin/user/post/edit/:uid/:id",(req,res)=>{
    const id = req.params.id;
    const uid = req.params.uid;
    const q = `SELECT * FROM posts WHERE id=?`;
    connection.query(q ,[id],(err , result)=>{
        const post = result[0];
        res.render("admin_postEdit",{post , uid});
    })
})

app.post("/admin/user/post/edit/:uid/:id",(req,res)=>{
    const id = req.params.id;
    const uid = req.params.uid;
    const {title , content} = req.body;
    const q = `
            UPDATE posts SET title = ? , content = ? WHERE id = ?; 
        `;
    connection.query(q,[title , content , id],(err , result)=>{
            // res.redirect("/admin/users/dashboard");
    })
    query = `SELECT * FROM posts WHERE user_id=?`;
    connection.query(query ,[uid],(err,result)=>{
        if(err) throw err;
        res.render("admin_postDashboard.ejs" , {posts:result , user_id:uid});
    })
})

app.get("/admin/user/post/delete/:id",(req,res)=>{
    res.redirect("/admin/dashboard");
})

// -----------------------------------------

app.get("/admin/logout",(req,res)=>{
     req.session.destroy((err) => {
        if (err) {
            console.error("Logout error:", err);
            return res.redirect('/admin/dashboard');
        }
        // Clear the session cookie
        res.clearCookie('connect.sid'); // Default session cookie name    
        res.redirect("/user/login");
    });
})








// =====================
// SERVER
// =====================
app.listen(8080, () => {
    console.log("Server running at http://localhost:8080");
});



// /home , /user/signup , /user/login , /user/dashboard (after login) , /user/logout , /admin/dashboard , /admin/users/dashboard , /admin/user/post/dashboard/ , /admin/logout 
// these are all main routes...
// user Method 3 and give the code of header(navbar like) and footer and also tell me the way to how to adjust it into files codes...
// try to use easy and simple way 













// =================================FAKER DATA=============================================

// Generate fake users data
// function generateUsers(count) {
//     const users = [];
//     for (let i = 0; i < count; i++) {
//         users.push({
//             id: uuidv4(),
//             name: faker.person.fullName(),
//             email: faker.internet.email().toLowerCase(),
//             password: faker.internet.password({ length: 12 }),
//             role: faker.helpers.arrayElement(["user", "admin", "moderator"]),
//             created_at: faker.date.past().toISOString().split('T')[0]
//         });
//     }
//     return users;
// }

// // Generate fake posts data (needs user IDs as foreign keys)
// function generatePosts(count, userIds) {
//     const posts = [];
//     for (let i = 0; i < count; i++) {
//         posts.push({
//             id: uuidv4(),
//             title: faker.lorem.sentence({ min: 3, max: 8 }),
//             content: faker.lorem.paragraphs({ min: 1, max: 3 }).slice(0, 255),
//             user_id: faker.helpers.arrayElement(userIds), // Random user from existing users
//             created_at: faker.date.past().toISOString().slice(0, 19).replace('T', ' ')
//         });
//     }
//     return posts;
// }

// // Usage example:
// async function seedDatabase() {
//     try {
//         // Generate 10 fake users
//         const fakeUsers = generateUsers(10);
//         console.log("Generated users:", fakeUsers.length);
//         console.log(fakeUsers);
//         // Extract user IDs for foreign key reference
//         const userIds = fakeUsers.map(user => user.id);
        
//         // Generate 20 fake posts using those user IDs
//         const fakePosts = generatePosts(20, userIds);
//         console.log("Generated posts:", fakePosts.length);
//         console.log(fakePosts);
//         // Here you would insert into your database
//         // Example for MySQL with connection:
//         // await connection.query('INSERT INTO users SET ?', fakeUsers);
//         // await connection.query('INSERT INTO posts SET ?', fakePosts);
        
//         return { users: fakeUsers, posts: fakePosts };
        
//     } catch (error) {
//         console.error("Error generating fake data:", error);
//     }
// }

// // Run the seeding
// seedDatabase().then(data => {
//     console.log("Data generation complete!");

//             const values = data.users.map(user => [
//             user.id,
//             user.name,
//             user.email,
//             user.password,
//             user.role,
//             user.created_at
//         ]);
        
//         const query = `
//             INSERT INTO users (id, name, email, password, role, created_at) 
//             VALUES ?
//         `;
        
//         connection.query(query, [values], (err, result) => {
//             if (err) {
//                 console.error('Error inserting users:', err);
//                 return reject(err);
//             }
//             console.log(`Inserted ${result.affectedRows} users`);
//         });

//     // console.log(data);
//     // console.log("First user:", data.users[0]);

//     const values1 = data.posts.map(post => [
//             post.id,
//             post.title,
//             post.content,
//             post.user_id,
//             post.created_at
//         ]);
        
//         const query1 = `
//             INSERT INTO posts (id, title, content, user_id, created_at) 
//             VALUES ?
//         `;
        
//         connection.query(query1, [values1], (err, result) => {
//             if (err) {
//                 console.error('Error inserting posts:', err);
//                 return reject(err);
//             }
//             console.log(`Inserted ${result.affectedRows} posts`);
//         });
//     // console.log("First post:", data.posts[0]);
// });

// =================================<-------------->========================================


