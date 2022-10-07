import express from 'express';
import cors from 'cors';
import knex from 'knex';
import bcrypt from 'bcrypt-nodejs';
import { response } from 'express';


const app = express();
const port = 3000;

const db = knex({
    client: 'pg',
    connection: {
        host : '127.0.0.1',
        port : 5432,
        user : 'canaantm',
        password : '',
        database : 'smartbrain'
    }
});

// console.log(db.select('*').from('users').then(console.log));


// make json data usable
app.use(express.json());
// trust this server
app.use(cors());


// handle get request to root
app.get('/', (req, res) => {
    // do something here
});


// handle get request to /profile/:userId
app.get('/profile/:userId', (req, res) => {
    const { userId } = req.params;

    db.select('*').from('users').where({
        id: userId
    })
    // user is an array
    .then(users => {
        if (users.length) {
            res.json(users[0]);
        } else {
            res.status(404).json("No user found");
        }
    });
});


// handle post request to /signin
app.post('/signin', (req, res) => {
    const { email, password } = req.body;

    db.select('email', 'hash')
    .from('login')
    .where('email', '=', email)
    .then(userLoginData => {
        const isValid = bcrypt.compareSync(password, userLoginData[0].hash);

        if (isValid) {
            db.select('*')
            .from('users')
            .where('email', '=', email)
            .then(users => res.json(users[0]))
            .catch(err => res.status(400).json("Unable to get user"));
        } else {
            res.status(400).json("Sign-in attempt failed")
        }
    })
    .catch(err => res.status(400).json("Sign-in attempt failed"));
});


// handle post request to /register
app.post('/register', (req, res) => {
    const { email, name, password } = req.body;
    const hash = bcrypt.hashSync(password);

    // do a transaction when performing two or more actions
    // if one table fails, all tables fail
    // insert hash and email into login table
    db.transaction(trx => {
        trx.insert({
            hash: hash,
            email: email
        })
        .into('login')
        .returning('email')
        .then(loginEmail => {
            // insert name and email into users table
            trx('users')
            .insert({
                name: name,
                email: loginEmail[0].email,
                joined: new Date()
            })
            .returning('*')
            // userData stores '*'
            // respond with user
            .then(userData => {
                if (userData) {
                    res.json({
                        user: userData[0],
                        route: 'home'
                    });
                }
            })
        })
        .then(trx.commit)
        .catch(trx.rollback);
    })
    .catch(err => res.status(400).json("Unable to register"));
});


// handle put request to /image
app.put('/image', (req, res) => {
    const { id } = req.body;
    
    db('users')
    .where('id', '=', id)
    .increment('entries', 1)
    .returning('entries')
    .then(entries => res.json(entries[0].entries))
    .catch(err => res.status(400).json("Unable to get entries"));
});


// have server listen to port 
app.listen(port, () => {
    console.log('server running');
});