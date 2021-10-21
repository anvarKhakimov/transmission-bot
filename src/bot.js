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

bot.use(Telegraf.log());
bot.use(stage.middleware());

bot.use((ctx, next) => {
  if (accessUsersId.map((elem) => parseInt(elem, 10)).includes(ctx.from.id)) {
    return next();
  }
  ctx.reply("Ой! А доступ всё, надо было раньше!");
});

bot.command("add", async (ctx) => {
  ctx.scene.enter("addTorrent");
});

bot.command("active", async (ctx) => {
  try {
    const torrents = await Controller.getActiveTorrents();
    console.log(torrents);
    await ctx.reply(torrents);
  } catch (e) {
    console.error(e);
    ctx.reply("Ой, ошибочка.");
  }
});

bot.command("list", async (ctx) => {
  try {
    const allTorrents = await Controller.getAllTorrents();
    var markDownResults = `🔍 Список всех торрентов на сервере`;
    var count = 0;
    allTorrents.map((torrent) => {
      let str = `
   
${count + ". " + torrent.name}
[${torrent.status}] [${torrent.addedDate}] [${torrent.size}]
[/torrent${torrent.id}]`;

      markDownResults += str;
      count++;
    });

    await ctx.reply(markDownResults);
  } catch (e) {
    console.error(e);
    ctx.reply("Ой, ошибочка");
  }
});

bot.hears(/torrent(.*)/, async (ctx) => {
  try {
    const torrentId = ctx.match[1];
    const torrent = await Controller.getTorrent(torrentId);
    if (torrent.id) {
      await ctx.reply(
        `
${torrent.name} 
[${torrent.status}] [${torrent.addedDate}] [${torrent.size}] [${torrent.percentDone}%] `,
        Markup.inlineKeyboard([
          Markup.button.callback("▶️ Старт", "start" + torrentId),
          Markup.button.callback("⏸ Стоп", "stop" + torrentId),
          Markup.button.callback("❌ Удалить", "remove" + torrentId),
        ])
      );
    } else {
      ctx.reply("🙈 Такого торрента нет");
    }
  } catch (e) {
    console.error(e);
    ctx.reply("😱 Ой, ошибочка");
  }
});

bot.action(/start(.*)/, async (ctx) => {
  try {
    const torrentId = ctx.match[1];
    const result = await Controller.startTorrent(torrentId);
    const torrent = await Controller.getTorrent(torrentId);

    ctx.editMessageText(`
${torrent.name}
[${torrent.status}]
▶️ Возобновляем загрузку`);
  } catch (e) {
    console.error(e);
    ctx.reply("Ой, ошибочка");
  }
});

bot.action(/stop(.*)/, async (ctx) => {
  try {
    const torrentId = ctx.match[1];
    const result = await Controller.stopTorrent(torrentId);
    const torrent = await Controller.getTorrent(torrentId);

    ctx.editMessageText(`
${torrent.name} 
[${torrent.status}]
⏸ Останавливаем загрузку`);
  } catch (e) {
    console.error(e);
    ctx.reply("Ой, ошибочка");
  }
});

bot.action(/remove(.*)/, async (ctx) => {
  try {
    const torrentId = ctx.match[1];
    const torrent = await Controller.getTorrent(torrentId);
    const result = await Controller.removeTorrent(torrentId);

    ctx.editMessageText(`
${torrent.name} 
[${torrent.status}]
❌ Удаляем торрент`);
  } catch (e) {
    console.error(e);
    ctx.reply("Ой, ошибочка");
  }
});

bot.launch();

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
