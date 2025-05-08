const express = require("express");
const app = express();
let cors = require("cors");
const path = require('path');
const { Web3 } = require("web3");
const Cryptr = require("cryptr");
const bodyParser = require("body-parser");
const BigNumber = require("bignumber.js");
const mongoose = require('mongoose');
const cron = require('node-cron');
require("dotenv").config();

const env = process.env

app.use(bodyParser.json());

const allowedOrigins = env.ALLOWED_ORIGINS ? env.ALLOWED_ORIGINS.split(",") : [];
app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST'],
  credentials: true,
}))

/*
app.use((req, res, next) => {
  console.log('Origin:', req.headers.origin);
  next();
});
*/

function delay(s) { return new Promise(res => setTimeout(res, s * 1000)); }

const uriMongoDB = env.APP_URIMONGODB + "huevo-beta?retryWrites=true&w=majority"
const WalletVacia = "0x0000000000000000000000000000000000000000"
const factorBlock = 1.7
const factorFail = 30
const abiContrato = require("./BinarySystemV4.json");


let allbinario = []
let binarioindexado = []

let appReady = false;

cron.schedule('0 0 */1 * * *', async () => {
  console.log('running a task every Hour scan Binary');

  appReady = false;

  await consultarBinario();
  await escalarRedV2(["0x04302e4e19552635EADd013eFe54E10f30BA1Bf2"])
  await consultarBinario();

  console.log('end task every Hour ');

}, null, true, 'America/Bogota');


const Schema = mongoose.Schema;

const Binario = new Schema({
  _id: String,
  wallet: String,
  registered: Boolean,
  invested: String,
  invested_leader: String,
  upTo: String,
  lastUpdate: Number,
  reclamados: String,
  referer: String,
  up: String,
  left: String,
  lReclamados: String,
  lExtra: String,
  lPersonas: String,
  lPuntos: String,
  right: String,
  rReclamados: String,
  rExtra: String,
  rPersonas: String,
  rPuntos: String,
  idBlock: Number,
  idBlock_old: Number,
  puntosActivos: String,
  hand: Number,
  retirableA: Number

});

const binario = mongoose.model('binarios-v2', Binario);




const port = env.PORT_SERVER || "3001";

const addressContrato = env.REACT_APP_SMARTCONTRACT; //Nevo v4

const KEY_Secreto = env.REACT_APP_ENCR_STO || "AAAAAAAAAAAAAAAA"; // cifrado secreto para evitar fugas de informacion sencible

const TOKEN = env.REACT_APP_TOKEN_API || "1234567890"; // Id de conecion para identificar

let base = "api";
let version = "v2";

const URL = `/${base}/${version}/`;

const RED = env.APP_RED || "https://bsc-dataseed.binance.org/";

let redes = ["https://bsc-dataseed1.binance.org/", "https://bsc-dataseed2.binance.org/", "https://bsc-dataseed3.binance.org/", "https://bsc-dataseed4.binance.org/"]

let web3 = new Web3(RED); // demas funciones
let web3_1 = new Web3(redes[0]); // contrato nuevo
let web3_2 = new Web3(redes[1]); // contrato viejo
let web3_3 = new Web3(redes[2]);

let prinka = env.REACT_APP_PRIVATE_KY

//prinka = web3.eth.accounts.create("orginal new interactions")
//console.log(prinka)

//prinka = encryptString("...", env.REACT_APP_PRIVATE_CR2)
//console.log(prinka)

const account_1_priv = decryptString(prinka, env.REACT_APP_PRIVATE_CR2)

web3.eth.accounts.wallet.add(account_1_priv);
web3_1.eth.accounts.wallet.add(account_1_priv);
web3_2.eth.accounts.wallet.add(account_1_priv);
web3_3.eth.accounts.wallet.add(account_1_priv);

const WALLET_API = web3.eth.accounts.wallet[0].address;
console.log("Wallet API: ", WALLET_API)

let nonces = 0;
let gasPrice = "1000000000";

let contrato = new web3_1.eth.Contract(abiContrato, addressContrato, { // nuevo proxy
  from: WALLET_API, // default from address
  //gasPrice: '3000000000' //defautl gas price
});

web3_3.eth
  .getGasPrice()
  .then((g) => {
    gasPrice = g;
  })
  .catch((e) => {
    console.log(e);
  });

nonce(0);

web3_3.eth.getBalance(WALLET_API).then(async (r) => {
  r = new BigNumber(r).shiftedBy(-18)
  //console.log("balance: " + r.toString(10) + " BNB")

  if (r.toNumber() > 0.3) {
    let evio = r.minus(0.2)
    /*
      let rawTransaction = {
        "from": WALLET_API,
        "nonce": await nonce(0),
        "gasPrice": web3.utils.toHex(gasPrice * 1e9),
        "gasLimit": web3.utils.toHex(gasLimit),
        "to": toAddress,
        "value": amountToSend
      }
    */
    console.log("Enviar a Binance: " + evio.toString(10) + " BNB")

  }

})

async function nonce() {
  var activo = await web3_3.eth.getTransactionCount(WALLET_API, "pending");
  console.log(new BigNumber(activo).toString(10));

  gasPrice = new BigNumber(await web3_3.eth.getGasPrice())

  console.log("gas: " + gasPrice.toString(10) + " factor: " + factorBlock);

  if (activo > nonces) {
    nonces = activo;
  } else {
    nonces++;
  }

  return nonces;
}

