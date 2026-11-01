# Erzeugt mobile/src/domain/basis-foods-data.ts aus den Auswahl-Listen (picks/*.json) und USDA SR28 (ABBREV.txt).
import json, sys, os, re
# Bewusst weggelassen: Stevia-Pulver (SR28-Eintrag ist Streusüße mit Trägerstoff, 0 kcal bei 100 g Kohlenhydraten).
DROP={'19918'}
# Aufruf: python3 generate.py <Ordner mit ABBREV.txt>  (npm-Paket fda-nutrient-database@1.0.2, Ordner package/data)
D=os.path.dirname(os.path.abspath(__file__))+'/'
SR=sys.argv[1].rstrip('/')+'/' if len(sys.argv)>1 else D+'pkg/package/data/'
OUT=os.path.join(D,'..','..','src','domain','basis-foods-data.ts')
abbr={}
for l in open(SR+'ABBREV.txt',encoding='latin-1'):
    f=l.rstrip('\r\n').split('^'); abbr[f[0].strip('~')]=f
def num(f,i):
    v=f[i].strip('~') if i < len(f) else ''
    return None if v=='' else float(v)
MICRO={'calcium':10,'iron':11,'magnesium':12,'potassium':14,'zinc':16,'vitC':20,'vitD':41,'vitB12':31,'folate':29,'vitA':33,'vitE':40}
FISH=re.compile(r'lachs|thunfisch|kabeljau|fisch|hering|makrele|forelle|sardine|scholle|dorsch|seelachs|alaska|tilapia|zander|barsch|sardelle|anchovi',re.I)
CRUST=re.compile(r'garnele|shrimp|krabbe|hummer|krebs|scampi|languste',re.I)
MOLL=re.compile(r'muschel|tintenfisch|calamar|oktopus|krake|auster',re.I)
UNSURE_MEAT=re.compile(r'wurst|salami|würstchen|schinken|aufschnitt|frikadelle|leberkäse|mortadella|bacon|speck|chorizo',re.I)
EGG=re.compile(r'\bei\b|eier|eiklar|eigelb|eiweiß \(ei',re.I)
GLUTEN=re.compile(r'weizen|roggen|gerste|dinkel|hafer|grünkern|bulgur|couscous|nudel|spaghetti|pasta|brot|brötchen|toast|mehl|grieß|seitan|bier|cracker|keks|zwieback|paniermehl|semmel|bagel|tortilla|wrap|muesli|müsli|cornflakes|brezel',re.I)
NOGLUTEN_GRAIN=re.compile(r'reis|quinoa|mais|hirse|buchweizen|amarant|polenta',re.I)
TREE=re.compile(r'mandel|walnuss|haselnuss|cashew|pistazie|pekan|macadamia|paranuss|nüsse|nussmischung',re.I)
PEANUT=re.compile(r'erdnuss',re.I)
SESAME=re.compile(r'sesam|tahin',re.I)
SOY=re.compile(r'soja|tofu|tempeh|edamame|miso',re.I)
LUPIN=re.compile(r'lupine',re.I)
CELERY=re.compile(r'sellerie',re.I)
MUSTARD=re.compile(r'senf',re.I)
MILK=re.compile(r'milch|joghurt|quark|käse|kaese|sahne|butter|skyr|kefir|buttermilch|molke|whey|mozzarella|feta|parmesan|gouda|camembert|frischkäse|schmand|crème|creme fraiche|eis\b|speiseeis|kakao(getränk|trunk)|kakao \(trinkfertig|trinkkakao',re.I)
# Pflanzliche Wörter mit „milch“/„butter“ im Namen sind keine Milchprodukte.
PLANT=re.compile(r'erdnussbutter|nussbutter|kakaobutter|kokos\w*milch|mandelmilch|hafermilch|sojamilch|reismilch|buttermilch(?=x)',re.I)
ANIMAL_FAT=re.compile(r'schmalz|speck|schwein|rind|gans|ente',re.I)
def milk(name): return bool(MILK.search(PLANT.sub(' ',name)))
def classify(p):
    name=p['name']+' '+' '.join(p.get('synonyms',[])); g=p['group']
    al=set(); diet=None; sure=True
    if g=='fleisch_fisch':
        diet='nicht_vegetarisch'
        if FISH.search(name): al.add('fisch')
        if CRUST.search(name): al.add('krebstiere')
        if MOLL.search(name): al.add('weichtiere')
        if UNSURE_MEAT.search(name): sure=False
    elif g=='eier_milch':
        diet='vegetarisch'
        if EGG.search(name): al.add('eier')
        if milk(name) or not EGG.search(name): al.add('milch')
    elif g=='pflanzlich_eiweiss':
        diet='vegan'
        if SOY.search(name): al.add('soja')
        if GLUTEN.search(name): al.add('gluten')
        if LUPIN.search(name): al.add('lupinen')
    elif g in ('getreide','brot'):
        diet='vegan' if g=='getreide' else None
        if GLUTEN.search(name) and not NOGLUTEN_GRAIN.search(name.split('(')[0]): al.add('gluten')
        if re.search(r'eier|\bei\b',p['name'],re.I): al.add('eier'); diet='vegetarisch' if g=='getreide' else diet
        # Brot: Milch, Sesam, Soja je nach Bäckerei – keine vollständige Aussage möglich
        if g=='brot': sure=False
        if SESAME.search(name): al.add('sesam')
    elif g in ('kartoffeln','fette_oele','obst','gemuese'):
        diet='vegan'
        # nur der Hauptname: Synonyme wie „Eierfrucht“, „Buttersalat“, „Mandelbutter“ sind keine Tierprodukte
        nm=p['name']
        if milk(nm): al.add('milch'); diet='vegetarisch'
        if EGG.search(nm): al.add('eier'); diet='vegetarisch'
        # Kartoffelpuffer: Rezepte mit Ei und Mehl, Fertigware unterschiedlich
        if re.search('puffer|rösti|kroket',nm,re.I): sure=False; diet=None
        if re.search('butterschmalz|ghee',name,re.I): diet='vegetarisch'
        elif ANIMAL_FAT.search(name): diet='nicht_vegetarisch'
        # Margarine kann Molke/Joghurt enthalten – keine sichere Aussage
        if re.search('margarine',name,re.I): sure=False; diet=None
        if CELERY.search(name): al.add('sellerie')
        if PEANUT.search(name): al.add('erdnuesse')
        if SOY.search(name): al.add('soja')
        if TREE.search(name): al.add('schalenfruechte')
        if SESAME.search(name): al.add('sesam')
    elif g in ('huelsenfruechte','nuesse_samen'):
        diet='vegan'
        if milk(p['name']): al.add('milch'); diet='vegetarisch'
        if PEANUT.search(name): al.add('erdnuesse')
        if TREE.search(name): al.add('schalenfruechte')
        if SESAME.search(name): al.add('sesam')
        if SOY.search(name): al.add('soja')
        if LUPIN.search(name): al.add('lupinen')
    elif g=='getraenke':
        diet='vegan'
        if milk(p['name']): al.add('milch'); diet='vegetarisch'
        if SOY.search(name): al.add('soja')
        # Wein/Bier können mit tierischen Mitteln geklärt sein
        if re.search(r'bier|wein|sekt',name,re.I): diet=None
        if re.search(r'bier',name,re.I): al.add('gluten')
        if re.search(r'wein|sekt',name,re.I): al.add('sulfite')
        if re.search(r'mandel',name,re.I): al.add('schalenfruechte')
        if re.search(r'hafer',name,re.I): al.add('gluten')
    else:
        # Süßes, Aufstriche, Backzutaten: nur eindeutige Fälle, sonst „unbekannt“.
        sure=False
        if re.search(r'^zucker|honig|ahornsirup|essig|^salz|speisesalz',p['name'],re.I):
            sure=True; diet='vegetarisch' if re.search('honig',name,re.I) else 'vegan'
        if MUSTARD.search(name): al.add('senf')
    return (sorted(al) if sure else None), diet
