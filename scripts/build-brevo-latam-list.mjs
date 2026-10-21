/**
 * Build a Latin America-only Brevo-ready contact CSV for CommoHedge.
 * Sources: public IR / RI mailboxes + existing curated LatAm rows.
 * Run: node scripts/build-brevo-latam-list.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "output/commohedge-brevo-latam-pret.csv");
const EXISTING = resolve(__dirname, "output/commohedge-brevo-100-pret.csv");

const LATAM = new Set([
  "Brazil",
  "Mexico",
  "Argentina",
  "Chile",
  "Colombia",
  "Peru",
  "Uruguay",
  "Paraguay",
  "Ecuador",
  "Bolivia",
  "Venezuela",
  "Panama",
  "Costa Rica",
  "Guatemala",
  "Honduras",
  "Nicaragua",
  "El Salvador",
  "Dominican Republic",
  "Cuba",
]);

function isLatAmCountry(c) {
  if (!c) return false;
  const s = String(c);
  for (const x of LATAM) {
    if (s === x || s.startsWith(x + " ") || s.startsWith(x + "/") || s.includes(x)) {
      // exclude "USA / Global" style that only mentions LatAm in notes
      if (/USA|United Kingdom|France|Germany|Switzerland|Norway|Singapore|Australia|Canada|India|China|Luxembourg|Austria|EU\b/i.test(s) && !/Brazil|Mexico|Argentina|Chile|Colombia|Peru/i.test(s)) {
        return false;
      }
      return /Brazil|Mexico|Argentina|Chile|Colombia|Peru|Uruguay|Paraguay|Ecuador|Bolivia|Venezuela|Panama|Costa Rica|Guatemala|Honduras|Nicaragua|El Salvador|Dominican/i.test(s);
    }
  }
  return false;
}

const HEADER =
  "EMAIL,FIRSTNAME,LASTNAME,COMPANY,JOB_TITLE,COUNTRY,SECTOR,PRIORITY,LANGUAGE,NOTES";

/** Extra curated public IR / RI contacts (LatAm only). Deduped by email. */
const EXTRA = [
  // Mexico
  ["ir@gruma.com", "IR", "Team", "GRUMA", "Investor Relations", "Mexico", "Agri-food / flour / corn", "P1", "ES", "Corn / flour buyer-seller complex — hedge fit."],
  ["investor@femsa.com.mx", "IR", "Team", "FEMSA", "Investor Relations", "Mexico", "Beverages / retail", "P1", "ES", "Soft commodities & FX exposure via LatAm ops."],
  ["ir@cemex.com", "IR", "Team", "Cemex", "Investor Relations", "Mexico", "Cement / materials", "P1", "ES", "Energy & materials cost risk."],
  ["marlene.finny@gmexico.mx", "Marlene", "Finny", "Grupo Mexico", "IR Director", "Mexico", "Mining / metals", "P1", "ES", "Copper & metals price risk."],
  ["ir@arcacontal.com", "IR", "Team", "Arca Continental", "Investor Relations", "Mexico", "Beverages / snacks", "P1", "ES", "Agri input & sugar cost exposure."],
  ["ri@alfacorp.com", "IR", "Team", "ALFA", "Investor Relations", "Mexico", "Industrial conglomerate", "P2", "ES", "Ask intro to commodity / treasury risk."],
  ["inversionistas@gmexico.com", "IR", "Team", "Grupo Mexico", "Investor Relations mailbox", "Mexico", "Mining / metals", "P2", "ES", "Alternate IR channel — metals risk."],
  ["ir@walmex.mx", "IR", "Team", "Walmart de Mexico", "Investor Relations", "Mexico", "Retail / food", "P2", "ES", "Food procurement cost volatility context."],
  ["ir@gcc.com", "IR", "Team", "GCC", "Investor Relations", "Mexico", "Cement", "P2", "ES", "Energy & materials cost risk."],
  ["relacionconinversionistas@herdez.com", "IR", "Team", "Grupo Herdez", "Investor Relations", "Mexico", "Food", "P1", "ES", "Food manufacturer — agri input hedges."],
  ["ir@gmexico.com", "IR", "Team", "Grupo Mexico", "IR mailbox", "Mexico", "Mining / metals", "P2", "ES", "Mining commodity risk."],
  ["ir@bimbo.com", "IR", "Team", "Grupo Bimbo", "Investor Relations", "Mexico", "Bakery / wheat", "P1", "ES", "Wheat / softs buyer — strong ICP."],
  ["ir@sigmaalimentos.com", "IR", "Team", "Sigma Alimentos", "Investor Relations", "Mexico", "Protein / food", "P1", "ES", "Protein / feed cost risk."],
  ["ir@alsea.com.mx", "IR", "Team", "Alsea", "Investor Relations", "Mexico", "Food service", "P2", "ES", "Food procurement cost risk."],
  ["ir@kimberly-clark.com.mx", "IR", "Team", "Kimberly-Clark de Mexico", "Investor Relations", "Mexico", "Consumer / pulp", "P2", "ES", "Pulp cost risk."],
  ["ir@penoles.com.mx", "IR", "Team", "Penoles", "Investor Relations", "Mexico", "Mining / metals", "P1", "ES", "Precious & base metals risk."],
  ["ir@fresnilloplc.com", "IR", "Team", "Fresnillo", "Investor Relations", "Mexico", "Silver / gold mining", "P1", "ES", "Metals price risk."],
  // Argentina
  ["investorrelations@biocerescrops.com", "IR", "Team", "Bioceres Crop Solutions", "Investor Relations", "Argentina", "Agri / biotech / seeds", "P1", "ES", "Crop solutions — agri price context."],
  ["investors@msuagro.com.ar", "Federico", "Walter", "Grupo MSU Agro", "Investor Relations", "Argentina", "Agri producer", "P1", "ES", "Argentine agri producer — crop hedge fit."],
  ["ir@msuenergy.com", "Hernan", "Cerutti", "MSU Energy", "Investor Relations", "Argentina", "Energy", "P2", "ES", "Energy commodity angle."],
  ["ir@cresud.com.ar", "IR", "Team", "Cresud", "Investor Relations", "Argentina", "Agri producer / land", "P1", "ES", "Listed agri company — crop price risk."],
  ["ir@irsa.com.ar", "IR", "Team", "IRSA", "Investor Relations", "Argentina", "Real estate / holdings", "P2", "ES", "Ask intro via Cresud agri linkage."],
  ["ri@molinos.com.ar", "IR", "Team", "Molinos Rio de la Plata", "Investor Relations", "Argentina", "Agri-food / milling", "P1", "ES", "Wheat / softs buyer — strong ICP."],
  ["inversores@sanmiguelglobal.com", "IR", "Team", "San Miguel", "Investor Relations", "Argentina", "Agri / citrus", "P1", "ES", "Fruit exporter — FX + softs."],
  ["ir@loma-negra.com.ar", "IR", "Team", "Loma Negra", "Investor Relations", "Argentina", "Cement", "P2", "ES", "Energy & materials cost risk."],
  ["investors@ypf.com", "IR", "Team", "YPF", "Investor Relations", "Argentina", "Oil & gas", "P2", "ES", "Energy commodity risk."],
  ["ri@tenaris.com", "IR", "Team", "Tenaris", "Investor Relations", "Argentina", "Steel / pipes", "P2", "ES", "Steel / metals risk."],
  ["ir@ternium.com", "IR", "Team", "Ternium", "Investor Relations", "Argentina", "Steel", "P2", "ES", "Steel commodity risk."],
  ["inversores@pampaenergia.com", "IR", "Team", "Pampa Energia", "Investor Relations", "Argentina", "Energy", "P2", "ES", "Energy commodity risk."],
  ["ir@vistaenergy.com", "IR", "Team", "Vista Energy", "Investor Relations", "Argentina", "Oil & gas", "P2", "ES", "Energy commodity risk."],
  ["ir@adecoagro.com", "IR", "Team", "Adecoagro", "Investor Relations", "Argentina", "Agri producer", "P1", "ES", "Listed LatAm agri producer."],

  // Chile
  ["ir@sqm.com", "IR", "Team", "SQM", "Investor Relations", "Chile", "Lithium / fertilizers", "P1", "ES", "Fertilizer & lithium — commodity risk."],
  ["isabel.bendeck@sqm.com", "Isabel", "Bendeck", "SQM", "Investor Relations", "Chile", "Lithium / fertilizers", "P1", "ES", "Public IR contact."],
  ["megan.suitor@sqm.com", "Megan", "Suitor", "SQM", "Investor Relations", "Chile", "Lithium / fertilizers", "P2", "ES", "Public IR contact."],
  ["ir@cap.cl", "IR", "Team", "CAP", "Investor Relations", "Chile", "Iron ore / steel", "P1", "ES", "Iron ore & steel price risk."],
  ["fcisterna@cap.cl", "Felipe", "Cisterna", "CAP", "Head of IR", "Chile", "Iron ore / steel", "P1", "ES", "Public IR contact."],
  ["investor@empresascopec.cl", "IR", "Team", "Empresas Copec", "Investor Relations", "Chile", "Energy / forestry / fuels", "P1", "ES", "Energy + forestry commodity complex."],
  ["ir@cmpc.cl", "IR", "Team", "CMPC", "Investor Relations", "Chile", "Pulp / paper", "P1", "ES", "Pulp commodity exposure."],
  ["relacion.inversionistas@codelco.cl", "IR", "Team", "Codelco", "Investor Relations", "Chile", "Copper mining", "P1", "ES", "Copper price risk — state miner."],
  ["ir@cencosud.cl", "IR", "Team", "Cencosud", "Investor Relations", "Chile", "Retail / food", "P2", "ES", "Food retail procurement context."],
  ["inversionistas@enel.com", "IR", "Team", "Enel Chile", "Investor Relations", "Chile", "Energy", "P2", "ES", "Energy commodity / power risk."],
  ["ir@agrosuper.cl", "IR", "Team", "Agrosuper", "Investor Relations", "Chile", "Protein / feed", "P1", "ES", "Feed commodity cost risk."],
  ["ir@ccu.cl", "IR", "Team", "CCU", "Investor Relations", "Chile", "Beverages", "P2", "ES", "Softs / agri input exposure."],
  ["ir@conchaytoro.cl", "IR", "Team", "Concha y Toro", "Investor Relations", "Chile", "Wine / agri", "P2", "ES", "Agri FX & input risk."],
  ["ir@quinenco.cl", "IR", "Team", "Quinenco", "Investor Relations", "Chile", "Conglomerate", "P2", "ES", "Ask intro to commodity subsidiaries."],
  ["ir@salfacorp.com", "IR", "Team", "Salfacorp", "Investor Relations", "Chile", "Construction", "P3", "ES", "Materials cost risk."],

  // Colombia
  ["investor.relations@mineros.com.co", "IR", "Team", "Mineros", "Investor Relations", "Colombia", "Gold mining", "P1", "ES", "Gold / metals price risk."],
  ["relacion.inversionistas@mineros.com.co", "IR", "Team", "Mineros", "Relacion inversionistas", "Colombia", "Gold mining", "P1", "ES", "Public LatAm IR mailbox."],
  ["ir@ecopetrol.com.co", "IR", "Team", "Ecopetrol", "Investor Relations", "Colombia", "Oil & gas", "P1", "ES", "Energy commodity risk."],
  ["inversionistas@ecopetrol.com.co", "IR", "Team", "Ecopetrol", "Inversionistas", "Colombia", "Oil & gas", "P2", "ES", "Alternate IR channel."],
  ["ir@gruponutresa.com", "IR", "Team", "Grupo Nutresa", "Investor Relations", "Colombia", "Food", "P1", "ES", "Food manufacturer — agri inputs."],
  ["ir@grupoargos.com", "IR", "Team", "Grupo Argos", "Investor Relations", "Colombia", "Cement / energy", "P2", "ES", "Materials & energy cost risk."],
  ["ir@cementosargos.com", "IR", "Team", "Cementos Argos", "Investor Relations", "Colombia", "Cement", "P2", "ES", "Energy & materials cost risk."],
  ["ir@grupobancolombia.com", "IR", "Team", "Bancolombia", "Investor Relations", "Colombia", "Banking", "P3", "ES", "Channel — corporate treasury clients."],
  ["ir@isa.com.co", "IR", "Team", "ISA", "Investor Relations", "Colombia", "Energy infrastructure", "P2", "ES", "Energy sector."],
  ["relacion.inversionistas@avianca.com", "IR", "Team", "Avianca", "Investor Relations", "Colombia", "Airlines", "P2", "ES", "Jet fuel hedge angle."],
  ["ir@ecopetrol.com", "IR", "Team", "Ecopetrol", "IR alias", "Colombia", "Oil & gas", "P2", "ES", "Energy commodity risk."],
  ["inversionistas@gruposura.com", "IR", "Team", "Grupo Sura", "Investor Relations", "Colombia", "Financials", "P3", "ES", "Lower ICP."],
  ["ir@celsia.com", "IR", "Team", "Celsia", "Investor Relations", "Colombia", "Energy", "P2", "ES", "Energy commodity risk."],

  // Peru
  ["ir@buenaventura.com", "IR", "Team", "Buenaventura", "Investor Relations", "Peru", "Mining / metals", "P1", "ES", "Metals price risk."],
  ["relacionconinversionistas@buenaventura.pe", "IR", "Team", "Buenaventura", "RI Peru", "Peru", "Mining / metals", "P2", "ES", "Metals price risk."],
  ["ir@volcan.com.pe", "IR", "Team", "Volcan", "Investor Relations", "Peru", "Mining", "P1", "ES", "Base metals price risk."],
  ["ir@southerncopper.com", "IR", "Team", "Southern Copper", "Investor Relations", "Peru", "Copper mining", "P1", "ES", "Copper price risk."],
  ["inversionistas@alicorp.com.pe", "IR", "Team", "Alicorp", "Investor Relations", "Peru", "Agri-food / milling", "P1", "ES", "Wheat / oils buyer — strong ICP."],
  ["ir@credicorp.com", "IR", "Team", "Credicorp", "Investor Relations", "Peru", "Financials", "P3", "ES", "Channel potential."],
  ["ir@ferreycorp.com.pe", "IR", "Team", "Ferreycorp", "Investor Relations", "Peru", "Industrial / equipment", "P2", "ES", "Mining supply chain context."],
  ["ir@inzaperu.com", "IR", "Team", "InRetail / Inka", "Investor Relations", "Peru", "Retail / food", "P2", "ES", "Food retail procurement."],
  ["relacion.inversionistas@intercorp.com.pe", "IR", "Team", "Intercorp", "Investor Relations", "Peru", "Conglomerate", "P2", "ES", "Ask intro to food / retail units."],

  // Uruguay / Paraguay / Ecuador
  ["ir@conaprole.com.uy", "IR", "Team", "Conaprole", "Investor / institutional", "Uruguay", "Dairy / agri", "P2", "ES", "Dairy commodity cost risk."],
  ["relacion.inversores@ancap.com.uy", "IR", "Team", "ANCAP", "Investor contact", "Uruguay", "Energy", "P2", "ES", "Energy commodity risk."],
  ["inversionistas@pronaca.com", "IR", "Team", "Pronaca", "Investor Relations", "Ecuador", "Protein / feed", "P1", "ES", "Feed commodity cost risk."],
  ["ir@favorita.com.ec", "IR", "Team", "Corporacion Favorita", "Investor Relations", "Ecuador", "Retail / food", "P2", "ES", "Food procurement context."],

  // Brazil — additional public RI (beyond existing file)
  ["ri@suzano.com.br", "IR", "Team", "Suzano", "Investor Relations", "Brazil", "Pulp / paper", "P1", "PT", "Pulp commodity exposure."],
  ["ri@klabin.com.br", "IR", "Team", "Klabin", "Investor Relations", "Brazil", "Pulp / paper", "P1", "PT", "Pulp commodity exposure."],
  ["invest@klabin.com.br", "IR", "Team", "Klabin", "Invest mailbox", "Brazil", "Pulp / paper", "P1", "PT", "Already in prior list — keep LatAm."],
  ["ri@ultrapar.com.br", "IR", "Team", "Ultrapar", "Investor Relations", "Brazil", "Energy / distribution", "P1", "PT", "Fuel & chemicals commodity risk."],
  ["ri@vibraenergia.com.br", "IR", "Team", "Vibra Energia", "Investor Relations", "Brazil", "Fuel distribution", "P1", "PT", "Oil product price risk."],
  ["ri@petrobras.com.br", "IR", "Team", "Petrobras", "Investor Relations", "Brazil", "Oil & gas", "P1", "PT", "Energy commodity risk."],
  ["petroinvest@petrobras.com.br", "Leandro", "Santos", "Petrobras", "Institutional IR", "Brazil", "Oil & gas", "P1", "PT", "Public IR channel."],
  ["ri@embraer.com.br", "IR", "Team", "Embraer", "Investor Relations", "Brazil", "Aerospace", "P2", "PT", "Jet fuel / FX angle."],
  ["ri@localiza.com", "IR", "Team", "Localiza", "Investor Relations", "Brazil", "Mobility", "P3", "PT", "Lower ICP."],
  ["ri@magazineluiza.com.br", "IR", "Team", "Magazine Luiza", "Investor Relations", "Brazil", "Retail", "P3", "PT", "Lower ICP."],
  ["ri@totvs.com.br", "IR", "Team", "TOTVS", "Investor Relations", "Brazil", "Software", "P3", "PT", "Lower ICP — channel only."],
  ["ri@weg.net", "IR", "Team", "WEG", "Investor Relations", "Brazil", "Industrial / motors", "P2", "PT", "Industrial metals / energy cost."],
  ["ri@randon.com.br", "IR", "Team", "Randon", "Investor Relations", "Brazil", "Industrial / trailers", "P2", "PT", "Steel & materials cost risk."],
  ["ri@iomochmaxion.com.br", "IR", "Team", "Iochpe-Maxion", "Investor Relations", "Brazil", "Auto parts / steel", "P2", "PT", "Steel commodity risk."],
  ["ri@tupy.com.br", "IR", "Team", "Tupy", "Investor Relations", "Brazil", "Castings / metals", "P2", "PT", "Metals price risk."],
  ["ri@eternit.com.br", "IR", "Team", "Eternit", "Investor Relations", "Brazil", "Building materials", "P2", "PT", "Materials cost risk."],
  ["ri@duratex.com.br", "IR", "Team", "Dexco / Duratex", "Investor Relations", "Brazil", "Wood / materials", "P2", "PT", "Wood materials exposure."],
  ["investidores@dex.co", "Guilherme", "Setubal", "Dexco", "IR / ESG", "Brazil", "Wood / materials", "P2", "PT", "Public IR."],
  ["ri@irani.com.br", "IR", "Team", "Irani", "Investor Relations", "Brazil", "Pulp / paper / forestry", "P2", "PT", "Forestry commodity exposure."],
  ["ri@b3.com.br", "IR", "Team", "B3", "Investor Relations", "Brazil", "Exchange", "P2", "PT", "Exchange — channel for hedgers education."],
  ["ri@bb.com.br", "IR", "Team", "Banco do Brasil", "Investor Relations", "Brazil", "Banking / agri credit", "P2", "PT", "Agri financing channel."],
  ["ri@itau.com.br", "IR", "Team", "Itau Unibanco", "Investor Relations", "Brazil", "Banking", "P2", "PT", "Corporate treasury channel."],
  ["ri@bradesco.com.br", "IR", "Team", "Bradesco", "Investor Relations", "Brazil", "Banking", "P2", "PT", "Corporate treasury channel."],
  ["ri@santander.com.br", "IR", "Team", "Santander Brasil", "Investor Relations", "Brazil", "Banking", "P2", "PT", "Corporate treasury channel."],
  ["ri@btgpactual.com", "IR", "Team", "BTG Pactual", "Investor Relations", "Brazil", "Investment bank", "P2", "PT", "Commodities desk channel."],
  ["ri@xp.com.br", "IR", "Team", "XP Inc", "Investor Relations", "Brazil", "Investments", "P2", "PT", "Channel potential."],
  ["ri@pagseguro.com", "IR", "Team", "PagSeguro", "Investor Relations", "Brazil", "Fintech", "P3", "PT", "Lower ICP."],
  ["ri@stone.co", "IR", "Team", "Stone", "Investor Relations", "Brazil", "Fintech", "P3", "PT", "Lower ICP."],
  ["ri@natura.com.br", "IR", "Team", "Natura &Co", "Investor Relations", "Brazil", "Consumer / cosmetics", "P2", "PT", "Softs / oils input exposure."],
  ["ri@arezzo.com.br", "IR", "Team", "Arezzo", "Investor Relations", "Brazil", "Retail / fashion", "P3", "PT", "Lower ICP."],
  ["ri@lojasrenner.com.br", "IR", "Team", "Lojas Renner", "Investor Relations", "Brazil", "Retail", "P3", "PT", "Lower ICP."],
  ["ri@guararapes.com.br", "IR", "Team", "Guararapes", "Investor Relations", "Brazil", "Retail / textiles", "P3", "PT", "Cotton / softs context."],
  ["ri@cea.com.br", "IR", "Team", "C&A Modas", "Investor Relations", "Brazil", "Retail", "P3", "PT", "Lower ICP."],
  ["ri@petz.com.br", "IR", "Team", "Petz", "Investor Relations", "Brazil", "Retail", "P3", "PT", "Lower ICP."],
  ["ri@grupocarrefourbrasil.com.br", "IR", "Team", "Carrefour Brasil", "Investor Relations", "Brazil", "Retail / food", "P2", "PT", "Food procurement cost volatility."],
  ["ri@assai.com.br", "IR", "Team", "Assai Atacadista", "Investor Relations", "Brazil", "Wholesale food", "P2", "PT", "Food wholesale — agri price context."],
  ["ri@grupomateus.com.br", "IR", "Team", "Grupo Mateus", "Investor Relations", "Brazil", "Retail / food", "P2", "PT", "Food retail procurement."],
  ["ri@pague-menos.com.br", "IR", "Team", "Pague Menos", "Investor Relations", "Brazil", "Retail / pharma", "P3", "PT", "Lower ICP."],
  ["ri@raiadrogasil.com.br", "IR", "Team", "Raia Drogasil", "Investor Relations", "Brazil", "Retail / pharma", "P3", "PT", "Lower ICP."],
  ["ri@hypera.com.br", "IR", "Team", "Hypera", "Investor Relations", "Brazil", "Pharma", "P3", "PT", "Lower ICP."],
  ["ri@blau.com.br", "IR", "Team", "Blau", "Investor Relations", "Brazil", "Pharma", "P3", "PT", "Lower ICP."],
  ["ri@cimed.com.br", "IR", "Team", "Cimed", "Investor Relations", "Brazil", "Pharma", "P3", "PT", "Lower ICP."],
  ["ri@jhsf.com.br", "IR", "Team", "JHSF", "Investor Relations", "Brazil", "Real estate", "P3", "PT", "Lower ICP."],
  ["ri@cyrela.com.br", "IR", "Team", "Cyrela", "Investor Relations", "Brazil", "Real estate", "P3", "PT", "Lower ICP."],
  ["ri@mrv.com.br", "IR", "Team", "MRV", "Investor Relations", "Brazil", "Real estate", "P3", "PT", "Lower ICP."],
  ["ri@even.com.br", "IR", "Team", "Even", "Investor Relations", "Brazil", "Real estate", "P3", "PT", "Lower ICP."],
  ["ri@eztec.com.br", "IR", "Team", "EZTEC", "Investor Relations", "Brazil", "Real estate", "P3", "PT", "Lower ICP."],
  ["ri@dirigente.com.br", "IR", "Team", "Direcional", "Investor Relations", "Brazil", "Real estate", "P3", "PT", "Lower ICP."],
  ["ri@tenda.com", "IR", "Team", "Tenda", "Investor Relations", "Brazil", "Real estate", "P3", "PT", "Lower ICP."],
  ["ri@cury.net", "IR", "Team", "Cury", "Investor Relations", "Brazil", "Real estate", "P3", "PT", "Lower ICP."],
  ["ri@planoeplano.com.br", "IR", "Team", "Plano&Plano", "Investor Relations", "Brazil", "Real estate", "P3", "PT", "Lower ICP."],
  ["ri@mogibrasil.com.br", "IR", "Team", "Mogi", "Investor Relations", "Brazil", "Real estate", "P3", "PT", "Lower ICP."],
  ["ri@logcp.com.br", "IR", "Team", "LOG Commercial Properties", "Investor Relations", "Brazil", "Real estate / logistics", "P3", "PT", "Lower ICP."],
  ["ri@multplan.com.br", "IR", "Team", "Multiplan", "Investor Relations", "Brazil", "Shopping malls", "P3", "PT", "Lower ICP."],
  ["ri@brmall.com.br", "IR", "Team", "Aliansce Sonae / BRMalls", "Investor Relations", "Brazil", "Shopping malls", "P3", "PT", "Lower ICP."],
  ["ri@iguatemi.com.br", "IR", "Team", "Iguatemi", "Investor Relations", "Brazil", "Shopping malls", "P3", "PT", "Lower ICP."],
  ["ri@alupar.com.br", "IR", "Team", "Alupar", "Investor Relations", "Brazil", "Energy / transmission", "P2", "PT", "Energy sector."],
  ["ri@taesa.com.br", "IR", "Team", "Taesa", "Investor Relations", "Brazil", "Energy / transmission", "P2", "PT", "Energy sector."],
  ["ri@engie.com.br", "IR", "Team", "Engie Brasil", "Investor Relations", "Brazil", "Energy", "P2", "PT", "Energy commodity risk."],
  ["ri@equatorial.com.br", "IR", "Team", "Equatorial", "Investor Relations", "Brazil", "Energy / utilities", "P2", "PT", "Energy sector."],
  ["ri@energisa.com.br", "IR", "Team", "Energisa", "Investor Relations", "Brazil", "Energy / utilities", "P2", "PT", "Energy sector."],
  ["ri@cpfl.com.br", "IR", "Team", "CPFL Energia", "Investor Relations", "Brazil", "Energy / utilities", "P2", "PT", "Energy sector."],
  ["ri@enel.com.br", "IR", "Team", "Enel Brasil", "Investor Relations", "Brazil", "Energy / utilities", "P2", "PT", "Energy sector."],
  ["ri@neoenergia.com", "IR", "Team", "Neoenergia", "Investor Relations", "Brazil", "Energy / utilities", "P2", "PT", "Energy sector."],
  ["ri@cemig.com.br", "IR", "Team", "Cemig", "Investor Relations", "Brazil", "Energy / utilities", "P2", "PT", "Energy sector."],
  ["ri@copel.com", "IR", "Team", "Copel", "Investor Relations", "Brazil", "Energy / utilities", "P2", "PT", "Energy sector."],
  ["ri@light.com.br", "IR", "Team", "Light", "Investor Relations", "Brazil", "Energy / utilities", "P2", "PT", "Energy sector."],
  ["ri@aesbrasil.com.br", "IR", "Team", "AES Brasil", "Investor Relations", "Brazil", "Energy", "P2", "PT", "Energy sector."],
  ["ri@omegaenergia.com.br", "IR", "Team", "Omega Energia", "Investor Relations", "Brazil", "Renewables", "P2", "PT", "Energy sector."],
  ["ri@aerisenergy.com.br", "IR", "Team", "Aeris", "Investor Relations", "Brazil", "Wind blades", "P2", "PT", "Industrial materials cost."],
  ["ri@sereducacional.com", "IR", "Team", "Ser Educacional", "Investor Relations", "Brazil", "Education", "P3", "PT", "Lower ICP."],
  ["ri@yduqs.com.br", "IR", "Team", "YDUQS", "Investor Relations", "Brazil", "Education", "P3", "PT", "Lower ICP."],
  ["ri@animaeducacao.com.br", "IR", "Team", "Anima", "Investor Relations", "Brazil", "Education", "P3", "PT", "Lower ICP."],
  ["ri@cruzeirodosul.edu.br", "IR", "Team", "Cruzeiro do Sul", "Investor Relations", "Brazil", "Education", "P3", "PT", "Lower ICP."],
  ["ri@cogna.com.br", "IR", "Team", "Cogna", "Investor Relations", "Brazil", "Education", "P3", "PT", "Lower ICP."],
  ["ri@vvar.com.br", "IR", "Team", "Via Varejo / Grupo Casas Bahia", "Investor Relations", "Brazil", "Retail", "P3", "PT", "Lower ICP."],
  ["ri@americanas.com", "IR", "Team", "Americanas", "Investor Relations", "Brazil", "Retail", "P3", "PT", "Lower ICP."],
  ["ri@b2wdigital.com", "IR", "Team", "B2W / Americanas", "Investor Relations", "Brazil", "E-commerce", "P3", "PT", "Lower ICP."],
  ["ri@movida.com.br", "IR", "Team", "Movida", "Investor Relations", "Brazil", "Mobility", "P3", "PT", "Fuel cost angle."],
  ["ri@unidas.com.br", "IR", "Team", "Unidas / Vamos", "Investor Relations", "Brazil", "Mobility / fleet", "P2", "PT", "Fuel & steel cost context."],
  ["ri@vamos.com.br", "IR", "Team", "Vamos", "Investor Relations", "Brazil", "Fleet / equipment", "P2", "PT", "Equipment / agri logistics adjacency."],
  ["ri@simpar.com.br", "IR", "Team", "Simpar", "Investor Relations", "Brazil", "Mobility / logistics holding", "P2", "PT", "Ask intro to fleet / logistics units."],
  ["ri@jsl.com.br", "IR", "Team", "JSL", "Investor Relations", "Brazil", "Logistics", "P2", "PT", "Logistics — fuel hedge angle."],
  ["ri@csbrasil.com.br", "IR", "Team", "CS Brasil", "Investor Relations", "Brazil", "Fleet services", "P3", "PT", "Lower ICP."],
  ["ri@automob.com.br", "IR", "Team", "Automob", "Investor Relations", "Brazil", "Auto retail", "P3", "PT", "Lower ICP."],
  ["ri@comprerural.com", "IR", "Team", "Compre Rural", "Investor contact", "Brazil", "Agri media", "P3", "PT", "Agri channel / content partner."],
  ["contato@noticiasagricolas.com.br", "Editorial", "Team", "Noticias Agricolas", "Contact", "Brazil", "Agri media", "P3", "PT", "Agri media channel."],
  ["ri@santosbrasil.com.br", "IR", "Team", "Santos Brasil", "Investor Relations", "Brazil", "Ports / logistics", "P2", "PT", "Agri export logistics context."],
  ["ri@wilsonsons.com.br", "IR", "Team", "Wilson Sons", "Investor Relations", "Brazil", "Ports / logistics", "P2", "PT", "Trade logistics — agri flows."],
  ["ri@hidrovias.com.br", "IR", "Team", "Hidrovias do Brasil", "Investor Relations", "Brazil", "Agri logistics / waterways", "P1", "PT", "Grain logistics — strong agri adjacency."],
  ["ir@rumolog.com", "Felipe", "Saraiva", "Rumo", "IR team mailbox", "Brazil", "Agri logistics", "P1", "PT", "Grain rail logistics."],
  ["felipe.saraiva@rumolog.com", "Felipe", "Saraiva", "Rumo", "IR Executive Manager", "Brazil", "Agri logistics", "P1", "PT", "Public IR."],
  ["manoela.freire@rumolog.com", "Manoela", "Freire", "Rumo", "IR Manager", "Brazil", "Agri logistics", "P2", "PT", "Public IR."],
  ["ri@kepler.com.br", "Renato", "Arroyo", "Kepler Weber", "CFO and IR", "Brazil", "Agri equipment / storage", "P1", "PT", "Grain storage chain."],
  ["ri.kepler@kepler.com.br", "Renato", "Arroyo", "Kepler Weber", "IR mailbox", "Brazil", "Agri equipment / storage", "P1", "PT", "Public IR."],
  ["ri@saomartinho.com.br", "IR", "Team", "Sao Martinho", "Investor Relations", "Brazil", "Sugar / ethanol", "P1", "PT", "Sugar/ethanol price risk."],
  ["ri@jalles.com.br", "IR", "Team", "Jalles", "Investor Relations", "Brazil", "Sugar / ethanol", "P1", "PT", "Sugarcane producer."],
  ["ri@zilor.com.br", "IR", "Team", "Zilor", "Investor Relations", "Brazil", "Sugar / ethanol", "P1", "PT", "Sugarcane complex."],
  ["ri@raizen.com", "Phillipe", "Casale", "Raizen", "IR team mailbox", "Brazil", "Energy / sugar / ethanol", "P1", "PT", "Sugar/ethanol + energy."],
  ["sugarethanol@raizen.com", "Sugar Ethanol", "Commercial", "Raizen", "Sugar & ethanol commercial", "Brazil", "Energy / sugar / ethanol", "P2", "PT", "Commercial desk opener."],
  ["ri@cosan.com", "Fernando", "Tinel", "Cosan", "IR / Treasury / FP&A", "Brazil", "Energy / agri holding", "P1", "PT", "Treasury in IR team."],
  ["ri@compassbr.com", "IR", "Team", "Compass Gas", "Investor Relations", "Brazil", "Natural gas", "P2", "PT", "Energy commodity risk."],
  ["ri@moove.com.br", "IR", "Team", "Moove", "Investor Relations", "Brazil", "Lubricants", "P2", "PT", "Oil product exposure."],
  ["ri@radar.com.br", "IR", "Team", "Radar / Cosan land", "Investor Relations", "Brazil", "Agri land", "P2", "PT", "Agri land — Cosan complex."],
  ["ri@3tentos.com.br", "IR", "Team", "3tentos", "Investor Relations", "Brazil", "Agri inputs / grains", "P1", "PT", "Agri distribution."],
  ["ri@agrogalaxy.com.br", "Luiz Conrado", "Sundfeld", "AgroGalaxy", "CFO and IR", "Brazil", "Agri retail / inputs", "P1", "PT", "Agri inputs."],
  ["ri@amaggi.com.br", "IR", "Team", "Amaggi", "Investor Relations", "Brazil", "Agri trading / origination", "P1", "PT", "Major agri trader."],
  ["ri@boasafrasementes.com.br", "Felipe", "Marques", "Boa Safra Sementes", "IR Manager", "Brazil", "Seeds / agri", "P1", "PT", "Agri inputs."],
  ["ri@brasil-agro.com", "Gustavo", "Lopez", "BrasilAgro", "CFO and IR Officer", "Brazil", "Agri producer", "P1", "PT", "Active commodity hedge policy."],
  ["ri@slcagricola.com.br", "Ivo", "Brum", "SLC Agricola", "CFO and IR Officer", "Brazil", "Agri producer", "P1", "PT", "Listed grower."],
  ["ri@terrasantapa.com.br", "Mariana", "Mesquita", "Terra Santa", "CEO and IR", "Brazil", "Agri producer", "P1", "PT", "Public hedge policy."],
  ["ri@fs.agr.br", "Giam", "Freitas", "FS", "FP&A Treasury and IR Director", "Brazil", "Corn ethanol / agri", "P1", "PT", "Treasury in title."],
  ["ri@heringer.com.br", "IR", "Team", "Fertilizantes Heringer", "Investor Relations", "Brazil", "Fertilizers", "P1", "PT", "Fertilizer price risk."],
  ["ri@vittia.com.br", "Alexandre", "Frizzo", "Vittia", "IR Director", "Brazil", "Agri inputs / fertilizers", "P1", "PT", "Fertilizer / agri inputs."],
  ["ri@camil.com.br", "Jenifer", "Nicolini", "Camil Alimentos", "IR / ESG / Corporate Treasury Manager", "Brazil", "Agri-food", "P1", "PT", "Buyer hedge ICP."],
  ["esg@camil.com.br", "ESG", "Team", "Camil Alimentos", "ESG / IR channel", "Brazil", "Agri-food", "P2", "PT", "Ask forward to treasury."],
  ["ri@mdiasbranco.com.br", "IR", "Team", "M. Dias Branco", "Investor Relations", "Brazil", "Agri-food / wheat", "P1", "PT", "Hedge committee public."],
  ["fabio.cefaly@mdiasbranco.com.br", "Fabio", "Cefaly", "M. Dias Branco", "New Business and IR Director", "Brazil", "Agri-food / wheat", "P1", "PT", "Ask treasury intro."],
  ["rodrigo.ishiwa@mdiasbranco.com.br", "Rodrigo", "Ishiwa", "M. Dias Branco", "Investor Relations Manager", "Brazil", "Agri-food / wheat", "P1", "PT", "Ask commodity risk owner."],
  ["ri@mbrf.com", "Jose Ignacio", "Scoseria Rey", "BRF / MBRF", "CFO / IR Officer", "Brazil", "Protein / feed", "P1", "PT", "Corn/soymeal hedges."],
  ["daniel.mattei@mbrf.com", "Daniel", "Mattei", "BRF / MBRF", "Investor Relations", "Brazil", "Protein / feed", "P2", "PT", "Ask treasury intro."],
  ["fernanda.coutinho@mbrf.com", "Fernanda", "Coutinho", "BRF / MBRF", "Investor Relations", "Brazil", "Protein / feed", "P2", "PT", "Ask treasury intro."],
  ["leonardo.squarizi@mbrf.com", "Leonardo", "Squarizi", "BRF / MBRF", "Investor Relations", "Brazil", "Protein / feed", "P2", "PT", "Ask treasury intro."],
  ["leticia.vaccaro@mbrf.com", "Leticia", "Vaccaro", "BRF / MBRF", "Investor Relations", "Brazil", "Protein / feed", "P2", "PT", "Ask treasury intro."],
  ["marianna.marcondes@mbrf.com", "Marianna", "Marcondes", "BRF / MBRF", "Investor Relations", "Brazil", "Protein / feed", "P2", "PT", "Ask treasury intro."],
  ["ri@marfrig.com.br", "IR", "Team", "Marfrig", "Investor Relations", "Brazil", "Protein", "P1", "PT", "Feed commodity cost."],
  ["ri@minervafoods.com", "Edison", "Ticle", "Minerva Foods", "Investor Relations", "Brazil", "Protein", "P1", "PT", "Feed & livestock cost."],
  ["danilo.cabrera@minervafoods.com", "Danilo", "Cabrera", "Minerva Foods", "Investor Relations", "Brazil", "Protein", "P2", "PT", "Ask treasury intro."],
  ["gustavo.ityanagui@minervafoods.com", "Gustavo", "Ityanagui", "Minerva Foods", "Investor Relations", "Brazil", "Protein", "P2", "PT", "Ask treasury intro."],
  ["kelly.barna@minervafoods.com", "Kelly", "Barna", "Minerva Foods", "Investor Relations", "Brazil", "Protein", "P2", "PT", "Ask treasury intro."],
  ["renan.doliveira@minervafoods.com", "Renan", "Oliveira", "Minerva Foods", "Investor Relations", "Brazil", "Protein", "P2", "PT", "Ask treasury intro."],
  ["traders.origins@minervafoods.com", "Origins", "Desk", "Minerva Foods", "Export / origins traders", "Brazil", "Protein", "P2", "PT", "Physical book angle."],
  ["ir@jbsglobal.com", "Christiane", "Assis", "JBS", "IR team mailbox", "Brazil", "Protein", "P1", "PT", "Ask treasury/commodity risk."],
  ["vale.ri@vale.com", "Thiago", "Lofiego", "Vale", "IR team mailbox", "Brazil", "Mining / metals", "P1", "PT", "Iron ore & metals."],
  ["invrel@csn.com.br", "Antonio Marco", "Rabello", "CSN", "CFO and IR", "Brazil", "Steel / mining", "P1", "PT", "Steel & mining risk."],
  ["invrel@csnmineracao.com.br", "IR", "Team", "CSN Mineracao", "Investor Relations", "Brazil", "Mining", "P1", "PT", "Mining price risk."],
  ["investidores@usiminas.com", "Leonardo", "Rosa", "Usiminas", "IR Director", "Brazil", "Steel", "P1", "PT", "Steel price risk."],
  ["inform@gerdau.com", "Rafael", "Japur", "Gerdau", "IR team mailbox", "Brazil", "Steel", "P1", "PT", "Steel commodity risk."],
  ["ri@cba.com.br", "IR", "Team", "CBA", "Investor Relations", "Brazil", "Aluminum", "P1", "PT", "Aluminum price risk."],
  ["ricba@cba.com.br", "Amabile", "Silva", "CBA", "IR team mailbox", "Brazil", "Aluminum", "P1", "PT", "Aluminum price risk."],
  ["amabile.silva@cba.com.br", "Amabile", "Silva", "CBA", "Investor Relations", "Brazil", "Aluminum", "P2", "PT", "Ask treasury intro."],
  ["deserrie.araujo@cba.com.br", "Deserrie", "Araujo", "CBA", "Investor Relations", "Brazil", "Aluminum", "P2", "PT", "Ask treasury intro."],
  ["dri@ferbasa.com.br", "Silvano", "Andrade", "Ferbasa", "IR team", "Brazil", "Ferroalloys / metals", "P1", "PT", "Metals price risk."],
  ["samarco.ri@samarco.com", "IR", "Team", "Samarco", "Investor Relations", "Brazil", "Mining", "P2", "PT", "Mining metals risk."],
  ["info@biosev.com.br", "Commercial", "Team", "BIOSEV", "Commercial contact", "Brazil", "Agri commodities", "P2", "PT", "Agri trading soft outreach."],
  ["itaueira@itaueira.com", "IR", "Team", "Itaueira / REI Alimentos", "Investor contact", "Brazil", "Agri-food", "P2", "PT", "Agri producer / food."],
];

