import { Client, Intents, TextChannel, CollectorFilter, Message } from 'discord.js';
import { TOKEN, CHANNEL_NAME } from './config';
import GDG_List from './gdg_list.json'
import { findBestMatch } from "string-similarity";

const myIntents = new Intents();
myIntents.add(Intents.ALL);

const client = new Client({
    presence: {
        status: 'online',
        activity: { name: 'github.com/NurettinSelim', type: 'WATCHING' },
    },
    ws: { intents: myIntents }
});

const invites = {};

const wait = require('util').promisify(setTimeout);

client.on('ready', async () => {
    console.log('\x1b[36m%s\x1b[0m', `Logged in as ${client.user.tag}!`);

    await wait(1000);

    client.guilds.cache.forEach(g => {
        g.fetchInvites().then(guildInvites => {
            invites[g.id] = guildInvites;
        });
    });
});

client.on('message', async (msg: Message) => {
    if (msg.author.bot) return;

    if (msg.content === 'ping') {
        msg.reply(`🏓 Pong!`);
    }

    if ((msg.channel as TextChannel).name == CHANNEL_NAME) {
        const bestMatch = findBestMatch(msg.content, GDG_List).bestMatch.target;
        const confirmMessage = await msg.reply(`Mesajınla eşleşen **${bestMatch}** bulundu.\nOnaylıyorsan 15 saniye içerisinde 👍 tepkisini verebilirsin`)
        setTimeout(() => {
            try {
                confirmMessage.delete()
                msg.delete()
            } catch (error) { }
        }, 10000)
        await confirmMessage.react("👍")
        const filter: CollectorFilter = (reaction, user) => user.id == msg.author.id && reaction.emoji.name == '👍'

        confirmMessage.awaitReactions(filter, { max: 1, time: 30000 })
            .then(async collected => {
                if (collected.first().emoji.name == '👍') {
                    const communityRole = msg.guild.roles.cache.find(role => role.name === bestMatch);
                    msg.member.roles.add(communityRole)
                    confirmMessage.delete()
                    msg.delete()
                    const succesMessage = await msg.reply("Rol alma başarılı! Sunucuya hoşgeldin :)")
                    setTimeout(() => { succesMessage.delete() }, 10000);

                }
            }).catch(() => {
                msg.reply('Zaman aşımına uğradı.');
            });


    }

});


client.on('guildMemberAdd', member => {
    member.guild.fetchInvites().then(guildInvites => {
        const ei = invites[member.guild.id];

        invites[member.guild.id] = guildInvites;

        const invite = guildInvites.find(i => ei.get(i.code).uses < i.uses);

        const inviter = client.users.cache.get(invite.inviter.id);

        const logChannel = member.guild.channels.cache.find(channel => channel.name === "join-logs") as TextChannel;

        logChannel.send(`${member.user.tag} joined using invite code ${invite.code} from ${inviter.tag}. Invite was used ${invite.uses} times since its creation.`);
    });
});

client.login(TOKEN);