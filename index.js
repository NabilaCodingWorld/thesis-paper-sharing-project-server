const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken')
require('dotenv').config();
const port = process.env.PORT || 5000;


// middle ware
app.use(cors());
app.use(express.json());


const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ error: true, message: 'unauthorized access' });
    }
    // bearer token
    const token = authorization.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ error: true, message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next();
    })
}




const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.4zx1pf4.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
         client.connect();


        const thesisPaperCollection = client.db('thesis-paper-sharing-project').collection('thesisPaper');

        const thesisIdeaCollection = client.db('thesis-paper-sharing-project').collection('thesisIdea');

        const usersCollection = client.db('thesis-paper-sharing-project').collection('users');


         // const indexKeys = { category: 1, name: 1 };

        // const indexOptions = { name: 'nameCategory' };

        // const result = await menuCollection.createIndex(indexKeys, indexOptions);


        // Search
        app.get('/paperSearch/:text', async (req, res) => {
            const searchText = req.params.text;
            const result = await thesisPaperCollection
                .find({
                    $or: [
                        { category: { $regex: searchText, $options: 'i' } },
                        { author: { $regex: searchText, $options: 'i' } }
                    ]
                })
                .toArray();
            res.send(result);
        });




        // JWT Token
        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.send({ token })
        })


        ///verifyAdmin start
        // Warning: use verifyJWT before using verifyAdmin
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email }
            const user = await usersCollection.findOne(query);
            if (user?.role !== 'admin') {
                return res.status(403).send({ error: true, message: 'forbidden message' });
            }
            next();
        }


        // get thesis paper admin
        app.get('/thesisPaperAll', async (req, res) => {
            const result = await thesisPaperCollection.find().sort({ createdAt: -1 }).toArray();

            res.send(result);
        })
        // get thesis paper user
        app.get('/confirmThesisPaperAll', async (req, res) => {
            console.log('hit')
            const result = await thesisPaperCollection.find().sort({ createdAt: -1 }).toArray();
            const confirmedThesisPaper = result.filter(paper => paper.status === 'confirm')

            res.send(confirmedThesisPaper);
        })

        // delete thesis paper user
        app.delete('/confirmThesisPaperAll/:id',  async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await thesisPaperCollection.deleteOne(query);
            res.send(result);
        })

        // patch thesis paper
        app.patch('/thesisPaperAll/:id', async(req, res)=>{
            const id = req.params.id;
            const filter = {_id: new ObjectId(id)};
            const updatedPaper = req.body;
            console.log(updatedPaper);
            const updateDoc = {
                $set: {
                    status: updatedPaper.status
                }
            }
            const result = await thesisPaperCollection.updateOne(filter, updateDoc);
            res.send(result);
        })


        // single data load from thesis paper
        app.get('/thesisPaper/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };

            const options = {
                projection: {
                    photo: 1,
                    author: 1,
                    message: 1,
                    category: 1

                }
            }

            const result = await thesisPaperCollection.findOne(query, options);
            res.send(result);
        });


        //  post thesis paper
        app.post('/thesisPaper', async (req, res) => {
            const newItem = req.body;
            newItem.createdAt = new Date(); 
            const result = await thesisPaperCollection.insertOne(newItem);
            res.send(result)
        })


         // get some thesis paper
         app.get('/thesisPaper', async (req, res) => {
            console.log(req.query.email);
            let query = {};
            if (req.query?.email) {
                query = { email: req.query.email }
            }
            const result = await thesisPaperCollection.find(query).sort({ createdAt: -1 }).toArray();
            res.send(result);
        })


        // delete thesis paper admin data
        app.delete('/thesisPaper/:id',  async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await thesisPaperCollection.deleteOne(query);
            res.send(result);
        })

        // get thesis paper for update
        app.get('/thesisPaper/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await thesisIdeaCollection.findOne(query);
            res.send(result);

        })


         // update booking
         app.put('/thesisPaper/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const options = { upsert: true };
            const updatedPdf = req.body;

            const booking = {
                $set: {
                    photo: updatedPdf.photo,
                    author: updatedPdf.author,
                    category: updatedPdf.category,
                    message: updatedPdf.message,

                }
            }

            const result = await thesisPaperCollection.updateOne(filter, booking, options);
            res.send(result)

        })


        // get thesis idea
        app.get('/thesisIdea', async (req, res) => {
            const result = await thesisIdeaCollection.find().toArray();

            res.send(result);
        })


        // users related API start

        // for post
        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email }
            const existingUser = await usersCollection.findOne(query);

            if (existingUser) {
                return res.send({ message: 'user already exists' })
            }

            const result = await usersCollection.insertOne(user);
            res.send(result);
        });


        // for get user
        app.get('/users', verifyJWT, verifyAdmin, async (req, res) => {
            const result = await usersCollection.find().toArray();
            res.send(result);
        });


        // user admin patch
        app.patch('/users/admin/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    role: 'admin'
                },
            };

            const result = await usersCollection.updateOne(filter, updateDoc);
            res.send(result);

        })


        // delete admin
        app.delete('/users/admin/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await usersCollection.deleteOne(query);
            res.send(result);
        })

        // for admin get
        // get
        app.get('/users/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;

            if (req.decoded.email !== email) {
                res.send({ admin: false })
            }

            const query = { email: email }
            const user = await usersCollection.findOne(query);
            const result = { admin: user?.role === 'admin' }
            res.send(result);

        })


        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);




app.get('/', (req, res) => {
    res.send('Nabila is comming')
})

app.listen(port, () => {
    console.log(`Nabila is sitting soon ${port}`)
})


