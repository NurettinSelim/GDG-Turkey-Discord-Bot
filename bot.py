import asyncio
import difflib
import json
import os

import discord
from discord.ext import commands
from discord.utils import get

bot = commands.Bot(command_prefix="$")
token = os.getenv("GDGBotToken")

REGISTER_CHANNELS = [788060931941728257, 799342278221103154]

# read gdg list
f = open('gdg_list.json', "r", encoding="utf8")
gdg_list = json.loads(f.read())
f.close()


@bot.event
async def on_ready():
    await bot.change_presence(status=discord.Status.online, activity=discord.Game("github.com/nurettinselim"))
    print("I am online")


@bot.event
async def on_message(message):
    if message.author != bot.user:
        print(message)
        await bot.process_commands(message)

        channel = message.channel

        if channel.id in REGISTER_CHANNELS:

            similar_words = difflib.get_close_matches(message.content, gdg_list, 1)

            if len(similar_words) == 0:
                error_message = f"Maalesef '{message.content}' ile eşleşen bir GDG bulunamadı."
                await channel.send(error_message, delete_after=30)
                await message.delete()
                return

            confirm_message_text = f"{message.author.mention} Mesajınla eşleşen '{similar_words[0]}' bulundu.\nOnaylıyorsan 15 saniye içerisinde 👍 tepkisini verebilirsin"
            confirm_message = await channel.send(confirm_message_text, delete_after=15)

            await confirm_message.add_reaction("\N{THUMBS UP SIGN}")

            def check(reaction, user):
                return user == message.author and str(reaction.emoji) == '👍'

            try:
                await bot.wait_for('reaction_add', timeout=15.0, check=check)
            except asyncio.TimeoutError:
                await channel.send('Zaman aşımına uğradı', delete_after=15)
            else:
                role = get(message.author.guild.roles, name=similar_words[0])
                await message.author.add_roles(role)
                await confirm_message.delete()
                await channel.send(f'{message.author.mention} rol alma başarılı! Sunucuya hoşgeldin :)',
                                   delete_after=15)

            await message.delete()


@bot.command()
async def ping(ctx):
    await ctx.send(f"🏓 Pong with {str(round(bot.latency, 5))}")


bot.run(token)
