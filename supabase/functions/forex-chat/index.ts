import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ChatSettings {
  responseStyle: "concise" | "detailed" | "technical";
  enableMarketData: boolean;
  enableFunctionCalls: boolean;
  customInstructions: string;
  fxDisplayMode: "card" | "json";
  assetClass: "forex" | "commodities";
  geminiApiKey?: string;
}

interface MarketData {
  rates: Record<string, number>;
  timestamp: string;
  pairs: Array<{
    pair: string;
    spotRate: number;
    bid: number;
    ask: number;
  }>;
}

interface AppCommodityContext {
  spotPrices?: Record<string, number>;
  volatilities?: Record<string, number>;
  lastUpdated?: string;
  exposuresSummary?: Array<{ commodity: string; quantity: number; type: string; value: number; maturity?: string }>;
}

interface PerplexitySearchResult {
  content: string;
  citations: string[];
}

interface FXExtractionData {
  amount: number | null;
  currency: string | null;
  direction: "receive" | "pay" | null;
  maturity: string | null;
  baseCurrency: string | null;
  currentRate: number | null;
  Barriere: number | null;
  hedgeDirection: "upside" | "downside" | null;
}

const RESPONSE_STYLE_INSTRUCTIONS = {
  concise: `## Style de Réponse: CONCIS
- Réponds de manière brève et directe (2-3 phrases max par point)
- Évite les détails superflus et les longues explications
- Va droit au but avec des recommandations claires
- Utilise des listes à puces courtes`,
  detailed: `## Style de Réponse: DÉTAILLÉ
- Fournis des explications complètes avec contexte
- Inclus des exemples concrets et des calculs
- Explique le raisonnement derrière chaque recommandation
- Compare les alternatives quand c'est pertinent`,
  technical: `## Style de Réponse: TECHNIQUE
- Utilise le jargon financier professionnel (Greeks, basis points, etc.)
- Inclus des formules et des calculs précis
- Référence les normes (ISDA, IFRS 9, etc.)
- Suppose que l'utilisateur a une expertise avancée`,
};

const FUNCTION_CALL_INSTRUCTIONS = `
## Capacités de Calcul
Tu peux effectuer des calculs et analyses:
- Pricing de forwards et options (Black-Scholes, Garman-Kohlhagen)
- Calcul des Greeks (Delta, Gamma, Vega, Theta)
- Valorisation de positions de hedging
- Analyse de scénarios et stress tests
- Calcul de VaR et sensibilités`;

function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

const FX_EXTRACTION_INSTRUCTIONS = `
## MODE EXTRACTION DE DONNÉES FX
**DATE DU JOUR: ${getTodayDate()}** - Utilise cette date pour calculer le time to maturity.
IMPORTANT: Quand l'utilisateur exprime une demande de couverture de change (hedging), tu dois:
1. ANALYSER son message et extraire les informations suivantes:
### Champs OBLIGATOIRES:
- amount (number): montant numérique sans devise (ex: 1000000 pour "1M")
- currency (string): devise du flux (USD, EUR, GBP, CHF, JPY, CAD, AUD, etc.)
- direction (string): "receive" (je reçois) ou "pay" (je paie)
- maturity (number): TOUJOURS en format ANNUALISÉ décimal (ex: 0.5 pour 6 mois, 0.25 pour 3 mois)
- baseCurrency (string): devise de référence du client (EUR, USD, etc.)
### Champs OPTIONNELS:
- currentRate (number|null): taux de change currency/baseCurrency - TU DOIS LE CHERCHER via les données de marché
- Barriere (number|null): niveau de protection souhaité
- hedgeDirection (string|null): "upside" (hausse) ou "downside" (baisse)
2. RÈGLES DE CONVERSION: Montants "1M"→1000000, "500K"→500000. Devises: dollar→USD, euro→EUR, etc.
3. SI UN CHAMP OBLIGATOIRE MANQUE: Tu DOIS demander à l'utilisateur (question avec "?").
4. POUR currentRate: Utilise les données de marché fournies.
5. QUAND TOUTES LES DONNÉES SONT COMPLÈTES: Génère à la fin FX_DATA:{"amount":...,"currency":...,"direction":...,"maturity":...,"baseCurrency":...,"currentRate":...,"Barriere":null,"hedgeDirection":...}
`;

