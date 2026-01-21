import express from 'express';
import fs from 'fs';
import bodyParser from 'body-parser';
import mysql from 'mysql2/promise';

const app = express();
app.use(bodyParser.json());

const db = await mysql.createPool({
  host: "localhost",
  user: "root",       
  password: "",       
  database: "inaltera"
});

const readData = () => {
    try{
        const data = fs.readFileSync("./db.json");
    return (JSON.parse(data));
    } catch (error) {
        console.error("Error reading db.json:", error);
        return null;
    }
};


const writeData = (data) => {
    try {
        fs.writeFileSync("./db.json", JSON.stringify(data));
    } catch (error) {
        console.error("Error writing to db.json:", error);
    }
};

app.get("/users", (req, res) => {
    const data = readData();
    res.send(data.users);
})

app.get("/users/:id", (req, res) => {
    const data = readData();
    const id = parseInt(req.params.id);
    const user = data.users.find(user => user.id === id)
    res.json(user);
})

app.post("/users", async (req, res) => {

    try {

    const data = readData();
    const { Email, Password, Nombre} = req.body;
    
    const [result] = await db.query("INSERT INTO users (Email, Password, Nombre) VALUES (?, ?, ?)", [Email, Password, Nombre]);
    writeData(data);
    res.json({ id: result.insertId, Nombre, Email });
} catch (err) {
    res.status(500).json({ error: err.message });
  }
    
});
readData();

app.get('/', (req, res) => {
    res.send('Me voy a rajar las venas');
    
});

app.put("/users/:id", (req, res) => {
    const data = readData();
    const user = req.body;
    const id = parseInt(req.params.id);
    const userIndex = data.users.findIndex((user) => user.id === id);
    data.users[userIndex] = {
        ...data.users[userIndex],
        ...user,
    };
    writeData(data);
    res.json(data.users[userIndex]);
});

app.delete("/users/:id", (req, res) => {
    const data = readData();
    const id = parseInt(req.params.id);
    const userIndex = data.users.findIndex((user) => user.id === id);

    data.users.splice(userIndex, 1);
    writeData(data);
    res.json({ message: "User deleted successfully" });
});
app.listen(3000, () => {
    console.log('Server is running on port 3000');
});