function encryptString(s, KEY) {
  const cryptr = new Cryptr(KEY);
  if (typeof s === "string") {
    return cryptr.encrypt(s);
  } else {
    return {};
  }
}

function decryptString(s, KEY) {
  const cryptr = new Cryptr(KEY);
  if (typeof s === "string") {
    return cryptr.decrypt(s);
  } else {
    return {};
  }
}

iniciarAplicacion()

async function iniciarAplicacion() {

  if (!appReady) {
    await mongoose.connect(uriMongoDB)
      .then(async () => {
        console.log("conectado MongoDB");


        console.log(">---- hecho! -------<")

      })

  }

  return appReady;

}

app.get(URL, (req, res) => {
  res.send({ online: true });
});

async function hacerTakeProfit(wallet) {

  wallet = wallet.toLowerCase()

  let result = {
    result: false,
  };

  let retBinario = new BigNumber(0);
  let user = null
  let newUser = {}

  try {
    user = await binario.findOne({ wallet: (wallet).toLocaleLowerCase() }, { _id: false })

  } catch (error) {
    console.log(error.toString())
  }

  let puntosL = new BigNumber(user.lPuntos).minus(user.lReclamados).plus(user.lExtra).dp(0)
  let puntosR = new BigNumber(user.rPuntos).minus(user.rReclamados).plus(user.rExtra).dp(0)

  //puntos que ha ganado hasta el momento
  let puntosReclamados = puntosL.toNumber() <= puntosR.toNumber() ? puntosL : puntosR

  //sobre estos puntos calcula lo que puede retirar en USDT
  let retBin = retirableBinario(puntosL.toString(10), puntosR.toString(10))

  let puntosUsados = new BigNumber(0)

  if (new BigNumber(retBin).toNumber() <= 0) {
    retBin = 0
  } else {
    newUser.lReclamados = new BigNumber(user.lReclamados).plus(puntosReclamados).toString(10)
    newUser.rReclamados = new BigNumber(user.rReclamados).plus(puntosReclamados).toString(10)

    puntosUsados = new BigNumber(newUser.lReclamados)

  }

  retBinario = retBin

  let pRango = new BigNumber(0)
  let invest = new BigNumber(user.invested).toNumber() // 125 USDT

  let puntosRango = [
    125 * 10 ** 18,
    250 * 10 ** 18,
    500 * 10 ** 18,
    1250 * 10 ** 18,
    2500 * 10 ** 18,
    5000 * 10 ** 18,
    12500 * 10 ** 18,
    25000 * 10 ** 18,
    50000 * 10 ** 18,
    125000 * 10 ** 18,
    250000 * 10 ** 18,
    500000 * 10 ** 18,
    1250000 * 10 ** 18
  ]

  let usdtRango = [
    10 * 10 ** 18,
    20 * 10 ** 18,
    40 * 10 ** 18,
    100 * 10 ** 18,
    200 * 10 ** 18,
    400 * 10 ** 18,
    1000 * 10 ** 18,
    2000 * 10 ** 18,
    4000 * 10 ** 18,
    5000 * 10 ** 18,
    10000 * 10 ** 18,
    20000 * 10 ** 18,
    50000 * 10 ** 18
  ]

  let rangoArray = []

  for (let index = 0; index < 12; index++) {
    rangoArray[index] = await contrato.methods
      .rangoReclamado("0xcBD6272721306Cbc2621B6919481bD0a7d5f0ce3", 0)
      .call()
      .then((r) => {
        //console.log(index, r);
        return r;
      })
      .catch((e) => {
        console.log(e.toString());
        return false;
      });

  }

  let truerango = true;

  if (truerango) {
    pRango = puntosUsados
  }


  let gas = await contrato.methods
    .corteBinarioDo(wallet, retBinario, pRango.toString(10), 0)
    .estimateGas({ from: WALLET_API }); // gas: 1000000});

  await contrato.methods
    .corteBinarioDo(wallet, retBinario, pRango.toString(10), 0)
    .send({ gasPrice: gasPrice.toString(10), gas: gas })
    .then(async (r) => {
      await binario.updateOne({ wallet: (wallet).toLowerCase() }, newUser)
      console.log("Corte Binario: " + (wallet).toLowerCase())

      result.hash = r.transactionHash;
      result.result = true;
      result.error = false;
      console.log("Registro Retiro " + wallet);
    })
    .catch(async (e) => {
      let error = e.toString()
      if (error.indexOf("Transaction Hash: ") >= 0) {
        await binario.updateOne({ wallet: (wallet).toLowerCase() }, newUser)
        console.log("Corte Binario (2): " + (wallet).toLowerCase())

        result.hash = "operation processing is in progress please be patient";
        result.result = true;
        result.error = false;
        console.log("Registro Retiro " + wallet);

      } else {
        console.error(e);
        console.log("RR Fallo " + wallet);
        result.result = false;
        result.error = true;
        result.message = e.toString();

      }

    });


  consultarUsuario(wallet, true)

  return result;
}

app.post(URL + "retiro", async (req, res) => {
  let result = {
    result: false,
    message: "no enter data"
  };

  if (typeof req.body.data === "string") {
    let data = JSON.parse(decryptString(req.body.data, KEY_Secreto));

    result.message = "reading data"
    if (
      data.token == TOKEN &&
      data.fecha + 5 * 60 * 1000 >= Date.now() //&&
      //data.origen === "web-huevo"
    ) {
      result.result = await hacerTakeProfit(data.wallet)
      result.message = "profit called"
    }
  }

  res.send(result);
});

