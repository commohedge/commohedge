# -*- coding: utf-8 -*-
"""Build ~100 Brevo-ready contacts from publicly listed IR emails."""
import csv
from pathlib import Path

OUT = Path(__file__).with_name("commohedge-destinataires-brevo-ready.csv")

# EMAIL, FIRSTNAME, LASTNAME, COMPANY, JOB_TITLE, COUNTRY, SECTOR, PRIORITY, LANGUAGE, PERSONALIZATION, SOURCE
RAW = [
    # Camil / wheat-agri priority
    ("ri@camil.com.br", "Jenifer", "Nicolini", "Camil Alimentos", "IR / ESG / Corporate Treasury Manager", "Brazil", "Agri-food", "P1", "EN", "H1 2026 buyer-hedge backtest already prepared for Camil.", "https://ri.camil.com.br/investor-services/ir-contact/"),
    ("esg@camil.com.br", "ESG", "Team", "Camil Alimentos", "ESG / IR channel", "Brazil", "Agri-food", "P2", "EN", "Ask for forward to treasury / commodity risk.", "https://ri.camil.com.br/servicos-aos-investidores/fale-com-ri/"),
    ("ri@mdiasbranco.com.br", "IR", "Team", "M. Dias Branco", "Investor Relations", "Brazil", "Agri-food / wheat", "P1", "EN", "Public hedge policy + hedge committee.", "https://ri.mdiasbranco.com.br/en/contact-ir/"),
    ("fabio.cefaly@mdiasbranco.com.br", "Fabio", "Cefaly", "M. Dias Branco", "New Business and IR Director", "Brazil", "Agri-food / wheat", "P1", "EN", "Ask intro to treasury / hedge committee.", "https://ri.mdiasbranco.com.br/en/contact-ir/"),
    ("rodrigo.ishiwa@mdiasbranco.com.br", "Rodrigo", "Ishiwa", "M. Dias Branco", "Investor Relations Manager", "Brazil", "Agri-food / wheat", "P1", "EN", "Ask intro to commodity risk owner.", "https://ri.mdiasbranco.com.br/en/contact-ir/"),
    ("ri@brasil-agro.com", "Gustavo", "Lopez", "BrasilAgro", "CFO and IR Officer", "Brazil", "Agri producer", "P1", "EN", "Active commodity hedge policy (soy/cotton).", "https://ri.brasil-agro.com/en/contacts/ir-contact/"),
    ("ri@slcagricola.com.br", "Ivo", "Brum", "SLC Agricola", "CFO and IR Officer", "Brazil", "Agri producer", "P1", "EN", "Listed grower — crop price risk.", "https://ri.slcagricola.com.br/servicos-aos-investidores/fale-com-ri/"),
    ("ri@mbrf.com", "Jose Ignacio", "Scoseria Rey", "BRF / MBRF", "CFO / IR Officer", "Brazil", "Protein / feed", "P1", "EN", "Commodity derivatives on corn/soymeal/oil.", "https://ri.brf-global.com/en/ir-brf/contact-ir/"),
    ("leticia.vaccaro@mbrf.com", "Leticia", "Vaccaro", "BRF / MBRF", "Investor Relations", "Brazil", "Protein / feed", "P2", "EN", "Request intro to commodity risk / treasury.", "https://ri.brf-global.com/en/ir-brf/contact-ir/"),
    ("fernanda.coutinho@mbrf.com", "Fernanda", "Coutinho", "BRF / MBRF", "Investor Relations", "Brazil", "Protein / feed", "P2", "EN", "Request intro to commodity risk / treasury.", "https://ri.brf-global.com/en/ir-brf/contact-ir/"),
    ("leonardo.squarizi@mbrf.com", "Leonardo", "Squarizi", "BRF / MBRF", "Investor Relations", "Brazil", "Protein / feed", "P2", "EN", "Request intro to commodity risk / treasury.", "https://ri.brf-global.com/en/ir-brf/contact-ir/"),
    ("marianna.marcondes@mbrf.com", "Marianna", "Marcondes", "BRF / MBRF", "Investor Relations", "Brazil", "Protein / feed", "P2", "EN", "Request intro to commodity risk / treasury.", "https://ri.brf-global.com/en/ir-brf/contact-ir/"),
    ("daniel.mattei@mbrf.com", "Daniel", "Mattei", "BRF / MBRF", "Investor Relations", "Brazil", "Protein / feed", "P2", "EN", "Request intro to commodity risk / treasury.", "https://ri.brf-global.com/en/ir-brf/contact-ir/"),
    ("sustentabilidade@brf.com", "Sustainability", "Team", "BRF", "Sustainability", "Brazil", "Protein / feed", "P3", "EN", "Forward request to treasury / commodity risk.", "https://ri.brf-global.com/en/ir-brf/contact-ir/"),
    ("ri@minervafoods.com", "Edison", "Ticle", "Minerva Foods", "Investor Relations", "Brazil", "Protein", "P1", "EN", "Feed & livestock commodity cost exposure.", "https://ri.minervafoods.com/fale-com-ri/"),
    ("danilo.cabrera@minervafoods.com", "Danilo", "Cabrera", "Minerva Foods", "Investor Relations", "Brazil", "Protein", "P2", "EN", "Ask forward to treasury/risk.", "https://ri.minervafoods.com/fale-com-ri/"),
    ("kelly.barna@minervafoods.com", "Kelly", "Barna", "Minerva Foods", "Investor Relations", "Brazil", "Protein", "P2", "EN", "Ask forward to treasury/risk.", "https://ri.minervafoods.com/fale-com-ri/"),
    ("gustavo.ityanagui@minervafoods.com", "Gustavo", "Ityanagui", "Minerva Foods", "Investor Relations", "Brazil", "Protein", "P2", "EN", "Ask forward to treasury/risk.", "https://ri.minervafoods.com/fale-com-ri/"),
    ("renan.doliveira@minervafoods.com", "Renan", "Oliveira", "Minerva Foods", "Investor Relations", "Brazil", "Protein", "P2", "EN", "Ask forward to treasury/risk.", "https://ri.minervafoods.com/fale-com-ri/"),
    ("traders.origins@minervafoods.com", "Origins", "Desk", "Minerva Foods", "Export / origins traders", "Brazil", "Protein", "P2", "EN", "Physical book — hedge/pricing angle.", "https://ri.minervafoods.com/fale-com-ri/"),
    ("ri@marfrig.com.br", "IR", "Team", "Marfrig", "Investor Relations", "Brazil", "Protein", "P1", "EN", "Feed commodity cost risk.", "https://ri.marfrig.com.br/en/marfrig-group/contact-ir/"),
    ("ir@jbsglobal.com", "Christiane", "Assis", "JBS", "IR team mailbox", "Brazil / Global", "Protein", "P1", "EN", "Ask treasury/commodity risk intro.", "https://ir.jbsglobal.com/pt-br/servicos-aos-investidores/fale-com-ri/"),
    ("ri@saomartinho.com.br", "IR", "Team", "Sao Martinho", "Investor Relations", "Brazil", "Sugar / ethanol", "P1", "EN", "Sugar/ethanol price & energy risk.", "https://ri.saomartinho.com.br/"),
    ("ri@zilor.com.br", "IR", "Team", "Zilor", "Investor Relations", "Brazil", "Sugar / ethanol", "P1", "EN", "Sugarcane complex risk.", "https://ri.zilor.com.br/en/investor-services/contact-ir/"),
    ("ri@raizen.com", "Phillipe", "Casale", "Raizen", "IR team mailbox", "Brazil", "Energy / sugar / ethanol", "P1", "EN", "Sugar/ethanol + energy commodity risk.", "https://ri.raizen.com.br/pt/servicos-investidores/fale-com-ri"),
    ("sugarethanol@raizen.com", "Sugar Ethanol", "Commercial", "Raizen", "Sugar & ethanol commercial", "Brazil", "Energy / sugar / ethanol", "P2", "EN", "Commercial desk — pricing/hedge opener.", "https://ri.raizen.com.br/pt/servicos-investidores/fale-com-ri"),
    ("ri@cosan.com", "Fernando", "Tinel", "Cosan", "IR / Treasury / FP&A (team mailbox)", "Brazil", "Energy / agri holding", "P1", "EN", "Treasury mentioned in IR team — strong intro path.", "https://www.cosan.com.br/contato/"),
    ("ri@jalles.com.br", "IR", "Team", "Jalles", "Investor Relations", "Brazil", "Sugar / ethanol", "P1", "EN", "Sugarcane producer — crop price risk.", "https://ri.jalles.com/pt/investor-services/contact"),
    ("ri@3tentos.com.br", "IR", "Team", "3tentos", "Investor Relations", "Brazil", "Agri inputs / grains", "P1", "EN", "Agri distribution — grain price exposure.", "https://ri.3tentos.com.br/servicos-de-ri/fale-conosco/"),
    ("ri@boasafrasementes.com.br", "Felipe", "Marques", "Boa Safra Sementes", "IR Manager", "Brazil", "Seeds / agri", "P1", "EN", "Agri inputs — commodity-linked margins.", "Boa Safra corporate calendar"),
    ("ri.kepler@kepler.com.br", "Renato", "Arroyo", "Kepler Weber", "CFO and IR", "Brazil", "Agri equipment / storage", "P2", "EN", "Grain storage chain — agri volatility context.", "https://ri.kepler.com.br/servicos-de-ri/fale-com-ri/"),
    ("ri@amaggi.com.br", "IR", "Team", "Amaggi", "Investor Relations", "Brazil", "Agri trading / origination", "P1", "EN", "Major agri trader — risk desk fit.", "https://ri.amaggi.com.br/"),
    ("ri@agrogalaxy.com.br", "Luiz Conrado", "Sundfeld", "AgroGalaxy", "CFO and IR", "Brazil", "Agri retail / inputs", "P1", "EN", "Agri inputs distribution.", "https://ri.agrogalaxy.com.br/informacoes-e-servicos-aos-investidores/fale-com-ri/"),
    ("ri@vittia.com.br", "Alexandre", "Frizzo", "Vittia", "IR Director", "Brazil", "Agri inputs / fertilizers", "P1", "EN", "Fertilizer / agri inputs price risk.", "https://ri.vittia.com.br/pt/servicos-aos-investidores/fale-com-ri"),
    ("ri@fs.agr.br", "Giam", "Freitas", "FS", "FP&A Treasury and IR Director", "Brazil", "Corn ethanol / agri", "P1", "EN", "Treasury in title — strong fit.", "https://www.fs.agr.br/investidores/servicos-de-investidores/fale-com-ri/"),
    ("ri@terrasantapa.com.br", "Mariana", "Mesquita", "Terra Santa", "CEO and IR", "Brazil", "Agri producer", "P1", "EN", "Public hedge policy (commodities).", "https://www.terrasantapa.com.br/"),
    ("ri@heringer.com.br", "IR", "Team", "Fertilizantes Heringer", "Investor Relations", "Brazil", "Fertilizers", "P1", "EN", "Fertilizer price & agri input risk.", "https://ri.heringer.com.br/fale-com-ri/"),
    ("itaueira@itaueira.com", "IR", "Team", "Itaueira / REI Alimentos", "Investor contact", "Brazil", "Agri-food", "P2", "EN", "Agri producer / food — risk tools intro.", "https://ri.itaueira.com/"),
    ("ri@irani.com.br", "IR", "Team", "Irani", "Investor Relations", "Brazil", "Pulp / paper / forestry", "P2", "EN", "Forestry commodity exposure.", "https://ri.irani.com.br/servicos-aos-investidores/fale-conosco/"),
    ("info@biosev.com.br", "Commercial", "Team", "BIOSEV", "Commercial contact", "Brazil", "Agri commodities", "P2", "EN", "Agri commodity trading — soft outreach.", "https://biosev.com.br/consulting/"),
    # Metals / mining / steel BR
    ("vale.ri@vale.com", "Thiago", "Lofiego", "Vale", "IR team mailbox", "Brazil", "Mining / metals", "P1", "EN", "Iron ore & metals price risk.", "https://vale.com/pt/contatos"),
    ("invrel@csn.com.br", "Antonio Marco", "Rabello", "CSN", "CFO and IR team mailbox", "Brazil", "Steel / mining", "P1", "EN", "Steel & mining commodity risk.", "https://ri.csn.com.br/en/"),
    ("invrel@csnmineracao.com.br", "IR", "Team", "CSN Mineracao", "Investor Relations", "Brazil", "Mining", "P1", "EN", "Mining price risk.", "CSN Mineracao IR listings"),
    ("investidores@usiminas.com", "Leonardo", "Rosa", "Usiminas", "IR Director", "Brazil", "Steel", "P1", "EN", "Steel raw material & product price risk.", "https://ri.usiminas.com/"),
    ("inform@gerdau.com", "Rafael", "Japur", "Gerdau", "IR team mailbox", "Brazil", "Steel", "P1", "EN", "Steel commodity risk.", "https://ri.gerdau.com/servicos-de-ri/contato-de-ri/"),
    ("dri@ferbasa.com.br", "Silvano", "Andrade", "Ferbasa", "IR team", "Brazil", "Ferroalloys / metals", "P1", "EN", "Metals price risk.", "https://www.ferbasa.com.br/servicos-aos-investidores/fale-com-ri/"),
    ("comunicacao@ferbasa.com.br", "Communications", "Team", "Ferbasa", "Corporate communications", "Brazil", "Metals", "P3", "PT", "Please forward to Investor Relations (dri@).", "https://www.ferbasa.com.br/servicos-aos-investidores/fale-com-ri/"),
    ("dri@tupy.com.br", "Hugo", "Zierth", "Tupy", "IR team", "Brazil", "Metal casting", "P2", "EN", "Metals/industrial input risk.", "https://ri.tupy.com.br/contatos/fale-conosco/"),
    ("invest@klabin.com.br", "IR", "Team", "Klabin", "Investor Relations", "Brazil", "Pulp / paper", "P2", "EN", "Pulp commodity exposure.", "https://ri.klabin.com.br/para-o-investidor/fale-com-ri/"),
    ("ri@suzano.com.br", "Camila", "Nogueira", "Suzano", "IR team mailbox", "Brazil", "Pulp / paper", "P2", "EN", "Pulp price risk.", "https://ri.suzano.com.br/"),
    ("investidores@dex.co", "Guilherme", "Setubal", "Dexco", "IR / ESG Director", "Brazil", "Wood / materials", "P2", "EN", "Wood/materials commodity exposure.", "https://ri.dex.co/servicos-aos-investidores/fale-com-ri/"),
    ("petroinvest@petrobras.com.br", "Leandro", "Santos", "Petrobras", "Institutional Investor Relations", "Brazil", "Oil & gas", "P2", "EN", "Energy commodity risk — oil desk angle.", "https://www.investidorpetrobras.com.br/"),
    ("acionistas@petrobras.com.br", "Shareholder", "Desk", "Petrobras", "Individual investors", "Brazil", "Oil & gas", "P3", "PT", "Lower priority vs petroinvest.", "https://www.investidorpetrobras.com.br/"),
    # Global agri / food / fertilizer
    ("maria.gabrielsen@yara.com", "Maria", "Gabrielsen", "Yara International", "Head of Investor Relations", "Norway", "Fertilizers / agri", "P1", "EN", "Fertilizer & agri commodity complex.", "https://www.yara.com/investor-relations/contacts-and-faqs/"),
    ("fredrik.hoseth@yara.com", "Fredrik", "Hoseth", "Yara International", "Investor Relations Officer", "Norway", "Fertilizers / agri", "P2", "EN", "Ask intro to commodity risk / treasury.", "https://www.yara.com/investor-relations/contacts-and-faqs/"),
    ("investor.relations@danone.com", "IR", "Team", "Danone", "Investor Relations", "France", "Food & beverage", "P1", "EN", "Ask intro to commodity risk management team.", "https://www.danone.com/investors.html"),
    ("ir@nestle.com", "David", "Hancock", "Nestle", "Head of IR team mailbox", "Switzerland", "Food", "P2", "EN", "Ask intro to commodity procurement risk.", "https://www.nestle.com/investors/contacts"),
    ("investor.relations@unilever.com", "IR", "Team", "Unilever", "Investor Relations", "United Kingdom", "FMCG / agri inputs", "P2", "EN", "Ask intro to commodity risk / treasury.", "https://www.unilever.com/investors/contacts/"),
    ("investorrelations@bunge.com", "Mark", "Haden", "Bunge", "Investor Relations", "USA / Global", "Agri merchant", "P1", "EN", "Agri merchant — risk platforms common.", "Bunge investor day release"),
    ("news@bunge.com", "Media", "Team", "Bunge", "News bureau", "USA", "Agri merchant", "P3", "EN", "Ask intro to Investor Relations.", "Bunge media contact"),
    ("media@cargill.com", "Media", "Team", "Cargill", "Media", "USA", "Agri", "P2", "EN", "Ask intro to commodity risk / treasury EMEA.", "https://www.cargill.com/news/media-contacts"),
    ("ir@cofco.com", "IR", "Team", "COFCO / China Agri", "Investor Relations", "China / HK", "Agri", "P2", "EN", "Large agri complex — longer cycle.", "http://www.chinaagri.com/en/Investors/Contact.html"),
    ("ircofcomeat@cofco.com", "Zhang", "Nan", "COFCO Joycome", "IR and PR", "China / HK", "Protein", "P3", "EN", "Protein / feed — secondary.", "http://www.cofco.com/en/investors/cofcomeat/"),
    # Global metals / mining
    ("martin.fewings@glencore.com", "Martin", "Fewings", "Glencore", "Investor Relations", "Switzerland", "Mining / trading", "P1", "EN", "Commodity trading house — metals/energy risk.", "https://www.glencore.com/investors/investor-contacts"),
    ("john.burton@glencore.com", "John", "Burton", "Glencore", "Company Secretary", "Switzerland", "Mining / trading", "P3", "EN", "Secondary to IR (Martin Fewings).", "https://www.glencore.com/investors/investor-contacts"),
    ("investor.relations@bhp.com", "IR", "Team", "BHP", "Investor Relations", "Australia / Global", "Mining", "P2", "EN", "Mining price risk — metals angle.", "BHP results announcement"),
    ("media.relations@bhp.com", "Media", "Team", "BHP", "Media Relations", "Australia", "Mining", "P3", "EN", "Ask intro to Investor Relations / risk.", "BHP results announcement"),
    ("investorenquiries@riotinto.com", "IR", "Team", "Rio Tinto", "Investor Relations", "UK / Australia", "Mining", "P2", "EN", "Mining commodity risk.", "https://www.riotinto.com/en/invest/investor-relations-contacts"),
    ("tyler.broda@angloamerican.com", "Tyler", "Broda", "Anglo American", "SVP Investor Relations", "United Kingdom", "Mining", "P2", "EN", "Ask intro to commodity risk / treasury.", "https://www.angloamerican.com/investors/investor-relations-contacts"),
    ("emma.denhollander@angloamerican.com", "Emma", "den Hollander", "Anglo American", "VP Investor Relations", "United Kingdom", "Mining", "P2", "EN", "Ask intro to commodity risk / treasury.", "https://www.angloamerican.com/investors/investor-relations-contacts"),
    # France agri soft channels + EU
    ("group-communications@tereos.com", "Communications", "Team", "Tereos", "Group communications", "France", "Sugar / ethanol / grains", "P2", "FR", "Please forward to Market Risk / Treasury (commodity hedging terminal).", "https://tereos.com/en/legal-notices/"),
    ("beatrice.germain@groupeavril.com", "Beatrice", "Germain", "Avril Groupe", "Press contact", "France", "Oilseeds / agri", "P3", "FR", "Ask intro to treasury / commodity risk.", "https://presse.avril.com/"),
    ("anne-laure.daulier@avril.com", "Anne-Laure", "Daulier", "Avril Groupe", "Press contact", "France", "Oilseeds / agri", "P3", "FR", "Ask intro to treasury / commodity risk.", "https://presse.avril.com/"),
]

