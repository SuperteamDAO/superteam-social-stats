import fetch from "node-fetch";
require("dotenv").config();
const Airtable = require("airtable");

interface GuildInfo {
  approximate_member_count: number;
}

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  "appiQY5Sa4fJ0mGYG"
);
const botToken = process.env.DISCORD_BOT_TOKEN;

const getMemberCount = async (guildId: string): Promise<number | undefined> => {
  const url = `https://discord.com/api/v9/guilds/${guildId}?with_counts=true`;

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bot ${botToken}`,
      },
    });
    const guildInfo: GuildInfo = await res.json();
    return guildInfo.approximate_member_count;
  } catch (error) {
    console.error(`Error fetching member count for Guild ID: ${guildId}`);
    console.error("Error:", error);
    return undefined;
  }
};

const fetchAndUpdateDiscordMembers = async (guildIds: {
  [guildId: string]: string;
}): Promise<void> => {
  for (const guildId in guildIds) {
    const recordId = guildIds[guildId];
    try {
      const memberCount = await getMemberCount(guildId);

      if (memberCount === undefined) {
        console.error(`Member count for Guild ID: ${guildId} is undefined.`);
        continue; // Skip to next iteration if member count is undefined
      }

      base("Countries").update(
        [
          {
            id: recordId,
            fields: {
              Discord: memberCount,
            },
          },
        ],
        function (err, records) {
          if (err) {
            console.error(`Error updating Discord for Guild ID: ${guildId}:`, err);
            return;
          }
          records.forEach(function (record) {
            console.log(`ServerID: ${guildId}, Members: ${record.get("Discord")}`);
          });
        }
      );
    } catch (err) {
      console.error(`Error processing Guild ID: ${guildId}:`, err);
    }
  }
};

const guildIds: { [guildId: string]: string } = {};

base("Countries")
  .select({
    view: "Grid view",
  })
  .eachPage(
    function page(records, fetchNextPage) {
      records.forEach(function (record) {
        const guildId = record.get("ServerID");
        const recordId = record.id;
        if (guildId && recordId) {
          guildIds[guildId] = recordId;
        }
      });

      fetchNextPage();
    },
    function done(err) {
      if (err) {
        console.error(err);
        return;
      }
      fetchAndUpdateDiscordMembers(guildIds);
    }
  );
