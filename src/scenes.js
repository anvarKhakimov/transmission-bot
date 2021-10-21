const { Scenes, Markup } = require('telegraf');
const Controller = require('./controller.js');

class SceneGenerator {
  GenAddTorrentScene() {
    const newTorrent = new Scenes.BaseScene('addTorrent');
    newTorrent.enter(async (ctx) => {
      await ctx.reply('Укажите magnet-ссылку на новый торрент');
    });

    newTorrent.on('text', async (ctx) => {
      const url = ctx.message.text;

      try {
        var torrent = await Controller.addTorrent(url);
        ctx.reply(`
⏳ Начинаем загрузку
[/torrent${torrent.id}]`);

        // подписываемся на статус SEED
        Controller.subscribeTorrentDone(ctx, torrent.id, 6);

        await ctx.scene.leave();
      } catch (e) {
        ctx.reply('Ошибочка');
        await ctx.scene.leave();
      }
    });

    newTorrent.on('message', async (ctx) => ctx.reply('Это не ссылка'));

    return newTorrent;
  }
}
module.exports = SceneGenerator;
