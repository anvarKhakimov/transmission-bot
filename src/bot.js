require("dotenv").config();
const { Telegraf, Markup, Scenes, session } = require("telegraf");
const SceneGenerator = require("./scenes.js");
const Controller = require("./controller.js");
const curScene = new SceneGenerator();
const addTorrentScene = curScene.GenAddTorrentScene();
const stage = new Scenes.Stage([addTorrentScene]);
const token = process.env.BOT_TOKEN;
const accessUsersId = process.env.ALLOWED_USERS.split(",");

if (token === undefined) {
  throw new Error("BOT_TOKEN must be provided!");
}

const bot = new Telegraf(token);

//bot.use(Telegraf.log());
bot.use(session());
bot.use(stage.middleware());
bot.use((ctx, next) => {
  if (accessUsersId.map((elem) => parseInt(elem, 10)).includes(ctx.from.id)) {
    return next();
  }
  
  console.log(`>>> Попытка входа: userId ${ctx.chat.id} (${ctx.chat.first_name} ${ctx.chat.last_name})`);
  sendReply(ctx, `Access Denied`)
});

bot.command("add", async (ctx) => {
  log(ctx, '/add');
  ctx.scene.enter("addTorrent");
});

bot.command("active", async (ctx) => {
  log(ctx, '/active')
  try {
    const activeTorrents = await Controller.getActiveTorrents();
    var emptyMessage = `🐣 Активных торрентов не найдено`;
    var successMessage = `🔍 Список активных торрентов на сервере`;

    var markdownResults = emptyMessage;
    var count = 0;

    activeTorrents.map((torrent)=> {
      var row = `

${count + ". " + torrent.name}
[${torrent.status}] [${torrent.addedDate}] [${torrent.size}]
[/torrent${torrent.id}]`;

      if (count == 0) markdownResults = successMessage;
      markdownResults += row;
      count++;
    })

    await sendReply(ctx, markdownResults);
  } catch (e) {
    console.error(e);
    sendReply(ctx, e);
  }
});

bot.command("list", async (ctx) => {
  log(ctx, '/list')
  try {
    const allTorrents = await Controller.getAllTorrents();
    var markdownResults = `🔍 Список всех торрентов на сервере`;
    var count = 0;
    allTorrents.map((torrent) => {
      var row = `
   
${count + ". " + torrent.name}
[${torrent.status}] [${torrent.addedDate}] [${torrent.size}]
[/torrent${torrent.id}]`;

      markdownResults += row;
      count++;
    });

    await sendReply(ctx, markdownResults);
  } catch (e) {
    console.error(e);
    sendReply(ctx, e)
  }
});

bot.hears(/torrent(.*)/, async (ctx) => {
  log(ctx, '/torrent')
  try {
    const torrentId = ctx.match[1];
    const torrent = await Controller.getTorrent(torrentId);
    if (torrent.id) {
      await sendReply(ctx,
`
${torrent.name} 
[${torrent.status}] [${torrent.addedDate}] [${torrent.size}] [${torrent.percentDone}%] `,
        Markup.inlineKeyboard([
          Markup.button.callback("▶️ Старт", "start" + torrentId),
          Markup.button.callback("✋ Стоп", "stop" + torrentId),
          Markup.button.callback("🗑️ Удалить", "remove" + torrentId),
        ])
      );
    } else {
      sendReply(ctx, "🙈 Такого торрента нет");
    }
  } catch (e) {
    console.error(e);
    sendReply(ctx, e);
  }
});

bot.action(/start(.*)/, async (ctx) => {
  log(ctx, '/start')
  try {
    const torrentId = ctx.match[1];
    const result = await Controller.startTorrent(torrentId);
    const torrent = await Controller.getTorrent(torrentId);

    ctx.editMessageText(`
${torrent.name}
[${torrent.status}]
▶️ Торрент запущен`);
  } catch (e) {
    console.error(e);
    sendReply(ctx, e);
  }
});

bot.action(/stop(.*)/, async (ctx) => {
  log(ctx, '/stop')
  try {
    const torrentId = ctx.match[1];
    const result = await Controller.stopTorrent(torrentId);
    const torrent = await Controller.getTorrent(torrentId);

    ctx.editMessageText(`
${torrent.name} 
[${torrent.status}]
✋ Торрент остановлен`);
  } catch (e) {
    console.error(e);
    sendReply(ctx, e);
  }
});

bot.action(/remove(.*)/, async (ctx) => {
  log(ctx, '/remove');
  try {
    const torrentId = ctx.match[1];
    const torrent = await Controller.getTorrent(torrentId);
    const result = await Controller.removeTorrent(torrentId);

    ctx.editMessageText(`
${torrent.name} 
[${torrent.status}]
🗑️ Торрент удалён`);
  } catch (e) {
    console.error(e);
    sendReply(ctx, e);
  }
});

bot.launch();

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

function sendReply(ctx, message, extra = undefined){
  if (!ctx || !message) return false;
  
  const result = ctx.reply(message, extra).then(function(resp) {
    // log somethings
  }).catch(function(error) {
    if (error.response) {
      console.log(`Error: ${ JSON.stringify(error.response)}`);
    }
  });

  return result;
}
function log(ctx, action, text = '') {
  var message = `>>> Action ${action} userId: ${ctx.from.id}`;
  if (['/start', '/stop', '/remove', '/torrent'].includes(action)) message += ` torrentId: ${ctx.match[1]}`
  console.log(message);
}