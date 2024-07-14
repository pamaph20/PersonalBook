"use strict";
import express, { response } from "express";
import { MongoClient } from "mongodb";
import Dotenv from "dotenv";
import { get } from "mongoose";


// app.js

const app = express();
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

Dotenv.config();

const url = `mongodb+srv://dmaphey:${process.env.DB_password}@libcluster.e6dnhcx.mongodb.net/?retryWrites=true&w=majority&appName=LibCluster`
const client = new MongoClient(url);

/***
 * This is separate, but it works
 */
await client.connect()
console.log("Connected")
let col = client.db("LibraryDB").collection("Library")


/***
 * Trying to remeber api things
 */
export async function getData(url) {
  /***
   * Get a books title, author, and ISBN based on search params in URI 
   */
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }
    const data = await response.json();
    let search_json = {
      Title :  data.docs[0].title,
      Author :  data.docs[0].author_name,
      ISBN : data.docs[0].isbn[0]
    }
    return search_json
  } catch (error) {
    console.error(error.message);
  }
}
app.use(express.json()); 

app.get("/search/:id", async (request, response) => {
  /**
   * Returns json info with information about a single book. 
   */
  const info = request.params.id;
  const search_uri = `https://openlibrary.org/search.json?q=${info}`;
  response.send(await getData(search_uri));
}); 

app.post("/add_new/:user_id/:id", async (req, res) => {
  /**
   * Add new book to a users library
   */
  const book_id = req.params.id;
  const user_id = req.params.user_id; 
  if(await check_user(user_id) == 0){
    res.status(401)
    res.json(`User ${user_id} does not exist`)
  }
  const search_uri = `https://openlibrary.org/search.json?q=${book_id}`;
  let json = await getData(search_uri);
  json["user_id"] = user_id;
  try{
    await col.insertOne(json);
    res.json({})
    res.status(200)
  }catch (error) {
    console.error(error.message);
  }
});

app.get("/lib_search/:user_id", async (req,res) =>{
  /***
   * Returns json library information based on a give user_id
   */
  let user_id = req.params.user_id;
  if(await check_user(user_id) == 0){
    res.status(401)
    res.json(`User ${user_id} does not exist`)
  }
  try{
    let cur = await col.find({
      user_id : user_id
    }).toArray();
    res.json(cur);
  }catch(error){
    console.error(error.message);
  }
});

async function check_user(id){
  //Check to see the user exists
  let col = client.db("LibraryDB").collection("User");
  let user = await col.findOne({"user_id" : `${id}`});
  if(user === null){
    //user doesnt exist
    return 0
  }
  //user exists
  return 1
}