async function estimateRetiro(wallet) {
  wallet = wallet.toLowerCase();

  let result = {
    result: false,
  };

  var retBinario = new BigNumber(0);

  let user = await consultarUsuario(wallet, true)

  let puntosL = new BigNumber(user.lPuntos).minus(user.lReclamados).plus(user.lExtra).dp(0)
  let puntosR = new BigNumber(user.rPuntos).minus(user.rReclamados).plus(user.rExtra).dp(0)

  let reclamados = puntosL <= puntosR ? puntosL : puntosR

  let retBin = retirableBinario(puntosL, puntosR) <= 0 ? 0 : retirableBinario(puntosL, puntosR)

  retBinario = new BigNumber(retBin)

  await contrato.methods.corteBinarioDo(wallet, retBinario.toString(10), reclamados.plus(user.lReclamados).toString(10), "0").estimateGas({ from: WALLET_API })
    .then((r) => {
      result.result = true;
      result.gas = new BigNumber(r).times(gasPrice).times(factorBlock);
      result.error = false;
      console.log(
        "calculo Retiro: " + wallet + " - " + retBinario.toString(10) + " | " + new BigNumber(r).toString(10)
      );
    })
    .catch((e) => {
      result.result = true;
      result.gas = new BigNumber(21000).times(gasPrice).times(factorFail);
      result.error = true;
      result.message = e.toString();
      console.log(result.message);
    });

  return result;

}

app.post(URL + "calculate/retiro", async (req, res) => {
  let result = {
    result: false,
    error: true,
    message: "do nothing"
  };

  if (typeof req.body.data === "string") {
    var data = JSON.parse(decryptString(req.body.data, KEY_Secreto));


    if (data.token == TOKEN) {
      result = await estimateRetiro(data.wallet);
    }
  }

  res.send(result);
});

app.get(URL + "binario/todo", async (req, res) => {
  let result = {
    result: true,
    data: allbinario
  };

  res.send(result);
});

function retirableBinario(puntosA, puntosB) {

  puntosA = new BigNumber(puntosA).toNumber()
  puntosB = new BigNumber(puntosB).toNumber()

  let amount = puntosA <= puntosB ? puntosA : puntosB;

  return new BigNumber(amount).times(10).dividedBy(100).dp(0).toString(10)

}

async function colectarPuntos(from, hand) {

  result = {
    puntos: 0,
    usados: 0,
    total: 0,
    personas: 0
  }

  let personas = 0;
  let puntos = new BigNumber(0)
  let user = await selectorBinario(from, true)

  if (user !== undefined) {

    if (user.registered) {

      let array = []
      let registrados = []


      if (hand === 0) {
        array = [user.left]
      } else {
        array = [user.right]
      }


      while (array.length > 0) {

        for (let index = 0; index < array.length; index++) {

          if (array[index] !== WalletVacia && array[index] !== undefined) {
            let lectura = await selectorBinario(array[index])
            if (lectura !== undefined) {
              personas++;
              if (new BigNumber(lectura.invested).toNumber() > 0) {
                puntos = puntos.plus(lectura.invested)

              }

              if (lectura.left !== WalletVacia && registrados.indexOf(lectura.left) === -1) {
                array = array.concat(lectura.left)
                registrados.push(lectura.left)
              }

              if (lectura.right !== WalletVacia && registrados.indexOf(lectura.right) === -1) {
                array = array.concat(lectura.right);
                registrados.push(lectura.left)
              }

            } else {
              console.log("lectura selecor binario indefinido ", array[index])
            }
          }

          array.splice(index, 1);

        }

      }

      puntos = puntos.times(50).dividedBy(100)

      //console.log("colectar P: " + puntos.toString(10))

      personas = new BigNumber(personas)

      if (hand === 0) {
        result = {
          upline: user.up,
          dowline: user.left,
          puntos: puntos.minus(user.lReclamados).plus(user.lExtra).dp(0).toString(10),
          usados: user.lReclamados,
          total: puntos.plus(user.lExtra).dp(0).toString(10),
          crudo: puntos.dp(0).toString(10),
          personas: personas.toString(10)
        }

      } else {
        result = {
          upline: user.up,
          dowline: user.right,
          puntos: puntos.minus(user.rReclamados).plus(user.rExtra).dp(0).toString(10),
          usados: user.rReclamados,
          total: puntos.plus(user.lExtra).dp(0).toString(10),
          crudo: puntos.dp(0).toString(10),
          personas: personas.toString(10)
        }

      }
    }

  }

  return result;

}

