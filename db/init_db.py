import psycopg2

conn = psycopg2.connect(
    host='127.0.0.1',
    port=5433,
    dbname='flashlock_db',
    user='flashlock',
    password='flashlock_dev'
)

cur = conn.cursor()

with open('schema.sql', 'r') as f:
    cur.execute(f.read())

conn.commit()
cur.close()
conn.close()

print("Tables created successfully.")