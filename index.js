import { Client, GatewayIntentBits, REST, Routes } from "discord.js";
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

// =========================
//  CONFIG
// =========================

// Webhook REAL de n8n
const WEBHOOK_URL = "https://vicentedannunzio.app.n8n.cloud/webhook/28b92a1b-0e40-4171-94d8-600e9c859361";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// =========================
//   REGISTRAR /gasto
// =========================

const commands = [
  {
    name: "gasto",
    description: "Registrar un gasto en Google Sheets",
    options: [
      {
        name: "data",
        description: "Formato: categoria, descripcion, monto, metodo",
        type: 3,
        required: true,
      },
    ],
  },
];

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
  try {
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log("✔ Comando /gasto registrado correctamente.");
  } catch (err) {
    console.error("❌ Error registrando comando:", err);
  }
})();

// =========================
//  MANEJO DEL COMANDO
// =========================

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "gasto") {
    const texto = interaction.options.getString("data");

    if (!texto.includes(",")) {
      return interaction.reply({
        content: "❌ Formato inválido. Usa: categoria, descripcion, monto, metodo",
        ephemeral: true,
      });
    }

    // ======== GENERAR FECHA SIN HORA =========
    const fechaActual = new Date();
    const fechaFormateada = fechaActual.toLocaleDateString("es-AR"); 
    // Ejemplo: 23/11/2025

    try {
      // Mandar a n8n **con fecha sin hora**
      await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: texto,
          fecha: fechaFormateada
        }),
      });

      await interaction.reply(`✔ Gasto enviado:\n\`${texto}\``);

    } catch (err) {
      console.error("❌ Error enviando a n8n:", err);

      await interaction.reply({
        content: "❌ No se pudo enviar el gasto. ¿Está n8n activo?",
        ephemeral: true,
      });
    }
  }
});

// =========================
//  LOGIN BOT
// =========================

client.login(process.env.TOKEN);