async function binariV2(wallet) {
  wallet = (wallet).toLocaleLowerCase()

  let newUser = {}

  let userTemp = await binario.findOne({ wallet: wallet })

  let puntosIz = new BigNumber(0)
  let puntosDe = new BigNumber(0)

  let personasIz = new BigNumber(0)
  let personasDe = new BigNumber(0)

  /// recordar restar puntos Extra de cada lado

  if (userTemp !== null) {
    if (userTemp.left !== undefined) {
      if (userTemp.left !== WalletVacia) {

        await consultarUsuario(userTemp.left, false, true)

        let uleft = await binario.findOne({ wallet: userTemp.left })

        if (uleft !== null) {
          if (uleft.lPuntos !== undefined && uleft.rPuntos !== undefined) {

            puntosIz = puntosIz.plus(uleft.invested).times(50).dividedBy(100)
            puntosIz = puntosIz.plus(uleft.lPuntos).plus(uleft.rPuntos)

            if (puntosIz.toNumber() > new BigNumber(userTemp.lPuntos).toNumber()) {
              newUser.lPuntos = puntosIz.toString(10)
            }

            personasIz = personasIz.plus(1).plus(uleft.lPersonas).plus(uleft.rPersonas)

            if (personasIz.toNumber() > new BigNumber(userTemp.lPersonas).toNumber()) {
              newUser.lPersonas = personasIz.toString(10)
            }

          }
        }

      } else {
        newUser.lPuntos = "0"
        newUser.lPersonas = "0"
      }
    } else {
      newUser.lPuntos = "0"
      newUser.lPersonas = "0"
    }

    if (userTemp.right !== undefined) {
      if (userTemp.right !== WalletVacia) {

        await consultarUsuario(userTemp.right, false, true)

        let uright = await binario.findOne({ wallet: userTemp.right })

        if (uright !== null) {
          if (uright.lPuntos !== undefined && uright.rPuntos !== undefined) {
            puntosDe = puntosDe.plus(uright.invested).times(50).dividedBy(100);
            puntosDe = puntosDe.plus(uright.lPuntos).plus(uright.rPuntos);

            if (puntosDe.toNumber() > new BigNumber(userTemp.rPuntos).toNumber()) {
              newUser.rPuntos = puntosDe.toString(10)
            }

            personasDe = personasDe.plus(1).plus(uright.lPersonas).plus(uright.rPersonas)

            if (personasDe.toNumber() > new BigNumber(userTemp.rPersonas).toNumber()) {
              newUser.rPersonas = personasDe.toString(10)
            }

          }
        }

      } else {
        newUser.rPuntos = "0"
        newUser.rPersonas = "0"
      }
    } else {
      newUser.rPuntos = "0"
      newUser.rPersonas = "0"
    }


  } else {
    consultarUsuario(wallet, true, true, true);

  }

  await binario.updateOne({ wallet: wallet }, newUser)


  //puntos activos

  if (userTemp !== null && userTemp.left !== undefined && userTemp.right !== undefined) {

    newUser = {}

    userTemp = await binario.findOne({ wallet: wallet })

    let pL = new BigNumber(userTemp.lPuntos).plus(userTemp.lExtra).minus(userTemp.lReclamados)
    let pR = new BigNumber(userTemp.rPuntos).plus(userTemp.rExtra).minus(userTemp.rReclamados)

    if (pL.toNumber() < pR.toNumber()) {
      newUser.puntosActivos = pL.toString(10)

    } else {
      newUser.puntosActivos = pR.toString(10)
    }

    //console.log(newUser)

    await binario.updateOne({ wallet: wallet }, newUser)
  }

  return true

}

async function binari(wallet) {

  wallet = (wallet).toLocaleLowerCase()

  await consultarUsuario(wallet, true, true, true);

  let newUser = {}

  let leg = await colectarPuntos(wallet, 0)
  let leg2 = await colectarPuntos(wallet, 1)

  if (leg.puntos < 0) {
    leg.puntos = "0"
  }

  if (leg2.puntos < 0) {
    leg2.puntos = "0"
  }

  let retBin = retirableBinario(leg.puntos, leg2.puntos)

  if (new BigNumber(retBin).toNumber() < 0) {
    retBin = 0
  }

  let data = { retirableBinario: retBin, upline: leg.upline, left: leg, right: leg2 }

  delete data.left.upline;
  delete data.right.upline;

  let userTemp = await binario.findOne({ wallet: wallet }, { _id: false })

  let hacerUpdate = false

  if (userTemp !== undefined) {

    if (data.left.dowline !== WalletVacia) {
      if (new BigNumber(data.left.crudo).toNumber() !== new BigNumber(userTemp.lPuntos).toNumber()) {
        newUser.lPuntos = data.left.crudo
        hacerUpdate = true
      }

      if (new BigNumber(data.left.personas).toNumber() !== new BigNumber(userTemp.lPersonas).toNumber()) {
        newUser.lPersonas = data.left.personas
        hacerUpdate = true

      }
    } else {
      newUser.lPuntos = "0"
      newUser.lPersonas = "0"
      hacerUpdate = true

    }

    if (data.right.dowline !== WalletVacia) {

      if (new BigNumber(data.right.crudo).toNumber() !== new BigNumber(userTemp.rPuntos).toNumber()) {
        newUser.rPuntos = data.right.crudo
        hacerUpdate = true

      }

      if (new BigNumber(data.right.personas).toNumber() !== new BigNumber(userTemp.rPersonas).toNumber()) {
        newUser.rPersonas = data.right.personas
        hacerUpdate = true

      }
    } else {
      newUser.rPuntos = "0"
      newUser.rPersonas = "0"
      hacerUpdate = true

    }

    if (hacerUpdate) {
      await binario.updateOne({ wallet: wallet }, newUser)
    }

  }


  return data;

}

app.get(URL + "usuario/actualizar", async (req, res) => {

  let result = {
    result: false
  };

  //console.log(req.query)

  if (req.query.wallet) {

    let wallet = (req.query.wallet).toString().toLocaleLowerCase()

    consultarUsuario(wallet, true, true)

    result.result = true


  } else {

    result = {
      result: false,
      error: true,
      msg: "not valid wallet parameter"
    };
  }


  res.send(result);
});

