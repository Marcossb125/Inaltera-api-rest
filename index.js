import express from "express";
import mysql from "mysql2/promise";
import cors from "cors";
import crypto from "crypto";
import { webcrypto } from "crypto";
import { Invoice } from "./invoice.js";
import nodemailer from "nodemailer";
import multer from "multer";
import stripe from 'stripe';

const app = express();

app.use(express.json({ limit: '50mb', extended: true }));
const db = mysql.createPool({
  host: process.env.MYSQLHOST, 
  user: process.env.MYSQLUSER || 'root',
  password: process.env.MYSQLPASSWORD || 'ojWgbPVLZXpBTWWAcdwKDZlXlXOsyriD',
  database: process.env.MYSQLDATABASE || 'railway',
  port: Number(process.env.MYSQLPORT) || 50769,})
db.getConnection()
  .then(conn => {
    console.log("✅ Conexión exitosa con Railway MySQL");
    conn.release();
  })
  .catch(err => {
    console.error("❌ Error de conexión:", err.message);
  });



const stripeKey = 'sk_test_51T40IrKB99iHhiNSXKbCkeBdVhpromujKxmLfIGpty0lFmWWnyVM3ngtP8kzXAlygkob7COGcMRTHnvB3ctYTCTH00vYfjpobN'
if (!stripeKey) {
  console.error(
    'Missing Stripe API key. Set STRIPE_KEY, STRIPE_SECRET_KEY, or STRIPE_API_KEY in your environment or .env file.'
  );
  process.exit(1);
}
const stripe = new stripe(stripeKey);

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const hashData = async (text) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);

  const hashBuffer = await crypto.subtle.digest("SHA-256", data);

  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return hashHex;
};

const nuevaFactura = async (factura = Invoice, Id_company) => {
  try {
    const response = await fetch(
      "http://localhost:3000/facturas/" + Id_company,
    );
    const ultimaFactura = await response.json();

    if (ultimaFactura.length > 1) {
      return await hashFactura(
        factura,
        ultimaFactura[ultimaFactura.length - 2].hashFactura,
      );
    } else {
      const hash = await hashFactura(factura, null);
      return hash;
    }
  } catch (err) {
    console.log({ error: err.message });
  }
};

const hashFactura = async (factura, hashAnterior) => {
  const hash = await hashData(JSON.stringify(factura) + hashAnterior);
  console.log("Texto enviado al hash: ");
  console.log(JSON.stringify(factura) + hashAnterior);
  return hash;
};

const comprobarHashesParcial = async (
  numeroInicio,
  numeroFinal,
  Id_company,
) => {
  const responseHashes = await fetch(
    "http://localhost:3000/facturas/hashFactura/orderNumero/" + Id_company,
  );
  const response = await fetch(
    "http://localhost:3000/facturas/orderNumero/" + Id_company,
  );
  const facturas = await response.json();
  const hashes = await responseHashes.json();
  let facturaCambiada = false;
  let k = numeroInicio;

  while (k <= numeroFinal) {
    let factura = new Invoice(
      Id_company,
      facturas[k].Id_cliente,
      facturas[k].ClienteNombre,
      facturas[k].ClienteNif,
      facturas[k].ClienteDireccion,
      facturas[k].Fecha,
      facturas[k].Tipo,
      facturas[k].Numero,
      facturas[k].Total,
      facturas[k].Estado,
      facturas[k].FormaPago,
      facturas[k].Observaciones,
    );
    console.log("clienteNif: " + factura.clienteNif);
    if (k != 0) {
      if (
        (await hashFactura(factura, hashes[k - 1].hashFactura)) !=
        hashes[k].hashFactura
      ) {
        console.log(
          "1: " +
          (await hashFactura(
            JSON.stringify(factura),
            hashes[k - 1].hashFactura,
          )),
        );
        console.log("2: " + hashes[k].hashFactura);
        facturaCambiada = true;
      }
    } else {
      if ((await hashFactura(factura, null)) != hashes[k].hashFactura) {
        console.log("1: " + (await hashFactura(JSON.stringify(factura), null)));
        console.log("2: " + hashes[k].hashFactura);
        facturaCambiada = true;
      }
    }
    k = k + 1;
  }

  return facturaCambiada;
};

