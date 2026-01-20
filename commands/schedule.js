const { SlashCommandBuilder } = require('discord.js');
const scheduler = require('../scheduler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('schedule')
        .setDescription('Schedules a message to be sent to a channel.')
        .addStringOption(option =>
            option.setName('message')
                .setDescription('The message to send')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('time')
                .setDescription('Cron expression (e.g. "* * * * *" for every minute)')
                .setRequired(true))
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel to send the message to')
                .setRequired(false)),
    async execute(interaction) {
        const message = interaction.options.getString('message');
        const time = interaction.options.getString('time');
        const channel = interaction.options.getChannel('channel') || interaction.channel;

        try {
            const id = scheduler.scheduleMessage(
                interaction.client,
                interaction.guildId,
                channel.id,
                time,
                message
            );
            await interaction.reply({ content: `Scheduled message "${message}" to ${channel} with schedule \`${time}\`. ID: ${id}`, ephemeral: true });
        } catch (error) {
            await interaction.reply({ content: `Failed to schedule: ${error.message}. Make sure your cron expression is valid.`, ephemeral: true });
        }
    },
};