app.get(URL + "binario/actualizar", async (req, res) => {

  let result = {
    result: false
  };

  if (req.query.wallet) {

    let wallet = (req.query.wallet).toString().toLocaleLowerCase()

    await binariV2(wallet)

    result.result = true

  } else {

    result = {
      result: false,
      error: true,
      msg: "not valid wallet parameter"
    };
  }


  res.send(result);
});

async function lecturaBinari(wallet) {

  await consultarUsuario(wallet, true)
  let user = await binario.findOne({ wallet: wallet }, { _id: false })

  let puntosL = new BigNumber(user.lPuntos).minus(user.lReclamados).plus(user.lExtra).dp(0).toString(10)
  let puntosR = new BigNumber(user.rPuntos).minus(user.rReclamados).plus(user.rExtra).dp(0).toString(10)


  let retBin = retirableBinario(puntosL, puntosR)
  if (new BigNumber(retBin) < 0) {
    retBin = "0"
  }


  let consulta = {
    result: true,
    data: {
      retirableBinario: retBin,
      upline: user.up,
      invested: user.invested,
      invested_leader: user.invested_leader,
      upTo: user.upTo,
      left: {
        dowline: user.left,
        puntos: new BigNumber(user.lPuntos).minus(user.lReclamados).plus(user.lExtra).dp(0).toString(10),
        usados: user.lReclamados,
        total: new BigNumber(user.lPuntos).plus(user.lExtra).dp(0).toString(10),
        personas: parseInt(user.lPersonas)
      },
      right: {
        dowline: user.right,
        puntos: new BigNumber(user.rPuntos).minus(user.rReclamados).plus(user.rExtra).dp(0).toString(10),
        usados: user.lReclamados,
        total: new BigNumber(user.rPuntos).plus(user.rExtra).dp(0).toString(10),
        personas: parseInt(user.rPersonas)
      }
    }
  }

  //console.log(consulta)
  return consulta;

}

app.get(URL + "binario", async (req, res) => {

  let result = {
    result: false
  };


  if (req.query.wallet) {

    let wallet = (req.query.wallet).toString().toLocaleLowerCase()

    result = await lecturaBinari(wallet)


  } else {

    result = {
      result: false,
      error: true,
      msg: "not valid wallet parameter"
    };
  }


  res.send(result);
});

async function consultarBinario() {
  let red = []

  try {

    red = await binario.find({}, { _id: false })

    if (red.length > 0) {

      console.log("Inicia reduce")
      let inicio = Date.now()
      appReady = false
      delete binarioindexado;
      binarioindexado = red.reduce((acc, el, index) => {
        acc[el.wallet] = el;
        if (index == red.length - 1) {
          appReady = true
          console.log("Termino reduce: " + ((Date.now() - inicio) / 1000) + " seg")
          console.log("statusApp->" + appReady)

        }

        return acc
      }, red[0])


    }




  } catch (error) {
    console.log(error.toString())
  }
  //console.log(red)

  return appReady

}

async function selectorBinario(wallet, consultaForzada) {
  wallet = wallet.toLowerCase()
  //console.log("selector: " + wallet)

  let consulta = undefined;

  consulta = binarioindexado[wallet]

  let userTemp = null;

  try {
    userTemp = await binario.findOne({ wallet: wallet }, { _id: false })

  } catch (error) {
    console.log(error.toString())
  }

  if (consulta === undefined || consultaForzada || userTemp === null) {
    await consultarUsuario(wallet, true)
  }

  consulta = binarioindexado[wallet]

  return consulta

}

app.post(URL + "puntos/add", async (req, res) => {

  let result = {
    result: false,
  };

  if (typeof req.body.data === "string") {
    let data = JSON.parse(decryptString(req.body.data, KEY_Secreto));

    console.log(data)

    if (data.token == TOKEN) {

      if ("puntos" in data) {

        let user = await binario.findOne({ wallet: (data.wallet).toLocaleLowerCase() }, { _id: false })

        let newUser = {}

        if (data.hand === 0) {
          newUser = {
            lExtra: new BigNumber(user.lExtra).plus(data.puntos).toString(10)
          }

        } else {
          newUser = {
            rExtra: new BigNumber(user.rExtra).plus(data.puntos).toString(10)
          }
        }

        await binario.updateOne({ wallet: (data.wallet).toLocaleLowerCase() }, newUser)
        console.log("puntos asignados: " + (data.wallet).toLocaleLowerCase() + " hand: " + data.hand + " -> " + data.puntos)

        await consultarUsuario((data.wallet).toLocaleLowerCase(), true, true, true)

        result.result = true
      } else {
        result.msg = "not correct value"

      }
    } else {
      result.msg = "not auth"
    }
  } else {
    result.msg = "data not found"
  }

  res.send(result);
})

async function escalarRedV2() {

  let lista2 = await binario.find({}, { wallet: true, idBlock: true }).sort({ idBlock: -1 })

  console.log("---- V2 Start Loop / escalar red LISTA ----")

  for (let index = 0; index < lista2.length; index++) {
    //console.log(index, lista2[index].wallet, lista2[index].idBlock)
    await delay(0.4);
    await conectarUpline(lista2[index].wallet)
    await binariV2(lista2[index].wallet)

  }

  console.log("----v2 END Loop / escalar red ----")

}

