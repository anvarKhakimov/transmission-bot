require('dotenv').config();
const Transmission = require('transmission-promise');

var transmission = new Transmission({
  port: process.env.PORT,
  host: process.env.HOST,
  username: process.env.USERNAME,
  password: process.env.PASSWORD,
});

async function getTorrent(id) {
  const torrent = await transmission.get(parseInt(id));

  if (torrent.torrents.length > 0) {
    const result = {
      id: torrent.torrents[0].id,
      name: torrent.torrents[0].name,
      status: getStatusType(torrent.torrents[0].status),
      statusId: torrent.torrents[0].status,
      size: formatBytes(torrent.torrents[0].totalSize),
      percentDone: torrent.torrents[0].percentDone * 100,
      addedDate: formatDate(torrent.torrents[0].addedDate),
    };
    return result;
  } else {
    return false;
  }
}

async function addTorrent(url) {
  const torrent = transmission.addUrl(url);
  return torrent;
}

async function getAllTorrents() {
  const allTorrents = await transmission.all();
  const result = [];
  if (allTorrents.torrents.length > 0) {
    for (let i = 0; i < allTorrents.torrents.length; i++) {
      result.push({
        id: allTorrents.torrents[i].id,
        name: allTorrents.torrents[i].name,
        status: allTorrents.torrents[i].status,
        size: formatBytes(allTorrents.torrents[i].totalSize),
        percentDone: allTorrents.torrents[i].percentDone * 100,
        addedDate: formatDate(allTorrents.torrents[i].addedDate),
        addedDateMs: allTorrents.torrents[i].addedDate * 1000,
      });
      result[i].status = getStatusType(allTorrents.torrents[i].status);
    }
  }
  return result;
}

async function startTorrent(id) {
  const result = await transmission.start(parseInt(id));
  return result;
}

async function stopTorrent(id) {
  const result = await transmission.stop(parseInt(id));
  return result;
}

async function removeTorrent(id) {
  const result = await transmission.remove(parseInt(id), true);
  return result;
}

async function getActiveTorrents() {
  const allTorrents = await transmission.active();
  const result = [];
  if (allTorrents.torrents.length > 0) {
    for (let i = 0; i < allTorrents.torrents.length; i++) {
      result.push({
        id: allTorrents.torrents[i].id,
        name: allTorrents.torrents[i].name,
        status: allTorrents.torrents[i].status,
        size: formatBytes(allTorrents.torrents[i].totalSize),
        percentDone: allTorrents.torrents[i].percentDone * 100,
        addedDate: formatDate(allTorrents.torrents[i].addedDate),
        addedDateMs: allTorrents.torrents[i].addedDate * 1000,
      });
      result[i].status = getStatusType(allTorrents.torrents[i].status);
    }
  }

  const arr = result;
  const sortByDate = (arr) => {
    const sorter = (b, a) => {
      return a.addedDateMs - b.addedDateMs;
    };
    arr.sort(sorter);
  };

  return result;
}

async function waitForState(id, targetState) {
  const result = await transmission.waitForState(parseInt(id), targetState);
  return result;
}

async function subscribeTorrentDone(ctx, id) {
  const torrent = await waitForState(id, 'SEED');

  if (torrent.status == 6) {
    ctx.telegram.sendMessage(
      80938478,
      `🎉 Загрузка завершена
${torrent.name}
[/torrent${torrent.id}]`
    );
  } else {
    ctx.telegram.sendMessage(
      80938478,
      `🤬 С ожиданием статуса что-то пошло не так
    ${torrent}`
    );
  }
}

// Get torrent state
function getStatusType(type) {
  return transmission.statusArray[type];
  if (type === 0) {
    return 'STOPPED';
  } else if (type === 1) {
    return 'CHECK_WAIT';
  } else if (type === 2) {
    return 'CHECK';
  } else if (type === 3) {
    return 'DOWNLOAD_WAIT';
  } else if (type === 4) {
    return 'DOWNLOAD';
  } else if (type === 5) {
    return 'SEED_WAIT';
  } else if (type === 6) {
    return 'SEED';
  } else if (type === 7) {
    return 'ISOLATED';
  }
}

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function formatDate(timestamp) {
  var date = new Date(timestamp * 1000);
  var format = date.getDate() + '/' + (date.getMonth() + 1) + '/' + date.getFullYear();
  return format;
}

function timeLeftUntilDone(timestamp) {
  // TODO
}

module.exports = {
  getTorrent: getTorrent,
  addTorrent: addTorrent,
  getAllTorrents: getAllTorrents,
  startTorrent: startTorrent,
  stopTorrent: stopTorrent,
  removeTorrent: removeTorrent,
  getActiveTorrents: getActiveTorrents,
  waitForState: waitForState,
  subscribeTorrentDone: subscribeTorrentDone,
};