app.use(cors());

app.get("/users", async (req, res) => {
  try {
    const [result] = await db.query("SELECT * FROM users");
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/Invoices/hashFactura/:Id_company", async (req, res) => {
  try {
    const { Id_company } = req.params;
    const [result] = await db.query(
      "SELECT hashFactura FROM invoices WHERE Id_company = ? ORDER BY id DESC LIMIT 1",
      [Id_company],
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/users/Email", async (req, res) => {
  try {
    const [result] = await db.query("SELECT Email FROM users");
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/users/codigo/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.query("SELECT código FROM users WHERE Id = ?", [id]);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get("/users/Id/:Email", async (req, res) => {
  try {
    const { Email } = req.params;
    const [result] = await db.query("SELECT Id FROM users WHERE Email = ?", [
      Email,
    ]);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/users/Email/:Id", async (req, res) => {
  try {
    const { Id } = req.params;
    const [result] = await db.query("SELECT Email FROM users WHERE ID = ?", [
      Id,
    ]);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/users/:Id", async (req, res) => {
  try {
    const { Id } = req.params;
    const [result] = await db.query("SELECT * FROM users WHERE id = ?", [Id]);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/users/Email", async (req, res) => {
  try {
    const [result] = await db.query("SELECT Email FROM users");
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/clientes/:Id_company", async (req, res) => {
  try {
    const { Id_company } = req.params;
    const [result] = await db.query(
      "SELECT Id AS id, Id_company as id_company, Nombre AS nombre, NIF AS nif, Direccion AS direccion FROM clientes WHERE Id_company = ?",
      [Id_company],
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/clientes/Id/:nif", async (req, res) => {
  try {
    const { nif } = req.params;
    const [result] = await db.query(
      "SELECT Id AS id FROM clientes WHERE nif = ?",
      [nif],
    );
    res.json(nif);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/buscar_hash/:hashFactura", async (req, res) => {
  try {
    const { hashFactura } = req.params;
    const [result] = await db.query(
      "SELECT Numero as numero, Fecha as fecha, Total as importe, Tipo as tipo FROM invoices WHERE hashFactura = ?",
      [hashFactura]
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/buscarQR/:numero/:fecha/:importe/:tipo", async (req, res) => {
  try {
    const {numero, fecha, importe, tipo} = req.params

    const [año, mes, día] = fecha.split('/');

    const fechaFormateada = `${día}-${año}-${mes}`;

    

    const [result] = await db.query(
      "SELECT Numero as numero, Fecha as fecha, Total as importe, Tipo as tipo FROM invoices WHERE Numero = ? AND DATE(Fecha) = ? AND Total = ? AND Tipo = ?",
      [numero, fechaFormateada, importe, tipo]
    )

    

    
    res.json(result);
  } catch (err) {
    res.status(500).json({error: err.message});
  }
})

app.get("/facturas/:Id_company", async (req, res) => {
  try {
    const { Id_company } = req.params;
    const [result] = await db.query(
      "SELECT Id as id, Id_company as id_company, Id_cliente as id_cliente, Fecha as fecha, Tipo as tipo, Numero as numero, Total as total, Estado as estado, FormaPago as formaPago, ClienteNombre as clienteNombre, ClienteNif as clienteNif, ClienteDireccion as clienteDireccion, Observaciones as observaciones, hashFactura from invoices WHERE Id_company = ?",
      [Id_company],
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/facturas/orderNumero/:Id_company", async (req, res) => {
  try {
    const { Id_company } = req.params;

    const [result] = await db.query(
      "SELECT Id_company, Id_cliente, Fecha, Tipo, Numero, Total, Estado, FormaPago, ClienteNif, ClienteDireccion, ClienteNombre, Observaciones from invoices WHERE Id_company = ? ",
      [Id_company],
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/facturas/pdf/:id_company/:numero", async (req, res) => {
  try {    
    const { id_company, numero } = req.params;

    const [result] = await db.query(
      "SELECT pdf from invoices WHERE Id_company = ? AND Numero = ?",
      [id_company, numero],
    );

    res.setHeader('Content-Type', 'application/pdf');
    
    res.setHeader('Content-Disposition', 'attachment; filename=archivo.pdf');
    res.send(result[0].pdf);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/facturas/hashFactura/orderNumero/:Id_company", async (req, res) => {
  try {
    const { Id_company } = req.params;

    const [result] = await db.query(
      "SELECT hashFactura FROM invoices WHERE Id_company = ? ",
      [Id_company],
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get("/users/FacturasMes/:Id", async (req, res) => {
  try {
    const { Id } = req.params;
    const [result] = await db.query(
      "SELECT FacturasMes FROM users WHERE ID = ?",
      [Id],
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/users/Subscription/:Id", async (req, res) => {
  try {
    const { Id } = req.params;
    const [result] = await db.query(
      "SELECT Subscripción FROM users WHERE ID = ?",
      [Id],
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get("/companies/:Id_user", async (req, res) => {
  try {
    const { Id_user } = req.params;
    const [result] = await db.query(
      "SELECT Id_user AS id_user, RazonSocial AS razonSocial, NIF AS nif, DomicilioFiscal AS domicilioFiscal, CodigoPostal AS codigoPostal, Ciudad AS ciudad, Provincia AS provincia FROM companies WHERE Id_user = ?",
      [Id_user],
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get("/companies/Id/:Id_user", async (req, res) => {
  try {
    const { Id_user } = req.params;
    const [result] = await db.query(
      "SELECT Id AS id FROM companies WHERE Id_user = ?",
      [Id_user],
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/lineas/:id_factura", async (req, res) => {
  try {
    const { id_factura } = req.params;
    const [result] = await db.query(
      "SELECT Id_factura as id_factura, Concepto as concepto, Cantidad as cantidad, PrecioUnitario as precioUnitario, Iva as iva, total_item as totalItem FROM lineas_factura WHERE Id_factura = ?",
      [id_factura],
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/create-checkout-session/:subscripcion', async (req, res) => {
  try {
    let session;
    const subs = req.params.subscripcion;

    if (subs === "Profesional") {
      session = await stripe.checkout.sessions.create({
        line_items: [
          {
            price: 'price_1T4KMWKB99iHhiNSCvRoeQXQ',
            quantity: 1,
          },
        ],

        mode: 'subscription',
        success_url: `${YOUR_DOMAIN}/payment-success?success=true&plan=${encodeURIComponent(subs)}`,
      });
    } else {
      session = await stripe.checkout.sessions.create({
        line_items: [
          {
            price: 'price_1T4KLfKB99iHhiNSzspsuqx3',
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${YOUR_DOMAIN}/payment-success?success=true&plan=${encodeURIComponent(subs)}`,
      });
    }

    return res.redirect(303, session.url);
  } catch (err) {
    console.error("Stripe session error:", err);
    return res.status(500).json({ error: err.message });
  }
});

app.post("/dobleAutenticacion", async (req, res) => {
  try {
    const { email } = req.body;

    console.log("hola")

    const nombre = db.query("SELECT Nombre FROM users WHERE Email = ?", [email]);

    const digito1 = Math.floor(Math.random() * 10);
    const digito2 = Math.floor(Math.random() * 10);
    const digito3 = Math.floor(Math.random() * 10);
    const digito4 = Math.floor(Math.random() * 10);
    const digito5 = Math.floor(Math.random() * 10);

    const resetCodigo = `${digito1}${digito2}${digito3}${digito4}${digito5}`;
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetLink = `http://localhost:8080/verificacionDosPasos?token=${resetToken}`;

    const htmlCodigo = `<!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          body {
            margin: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
              Ubuntu, Cantarell, 'Fira Sans', 'Droid Sans', 'Helvetica', Arial, sans-serif;
            background-color: #f5f5f7;
            color: #0f172a;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background-color: #fff;
            border-radius: 12px;
            box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
            padding: 24px;
          }
          .header {
            font-size: 20px;
            font-weight: 700;
            margin-bottom: 16px;
          }
          .text {
            font-size: 14px;
            line-height: 1.6;
            color: #475569;
            margin-bottom: 18px;
          }
          .code {
            display: inline-block;
            width: 100%;
            max-width: 260px;
            padding: 16px 18px;
            margin: 0 auto 18px;
            border-radius: 12px;
            background: linear-gradient(135deg, #0ea5e9, #22c55e);
            color: #fff;
            font-size: 28px;
            font-weight: 700;
            letter-spacing: 6px;
            text-align: center;
          }
          .footer {
            font-size: 12px;
            color: #64748b;
            line-height: 1.4;
          }
          .button {
            display: inline-block;
            padding: 12px 20px;
            border-radius: 10px;
            background: #0ea5e9;
            color: #fff;
            text-decoration: none;
            font-weight: 600;
          }
          @media (max-width: 480px) {
            .container {
              margin: 24px 12px;
              padding: 18px;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">Código de verificación</div>
          <div class="text">
            Utiliza el siguiente código de 5 dígitos para entrar a tu cuenta.
          </div>
          <div class="code">${resetCodigo}</div>
          <div class="text">
            Si no solicitaste este código, puedes ignorar este correo. El código expirará en breve.
          </div>
          <a class="button" href="${resetLink}">Ir a la página de verificación</a>
          <div class="footer">
            Si el botón no funciona, copia y pega este enlace en tu navegador:<br />
            <a href="${resetLink}" style="color: #0ea5e9; word-break: break-all;">${resetLink}</a>
          </div>
        </div>
      </body>
    </html>`;

    await db.query(
      "UPDATE users SET código = ? WHERE Email = ?",
      [resetCodigo, email],
    );

    let transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "marcossbarja@gmail.com",
        pass: "nhiz usvq osqa olii",
      },
    });

    await transporter.sendMail({
      from: "marcossbarja@gmail.com",
      to: email,
      subject: "codigo de autenticacion",
      html: htmlCodigo,
    });

    res.status(200).json({ email });
  } catch (err) {
    res.status(500).json({ error: err });
  }
});

app.post("/recuperar_contrasena", async (req, res) => {
  try {
    const { email } = req.body;

    const [userExists] = await db.query(
      "SELECT Nombre FROM users WHERE Email = ?",
      [email],
    );

    if (!userExists.length) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const userName = userExists[0].Nombre;

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetLink = `http://localhost:8080/reset-password?token=${resetToken}`;

    await db.query(
      "UPDATE users SET tokenReinicioContraseña = ? WHERE Email = ?",
      [resetToken, email],
    );

    const htmlCambiarContraseña = `<!DOCTYPE html>
            <html dir="ltr" lang="es">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
                            'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica',
                            'Arial', sans-serif;
                        margin: 0;
                        padding: 0;
                        background-color: #f5f5f7;
                    }
                    .container {
                        max-width: 600px;
                        margin: 40px auto;
                        background-color: #ffffff;
                        border-radius: 12px;
                        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                        overflow: hidden;
                    }
                    .header {
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        padding: 40px 20px;
                        text-align: center;
                        color: white;
                    }
                    .header h1 {
                        margin: 0;
                        font-size: 28px;
                        font-weight: 700;
                        letter-spacing: -0.5px;
                    }
                    .header p {
                        margin: 10px 0 0 0;
                        font-size: 14px;
                        opacity: 0.9;
                    }
                    .content {
                        padding: 40px 30px;
                    }
                    .greeting {
                        font-size: 16px;
                        color: #1a1a1a;
                        margin: 0 0 20px 0;
                        line-height: 1.6;
                    }
                    .message {
                        font-size: 14px;
                        color: #555555;
                        margin: 20px 0;
                        line-height: 1.6;
                    }
                    .button-container {
                        text-align: center;
                        margin: 40px 0;
                    }
                    .reset-button {
                        display: inline-block;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        padding: 14px 40px;
                        border-radius: 8px;
                        text-decoration: none;
                        font-weight: 600;
                        font-size: 16px;
                        transition: transform 0.2s, box-shadow 0.2s;
                        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
                    }
                    .reset-button:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 6px 16px rgba(102, 126, 234, 0.6);
                    }
                    .warning {
                        background-color: #fff3cd;
                        border: 1px solid #ffc107;
                        border-radius: 6px;
                        padding: 12px 16px;
                        margin: 30px 0;
                        font-size: 13px;
                        color: #856404;
                        line-height: 1.5;
                    }
                    .link-text {
                        font-size: 12px;
                        color: #888888;
                        margin-top: 20px;
                        word-break: break-all;
                    }
                    .link-text a {
                        color: #667eea;
                        text-decoration: none;
                    }
                    .footer {
                        background-color: #f9f9fb;
                        padding: 30px;
                        text-align: center;
                        border-top: 1px solid #f0f0f0;
                    }
                    .footer-text {
                        font-size: 12px;
                        color: #999999;
                        margin: 0;
                        line-height: 1.6;
                    }
                    .footer-links {
                        margin-top: 15px;
                    }
                    .footer-links a {
                        color: #667eea;
                        text-decoration: none;
                        font-size: 12px;
                        margin: 0 10px;
                    }
                    .logo {
                        font-size: 24px;
                        font-weight: 700;
                        letter-spacing: -1px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <div class="logo">INALTERA</div>
                        <p>Recupera tu acceso de forma segura</p>
                    </div>
                    <div class="content">
                        <p class="greeting">¡Hola ${userName}!</p>
                        <p class="message">
                            Hemos recibido una solicitud para recuperar tu contraseña en INALTERA. 
                            Si tú realizaste esta solicitud, haz clic en el botón de abajo para crear 
                            una nueva contraseña.
                        </p>
                        <div class="button-container">
                            <a href="${resetLink}" class="reset-button">Recuperar contraseña</a>
                        </div>
                        <div class="warning">
                            <strong>Nota importante:</strong> Este enlace expirará en 1 hora por razones de seguridad. 
                            Si no realizaste esta solicitud, ignora este correo o contacta con nuestro equipo de soporte.
                        </div>
                        <p class="message">
                            Si el botón no funciona, copia y pega este enlace en tu navegador:
                        </p>
                        <p class="link-text">
                            <a href="${resetLink}">${resetLink}</a>
                        </p>
                        <p class="message">
                            Por tu seguridad, nunca compartiremos tu contraseña por correo electrónico. 
                            El equipo de INALTERA siempre te pedirá que cambies tu contraseña a través de 
                            un enlace seguro como este.
                        </p>
                    </div>
                    <div class="footer">
                        <p class="footer-text">
                            © 2026 INALTERA. Todos los derechos reservados.
                        </p>
                        <div class="footer-links">
                            <a href="http://localhost:8080">Ir a INALTERA</a>
                            <a href="#">Contacto</a>
                        </div>
                        <p class="footer-text" style="margin-top: 15px; font-size: 11px; color: #aaa;">
                            Este es un correo automático, por favor no respondas a este mensaje.
                        </p>
                    </div>
                </div>
            </body>
            </html>
        `;

    let transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "marcossbarja@gmail.com",
        pass: "nhiz usvq osqa olii",
      },
    });

    await transporter.sendMail({
      from: "marcossbarja@gmail.com",
      to: email,
      subject: "Recuperación de contraseña",
      html: htmlCambiarContraseña,
    });

    res.status(200).json({ email });
  } catch (err) {
    res.status(500).json({ error: err });
  }
});

app.post("/users/register", async (req, res) => {
  try {
    const { email, password, nombre } = req.body;



    const hashedPassword = await hashData(password);

    const [emailExists] = await db.query(
      "SELECT Id FROM USERS WHERE Email = ?",
      [email],
    );
    if (emailExists.length > 0) {
      return res.status(400).json({ error: "El email ya está registrado" });
    }
    const [result] = await db.query(
      "INSERT INTO users (Email, Password, Nombre) VALUES (?, ?, ?)",
      [email, hashedPassword, nombre],
    );
    const [company] = await db.query(
      "INSERT INTO companies (Id_user) VALUES (?)",
      [[result.insertId]],
    );
    res.json({ id: result.insertId, nombre, email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/users/Login", async (req, res) => {
  try {
    const { email, password } = req.body;


    const hashedPassword = await hashData(password);

    const [userExist] = await db.query(
      "SELECT Email FROM users WHERE Email = ? AND Password = ?",
      [email, hashedPassword],
    );

    if (userExist.length == 0) {
      return res
        .status(400)
        .json({ error: "El email o la contraseña son incorrectas" });
    }

    res.status(200).json({ message: "Bienvenido a Inaltera!!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post("/invoices", async (req, res) => {
  try {
    const {
      id_company,
      fecha,
      numero,
      id_cliente,
      total,
      estado,
      tipo,
      formaPago,
      clienteNombre,
      clienteNif,
      clienteDireccion,
      observaciones
    } = req.body;
    const hash = "a";

    const [result] = await db.query(
      "INSERT INTO invoices (Id_company, Fecha, Numero, Id_cliente, Total, Estado, Tipo, FormaPago, ClienteNombre, ClienteNif, ClienteDireccion, Observaciones, pdf, hashFactura) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        id_company, fecha, numero, id_cliente, total, estado, tipo, formaPago, clienteNombre, clienteNif, clienteDireccion, observaciones, null, hash
      ],
    );

    res.json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/invoices/revisar/:Id_company", async (req, res) => {
  try {
    const { Id_company } = req.params;
    const { numeroInicio, numeroFinal } = req.body;
    console.log(numeroInicio);
    let id_companyInt = parseInt(Id_company);

    res.json(
      await comprobarHashesParcial(numeroInicio, numeroFinal, id_companyInt),
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/clientes", async (req, res) => {
  try {
    const { id_company, nombre, nif, direccion } = req.body;
    const [nifExists] = await db.query("SELECT * FROM clientes WHERE NIF = ?", [
      nif,
    ]);
    if (nifExists.length > 0) {
      return res
        .status(400)
        .json({ error: "El nif introducido ya está regitrado" });
    } else {
      const [result] = await db.query(
        "INSERT INTO clientes (Id_company, Nombre, NIF, Direccion) VALUES (?, ?, ?, ?)",
        [id_company, nombre, nif, direccion],
        "SELECT LAST_INSERT_ID()",
      );
      res.json({ id: result.insertId });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post("/items", async (req, res) => {
  try {
    const { id_factura, concepto, cantidad, precioUnitario, iva, totalItem } =
      req.body;
    const [result] = await db.query(
      "INSERT INTO lineas_factura (Id_factura, Concepto, Cantidad, PrecioUnitario, Iva, total_item) VALUES (?,?,?,?,?,?)",
      [id_factura, concepto, cantidad, precioUnitario, iva, totalItem],
    );
    res.json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/users/delete/:Id", async (req, res) => {
  try {
    const { Id } = req.params;
    await db.query("DELETE FROM users WHERE id = ?", [Id]);
    res.json({ message: "Usuario eliminado" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/users/FacturasMes/:Id", async (req, res) => {
  try {
    const { Id } = req.params;
    const { facturasMes } = req.body;
    const [result] = await db.query(
      "UPDATE users SET FacturasMes = ? WHERE id = ?",
      [facturasMes, Id],
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/users/Subscripcion/:Id", async (req, res) => {
  try {
    const { Id } = req.params;
    const { Subscripción } = req.body;
    const [result] = await db.query(
      "UPDATE users SET Subscripción = ? WHERE id = ?",
      [Subscripción, Id],
    );
    res.json("subscripcion cambiada a " + Subscripción);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/companies/:Id_user", async (req, res) => {
  try {
    const { Id_user } = req.params;
    const {
      razonSocial,
      nif,
      codigoPostal,
      domicilioFiscal,
      ciudad,
      provincia,
    } = req.body;
    const [nifExists] = await db.query(
      "SELECT * FROM companies WHERE NIF = ? AND Id_user != ?",
      [nif, Id_user],
    );
    if (nifExists.length > 0) {
      return res
        .status(400)
        .json({ error: "El nif introducido ya está regitrado" });
    } else {
      const [result] = await db.query(
        "UPDATE companies SET RazonSocial = ?, NIF = ?, CodigoPostal = ?, DomicilioFiscal = ?, Ciudad = ?, Provincia = ? WHERE Id_user = ?",
        [
          razonSocial,
          nif,
          codigoPostal,
          domicilioFiscal,
          ciudad,
          provincia,
          Id_user,
        ],
      );
      res.json("Datos guardados correctamente");
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/companies/:id_company/clientes/:id", async (req, res) => {
  try {
    const { id, id_company } = req.params;
    const { nombre, nif, direccion } = req.body;

    const [nifExists] = await db.query(
      "SELECT * FROM clientes WHERE NIF = ? AND Id_company = ? AND Id != ?",
      [nif, id_company, id],
    );
    if (nifExists.length > 0) {
      return res
        .status(400)
        .json({ error: "El nif introducido ya está regitrado" });
    } else {
      const [result] = await db.query(
        "UPDATE clientes SET Nombre = ?, NIF = ?, Direccion = ? WHERE Id = ?",
        [nombre, nif, direccion, id],
      );

      res.json(id);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.put("/invoices/hashFactura/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [data] = await db.query(
      "SELECT Id_company, Id_cliente, Fecha, Tipo, Numero, Total, Estado, FormaPago, ClienteNif, ClienteDireccion, ClienteNombre, Observaciones FROM invoices where Id = ?",
      [id],
    );
    let factura = new Invoice(
      data[0].Id_company,
      data[0].Id_cliente,
      data[0].ClienteNombre,
      data[0].ClienteNif,
      data[0].ClienteDireccion,
      data[0].Fecha,
      data[0].Tipo,
      data[0].Numero,
      data[0].Total,
      data[0].Estado,
      data[0].FormaPago,
      data[0].Observaciones,
    );
    const hash = await nuevaFactura(factura, data[0].Id_company);

    const [result] = await db.query(
      "UPDATE invoices SET hashFactura = ? WHERE Id = ?",
      [hash, id],
    );

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/user/password/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    console.log(token);
    const hashPassword = await hashData(password);
    const [result] = await db.query(
      "UPDATE users SET Password = ? WHERE tokenReinicioContraseña = ?",
      [hashPassword, token],
    );
    db.query(
      "UPDATE users SET tokenReinicioContraseña = NULL WHERE tokenReinicioContraseña = ?",
      [token],
    );

     res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

  app.put("/invoices/pdf/:id", upload.single("factura"), async (req, res) => {
    try {
      const { id } = req.params;
      const pdf = req.file.buffer;

      console.log(pdf)

      const [result] = await db.query(
        "UPDATE invoices SET pdf = ? WHERE Id = ?",
        [pdf, id],
      );
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

   

app.delete("/clientes/:Id", async (req, res) => {
  try {
    const { Id } = req.params;
    await db.query("DELETE FROM clientes WHERE id = ?", [Id]);
    res.json({ message: "Cliente eliminado" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => {
  console.log(`Servidor activo en puerto ${port}`);
});