async function conectarUpline(from) {
  from = from.toLowerCase()

  let newUser = {}

  let userRef = null
  let userTemp = null;

  try {
    userTemp = await binario.findOne({ wallet: from }, { _id: false })

  } catch (error) {
    console.log(error.toString())
  }

  if (userTemp === null) return false;

  //cambiar esto por metodo de consulta a base de datos mitigar error api binance por muchas consultas
  let consulta = await contrato.methods.upline(from).call()
    .catch((e) => {
      console.log("Error consulta binance " + e.toString())
      return false
    })

  if (consulta === false) return false;

  let hand = parseInt(consulta._lado);
  let referer = (consulta._referer).toLowerCase();

  try {
    userRef = await binario.findOne({ wallet: referer }, { _id: false })
  } catch (error) {
    console.log(error.toString())
  }

  let result = false

  if (userRef !== null) {
    if (referer !== WalletVacia) {
      newUser.referer = referer

      if (userTemp.up === userTemp.wallet) {
        newUser.up = WalletVacia
      }

      if (userTemp.referer !== WalletVacia && userTemp.up === WalletVacia) {

        //console.log("user: " + from + " up: " + userTemp.up + " hand: " + hand + " padre: " + padre)
        //if (userTemp.up === WalletVacia ) {}

        //console.log("<<<<< upline no coneted: " + from + ">>>>>")
        if (parseInt(hand) === 0) {
          let ubication = null
          try {
            ubication = await binario.find({ left: from }, { _id: false })
          } catch (error) {
            console.log(error.toString())
          }

          if (ubication.length >= 1) {

            if (ubication.length === 1) {

              if (userTemp.up !== ubication[0].wallet) {
                console.log("Ubicado izquierda largo1 " + from + " up: " + ubication[0].wallet)
                await binario.updateOne({ wallet: from }, { up: ubication[0].wallet })
              }


            } else {

              console.log("eliminando izquierda  " + ubication.length + " " + from)

              // debe de encontrarse el correcto y eliminar el registro de los demas
              //console.log(ubication)
              let menor = ubication[0].idBlock;
              let ganador = 0;
              for (let index = 0; index < ubication.length; index++) {
                if (ubication[index].idBlock !== 0) {

                  if (ubication[index].idBlock < menor) {
                    menor = ubication[index].idBlock;
                    ganador = index;
                  }
                }
              }

              await binario.updateOne({ wallet: from }, { up: ubication[ganador].wallet })

              for (let index = 0; index < ubication.length; index++) {
                if (index !== ganador) {
                  await binario.updateOne({ wallet: ubication[ganador].wallet }, { left: WalletVacia, lPuntos: "0" })

                }

              }

            }

          } else {
            // debe ubicarlo en alguna parte del binario
            console.log(">Ubicando izquierda " + from + " ref: " + referer)
            let accion = 0
            let lista = []

            let buscando = referer;// wallet del uperline

            while (accion === 0) {
              try {
                userRef = await binario.findOne({ wallet: buscando }, { _id: false })
              } catch (error) {
                console.log(error.toString())
              }

              if (userRef === null) {
                consultarUsuario(userRef.wallet)
                accion = 4
                break;
              }

              if (userRef.left === from) {
                await binario.updateOne({ wallet: from }, { up: userRef.wallet })

                accion = 1
                break;
              }


              if (userRef.left === WalletVacia && userRef.wallet !== from) {

                await binario.updateOne({ wallet: userRef.wallet }, { left: from })
                await binario.updateOne({ wallet: from }, { up: userRef.wallet })

                accion = 2
                break;

              }

              if (lista.indexOf(userRef.wallet) === -1) {
                lista.push(userRef.wallet)
              } else {

                await binario.updateOne({ wallet: userRef.wallet }, { left: WalletVacia, lPuntos: "0" })

                accion = 5
                break;

              }

              buscando = userRef.left


            }

            console.log(">Termina ubicación izquierda accion:" + accion + " " + from + " ^ " + buscando)

          }

          let adverso = null
          try {
            adverso = await binario.find({ right: from }, { _id: false })
          } catch (error) {
            console.log(error.toString())
          }

          for (let index = 0; index < adverso.length; index++) {
            await binario.updateOne({ wallet: adverso[index].wallet }, { right: WalletVacia, rPuntos: "0" })
          }

        }

        if (parseInt(hand) === 1) {
          let ubication = null
          try {
            ubication = await binario.find({ right: from }, { _id: false })
          } catch (error) {
            console.log(error.toString())
          }

          if (ubication.length >= 1) {

            if (ubication.length === 1) {
              if (userTemp.up !== ubication[0].wallet) {
                console.log("Ubicado derecha largo1 " + from + " ref: " + referer)
                await binario.updateOne({ wallet: from }, { up: ubication[0].wallet })
              }
            } else {

              console.log("eliminando derecha  " + ubication.length + " " + from)

              let menor = ubication[0].idBlock;
              let ganador = 0;
              for (let index = 0; index < ubication.length; index++) {
                if (ubication[index].idBlock !== 0) {
                  if (ubication[index].idBlock < menor) {
                    menor = ubication[index].idBlock;
                    ganador = index;
                  }
                }

              }

              await binario.updateOne({ wallet: from }, { up: ubication[ganador].wallet })

              for (let index = 0; index < ubication.length; index++) {
                if (index !== ganador) {
                  await binario.updateOne({ wallet: ubication[ganador].wallet }, { right: WalletVacia, rPuntos: "0" })

                }

              }

            }

          } else {
            // debe ubicarlo en alguna parte del binario
            console.log(">Ubicando derecha " + from)
            let accion = 0
            let lista = []
            let buscando = referer;// wallet del uperline

            while (accion === 0) {
              try {
                userRef = await binario.findOne({ wallet: buscando }, { _id: false })
              } catch (error) {
                console.log(error.toString())
              }

              if (userRef === null) {
                consultarUsuario(buscando)
                accion = 4
                break;
              }

              if (userRef.right === from) {
                await binario.updateOne({ wallet: from }, { up: userRef.wallet })

                accion = 1
                break;
              }


              if (userRef.right === WalletVacia && userRef.wallet !== from) {

                await binario.updateOne({ wallet: userRef.wallet }, { right: from })
                await binario.updateOne({ wallet: from }, { up: userRef.wallet })

                accion = 2
                break;

              }

              if (lista.indexOf(buscando) === -1) {
                lista.push(buscando)
              } else {

                await binario.updateOne({ wallet: buscando }, { right: WalletVacia, rPuntos: "0" })

                accion = 5
                break;

              }

              buscando = userRef.right


            }

            console.log(">Termina ubicación derecha accion:" + accion + " " + from + " ^ " + buscando)

          }

          let adverso = null
          try {
            adverso = await binario.find({ left: from }, { _id: false })
          } catch (error) {
            console.log(error.toString())
          }

          for (let index = 0; index < adverso.length; index++) {
            await binario.updateOne({ wallet: adverso[index].wallet }, { left: WalletVacia, lPuntos: "0" })
          }

        }
      }



    } else {
      console.log("wallet: " + from + " sin referer valido: " + referer)
    }

    await binario.updateOne({ wallet: from }, newUser);
    await consultarUsuario(from, true);

  } else {
    //console.log(from + " no existe, Upline: " + upline._referer+" wallet vacia no registrado")
    if (referer !== WalletVacia) {
      consultarUsuario(referer, true, true);
    }

    result = true
  }

  userTemp = await binario.findOne({ wallet: from }, { _id: false })


  if (from !== WalletVacia && !userTemp.registered && userTemp.lReclamados === "0" && userTemp.rReclamados === "0") {
    //await binario.deleteOne({ wallet: from })
    console.log("se deberia borrar: from:  " + from)

  }

  return result;
}

