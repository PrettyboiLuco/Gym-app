import sys, re
import os, sys
# Suche in SR28: python3 find.py <Ordner mit ABBREV.txt> <Suchwort>
D=sys.argv.pop(1).rstrip('/')+'/'
rows=[l.rstrip('\r\n').split('^') for l in open(D+'FOOD_DES.txt',encoding='latin-1')]
abbr={l.split('^')[0].strip('~'):l.rstrip('\r\n').split('^') for l in open(D+'ABBREV.txt',encoding='latin-1')}
for q in sys.argv[1:]:
    pats=[p.lower() for p in q.split('&')]
    hits=[(r[0].strip('~'), r[2].strip('~')) for r in rows if all(p in r[2].strip('~').lower() for p in pats)]
    print(f'== {q} ({len(hits)})')
    for ndb,desc in hits[:14]:
        a=abbr[ndb]; print(f'  {ndb} {a[3]}kcal | {desc[:95]}')