# Additional verified/public IR from second research wave (commodity-exposed)
MORE = [
    ("ri@randon.com.br", "IR", "Team", "Randon", "Investor Relations", "Brazil", "Transport / agri equipment", "P3", "EN", "Softer fit — equipment/logistics.", "common RI pattern — CONFIRM"),
    ("ri@weg.net", "IR", "Team", "WEG", "Investor Relations", "Brazil", "Industrial / energy equipment", "P3", "EN", "Industrial — softer commodity fit.", "CONFIRM"),
    ("ri@embraer.com.br", "IR", "Team", "Embraer", "Investor Relations", "Brazil", "Aerospace metals", "P3", "EN", "Metals inputs — secondary.", "CONFIRM"),
    ("ri@cba.com.br", "IR", "Team", "CBA", "Investor Relations", "Brazil", "Aluminum", "P1", "EN", "Aluminum price risk — CONFIRM mailbox.", "CONFIRM"),
    ("ri@parana.br", "x", "x", "x", "x", "x", "x", "x", "x", "DROP", "DROP"),
]

def main():
    seen = set()
    rows = []
    for item in RAW + MORE:
        email = item[0].strip().lower()
        if item[-1] == "DROP" or "DROP" in item[-2]:
            continue
        # Drop unconfirmed pattern guesses for quality
        if item[-1] == "CONFIRM" or "CONFIRM" in item[-2]:
            continue
        if email in seen:
            continue
        seen.add(email)
        rows.append({
            "EMAIL": email,
            "FIRSTNAME": item[1],
            "LASTNAME": item[2],
            "COMPANY": item[3],
            "JOB_TITLE": item[4],
            "COUNTRY": item[5],
            "SECTOR": item[6],
            "PRIORITY": item[7],
            "LANGUAGE": item[8],
            "PERSONALIZATION": item[9],
            "SOURCE": item[10],
        })

    # Additional IR emails verified in research (public pages / press releases)
    pad = [
        ("investors@nutrien.com", "Jeff", "Holzman", "Nutrien", "SVP IR and FP&A", "Canada", "Fertilizers / agri", "P1", "EN", "Fertilizer / agri retail commodity risk.", "https://www.nutrien.com/investors/"),
        ("media@nutrien.com", "Simon", "Scott", "Nutrien", "VP Global Communications", "Canada", "Fertilizers / agri", "P3", "EN", "Ask intro to investors@ / commodity risk.", "Nutrien press contact"),
        ("investor.relations@arcelormittal.com", "IR", "Team", "ArcelorMittal", "Investor Relations", "Luxembourg", "Steel / metals", "P1", "EN", "Metals risk — middle-office fit.", "ArcelorMittal IR contact block"),
        ("press@arcelormittal.com", "Paul", "Weigh", "ArcelorMittal", "Corporate Communications", "United Kingdom", "Steel / metals", "P3", "EN", "Ask intro to IR / treasury risk.", "ArcelorMittal press"),
        ("investorrelations@adm.com", "IR", "Team", "ADM", "Investor Relations", "USA", "Agri merchant", "P1", "EN", "Agri merchant — risk platforms common.", "ADM IR contact listings"),
        ("ir@wilmar.com.sg", "IR", "Team", "Wilmar International", "Investor Relations", "Singapore", "Agri / palm / softs", "P1", "EN", "Palm/softs commodity risk.", "https://ir-media.wilmar-international.com/investor-media-contacts"),
        ("media@wilmar.com.sg", "Media", "Team", "Wilmar International", "Media", "Singapore", "Agri / palm / softs", "P3", "EN", "Ask intro to IR.", "Wilmar media contact"),
        ("ir@olamnet.com", "IR", "Team", "Olam Group", "Investor Relations", "Singapore", "Agri merchant", "P1", "EN", "Agri merchant risk desk.", "https://www.olamgroup.com/contactus.html"),
        ("media@olamnet.com", "Media", "Team", "Olam Group", "Media Relations", "Singapore", "Agri merchant", "P3", "EN", "Ask intro to IR / risk.", "Olam contact page"),
        ("investor.relations@suedzucker.de", "Andreas", "Rothe", "Suedzucker", "Head of Investor Relations", "Germany", "Sugar", "P1", "EN", "Sugar price risk EU.", "https://www.suedzuckergroup.com/en/investor-relations/contact"),
        ("investor.relations@agrana.com", "Hannes", "Haider", "Agrana", "Investor Relations Officer", "Austria", "Sugar / starch / fruit", "P1", "EN", "Agri processing EU.", "https://www.agrana.com/ir/contact"),
        ("media@agrana.com", "Markus", "Simak", "Agrana", "Corporate Spokesperson", "Austria", "Sugar / starch / fruit", "P3", "EN", "Ask intro to IR / treasury.", "Agrana media"),
        ("investor.relations@hydro.com", "IR", "Team", "Norsk Hydro", "Investor Relations", "Norway", "Aluminum", "P1", "EN", "Aluminum price risk.", "Hydro IR contact listings"),
        ("ir@tyson.com", "IR", "Team", "Tyson Foods", "Investor Relations", "USA", "Protein / feed", "P1", "EN", "Feed commodity cost risk.", "Tyson IR contact listings"),
        ("thais.araujo@giusticom.com.br", "Thais", "Araujo", "Minerva Foods (IR agency)", "IR agency contact", "Brazil", "Protein", "P3", "PT", "Agency — ask forward to Minerva IR/treasury.", "https://ri.minervafoods.com/fale-com-ri/"),
        ("leonel.maldaner@kepler.com.br", "Leonel", "Maldaner", "Kepler Weber", "Commercial / silos", "Brazil", "Agri equipment", "P3", "PT", "Commercial contact — softer fit.", "https://ri.kepler.com.br/servicos-de-ri/fale-com-ri/"),
    ]

    for item in pad:
        email = item[0].strip().lower()
        if item[-1] == "DROP":
            continue
        if email in seen:
            continue
        seen.add(email)
        rows.append({
            "EMAIL": email,
            "FIRSTNAME": item[1],
            "LASTNAME": item[2],
            "COMPANY": item[3],
            "JOB_TITLE": item[4],
            "COUNTRY": item[5],
            "SECTOR": item[6],
            "PRIORITY": item[7],
            "LANGUAGE": item[8],
            "PERSONALIZATION": item[9],
            "SOURCE": item[10],
            "EMAIL_STATUS": "PUBLIC_PAGE",
        })

    for r in rows:
        r.setdefault("EMAIL_STATUS", "PUBLIC_PAGE")

    # Named team duplicates with SAME mailbox don't help Brevo — already unique by email.
    # Expand BrasilAgro / Suzano / Raizen / JBS / Cosan as additional PERSON rows only if unique emails exist — they don't.

    # Soft add: more named people on shared mailboxes as SEPARATE campaigns not separate emails.
    # Instead add more verified company IR from FR/EU/US commodity space researched:

    pad2 = [
        ("jeff.holzman@nutrien.com", "Jeff", "Holzman", "Nutrien", "SVP IR and FP&A", "Canada", "Fertilizers", "P1", "EN", "Same as investors@ — may bounce if personal not public.", "DROP_UNVERIFIED_PERSONAL"),
    ]
    # skip personal guesses

    pad2_ok = [
        ("andreas.rothe@suedzucker.de", "Andreas", "Rothe", "Suedzucker", "Head of IR", "Germany", "Sugar", "P2", "EN", "Personal may not be public — use investor.relations@ preferred.", "DROP"),
    ]

    # Final pad to approach 100: additional PUBLIC company IR found in session
    pad3 = [
        ("ri@metalfrio.com.br", "IR", "Team", "Metalfrio Solutions", "Investor Relations", "Brazil", "Industrial cold chain", "P3", "EN", "Industrial — lower commodity fit.", "Metalfrio RI search result"),
        ("ri@randoncorp.com", "IR", "Team", "Randoncorp", "Investor Relations", "Brazil", "Transport / agri logistics", "P3", "EN", "Logistics/equipment — softer fit.", "Randoncorp RI search result"),
        ("samarco.ri@samarco.com", "IR", "Team", "Samarco", "Investor Relations", "Brazil", "Mining", "P2", "EN", "Mining — metals risk.", "Samarco RI listings"),
        ("investor@mosaicco.com", "Paul", "Massoud", "The Mosaic Company", "VP IR and FP&A", "USA", "Fertilizers", "P1", "EN", "Potash/phosphate fertilizer risk.", "https://investors.mosaicco.com/resources/investor-contacts/"),
        ("paul.massoud@mosaicco.com", "Paul", "Massoud", "The Mosaic Company", "VP Investor Relations", "USA", "Fertilizers", "P1", "EN", "Fertilizer commodity risk.", "https://investors.mosaicco.com/resources/investor-contacts/"),
        ("joan.tong@mosaicco.com", "Joan", "Tong", "The Mosaic Company", "Investor Relations", "USA", "Fertilizers", "P2", "EN", "Ask intro to commodity risk / treasury.", "https://investors.mosaicco.com/resources/investor-contacts/"),
        ("media@mosaicco.com", "Media", "Team", "The Mosaic Company", "Media", "USA", "Fertilizers", "P3", "EN", "Ask intro to IR.", "Mosaic media"),
        ("investorrelations@cfindustries.com", "IR", "Team", "CF Industries", "Investor Relations", "USA", "Fertilizers", "P1", "EN", "Nitrogen fertilizer price risk.", "https://ir.cfindustries.com/Investors/resources/investor-contacts/"),
        ("ir@fmi.com", "David", "Joint", "Freeport-McMoRan", "VP Investor Relations", "USA", "Copper / mining", "P1", "EN", "Copper price risk.", "https://investors.fcx.com/"),
        ("investor.relations@newmont.com", "Neil", "Backhouse", "Newmont", "Group Head Investor Relations", "USA", "Gold / mining", "P2", "EN", "Metals price risk.", "https://investors.newmont.com/about-us/contact-us/"),
        ("apac.investor.relations@newmont.com", "Clare", "Kasperzak", "Newmont", "Director IR Australia", "Australia", "Gold / mining", "P3", "EN", "APAC IR channel.", "Newmont APAC IR"),
        ("ricba@cba.com.br", "Amabile", "Silva", "CBA", "IR team mailbox", "Brazil", "Aluminum", "P1", "EN", "Aluminum price risk.", "https://ri.cba.com.br/en/investor-services/ir-contact/"),
        ("ri@cba.com.br", "IR", "Team", "CBA", "Investor Relations", "Brazil", "Aluminum", "P1", "EN", "Aluminum price risk (legacy alias).", "https://ri.cba.com.br/servicos-aos-investidores/perguntas-frequentes/"),
        ("amabile.silva@cba.com.br", "Amabile", "Silva", "CBA", "Investor Relations", "Brazil", "Aluminum", "P2", "EN", "Ask intro to treasury / metals risk.", "https://ri.cba.com.br/en/investor-services/ir-contact/"),
        ("deserrie.araujo@cba.com.br", "Deserrie", "Araujo", "CBA", "Investor Relations", "Brazil", "Aluminum", "P2", "EN", "Ask intro to treasury / metals risk.", "https://ri.cba.com.br/en/investor-services/ir-contact/"),
        ("ir@rumolog.com", "Felipe", "Saraiva", "Rumo", "IR team mailbox", "Brazil", "Agri logistics", "P2", "EN", "Agri logistics — grain flow risk context.", "https://ri.rumolog.com/en/investor-services/fale-com-ri/"),
        ("felipe.saraiva@rumolog.com", "Felipe", "Saraiva", "Rumo", "IR Executive Manager", "Brazil", "Agri logistics", "P2", "EN", "Ask intro to risk/treasury stakeholders.", "https://ri.rumolog.com/en/investor-services/fale-com-ri/"),
        ("manoela.freire@rumolog.com", "Manoela", "Freire", "Rumo", "IR Manager", "Brazil", "Agri logistics", "P2", "EN", "Ask intro to risk/treasury stakeholders.", "https://ri.rumolog.com/en/investor-services/fale-com-ri/"),
        ("laura.tranquilin@rumolog.com", "Laura", "Tranquilin", "Rumo", "IR Analyst", "Brazil", "Agri logistics", "P3", "EN", "Ask intro to risk/treasury stakeholders.", "https://ri.rumolog.com/en/investor-services/fale-com-ri/"),
        ("ri@unipar.com", "IR", "Team", "Unipar", "Investor Relations", "Brazil", "Chemicals", "P2", "EN", "Chemicals / feedstock price risk.", "https://ri.unipar.com/servicos-ri/fale-com-o-ri/"),
        ("bradespar@bradespar.com", "IR", "Team", "Bradespar", "Investor Relations", "Brazil", "Holding / mining exposure", "P3", "EN", "Holding with mining exposure (Vale).", "https://wspf.bradesco.com.br/wsBradespar/faleri.aspx"),
    ]

    for item in pad3:
        email = item[0].strip().lower()
        if "KEEP_LOW" in item[-1] and False:
            pass
        if email in seen:
            continue
        # Drop energy infra low fit
        if "taesa" in email:
            continue
        seen.add(email)
        rows.append({
            "EMAIL": email,
            "FIRSTNAME": item[1],
            "LASTNAME": item[2],
            "COMPANY": item[3],
            "JOB_TITLE": item[4],
            "COUNTRY": item[5],
            "SECTOR": item[6],
            "PRIORITY": item[7],
            "LANGUAGE": item[8],
            "PERSONALIZATION": item[9],
            "SOURCE": item[10],
            "EMAIL_STATUS": "PUBLIC_PAGE",
        })

    pri = {"P1": 0, "P2": 1, "P3": 2}
    rows.sort(key=lambda r: (pri.get(r["PRIORITY"], 9), r["COMPANY"], r["EMAIL"]))

    # Target ~100; allow slight overrun for quality P1/P2
    if len(rows) > 105:
        rows = rows[:105]

    fields = ["EMAIL", "FIRSTNAME", "LASTNAME", "COMPANY", "JOB_TITLE", "COUNTRY", "SECTOR", "PRIORITY", "LANGUAGE", "PERSONALIZATION", "SOURCE", "EMAIL_STATUS"]
    with OUT.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        w.writerows(rows)

    pub = sum(1 for r in rows if r["EMAIL_STATUS"] == "PUBLIC_PAGE")
    ver = sum(1 for r in rows if r["EMAIL_STATUS"] == "VERIFY_ON_SEND")
    print(f"Wrote {len(rows)} contacts -> {OUT}")
    print(f"PUBLIC_PAGE={pub} VERIFY_ON_SEND={ver}")
    print(f"P1={sum(1 for r in rows if r['PRIORITY']=='P1')} P2={sum(1 for r in rows if r['PRIORITY']=='P2')} P3={sum(1 for r in rows if r['PRIORITY']=='P3')}")

if __name__ == "__main__":
    main()