async function crearUsuario(from) {
  from = from.toLowerCase()

  let userTemp = null;
  let result = false

  let investorNew = { registered: false }

  let newUser = {}


  try {
    investorNew = await contrato.methods.investors(from).call()
  } catch (error) { }

  let invertidoReal = new BigNumber(0);
  let leader = new BigNumber(0)
  let upTo = new BigNumber(0)

  if (investorNew.registered) {

    let depositos = await contrato.methods.verListaDepositos(from).call();

    for (let index = 0; index < depositos.length; index++) {
      let dep = new BigNumber(depositos[index].valor)

      if (depositos[index].pasivo) {
        invertidoReal = invertidoReal.plus(dep)
      } else {
        leader = leader.plus(dep)
      }

      let temp = dep.times(depositos[index].factor).dividedBy(100)

      upTo = upTo.plus(temp)

    }

  }

  newUser.invested_leader = leader.toString(10)
  newUser.invested = invertidoReal.toString(10)


  try {
    userTemp = await binario.findOne({ wallet: from }, { _id: false })

  } catch (error) {
    console.log(error.toString())
  }


  if (userTemp === null) {

    newUser = {
      wallet: from,
      registered: false,
      invested: newUser.invested,
      invested_leader: newUser.invested_leader,
      upTo: upTo.toString(10),
      referer: WalletVacia,
      up: WalletVacia,
      left: WalletVacia,
      lReclamados: "0",
      lExtra: "0",
      right: WalletVacia,
      rReclamados: "0",
      rExtra: "0",
      lPuntos: "0",
      rPuntos: "0",
      lPersonas: "0",
      rPersonas: "0",
      idBlock: 0,
      idBlock_old: 0,
      puntosActivos: "0"

    }

    if (investorNew.registered) {
      newUser.registered = true

      newUser.idBlock = parseInt(await contrato.methods.addressToId(from).call())

      let consulta = await contrato.methods.upline(from).call();
      newUser.referer = (consulta._referer).toLowerCase();
    }

    newUser._id = from

    let saveuser = new binario(newUser)

    try {
      userTemp = await binario.findOne({ wallet: from }, { _id: false })

    } catch (error) {
      console.log(error.toString())
    }
    if (userTemp === null) {
      await saveuser.save().then(() => {
        console.log("User Created: " + newUser.wallet);

      }).catch((e) => {
        console.log(e.toString())
      })
    }

    result = newUser
  } else {

    await binario.updateOne({ wallet: from }, newUser)

    try {
      userTemp = await binario.findOne({ wallet: from }, { _id: false })

    } catch (error) {
      console.log(error.toString())
    }

    result = userTemp

  }

  return result;

}

