// npm init -y
// npm install express mongoose --save

const express = require("express");
const app = express();
const port = 8081;

session = require("express-session");


app.use(session({
    secret:  process.env.SECRETSESSION || 'string-supersecreto-nuncavisto-jamas',
    name: 'sessionId',
    proxy: true,
    resave: true,
    saveUninitialized: true ,
    cookie: { maxAge:  60 * 1000 }  
}));

const nunjucks = require("nunjucks");
nunjucks.configure("views", {
  autoescape: true,
  express: app,
});

require("dotenv").config();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Importamos y configuramos Mongoose
const mongoose = require("mongoose");
mongoose.Promise = global.Promise;

const { MongoClient } = require("mongodb");
const client = new MongoClient(process.env.MONGOURL);

mongoose.connect("mongodb://localhost:27017/tv", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
// Definimos el esquema | IMPORTANTE que los names de los elementos del formulario coincidan con los keys de la colección de la base de datos
const librosSchema = new mongoose.Schema({
  isbn: {
    type: Number,
    unique: true,
  },
  titulo: String,
  autor: String,
  year: Number,
  idioma: String,
  editorial: String,
  precio: Number
});

const coleccion = mongoose.model("libros", librosSchema);

const auth = function (req, res, next) {
  // Requerimiento para acceder: sesión iniciada, usuarios dami y admin
  if (
    req.session &&
    req.session.user === process.env.USER &&
    req.session.admin
  ) {
    return next();
  } else {
    return res
      .status(401)
      .send(
        "<h1>No has sido autorizado, amigo. O tu sesion expiró.</h1><p><a href='/'>Regresar al login</a></p>"
      );
  }
};

// Página de inicio con el formulario de alta
app.get("/", (req, res) => {
  res.render("index.html", );
});

// app.get("/", (req, res) => {
//   res.status(200).sendFile(__dirname + "/views/index.html");
// });

app.all("/login/", (req, res) => {
  async function login() {
    await client.connect();
    const db = client.db(process.env.DB);
    const collection = db.collection(process.env.COL_USUARIOS);
    const usuario = await collection.findOne({ "user": req.body.usuario });
    //console.log(usuario)
    return usuario;
  }
  if (req.body.usuario && req.body.password) {
    login()
      .then((usuario) => {
        if (usuario) {
          if (req.body.password == usuario.password) {
            res.render("login.html", { nombre: usuario.name });
          } else {
            res.send("Password no correcta");
          }
        } else {
          res.send("Usuario y contraseña no válidos");
        }
      })
      .catch(console.error)
      .finally(() => client.close());
  } else {
    // Si intentamos saltar la pantalla de ingresar los datos
    res.render("error.html", {
      error: "Debes ingresar por la pantalla del formulario primero",
    });
  }
});	

  app.all("/logout", function (req, res) {
    // Limpia todos los datos de sesión
    req.session.destroy();
    // Informa a el usuario que la sesión ha sido cerrada
    res.send("<h1>Sesión cerrada! Regresar al <a href='/'>login</a><h1>");
  });

app.get("/home", (req, res) => {
  res.status(200).sendFile(__dirname + "/views/home.html");
});

app.post("/agregarlibro", (req, res) => {
  console.log(req.body);
  
  const myData = new coleccion(req.body);

  myData
    .save()
    .then((item) => {
      res.send(`El libro ha sido agregado
        <p><a href="/home">Ir a la home</a></p>
      `);
    })
    .catch((err) => {
      res.status(400).send("Error al agregar");
    });
});

app.get("/buscador", (req, res) => {
  let search = req.query.busqueda;

  let expSearch = new RegExp(search, "i");

  let busqueda = { titulo: { $regex: expSearch } };

  async function buscar() {
    await client.connect();
    const db = client.db(process.env.DB);
    const collection = db.collection(process.env.COL);
    return await collection.find(busqueda).sort({ id: 1 }).toArray();
  }
  buscar()
    .then((data) => {
      res.render("buscador.html", { data, search });
    })
    .catch(console.error)
    .finally(() => client.close());
});	

app.all("/borrar", (req, res) => {
  if (req.body.titulo) {
    async function borrar() {
      await client.connect();
      const db = client.db(process.env.DB);
      const collection = db.collection(process.env.COL);
      return await collection.deleteOne({titulo: req.body.titulo});
    }
    borrar()
      .then((data) => {
        res.render("borrar.html", {data, titulo: req.body.titulo});
      })
      .catch(console.error)
      .finally(() => client.close());
  } else {
    res.send("Error, no se ha podido borrar el libro");
  }
});

app.all("/actualizar", (req, res) => {
  if (req.body.titulo && req.body.precio) {
    async function actualizar() {
      await client.connect();
      const db = client.db(process.env.DB);
      const collection = db.collection(process.env.COL);
      return await collection.updateOne(
        { titulo: req.body.titulo },
        { $set: { precio: parseFloat(req.body.precio) } }
      );
    }
    actualizar()
      .then((data) => {
        res.render("actualizar.html", {
          titulo: req.body.titulo,
          precio: req.body.precio,
        });
      })
      .catch(console.error)
      .finally(() => client.close());
  } else {
    res.send("Error, no se ha podido actualizar el libro");
  }
});

app.listen(port, () => {
  console.log("Server listening on port " + port);
});