foods=[]; seen_n=set(); seen_id=set(); problems=[]
for fn in sorted(os.listdir(D+'picks')):
    if not fn.endswith('.json'): continue
    for p in json.load(open(D+'picks/'+fn,encoding='utf-8')):
        if p['ndb'] in DROP: continue
        ndb=p['ndb'].strip()
        if ndb not in abbr: problems.append(('missing',ndb,p['name'])); continue
        if ndb in seen_id or p['name'] in seen_n: problems.append(('dup',ndb,p['name'])); continue
        seen_id.add(ndb); seen_n.add(p['name'])
        f=abbr[ndb]
        kcal=num(f,3); prot=num(f,4); fat=num(f,5); carb=num(f,7); fiber=num(f,8); sugar=num(f,9); na=num(f,15); sat=num(f,44)
        if None in (kcal,prot,fat,carb): problems.append(('core-missing',ndb,p['name'])); continue
        carbs=max(0.0, carb-(fiber or 0))
        r=lambda v,d=1: None if v is None else round(v,d)
        micros={k:round(num(f,i),3 if num(f,i)<1 else 1) for k,i in MICRO.items() if num(f,i) is not None}
        al,diet=classify(p)
        foods.append({
          'id':'usda-'+ndb,'name':p['name'],'group':p['group'],'basis':p.get('basis','g'),'prep':{'cooked':'gekocht','raw':'roh'}.get(p.get('prep'),p.get('prep')),
          'per100':[round(kcal),r(prot),r(carbs),r(fat),r(fiber),None if sugar is None else r(min(sugar,carbs)),r(sat),None if na is None else round(na*2.5/1000,2)],
          'micros':micros,
          'portions':[{'label':q['label'],'g':round(float(q['g']),1)} for q in p.get('portions',[]) if float(q.get('g',0))>0],
          'serving':p.get('serving'),'synonyms':[s for s in p.get('synonyms',[]) if s and s!=p['name']],
          'allergens':al,'diet':diet})
foods.sort(key=lambda x:(x['group'],x['name']))
with open(OUT,'w',encoding='utf-8') as o:
    o.write('// Grundnahrungsmittel (A4): kuratierte Auswahl aus USDA SR28 (gemeinfrei), erzeugt mit generate.py.\n')
    o.write('// Nicht von Hand ändern – Werte kommen aus der Quelle; Namen, Synonyme und Portionen sind eigene Zuordnung.\n')
    o.write("import type { BasisFood } from './basis-foods';\n\n")
    o.write('export const BASIS_FOODS: BasisFood[] = ')
    o.write('[\n'+',\n'.join(' '+json.dumps(f,ensure_ascii=False,separators=(',',':')) for f in foods)+'\n]')
    o.write(';\n')
print(len(foods),'Einträge'); print('Probleme:',problems[:30])
from collections import Counter; print(Counter(x['group'] for x in foods))
