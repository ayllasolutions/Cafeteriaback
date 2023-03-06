const express = require('express')
const XLSX = require('xlsx')
const mysql = require('mysql')
const util = require('util')
const fileupload = require("express-fileupload");
const fs = require('fs')
const nodemailer = require('nodemailer');
const app = express()
const port = 3002
const cors = require('cors')
const WebpayPlus = require("transbank-sdk").WebpayPlus; 
const { Options, IntegrationApiKeys, Environment, IntegrationCommerceCodes } = require("transbank-sdk");
const { connect } = require('http2');
const { table, Console } = require('console');
//const socketio = require('socket.io');
require('dotenv').config()

process.env.TZ ="America/Santiago"


app.use(fileupload());
app.use(express.static("files"));
app.use(express.json(), cors(), function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*"); // update to match the domain you will make the request from
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });


app.get('/', (req, res) => {
  res.send('Api en linea')
})


const pool = mysql.createPool({
    connectionLimit : 10,
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    multipleStatements: true
})


app.get('/data', async (req, res) =>{
    clientes = await selectClienteSQL()
    productos = await selectProductoSQL()

    res.send({
        "cliente":clientes,
        "producto": productos
    })
})


app.post('/venta', async (req, res) =>{
    let creacabeceraveta = await insertCabeceraVenta(req.body)
    let idcabecera
    let countdetalle = 0
    let message
    let messageCode

    if(creacabeceraveta.affectedRows>0)
    {
        idcabecera = creacabeceraveta.insertId

        for(let item of req.body.detalle)
        {
            creadetalle = await insertDetalleVenta(item, idcabecera)
            if(creadetalle.affectedRows>0)
            {
                countdetalle = countdetalle + 1
            } 
        }

    }
    console.log(req.body.detalle.length)
    console.log(countdetalle)
    if(req.body.detalle.length == countdetalle)
    {
        message = 'Venta ingresada con exito'
        messageCode = '0'
        res.statusCode = 200
    }
    else
    {
        message = 'Ocurrio un error al ingresar la venta'
        messageCode = '1'
        res.statusCode = 502        
    }


    res.send({
        "message":message,
        "messageCode": messageCode
    })
})


app.post('/producto/crear', async (req, res) =>{
        let crearproducto = await insertProductSQL(req.body)
    let message = ''
    let messageCode = ''
    if(crearproducto > 0)
    {
        res.statusCode = 200
        message = 'Producto creado'
        messageCode = '0'
    }
    else
    {
        res.statusCode = 501
        message = 'Error al crear producto'
        messageCode = '1'
    }
    
    res.send({
        "message":message,
        "messageCode": messageCode
    })
})


app.post('/cliente/crear', async (req, res) =>{
    let crearcliente = await insertClienteSQL(req.body)
    let message = ''
    let messageCode = ''
    if(crearcliente > 0)
    {
        res.statusCode = 200
        message = 'Cliente creado'
        messageCode = '0'
    }
    else
    {
        res.statusCode = 501
        message = 'Error al crear cliente'
        messageCode = '1'
    }
    
    res.send({
        "message":message,
        "messageCode": messageCode
    })
})


async function insertCabeceraVenta(data)
{
    //Instancia pool
    pool.getConnection = util.promisify(pool.getConnection)
    //Crea conexion en base a obtencion
    let conn = await pool.getConnection();
    //Promete la query
    conn.query = util.promisify(conn.query)    
    //Crear el string de la consulta
    let queryInsertCabeceraVenta = "insert into cabeceraventa (fecha, cliente_id, total) values(CURRENT_TIMESTAMP, '"+data.cliente+"', '"+data.total+"')"   
    //Crea variable para obtener resultados
	let results = '';
	//Ejecuta la consulta
	results = await conn.query(queryInsertCabeceraVenta)
    conn.destroy() 
    return(results)
	   
}

async function insertDetalleVenta(data, cabecera_id)
{
    //Instancia pool
    pool.getConnection = util.promisify(pool.getConnection)
    //Crea conexion en base a obtencion
    let conn = await pool.getConnection();
    //Promete la query
    conn.query = util.promisify(conn.query)    
    //Crear el string de la consulta
    let queryInsertDetalleVenta = "insert into detalleventa (producto_id, cabeceraventa_id, preciounitario, cantidad, subtotal) values('"+data.producto_id+"', '"+cabecera_id+"', '"+data.precio+"', '"+data.cantidad+"', '"+data.subtotal+"')"   
    //Crea variable para obtener resultados
	let results = '';
	//Ejecuta la consulta
	results = await conn.query(queryInsertDetalleVenta)
    conn.destroy() 
    return(results)
	   
}


async function insertProductSQL(data)
{
    //Instancia pool
    pool.getConnection = util.promisify(pool.getConnection)
    //Crea conexion en base a obtencion
    let conn = await pool.getConnection();
    //Promete la query
    conn.query = util.promisify(conn.query)    
    //Crear el string de la consulta
    let queryInsertProducto = "insert into producto (nombre, precio, codigo, fecha_creacion, fecha_actualizacion) values('"+data.nombre+"', '"+data.precio+"', '"+data.codigo+"', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"   
    //Crea variable para obtener resultados
	let results = '';
	//Ejecuta la consulta
	results = await conn.query(queryInsertProducto)
    conn.destroy() 
    return(results.affectedRows)
	   
}

async function insertClienteSQL(data)
{
    //Instancia pool
    pool.getConnection = util.promisify(pool.getConnection)
    //Crea conexion en base a obtencion
    let conn = await pool.getConnection();
    //Promete la query
    conn.query = util.promisify(conn.query)    
    //Crear el string de la consulta
    let queryInsertCliente = "insert into cliente (nombre, apellido, rut, fecha_creacion, fecha_actualizacion) values ('"+data.nombre+"', '"+data.apellido+"', '"+data.rut+"' ,CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"   
    //Crea variable para obtener resultados
	let results = '';
	//Ejecuta la consulta
	results = await conn.query(queryInsertCliente)
    conn.destroy() 
    return(results.affectedRows)
	   
}

async function selectClienteSQL(item)
{
    //Instancia pool
    pool.getConnection = util.promisify(pool.getConnection)
    //Crea conexion en base a obtencion
    let conn = await pool.getConnection();
    //Promete la query
    conn.query = util.promisify(conn.query)    
    //Crear el string de la consulta
    let querySelectCliente = "select * from cliente"   
    //Crea variable para obtener resultados
	let results = '';
	//Ejecuta la consulta
	results = await conn.query(querySelectCliente)
    conn.destroy() 
    return(results)
	   
}

async function selectProductoSQL(item)
{
    //Instancia pool
    pool.getConnection = util.promisify(pool.getConnection)
    //Crea conexion en base a obtencion
    let conn = await pool.getConnection();
    //Promete la query
    conn.query = util.promisify(conn.query)    
    //Crear el string de la consulta
    let querySelectProducto = "select * from producto"   
    //Crea variable para obtener resultados
	let results = '';
	//Ejecuta la consulta
	results = await conn.query(querySelectProducto)
    conn.destroy() 
    return(results)
	   
}




app.listen(port, () => {
    let date_time_serv = new Date();
    console.log('Hora actual:' + date_time_serv)
    console.log(`Servidor escuchando en el puerto: ${port}`)  
})