function csvEscape(v) {
  const s = String(v ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function rowKey(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function parseExisting() {
  if (!EXISTING) return [];
  try {
    const raw = readFileSync(EXISTING, "utf8");
    const lines = raw.split(/\r?\n/).filter(Boolean);
    const out = [];
    for (let i = 1; i < lines.length; i++) {
      // simple CSV split respecting quotes
      const cols = [];
      let cur = "";
      let q = false;
      for (const ch of lines[i]) {
        if (ch === '"') {
          q = !q;
          continue;
        }
        if (ch === "," && !q) {
          cols.push(cur);
          cur = "";
          continue;
        }
        cur += ch;
      }
      cols.push(cur);
      if (cols.length < 10) continue;
      const country = cols[5];
      if (!isLatAmCountry(country)) continue;
      out.push(cols.slice(0, 10));
    }
    return out;
  } catch {
    return [];
  }
}

const byEmail = new Map();

function add(row) {
  const email = rowKey(row[0]);
  if (!email || !email.includes("@")) return;
  // drop obvious placeholders / bad domains
  if (email.includes("placeholder") || email.includes("pepsico.com.mx")) return;
  if (!byEmail.has(email)) byEmail.set(email, row);
}

for (const r of parseExisting()) add(r);
for (const r of EXTRA) add(r);

// Sort: P1 first, then country, then company
const rows = [...byEmail.values()].sort((a, b) => {
  const pa = String(a[7] || "P9");
  const pb = String(b[7] || "P9");
  if (pa !== pb) return pa.localeCompare(pb);
  const ca = String(a[5] || "");
  const cb = String(b[5] || "");
  if (ca !== cb) return ca.localeCompare(cb);
  return String(a[3] || "").localeCompare(String(b[3] || ""));
});

const lines = [HEADER, ...rows.map((r) => r.map(csvEscape).join(","))];
mkdirSync(resolve(__dirname, "output"), { recursive: true });
writeFileSync(OUT, lines.join("\n") + "\n", "utf8");

const byCountry = {};
const byPri = {};
for (const r of rows) {
  const c = String(r[5]).split(/[\/]/)[0].trim();
  byCountry[c] = (byCountry[c] || 0) + 1;
  byPri[r[7]] = (byPri[r[7]] || 0) + 1;
}

console.log(`Wrote ${OUT}`);
console.log(`Contacts: ${rows.length}`);
console.log("By priority:", byPri);
console.log("By country:", byCountry);