const COMMODITIES_SYSTEM_PROMPT = `Tu es le Hedge Assistant de la plateforme Commodity Risk Manager, expert en Risk Management FX et MATIÈRES PREMIÈRES (Commodities). Tu aides les utilisateurs à comprendre et gérer leurs risques (change et commodities). Stratégies: forwards, futures, swaps, options. Analyse: exposition prix, risque de base. Marchés: LME, NYMEX/ICE, CBOT/CME.`;

const COMMODITIES_EXTRACTION_INSTRUCTIONS = `
## MODE EXTRACTION DE DONNÉES COMMODITIES
**DATE DU JOUR: ${getTodayDate()}** - Utilise cette date pour le time to maturity.
Champs OBLIGATOIRES: amount, currency (OIL, GAS, GOLD, etc.), direction, maturity, baseCurrency.
Format de sortie: FX_DATA:{"amount":...,"currency":...,"direction":...,"maturity":...,"baseCurrency":...,"currentRate":...,"Barriere":null,"hedgeDirection":...}
`;

async function fetchMarketData(): Promise<MarketData | null> {
  try {
    const response = await fetch("https://api.exchangerate-api.com/v4/latest/USD");
    if (!response.ok) return null;
    const data = await response.json();
    const rates = data.rates;
    const pairs = [
      { pair: "EUR/USD", spotRate: parseFloat((1 / rates.EUR).toFixed(4)), bid: parseFloat((1 / rates.EUR - 0.0001).toFixed(4)), ask: parseFloat((1 / rates.EUR + 0.0001).toFixed(4)) },
      { pair: "GBP/USD", spotRate: parseFloat((1 / rates.GBP).toFixed(4)), bid: parseFloat((1 / rates.GBP - 0.0001).toFixed(4)), ask: parseFloat((1 / rates.GBP + 0.0001).toFixed(4)) },
      { pair: "USD/JPY", spotRate: parseFloat(rates.JPY.toFixed(2)), bid: parseFloat((rates.JPY - 0.01).toFixed(2)), ask: parseFloat((rates.JPY + 0.01).toFixed(2)) },
      { pair: "USD/CHF", spotRate: parseFloat(rates.CHF.toFixed(4)), bid: parseFloat((rates.CHF - 0.0001).toFixed(4)), ask: parseFloat((rates.CHF + 0.0001).toFixed(4)) },
      { pair: "EUR/GBP", spotRate: parseFloat((rates.GBP / rates.EUR).toFixed(4)), bid: parseFloat((rates.GBP / rates.EUR - 0.0001).toFixed(4)), ask: parseFloat((rates.GBP / rates.EUR + 0.0001).toFixed(4)) },
      { pair: "AUD/USD", spotRate: parseFloat((1 / rates.AUD).toFixed(4)), bid: parseFloat((1 / rates.AUD - 0.0001).toFixed(4)), ask: parseFloat((1 / rates.AUD + 0.0001).toFixed(4)) },
      { pair: "USD/CAD", spotRate: parseFloat(rates.CAD.toFixed(4)), bid: parseFloat((rates.CAD - 0.0001).toFixed(4)), ask: parseFloat((rates.CAD + 0.0001).toFixed(4)) },
      { pair: "NZD/USD", spotRate: parseFloat((1 / rates.NZD).toFixed(4)), bid: parseFloat((1 / rates.NZD - 0.0001).toFixed(4)), ask: parseFloat((1 / rates.NZD + 0.0001).toFixed(4)) },
    ];
    return { rates, timestamp: new Date().toISOString(), pairs };
  } catch (error) {
    console.error("Error fetching market data:", error);
    return null;
  }
}

async function searchMarketData(query: string): Promise<PerplexitySearchResult | null> {
  const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
  if (!PERPLEXITY_API_KEY) return null;
  try {
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${PERPLEXITY_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "sonar",
        messages: [{ role: "system", content: "You are a financial market data expert. Provide precise, current market data. Be concise and factual." }, { role: "user", content: query }],
        search_recency_filter: "day",
      }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return { content: data.choices?.[0]?.message?.content || "", citations: data.citations || [] };
  } catch (error) {
    console.error("Error calling Perplexity API:", error);
    return null;
  }
}

