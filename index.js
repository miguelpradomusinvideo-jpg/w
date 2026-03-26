const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags } = require('discord.js');
const speakeasy = require('speakeasy');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.once('ready', () => {
    console.log(`🎮 Rockstar 2FA Generator - Online`);
    console.log(`👑 Criado por Miguel®`);
    client.user.setActivity('🎮 Gerador 2FA', { type: 'PLAYING' });
});

// Registrar slash commands
client.on('ready', async () => {
    try {
        await client.application.commands.set([
            {
                name: 'start',
                description: 'Abrir o gerador 2FA',
                options: []
            }
        ]);
        console.log('✅ Comando /start registrado!');
    } catch (error) {
        console.error('Erro ao registrar comando:', error);
    }
});

// Slash Command: /start
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;
    
    if (interaction.commandName === 'start') {
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('🎮 ROCKSTAR 2FA APP')
            .setDescription('**Como usar o gerador 2FA**\n\n1. Clique no botão "Gerar Código 2FA" abaixo\n2. Insira sua chave\n3. Receba seu código de autenticação temporário')
            .setFooter({ text: 'Gg Community © Criado por Miguel®' });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('gerar_2fa')
                    .setLabel('🔐 Gerar Código 2FA')
                    .setStyle(ButtonStyle.Success)
            );

        // Usando flags em vez de ephemeral
        await interaction.reply({ embeds: [embed], components: [row], flags: MessageFlags.Ephemeral });
    }
});

// Interações com botões e modais
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton() && !interaction.isModalSubmit()) return;

    try {
        if (interaction.isButton() && interaction.customId === 'gerar_2fa') {
            const modal = new ModalBuilder()
                .setCustomId(`modal_2fa_${interaction.user.id}`)
                .setTitle('🔐 Insira sua Chave 2FA');

            const input = new TextInputBuilder()
                .setCustomId('chave')
                .setLabel('Digite Sua Chave 2FA')
                .setPlaceholder('Exemplo: JBSWY3DPEHPK3PXP')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMinLength(16)
                .setMaxLength(32);

            const row = new ActionRowBuilder().addComponents(input);
            modal.addComponents(row);
            await interaction.showModal(modal);
        }

        if (interaction.isModalSubmit() && interaction.customId.startsWith('modal_2fa_')) {
            const chave = interaction.fields.getTextInputValue('chave').toUpperCase().trim();
            
            let codigo;
            try {
                codigo = speakeasy.totp({
                    secret: chave,
                    encoding: 'base32',
                    step: 30,
                    digits: 6
                });
            } catch (error) {
                return interaction.reply({ 
                    content: '❌ Chave 2FA inválida! Use uma chave válida no formato Base32.\nExemplo: `JBSWY3DPEHPK3PXP`', 
                    flags: MessageFlags.Ephemeral
                });
            }
            
            if (!codigo || codigo.length !== 6) {
                return interaction.reply({ 
                    content: '❌ Chave 2FA inválida! Verifique e tente novamente.', 
                    flags: MessageFlags.Ephemeral
                });
            }
            
            const now = Math.floor(Date.now() / 1000);
            const tempoRestante = 30 - (now % 30);
            
            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('🎮 ROCKSTAR 2FA - Código Gerado')
                .setDescription(`\`\`\`\n${codigo}\n\`\`\``)
                .addFields(
                    { name: '⏱️ Expira em', value: `${tempoRestante} segundos`, inline: true },
                    { name: '🎮 Plataforma', value: 'Rockstar Games', inline: true }
                )
                .setFooter({ text: 'Gg Community © Criado por Miguel®' });
            
            await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }
        
    } catch (error) {
        console.error('Erro:', error);
        await interaction.reply({ 
            content: '❌ Ocorreu um erro. Tente novamente.', 
            flags: MessageFlags.Ephemeral
        });
    }
});

client.login(process.env.DISCORD_TOKEN);
