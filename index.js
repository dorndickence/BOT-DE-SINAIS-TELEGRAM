
const TelegramBot = require('node-telegram-bot-api');
const { Sequelize, DataTypes } = require('sequelize');
const nodeSchedule = require('node-schedule');
const fs = require('fs');
const date = require('dayjs');

// Load credentials for authentication on platforms
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
        logging: false
    }
);

sequelize
    .authenticate()
    .then(() => {
        console.log('Connection with the database has been established successfully.');
    })
    .catch((error) => {
        console.error('Unable to connect to the database: ', error);
    });

// DEFINING THE SCHEMAS
const tb_resultados = sequelize.define('tb_resultados', {
    id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    multiplicador: {
        type: DataTypes.STRING,
        allowNull: false
    },
    alto_baixo: {
        type: DataTypes.BOOLEAN,
        allowNull: false
    },
    data_entrada: {
        type: DataTypes.STRING,
        allowNull: false
    },
    horario_entrada: {
        type: DataTypes.STRING,
        allowNull: false
    }
});

const bot = new TelegramBot(token, { polling: true });

bot.on('polling_error', async (error) => {
    console.log('Captured Telegram polling error: ' + error.message);
    if (bot.isPolling()) {
        console.log('Connected to Telegram');
        await bot.stopPolling();
    }
    await bot.startPolling({ restart: true });
});

// define the quantity of signals per time
const QTDSINAIS = 1;

// Define how many rounds to wait until being released to analyze another green
const RODADAS_REDALERT = 6;

// List of elements to be updated at the moment
let analiser1 = [];
let analiser2 = [];

// Database reading service
let findElementService = null;

// Number of greens that have already been made
let greenStatus = 0;
let rodadas = 0;

// Whether to activate the red alert or not
let redAlert = false;

// Identifies which signals are active at the moment
let sinalAtivo = {
    sinal1: true,
    sinal2: false
};
// Receives the Telegram object for signal message 1
let sinalMessage;
let betMessage;

// Receives the Telegram object for signal message 2
let sinalMessage2;
let betMessage2;

// Indicates whether the bot is started or not
let isStart = true;

