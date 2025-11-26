// --- INICIO CÓDIGO PARA RENDER CON AUTO-REPARACIÓN INTELIGENTE ---
import express from 'express';
const app = express();

// Guardamos la hora de inicio para darle tiempo de arrancar
const startTime = Date.now();
let botClient = null;

app.get('/', (req, res) => {
  const uptimeInSeconds = (Date.now() - startTime) / 1000;

  // CASO 1: El bot recién arranca (menos de 2 minutos de vida)
  // Le decimos a UptimeRobot que todo está bien para que no moleste mientras conectamos
  if (botClient && !botClient.isReady() && uptimeInSeconds < 120) {
    return res.status(200).send('⏳ El bot está arrancando... (Paciencia)');
  }

  // CASO 2: Lleva más de 2 minutos y SIGUE desconectado (Error real)
  // Aquí sí reiniciamos porque algo se trabó
  if (botClient && !botClient.isReady()) {
    console.error("🔴 El bot lleva mucho tiempo desconectado. Forzando reinicio...");
    res.status(500).send('Bot trabado. Reiniciando...');
    process.exit(1); // Esto obliga a Render a reiniciar
  }
  
  // CASO 3: Todo perfecto
  res.send('Bot Inversiones y Gastos activo y conectado 🟢');
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Servidor web escuchando en el puerto ${port}`);
});
// --- FIN CÓDIGO PARA RENDER ---

import { 
  Client, 
  GatewayIntentBits, 
  REST, 
  Routes,
  SlashCommandBuilder
} from "discord.js";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

// Asignamos el cliente a la variable global
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});
botClient = client; 

// =====================================================
// URL DE APPS SCRIPT
// =====================================================
const WEBHOOK_URL = "https://script.google.com/macros/s/AKfycby1wPCsg09ZZpQBqknFpRJQgKzt93PaaJuIyIG46o7NlMvYgYiRpGkfSnbw7WUgiGif/exec";

// =====================================================
// DEFINICIÓN DE COMANDOS
// =====================================================
const commands = [
  new SlashCommandBuilder()
    .setName("gasto")
    .setDescription("Registrar un gasto 💸")
    .addStringOption(opt => opt.setName("categoria").setDescription("Categoría").setRequired(true))
    .addStringOption(opt => opt.setName("descripcion").setDescription("Descripción").setRequired(true))
    .addNumberOption(opt => opt.setName("monto").setDescription("Monto").setRequired(true))
    .addStringOption(opt => opt.setName("metodo").setDescription("Método").setRequired(true)),

  new SlashCommandBuilder()
    .setName("inversion")
    .setDescription("Registrar CEDEAR/Acción 📈")
    .addStringOption(opt => opt.setName("ticker").setDescription("Ej: AAPL").setRequired(true))
    .addNumberOption(opt => opt.setName("cantidad").setDescription("Cantidad").setRequired(true))
    .addNumberOption(opt => opt.setName("monto").setDescription("Total invertido").setRequired(true))
].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log("➡ Actualizando comandos...");
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log("✔ Comandos listos.");
  } catch (err) {
    console.error("❌ Error comandos:", err);
  }
})();

// =====================================================
// MANEJO DE ERRORES DE CONEXIÓN
// =====================================================
client.on('shardError', error => {
    console.error('❌ Error de conexión websocket:', error);
});

client.on('shardDisconnect', () => {
    console.error('❌ El bot se desconectó del socket.');
});

// =====================================================
// INTERACCIONES
// =====================================================
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "gasto") {
    await interaction.deferReply();
    const payload = { 
      tipo: "gasto", 
      categoria: interaction.options.getString("categoria"),
      descripcion: interaction.options.getString("descripcion"),
      monto: interaction.options.getNumber("monto"),
      metodo: interaction.options.getString("metodo")
    };
    await enviarAGoogle(interaction, payload);
  }
  else if (interaction.commandName === "inversion") {
    await interaction.deferReply();
    const payload = { 
      tipo: "inversion", 
      ticker: interaction.options.getString("ticker"),
      cantidad: interaction.options.getNumber("cantidad"),
      monto: interaction.options.getNumber("monto")
    };
    await enviarAGoogle(interaction, payload);
  }
});

async function enviarAGoogle(interaction, payload) {
  try {
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    
    if (json.status === "ok") {
      const msg = payload.tipo === "inversion" ? `Inversión: ${payload.ticker}` : "Gasto guardado";
      await interaction.editReply(`✅ ${msg}`);
    } else {
      await interaction.editReply(`❌ Error: ${json.message}`);
    }
  } catch (err) {
    console.error("Error envío:", err);
    await interaction.editReply("⚠️ Error de conexión.");
  }
}

client.login(process.env.TOKEN);