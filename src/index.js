import "dotenv/config";
import { Client } from "discord.js";
import { IntentsBitField } from "discord.js";
import moment from "moment-timezone";
import {
  formatHoursExt,
  formatMinutesExt,
  formatSecondsExt,
} from "./formatTimeExt.js";
import fastEqual from "fast-deep-equal";
let API_RESPONSE = {};
let MESSAGE_IDS = ["1226246257849143366", "1226246259283595304"];
let COUNTDOWN;

const CLOSE_TIME = new Date(1712433900000);

const client = new Client({
  intents: [IntentsBitField.Flags.Guilds],
});

client.on("ready", async () => {
  console.log("I am ready!");

  check();

  COUNTDOWN = setInterval(async () => {
    // check if we are past the close time
    if (moment().tz("Europe/Bratislava").isAfter(moment(CLOSE_TIME))) {
      clearInterval(COUNTDOWN);

      const channel = client.channels.cache.get("1158021544887451699");
      const message = await channel.messages.fetch("1226246262337044494");

      await message.edit(`Volebné miestnosti sú zatvorené!`);

      return;
    }

    const countdown = moment.duration(
      moment(CLOSE_TIME).diff(moment().tz("Europe/Bratislava"))
    );
    const hours = countdown.hours();
    const minutes = countdown.minutes();
    const seconds = countdown.seconds();

    const channel = client.channels.cache.get("1158021544887451699");
    const message = await channel.messages.fetch("1226246262337044494");

    await message.edit(
      `Do zatvorenia volebných miestností ostáva: **<t:${Math.round(
        CLOSE_TIME.getTime() / 1000
      )}:R>** (${hours} ${formatHoursExt(hours)}, ${minutes} ${formatMinutesExt(
        minutes
      )}, ${seconds} ${formatSecondsExt(seconds)})`
    );
  }, 5_000);
});

function splitArray(array, chunkSize) {
  const result = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    result.push(array.slice(i, i + chunkSize));
  }
  return result;
}

async function check() {
  const OLD_API_RESPONSE = API_RESPONSE;
  await fetchAll();

  if (fastEqual(OLD_API_RESPONSE, API_RESPONSE)) {
    setTimeout(check, 30_000);
    return;
  }

  const channel = client.channels.cache.get("1158021544887451699");

  const data = API_RESPONSE.whole.map((result) => {
    return `${result.title ? `${result.title} ` : ""}**${result.first_name} ${
      result.last_name
    }** - **${result.votes}** (**${result.votes_percentage}%**) hlasov`;
  });

  const chunks = splitArray(data, Math.round(data.length / 2));

  for (let i = 0; i < chunks.length; i++) {
    const message = await channel.messages.fetch(MESSAGE_IDS[i]);
    const chunk = chunks[i];

    await message.edit({
      content: chunk.join("\n"),
      embeds: [],
    });
  }

  const currentDataMessage = await channel.messages.fetch(
    "1226246261150187621"
  );
  const lastChange = moment(Date.now())
    .tz("Europe/Bratislava")
    .format("DD/MM/YYYY HH:mm:ss");

  await currentDataMessage.edit(
    [
      `Volebná účasť: **${API_RESPONSE.data.attendance}%**`,
      `Spočítaných hlasov: **${API_RESPONSE.data.votes_percentage}%**`,
      `Posledná aktualizácia: **${lastChange}**`,
    ].join("\n")
  );

  setTimeout(check, 30_000);
}

async function fetchAll() {
  const response = await fetch("https://spe.xhyrom.dev/2024");
  const body = await response.json();
  API_RESPONSE = body;
}

process.on("uncaughtException", console.log);
process.on("unhandledRejection", console.log);

client.login(process.env.DISCORD_BOT_TOKEN);