bot.onText(/\/start/, async (msg, match) => {
    if (!isStart) {
        console.log('Bot started...');
        isStart = true;
        console.log('Free Group: ' + chatId);
        bot.sendMessage(msg.chat.id, '🤖 BOT IS ON!🟢');
        bot.sendMessage(chatId, '🤖 BOT IS ON!🟢');
        let activeSignals = whichSignalsActive(sinalAtivo);
        bot.sendMessage(msg.chat.id, activeSignals, { parse_mode: 'HTML' });
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

// Last read result from the database (Used in the captureElements function)
let lastResult;

async function captureElements() {
    try {
        findElementService = setInterval(async () => {
            let current = await findLastElement();
            if (lastResult !== current) {
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
        console.log('12:00h Start');
        bot.sendMessage(chatId, '🤖 BOT IS ON!🟢');
        captureElements();
    }
});

async function senderSignal(value) {
    let tester = value;
    console.log(tester);

    if (greenStatus >= QTDSINAIS) {
        console.log('Stop Bot....: ' + greenStatus);
        greenStatus = 0;
        stopBot();
    }

    if (redAlert && rodadas < RODADAS_REDALERT) {
        console.log('RED ALERT ACTIVE: ' + rodadas);
        rodadas = rodadas + 1;
    } else if (redAlert && rodadas === RODADAS_REDALERT) {
        console.log('RED ALERT OFF!');
        redAlert = false;
        rodadas = 0;
    }

    if (sinalAtivo.sinal1 && !redAlert) {
        analiser1.push(tester);
        sinal1();
    }

    if (sinalAtivo.sinal2 && !redAlert) {
        analiser2.push(tester);
        sinal2();
    }
}
    
//[SIGNAL PATTERN 2]
/*
1° Low
2° Low -> Analyze
3° Low -> Entry
4° High -> Green or Gale
5° High -> Green or Gale
6° High -> Green or Red
*/

async function signal1() {
    if (analyzer1.length === 2) {
        if ((analyzer1[0] < 2.00) && (analyzer1[1] < 2.00)) { // Low
            console.log('Analyzing Signal 1...')
            console.log(analyzer1)
            signalMessage = await telegramsendAnalysis()
            return true;
        } else {
            console.log('---------------------------------------')
            console.log('Pattern 1 not found')
            console.log('---------------------------------------')
            analyzer1 = clearAnalyzer(analyzer1, 1)
            return true
        }
    } else if (analyzer1.length === 3) {
        if (analyzer1[2] < 2.00) { // Low
            console.log('Enter bet: Exit at 1.50x')
            await bot.deleteMessage(chatId, signalMessage.message_id)
            betMessage = await telegramsendBet(analyzer1[analyzer1.length - 1], '1.50')
            console.log(analyzer1)
            return true;
        } else {
            await bot.deleteMessage(chatId, signalMessage.message_id)
            console.log('---------------------------------------')
            console.log('Pattern 1 not found')
            console.log('---------------------------------------')
            analyzer1 = clearAnalyzer(analyzer1, analyzer1.length - 1)
            return true;
        }
    } else if (analyzer1.length === 4) {
        if (analyzer1[3] > 1.50) {
            await bot.deleteMessage(chatId, betMessage.message_id)
            await telegrambetend('1.50X')
            await telegramsendGreen(analyzer1[analyzer1.length - 1] + 'X', 'Signal 1')
            console.log("Green 1 (SIGNAL1) ....")
            analyzer1 = clearAnalyzer(analyzer1, analyzer1.length - 1)
            console.log(analyzer1)
            return true;
        } else {
            console.log('GALE 1 (SIGNAL1)')
            return true;
        }
    } else if (analyzer1.length === 5) {
        if (analyzer1[analyzer1.length - 1] > 1.50) {
            await bot.deleteMessage(chatId, betMessage.message_id)
            await telegrambetend('1.50X')
            await telegramsendGreen([analyzer1[analyzer1.length - 2] + 'X', analyzer1[analyzer1.length - 1] + 'X'], 'Signal 1')
            console.log("Green 2 (SIGNAL1)....")
            analyzer1 = clearAnalyzer(analyzer1, analyzer1.length - 1)
            console.log(analyzer1)
            return true;
        } else {
            console.log('GALE 2 (SIGNAL1)')
            return true;
        }
    } if (analyzer1.length === 6) {
        let finalResult = [analyzer1[analyzer1.length - 3] + 'X', analyzer1[analyzer1.length - 2] + 'X', analyzer1[analyzer1.length - 1] + 'X']
        if (analyzer1[analyzer1.length - 1] > 1.50) {
            await bot.deleteMessage(chatId, betMessage.message_id)
            await telegrambetend('1.50X')
            await telegramsendGreen(finalResult, 'Signal 1')
            console.log("Green 3 (SIGNAL1) ....")
            analyzer1 = clearAnalyzer(analyzer1, analyzer1.length - 1)
            console.log(analyzer1)
            return true;
        } else {
            await bot.deleteMessage(chatId, betMessage.message_id)
            await telegrambetend('1.50X')
            await telegramsendRed(finalResult, 'Signal 1')
            console.log("RED ...")
            redAlert = true;
            analyzer1 = clearAnalyzer(analyzer1, analyzer1.length)
            console.log(analyzer1)
            return true;
        }

    }
}

//[SIGNAL PATTERN 2]
/*      
 1° High
 2° Low
 3° Low
 4° High
 5° Low <- Analyze
 6° Low <- Entry
 7° High <- Green or Gale
 8° High <- Green or Gale
 9° High <- Green or Red
*/
async function signal2() {
    if (analyzer2.length === 5) {
        // High                      Low               Low                   High                    Low
        if ((analyzer2[0] > 2.00) && (analyzer2[1] < 2.00) && (analyzer2[2] < 2.00) && (analyzer2[3] > 2.00) && (analyzer2[4] < 2.00) && (analyzer1.length < 3)) { //Pattern for analysis
            console.log('Analyzing Signal 2...')
            console.log(analyzer2)
            signalMessage2 = await telegramsendAnalysis()
            analyzer1 = []
            signalActive.signal1 = false
            return true;
        } else {
            console.log('---------------------------------------')
            console.log('Pattern 2 not found')
            console.log('---------------------------------------')
            analyzer2 = clearAnalyzer(analyzer2, 2)
            signalActive.signal1 = true
            return true;
        }
    } else if (analyzer2.length === 6) {
        if (analyzer2[analyzer2.length - 1] < 2.00) { // Low
            console.log('Enter bet: Exit at 2.00x')
            await bot.deleteMessage(chatId, signalMessage2.message_id)
            betMessage2 = await telegramsendBet(analyzer2[analyzer2.length - 1], '2.00')
            console.log(analyzer2)
            return true;
        } else {
            await bot.deleteMessage(chatId, signalMessage2.message_id)
            console.log('---------------------------------------')
            console.log('Pattern 2 not found')
            console.log('---------------------------------------')
            analyzer2 = clearAnalyzer(analyzer2, 3)
            signalActive.signal1 = true
            return true;
        }
    } else if (analyzer2.length === 7) {
        if (analyzer2[analyzer2.length - 1] > 2.00) { // High
            await bot.deleteMessage(chatId, betMessage2.message_id)
            await telegrambetend('2.00X')
            await telegramsendGreen(analyzer2[analyzer2.length - 1] + 'X', 'Signal 2')
            console.log("Green (SIGNAL2) 1 ....")
            analyzer2 = clearAnalyzer(analyzer2, 4)
            signalActive.signal1 = true
            console.log(analyzer2)
            return true;
        } else {
            console.log('GALE 1 (SIGNAL2)')
            return true;
        }
    } else if (analyzer2.length === 8) {
        if (analyzer2[analyzer2.length - 1] > 2.00) {
            await bot.deleteMessage(chatId, betMessage2.message_id)
            await telegrambetend('2.00X')
            await telegramsendGreen([analyzer2[analyzer2.length - 2] + 'X', analyzer2[analyzer2.length - 1] + 'X'], 'Signal 2')
            console.log("Green 2 (SIGNAL2)....")
            analyzer2 = clearAnalyzer(analyzer2, 5)
            console.log(analyzer2)
            signalActive.signal1 = true
            return true;
        } else {
            console.log('GALE 2 (SIGNAL2)')
            return true;
        }
    } if (analyzer2.length === 9) {
        signalActive.signal1 = true
        let finalResult2 = [analyzer2[analyzer2.length - 3] + 'X', analyzer2[analyzer2.length - 2] + 'X', analyzer2[analyzer2.length - 1] + 'X']
        if (analyzer2[analyzer2.length - 1] > 2.00) {
            await bot.deleteMessage(chatId, betMessage2.message_id)
            await telegrambetend('2.00X')
            await telegramsendGreen(finalResult2, 'Signal 2')
            console.log("Green 3 (SIGNAL2)....")
            analyzer2 = clearAnalyzer(analyzer2, 6)
            console.log(analyzer2)
            return true;
        } else {
            await bot.deleteMessage(chatId, betMessage2.message_id)
            await telegrambetend('2.00X')
            await telegramsendRed(finalResult2, 'Signal 2')
           console.log("RED (SIGNAL2)...")
            redAlert = true;
            analyzer2 = clearAnalyzer(analyzer2, 6)
            console.log(analyzer2)
            return true;
        }
      
    }
}


// For the bot
function stopBot() {
    bot.sendMessage(chatId, '🤖 BOT HAS BEEN STOPPED 🔴');
    bot.sendMessage(chatId, '🤖 ACTIVE ONLY IN THE VIP GROUP WHERE THERE ARE MORE THAN 150 SIGNALS PER DAY 🟩');

    let mensagem = `🤖 NEXT SIGNAL ONLY TOMORROW AT 12PM
🚨 Brasília Time 🚨
IF YOU WANT TO GET THE LIFETIME GROUP WITH +200 DAILY SIGNALS, VIP GROUP 🚨⬇️
https://autopilot.kpages.online/autopilot
Coupon: ALUNOS`;
    bot.sendMessage(chatId, mensagem);

    clearInterval(findElementService);
    isStart = false;
    analiser1 = [];
}

// Accesses the database to query the last added element
async function findLastElement() {
    let value = await sequelize.sync().then(() => {
        let retorno = tb_resultados.findOne({ limit: 1, order: [['createdAt', 'DESC']] }).then(leitura => {
            return leitura.dataValues.multiplicador;
        });
        return retorno;
    });

    return value;
}

// Builds the message of active signals
function quaisSinaisAtivos(sinalAtivo) {
    let msg;
    let sts1;
    let sts2;
    let sts3;
    let sts4;

    if (sinalAtivo.sinal1) {
        sts1 = '🟢';
    } else {
        sts1 = '🔴';
    }
    if (sinalAtivo.sinal2) {
        sts2 = '🟢';
    } else {
        sts2 = '🔴';
    }
    if (sinalAtivo.sinal3) {
        sts3 = '🟢';
    } else {
        sts3 = '🔴';
    }
    if (sinalAtivo.sinal4) {
        sts4 = '🟢';
    } else {
        sts4 = '🔴';
    }
    msg = `<b>ACTIVE SIGNALS</b>
SIGNAL 1: ` + sts1 + `
SIGNAL 2: ` + sts2 + `
SIGNAL 3: ` + sts3 + `
SIGNAL 4: ` + sts4;

    return msg;
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

// Sends the Green message to Telegram
async function telegramsendGreen(v, sts) {
    greenStatus = greenStatus + 1;
    let rawdata = fs.readFileSync('./json/botGratisResultados.json');
    let result = JSON.parse(rawdata);

    let statMomentanea = {
        result: true,
        data: new Date().format("DD/MM/YY"),
        hora: new Date().format("HH:mm"),
        sinal: sts,
        sequencia: v.length
    }

    result.push(statMomentanea);
    gravaJson(result);

    let msg = `🍀<b>Auto Pilot - Bot</b>🍀
GREEN🤑🤑🤑
` + v + `✅✅
Hit the target? Exit the market
And post on Instagram and tag our page➡️ <a href=\'https://www.instagram.com/bot.autopilot/\'> <b>@bot.autopilot</b></a>`;

    await bot.sendMessage(chatId, msg, { parse_mode: 'HTML', disable_web_page_preview: true });
}

// Sends the Red message to Telegram
async function telegramsendRed(v, sts) {
    let rawdata = fs.readFileSync('./json/botGratisResultados.json');
    let result = JSON.parse(rawdata);

    let statMomentanea = {
        result: false,
        data: new Date().format("DD/MM/YY"),
        hora: new Date().format("HH:mm"),
        sinal: sts,
        sequencia: v.length
    }

    result.push(statMomentanea);

    gravaJson(result);

    let msg = `🍀<b>Auto Pilot - Bot</b>🍀
 RED 😤😤😤
 ` + v + `🔴🔴
 Don't go beyond the red, stay calm, with calm we'll go far❗️
 Come back later✅`;
    bot.sendMessage(chatId, msg, { parse_mode: 'HTML', disable_web_page_preview: true });
}

// Sends the end of bet message to Telegram
async function telegrambetend(aposta) {
    let msg = `🤖<b>End of Entry</b>🤖
    Strategy: Jump out at` + aposta;
    await bot.sendMessage(chatId, msg, { parse_mode: 'HTML' });
}

// Saves bot statistics information
async function gravaJson(result) {
    fs.writeFileSync("./json/botGratisResultados.json", JSON.stringify(result), err => {
        // Checking for errors
        if (err) throw err;
        console.log("Done writing"); // Success
    });
}

// Creates bot statistics information
async function botStats() {

    let rawdata = fs.readFileSync('./json/botGratisResultados.json');
    let result = JSON.parse(rawdata);
    let now = new Date();
    let total = 0;
    let greens = 0;
    let reds = 0;
    let porcentagem = 0;

    result.forEach(object => {
        if (object.data === new Date().format("DD/MM/YY")) {
            if (object.result) {
                greens = greens + 1;
            } else {
                reds = reds + 1;
            }
        }
    });


    total = reds + greens;
    porcentagem = (greens * 100) / total;
    let msg = `🤖<b>Bot Statistics</b>🤖
    ` +
        now.format("DD/MM") + `-` + now.format("HH:mm") + `
TOTAL BETS: ` + total + `
RESULTS: ` + greens + ` GREEN✅ x ` + reds + ` RED🔴
SUCCESS RATE: ` + porcentagem.toFixed(2) + `%`;

    return msg;
}

// Removes X number of elements from the beginning of the queue
function analiserClear(array, pos) {

    for (let i = 0; i < pos; i++) {
        array.splice(0, 1);
    }
    return array;
}