function buildMarketDataContext(marketData: MarketData, perplexityData: PerplexitySearchResult | null): string {
  const pairsInfo = marketData.pairs.map((p) => `- ${p.pair}: Spot ${p.spotRate} (Bid: ${p.bid} / Ask: ${p.ask})`).join("\n");
  const crossRates: string[] = [];
  const currencies = Object.keys(marketData.rates);
  for (const curr of currencies) {
    if (curr === "USD") continue;
    crossRates.push(`- ${curr}/USD: ${(1 / marketData.rates[curr]).toFixed(6)}`);
    crossRates.push(`- USD/${curr}: ${marketData.rates[curr].toFixed(6)}`);
  }
  const majors = ["EUR", "GBP", "JPY", "CHF", "CAD", "AUD", "NZD"];
  for (const curr1 of majors) {
    for (const curr2 of majors) {
      if (curr1 !== curr2 && marketData.rates[curr1] && marketData.rates[curr2]) {
        crossRates.push(`- ${curr1}/${curr2}: ${(marketData.rates[curr2] / marketData.rates[curr1]).toFixed(6)}`);
      }
    }
  }
  let additionalMarketInfo = "";
  if (perplexityData?.content) {
    additionalMarketInfo = `\n## DONNÉES ENRICHIES\n${perplexityData.content}\nSources: ${perplexityData.citations.slice(0, 3).join(", ")}`;
  }
  return `
## DONNÉES DE MARCHÉ EN TEMPS RÉEL
Dernière mise à jour: ${marketData.timestamp}
**DATE DU JOUR: ${getTodayDate()}**
### Taux Spot Principaux:\n${pairsInfo}
### Taux disponibles:\n${crossRates.slice(0, 50).join("\n")}
### Taux bruts (base USD): EUR: ${marketData.rates.EUR}, GBP: ${marketData.rates.GBP}, JPY: ${marketData.rates.JPY}, CHF: ${marketData.rates.CHF}, CAD: ${marketData.rates.CAD}, AUD: ${marketData.rates.AUD}, NZD: ${marketData.rates.NZD}
${additionalMarketInfo}
IMPORTANT: Utilise UNIQUEMENT ces données pour les taux. Pour currency/baseCurrency: divise taux baseCurrency par taux currency.`;
}

function buildAppCommodityContextSection(ctx: AppCommodityContext | null | undefined): string {
  if (!ctx || (!ctx.spotPrices && !ctx.exposuresSummary?.length)) return "";
  const parts: string[] = ["\n## Données matières premières de l'application"];
  if (ctx.lastUpdated) parts.push(`Dernière mise à jour: ${ctx.lastUpdated}`);
  if (ctx.spotPrices && Object.keys(ctx.spotPrices).length > 0) {
    parts.push("Prix spot:", Object.entries(ctx.spotPrices).map(([k, v]) => `${k}: ${v}`).join(", "));
  }
  if (ctx.volatilities && Object.keys(ctx.volatilities).length > 0) {
    parts.push("Volatilités:", Object.entries(ctx.volatilities).map(([k, v]) => `${k}: ${v}`).join(", "));
  }
  if (ctx.exposuresSummary?.length) {
    parts.push("Expositions:", ctx.exposuresSummary.map((e) => `${e.commodity} ${e.quantity} ${e.type} valeur ${e.value}${e.maturity ? ` échéance ${e.maturity}` : ""}`).join("; "));
  }
  return parts.join("\n");
}

function buildSystemPrompt(settings: ChatSettings, marketDataContext: string | null, appCommodityContext?: AppCommodityContext | null): string {
  const isForex = settings.assetClass === "forex";
  const identity = "Tu es le Hedge Assistant de la plateforme Commodity Risk Manager.";
  let prompt = isForex
    ? `${identity} Expert en hedging FOREX. Stratégies: forwards, options, swaps. Analyse des risques de change. Réglementation IFRS 9.\n${RESPONSE_STYLE_INSTRUCTIONS[settings.responseStyle]}`
    : `${COMMODITIES_SYSTEM_PROMPT}\n${RESPONSE_STYLE_INSTRUCTIONS[settings.responseStyle]}`;
  prompt += isForex ? FX_EXTRACTION_INSTRUCTIONS : COMMODITIES_EXTRACTION_INSTRUCTIONS;
  if (settings.enableMarketData && marketDataContext) prompt += marketDataContext;
  const appCommoSection = buildAppCommodityContextSection(appCommodityContext);
  if (appCommoSection) prompt += appCommoSection;
  if (settings.enableFunctionCalls) prompt += FUNCTION_CALL_INSTRUCTIONS;
  if (settings.customInstructions?.trim()) prompt += `\n## Instructions Personnalisées\n${settings.customInstructions.trim()}`;
  prompt += `\n## Limites\n- Tu ne peux pas exécuter de trades. Utilise UNIQUEMENT les données fournies pour les taux/prix.`;
  return prompt;
}

