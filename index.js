/*--------------------------------------------------------------------*/
/* Sistema de envio de sinais de cassino no o telegram  - Auto PILOT  */
/*--------------------------------------------------------------------*/
//                        by david machado                            //
/*--------------------------------------------------------------------*/
const TelegramBot = require('node-telegram-bot-api');
const { Sequelize, DataTypes } = require('sequelize');
const nodeSchedule = require('node-schedule');
const fs = require('fs');
const date = require('dayjs');

// Load Credentials for Authentication in Platforms
require('dotenv').config();

//////////////////////////////////////////////////////////////////////
const token = process.env.tokenGratis;

const chatId = process.env.CHANNEL_GRATIS; // Id of the Free Group chat

const sequelize = new Sequelize(
  process.env.DATABASE_BASE,
  process.env.DATABASE_USER,
  process.env.DATABASE_PASSWORD,
  {
    host: process.env.DATABASE_HOST,
    dialect: 'mysql',
    logging: false,
  }
);

sequelize
  .authenticate()
  .then(() => {
    console.log('Connection with database has been established successfully.');
  })
  .catch((error) => {
    console.error('Unable to connect to the database: ', error);
  });

// DEFINING THE SCHEMAS
const tb_resultados = sequelize.define('tb_resultados', {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  multiplicador: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  alto_baixo: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
  },
  data_entrada: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  horario_entrada: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

const bot = new TelegramBot(token, { polling: true });

bot.on('polling_error', async (error) => {
  console.log('Telegram polling error: ' + error.message);
  if (bot.isPolling()) {
    console.log('Connected to Telegram');
    await bot.stopPolling();
  }

  await bot.startPolling({ restart: true });
});

// define the amount of signals per hour
const SIGNALS_PER_HOUR = 1;

// Define how many rounds to wait until being allowed to analyze another green
const RED_ALERT_ROUNDS = 6;

// List of elements that will be updated at the moment
let analyzer1 = [];
let analyzer2 = [];

// Database reading service
let findElementService = null;

// Quantity of greens that have already been done
let greenStatus = 0;
let rounds = 0;

// Activate or deactivate the red alert
let redAlert = false;

// Identifies which signals are active at the moment
let activeSignal = {
  signal1: true,
  signal2: false,
};

// Receives the Telegram object referring to the signal 1 message
let signalMessage;
let betMessage;

// Receives the Telegram object referring to the signal 2 message
let signalMessage2;
let betMessage2;

// Indicates whether the bot is started or not
let isStart = true;

bot.onText(/\/start/, async (msg, match) => {
  if (!isStart) {
    console.log('Bot Started...');
    isStart = true;
    console.log('Free Group: ' + chatId);
    bot.sendMessage(msg.chat.id, '🤖 BOT IS ON!🟢');
    bot.sendMessage(chatId, '🤖 BOT IS ON!🟢');
    let sns = getActiveSignals(activeSignal);
    bot.sendMessage(msg.chat.id, sns, { parse_mode: 'HTML' });
    captureElements();
  } else {
    bot.sendMessage(msg.chat.id, '🤖 BOT IS ALREADY ON!🟢');
  }
});

bot.onText(/\/stats/, async (msg, match) => {
  let m = await botStats();
  let sent = await bot.sendMessage(chatId, m, { parse_mode: 'HTML' });
  bot.pinChatMessage(chatId, sent.message_id);
});

// last result read from the database (Used in the function captureElements() )
let lastResult;
async function captureElements() {
  try {
    findElementService = setInterval(async () => {
      let current = await findLastElement();
      if (lastResult != current) {
        lastResult = current;
        senderSignal(current);
      }
    }, 300);
  } catch (error) {
    console.log('ERROR CAPTURING ELEMENTS: ' + error);
    captureElements();
  }
}

// Routine to start the bot
nodeSchedule.scheduleJob('0 00 12 * * ?', async () => {
  if (!isStart) {
    console.log('Start at 12:00 PM');
    bot.sendMessage(chatId, '🤖 BOT IS ON!🟢');
    captureElements();
  }
});

async function senderSignal(value) {
  let tester = value;
  console.log(tester);

  if (greenStatus >= SIGNALS_PER_HOUR) {
    console.log('Stop BotSure! Here's the translated code with the comments in English:

const TelegramBot = require('node-telegram-bot-api');
const { Sequelize, DataTypes } = require('sequelize');
const nodeSchedule = require('node-schedule');
const fs = require('fs');
const date = require('dayjs');

// Load Credentials for Authentication in Platforms
require('dotenv').config();

//////////////////////////////////////////////////////////////////////
const token = process.env.tokenGratis;

const chatId = process.env.CHANNEL_GRATIS; // Id of the Free Group chat

const sequelize = new Sequelize(
  process.env.DATABASE_BASE,
  process.env.DATABASE_USER,
  process.env.DATABASE_PASSWORD,
  {
    host: process.env.DATABASE_HOST,
    dialect: 'mysql',
    logging: false,
  }
);

sequelize
  .authenticate()
  .then(() => {
    console.log('Connection with database has been established successfully.');
  })
  .catch((error) => {
    console.error('Unable to connect to the database: ', error);
  });

// DEFINING THE SCHEMAS
const tb_resultados = sequelize.define('tb_resultados', {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  multiplicador: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  alto_baixo: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
  },
  data_entrada: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  horario_entrada: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

const bot = new TelegramBot(token, { polling: true });

bot.on('polling_error', async (error) => {
  console.log('Telegram polling error: ' + error.message);
  if (bot.isPolling()) {
    console.log('Connected to Telegram');
    await bot.stopPolling();
  }

  await bot.startPolling({ restart: true });
});

// define the amount of signals per hour
const SIGNALS_PER_HOUR = 1;

// Define how many rounds to wait until being allowed to analyze another green
const RED_ALERT_ROUNDS = 6;

// List of elements that will be updated at the moment
let analyzer1 = [];
let analyzer2 = [];

// Database reading service
let findElementService = null;

// Quantity of greens that have already been done
let greenStatus = 0;
let rounds = 0;

// Activate or deactivate the red alert
let redAlert = false;

// Identifies which signals are active at the moment
let activeSignal = {
  signal1: true,
  signal2: false,
};

// Receives the Telegram object referring to the signal 1 message
let signalMessage;
let betMessage;

// Receives the Telegram object referring to the signal 2 message
let signalMessage2;
let betMessage2;

// Indicates whether the bot is started or not
let isStart = true;

bot.onText(/\/start/, async (msg, match) => {
  if (!isStart) {
    console.log('Bot Started...');
    isStart = true;
    console.log('Free Group: ' + chatId);
    bot.sendMessage(msg.chat.id, '🤖 BOT IS ON!🟢');
    bot.sendMessage(chatId, '🤖 BOT IS ON!🟢');
    let sns = getActiveSignals(activeSignal);
    bot.sendMessage(msg.chat.id, sns, { parse_mode: 'HTML' });
    captureElements();
  } else {
    bot.sendMessage(msg.chat.id, '🤖 BOT IS ALREADY ON!🟢');
  }
});

bot.onText(/\/stats/, async (msg, match) => {
  let m = await botStats();
  let sent = await bot.sendMessage(chatId, m, { parse_mode: 'HTML' });
  bot.pinChatMessage(chatId, sent.message_id);
});

// last result read from the database (Used in the function captureElements() )
let lastResult;
async function captureElements() {
  try {
    findElementService = setInterval(async () => {
      let current = await findLastElement();
      if (lastResult != current) {
        lastResult = current;
        senderSignal(current);
      }
    }, 300);
  } catch (error) {
    console.log('ERROR CAPTURING ELEMENTS: ' + error);
    captureElements();
  }
}

// Routine to start the bot
nodeSchedule.scheduleJob('0 00 12 * * ?', async () => {
  if (!isStart) {
    console.log('Start at 12:00 PM');
    bot.sendMessage(chatId, '🤖 BOT IS ON!🟢');
    captureElements();
  }
});

async function senderSignal(value) {
  let tester = value;
  console.log(tester);

  if (greenStatus >= SIGNALS_PER_HOUR) {
    console.log('Stop Bot....: '+greenStatus)
        greenStatus=0;
        stopBot()
    }


if (redAlert && rounds < RODADAS_REDALERT) {
    console.log('RED ALERT ACTIVE: ' + rounds);
    rounds = rounds + 1;
} else if (redAlert && rounds === RODADAS_REDALERT) {
    console.log('RED ALERT OFF!');
    redAlert = false;
    rounds = 0;
}

if (sinalAtivo.sinal1 && !redAlert) {
    analiser1.push(tester);
    sinal1();
}

if (sinalAtivo.sinal2 && !redAlert) {
    analiser2.push(tester);
    sinal2();
}

//[SIGNAL 2 PATTERN]
/*
1st Low
2nd Low -> Analyze
3rd Low -> Entry
4th High -> Green or Gale
5th High -> Green or Gale
6th High -> Green or Red
*/

async function sinal1() {
    if (analiser1.length === 2) {
        if ((analiser1[0] < 2.00) && (analiser1[1] < 2.00)) { // LOW
            console.log('Analyzing Signal 1...');
            console.log(analiser1);
            sinalMessage = await telegramsendAnalise();
            return true;
        } else {
            console.log('---------------------------------------');
            console.log('Pattern 1 not found');
            console.log('---------------------------------------');
            analiser1 = analiserClear(analiser1, 1);
            return true;
        }
    } else if (analiser1.length === 3) {
        if (analiser1[2] < 2.00) { // LOW
            console.log('Enter bet: Exit at 1.50x');
            await bot.deleteMessage(chatId, sinalMessage.message_id);
            betMessage = await telegramsendBet(analiser1[analiser1.length - 1], '1.50');
            console.log(analiser1);
            return true;
        } else {
            await bot.deleteMessage(chatId, sinalMessage.message_id);
            console.log('---------------------------------------');
            console.log('Pattern 1 not found');
            console.log('---------------------------------------');
            analiser1 = analiserClear(analiser1, analiser1.length - 1);
            return true;
        }
    } else if (analiser1.length === 4) {
        if (analiser1[3] > 1.50) {
            await bot.deleteMessage(chatId, betMessage.message_id);
            await telegrambetend('1.50X');
            await telegramsendGreen(analiser1[analiser1.length - 1] + 'X', 'Signal 1');
            console.log("Green 1 (SIGNAL1) ....");
            analiser1 = analiserClear(analiser1, analiser1.length - 1);
            console.log(analiser1);
            return true;
        } else {
            console.log('GALE 1 (SIGNAL1)');
            return true;
        }
    } else if (analiser1.length === 5) {
        if (analiser1[analiser1.length - 1] > 1.50) {
            await bot.deleteMessage(chatId, betMessage.message_id);
            await telegrambetend('1.50X');
            await telegramsendGreen([analiser1[analiser1.length - 2] + 'X', analiser1[analiser1.length - 1] + 'X'], 'Signal 1');
            console.log("Green 2(SIGNAL1)....");
            analiser1 = analiserClear(analiser1, analiser1.length - 1);
            console.log(analiser1);
            return true;
        } else {
            console.log('GALE 2 (SIGNAL1)');
            return true;
        }
    } if (analiser1.length === 6) {
        let resultadoFinal = [analiser1[analiser1.length - 3] + 'X', analiser1[analiser1.length - 2] + 'X', analiser1[analiser1.length - 1] + 'X'];
        if (analiser1[analiser1.length - 1] > 1.50) {
            await bot.deleteMessage(chatId, betMessage.message_id);
            await telegrambetend('1.50X');
            await telegramsendGreen(resultadoFinal, 'Signal 1');
            console.log("Green 3 (SIGNAL1) ....");
            analiser1 = analiserClear(analiser1, analiser1.length - 1);
            console.log(analiser1);
            return true;
           }
          
        }
   }



//Para o bot
function stopBot(){

      
    bot.sendMessage(chatId,'🤖 BOT FOI PARADO 🔴')
    bot.sendMessage(chatId,'🤖 ATIVO APENAS NO GRUPO VIP ATIVO LÁ TEM MAIS DE 150 SINAIS POR DIA🟩')

    let mensagem = `🤖 PRÓXIMO SINAL SÓ AMANHA AS 12H
🚨Horário de Brasília🚨
CASO QUEIRA OBETER O GRUPO VITALÍCIO COM +200 SINAIS DIÁRIOS, GRUPO VIP🚨⬇️
https://autopilot.kpages.online/autopilot
Cupom: ALUNOS`
    bot.sendMessage(chatId,mensagem)    

    clearInterval(findElementService)
    isStart= false
    analiser1= []
}    

// Acessa a base de dados para consultar o ultimo elemento adicionado
async function findLastElement () {
    
  let value =   await sequelize.sync().then(() => {
    let retorno =  tb_resultados.findOne({ limit: 1, order: [['createdAt', 'DESC']]}).then(leitura=>{ return leitura.dataValues.multiplicador;});
        return retorno
    })
   
    return value;
}

// Monta a mensagem dos sinais ativos
function quaisSinaisAtivos(sinalAtivo){
    let msg
    let sts1
    let sts2
    let sts3
    let sts4

    if(sinalAtivo.sinal1){
        sts1 = '🟢'
    }else{
        sts1 = '🔴'
    }
    if(sinalAtivo.sinal2){
        sts2 = '🟢'
    }else{
        sts2 = '🔴'
    }
    if(sinalAtivo.sinal3){
        sts3 = '🟢'
    }else{
        sts3 = '🔴'
    }
    if(sinalAtivo.sinal4){
        sts4 = '🟢'
    }else{
        sts4 = '🔴'
    }
    msg = `<b>SINAIS ATIVOS</b>
SINAL 1 : `+sts1+`
SINAL 2 : `+sts2+`
SINAL 3 : `+sts3+`
SINAL 4 : `+sts4

    return  msg

}

//Envia a mensagem de analise de aposta para o telgram
async function telegramsendAnalise(){
    let msg = `🍀<b>AUTO PILOT - ROBÔ</b>🍀
🚨ATENÇÃO🚨
🤞POSSÍVEL ENTRADA✈️
Aguardem confirmação❗️
LINK🚨➡️ : <a href=\'https://br.betano.com/casino/games/aviator/3337/\'>🔗LINK</a>`;

    let message = await bot.sendMessage(chatId,msg,{parse_mode:'HTML',disable_web_page_preview:true})

    return message
}

//Envia a mensagem de Entrada da aposta dos sinais para o telgram
async function telegramsendBet(entrada,saida){
    let entrarapos = entrada+'X'
    let stop = saida+'X'
    let msg = `🍀<b>Auto Pilot - Robô</b>🍀
🚨ENTRADA CONFIRMADA🚨
Entrar após:`+entrarapos+`
PARA EM :`+stop+`X
Caso não de na primeira utilizar 
Gale✅✅✅
LINK🚨➡️ : <a href=\'https://br.betano.com/casino/games/aviator/3337/\'> <b>(AVIATOR) LINK🚨</b></a>
    `
    let message = await bot.sendMessage(chatId,msg,{parse_mode:'HTML',disable_web_page_preview:true})

    return message
}

//Envia a mensagem de Green para o telgram
async function telegramsendGreen(v,sts){  
    greenStatus=greenStatus+1;
    let rawdata = fs.readFileSync('./json/botGratisResultados.json');
    let result = JSON.parse(rawdata);

    let statMomentanea = {
        result: true,
        data : new date().format("DD/MM/YY"),
        hora : new date().format("HH:mm"),
        sinal: sts,
        sequencia: v.length
    }
   
    result.push(statMomentanea)
    gravaJson(result)

    let msg = `🍀<b>Auto Pilot - Robô</b>🍀
GREEN🤑🤑🤑
`+v+`✅✅
Bateu a meta? Saia do mercado
E poste no Instagram e marque nossa página➡️ <a href=\'https://www.instagram.com/bot.autopilot/\'> <b>@bot.autopilot</b></a>`
    
  await bot.sendMessage(chatId,msg,{parse_mode:'HTML',disable_web_page_preview:true})

   

}

//Envia a mensagem de Red para o telgram
async function telegramsendRed(v,sts){
    let rawdata = fs.readFileSync('./json/botGratisResultados.json');
    let result = JSON.parse(rawdata);

    let statMomentanea = {
        result: false,
        data : new date().format("DD/MM/YY"),
        hora : new date().format("HH:mm"),
        sinal: sts,
        sequencia: v.length
    }
   
    result.push(statMomentanea)
    
    gravaJson(result)   
 
     let msg = `🍀<b>Auto Pilot - Robô</b>🍀
 RED 😤😤😤
 `+v+`🔴🔴 
 Não ir além do red, tenha calma com calma vamos longe❗️
 Volte mais tarde✅`
     bot.sendMessage(chatId,msg,{parse_mode:'HTML',disable_web_page_preview:true})     
}

//Envia a mensagem de final da aposta para o telgram
async function telegrambetend(aposta){
    let msg = `🤖<b>Entrada finalizada</b>🤖
    Estratégia: Pular fora em`+aposta
    await bot.sendMessage(chatId,msg,{parse_mode:'HTML'})

} 

//Grava as informações de estatisticas do bot
async function gravaJson(result){
    fs.writeFileSync("./json/botGratisResultados.json", JSON.stringify(result), err => {
        // Checking for errors
        if (err) throw err;        
        console.log("Done writing"); // Success
    });
}

//Cria as informações de estatisticas do bot
async function botStats(){  
 
    let rawdata = fs.readFileSync('./json/botGratisResultados.json');
    let result = JSON.parse(rawdata);
    let now = new date()
    let total = 0;
    let greens = 0;
    let reds = 0;
    let porcentagem = 0;

    result.forEach(object =>{
        if(object.data === new date().format("DD/MM/YY")){
            if(object.result){
                greens = greens + 1;
            }else{
                reds = reds +1;
            }
        }      
    });

    
    total = reds+greens;
    porcentagem  = (greens*100)/total
    let msg = `🤖<b>Estatisticas do Bot</b>🤖
    `+
now.format("DD/MM")+`-`+now.format("HH:mm")+` 
TOTAL DE JOGADAS : `+total+`
RESULTADOS: `+greens+` GREEN✅ x `+reds+` RED🔴
PORCENTAGEM DE ACERTO: `+porcentagem.toFixed(2)+`%`

   return msg
} 

//Remove um numero X de elementos das primeiras posições da fila
function analiserClear(array,pos){
   
    for(let i=0; i<pos;i++){
        array.splice(0,1)
    }   
    return array
}