async function consultarUsuario(from, agregateBinario, updateInfoBlockchain, conectarUp) {
  from = from.toLowerCase()

  if (from === "0x0000000000000000000000000000000000000000") return {};

  let userTemp = null;

  if (updateInfoBlockchain) {
    await actualizarUsuario(from, {}, false) /// deshabilitar recuecuperacion reclamado del v1
  }

  try {
    userTemp = await binario.findOne({ wallet: from }, { _id: false })

  } catch (error) {
    console.log(error.toString())
  }

  if (userTemp === null) {
    userTemp = await crearUsuario(from)
  }

  if (agregateBinario) {
    binarioindexado[from] = userTemp
    //console.log("Actualizado localmente: " + from)

  }

  if (conectarUp) {
    await conectarUpline(from)
    try {
      userTemp = await binario.findOne({ wallet: from }, { _id: false })

    } catch (error) {
      console.log(error.toString())
    }
  }

  return userTemp

}

async function actualizarUsuario(from, data) {
  from = from.toLowerCase()

  let userTemp = null;

  try {
    userTemp = await binario.findOne({ wallet: from }, { _id: false })

  } catch (error) {
    console.log(error.toString())
  }

  let result = false

  if (userTemp !== null) {

    let investorNew = { registered: false }

    let newUser = {}

    let realInvested = new BigNumber(0);

    try {
      investorNew = await contrato.methods.investors(from).call()

    } catch (error) { }


    let invertido = new BigNumber(0)
    let leader = new BigNumber(0)
    let upTo = new BigNumber(0)
    let porcentaje = await contrato.methods.porcent().call()


    if (investorNew.registered) {
      newUser.idBlock = parseInt(await contrato.methods.addressToId(from).call())
      newUser.registered = true;

      let consulta = await contrato.methods.upline(from).call()

      newUser.hand = parseInt(consulta._lado);
      if (newUser.hand <= 1 && userTemp.referer === WalletVacia) {

        newUser.referer = (consulta._referer).toLowerCase();

      }

      let depositos = await contrato.methods.verListaDepositos(from).call();

      for (let index = 0; index < depositos.length; index++) {
        let dep = new BigNumber(depositos[index].valor)

        if (depositos[index].pasivo) {
          invertido = invertido.plus(dep)
        } else {
          leader = leader.plus(dep)
        }

      }

      if (leader.toNumber(0) > 0) {
        if (invertido.toNumber() > realInvested.toNumber()) {
          realInvested = invertido;
        }
      } else {
        realInvested = new BigNumber(investorNew.invested)
      }

      newUser.retirableA = new BigNumber(await contrato.methods.retirableA(from).call()).toNumber()


    } else {
      newUser.registered = false;

    }

    newUser.invested = realInvested.toString(10)

    newUser.invested_leader = leader.toString(10)

    newUser.upTo = upTo.plus(investorNew.invested).times(porcentaje).dividedBy(100).toString(10)


    if (data.lReclamados) {
      newUser.lReclamados = new BigNumber(userTemp.lReclamados).plus(data.lReclamados).toString(10)
    }
    if (data.lExtra) {
      newUser.lExtra = new BigNumber(userTemp.lExtra).plus(data.lExtra).toString(10)
    }

    if (data.rReclamados) {
      newUser.rReclamados = new BigNumber(userTemp.rReclamados).plus(data.rReclamados).toString(10)
    }
    if (data.rExtra) {
      newUser.rExtra = new BigNumber(userTemp.rExtra).plus(data.rExtra).toString(10)
    }

    if (!userTemp.lPuntos) {
      newUser.lPuntos = "0"
    }
    if (!userTemp.rPuntos) {
      newUser.rPuntos = "0"
    }
    if (!userTemp.lPersonas) {
      newUser.lPersonas = "0"
    }
    if (!userTemp.rPersonas) {
      newUser.rPersonas = "0"
    }

    await binario.updateOne({ wallet: from }, newUser)

    result = true
  }

  return result;

}

async function consultarLados(from) {
  from = from.toLowerCase()
  let userTemp = await selectorBinario(from, true)
  let array = []

  if (userTemp !== null) {

    if (userTemp.left && userTemp.left !== WalletVacia) {
      array.push(userTemp.left)
    }

    if (userTemp.right && userTemp.right !== WalletVacia) {
      array.push(userTemp.right)
    }
  }

  return array
}

app.get(URL + "total/retirar", async (req, res) => {

  /*
  await consultarBinario();
  await escalarRedV2();
  await consultarBinario();
  */
  //await consultarUsuario("0x0ee1168b2e5d2ba5e6ab4bf6ca00881981d84ab9",false,true)

  let consulta = await binario.find({}, { _id: 0, retirableA: 1, wallet: 1 })

  const initialValue = new BigNumber(0);
  const sumWithInitial = consulta.reduce(
    (accumulator, currentValue) => {
      if (new BigNumber(currentValue.retirableA).shiftedBy(-18).toNumber() > new BigNumber(5).toNumber()) {
        accumulator = accumulator.plus(currentValue.retirableA)
      }

      return accumulator
    },
    initialValue,
  );

  let result = {
    result: true,
    usdt: new BigNumber(sumWithInitial).shiftedBy(-18).dp(6),
    total: sumWithInitial.toString(10)
  };

  res.send(result);
});

app.use(express.static(path.join(__dirname, '../client/docs')));
app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, '../client/docs', 'index.html'));
});

app.listen(port, () => {
  console.log(`WEB - Listening on: http://localhost:${port} `);
  console.log(`API - Listening on: http://localhost:${port + URL} `);

});