const GEMINI_MODEL = "gemini-2.5-flash";

function convertToGeminiContents(messages: Array<{ role: string; content: string }>) {
  return messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
}

function streamGeminiToOpenAIFormat(
  geminiStream: ReadableStream<Uint8Array>,
  encoder: TextEncoder
): ReadableStream<Uint8Array> {
  const reader = geminiStream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          if (buffer.trim()) {
            const line = buffer.split("\n").find((l) => l.startsWith("data: "));
            if (line) {
              try {
                const data = JSON.parse(line.slice(6).trim());
                const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`));
              } catch (_) {}
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
          return;
        }
        buffer += decoder.decode(value, { stream: true });
        while (buffer.includes("\n\n")) {
          const idx = buffer.indexOf("\n\n");
          const event = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          const line = event.split("\n").find((l) => l.startsWith("data: "));
          if (line) {
            try {
              const data = JSON.parse(line.slice(6).trim());
              const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`));
            } catch (_) {}
          }
        }
      }
    },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { messages, settings, appCommodityContext } = await req.json();
    const userGeminiKey = settings?.geminiApiKey?.trim();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    const chatSettings: ChatSettings = {
      responseStyle: settings?.responseStyle || "concise",
      enableMarketData: settings?.enableMarketData ?? true,
      enableFunctionCalls: settings?.enableFunctionCalls ?? true,
      customInstructions: settings?.customInstructions || "",
      fxDisplayMode: settings?.fxDisplayMode || "card",
      assetClass: settings?.assetClass || "forex",
      geminiApiKey: userGeminiKey,
    };

    let marketDataContext: string | null = null;
    if (chatSettings.enableMarketData) {
      const marketData = await fetchMarketData();
      const lastUserMessage = messages.filter((m: { role: string }) => m.role === "user").pop()?.content || "";
      let perplexityData: PerplexitySearchResult | null = null;
      const needsMarketSearch = /forward|volatil|option|swap/i.test(lastUserMessage) ||
        /pétrole|gaz|or|commodit|matière première|WTI|Brent|crude|oil|gold|metal/i.test(lastUserMessage);
      if (needsMarketSearch) {
        const query = chatSettings.assetClass === "commodities"
          ? `Current commodities and FX market data: ${lastUserMessage.slice(0, 200)}`
          : `Current FX market data for ${lastUserMessage.slice(0, 200)}`;
        perplexityData = await searchMarketData(query);
      }
      if (marketData) marketDataContext = buildMarketDataContext(marketData, perplexityData);
    }
    const systemPrompt = buildSystemPrompt(chatSettings, marketDataContext, appCommodityContext);

    if (userGeminiKey) {
      const contents = convertToGeminiContents(messages);
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse`,
        {
          method: "POST",
          headers: {
            "x-goog-api-key": userGeminiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents,
            systemInstruction: { parts: [{ text: systemPrompt }] },
            generationConfig: { temperature: 0.7, maxOutputTokens: 8192 },
          }),
        }
      );
      if (!res.ok) {
        const errText = await res.text();
        console.error("Gemini API error:", res.status, errText);
        return new Response(
          JSON.stringify({ error: "Erreur API Gemini. Vérifiez votre clé API." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (!res.body) {
        return new Response(JSON.stringify({ error: "Pas de réponse du modèle." }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const openAIStream = streamGeminiToOpenAIFormat(res.body, new TextEncoder());
      return new Response(openAIStream, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured. Ajoutez une clé API Gemini dans l'onglet API des paramètres.");
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
      }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      if (response.status === 429) return new Response(JSON.stringify({ error: "Trop de requêtes. Veuillez réessayer." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "Crédits épuisés." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "Erreur du service IA." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    return new Response(response.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erreur inconnue" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
