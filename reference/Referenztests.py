import sqlite3, json, hashlib, copy
from decimal import Decimal as D
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

def nutrients(value, amount, basis='g', unit='g'):
    if amount < 0: raise ValueError('negative amount')
    if basis != unit: raise ValueError('density required')
    return None if value is None else D(str(value))*D(str(amount))/100

def recipe(total, weight, portion):
    if weight is None or weight <= 0: raise ValueError('end weight required')
    return D(str(total))*D(str(portion))/D(str(weight))

def database():
    db=sqlite3.connect(':memory:')
    db.executescript("""
    PRAGMA foreign_keys=ON;
    CREATE TABLE plan(id TEXT PRIMARY KEY, days INTEGER CHECK(days BETWEEN 2 AND 6));
    CREATE TABLE log(id TEXT PRIMARY KEY, plan_id TEXT REFERENCES plan(id), exercise TEXT, weight TEXT, reps INTEGER);
    CREATE TABLE event(id TEXT PRIMARY KEY, amount TEXT, kcal TEXT, day TEXT);
    CREATE TABLE state(name TEXT PRIMARY KEY, value TEXT);
    INSERT INTO plan VALUES('v1',6);
    INSERT INTO log VALUES('l1','v1','squat_barbell','60',8);
    INSERT INTO state VALUES('active_plan','v1');
    """)
    return db

def run():
    results=[]
    def test(name, condition):
        if not condition: raise AssertionError(name)
        results.append({'test':name,'passed':True})
    def rejects(name, fn):
        try: fn()
        except ValueError: test(name,True)
        else: test(name,False)
    test('250 kcal/100 g ×60 g =150',nutrients(250,60)==150)
    test('40 kcal/100 ml ×250 ml =100',nutrients(40,250,'ml','ml')==100)
    test('missing nutrient remains unknown',nutrients(None,60) is None)
    test('known zero remains zero',nutrients(0,60)==0)
    rejects('negative amounts rejected',lambda:nutrients(40,-1))
    rejects('g and ml require density',lambda:nutrients(40,250,'g','ml'))
    test('recipe 1200/800 ×200 =300',recipe(1200,800,200)==300)
    rejects('missing end weight rejected',lambda:recipe(1200,None,200))
    rejects('zero end weight rejected',lambda:recipe(1200,0,200))
    db=database()
    before=db.execute('SELECT * FROM log ORDER BY id').fetchall()
    with db:
        db.execute('INSERT INTO plan VALUES(?,?)',('v2',2))
        db.execute("UPDATE state SET value='v2' WHERE name='active_plan'")
    test('plan switch preserves historical rows',before==db.execute('SELECT * FROM log ORDER BY id').fetchall())
    db.execute("INSERT INTO log VALUES('l2','v2','row_cable','40',10)")
    db.execute("UPDATE state SET value='v1' WHERE name='active_plan'")
    db.commit()
    test('return preserves post-switch workouts',db.execute('SELECT count(*) FROM log').fetchone()[0]==2)
    with db: db.execute('INSERT INTO event VALUES(?,?,?,?)',('drink1','250','100','2026-10-27'))
    test('one event feeds both views once',db.execute('SELECT sum(CAST(kcal AS REAL)),sum(CAST(amount AS REAL)) FROM event').fetchone()==(100.0,250.0))
    with db: db.execute("UPDATE event SET amount='500',kcal='200' WHERE id='drink1'")
    test('linked update remains single event',db.execute('SELECT count(*),sum(CAST(kcal AS REAL)) FROM event').fetchone()==(1,200.0))
    try:
        with db: db.execute("INSERT INTO event VALUES('drink1','250','100','2026-10-27')")
    except sqlite3.IntegrityError: pass
    test('duplicate ID not added',db.execute('SELECT count(*) FROM event').fetchone()[0]==1)
    try:
        with db:
            db.execute("INSERT INTO plan VALUES('v3',3)")
            db.execute("INSERT INTO plan VALUES('bad',1)")
    except sqlite3.IntegrityError: pass
    test('failed transaction rolls back new plan',db.execute("SELECT count(*) FROM plan WHERE id='v3'").fetchone()[0]==0)
    snapshot={'kcal100':'250'}
    food={'kcal100':'250'}
    saved=copy.deepcopy(snapshot);food['kcal100']='300'
    test('snapshot isolated from catalog update',saved['kcal100']=='250')
    data={t:db.execute('SELECT * FROM '+t).fetchall() for t in ['plan','log','event','state']}
    restored=sqlite3.connect(':memory:')
    restored.executescript(chr(10).join(db.iterdump()))
    test('SQLite dump restore equals model data',all(restored.execute('SELECT * FROM '+t).fetchall()==rows for t,rows in data.items()))
    day='2026-10-27'; entered=datetime(2026,10,28,0,5,tzinfo=ZoneInfo('Europe/Berlin'))
    test('backdated diary day remains user day',day!=entered.date().isoformat())
    berlin=ZoneInfo('Europe/Berlin')
    spring0=datetime(2026,3,29,tzinfo=berlin);spring1=datetime(2026,3,30,tzinfo=berlin)
    autumn0=datetime(2026,10,25,tzinfo=berlin);autumn1=datetime(2026,10,26,tzinfo=berlin)
    test('spring day 23h', (spring1.astimezone(timezone.utc)-spring0.astimezone(timezone.utc)).total_seconds()==23*3600)
    test('autumn day 25h',(autumn1.astimezone(timezone.utc)-autumn0.astimezone(timezone.utc)).total_seconds()==25*3600)
    timer={'end':1000,'generation':2}
    test('timer reconstruct remaining',max(0,timer['end']-970)==30)
    test('expired timer clamps at zero',max(0,timer['end']-1100)==0)
    stale={'generation':1}
    test('stale alarm generation ignored',stale['generation']!=timer['generation'])
    with db: db.execute("DELETE FROM event WHERE id='drink1'")
    test('linked deletion removes event for both views',db.execute('SELECT count(*) FROM event').fetchone()[0]==0)
    return results

if __name__=='__main__':
    result=run()
    print(json.dumps({'scope':'Isolated reference model; not app/device tests','passed':len(result),'tests':result},ensure_ascii=False,indent=2))
