// --- INICIO CÓDIGO PARA RENDER (VERSIÓN CORRECTA) ---
import express from 'express';
const app = express();

app.get('/', (req, res) => {
  res.send('Hola, soy el bot de gastos y estoy vivo.');
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Servidor web escuchando en el puerto ${port}`);
});
// --- FIN CÓDIGO PARA RENDER ---

// Aquí abajo sigue tu código de siempre...

import { 
  Client, 
  GatewayIntentBits, 
  REST, 
  Routes,
  SlashCommandBuilder
} from "discord.js";
import fetch from "node-fetch";
import dotenv from "dotenv";

// =====================================================
// CARGAR .env (PASO 3 + 4 APLICADO)
// =====================================================

dotenv.config();

console.log("===================================");
console.log("TOKEN CARGADO?", process.env.TOKEN ? "SI" : "NO");
console.log("CLIENT_ID CARGADO?", process.env.CLIENT_ID ? "SI" : "NO");
console.log("GUILD_ID CARGADO?", process.env.GUILD_ID ? "SI" : "NO");
console.log("===================================");

// =====================================================
// CONFIG
// =====================================================

// OJO: Asegúrate que esta URL sea la correcta de tu despliegue web de Apps Script
const WEBHOOK_URL = "https://script.google.com/macros/s/AKfycby1wPCsg09ZZpQBqknFpRJQgKzt93PaaJuIyIG46o7NlMvYgYiRpGkfSnbw7WUgiGif/exec";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages
  ],
});

// =====================================================
// REGISTRAR /gasto y /inversion
// =====================================================

const commands = [
  new SlashCommandBuilder()
    .setName("gasto")
    .setDescription("Registrar un gasto en Google Sheets")
    .addStringOption(opt =>
      opt.setName("categoria")
        .setDescription("Categoría del gasto")
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName("descripcion")
        .setDescription("Descripción del gasto")
        .setRequired(true)
    )
    .addNumberOption(opt =>
      opt.setName("monto")
        .setDescription("Monto del gasto")
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName("metodo")
        .setDescription("Método de pago")
        .setRequired(true)
    )
    .toJSON(),
  new SlashCommandBuilder()
    .setName("inversion")
    .setDescription("Registrar una inversión en Google Sheets")
    .addStringOption(opt =>
      opt.setName("ticker")
        .setDescription("Ticker de la inversión")
        .setRequired(true)
    )
    .addNumberOption(opt =>
      opt.setName("cantidad")
        .setDescription("Cantidad de acciones/unidades")
        .setRequired(true)
    )
    .addNumberOption(opt =>
      opt.setName("monto")
        .setDescription("Monto total de la inversión")
        .setRequired(true)
    )
    .toJSON()
];

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log("➡ Registrando comandos /gasto y /inversion…");
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log("✔ Comandos registrados correctamente.");
  } catch (err) {
    console.error("❌ Error registrando comandos:", err);
  }
})();

// =====================================================
// MANEJO DEL COMANDO
// =====================================================

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "gasto") {
    
    const categoria = interaction.options.getString("categoria");
    const descripcion = interaction.options.getString("descripcion");
    const monto = interaction.options.getNumber("monto");
    const metodo = interaction.options.getString("metodo");

    await interaction.reply("⏳ Registrando gasto...");

    const payload = { categoria, descripcion, monto, metodo };

    console.log("➡ Enviando a Apps Script:", payload);

    try {
      const res = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      console.log("➡ Respuesta Apps Script:", json);

      if (json.status === "ok") {
        await interaction.editReply("✅ Gasto registrado correctamente en Google Sheets");
      } else {
        await interaction.editReply("❌ Error al registrar en Apps Script");
      }

    } catch (err) {
      console.error("❌ ERROR DE CONEXIÓN:", err);
      await interaction.editReply("⚠️ Error de conexión con Apps Script");
    }
  } 
  else if (interaction.commandName === "inversion") {
    
    const ticker = interaction.options.getString("ticker");
    const cantidad = interaction.options.getNumber("cantidad");
    const monto = interaction.options.getNumber("monto");

    await interaction.reply("⏳ Registrando inversión...");

    const payload = { tipo: "inversion", ticker, cantidad, monto };

    console.log("➡ Enviando inversión a Apps Script:", payload);

    try {
      const res = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      console.log("➡ Respuesta Apps Script:", json);

      if (json.status === "ok") {
        await interaction.editReply("✅ Inversión registrada correctamente en Google Sheets");
      } else {
        await interaction.editReply("❌ Error al registrar inversión en Apps Script");
      }

    } catch (err) {
      console.error("❌ ERROR DE CONEXIÓN:", err);
      await interaction.editReply("⚠️ Error de conexión con Apps Script");
    }
  }
});

// =====================================================
// LOGIN BOT
// =====================================================

client.login(process.env.TOKEN);